const STORAGE_KEY = "stackd_local_executables_v1";

function readMap() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeMap(map) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // Silencioso
    }
}

export function getLinkedExecutable(igdbGameId) {
    if (!igdbGameId) return null;
    const map = readMap();
    return map[String(igdbGameId)] || null;
}

export function setLinkedExecutable(igdbGameId, data) {
    if (!igdbGameId) return;
    const map = readMap();
    map[String(igdbGameId)] = {
        ...data,
        linkedAt: new Date().toISOString(),
    };
    writeMap(map);
}

export function removeLinkedExecutable(igdbGameId) {
    if (!igdbGameId) return;
    const map = readMap();
    delete map[String(igdbGameId)];
    writeMap(map);
}

export function getAllLinkedExecutables() {
    return readMap();
}