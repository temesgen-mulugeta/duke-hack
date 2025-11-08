# Audio Troubleshooting Guide

## What Was Fixed

### Issue: Audio Not Working (Speaking & Listening)
Even though text and MCP tools work fine, audio input/output wasn't functioning.

### Fixes Applied:

1. **Audio Element Lifecycle**
   - Audio element now added to DOM immediately (not on track event)
   - Explicit `.play()` call with error handling
   - Detects browser autoplay blocking

2. **Autoplay Policy Handling**
   - Added "Click to Enable Audio" button for blocked audio
   - Visual warning when browser blocks autoplay
   - Manual audio enablement function

3. **Enhanced Audio Logging**
   - Tracks when audio buffer is committed
   - Logs speech detection events
   - Shows transcription results
   - Monitors audio response from AI
   - Displays what AI is saying (transcript)

4. **Audio Event Monitoring**
   - `input_audio_buffer.committed` - Your speech is being processed
   - `input_audio_buffer.speech_started` - Speech detected
   - `input_audio_buffer.speech_stopped` - Speech ended
   - `conversation.item.input_audio_transcription.completed` - Transcription complete
   - `response.audio.delta` - AI audio being received
   - `response.audio.done` - AI finished speaking
   - `response.audio_transcript.delta/done` - AI text transcript

## How to Test

### 1. Start the Application

```bash
# Terminal 1 - Canvas Server
cd /Users/teme/MyFiles/Dev/Duke/hack-projects/mcp_excalidraw
npm run canvas

# Terminal 2 - Next.js Client
cd client
pnpm dev
```

### 2. Open Browser Console

Press **F12** to open developer tools and go to the **Console** tab.

### 3. Start Session

1. Click "Start Session"
2. **Watch console logs**:

```
🎤 Requesting microphone access...
✅ Microphone access granted!
🎤 Audio track settings: {...}
✅ Audio track added to peer connection
✅ Audio element added to document
✅ Data channel opened!
📋 SESSION UPDATE PAYLOAD: ...
🚀 Sending session.update to OpenAI...
✅ Session update sent!
```

3. **Grant microphone permission** when browser prompts
4. **Check UI indicators**:
   - ✅ Green "Connected" dot
   - ✅ "🎤 Mic Active" badge

### 4. Test Audio Output (Listening to AI)

**Method A: Ask a simple question (text)**
1. Type in the message box: "Hello, how are you?"
2. Press Send
3. **Watch console**:
   - `🎤 Model is generating a response`
   - `🔊 Received audio track from OpenAI` ← **KEY EVENT**
   - `✅ Audio playback started` ← **SUCCESS**
   - OR: `❌ Audio playback blocked by browser` ← **PROBLEM**

**If you see "Audio playback blocked":**
- Click the yellow "Click to Enable Audio" button
- This is normal for browsers with strict autoplay policies

**Method B: Test with voice (if Method A works)**
1. Speak into your microphone: "Can you hear me?"
2. Watch for same audio events

### 5. Test Audio Input (AI Listening to You)

**Speak into your microphone** and watch console:

```
📨 Received event: input_audio_buffer.speech_started
🎙️ Speech detected - listening...

📨 Received event: input_audio_buffer.speech_stopped  
🎙️ Speech ended

📨 Received event: input_audio_buffer.committed
🎤 Audio buffer committed - processing speech

📨 Received event: conversation.item.input_audio_transcription.completed
📝 Transcription completed: {...}
📝 You said: [your speech here]
```

**Check UI:**
- 🎙️ "Listening to your voice..." appears when you speak

### 6. Full Voice + Tool Test

1. **Say**: "Draw a red circle"
2. **Watch console** (should see ALL of these):

```
🎙️ Speech detected - listening...
🎙️ Speech ended
🎤 Audio buffer committed
📝 You said: draw a red circle
🎤 Model is generating a response
🔧 Function call detected
⚙️ Executing: create_element
✅ Tool execution successful!
🔊 Receiving audio response from AI...
💬 AI transcript: I've drawn a red circle for you
```

3. **You should**:
   - See "🎙️ Listening..." indicator
   - See "⚙️ Executing: create_element"
   - **Hear** AI confirm the drawing
   - See shape on canvas

## Diagnostic Checklist

### ✅ Microphone Working?
**Check for:**
- `✅ Microphone access granted!`
- `🎤 Mic Active` badge in UI
- `🎙️ Speech detected` when you speak

**If not working:**
- Check browser permissions (URL bar icon)
- Try a different browser
- Check system microphone settings
- Look for error: `❌ Failed to get microphone access`

### ✅ AI Can Hear You?
**Check for:**
- `input_audio_buffer.speech_started` events
- `📝 You said: [text]` with accurate transcription

