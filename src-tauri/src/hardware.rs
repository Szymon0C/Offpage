use serde::Serialize;
use sysinfo::System;
use tauri::Runtime;

#[derive(Debug, Clone, Serialize)]
pub enum GpuType {
    Metal,
    Nvidia { vram_gb: f64 },
    Cpu,
}

#[derive(Debug, Clone, Serialize)]
pub enum HardwareTier {
    Minimum,
    Recommended,
    Optimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct HardwareInfo {
    pub total_ram_gb: f64,
    pub cpu_cores: usize,
    pub gpu_type: GpuType,
    pub tier: HardwareTier,
    pub recommended_quantization: String,
}

fn detect_gpu() -> GpuType {
    // Check for Apple Silicon via sysctl
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("sysctl")
            .args(["-n", "machdep.cpu.brand_string"])
            .output()
        {
            let brand = String::from_utf8_lossy(&output.stdout);
            if brand.contains("Apple") {
                return GpuType::Metal;
            }
        }
    }

    // Check for NVIDIA GPU via nvidia-smi
    if let Ok(output) = std::process::Command::new("nvidia-smi")
        .args(["--query-gpu=memory.total", "--format=csv,noheader,nounits"])
        .output()
    {
        if output.status.success() {
            let vram_str = String::from_utf8_lossy(&output.stdout);
            if let Ok(vram_mb) = vram_str.trim().parse::<f64>() {
                return GpuType::Nvidia {
                    vram_gb: vram_mb / 1024.0,
                };
            }
        }
    }

    GpuType::Cpu
}

fn classify_tier(ram_gb: f64, gpu: &GpuType) -> HardwareTier {
    match gpu {
        GpuType::Metal if ram_gb >= 32.0 => HardwareTier::Optimal,
        GpuType::Nvidia { vram_gb } if ram_gb >= 32.0 && *vram_gb >= 8.0 => HardwareTier::Optimal,
        GpuType::Metal if ram_gb >= 16.0 => HardwareTier::Recommended,
        GpuType::Nvidia { vram_gb } if *vram_gb >= 6.0 => HardwareTier::Recommended,
        _ if ram_gb >= 8.0 => HardwareTier::Minimum,
        _ => HardwareTier::Minimum,
    }
}

fn recommended_quantization(tier: &HardwareTier) -> String {
    match tier {
        HardwareTier::Optimal => "Q8_0".to_string(),
        HardwareTier::Recommended => "Q5_K_M".to_string(),
        HardwareTier::Minimum => "Q4_K_M".to_string(),
    }
}

pub fn detect_hardware() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram_gb = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let cpu_cores = sys.cpus().len();
    let gpu_type = detect_gpu();
    let tier = classify_tier(total_ram_gb, &gpu_type);
    let quantization = recommended_quantization(&tier);

    HardwareInfo {
        total_ram_gb,
        cpu_cores,
        gpu_type,
        tier,
        recommended_quantization: quantization,
    }
}

#[tauri::command]
pub fn get_hardware_info<R: Runtime>(_app: tauri::AppHandle<R>) -> Result<HardwareInfo, String> {
    Ok(detect_hardware())
}
