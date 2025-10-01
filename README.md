# Twilio Voice Call EJS Application

A complete Node.js application using Express, EJS, and Twilio to make voice calls through a web interface.

## 🚀 Quick Start

### 1. Setup Twilio Account
1. Sign up for a free Twilio account at [twilio.com](https://www.twilio.com/try-twilio)
2. Get your Account SID and Auth Token from the Twilio Console
3. Get a Twilio phone number (free trial provides one)
4. Verify your personal phone number in the Twilio Console (required for free trial)

### 2. Configure Environment Variables
Update the `.env` file with your actual Twilio credentials:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_NUMBER=+1234567890
```

You can copy `.env.example` to `.env` and fill the values:

```bash
copy .env.example .env
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Locally
```bash
npm start
```

The application will run on `http://localhost:3000`

## 📁 Project Structure

```
twilio-ejs-app/
│
├── views/
│   └── index.ejs          # Frontend form for making calls
├── .env                   # Environment variables (Twilio credentials)
├── .env.example           # Example env file showing required vars
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🌐 Deployment

### Option 1: Render (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repo to [Render](https://render.com)
3. Create a new Web Service
4. Set environment variables in Render dashboard
5. Deploy and get your HTTPS URL

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the setup prompts
4. Set environment variables in Vercel dashboard

### Option 3: Railway
1. Push code to GitHub
2. Connect to [Railway](https://railway.app)
3. Deploy and configure environment variables

### ⚠️ Important: Update Webhook URL
After deployment, update the webhook URL in `server.js`:

```javascript
const call = await client.calls.create({
    url: 'https://your-actual-deployed-url.com/voice', // Replace with your HTTPS URL
    to: phone,
    from: process.env.TWILIO_NUMBER
});
```

## 📞 How to Use

1. Open your deployed application in a browser
2. Enter a verified phone number (must be verified in Twilio Console for free trial)
3. Click "Make Call"
4. You'll receive a call with the message: "Hello! This is a test call from your Twilio free trial account."

## 🔁 Quickstart: Make an Outbound Call (locally)

1. Ensure env vars are set (see above). For PowerShell on Windows you can run:

```powershell
$env:TWILIO_ACCOUNT_SID = 'ACxxxxxxxx...'
$env:TWILIO_AUTH_TOKEN = 'your_auth_token'
$env:TWILIO_NUMBER = '+1....'
$env:TARGET_NUMBER = '+1....' # the number to call
```

2. Run the helper script:

```bash
npm run make-call
```

This calls `TARGET_NUMBER` from your `TWILIO_NUMBER`. By default it links to Twilio's demo TwiML unless you set `TWILIO_CALL_URL`.

## 🔁 Quickstart: Receive a Call (locally with ngrok)

1. Start the TwiML server that responds to incoming calls:

```bash
npm run answer-phone
```

2. Start ngrok and tunnel to the TwiML port (1337):

```bash
ngrok http 1337
```

3. In the ngrok output copy the https forwarding URL (for example `https://abcd-1234.ngrok-free.app`) and set your Twilio phone number's Voice webhook to `https://.../voice` (POST).

4. Call your Twilio phone number and you'll hear the text-to-speech defined in `ANSWER_MESSAGE` (or the default message).

## 🧪 NPM helper scripts

Available scripts in `package.json`:

- `npm run make-call` — run `make_call.js` to initiate an outbound call using env vars
- `npm run answer-phone` — run `answer_phone.js` to serve TwiML for incoming calls


## 🔧 API Endpoints

- `GET /` - Renders the main form page
- `POST /make-call` - Initiates a phone call
- `POST /voice` - Twilio webhook that provides voice instructions

## 📊 Monitoring

- Check call logs in Twilio Console → Monitor → Logs → Calls
- View call status, SID, duration, and costs
- Monitor your remaining free trial credits

## 💰 Free Trial Limitations

- **$15 free credits** - Covers hundreds of minutes
- **Verified numbers only** - Can only call numbers verified in Twilio Console
- **Twilio branding** - Calls include Twilio trial message
- **Geographic restrictions** - Some countries may not be supported

## 🛠️ Customization

### Change Voice Message
Edit the `/voice` endpoint in `server.js`:

```javascript
app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Your custom message here!');
    res.type('text/xml');
    res.send(twiml.toString());
});
```

### Add More Features
- Call recording: Add `record: true` to call options
- Call forwarding: Use `twiml.dial()` instead of `twiml.say()`
- Interactive voice response: Add `twiml.gather()` for user input

## 🔍 Troubleshooting

### Common Issues:

1. **"Authentication Error"**
   - Check your Account SID and Auth Token in `.env`
   
2. **"Calls not working"**
   - Ensure your phone number is verified in Twilio Console
   - Check that webhook URL is HTTPS and publicly accessible
   
3. **"Invalid phone number"**
   - Use international format: +1XXXXXXXXXX (US) or +91XXXXXXXXXX (India)
   
4. **"Webhook errors"**
   - Ensure your deployed URL is accessible
   - Check server logs for errors

## 📋 Next Steps

1. **Upgrade Account**: Remove trial limitations by adding billing info
2. **Add SMS**: Extend app to send SMS messages
3. **Add Recording**: Record calls for later playback
4. **Add Database**: Store call logs and user data
5. **Add Authentication**: Secure the application with user login

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Support

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Support](https://support.twilio.com)
- [Express.js Guide](https://expressjs.com/en/starter/installing.html)