import { invoke } from "@tauri-apps/api/core";

const MINIMIZE_TO_TRAY_KEY = "stackd_minimize_to_tray";

export function isTauriDesktop() {
    return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function getMinimizeToTrayPreference() {
    try {
        const raw = localStorage.getItem(MINIMIZE_TO_TRAY_KEY);
        // Por defecto activo (true) para no perder sesiones al cerrar la ventana
        return raw === null ? true : raw === "true";
    } catch {
        return true;
    }
}

export async function setMinimizeToTrayPreference(enabled) {
    try {
        localStorage.setItem(MINIMIZE_TO_TRAY_KEY, String(Boolean(enabled)));
    } catch {
        // Silencioso
    }

    if (isTauriDesktop()) {
        try {
            await invoke("set_minimize_to_tray", { enabled: Boolean(enabled) });
        } catch {
            // Silencioso
        }
    }
}

export async function syncDesktopPreferencesToRust() {
    if (!isTauriDesktop()) return;
    const minimizeToTray = getMinimizeToTrayPreference();
    try {
        await invoke("set_minimize_to_tray", { enabled: minimizeToTray });
    } catch {
        // Silencioso
    }
}

export async function updateTrayStatus(statusText) {
    if (!isTauriDesktop()) return;
    try {
        await invoke("update_tray_status", { statusText });
    } catch {
        // Silencioso
    }
}