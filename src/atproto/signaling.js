// signaling.js
// Handles signaling (offer/answer exchange) via AT Protocol records

import { AtpAgent } from "@atproto/api";
import { getPdsEndpointForDid, resolveHandleToDid } from "./did.js";
import { setStatus } from "../ui/status.js";

const OFFER_COLLECTION = "app.at-transfer.signaloffer";
const ANSWER_COLLECTION = "app.at-transfer.signalanswer";
const RECORD_RKEY = "self"; // PoC uses 'self'

export async function postOffer(senderAgent, receiverIdentifier, offerObj) {
    try {
        // Resolve receiver DID using senderAgent
        const resolvedReceiverDid = await resolveHandleToDid(receiverIdentifier, senderAgent);
        console.log(`[Sender] Target Receiver DID: ${resolvedReceiverDid}`);

        // Post offer to sender's own repo (PoC style)
        await senderAgent.com.atproto.repo.putRecord({
            repo: senderAgent.session.did,
            collection: OFFER_COLLECTION,
            rkey: RECORD_RKEY,
            record: {
                ...offerObj,
                intendedReceiverDid: resolvedReceiverDid
            },
        });
        setStatus("senderStatus", "Offer posted", "success");
        console.log("[Sender] Offer posted successfully");
        return resolvedReceiverDid;
    } catch (err) {
        setStatus("senderStatus", "Failed to post offer", "error");
        console.log(`[Sender] Error posting offer: ${err.message}`);
        throw err;
    }
}

export async function fetchOffer(receiverAgent, senderIdentifier) {
    try {
        // Resolve sender DID using receiverAgent
        const resolvedSenderDid = await resolveHandleToDid(senderIdentifier, receiverAgent);
        console.log(`[Receiver] Target Sender DID: ${resolvedSenderDid}`);

        // Discover sender's PDS endpoint
        const senderPdsUrl = await getPdsEndpointForDid(resolvedSenderDid);
        const tempAgent = new AtpAgent({ service: senderPdsUrl });

        // Fetch offer from sender's repo
        const record = await tempAgent.com.atproto.repo.getRecord({
            repo: resolvedSenderDid,
            collection: OFFER_COLLECTION,
            rkey: RECORD_RKEY,
        });

        console.log("[Receiver] Fetched offer record");
        return { offer: record.data?.value, resolvedSenderDid };
    } catch (err) {
        setStatus("receiverStatus", "No offer found", "error");
        console.log("[Receiver] No offer found or error fetching offer");
        return { offer: null, resolvedSenderDid: null };
    }
}

export async function postAnswer(receiverAgent, senderDid, answerObj) {
    try {
        // Post answer to receiver's own repo (PoC style)
        await receiverAgent.com.atproto.repo.putRecord({
            repo: receiverAgent.session.did,
            collection: ANSWER_COLLECTION,
            rkey: RECORD_RKEY,
            record: {
                ...answerObj,
                intendedSenderDid: senderDid
            },
        });
        setStatus("receiverStatus", "Answer posted", "success");
        console.log("[Receiver] Answer posted successfully");
    } catch (err) {
        setStatus("receiverStatus", "Failed to post answer", "error");
        console.log(`[Receiver] Error posting answer: ${err.message}`);
        throw err;
    }
}

export async function fetchAnswer(senderAgent, receiverDid) {
    try {
        // Discover receiver's PDS endpoint
        const receiverPdsUrl = await getPdsEndpointForDid(receiverDid);
        const tempAgent = new AtpAgent({ service: receiverPdsUrl });

        // Fetch answer from receiver's repo
        const record = await tempAgent.com.atproto.repo.getRecord({
            repo: receiverDid,
            collection: ANSWER_COLLECTION,
            rkey: RECORD_RKEY,
        });

        console.log("[Sender] Fetched answer record");
        return record.data?.value;
    } catch (err) {
        setStatus("senderStatus", "No answer found", "error");
        console.log("[Sender] No answer found or error fetching answer");
        return null;
    }
}
