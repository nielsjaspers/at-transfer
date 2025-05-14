/**
 * UI status and debug log utilities for AT-Transfer
 */

const STATUS_TYPES = {
    idle: "color: #666;",
    success: "color: #1a9c3c;",
    error: "color: #d32f2f;",
    info: "color: #2a7cff;",
    warning: "color: #e67e22;",
};

/**
 * Set a status message for a given element.
 * @param {HTMLElement|string} elOrId - Element or its id.
 * @param {string} message - Status message.
 * @param {'idle'|'success'|'error'|'info'|'warning'} [type='idle'] - Status type.
 */
export function setStatus(elOrId, message, type = "idle") {
    let el =
        typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    el.textContent = message;
    el.setAttribute("style", STATUS_TYPES[type] || STATUS_TYPES.idle);
}

/**
 * Append a debug message to the debug log area.
 * @param {string} msg - Message to log.
 * @param {'info'|'success'|'error'|'warning'} [type='info']
 */
export function logDebug(msg, type = "info") {
    const logArea = document.getElementById("debugLogArea");
    if (!logArea) return;
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    let prefix = "";
    switch (type) {
        case "success":
            prefix = "[OK] ";
            break;
        case "error":
            prefix = "[ERR] ";
            break;
        case "warning":
            prefix = "[WARN] ";
            break;
        default:
            prefix = "[INFO] ";
    }
    logArea.value += `[${timestamp}] ${prefix}${msg}\n`;
    logArea.scrollTop = logArea.scrollHeight;
}

/**
 * Clear the debug log area.
 */
export function clearDebugLog() {
    const logArea = document.getElementById("debugLogArea");
    if (logArea) logArea.value = "";
}
