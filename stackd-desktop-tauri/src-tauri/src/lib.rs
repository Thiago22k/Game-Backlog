mod executable_validator;
mod steam_library;
mod tracker;

use std::net::TcpStream;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tracker::{scan_running_candidates, ActiveProcessInfo};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const LOCAL_BACKEND_DIR: &str = r"C:\Users\Thiago\Desktop\Game-Backlog-main\Game-Backlog-main\game-backlog\game-backlog-backend";
const LOCAL_BACKEND_PORT: u16 = 3000;

struct DesktopPreferences {
    minimize_to_tray: AtomicBool,
}

struct BackendProcessState {
    child: Mutex<Option<Child>>,
}

fn is_port_in_use(port: u16) -> bool {
    TcpStream::connect_timeout(
        &std::net::SocketAddr::from(([127, 0, 0, 1], port)),
        Duration::from_millis(250),
    )
    .is_ok()
}

fn start_local_backend_if_needed() -> Option<Child> {
    // Si el puerto 3000 ya responde (ej. lo iniciaste manualmente en VS Code), no duplicarlo
    if is_port_in_use(LOCAL_BACKEND_PORT) {
        return None;
    }

    let backend_path = Path::new(LOCAL_BACKEND_DIR);
    if !backend_path.exists() {
        return None;
    }

    let mut cmd = Command::new("node");
    cmd.arg("server.js")
        .current_dir(backend_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    // Evita que se abra una ventana negra de consola en Windows
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.spawn().ok()
}

fn stop_local_backend(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<BackendProcessState>() {
        if let Ok(mut guard) = state.child.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

#[tauri::command]
fn get_running_processes() -> Vec<ActiveProcessInfo> {
    scan_running_candidates()
}

#[tauri::command]
fn set_minimize_to_tray(enabled: bool, prefs: State<'_, DesktopPreferences>) {
    prefs.minimize_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn update_tray_status(app: tauri::AppHandle, status_text: String) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(format!("Stackd — {}", status_text)));
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_child = start_local_backend_if_needed();

    tauri::Builder::default()
        .manage(DesktopPreferences {
            minimize_to_tray: AtomicBool::new(true),
        })
        .manage(BackendProcessState {
            child: Mutex::new(backend_child),
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Open Stackd", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Stackd", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &separator, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .tooltip("Stackd — Session tracker active")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => {
                        stop_local_backend(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

            if std::env::args().any(|arg| arg == "--minimized") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let prefs = window.state::<DesktopPreferences>();
                    if prefs.minimize_to_tray.load(Ordering::Relaxed) {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        stop_local_backend(window.app_handle());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_running_processes,
            set_minimize_to_tray,
            update_tray_status,
            executable_validator::validate_game_executable,
            executable_validator::launch_local_executable,
            executable_validator::reveal_executable_in_explorer,
            steam_library::get_installed_steam_appids,
            steam_library::get_installed_steam_games,
            steam_library::open_folder_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
