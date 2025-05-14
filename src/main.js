import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { Agent } from "@atproto/api";
import { setStatus } from "./ui/status.js";
import {
    postOffer,
    fetchOffer,
    postAnswer,
    fetchAnswer,
} from "./atproto/signaling.js";
import { resolveHandleToDid, getPdsEndpointForDid } from "./atproto/did.js";
import { sendFileInChunks, assembleFile } from "./webrtc/fileTransfer.js";
import { ICE_SERVERS } from "./webrtc/peer.js";

// ---- STATE ----
let oauthClient = null;
let agent = null;
let session = null;
let userDid = null;
let userHandle = null;
let currentRole = null; // "send" or "receive"
let peerConnection = null;
let dataChannel = null;
let fileToSend = null;
let currentOfferSessionTimestamp = null;
let receivedFileBuffer = [];
let receivedFileName = "received_file";
let receivedFileType = "application/octet-stream";

// ---- UI SETUP ----
function renderLoginScreen() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="panel" id="loginPanel">
      <h2>AT-Transfer</h2>
      <p>Sign in with your Bluesky account to start transferring files peer-to-peer.</p>
      <label for="loginHandleInput">Your Handle or DID</label>
      <input id="loginHandleInput" type="text" placeholder="your.handle.bsky.social or did:plc:..." autocomplete="username" style="width:100%;margin-bottom:12px;" />
      <button id="oauthLoginBtn" class="oauth-btn">Sign in with Bluesky</button>
      <div id="loginStatus" class="status"></div>
      <p style="font-size:0.95em;color:#888;margin-top:18px;">
        <b>Security note:</b> OAuth login is handled by Bluesky. Never enter your main password into third-party apps.
      </p>
    </div>
  `;
    document.getElementById("oauthLoginBtn").onclick = async () => {
        const handleOrDid = document
            .getElementById("loginHandleInput")
            .value.trim();
        if (!handleOrDid) {
            setStatus(
                "loginStatus",
                "Please enter your handle or DID.",
                "error",
            );
            return;
        }
        setStatus("loginStatus", "Redirecting to Bluesky...", "info");
        try {
            await oauthClient.signIn(handleOrDid);
            // Will redirect to Bluesky and back
        } catch (e) {
            setStatus(
                "loginStatus",
                "OAuth login failed: " + e.message,
                "error",
            );
        }
    };
}

function renderDashboard() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="panel" id="dashboardPanel">
      <h2>Welcome, ${userHandle || userDid}</h2>
      <p>What do you want to do?</p>
      <div style="display:flex;gap:18px;margin:18px 0;">
        <button id="chooseSendBtn">Send File</button>
        <button id="chooseReceiveBtn">Receive File</button>
      </div>
      <button id="logoutBtn" style="margin-top:12px;background:#d32f2f;">Log out</button>
    </div>
    <div id="rolePanel"></div>
  `;
    document.getElementById("chooseSendBtn").onclick = () => showSendPanel();
    document.getElementById("chooseReceiveBtn").onclick = () =>
        showReceivePanel();
    document.getElementById("logoutBtn").onclick = async () => {
        await oauthClient.signOut();
        window.location.reload();
    };
}

function showSendPanel() {
    currentRole = "send";
    const rolePanel = document.getElementById("rolePanel");
    rolePanel.innerHTML = `
    <div class="panel" id="sendPanel">
      <h2>Send File</h2>
      <label for="sendReceiverInput">Receiver DID or Handle</label>
      <input id="sendReceiverInput" type="text" placeholder="did:plc:... or handle.bsky.social" autocomplete="off" />
      <label for="sendFileInput">File to Send</label>
      <input id="sendFileInput" type="file" />
      <button id="sendOfferBtn">Send Offer</button>
      <span class="status" id="sendStatus"></span>
      <button id="backToDashboardFromSend" style="margin-top:18px;">Back</button>
    </div>
  `;
    document.getElementById("sendFileInput").onchange = (e) => {
        fileToSend = e.target.files[0];
        if (fileToSend) {
            setStatus("sendStatus", `Selected: ${fileToSend.name}`, "info");
        }
    };
    document.getElementById("sendOfferBtn").onclick = sendOfferFlow;
    document.getElementById("backToDashboardFromSend").onclick = () => {
        document.getElementById("rolePanel").innerHTML = "";
    };
}

function showReceivePanel() {
    currentRole = "receive";
    const rolePanel = document.getElementById("rolePanel");
    rolePanel.innerHTML = `
    <div class="panel" id="receivePanel">
      <h2>Receive File</h2>
      <label for="receiveSenderInput">Sender DID or Handle</label>
      <input id="receiveSenderInput" type="text" placeholder="did:plc:... or handle.bsky.social" autocomplete="off" />
      <button id="fetchOfferBtn">Fetch Offer</button>
      <span class="status" id="receiveStatus"></span>
      <a id="receivedFileLink" href="#" download style="display:none;">Download Received File</a>
      <button id="backToDashboardFromReceive" style="margin-top:18px;">Back</button>
    </div>
  `;
    document.getElementById("fetchOfferBtn").onclick = fetchOfferFlow;
    document.getElementById("backToDashboardFromReceive").onclick = () => {
        document.getElementById("rolePanel").innerHTML = "";
    };
}