**If not working:**
- Speak louder/clearer
- Check microphone input level in system settings
- Ensure `🎤 Mic Active` is showing
- Try speaking closer to microphone

### ✅ You Can Hear AI?
**Check for:**
- `🔊 Received audio track from OpenAI`
- `✅ Audio playback started`

**If not working:**
- Look for: `❌ Audio playback blocked by browser`
- Click "Click to Enable Audio" button if it appears
- Check system volume
- Check browser audio settings
- Try clicking anywhere on the page first

### ✅ Audio Format Issues?
The session configures:
- `input_audio_format: "pcm16"`
- `output_audio_format: "pcm16"`
- `voice: "alloy"`
- `input_audio_transcription: { model: "whisper-1" }`

**These should work automatically.** If not:
- Check console for session.updated confirmation
- Verify the session update payload includes these fields

## Common Issues & Solutions

### Issue: "Audio playback blocked by browser"
**Cause**: Browser autoplay policy
**Solution**: 
1. Click the yellow "Click to Enable Audio" button
2. Or click anywhere on the page before starting session
3. Or enable autoplay for this site in browser settings

### Issue: Microphone permission denied
**Cause**: Browser blocked microphone access
**Solution**:
1. Click the lock/info icon in URL bar
2. Allow microphone access
3. Refresh page and try again

### Issue: No speech detection
**Cause**: Voice Activity Detection (VAD) threshold too high
**Solution**:
- Speak louder
- Reduce background noise
- Check microphone input level
- Current threshold: 0.5 (can be adjusted in code)

### Issue: Transcription wrong or empty
**Cause**: Poor audio quality or unclear speech
**Solution**:
- Speak more clearly
- Reduce background noise
- Check microphone quality
- Ensure `input_audio_transcription` is enabled in session

### Issue: AI responds but no audio
**Cause**: Audio track not received or autoplay blocked
**Solution**:
- Check for `🔊 Received audio track` in console
- If missing, check session configuration
- If present but no sound, check "audioplayback blocked"
- Verify system volume and browser audio

### Issue: Hearing echo or feedback
**Cause**: Echo cancellation not working
**Solution**:
- Use headphones
- Check audio settings: `echoCancellation: true` should be set
- Check console for audio track settings

## Session Configuration

Current audio settings in `session.update`:

```javascript
{
  modalities: ["text", "audio"],  // Both text and audio enabled
  voice: "alloy",                  // AI voice
  input_audio_format: "pcm16",     // 16-bit PCM
  output_audio_format: "pcm16",    // 16-bit PCM
  input_audio_transcription: {
    model: "whisper-1"             // Enable transcription
  },
  turn_detection: {
    type: "server_vad",            // Server-side voice detection
    threshold: 0.5,                 // Sensitivity (0-1)
    prefix_padding_ms: 300,         // Start padding
    silence_duration_ms: 500        // End padding
  }
}
```

## Key Console Messages

### ✅ Success Indicators:
```
✅ Microphone access granted!
✅ Audio track added to peer connection
✅ Audio element added to document
🔊 Received audio track from OpenAI
✅ Audio playback started
🎙️ Speech detected - listening...
📝 You said: [accurate transcription]
```

### ❌ Problem Indicators:
```
❌ Failed to get microphone access
❌ Audio playback blocked by browser
❌ Failed to enable audio
(No speech events when speaking)
(No audio track received events)
```

## Advanced Debugging

### Check WebRTC Stats
Add this to browser console:
```javascript
peerConnection.getStats().then(stats => console.log(stats))
```

### Check Audio Element
```javascript
document.querySelector('audio')?.srcObject
document.querySelector('audio')?.paused
```

### Check Microphone Stream
The microphone stream should show:
```
🎤 Audio track settings: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  deviceId: "...",
  sampleRate: 48000,
  channelCount: 1
}
```

## Still Not Working?

1. **Try a different browser** (Chrome recommended)
2. **Check HTTPS** - Some features require secure context
3. **Disable browser extensions** - May interfere with WebRTC
4. **Try headphones** - Prevents echo/feedback
5. **Check firewall** - May block WebRTC
6. **Check console for errors** - Red messages indicate problems

## Testing Without Audio (Text Only)

If audio continues to fail, you can still:
- ✅ Use text input (type messages)
- ✅ Call MCP tools via text
- ✅ See AI responses as text
- ✅ Draw on canvas

The core functionality works - audio is an enhancement.

## Next Steps

If you've verified:
- ✅ Microphone access granted
- ✅ Audio element in DOM
- ✅ Audio track received from OpenAI
- ❌ But still no audio...

Then the issue is likely:
1. Browser autoplay policy (use the enable button)
2. System audio settings (check volume/output device)
3. Browser audio permissions (check site settings)

Check all three and audio should work!

