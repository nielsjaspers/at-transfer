// UI element references and setup for AT-Transfer

export const elements = {
    // Sender panel
    senderPdsUrlInput: null,
    senderLoginIdInput: null,
    senderPasswordInput: null,
    senderLoginButton: null,
    senderLoginStatus: null,
    senderDidInput: null,
    fileInput: null,
    sendOfferButton: null,
    senderStatus: null,

    // Receiver panel
    receiverPdsUrlInput: null,
    receiverLoginIdInput: null,
    receiverPasswordInput: null,
    receiverLoginButton: null,
    receiverLoginStatus: null,
    receiverDidInput: null,
    fetchOfferButton: null,
    receiverStatus: null,
    receivedFileLink: null,

    // Debug/log
    debugLogArea: null,
};

export function initUI() {
    // Create sender panel
    const senderPanel = document.createElement("div");
    senderPanel.className = "panel";
    senderPanel.innerHTML = `
    <h2>Sender</h2>
    <label for="senderPdsUrlInput">PDS URL</label>
    <input id="senderPdsUrlInput" type="text" placeholder="https://bsky.social" value="https://bsky.social" autocomplete="off" />
    <label for="senderLoginIdInput">Handle or DID</label>
    <input id="senderLoginIdInput" type="text" placeholder="alice.bsky.social" autocomplete="username" />
    <label for="senderPasswordInput">App Password</label>
    <input id="senderPasswordInput" type="password" placeholder="App Password" autocomplete="current-password" />
    <button id="senderLoginButton">Login</button>
    <span class="status" id="senderLoginStatus"></span>
    <label for="senderDidInput">Receiver DID or Handle</label>
    <input id="senderDidInput" type="text" placeholder="did:plc:... or handle.bsky.social" autocomplete="off" />
    <label for="fileInput">File to Send</label>
    <input id="fileInput" type="file" />
    <button id="sendOfferButton">Send Offer</button>
    <span class="status" id="senderStatus"></span>
  `;

    // Create receiver panel
    const receiverPanel = document.createElement("div");
    receiverPanel.className = "panel";
    receiverPanel.innerHTML = `
    <h2>Receiver</h2>
    <label for="receiverPdsUrlInput">PDS URL</label>
    <input id="receiverPdsUrlInput" type="text" placeholder="https://bsky.social" value="https://bsky.social" autocomplete="off" />
    <label for="receiverLoginIdInput">Handle or DID</label>
    <input id="receiverLoginIdInput" type="text" placeholder="bob.bsky.social" autocomplete="username" />
    <label for="receiverPasswordInput">App Password</label>
    <input id="receiverPasswordInput" type="password" placeholder="App Password" autocomplete="current-password" />
    <button id="receiverLoginButton">Login</button>
    <span class="status" id="receiverLoginStatus"></span>
    <label for="receiverDidInput">Sender DID or Handle</label>
    <input id="receiverDidInput" type="text" placeholder="did:plc:... or handle.bsky.social" autocomplete="off" />
    <button id="fetchOfferButton">Fetch Offer</button>
    <span class="status" id="receiverStatus"></span>
    <a id="receivedFileLink" href="#" download style="display:none;">Download Received File</a>
  `;

    // Insert panels into #app
    const appDiv = document.getElementById("app");
    appDiv.appendChild(senderPanel);
    appDiv.appendChild(receiverPanel);

    // Debug log area already in HTML, just reference it
    elements.debugLogArea = document.getElementById("debugLogArea");

    // Sender elements
    elements.senderPdsUrlInput = document.getElementById("senderPdsUrlInput");
    elements.senderLoginIdInput = document.getElementById("senderLoginIdInput");
    elements.senderPasswordInput = document.getElementById(
        "senderPasswordInput",
    );
    elements.senderLoginButton = document.getElementById("senderLoginButton");
    elements.senderLoginStatus = document.getElementById("senderLoginStatus");
    elements.senderDidInput = document.getElementById("senderDidInput");
    elements.fileInput = document.getElementById("fileInput");
    elements.sendOfferButton = document.getElementById("sendOfferButton");
    elements.senderStatus = document.getElementById("senderStatus");

    // Receiver elements
    elements.receiverPdsUrlInput = document.getElementById(
        "receiverPdsUrlInput",
    );
    elements.receiverLoginIdInput = document.getElementById(
        "receiverLoginIdInput",
    );
    elements.receiverPasswordInput = document.getElementById(
        "receiverPasswordInput",
    );
    elements.receiverLoginButton = document.getElementById(
        "receiverLoginButton",
    );
    elements.receiverLoginStatus = document.getElementById(
        "receiverLoginStatus",
    );
    elements.receiverDidInput = document.getElementById("receiverDidInput");
    elements.fetchOfferButton = document.getElementById("fetchOfferButton");
    elements.receiverStatus = document.getElementById("receiverStatus");
    elements.receivedFileLink = document.getElementById("receivedFileLink");
}
