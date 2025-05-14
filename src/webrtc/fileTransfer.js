/**
 * Handles file chunking and transfer logic for AT-Transfer P2P File Transfer.
 * Exports functions for sending and assembling files over a WebRTC data channel.
 */

const CHUNK_SIZE = 64 * 1024; // 64KB per chunk

/**
 * Sends a file in chunks over a WebRTC data channel.
 * @param {File} file - The file to send.
 * @param {RTCDataChannel} dataChannel - The data channel to send over.
 * @param {function} onProgress - Callback(progress: number, total: number)
 * @returns {Promise<void>}
 */
export async function sendFileInChunks(
    file,
    dataChannel,
    onProgress = () => {},
) {
    let offset = 0;
    while (offset < file.size) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const arrayBuffer = await slice.arrayBuffer();
        // Send as ArrayBuffer
        dataChannel.send(arrayBuffer);
        offset += arrayBuffer.byteLength;
        onProgress(offset, file.size);
        // Optional: throttle to avoid flooding the buffer
        await waitForBufferLow(dataChannel);
    }
    // Signal end of file
    dataChannel.send(JSON.stringify({ type: "EOF" }));
}

/**
 * Waits for the data channel's bufferedAmount to drop below a threshold.
 * @param {RTCDataChannel} dataChannel
 * @param {number} threshold
 * @returns {Promise<void>}
 */
function waitForBufferLow(dataChannel, threshold = 256 * 1024) {
    return new Promise((resolve) => {
        if (dataChannel.bufferedAmount < threshold) {
            resolve();
        } else {
            const check = () => {
                if (dataChannel.bufferedAmount < threshold) {
                    dataChannel.removeEventListener("bufferedamountlow", check);
                    resolve();
                }
            };
            dataChannel.addEventListener("bufferedamountlow", check);
        }
    });
}

/**
 * Assembles received file chunks into a Blob and triggers a download.
 * @param {ArrayBuffer[]} chunks - Array of received ArrayBuffers.
 * @param {string} fileName - Name for the downloaded file.
 * @param {string} fileType - MIME type for the file.
 * @returns {string} - Object URL for the assembled file.
 */
export function assembleFile(chunks, fileName, fileType) {
    const blob = new Blob(chunks, {
        type: fileType || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);

    // Optionally, trigger download automatically:
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = fileName || 'received_file';
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);

    return url;
}

/**
 * Handles receiving file chunks over a data channel.
 * @param {RTCDataChannel} dataChannel
 * @param {function} onChunk - Callback(chunk: ArrayBuffer)
 * @param {function} onComplete - Callback()
 */
export function setupFileReceiver(dataChannel, onChunk, onComplete) {
    let receiving = true;
    dataChannel.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "EOF") {
                    receiving = false;
                    onComplete();
                }
            } catch {
                // Ignore non-EOF string messages
            }
        } else if (event.data instanceof ArrayBuffer && receiving) {
            onChunk(event.data);
        }
    });
}
