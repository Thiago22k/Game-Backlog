use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct InstalledSteamGame {
    pub appid: u64,
    pub install_path: String,
}

fn find_steam_root() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let reg_queries = [
            (r"HKCU\Software\Valve\Steam", "SteamPath"),
            (r"HKLM\SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath"),
            (r"HKLM\SOFTWARE\Valve\Steam", "InstallPath"),
        ];

        for (key, value_name) in reg_queries {
            if let Ok(output) = Command::new("reg")
                .args(["query", key, "/v", value_name])
                .output()
            {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    for line in stdout.lines() {
                        if line.contains(value_name) && line.contains("REG_SZ") {
                            if let Some(raw_path) = line.split("REG_SZ").nth(1) {
                                let cleaned = raw_path.trim().replace('/', "\\");
                                let p = PathBuf::from(&cleaned);
                                if p.exists() {
                                    return Some(p);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let fallbacks = [
        r"C:\Program Files (x86)\Steam",
        r"C:\Program Files\Steam",
        r"D:\Steam",
        r"E:\Steam",
    ];

    for candidate in fallbacks {
        let p = PathBuf::from(candidate);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

fn collect_library_paths(steam_root: &Path) -> Vec<PathBuf> {
    let mut libraries = vec![steam_root.to_path_buf()];
    let vdf_path = steam_root.join("steamapps").join("libraryfolders.vdf");

    if let Ok(content) = fs::read_to_string(&vdf_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("\"path\"") {
                let parts: Vec<&str> = trimmed.split('"').collect();
                if parts.len() >= 4 {
                    let raw = parts[3].replace("\\\\", "\\");
                    let lib_path = PathBuf::from(raw);
                    if lib_path.exists() && !libraries.contains(&lib_path) {
                        libraries.push(lib_path);
                    }
                }
            }
        }
    }

    libraries
}

fn parse_installed_manifest(
    manifest_path: &Path,
    steamapps_dir: &Path,
) -> Option<InstalledSteamGame> {
    let content = fs::read_to_string(manifest_path).ok()?;
    let mut appid: Option<u64> = None;
    let mut state_flags: u32 = 0;
    let mut install_dir: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("\"appid\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                appid = parts[3].parse::<u64>().ok();
            }
        } else if trimmed.starts_with("\"StateFlags\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                state_flags = parts[3].parse::<u32>().unwrap_or(0);
            }
        } else if trimmed.starts_with("\"installdir\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                install_dir = Some(parts[3].to_string());
            }
        }
    }

    if (state_flags & 4) == 0 {
        return None;
    }

    let id = appid?;
    let folder_name = install_dir?;
    let full_path = steamapps_dir.join("common").join(&folder_name);

    if !full_path.exists() {
        return None;
    }

    Some(InstalledSteamGame {
        appid: id,
        install_path: full_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn get_installed_steam_games() -> Vec<InstalledSteamGame> {
    let Some(steam_root) = find_steam_root() else {
        return Vec::new();
    };

    let libraries = collect_library_paths(&steam_root);
    let mut map: HashMap<u64, InstalledSteamGame> = HashMap::new();

    for lib in libraries {
        let steamapps = lib.join("steamapps");
        let Ok(entries) = fs::read_dir(&steamapps) else {
            continue;
        };

        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();
            if name_str.starts_with("appmanifest_") && name_str.ends_with(".acf") {
                if let Some(game) = parse_installed_manifest(&entry.path(), &steamapps) {
                    map.insert(game.appid, game);
                }
            }
        }
    }

    map.into_values().collect()
}

/// Conserva compatibilidad con llamadas anteriores que solo esperaban Vec<u64>
#[tauri::command]
pub fn get_installed_steam_appids() -> Vec<u64> {
    get_installed_steam_games()
        .into_iter()
        .map(|g| g.appid)
        .collect()
}

/// Abre directamente una carpeta de instalación en el Explorador de Windows
#[tauri::command]
pub fn open_folder_in_explorer(folder_path: String) -> Result<(), String> {
    let path = PathBuf::from(&folder_path);
    if !path.exists() {
        return Err("Installation folder not found on disk".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Only supported on Windows".to_string())
    }
}
