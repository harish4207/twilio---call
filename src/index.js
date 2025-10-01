// src/index.js
// Client-side entrypoint that uses the bundled Twilio Voice SDK

import { Device } from '@twilio/voice-sdk';

// Get references to DOM elements
const statusEl = document.getElementById('status');
const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');
const enableAudioBtn = document.getElementById('enableAudioBtn');

let device = null;
let pendingToken = null;

async function getToken() {
  const resp = await fetch('/token');
  if (!resp.ok) throw new Error('Failed to get token: ' + resp.status + ' ' + resp.statusText);
  const body = await resp.json();
  if (!body || !body.token) throw new Error('Server did not return a token');
  return body;
}

// Create and configure the Device after a user gesture
async function createDeviceWithToken(token, identity) {
  device = new Device(token, { logLevel: 'info' });
  // Expose for debugging in browser console
  try { window.twDevice = device; } catch (e) {}

  device.on('ready', () => {
    console.log('Device ready');
    statusEl.innerText = 'Device ready';
    callBtn.disabled = false;
  });

  // Some SDK builds emit 'registered' instead of 'ready' when the device is ready to place calls
  device.on('registered', () => {
    console.log('Device registered');
    statusEl.innerText = 'Device registered';
    callBtn.disabled = false;
  });

  device.on('unregistered', () => {
    console.log('Device unregistered');
    statusEl.innerText = 'Device unregistered';
    callBtn.disabled = true;
  });

  device.on('offline', () => {
    console.log('Device offline');
    statusEl.innerText = 'Device offline';
    callBtn.disabled = true;
  });

  device.on('incoming', (connection) => {
    console.log('Incoming connection event', connection);
    statusEl.innerText = 'Incoming call...';
  });

  // Pragmatic: enable Call button as soon as Device object exists so manual testing can proceed
  try {
    callBtn.disabled = false;
    console.log('Call button enabled early for manual testing');
  } catch (e) {}

  device.on('error', (err) => {
    console.error('Device error event', err);
    statusEl.innerText = 'Device error: ' + (err && (err.message || JSON.stringify(err)));
  });

  device.on('connect', () => {
    statusEl.innerText = 'In call';
    hangupBtn.disabled = false;
  });

  device.on('disconnect', () => {
    statusEl.innerText = 'Call ended';
    hangupBtn.disabled = true;
  });
}

// Called when user clicks enable audio — request microphone and resume audio context
enableAudioBtn.addEventListener('click', async () => {
  enableAudioBtn.disabled = true;
  statusEl.innerText = 'Requesting microphone access...';
  try {
    // Request mic permission; the browser will prompt the user
    await navigator.mediaDevices.getUserMedia({ audio: true });

    // If there is an AudioContext suspended, resume it by creating/resuming on gesture
    try {
      // Some browsers require a created AudioContext to resume
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ac = new AudioContext();
        if (ac.state === 'suspended') await ac.resume();
      }
    } catch (e) {
      console.warn('Could not resume/create AudioContext:', e && e.message);
    }

    statusEl.innerText = 'Microphone access granted.';

    // Obtain token if not already fetched
    if (!pendingToken) {
      const { token, identity } = await getToken();
      pendingToken = { token, identity };
    }

    // Create device using the token (user gesture has occurred)
    console.log('Creating Device with token, identity=', pendingToken && pendingToken.identity);
    await createDeviceWithToken(pendingToken.token, pendingToken.identity);
    console.log('Device created, window.twDevice =', window.twDevice);
  } catch (err) {
    console.error('Microphone permission or device creation failed', err);
    statusEl.innerText = 'Microphone permission denied or error: ' + (err && err.message);
    enableAudioBtn.disabled = false;
  }
});

callBtn.addEventListener('click', () => {
  const raw = document.getElementById('toNumber').value.trim();
  if (!raw) return alert('Enter a phone number in E.164 format (for India: +919876543210)');
  // Normalize: remove spaces, parentheses, dashes but keep leading +
  let to = raw.replace(/[^+\d]/g, '');
  // If user entered digits without +, it's safer to reject and ask for +countrycode
  if (!to.startsWith('+')) {
    return alert('Please provide the number in E.164 format with a leading + and country code, for example: +919876543210');
  }
  // Basic validation: + followed by 8-15 digits (E.164 allows up to 15)
  if (!/^\+\d{8,15}$/.test(to)) {
    return alert('Invalid phone number. E.164 format must be: + followed by 8 to 15 digits, e.g. +919876543210');
  }
  if (!device) {
    statusEl.innerText = 'Device not ready. Please click "Enable audio" and wait for Device ready.';
    return;
  }
  // If server indicated no TwiML App (demo behavior), use server-side bridge
  if (pendingToken && pendingToken.hasTwimlApp === false) {
    statusEl.innerText = 'Creating server-side bridged call to ' + to + '...';
    fetch('/bridge-call', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to })
    }).then(r => r.json()).then(j => {
      if (j && j.success) {
        statusEl.innerText = 'Call initiated (bridge) — SID: ' + j.sid;
      } else {
        console.error('Bridge call failed', j);
        statusEl.innerText = 'Bridge call failed: ' + (j && j.detail ? j.detail : JSON.stringify(j));
      }
    }).catch(err => {
      console.error('Bridge call error', err);
      statusEl.innerText = 'Bridge call error: ' + (err && err.message);
    });
    return;
  }

  statusEl.innerText = 'Calling ' + to + '...';
  try {
    device.connect({ To: to });
  } catch (connErr) {
    console.error('Error while calling device.connect', connErr);
    statusEl.innerText = 'Call failed: ' + (connErr && connErr.message ? connErr.message : String(connErr));
  }
});

hangupBtn.addEventListener('click', () => {
  if (device) device.disconnectAll();
});

// Pre-fetch token so it's ready when the user enables audio
(async () => {
  try {
  pendingToken = await getToken();
  console.log('Got token for', pendingToken.identity, 'hasTwimlApp=', pendingToken.hasTwimlApp);
    // Expose token for debugging
    try { window.twPendingToken = pendingToken; } catch (e) {}
    // Show a clear warning if the server says TWILIO_TWIML_APP_SID is not configured
    if (pendingToken && pendingToken.warning) {
      statusEl.innerText = `Warning: ${pendingToken.warning}`;
    } else {
      statusEl.innerText = `Got token for ${pendingToken.identity}. Click "Enable audio" to start.`;
    }
    // Fallback: enable Call button once we have a token so manual testing can proceed
    try {
      callBtn.disabled = false;
      console.log('Call button enabled because token is present (fallback)');
      statusEl.innerText += ' (Call enabled because token is present)';
    } catch (e) {}
  } catch (err) {
    console.error('Token fetch failed', err);
    statusEl.innerText = 'Token error: ' + (err && err.message);
  }
})();
