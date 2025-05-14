/**
 * Sets up event handlers for the sender's WebRTC data channel.
 * @param {RTCDataChannel} dataChannel
 * @param {Function} onOpen - Called when the channel is open.
 * @param {Function} onClose - Called when the channel is closed.
 * @param {Function} onError - Called when an error occurs.
 */
export function setupSenderDataChannelEvents(
    dataChannel,
    { onOpen, onClose, onError } = {},
) {
    dataChannel.onopen = (event) => {
        logDebug("Sender data channel open");
        if (onOpen) onOpen(event);
    };
    dataChannel.onclose = (event) => {
        logDebug("Sender data channel closed");
        if (onClose) onClose(event);
    };
    dataChannel.onerror = (event) => {
        logDebug("Sender data channel error: " + event.error);
        if (onError) onError(event);
    };
}

/**
 * Sets up event handlers for the receiver's WebRTC data channel.
 * @param {RTCDataChannel} dataChannel
 * @param {Function} onOpen - Called when the channel is open.
 * @param {Function} onClose - Called when the channel is closed.
 * @param {Function} onError - Called when an error occurs.
 * @param {Function} onMessage - Called when a message is received.
 */
export function setupReceiverDataChannelEvents(
    dataChannel,
    { onOpen, onClose, onError, onMessage } = {},
) {
    dataChannel.onopen = (event) => {
        logDebug("Receiver data channel open");
        if (onOpen) onOpen(event);
    };
    dataChannel.onclose = (event) => {
        logDebug("Receiver data channel closed");
        if (onClose) onClose(event);
    };
    dataChannel.onerror = (event) => {
        logDebug("Receiver data channel error: " + event.error);
        if (onError) onError(event);
    };
    dataChannel.onmessage = (event) => {
        if (onMessage) onMessage(event);
    };
}

/**
 * Utility function to log debug messages to the debug log area.
 * This should be replaced by a more robust logger if needed.
 * @param {string} msg
 */
function logDebug(msg) {
    const logArea = document.getElementById("debugLogArea");
    if (logArea) {
        logArea.value += `[dataChannel] ${msg}\n`;
        logArea.scrollTop = logArea.scrollHeight;
    }
}
