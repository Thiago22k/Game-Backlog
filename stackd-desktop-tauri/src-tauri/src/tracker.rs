use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
pub struct ActiveProcessInfo {
    pub pid: u32,
    pub exe_name: String,
    pub normalized_name: String,
}

const IGNORED_PROCESSES: &[&str] = &[
    "explorer.exe",
    "svchost.exe",
    "steam.exe",
    "steamwebhelper.exe",
    "epicgameslauncher.exe",
    "discord.exe",
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "code.exe",
    "antigravity.exe",
    "node.exe",
    "cmd.exe",
    "powershell.exe",
    "windowsterminal.exe",
    "taskmgr.exe",
    "searchhost.exe",
    "runtimebroker.exe",
    "applicationframehost.exe",
    "systemsettings.exe",
    "nvidia overlay.exe",
    "nvcontainer.exe",
];

fn normalize_exe_name(exe: &str) -> String {
    let base = exe
        .trim_end_matches(".exe")
        .trim_end_matches(".EXE")
        .replace(['_', '-', '.'], " ");

    base.split_whitespace()
        .filter(|w| {
            let lw = w.to_lowercase();
            !matches!(
                lw.as_str(),
                "win64" | "win32" | "shipping" | "x64" | "x86" | "launcher" | "game" | "client"
            )
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Escanea los procesos activos en Windows y devuelve candidatos que coincidan con nombres de juegos.
pub fn scan_running_candidates() -> Vec<ActiveProcessInfo> {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut results = Vec::new();
    for (pid, proc_) in sys.processes() {
        let exe = proc_.name().to_string_lossy().to_string();
        let lower = exe.to_lowercase();

        if !lower.ends_with(".exe") || IGNORED_PROCESSES.contains(&lower.as_str()) {
            continue;
        }

        // Filtrar procesos de sistema en C:\Windows
        if let Some(path) = proc_.exe() {
            let p_str = path.to_string_lossy().to_lowercase();
            if p_str.starts_with("c:\\windows") {
                continue;
            }
        }

        let normalized = normalize_exe_name(&exe);
        if normalized.len() >= 3 {
            results.push(ActiveProcessInfo {
                pid: pid.as_u32(),
                exe_name: exe,
                normalized_name: normalized,
            });
        }
    }

    results
}
