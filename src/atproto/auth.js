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
        console.log(`[Sender] Logged in: ${senderAgent.session.did}`);
      } catch (e) {
        status.textContent = 'Login failed';
        status.style.color = 'red';
        console.log(`[Sender] Login failed: ${e.message}`);
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
        console.log(`[Receiver] Logged in: ${receiverAgent.session.did}`);
      } catch (e) {
        status.textContent = 'Login failed';
        status.style.color = 'red';
        console.log(`[Receiver] Login failed: ${e.message}`);
      }
    });
  }
}

/**
 * Utility to log debug messages to the debug log area.
 * @param {string} msg
 */

