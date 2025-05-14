// Entry point for AT-Transfer P2P File Transfer app

import { initUI } from "./ui/elements.js";
import { setupSenderPeerEvents } from "./webrtc/peer.js";
import { setupReceiverPeerEvents } from "./webrtc/peer.js";
import { setupAuthHandlers, senderAgent, receiverAgent } from "./atproto/auth.js";
import { elements } from "./ui/elements.js";
import { postOffer, fetchOffer, postAnswer, fetchAnswer } from "./atproto/signaling.js";
import { resolveHandleToDid, getPdsEndpointForDid } from "./atproto/did.js";
import { sendFileInChunks, assembleFile } from "./webrtc/fileTransfer.js";
import { setStatus, logDebug } from "./ui/status.js";
import { ICE_SERVERS } from "./webrtc/peer.js";

let senderPeerConnection = null;
let senderDataChannel = null;
let receiverPeerConnection = null;
let receiverDataChannel = null;
let fileToSend = null;
let currentOfferSessionTimestamp = null;
let receivedFileBuffer = [];

document.addEventListener("DOMContentLoaded", () => {
    initUI();
    setupAuthHandlers();


    // File input event for sender
    elements.fileInput.addEventListener('change', (event) => {
        fileToSend = event.target.files[0];
        if (fileToSend) {
            logDebug("Sender", `File selected: ${fileToSend.name} (${fileToSend.size} bytes)`);
            elements.senderStatus.textContent = `Selected: ${fileToSend.name}`;
        }
    });

    // --- Wire up Send Offer (PoC style) ---
    elements.sendOfferButton.addEventListener("click", async () => {
        if (!senderAgent || !fileToSend || !elements.senderDidInput.value) {
            setStatus("senderStatus", "Error: Login, select file, and enter Receiver DID/Handle.", "error");
            return;
        }
        setStatus("senderStatus", "Preparing offer...", "info");
        logDebug("Sender", "Preparing offer...");
        currentOfferSessionTimestamp = new Date().toISOString();

        try {
            const resolvedReceiverDid = await resolveHandleToDid(elements.senderDidInput.value.trim(), senderAgent);
            logDebug("Sender", `Target Receiver DID: ${resolvedReceiverDid}`);

            senderPeerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            setupSenderPeerEvents(senderPeerConnection, resolvedReceiverDid, currentOfferSessionTimestamp);

            senderDataChannel = senderPeerConnection.createDataChannel('fileTransferChannel');
            setupSenderDataChannelEvents(senderDataChannel);

            const offer = await senderPeerConnection.createOffer();
            await senderPeerConnection.setLocalDescription(offer);
            // SDP will be posted in onicecandidate when all candidates are gathered
        } catch (e) {
            setStatus("senderStatus", `Offer Error: ${e.message}`, "error");
            logDebug("Sender", `Offer creation error: ${e.message}`);
        }
    });

    // --- Wire up Fetch Offer (PoC style) ---
    elements.fetchOfferButton.addEventListener("click", async () => {
        if (!receiverAgent || !elements.receiverDidInput.value) {
            setStatus("receiverStatus", "Error: Login and enter Sender DID/Handle.", "error");
            return;
        }
        setStatus("receiverStatus", "Fetching offer...", "info");
        logDebug("Receiver", "Fetching offer...");
        receivedFileBuffer = [];
        elements.receivedFileLink.style.display = 'none';

        try {
            const resolvedSenderDid = await resolveHandleToDid(elements.receiverDidInput.value.trim(), receiverAgent);
            logDebug("Receiver", `Target Sender DID: ${resolvedSenderDid}`);

            const senderPdsUrl = await getPdsEndpointForDid(resolvedSenderDid);
            logDebug("Receiver", `Fetching offer from sender PDS: ${senderPdsUrl} for DID: ${resolvedSenderDid}`);
            const { AtpAgent } = await import('@atproto/api');
            const tempAgent = new AtpAgent({ service: senderPdsUrl });

            const record = await tempAgent.com.atproto.repo.getRecord({
                repo: resolvedSenderDid,
                collection: "app.at-transfer.signaloffer",
                rkey: "self"
            });

            if (!record?.data?.value) {
                setStatus("receiverStatus", "No offer found from sender.", "error");
                logDebug("Receiver", "No offer record found.");
                return;
            }

            const offerRecord = record.data.value;
            logDebug("Receiver", `Fetched offer record: ${JSON.stringify(offerRecord)}`);
            if (offerRecord.intendedReceiverDid && offerRecord.intendedReceiverDid !== receiverAgent.session.did) {
                setStatus("receiverStatus", `Offer found (session: ${offerRecord.sessionTimestamp.slice(-10)}), but not intended for you.`, "error");
                logDebug("Receiver", `Offer intended for ${offerRecord.intendedReceiverDid}, not ${receiverAgent.session.did}`);
                return;
            }

            logDebug("Receiver", `Offer record fetched (session: ${offerRecord.sessionTimestamp.slice(-10)}). Creating answer...`);
            setStatus("receiverStatus", `Offer (session: ${offerRecord.sessionTimestamp.slice(-10)}) fetched. Preparing answer...`, "info");

            receiverPeerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            setupReceiverPeerEvents(receiverPeerConnection, resolvedSenderDid, offerRecord.sessionTimestamp);

            receiverPeerConnection.ondatachannel = (event) => {
                logDebug("Receiver", "Data channel received!");
                receiverDataChannel = event.channel;
                setupReceiverDataChannelEvents(receiverDataChannel);
            };

            await receiverPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerRecord.sdp }));
            const answer = await receiverPeerConnection.createAnswer();
            await receiverPeerConnection.setLocalDescription(answer);
            // SDP answer will be posted in onicecandidate
        } catch (e) {
            setStatus("receiverStatus", `Fetch/Answer Error: ${e.message}`, "error");
            logDebug("Receiver", `Fetch/Answer error: ${e.message}`);
        }
    });

    // --- Sender/Receiver Peer Events (PoC style) ---
    function setupSenderPeerEvents(pc, targetReceiverDid, sessionTimestamp) {
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                // ICE candidate gathering in progress
            } else {
                logDebug("Sender", "All ICE candidates gathered. SDP offer complete. Posting to ATProto...");
                elements.senderStatus.textContent = "SDP offer ready. Posting...";
                try {
                    const offerSdp = pc.localDescription;
                    await senderAgent.com.atproto.repo.putRecord({
                        repo: senderAgent.session.did,
                        collection: "app.at-transfer.signaloffer",
                        rkey: "self",
                        record: {
                            $type: "app.at-transfer.signaloffer",
                            createdAt: new Date().toISOString(),
                            sdp: offerSdp.sdp,
                            fileName: fileToSend.name,
                            fileSize: fileToSend.size,
                            sessionTimestamp: sessionTimestamp,
                            intendedReceiverDid: targetReceiverDid
                        }
                    });
                    elements.senderStatus.textContent = `Offer posted (session: ${sessionTimestamp.slice(-10)}). Waiting for answer...`;
                    logDebug("Sender", `Offer posted with sessionTimestamp: ${sessionTimestamp}`);
                    pollForAnswer(targetReceiverDid, sessionTimestamp);
                } catch (e) {
                    elements.senderStatus.textContent = `Failed to post offer: ${e.message}`;
                    logDebug("Sender", `Failed to post offer: ${e.message}`);
                }
            }
        };
        pc.onconnectionstatechange = () => {
            logDebug("Sender", `Connection state: ${pc.connectionState}`);
            elements.senderStatus.textContent = `Connection: ${pc.connectionState}`;
            if (pc.connectionState === 'connected') { logDebug("Sender", "PEERS CONNECTED!"); }
        };
    }

    function setupSenderDataChannelEvents(dc) {
        dc.onopen = () => {
            logDebug("Sender", "Data channel OPEN. Starting file transfer.");
            elements.senderStatus.textContent = "Data channel open. Sending file...";
            if (fileToSend && dc.readyState === "open") {
                sendFileInChunks(fileToSend, dc, (sent, total) => {
                    elements.senderStatus.textContent = `Sending file: ${Math.round((sent/total)*100)}%`;
                }).then(() => {
                    // After sending all chunks and EOF, close the data channel
                    dc.close();
                });
            } else {
                logDebug("Sender", "Data channel open but fileToSend or data channel not ready.");
            }
        };
        dc.onclose = () => { logDebug("Sender", "Data channel CLOSED."); elements.senderStatus.textContent = "Data channel closed."; };
        dc.onerror = (error) => { logDebug("Sender", `Data channel error: ${error}`); elements.senderStatus.textContent = `DC Error: ${error}`; };
    }

    async function pollForAnswer(receiverDid, offerSessionTimestamp) {
        logDebug("Sender", `Polling for answer from ${receiverDid} for offer session ${offerSessionTimestamp.slice(-10)}...`);
        try {
            const receiverPdsUrl = await getPdsEndpointForDid(receiverDid);
            logDebug("Sender", `Polling answer from receiver PDS: ${receiverPdsUrl} for DID: ${receiverDid}`);
            const { AtpAgent } = await import('@atproto/api');
            const tempAgent = new AtpAgent({ service: receiverPdsUrl });

            const record = await tempAgent.com.atproto.repo.getRecord({
                repo: receiverDid,
                collection: "app.at-transfer.signalanswer",
                rkey: "self"
            });

            if (record?.data?.value) {
                const answerRecord = record.data.value;
                logDebug("Sender", `Fetched answer record: ${JSON.stringify(answerRecord)}`);
                if (answerRecord.offerSessionTimestamp === offerSessionTimestamp &&
                    answerRecord.intendedSenderDid === senderAgent.session.did) {
                    logDebug("Sender", "Matching answer record found!");
                    elements.senderStatus.textContent = "Answer found. Applying...";
                    await senderPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerRecord.sdp }));
                    logDebug("Sender", "Remote description (answer) set.");
                    return;
                } else {
                    logDebug("Sender", `Found answer, but for different session/sender. Expected offerTS: ${offerSessionTimestamp.slice(-10)}, Got: ${answerRecord.offerSessionTimestamp?.slice(-10)}`);
                }
            } else {
                logDebug("Sender", "No answer record found yet.");
            }
        } catch (e) { logDebug("Sender", `Poll error (or no answer yet): ${e.message}`); }
        setTimeout(() => pollForAnswer(receiverDid, offerSessionTimestamp), 5000);
    }

    function setupReceiverPeerEvents(pc, offerOwnerDid, offerSessionTimestamp) {
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                // ICE candidate gathering in progress
            } else {
                logDebug("Receiver", "All ICE candidates gathered. SDP answer complete. Posting to ATProto...");
                elements.receiverStatus.textContent = "SDP answer ready. Posting...";
                try {
                    const answerSdp = pc.localDescription;
                    await receiverAgent.com.atproto.repo.putRecord({
                        repo: receiverAgent.session.did,
                        collection: "app.at-transfer.signalanswer",
                        rkey: "self",
                        record: {
                            $type: "app.at-transfer.signalanswer",
                            createdAt: new Date().toISOString(),
                            sdp: answerSdp.sdp,
                            offerSessionTimestamp: offerSessionTimestamp,
                            intendedSenderDid: offerOwnerDid
                        }
                    });
                    elements.receiverStatus.textContent = `Answer posted for offer session ${offerSessionTimestamp.slice(-10)}.`;
                    logDebug("Receiver", `Answer posted for offer session ${offerSessionTimestamp}`);
                } catch (e) {
                    elements.receiverStatus.textContent = `Failed to post answer: ${e.message}`;
                    logDebug("Receiver", `Failed to post answer: ${e.message}`);
                }
            }
        };
        pc.onconnectionstatechange = () => {
            logDebug("Receiver", `Connection state: ${pc.connectionState}`);
            elements.receiverStatus.textContent = `Connection: ${pc.connectionState}`;
            if (pc.connectionState === 'connected') { logDebug("Receiver", "PEERS CONNECTED!"); }
        };
    }

    function setupReceiverDataChannelEvents(dc) {
        dc.onopen = () => { logDebug("Receiver", "Data channel OPEN."); elements.receiverStatus.textContent = "Data channel open. Receiving..."; };
        dc.onmessage = (event) => {
            if (typeof event.data === "string") {
                // handle EOF or metadata
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "EOF") {
                        // Do nothing here, wait for channel close to assemble file
                        return;
                    }
                } catch {}
            } else if (event.data instanceof ArrayBuffer) {
                receivedFileBuffer.push(event.data);
                // update received bytes
                let receivedBytes = receivedFileBuffer.reduce((sum, chunk) => sum + (chunk instanceof ArrayBuffer ? chunk.byteLength : 0), 0);
                elements.receiverStatus.textContent = `Received ${Math.round(receivedBytes / 1024)} KB`;
            }
        };
        dc.onclose = () => {
            logDebug("Receiver", "Data channel CLOSED.");
            elements.receiverStatus.textContent = "Data channel closed. Assembling file...";
            if (receivedFileBuffer.length > 0) {
                const url = assembleFile(receivedFileBuffer, "received_file", "application/octet-stream");
                elements.receivedFileLink.href = url;
                elements.receivedFileLink.download = "received_file";
                elements.receivedFileLink.style.display = "block";
                elements.receiverStatus.textContent = "File received!";
            }
        };
        dc.onerror = (error) => { logDebug("Receiver", `Data channel error: ${error}`); elements.receiverStatus.textContent = `DC Error: ${error}`; };
    }
});
