require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

// Prefer API Key auth when available (safer for deployments). Fall back to Account SID + Auth Token.
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = apiKeySid && apiKeySecret
    ? twilio(apiKeySid, apiKeySecret, { accountSid })
    : twilio(accountSid, authToken);

// Render HTML page
app.get('/', (req, res) => {
    res.render('index', { message: null }); // send empty message by default
});

// Serve a simple client demo page that uses Twilio Programmable Voice JS
app.get('/client', (req, res) => {
    res.render('client');
});

// Token endpoint: server generates a Twilio Access Token for the browser client
app.get('/token', (req, res) => {
    // Require API Key SID and Secret for token creation
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;

    if (!apiKeySid || !apiKeySecret || !accountSid) {
        return res.status(500).json({ error: 'Missing Twilio API Key or Account SID on server' });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const identity = `user-${Math.floor(Math.random() * 10000)}`; // demo identity

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { ttl: 3600 });
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true
    });
    token.addGrant(voiceGrant);
    token.identity = identity;

    res.json({ token: token.toJwt(), identity });
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

// Twilio webhook for voice instructions
app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    // twiml.say('Hello! This is a test call from your Twilio free trial account.');
    twiml.dial({ callerId: process.env.TWILIO_NUMBER }, req.body.From);
    res.type('text/xml');
    res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));