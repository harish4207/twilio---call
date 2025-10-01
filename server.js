const dotenv = require('dotenv');
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
    console.warn('Warning: .env file not loaded or missing:', dotenvResult.error && dotenvResult.error.message);
} else {
    console.log('.env loaded from', dotenvResult.parsed ? 'present' : 'not parsed');
}
const express = require('express');
const twilio = require('twilio');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
// Serve bundled client assets from /public under /static
const path = require('path');
app.use('/static', express.static(path.join(__dirname, 'public')));

// Log every incoming request for debugging
app.use((req, res, next) => {
    console.log('REQUEST:', req.method, req.path);
    next();
});

// Prefer API Key auth when available (safer for deployments). Fall back to Account SID + Auth Token.
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = apiKeySid && apiKeySecret
    ? twilio(apiKeySid, apiKeySecret, { accountSid })
    : twilio(accountSid, authToken);

// Stable client identity used for incoming browser connections (set in .env)
const CLIENT_ID = process.env.CLIENT_ID || 'demo-client';

// Startup debug: print CWD and a quick snapshot of env (no secrets)
console.log('cwd:', process.cwd());
console.log('startup env snapshot:', {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasApiKey: !!process.env.TWILIO_API_KEY_SID,
    hasApiSecret: !!process.env.TWILIO_API_KEY_SECRET,
    clientId: process.env.CLIENT_ID
});
const STARTUP_ID = Date.now();
console.log('process.pid:', process.pid, 'STARTUP_ID:', STARTUP_ID);

// Render HTML page
app.get('/', (req, res) => {
    res.render('index', { message: null }); // send empty message by default
});

// Serve a simple client demo page that uses Twilio Programmable Voice JS
app.get('/client', (req, res) => {
    res.render('client');
});

// Debug route to inspect non-secret env presence at runtime
app.get('/env', (req, res) => {
    return res.json({
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasApiKey: !!process.env.TWILIO_API_KEY_SID,
        hasApiSecret: !!process.env.TWILIO_API_KEY_SECRET,
        clientId: process.env.CLIENT_ID || null,
        twimlAppSid: !!process.env.TWILIO_TWIML_APP_SID
    });
});

app.get('/whoami', (req, res) => {
    return res.json({ pid: process.pid, startup: STARTUP_ID, cwd: process.cwd() });
});

// Support previous/alternate path used on some deployments or links
app.get('/make-call/client', (req, res) => {
    // redirect to the canonical client route
    res.redirect(302, '/client');
});

// Token endpoint: server generates a Twilio Access Token for the browser client
app.get('/token', (req, res) => {
    // Require API Key SID and Secret for token creation
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // Quick debug: log whether the required env vars are present (do NOT print secrets)
    console.log('/token request — env presence:', {
        hasApiKey: !!apiKeySid,
        hasApiSecret: !!apiKeySecret,
        hasAccountSid: !!accountSid,
        hasTwimlApp: !!process.env.TWILIO_TWIML_APP_SID,
        CLIENT_ID: process.env.CLIENT_ID || 'not-set (will default to demo-client)'
    });

    if (!apiKeySid || !apiKeySecret || !accountSid) {
        console.error('Missing Twilio credentials for token generation');
        return res.status(500).json({ error: 'Missing Twilio API Key or Account SID on server' });
    }

    // TEMP DEBUG: return environment snapshot early so we can confirm identity availability
    if (req.query._debug === 'env') {
        return res.json({
            apiKeySid: !!apiKeySid,
            apiKeySecret: !!apiKeySecret,
            accountSid: !!accountSid,
            clientId: process.env.CLIENT_ID || null,
            twimlAppSid: !!process.env.TWILIO_TWIML_APP_SID
        });
    }

    try {
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        // Use stable identity so TwiML can dial this client for incoming PSTN calls
        // Ensure this identity matches the CLIENT_ID used by the /voice handler.
        const identity = CLIENT_ID;

        // Ensure identity is set and pass it into the AccessToken constructor
        if (!identity) {
            throw new Error('CLIENT_ID / identity is not set on the server');
        }

        console.log('Generating token for identity:', identity);
    console.log('identity typeof:', typeof identity, 'identity JSON:', JSON.stringify(identity));
    const optionsForToken = { ttl: 3600, identity };
    console.log('optionsForToken:', optionsForToken);
        // Persist a small debug line to disk so we can inspect runtime values reliably
        try {
            const fs = require('fs');
            fs.appendFileSync('token-debug.log', `${new Date().toISOString()} - identity:${JSON.stringify(identity)} - options:${JSON.stringify(optionsForToken)}\n`);
        } catch (e) {
            console.warn('Could not write token-debug.log', e && e.message);
        }

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, optionsForToken);
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
            incomingAllow: true
        });
        token.addGrant(voiceGrant);

    console.log(`/token issued for identity=${identity}`);
    const hasTwimlApp = !!process.env.TWILIO_TWIML_APP_SID;
    const resp = { token: token.toJwt(), identity, hasTwimlApp };
    if (!hasTwimlApp) resp.warning = 'TWILIO_TWIML_APP_SID is not set on the server. Outgoing calls will hit Twilio demo behavior; create and configure a TwiML App and set TWILIO_TWIML_APP_SID.';
    return res.json(resp);
    } catch (err) {
        console.error('Error generating Twilio token:', err && err.stack ? err.stack : err);
        return res.status(500).json({ error: 'Failed to generate token', detail: err && err.message });
    }
});

