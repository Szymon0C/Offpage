fn main() {
    tauri_build::build();

    // Copy sidecar shared libraries to the target directory so they're next to the binary at runtime.
    // The sidecar (llama-server) references dylibs via @loader_path which resolves to the binary's directory.
    copy_sidecar_libs();
}

fn copy_sidecar_libs() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let binaries_dir = std::path::Path::new(&manifest_dir).join("binaries");

    if !binaries_dir.exists() {
        return;
    }

    // Determine target directory: CARGO_MANIFEST_DIR/target/{debug,release}
    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let target_dir = std::path::Path::new(&manifest_dir)
        .join("target")
        .join(&profile);

    if !target_dir.exists() {
        let _ = std::fs::create_dir_all(&target_dir);
    }

    let entries = match std::fs::read_dir(&binaries_dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        // Copy .dylib and .metal files
        if name.ends_with(".dylib") || name.ends_with(".metal") || name.ends_with(".dll") {
            let dest = target_dir.join(&name);
            if !dest.exists() || is_newer(&path, &dest) {
                let _ = std::fs::copy(&path, &dest);
            }
        }
    }
}

fn is_newer(src: &std::path::Path, dst: &std::path::Path) -> bool {
    let src_modified = src.metadata().and_then(|m| m.modified()).ok();
    let dst_modified = dst.metadata().and_then(|m| m.modified()).ok();
    match (src_modified, dst_modified) {
        (Some(s), Some(d)) => s > d,
        _ => true,
    }
}
