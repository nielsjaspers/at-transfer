// UI element references and setup for AT-Transfer

export const elements = {
    // Login
    loginHandleInput: null,
    oauthLoginButton: null,
    loginStatus: null,

    // Dashboard
    dashboardScreen: null,
    userInfo: null,
    chooseSend: null,
    chooseReceive: null,
    logoutButton: null,

    // Send panel
    sendPanel: null,
    sendReceiverDidInput: null,
    sendFileInput: null,
    sendOfferButton: null,
    sendStatus: null,
    backToDashboardFromSend: null,

    // Receive panel
    receivePanel: null,
    receiveSenderDidInput: null,
    fetchOfferButton: null,
    receiveStatus: null,
    receivedFileLink: null,
    backToDashboardFromReceive: null,
};

export function initUI() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <div id="loginScreen" class="panel" style="max-width: 400px; margin-top: 48px;">
        <h2>AT-Transfer</h2>
        <p>Sign in with your Bluesky account to begin.</p>
        <button id="oauthLoginButton" style="width:100%;padding:12px 0;font-size:1.1em;background:#2a7cff;color:#fff;border:none;border-radius:4px;margin-top:18px;">Sign in with Bluesky</button>
        <div id="loginStatus" class="status" style="margin-top:16px;"></div>
      </div>
      <div id="dashboardScreen" class="panel" style="display:none;max-width:400px;">
        <h2>Welcome!</h2>
        <div id="userInfo" style="margin-bottom:18px;"></div>
        <p>What do you want to do?</p>
        <button id="chooseSend" style="margin-right:16px;">Send File</button>
        <button id="chooseReceive">Receive File</button>
        <button id="logoutButton" style="float:right;background:#d32f2f;">Log out</button>
      </div>
      <div id="sendPanel" class="panel" style="display:none;">
        <h2>Send File</h2>
        <label for="sendReceiverDidInput">Receiver DID or Handle</label>
        <input id="sendReceiverDidInput" type="text" placeholder="did:plc:... or handle.bsky.social" autocomplete="off" />
        <label for="sendFileInput">File to Send</label>
        <input id="sendFileInput" type="file" />
        <button id="sendOfferButton">Send Offer</button>
        <span class="status" id="sendStatus"></span>
        <button id="backToDashboardFromSend" style="margin-top:18px;">Back</button>
      </div>
      <div id="receivePanel" class="panel" style="display:none;">
        <h2>Receive File</h2>
        <label for="receiveSenderDidInput">Sender DID or Handle</label>
        <input id="receiveSenderDidInput" type="text" placeholder="did:plc:... or handle.bsky.social" autocomplete="off" />
        <button id="fetchOfferButton">Fetch Offer</button>
        <span class="status" id="receiveStatus"></span>
        <a id="receivedFileLink" href="#" download style="display:none;">Download Received File</a>
        <button id="backToDashboardFromReceive" style="margin-top:18px;">Back</button>
      </div>
    `;

    // Login elements
    elements.oauthLoginButton = document.getElementById("oauthLoginButton");
    elements.loginStatus = document.getElementById("loginStatus");

    // Dashboard elements
    elements.dashboardScreen = document.getElementById("dashboardScreen");
    elements.userInfo = document.getElementById("userInfo");
    elements.chooseSend = document.getElementById("chooseSend");
    elements.chooseReceive = document.getElementById("chooseReceive");
    elements.logoutButton = document.getElementById("logoutButton");

    // Send panel elements
    elements.sendPanel = document.getElementById("sendPanel");
    elements.sendReceiverDidInput = document.getElementById("sendReceiverDidInput");
    elements.sendFileInput = document.getElementById("sendFileInput");
    elements.sendOfferButton = document.getElementById("sendOfferButton");
    elements.sendStatus = document.getElementById("sendStatus");
    elements.backToDashboardFromSend = document.getElementById("backToDashboardFromSend");

    // Receive panel elements
    elements.receivePanel = document.getElementById("receivePanel");
    elements.receiveSenderDidInput = document.getElementById("receiveSenderDidInput");
    elements.fetchOfferButton = document.getElementById("fetchOfferButton");
    elements.receiveStatus = document.getElementById("receiveStatus");
    elements.receivedFileLink = document.getElementById("receivedFileLink");
    elements.backToDashboardFromReceive = document.getElementById("backToDashboardFromReceive");
}
