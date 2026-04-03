use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::io::Write;
use tauri::command;

#[derive(Serialize, Deserialize)]
pub struct DeployResult {
    pub provider: String,
    pub site_id: String,
    pub url: String,
}

#[command]
pub async fn deploy_netlify(
    token: String,
    html: String,
    site_id: Option<String>,
) -> Result<DeployResult, String> {
    let client = reqwest::Client::new();

    let id = match site_id {
        Some(id) => id,
        None => {
            let resp = client
                .post("https://api.netlify.com/api/v1/sites")
                .bearer_auth(&token)
                .json(&serde_json::json!({}))
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("Netlify create site failed: {}", resp.status()));
            }
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            body["id"]
                .as_str()
                .ok_or("Missing site id")?
                .to_string()
        }
    };

    let zip_bytes = {
        let mut buf = Vec::new();
        {
            let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
            let options = zip::write::FileOptions::<()>::default()
                .compression_method(zip::CompressionMethod::Deflated);
            zip.start_file("index.html", options).map_err(|e| e.to_string())?;
            zip.write_all(html.as_bytes()).map_err(|e| e.to_string())?;
            zip.finish().map_err(|e| e.to_string())?;
        }
        buf
    };

    let resp = client
        .post(format!("https://api.netlify.com/api/v1/sites/{}/deploys", id))
        .bearer_auth(&token)
        .header("Content-Type", "application/zip")
        .body(zip_bytes)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Netlify deploy failed: {}", resp.status()));
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let url = body["deploy_url"]
        .as_str()
        .or_else(|| body["url"].as_str())
        .unwrap_or("")
        .to_string();

    Ok(DeployResult {
        provider: "netlify".to_string(),
        site_id: id,
        url,
    })
}

#[command]
pub async fn deploy_vercel(
    token: String,
    html: String,
    project_name: String,
) -> Result<DeployResult, String> {
    let client = reqwest::Client::new();
    let encoded = BASE64.encode(html.as_bytes());

    let payload = serde_json::json!({
        "name": project_name,
        "files": [
            {
                "file": "index.html",
                "data": encoded,
                "encoding": "base64"
            }
        ],
        "projectSettings": {
            "framework": null
        }
    });

    let resp = client
        .post("https://api.vercel.com/v13/deployments")
        .bearer_auth(&token)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Vercel deploy failed: {}", resp.status()));
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let deployment_id = body["id"].as_str().unwrap_or("").to_string();
    let url = body["url"]
        .as_str()
        .map(|u| format!("https://{}", u))
        .unwrap_or_default();

    Ok(DeployResult {
        provider: "vercel".to_string(),
        site_id: deployment_id,
        url,
    })
}

#[command]
pub async fn deploy_github_pages(
    token: String,
    html: String,
    repo_name: String,
) -> Result<DeployResult, String> {
    let client = reqwest::Client::new();

    let user_resp = client
        .get("https://api.github.com/user")
        .bearer_auth(&token)
        .header("User-Agent", "offpage")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !user_resp.status().is_success() {
        return Err(format!("GitHub user fetch failed: {}", user_resp.status()));
    }

    let user_body: serde_json::Value = user_resp.json().await.map_err(|e| e.to_string())?;
    let username = user_body["login"]
        .as_str()
        .ok_or("Missing GitHub username")?
        .to_string();

    let repo_check = client
        .get(format!("https://api.github.com/repos/{}/{}", username, repo_name))
        .bearer_auth(&token)
        .header("User-Agent", "offpage")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if repo_check.status() == 404 {
        let create_resp = client
            .post("https://api.github.com/user/repos")
            .bearer_auth(&token)
            .header("User-Agent", "offpage")
            .json(&serde_json::json!({
                "name": repo_name,
                "auto_init": true,
                "private": false
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !create_resp.status().is_success() {
            return Err(format!("GitHub repo creation failed: {}", create_resp.status()));
        }
    }

    let encoded = BASE64.encode(html.as_bytes());

    let sha_resp = client
        .get(format!(
            "https://api.github.com/repos/{}/{}/contents/index.html",
            username, repo_name
        ))
        .bearer_auth(&token)
        .header("User-Agent", "offpage")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut upload_payload = serde_json::json!({
        "message": "Deploy via Offpage",
        "content": encoded
    });

    if sha_resp.status().is_success() {
        let sha_body: serde_json::Value = sha_resp.json().await.map_err(|e| e.to_string())?;
        if let Some(sha) = sha_body["sha"].as_str() {
            upload_payload["sha"] = serde_json::Value::String(sha.to_string());
        }
    }

    let upload_resp = client
        .put(format!(
            "https://api.github.com/repos/{}/{}/contents/index.html",
            username, repo_name
        ))
        .bearer_auth(&token)
        .header("User-Agent", "offpage")
        .json(&upload_payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !upload_resp.status().is_success() {
        return Err(format!("GitHub file upload failed: {}", upload_resp.status()));
    }

    let pages_resp = client
        .post(format!(
            "https://api.github.com/repos/{}/{}/pages",
            username, repo_name
        ))
        .bearer_auth(&token)
        .header("User-Agent", "offpage")
        .json(&serde_json::json!({
            "source": { "branch": "main", "path": "/" }
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let url = if pages_resp.status().is_success() {
        let pages_body: serde_json::Value =
            pages_resp.json().await.map_err(|e| e.to_string())?;
        pages_body["html_url"]
            .as_str()
            .unwrap_or(&format!("https://{}.github.io/{}", username, repo_name))
            .to_string()
    } else {
        format!("https://{}.github.io/{}", username, repo_name)
    };

    Ok(DeployResult {
        provider: "github-pages".to_string(),
        site_id: format!("{}/{}", username, repo_name),
        url,
    })
}

#[command]
pub async fn export_html(html: String, path: String) -> Result<String, String> {
    tokio::fs::write(&path, html)
        .await
        .map_err(|e| e.to_string())?;
    Ok(path)
}
