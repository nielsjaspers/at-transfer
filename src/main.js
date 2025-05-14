// Entry point for AT-Transfer P2P File Transfer app

import { initUI } from "./ui/elements.js";
import { setupSenderPeerEvents } from "./webrtc/peer.js";
import { setupReceiverPeerEvents } from "./webrtc/peer.js";
import { setupAuthHandlers, senderAgent, receiverAgent } from "./atproto/auth.js";
import { elements } from "./ui/elements.js";
import { postOffer, fetchOffer, postAnswer, fetchAnswer } from "./atproto/signaling.js";
import { resolveHandleToDid, getPdsEndpointForDid } from "./atproto/did.js";
import { sendFileInChunks, assembleFile } from "./webrtc/fileTransfer.js";
import { setStatus } from "./ui/status.js";
import { ICE_SERVERS } from "./webrtc/peer.js";

let senderPeerConnection = null;
let senderDataChannel = null;
let receiverPeerConnection = null;
let receiverDataChannel = null;
let fileToSend = null;
let currentOfferSessionTimestamp = null;
let receivedFileBuffer = [];
let receivedFileName = "received_file";
let receivedFileType = "application/octet-stream";

document.addEventListener("DOMContentLoaded", () => {
    initUI();
    setupAuthHandlers();


    // File input event for sender
    elements.fileInput.addEventListener('change', (event) => {
        fileToSend = event.target.files[0];
        if (fileToSend) {
            console.log(`[Sender] File selected: ${fileToSend.name} (${fileToSend.size} bytes)`);
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
        console.log("[Sender] Preparing offer to send file...");
        currentOfferSessionTimestamp = new Date().toISOString();

        try {
            const resolvedReceiverDid = await resolveHandleToDid(elements.senderDidInput.value.trim(), senderAgent);
            console.log(`[Sender] Resolved target Receiver DID: ${resolvedReceiverDid}`);

            senderPeerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            setupSenderPeerEvents(senderPeerConnection, resolvedReceiverDid, currentOfferSessionTimestamp);

            senderDataChannel = senderPeerConnection.createDataChannel('fileTransferChannel');
            setupSenderDataChannelEvents(senderDataChannel);

            const offer = await senderPeerConnection.createOffer();
            await senderPeerConnection.setLocalDescription(offer);
            // SDP will be posted in onicecandidate when all candidates are gathered
        } catch (e) {
            setStatus("senderStatus", `Offer Error: ${e.message}`, "error");
            console.log(`[Sender] Error during offer creation: ${e.message}`);
        }
    });

    // --- Wire up Fetch Offer (PoC style) ---
    elements.fetchOfferButton.addEventListener("click", async () => {
        if (!receiverAgent || !elements.receiverDidInput.value) {
            setStatus("receiverStatus", "Error: Login and enter Sender DID/Handle.", "error");
            return;
        }
        setStatus("receiverStatus", "Fetching offer...", "info");
        console.log("[Receiver] Fetching offer from sender...");
        receivedFileBuffer = [];
        elements.receivedFileLink.style.display = 'none';

        try {
            const resolvedSenderDid = await resolveHandleToDid(elements.receiverDidInput.value.trim(), receiverAgent);
            console.log(`[Receiver] Resolved target Sender DID: ${resolvedSenderDid}`);

            const senderPdsUrl = await getPdsEndpointForDid(resolvedSenderDid);
            console.log(`[Receiver] Fetching offer from sender PDS endpoint: ${senderPdsUrl} for sender DID: ${resolvedSenderDid}`);
            const { AtpAgent } = await import('@atproto/api');
            const tempAgent = new AtpAgent({ service: senderPdsUrl });

            const record = await tempAgent.com.atproto.repo.getRecord({
                repo: resolvedSenderDid,
                collection: "app.at-transfer.signaloffer",
                rkey: "self"
            });

            if (!record?.data?.value) {
                setStatus("receiverStatus", "No offer found from sender.", "error");
                console.log("[Receiver] No offer record found.");
                return;
            }

            const offerRecord = record.data.value;
            console.log(`[Receiver] Fetched offer record from sender: ${JSON.stringify(offerRecord)}`);
            if (offerRecord.intendedReceiverDid && offerRecord.intendedReceiverDid !== receiverAgent.session.did) {
                setStatus("receiverStatus", `Offer found (session: ${offerRecord.sessionTimestamp.slice(-10)}), but not intended for you.`, "error");
                console.log(`[Receiver] Offer intended for DID ${offerRecord.intendedReceiverDid}, but receiver is ${receiverAgent.session.did}`);
                return;
            }
            // Store fileName and fileType for use in download link
            receivedFileName = offerRecord.fileName || "received_file";
            receivedFileType = offerRecord.fileType || "application/octet-stream";

            console.log(`[Receiver] Offer record fetched (session: ${offerRecord.sessionTimestamp.slice(-10)}). Creating answer for sender.`);
            setStatus("receiverStatus", `Offer (session: ${offerRecord.sessionTimestamp.slice(-10)}) fetched. Preparing answer...`, "info");

            receiverPeerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            setupReceiverPeerEvents(receiverPeerConnection, resolvedSenderDid, offerRecord.sessionTimestamp);

            receiverPeerConnection.ondatachannel = (event) => {
                console.log("[Receiver] Data channel received from sender. Ready to receive file.");
                receiverDataChannel = event.channel;
                setupReceiverDataChannelEvents(receiverDataChannel);
            };

            await receiverPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerRecord.sdp }));
            const answer = await receiverPeerConnection.createAnswer();
            await receiverPeerConnection.setLocalDescription(answer);
            // SDP answer will be posted in onicecandidate
        } catch (e) {
            setStatus("receiverStatus", `Fetch/Answer Error: ${e.message}`, "error");
            console.log(`[Receiver] Error during fetch/answer: ${e.message}`);
        }
    });

    // --- Sender/Receiver Peer Events (PoC style) ---
    function setupSenderPeerEvents(pc, targetReceiverDid, sessionTimestamp) {
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                // ICE candidate gathering in progress
            } else {
                console.log("[Sender] All ICE candidates gathered. SDP offer complete. Posting to ATProto...");
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
                    console.log(`[Sender] Offer posted with sessionTimestamp: ${sessionTimestamp}`);
                    pollForAnswer(targetReceiverDid, sessionTimestamp);
                } catch (e) {
                    elements.senderStatus.textContent = `Failed to post offer: ${e.message}`;
                    console.log(`[Sender] Failed to post offer: ${e.message}`);
                }
            }
        };
        pc.onconnectionstatechange = () => {
            console.log(`[Sender] PeerConnection state changed: ${pc.connectionState}`);
            elements.senderStatus.textContent = `Connection: ${pc.connectionState}`;
            if (pc.connectionState === 'connected') { console.log("[Sender] PEERS CONNECTED!"); }
        };
    }

    function setupSenderDataChannelEvents(dc) {
        dc.onopen = () => {
            console.log("[Sender] Data channel is open. Starting file transfer to receiver.");
            elements.senderStatus.textContent = "Data channel open. Sending file...";
            if (fileToSend && dc.readyState === "open") {
                sendFileInChunks(fileToSend, dc, (sent, total) => {
                    elements.senderStatus.textContent = `Sending file: ${Math.round((sent/total)*100)}%`;
                }).then(() => {
                    // After sending all chunks and EOF, close the data channel
                    dc.close();
                });
            } else {
                console.log("[Sender] Data channel open but fileToSend or data channel not ready.");
            }
        };
        dc.onclose = () => { console.log("[Sender] Data channel closed after file transfer."); elements.senderStatus.textContent = "Data channel closed."; };
        dc.onerror = (error) => { console.log(`[Sender] Data channel error: ${error}`); elements.senderStatus.textContent = `DC Error: ${error}`; };
    }

    async function pollForAnswer(receiverDid, offerSessionTimestamp) {
        console.log(`[Sender] Polling for answer from receiver DID ${receiverDid} for offer session ${offerSessionTimestamp.slice(-10)}...`);
        try {
            const receiverPdsUrl = await getPdsEndpointForDid(receiverDid);
            console.log(`[Sender] Polling answer from receiver PDS endpoint: ${receiverPdsUrl} for receiver DID: ${receiverDid}`);
            const { AtpAgent } = await import('@atproto/api');
            const tempAgent = new AtpAgent({ service: receiverPdsUrl });

            const record = await tempAgent.com.atproto.repo.getRecord({
                repo: receiverDid,
                collection: "app.at-transfer.signalanswer",
                rkey: "self"
            });

            if (record?.data?.value) {
                const answerRecord = record.data.value;
                console.log(`[Sender] Fetched answer record from receiver: ${JSON.stringify(answerRecord)}`);
                if (answerRecord.offerSessionTimestamp === offerSessionTimestamp &&
                    answerRecord.intendedSenderDid === senderAgent.session.did) {
                    console.log("[Sender] Matching answer record found! Applying remote description.");
                    elements.senderStatus.textContent = "Answer found. Applying...";
                    await senderPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerRecord.sdp }));
                    console.log("[Sender] Remote description (answer) successfully set on PeerConnection.");
                    return;
                } else {
                    console.log(`[Sender] Found answer, but for different session/sender. Expected offerTS: ${offerSessionTimestamp.slice(-10)}, Got: ${answerRecord.offerSessionTimestamp?.slice(-10)}`);
                }
            } else {
                console.log("[Sender] No answer record found yet for this session.");
            }
        } catch (e) { console.log(`[Sender] Poll error (or no answer yet): ${e.message}`); }
        setTimeout(() => pollForAnswer(receiverDid, offerSessionTimestamp), 5000);
    }

    function setupReceiverPeerEvents(pc, offerOwnerDid, offerSessionTimestamp) {
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                // ICE candidate gathering in progress
            } else {
                console.log("[Receiver] All ICE candidates gathered. SDP answer complete. Posting to ATProto...");
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
                    console.log(`[Receiver] Answer posted for offer session ${offerSessionTimestamp}`);
                } catch (e) {
                    elements.receiverStatus.textContent = `Failed to post answer: ${e.message}`;
                    console.log(`[Receiver] Failed to post answer: ${e.message}`);
                }
            }
        };
        pc.onconnectionstatechange = () => {
            console.log(`[Receiver] PeerConnection state changed: ${pc.connectionState}`);
            elements.receiverStatus.textContent = `Connection: ${pc.connectionState}`;
            if (pc.connectionState === 'connected') { console.log("[Receiver] PEERS CONNECTED!"); }
        };
    }

    function setupReceiverDataChannelEvents(dc) {
        console.log("[Receiver] Data channel is open. Ready to receive file data.");
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
            console.log("[Receiver] Data channel closed after file reception.");
            elements.receiverStatus.textContent = "Data channel closed. Assembling file...";
            if (receivedFileBuffer.length > 0) {
                const url = assembleFile(receivedFileBuffer, receivedFileName, receivedFileType);
                elements.receivedFileLink.href = url;
                elements.receivedFileLink.download = receivedFileName;
                elements.receivedFileLink.textContent = `Download ${receivedFileName} (${Math.round((receivedFileBuffer.reduce((sum, chunk) => sum + (chunk instanceof ArrayBuffer ? chunk.byteLength : 0), 0)) / 1024)} KB)`;
                elements.receivedFileLink.style.display = "block";
                elements.receiverStatus.textContent = "File received and assembled! Download link should be visible.";
            }
        };
        dc.onerror = (error) => { console.log(`[Receiver] Data channel error: ${error}`); elements.receiverStatus.textContent = `DC Error: ${error}`; };
    }
});
