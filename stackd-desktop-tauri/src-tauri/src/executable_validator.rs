use pelite::pe32::Pe as Pe32;
use pelite::pe64::Pe as Pe64;
use pelite::FileMap;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use std::process::Command;
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutableValidationResult {
    pub status: String, // "verified" | "warning" | "blocked"
    pub score: u8,
    pub exe_path: String,
    pub file_name: String,
    pub parent_folder: String,
    pub product_name: Option<String>,
    pub file_description: Option<String>,
    pub company_name: Option<String>,
    pub original_filename: Option<String>,
    pub reason: String,
}

const BLOCKED_FILENAMES: &[&str] = &[
    "mspaint.exe",
    "notepad.exe",
    "calc.exe",
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "explorer.exe",
    "taskmgr.exe",
    "regedit.exe",
    "control.exe",
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "discord.exe",
    "spotify.exe",
    "steam.exe",
    "epicgameslauncher.exe",
    "galaxyclient.exe",
    "winword.exe",
    "excel.exe",
    "powerpnt.exe",
    "vlc.exe",
    "obs64.exe",
    "setup.exe",
    "install.exe",
    "installer.exe",
    "unins000.exe",
    "uninstall.exe",
    "vcredist_x64.exe",
    "vcredist_x86.exe",
    "dxsetup.exe",
    "unitycrashhandler64.exe",
    "unitycrashhandler32.exe",
    "crashpad_handler.exe",
    "ue4prereqsetup_x64.exe",
    "easyanticheat_eos_setup.exe",
];

const BLOCKED_PATH_FRAGMENTS: &[&str] = &[
    "\\windows\\",
    "\\system32\\",
    "\\syswow64\\",
    "\\windowsapps\\",
    "\\program files\\windows",
    "\\appdata\\local\\programs\\microsoft",
    "\\appdata\\local\\google\\chrome",
    "\\appdata\\local\\discord",
];

const STOP_WORDS: &[&str] = &[
    "the",
    "of",
    "and",
    "a",
    "an",
    "to",
    "in",
    "for",
    "on",
    "with",
    "edition",
    "game",
    "win64",
    "win32",
    "x64",
    "x86",
    "shipping",
    "release",
    "client",
    "launcher",
    "exe",
    "bin",
    "binaries",
    "windows",
    "microsoft",
    "corporation",
    "inc",
    "ltd",
    "llc",
    "studios",
    "studio",
    "entertainment",
    "interactive",
];

fn tokenize(text: &str) -> HashSet<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() >= 2 && !STOP_WORDS.contains(w))
        .map(|w| w.to_string())
        .collect()
}

fn read_pe_version_info(
    bytes: &[u8],
) -> (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
) {
    let mut product_name = None;
    let mut file_description = None;
    let mut company_name = None;
    let mut original_filename = None;

    let mut extract_from_vi = |vi: pelite::resources::version_info::VersionInfo| {
        for lang in vi.translation() {
            vi.strings(*lang, |k, v| {
                let val = v.trim();
                if val.is_empty() {
                    return;
                }
                match k {
                    "ProductName" => product_name = Some(val.to_string()),
                    "FileDescription" => file_description = Some(val.to_string()),
                    "CompanyName" => company_name = Some(val.to_string()),
                    "OriginalFilename" => original_filename = Some(val.to_string()),
                    _ => {}
                }
            });
        }
    };

    if let Ok(pe64) = pelite::pe64::PeFile::from_bytes(bytes) {
        if let Ok(resources) = pe64.resources() {
            if let Ok(vi) = resources.version_info() {
                extract_from_vi(vi);
            }
        }
    } else if let Ok(pe32) = pelite::pe32::PeFile::from_bytes(bytes) {
        if let Ok(resources) = pe32.resources() {
            if let Ok(vi) = resources.version_info() {
                extract_from_vi(vi);
            }
        }
    }

    (
        product_name,
        file_description,
        company_name,
        original_filename,
    )
}

