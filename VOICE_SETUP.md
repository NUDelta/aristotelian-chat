# Voice Mode Setup Guide

This guide will help you set up the voice functionality for Tab 1 using Eleven Labs for high-quality text-to-speech.

## What You Need

1. **Eleven Labs Account** - Free tier includes 10,000 characters/month
2. **API Key** - Get this from your Eleven Labs dashboard
3. **Voice ID** (Optional) - Choose from available voices, or use the default "Rachel"

## Step-by-Step Setup

### 1. Create Eleven Labs Account

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Click "Sign Up" or "Get Started"
3. Create a free account (no credit card required for free tier)
4. Verify your email if needed

### 2. Get Your API Key

1. Log in to your Eleven Labs dashboard
2. Navigate to your **Profile** or **Settings**
3. Find the **API Key** section
4. Click "Copy" to copy your API key
5. **Important**: Keep this key secure - don't share it publicly

### 3. Choose a Voice (Optional)

1. In the Eleven Labs dashboard, go to **Voices**
2. Browse available voices (free tier includes several options)
3. Click on a voice you like to see its details
4. Copy the **Voice ID** (it looks like: `21m00Tcm4TlvDq8ikWAM`)
5. Popular free voices include:
   - **Rachel** (default): `21m00Tcm4TlvDq8ikWAM` - Professional, clear
   - **Domi**: `AZnzlk1XvdvUeBnXmlld` - Energetic
   - **Bella**: `EXAVITQu4vr4xnSDxMaL` - Warm, friendly
   - **Antoni**: `ErXwobaYiN019PkySvjV` - Deep, calm

### 4. Add Environment Variables

#### For Local Development

Add to your `.env.local` file in the project root:

```bash
ELEVEN_LABS_API_KEY=your_api_key_here
ELEVEN_LABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Note**: 
- If you don't set `ELEVEN_LABS_VOICE_ID`, it will default to "Rachel"
- The API key is required for voice mode to work
- Restart `vercel dev` after adding these variables

#### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Add two variables:
   - **Name**: `ELEVEN_LABS_API_KEY`
     - **Value**: Your Eleven Labs API key
   - **Name**: `ELEVEN_LABS_VOICE_ID` (optional)
     - **Value**: Your chosen voice ID
5. Select all environments (Production, Preview, Development)
6. Click **Save**
7. **Important**: Redeploy your application after adding environment variables

### 5. Test Voice Mode

1. Start your development server: `npx vercel dev`
2. Open the app in your browser
3. Enter an experience in Tab 1
4. Wait for the AI's first question
5. Toggle the **Text/Voice** switch to **Voice** mode
6. You should see the speaking indicator when the AI is speaking
7. After the AI finishes, it will automatically start listening for your response

## Pricing & Limits

### Free Tier
- **10,000 characters/month** - Perfect for testing and light usage
- Access to several high-quality voices
- No credit card required

### Paid Plans
- **Starter**: $5/month - 30,000 characters
- **Creator**: $22/month - 100,000 characters
- **Pro**: $99/month - 500,000 characters
- **Scale**: Custom pricing for higher volumes

**Note**: Character count is based on the text being converted to speech, not the number of words.

## Troubleshooting

### Voice mode not working?

1. **Check API Key**: Make sure `ELEVEN_LABS_API_KEY` is set correctly in `.env.local`
2. **Restart Server**: Restart `vercel dev` after adding environment variables
3. **Check Browser**: Voice mode requires microphone permissions - make sure your browser has access
4. **Check Console**: Open browser DevTools console to see any error messages
5. **API Limits**: Check your Eleven Labs dashboard to see if you've hit your character limit

### Getting "Failed to generate speech" error?

1. Verify your API key is correct
2. Check your Eleven Labs account for remaining character quota
3. Make sure the voice ID is valid (if you set a custom one)
4. Check the Vercel function logs for detailed error messages

### Speech recognition not working?

1. **Browser Support**: Web Speech API works best in Chrome, Edge, or Safari
2. **Microphone Permissions**: Make sure your browser has microphone access
3. **HTTPS Required**: Speech recognition requires HTTPS (or localhost for development)
4. **Check Console**: Look for permission errors in the browser console

## Browser Compatibility

### Speech-to-Text (Web Speech API)
- ✅ Chrome/Edge: Full support
- ✅ Safari: Full support
- ⚠️ Firefox: Limited support (may not work)

### Text-to-Speech (Eleven Labs)
- ✅ All modern browsers (works via API)

## Next Steps

Once set up, you can:
- Toggle between text and voice modes seamlessly
- Enjoy natural-sounding AI responses
- Have hands-free conversations with the AI
- Switch back to text mode anytime to see the full conversation

Enjoy your voice-enabled conversations! 🎤🔊



