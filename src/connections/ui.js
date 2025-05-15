// at-transfer/src/connections/ui.js
// UI for listing, selecting, and removing known connections

/**
 * Renders the Known Connections modal.
 * @param {Array<{did: string, handle: string}>} connections
 * @param {Object} options
 * @param {function({did:string,handle:string}):void} options.onSelect
 * @param {function(string):void} options.onRemove
 * @param {function():void} options.onRemoveAll
 * @param {function():void} options.onClose
 */
export function showConnectionsModal(connections, { onSelect, onRemove, onRemoveAll, onClose }) {
    // Remove any existing modal
    const existing = document.getElementById("connectionsModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "connectionsModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.32)";
    modal.style.zIndex = "9999";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    const panel = document.createElement("div");
    panel.style.background = "#fff";
    panel.style.borderRadius = "8px";
    panel.style.boxShadow = "0 2px 12px rgba(0,0,0,0.13)";
    panel.style.padding = "28px 32px 22px 32px";
    panel.style.minWidth = "340px";
    panel.style.maxWidth = "96vw";
    panel.style.maxHeight = "80vh";
    panel.style.overflowY = "auto";
    panel.style.position = "relative";

    const title = document.createElement("h2");
    title.textContent = "Known Connections";
    title.style.marginTop = "0";
    panel.appendChild(title);

    if (!connections || connections.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.textContent = "No known connections yet.";
        emptyMsg.style.color = "#888";
        emptyMsg.style.margin = "18px 0 12px 0";
        panel.appendChild(emptyMsg);
    } else {
        const list = document.createElement("ul");
        list.style.listStyle = "none";
        list.style.padding = "0";
        list.style.margin = "0 0 18px 0";
        connections.forEach(conn => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.justifyContent = "space-between";
            li.style.padding = "7px 0";
            li.style.borderBottom = "1px solid #f0f0f0";

            const info = document.createElement("span");
            info.style.flex = "1";
            info.style.cursor = "pointer";
            info.title = conn.did;
            const handleElement = document.createElement("b");
            handleElement.textContent = conn.handle;

            const didElement = document.createElement("span");
            didElement.style.fontSize = "0.93em";
            didElement.style.color = "#888";
            didElement.textContent = conn.did;

            info.appendChild(handleElement);
            info.appendChild(document.createElement("br"));
            info.appendChild(didElement);
            info.onclick = () => {
                onSelect(conn);
                closeModal();
            };

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.style.background = "#e74c3c";
            removeBtn.style.color = "#fff";
            removeBtn.style.border = "none";
            removeBtn.style.borderRadius = "4px";
            removeBtn.style.padding = "3px 10px";
            removeBtn.style.fontSize = "0.97em";
            removeBtn.style.marginLeft = "12px";
            removeBtn.style.cursor = "pointer";
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Remove connection for ${conn.handle}?`)) {
                    onRemove(conn.did);
                }
            };

            li.appendChild(info);
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
        panel.appendChild(list);
    }

    // Remove all button
    if (connections && connections.length > 0) {
        const removeAllBtn = document.createElement("button");
        removeAllBtn.textContent = "Remove All";
        removeAllBtn.style.background = "#d32f2f";
        removeAllBtn.style.color = "#fff";
        removeAllBtn.style.border = "none";
        removeAllBtn.style.borderRadius = "4px";
        removeAllBtn.style.padding = "6px 16px";
        removeAllBtn.style.fontSize = "1em";
        removeAllBtn.style.marginTop = "8px";
        removeAllBtn.style.marginRight = "12px";
        removeAllBtn.onclick = () => {
            if (confirm("Are you sure you want to remove ALL known connections? This cannot be undone.")) {
                onRemoveAll();
                closeModal();
            }
        };
        panel.appendChild(removeAllBtn);
    }

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.background = "#888";
    closeBtn.style.color = "#fff";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "4px";
    closeBtn.style.padding = "6px 16px";
    closeBtn.style.fontSize = "1em";
    closeBtn.style.marginTop = "8px";
    closeBtn.onclick = () => {
        closeModal();
        if (onClose) onClose();
    };
    panel.appendChild(closeBtn);

    // Keyboard: ESC to close
    function escListener(e) {
        if (e.key === "Escape") {
            closeModal();
            if (onClose) onClose();
        }
    }
    document.addEventListener("keydown", escListener);

    function closeModal() {
        modal.remove();
        document.removeEventListener("keydown", escListener);
    }

    modal.appendChild(panel);
    document.body.appendChild(modal);
}
