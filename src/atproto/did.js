// DID resolution and PDS endpoint discovery for AT-Transfer

/**
 * Resolve a handle (username) to a DID using the agent's com.atproto.identity.resolveHandle.
 * If the identifier is already a DID, returns it as-is.
 * @param {string} identifier - The user's handle or DID (e.g., alice.bsky.social or did:plc:xxxx)
 * @param {AtpAgent} agent - The logged-in AtpAgent instance to use for resolution
 * @returns {Promise<string>} - The resolved DID (e.g., did:plc:xxxx)
 */
export async function resolveHandleToDid(identifier, agent) {
    if (!identifier) throw new Error("Identifier is empty");
    if (identifier.startsWith("did:")) return identifier;
    if (!agent) throw new Error("Agent not available for handle resolution");
    // Use the agent's PDS to resolve the handle
    try {
        const res = await agent.com.atproto.identity.resolveHandle({
            handle: identifier,
        });
        return res.data.did;
    } catch (e) {
        throw new Error(
            `Could not resolve handle "${identifier}". Try DID. Error: ${e.message}`,
        );
    }
}

/**
 * Discover the PDS endpoint for a given DID using the PLC directory (PoC style).
 * Only supports did:plc: DIDs.
 * @param {string} did - The user's DID (e.g., did:plc:xxxx)
 * @returns {Promise<string>} - The PDS service endpoint URL
 */
export async function getPdsEndpointForDid(did) {
    if (!did.startsWith("did:plc:")) {
        throw new Error(
            `Unsupported DID method: ${did}. Only did:plc supported.`,
        );
    }
    try {
        const plcResponse = await fetch(`https://plc.directory/${did}`);
        if (!plcResponse.ok)
            throw new Error(
                `PLC directory request failed for ${did}: ${plcResponse.status}`,
            );
        const didDocument = await plcResponse.json();
        const pdsService = didDocument.service?.find(
            (s) =>
                s.type === "AtpPersonalDataServer" ||
                s.type === "AtprotoPersonalDataServer",
        );
        if (pdsService?.serviceEndpoint) {
            return pdsService.serviceEndpoint;
        }
        throw new Error(
            `No AtpPersonalDataServer/AtprotoPersonalDataServer endpoint in DID doc for ${did}`,
        );
    } catch (e) {
        throw e;
    }
}
