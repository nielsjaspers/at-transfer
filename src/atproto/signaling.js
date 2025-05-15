// signaling.js
// Handles signaling (offer/answer exchange) via AT Protocol records

import { AtpAgent } from "@atproto/api";
import { getPdsEndpointForDid, resolveHandleToDid } from "./did.js";
import { setStatus } from "../ui/status.js";

const OFFER_COLLECTION = "app.at-transfer.signaloffer";
const ANSWER_COLLECTION = "app.at-transfer.signalanswer";

/**
 * Post an offer to the sender's repo using a random session rkey.
 * Returns { resolvedReceiverDid, sessionRkey }
 */
export async function postOffer(
    senderAgent,
    receiverIdentifier,
    offerObj,
    sessionRkey,
) {
    try {
        // Resolve receiver DID using senderAgent
        const resolvedReceiverDid = await resolveHandleToDid(
            receiverIdentifier,
            senderAgent,
        );
        console.log(`[Sender] Target Receiver DID: ${resolvedReceiverDid}`);

        // Post offer to sender's own repo using sessionRkey
        await senderAgent.com.atproto.repo.putRecord({
            repo: senderAgent.did,
            collection: OFFER_COLLECTION,
            rkey: sessionRkey,
            record: {
                ...offerObj,
                intendedReceiverDid: resolvedReceiverDid,
            },
        });
        setStatus("senderStatus", "Offer posted", "success");
        console.log("[Sender] Offer posted successfully");
        return { resolvedReceiverDid, sessionRkey };
    } catch (err) {
        setStatus("senderStatus", "Failed to post offer", "error");
        console.log(`[Sender] Error posting offer: ${err.message}`);
        throw err;
    }
}

/**
 * Fetch an offer from the sender's repo using the session rkey.
 * Returns { offer, resolvedSenderDid }
 */
export async function fetchOffer(receiverAgent, senderIdentifier, sessionRkey) {
    try {
        // Resolve sender DID using receiverAgent
        const resolvedSenderDid = await resolveHandleToDid(
            senderIdentifier,
            receiverAgent,
        );
        console.log(`[Receiver] Target Sender DID: ${resolvedSenderDid}`);

        // Discover sender's PDS endpoint
        const senderPdsUrl = await getPdsEndpointForDid(resolvedSenderDid);
        const tempAgent = new AtpAgent({ service: senderPdsUrl });

        // Fetch offer from sender's repo using sessionRkey
        const record = await tempAgent.com.atproto.repo.getRecord({
            repo: resolvedSenderDid,
            collection: OFFER_COLLECTION,
            rkey: sessionRkey,
        });

        console.log("[Receiver] Fetched offer record");
        return { offer: record.data?.value, resolvedSenderDid };
    } catch (err) {
        setStatus("receiverStatus", "No offer found", "error");
        console.log("[Receiver] No offer found or error fetching offer");
        return { offer: null, resolvedSenderDid: null };
    }
}

/**
 * Post an answer to the receiver's repo using the session rkey.
 */
export async function postAnswer(
    receiverAgent,
    senderDid,
    answerObj,
    sessionRkey,
) {
    try {
        // Post answer to receiver's own repo using sessionRkey
        await receiverAgent.com.atproto.repo.putRecord({
            repo: receiverAgent.did,
            collection: ANSWER_COLLECTION,
            rkey: sessionRkey,
            record: {
                ...answerObj,
                intendedSenderDid: senderDid,
                // Ensure sessionTimestamp is present for schema compliance
                sessionTimestamp: answerObj.sessionTimestamp,
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

/**
 * Fetch an answer from the receiver's repo using the session rkey.
 */
export async function fetchAnswer(senderAgent, receiverDid, sessionRkey) {
    try {
        // Discover receiver's PDS endpoint
        const receiverPdsUrl = await getPdsEndpointForDid(receiverDid);
        const tempAgent = new AtpAgent({ service: receiverPdsUrl });

        // Fetch answer from receiver's repo using sessionRkey
        const record = await tempAgent.com.atproto.repo.getRecord({
            repo: receiverDid,
            collection: ANSWER_COLLECTION,
            rkey: sessionRkey,
        });

        console.log("[Sender] Fetched answer record");
        return record.data?.value;
    } catch (err) {
        setStatus("senderStatus", "No answer found", "error");
        console.log("[Sender] No answer found or error fetching answer");
        return null;
    }
}