// ---- OAUTH SESSION MANAGEMENT ----
// Follows official atproto OAuth pattern for persistent sessions
async function setupOAuthClient() {
    oauthClient = new BrowserOAuthClient({
        clientId: "https://at-transfer.dev.nielsjaspers.com/client_metadata.json",
        handleResolver: "https://bsky.social",
    });
    // Try to restore session or handle OAuth callback
    const result = await oauthClient.init();
    if (result && result.session) {
        session = result.session;
        agent = new Agent(session); // Pass session directly as per docs
        userDid = session.sub;
        userHandle = session.handle;
        return true;
    }
    session = null;
    agent = null;
    userDid = null;
    userHandle = null;
    return false;
}

// ---- SEND FLOW ----
async function sendOfferFlow() {
    const receiverInput = document
        .getElementById("sendReceiverInput")
        .value.trim();
    if (!agent || !fileToSend || !receiverInput) {
        setStatus(
            "sendStatus",
            "Login, select file, and enter Receiver DID/Handle.",
            "error",
        );
        return;
    }
    setStatus("sendStatus", "Preparing offer...", "info");
    currentOfferSessionTimestamp = new Date().toISOString();

    try {
        const resolvedReceiverDid = await resolveHandleToDid(
            receiverInput,
            agent,
        );
        peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        dataChannel = peerConnection.createDataChannel("fileTransferChannel");
        dataChannel.binaryType = "arraybuffer";
        setupSenderDataChannelEvents(dataChannel);

        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) return; // Wait for all candidates
            setStatus("sendStatus", "Posting offer...", "info");
            try {
                const offerSdp = peerConnection.localDescription;
                const offerDetails = {
                    $type: "app.at-transfer.signaloffer",
                    createdAt: new Date().toISOString(),
                    sdp: offerSdp.sdp,
                    fileName: fileToSend.name,
                    fileSize: fileToSend.size,
                    sessionTimestamp: currentOfferSessionTimestamp,
                    // intendedReceiverDid will be added by postOffer in signaling.js
                };

                // Use postOffer from signaling.js
                // resolvedReceiverDid is from the outer scope of sendOfferFlow
                const actualPostedReceiverDid = await postOffer(
                    agent,
                    resolvedReceiverDid,
                    offerDetails,
                );

                if (actualPostedReceiverDid) {
                    setStatus(
                        "sendStatus",
                        "Offer posted. Waiting for answer...",
                        "info",
                    );
                    pollForAnswer(
                        actualPostedReceiverDid, // Use the DID returned by postOffer
                        currentOfferSessionTimestamp,
                    );
                } else {
                    setStatus(
                        "sendStatus",
                        "Failed to post offer (receiver DID not resolved/returned).",
                        "error",
                    );
                }
            } catch (e) {
                setStatus(
                    "sendStatus",
                    `Failed to post offer: ${e.message}`,
                    "error",
                );
            }
        };

        peerConnection.onconnectionstatechange = () => {
            setStatus(
                "sendStatus",
                `Connection: ${peerConnection.connectionState}`,
                "info",
            );
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
    } catch (e) {
        setStatus("sendStatus", `Offer Error: ${e.message}`, "error");
    }
}

function setupSenderDataChannelEvents(dc) {
    dc.onopen = () => {
        setStatus("sendStatus", "Data channel open. Sending file...", "info");
        if (fileToSend && dc.readyState === "open") {
            sendFileInChunks(fileToSend, dc, (sent, total) => {
                setStatus(
                    "sendStatus",
                    `Sending file: ${Math.round((sent / total) * 100)}%`,
                    "info",
                );
            }).then(() => {
                dc.close();
            });
        }
    };
    dc.onclose = () => setStatus("sendStatus", "Data channel closed.", "info");
    dc.onerror = (error) =>
        setStatus("sendStatus", `DC Error: ${error}`, "error");
}

async function pollForAnswer(receiverDid, offerSessionTimestamp) {
    try {
        const receiverPdsUrl = await getPdsEndpointForDid(receiverDid);
        const { AtpAgent } = await import("@atproto/api");
        const tempAgent = new AtpAgent({ service: receiverPdsUrl });

        const record = await tempAgent.com.atproto.repo.getRecord({
            repo: receiverDid,
            collection: "app.at-transfer.signalanswer",
            rkey: "self",
        });

        if (record?.data?.value) {
            const answerRecord = record.data.value;
            if (
                answerRecord.offerSessionTimestamp === offerSessionTimestamp &&
                answerRecord.intendedSenderDid === agent.did
            ) {
                setStatus("sendStatus", "Answer found. Applying...", "success");
                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription({
                        type: "answer",
                        sdp: answerRecord.sdp,
                    }),
                );
                return;
            }
        }
    } catch (e) {}
    setTimeout(() => pollForAnswer(receiverDid, offerSessionTimestamp), 5000);
}