#[tauri::command]
pub fn validate_game_executable(
    exe_path: String,
    game_name: String,
    alternative_names: Option<Vec<String>>,
    developer: Option<String>,
) -> Result<ExecutableValidationResult, String> {
    let path = Path::new(&exe_path);

    if !path.exists() || !path.is_file() {
        return Err("Selected file does not exist.".to_string());
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext != "exe" {
        return Err("Only Windows executable (.exe) files are supported.".to_string());
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let file_name_lower = file_name.to_lowercase();
    let full_path_lower = exe_path.to_lowercase();

    let parent_folder = path
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    // Capa 1: Lista negra de sistema y aplicaciones comunes
    if BLOCKED_FILENAMES.contains(&file_name_lower.as_str())
        || BLOCKED_PATH_FRAGMENTS
            .iter()
            .any(|frag| full_path_lower.contains(frag))
    {
        return Ok(ExecutableValidationResult {
            status: "blocked".to_string(),
            score: 0,
            exe_path,
            file_name,
            parent_folder,
            product_name: None,
            file_description: None,
            company_name: None,
            original_filename: None,
            reason: "System utilities, browsers, and common non-game applications cannot be linked to a game.".to_string(),
        });
    }

    // Capa 2: Lectura de metadatos internos PE (VERSIONINFO)
    let (product_name, file_description, company_name, original_filename) =
        match FileMap::open(path) {
            Ok(map) => read_pe_version_info(map.as_ref()),
            Err(_) => (None, None, None, None),
        };

    // Bloqueo adicional si el PE header declara que es un componente de Windows
    if let Some(ref prod) = product_name {
        let p_low = prod.to_lowercase();
        if p_low.contains("windows operating system") || p_low.contains("microsoft office") {
            return Ok(ExecutableValidationResult {
                status: "blocked".to_string(),
                score: 0,
                exe_path,
                file_name,
                parent_folder,
                product_name,
                file_description,
                company_name,
                original_filename,
                reason:
                    "Executable metadata identifies this file as a Windows OS or Office component."
                        .to_string(),
            });
        }
    }

    // Capa 3: Cálculo de afinidad semántica entre ejecutable y juego
    let mut expected_game_tokens = tokenize(&game_name);
    if let Some(alts) = alternative_names {
        for alt in alts {
            expected_game_tokens.extend(tokenize(&alt));
        }
    }

    let dev_tokens = developer.as_deref().map(tokenize).unwrap_or_default();

    let mut exe_tokens = tokenize(&file_name.trim_end_matches(".exe"));
    exe_tokens.extend(tokenize(&parent_folder));
    if let Some(ref v) = product_name {
        exe_tokens.extend(tokenize(v));
    }
    if let Some(ref v) = file_description {
        exe_tokens.extend(tokenize(v));
    }
    if let Some(ref v) = original_filename {
        exe_tokens.extend(tokenize(v));
    }

    let company_tokens = company_name.as_deref().map(tokenize).unwrap_or_default();

    let game_matches = expected_game_tokens.intersection(&exe_tokens).count();
    let dev_matches = dev_tokens.intersection(&company_tokens).count()
        + dev_tokens.intersection(&exe_tokens).count();

    let mut score: u8 = 0;
    if !expected_game_tokens.is_empty() && game_matches > 0 {
        let ratio = (game_matches as f32 / expected_game_tokens.len() as f32).min(1.0);
        score = score.saturating_add((ratio * 75.0).round() as u8);
    }
    if dev_matches > 0 {
        score = score.saturating_add(25);
    }
    score = score.min(100);

    // Determinar estado final
    if score >= 45 {
        Ok(ExecutableValidationResult {
            status: "verified".to_string(),
            score,
            exe_path,
            file_name,
            parent_folder,
            product_name,
            file_description,
            company_name,
            original_filename,
            reason: "Executable metadata and directory match the selected game.".to_string(),
        })
    } else {
        let detected_label = product_name
            .clone()
            .or_else(|| file_description.clone())
            .unwrap_or_else(|| file_name.clone());

        Ok(ExecutableValidationResult {
            status: "warning".to_string(),
            score,
            exe_path,
            file_name,
            parent_folder,
            product_name,
            file_description,
            company_name,
            original_filename,
            reason: format!(
                "Low match confidence. Executable metadata identifies \"{}\" which may not match \"{}\".",
                detected_label, game_name
            ),
        })
    }
}

#[tauri::command]
pub fn launch_local_executable(exe_path: String) -> Result<(), String> {
    let path = Path::new(&exe_path);
    if !path.exists() || !path.is_file() {
        return Err("Linked executable was not found on disk.".to_string());
    }

    let file_name_lower = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Evitar doble ejecución comprobando procesos activos
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let already_running = sys
        .processes()
        .values()
        .any(|proc| proc.name().to_string_lossy().to_lowercase() == file_name_lower);

    if already_running {
        return Err("This game is already running.".to_string());
    }

    let mut cmd = Command::new(path);
    if let Some(parent) = path.parent() {
        cmd.current_dir(parent);
    }

    cmd.spawn()
        .map_err(|e| format!("Failed to launch executable: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn reveal_executable_in_explorer(exe_path: String) -> Result<(), String> {
    let path = Path::new(&exe_path);
    if !path.exists() {
        return Err("Executable file no longer exists at this path.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .args(["/select,", &exe_path])
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
    }

    Ok(())
}
