import { AtpAgent } from '@atproto/api';

export let senderAgent = null;
export let receiverAgent = null;

/**
 * Sets up login event handlers for sender and receiver panels using AtpAgent.
 * Expects UI elements with specific IDs to exist in the DOM.
 */
export function setupAuthHandlers() {
  // Sender login
  const senderLoginBtn = document.getElementById('senderLoginButton');
  if (senderLoginBtn) {
    senderLoginBtn.addEventListener('click', async () => {
      const pdsUrl = document.getElementById('senderPdsUrlInput').value.trim();
      const handle = document.getElementById('senderLoginIdInput').value.trim();
      const password = document.getElementById('senderPasswordInput').value;
      const status = document.getElementById('senderLoginStatus');
      status.textContent = 'Logging in...';
      try {
        senderAgent = new AtpAgent({ service: pdsUrl });
        await senderAgent.login({ identifier: handle, password });
        status.textContent = `Logged in as Sender: ${senderAgent.session.did}`;
        status.style.color = 'green';
        logDebug(`[Sender] Logged in: ${senderAgent.session.did}`);
      } catch (e) {
        status.textContent = 'Login failed';
        status.style.color = 'red';
        logDebug(`[Sender] ${e.message}`);
      }
    });
  }

  // Receiver login
  const receiverLoginBtn = document.getElementById('receiverLoginButton');
  if (receiverLoginBtn) {
    receiverLoginBtn.addEventListener('click', async () => {
      const pdsUrl = document.getElementById('receiverPdsUrlInput').value.trim();
      const handle = document.getElementById('receiverLoginIdInput').value.trim();
      const password = document.getElementById('receiverPasswordInput').value;
      const status = document.getElementById('receiverLoginStatus');
      status.textContent = 'Logging in...';
      try {
        receiverAgent = new AtpAgent({ service: pdsUrl });
        await receiverAgent.login({ identifier: handle, password });
        status.textContent = `Logged in as Receiver: ${receiverAgent.session.did}`;
        status.style.color = 'green';
        logDebug(`[Receiver] Logged in: ${receiverAgent.session.did}`);
      } catch (e) {
        status.textContent = 'Login failed';
        status.style.color = 'red';
        logDebug(`[Receiver] ${e.message}`);
      }
    });
  }
}

/**
 * Utility to log debug messages to the debug log area.
 * @param {string} msg
 */
function logDebug(msg) {
  const area = document.getElementById('debugLogArea');
  if (area) {
    area.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    area.scrollTop = area.scrollHeight;
  }
}
