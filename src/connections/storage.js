// at-transfer/src/connections/storage.js
// Utility functions for managing known connections in localStorage

const STORAGE_KEY = "at-transfer-known-connections";

/**
 * Get all known connections from localStorage.
 * @returns {Array<{did: string, handle: string, lastUsed: string}>}
 */
export function getKnownConnections() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return [];
    }
}

/**
 * Save the given list of connections to localStorage.
 * @param {Array<{did: string, handle: string, lastUsed: string}>} connections
 */
function saveKnownConnections(connections) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

/**
 * Add or update a known connection (by DID).
 * @param {{did: string, handle: string}} conn
 */
export function addKnownConnection({ did, handle }) {
    if (!did) return;
    let connections = getKnownConnections();
    const now = new Date().toISOString();
    const idx = connections.findIndex((c) => c.did === did);
    if (idx !== -1) {
        // Update handle and lastUsed
        connections[idx].handle = handle || connections[idx].handle;
        connections[idx].lastUsed = now;
    } else {
        connections.push({ did, handle: handle || "", lastUsed: now });
    }
    saveKnownConnections(connections);
}

/**
 * Remove a known connection by DID.
 * @param {string} did
 */
export function removeKnownConnection(did) {
    let connections = getKnownConnections();
    connections = connections.filter((c) => c.did !== did);
    saveKnownConnections(connections);
}

/**
 * Remove all known connections.
 */
export function removeAllKnownConnections() {
    localStorage.removeItem(STORAGE_KEY);
}