// Endpoint to make call
app.post('/make-call', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.render('index', { message: '❌ Please provide a phone number' });
    }

    try {
        let callResult = await client.calls.create({
            url: process.env.TWILIO_CALL_URL,  // must be your /voice endpoint
            to: phone,
            from: process.env.TWILIO_NUMBER
        });
        return res.render('index', { message: `✅ Call initiated! Call SID: ${callResult.sid}` });
    } catch (err) {
        return res.render('index', { message: `❌ Error: ${err.message}` });
    }
});

// Server-side bridge: create an outbound PSTN call and bridge it to the client identity
app.post('/bridge-call', express.json(), async (req, res) => {
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Missing "to" phone number in request body' });

    try {
        const twiml = new twilio.twiml.VoiceResponse();
        const dial = twiml.dial({ callerId: process.env.TWILIO_NUMBER });
        dial.client(CLIENT_ID);

        // Create the outbound call and supply inline TwiML that dials the client when answered
        const call = await client.calls.create({
            to,
            from: process.env.TWILIO_NUMBER,
            twiml: twiml.toString()
        });

        console.log('/bridge-call initiated', { to, sid: call.sid });
        return res.json({ success: true, sid: call.sid });
    } catch (err) {
        console.error('/bridge-call error', err && err.stack ? err.stack : err);
        return res.status(500).json({ error: 'Failed to create bridge call', detail: err && err.message });
    }
});

// Twilio webhook for voice instructions
app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();

    console.log('/voice webhook body:', req.body);

    // Distinguish between client-initiated outbound calls and incoming PSTN calls.
    // Incoming PSTN requests also include a To parameter (the Twilio number), so
    // only treat the request as an outbound-to-PSTN when the caller is a client identity.
    const to = req.body.To || req.body.to;
    const from = req.body.From || req.body.from || '';
    const isClientInitiated = typeof from === 'string' && from.startsWith('client:');

    if (isClientInitiated && to) {
        console.log(`/voice: outgoing client call to ${to} (from ${from})`);
        twiml.dial({ callerId: process.env.TWILIO_NUMBER }, to);
        const outTwiml = twiml.toString();
        console.log('/voice response TwiML:', outTwiml);
        res.type('text/xml');
        return res.send(outTwiml);
    }

    // Otherwise this is likely an incoming PSTN call to your Twilio number.
    // Forward it to the browser client (CLIENT_ID) by dialing the client identity.
    console.log(`/voice: incoming PSTN -> dialing client ${CLIENT_ID} (from ${from}, to ${to})`);
    const dial = twiml.dial();
    dial.client(CLIENT_ID);
    const inTwiml = twiml.toString();
    console.log('/voice response TwiML:', inTwiml);
    res.type('text/xml');
    res.send(inTwiml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Debug: print middleware stack to understand static serving
setTimeout(() => {
    try {
        console.log('Middleware stack:');
        app._router.stack.forEach((m, i) => {
            if (m.name) console.log(i, m.name, m.route ? (Object.keys(m.route.methods).join(',') + ' ' + m.route.path) : '');
            else console.log(i, m);
        });
    } catch (e) {
        console.warn('Could not inspect middleware stack', e && e.message);
    }
}, 500);
// Print registered routes (for debugging)
setTimeout(() => {
    try {
        const routes = [];
        app._router.stack.forEach((r) => {
            if (r.route && r.route.path) {
                const methods = Object.keys(r.route.methods).join(',');
                routes.push(`${methods.toUpperCase()} ${r.route.path}`);
            }
        });
        console.log('Registered routes:\n', routes.join('\n'));
    } catch (e) {
        console.warn('Could not list routes', e && e.message);
    }
}, 200);