// WebRTC peer connection setup and event handlers

// ICE server config (public STUN for demo)
export const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    // { urls: "stun:stun1.l.google.com:19302" },
    // { urls: "stun:stun2.l.google.com:19302" },
    // { urls: "stun:stun3.l.google.com:19302" },
    // { urls: "stun:stun4.l.google.com:19302" },
    // { urls: "stun:stun.nextcloud.com:3478" },
];

// Sender and receiver peer connection and data channel references
export let senderPeerConnection = null;
export let receiverPeerConnection = null;
export let senderDataChannel = null;
export let receiverDataChannel = null;

// File transfer state
export let fileToSend = null;
export let receivedFileBuffer = [];
export let receivedFileName = "";
export let receivedFileType = "";
export let currentOfferSessionTimestamp = null;

// Debug logging utility (should be replaced by actual UI log)
function logDebug(msg) {
    const area = document.getElementById("debugLogArea");
    if (area) {
        area.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
        area.scrollTop = area.scrollHeight;
    }
}

// Setup sender peer connection and events
import {
    setupSenderDataChannelEvents,
    setupReceiverDataChannelEvents,
} from "./dataChannel.js";

export function setupSenderPeerEvents() {
    senderPeerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    senderDataChannel = senderPeerConnection.createDataChannel("file");
    senderDataChannel.binaryType = "arraybuffer";

    // Set up data channel events here
    setupSenderDataChannelEvents(senderDataChannel);

    senderPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            logDebug(
                "Sender ICE candidate: " + JSON.stringify(event.candidate),
            );
            // Candidate gathering handled by signaling logic
        }
    };

    senderPeerConnection.onconnectionstatechange = () => {
        logDebug(
            "Sender connection state: " + senderPeerConnection.connectionState,
        );
    };
}

// Setup receiver peer connection and events
export function setupReceiverPeerEvents() {
    receiverPeerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    receiverPeerConnection.ondatachannel = (event) => {
        receiverDataChannel = event.channel;
        receiverDataChannel.binaryType = "arraybuffer";
        logDebug("Receiver data channel received");
        // Set up data channel events here
        setupReceiverDataChannelEvents(receiverDataChannel);
    };

    receiverPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            logDebug(
                "Receiver ICE candidate: " + JSON.stringify(event.candidate),
            );
            // Candidate gathering handled by signaling logic
        }
    };

    receiverPeerConnection.onconnectionstatechange = () => {
        logDebug(
            "Receiver connection state: " +
                receiverPeerConnection.connectionState,
        );
    };
}

// Utility to reset peer state (optional)
export function resetPeers() {
    if (senderPeerConnection) {
        senderPeerConnection.close();
        senderPeerConnection = null;
    }
    if (receiverPeerConnection) {
        receiverPeerConnection.close();
        receiverPeerConnection = null;
    }
    senderDataChannel = null;
    receiverDataChannel = null;
    fileToSend = null;
    receivedFileBuffer = [];
    receivedFileName = "";
    receivedFileType = "";
    currentOfferSessionTimestamp = null;
}
