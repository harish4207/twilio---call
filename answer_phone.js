

// answer_phone.js
// Minimal Express app that responds to Twilio voice webhooks with TTS
// Load environment variables from .env if present
require('dotenv').config();
const express = require('express');
const { twiml: { VoiceResponse } } = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: false }));

// Very small CSP for local development: allow same-origin and basic connect sources
app.use((req, res, next) => {
  // Allow devtools and ngrok/local connections for debugging. Tighten this in production.
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http: https: ws:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:;");
  next();
});

// Accept GET (for browser testing) and POST (Twilio webhooks)
app.all('/voice', (req, res) => {
  const response = new VoiceResponse();
  const message = process.env.ANSWER_MESSAGE || 'Hello from your pals at Twilio! Have fun.';
  response.say({ voice: 'alice' }, message);

  res.type('text/xml');
  res.send(response.toString());
});

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`TwiML server running at http://127.0.0.1:${PORT}/voice`));
