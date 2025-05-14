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
        console.log("[Sender] Data channel open");
        if (onOpen) onOpen(event);
    };
    dataChannel.onclose = (event) => {
        console.log("[Sender] Data channel closed");
        if (onClose) onClose(event);
    };
    dataChannel.onerror = (event) => {
        console.log("[Sender] Data channel error: " + event.error);
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
        console.log("[Receiver] Data channel open");
        if (onOpen) onOpen(event);
    };
    dataChannel.onclose = (event) => {
        console.log("[Receiver] Data channel closed");
        if (onClose) onClose(event);
    };
    dataChannel.onerror = (event) => {
        console.log("[Receiver] Data channel error: " + event.error);
        if (onError) onError(event);
    };
    dataChannel.onmessage = (event) => {
        if (onMessage) onMessage(event);
    };
}