// ---- RECEIVE FLOW ----
async function fetchOfferFlow() {
    const senderInput = document
        .getElementById("receiveSenderInput")
        .value.trim();
    if (!agent || !senderInput) {
        setStatus(
            "receiveStatus",
            "Login and enter Sender DID/Handle.",
            "error",
        );
        return;
    }
    setStatus("receiveStatus", "Fetching offer...", "info");
    receivedFileBuffer = [];
    document.getElementById("receivedFileLink").style.display = "none";

    try {
        const resolvedSenderDid = await resolveHandleToDid(senderInput, agent);
        const senderPdsUrl = await getPdsEndpointForDid(resolvedSenderDid);
        const { AtpAgent } = await import("@atproto/api");
        const tempAgent = new AtpAgent({ service: senderPdsUrl });

        const record = await tempAgent.com.atproto.repo.getRecord({
            repo: resolvedSenderDid,
            collection: "app.at-transfer.signaloffer",
            rkey: "self",
        });

        if (!record?.data?.value) {
            setStatus("receiveStatus", "No offer found from sender.", "error");
            return;
        }

        const offerRecord = record.data.value;
        if (
            offerRecord.intendedReceiverDid &&
            offerRecord.intendedReceiverDid !== agent.did
        ) {
            setStatus(
                "receiveStatus",
                `Offer found (session: ${offerRecord.sessionTimestamp.slice(-10)}), but not intended for you.`,
                "error",
            );
            return;
        }
        receivedFileName = offerRecord.fileName || "received_file";
        receivedFileType = offerRecord.fileType || "application/octet-stream";

        setStatus(
            "receiveStatus",
            `Offer (session: ${offerRecord.sessionTimestamp.slice(-10)}) fetched. Preparing answer...`,
            "info",
        );

        peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupReceiverDataChannelEvents(dataChannel);
        };

        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) return;
            setStatus("receiveStatus", "Posting answer...", "info");
            try {
                const answerSdp = peerConnection.localDescription;
                await agent.com.atproto.repo.putRecord({
                    repo: agent.session.did,
                    collection: "app.at-transfer.signalanswer",
                    rkey: "self",
                    record: {
                        $type: "app.at-transfer.signalanswer",
                        createdAt: new Date().toISOString(),
                        sdp: answerSdp.sdp,
                        offerSessionTimestamp: offerRecord.sessionTimestamp,
                        intendedSenderDid: resolvedSenderDid,
                    },
                });
                setStatus(
                    "receiveStatus",
                    "Answer posted. Waiting for file...",
                    "info",
                );
            } catch (e) {
                setStatus(
                    "receiveStatus",
                    `Failed to post answer: ${e.message}`,
                    "error",
                );
            }
        };

        peerConnection.onconnectionstatechange = () => {
            setStatus(
                "receiveStatus",
                `Connection: ${peerConnection.connectionState}`,
                "info",
            );
        };

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: offerRecord.sdp }),
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
    } catch (e) {
        setStatus("receiveStatus", `Fetch/Answer Error: ${e.message}`, "error");
    }
}

function setupReceiverDataChannelEvents(dc) {
    setStatus("receiveStatus", "Data channel open. Receiving...", "info");
    dc.onmessage = (event) => {
        if (typeof event.data === "string") {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "EOF") {
                    return;
                }
            } catch {}
        } else if (event.data instanceof ArrayBuffer) {
            receivedFileBuffer.push(event.data);
            let receivedBytes = receivedFileBuffer.reduce(
                (sum, chunk) =>
                    sum + (chunk instanceof ArrayBuffer ? chunk.byteLength : 0),
                0,
            );
            setStatus(
                "receiveStatus",
                `Received ${Math.round(receivedBytes / 1024)} KB`,
                "info",
            );
        }
    };
    dc.onclose = () => {
        setStatus(
            "receiveStatus",
            "Data channel closed. Assembling file...",
            "info",
        );
        if (receivedFileBuffer.length > 0) {
            const url = assembleFile(
                receivedFileBuffer,
                receivedFileName,
                receivedFileType,
            );
            const link = document.getElementById("receivedFileLink");
            link.href = url;
            link.download = receivedFileName;
            link.textContent = `Download ${receivedFileName} (${Math.round(receivedFileBuffer.reduce((sum, chunk) => sum + (chunk instanceof ArrayBuffer ? chunk.byteLength : 0), 0) / 1024)} KB)`;
            link.style.display = "block";
            setStatus(
                "receiveStatus",
                "File received and assembled! Download link should be visible.",
                "success",
            );
        }
    };
    dc.onerror = (error) =>
        setStatus("receiveStatus", `DC Error: ${error}`, "error");
}

// ---- APP INIT ----
document.addEventListener("DOMContentLoaded", async () => {
    const loggedIn = await setupOAuthClient();
    if (!loggedIn) {
        renderLoginScreen();
        return;
    }
    renderDashboard();
});
