/**
 * UI status utilities for AT-Transfer
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
