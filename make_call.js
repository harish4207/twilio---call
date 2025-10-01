// make_call.js
// Simple script to create an outbound voice call using Twilio
// Load environment variables from .env if present
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

// Prefer API Key auth when available
let client;
if (apiKeySid && apiKeySecret) {
  client = twilio(apiKeySid, apiKeySecret, { accountSid });
} else if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.error('Missing Twilio credentials. Provide either TWILIO_API_KEY_SID & TWILIO_API_KEY_SECRET, or TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN');
  process.exit(1);
}

async function createCall() {
  try {
    const toNumber = (process.env.TARGET_NUMBER || '').trim();
    if (!toNumber) {
      console.error('Missing TARGET_NUMBER in environment');
      process.exit(1);
    }

    const callOptions = {
      from: process.env.TWILIO_NUMBER,
      to: toNumber,
    };

    // If a TwiML App SID is provided, use applicationSid. Otherwise use url (fallback to demo)
    if (process.env.TWILIO_TWIML_APP_SID) {
      callOptions.applicationSid = process.env.TWILIO_TWIML_APP_SID;
    } else {
      callOptions.url = process.env.TWILIO_CALL_URL || 'http://demo.twilio.com/docs/voice.xml';
    }

    const call = await client.calls.create(callOptions);
    console.log('Call initiated. SID:', call.sid);
  } catch (err) {
    console.error('Error creating call:', err.message);
    process.exit(1);
  }
}

createCall();
