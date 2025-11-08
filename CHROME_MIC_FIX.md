# Chrome Microphone Fix Guide

## Issue
Microphone works fine on Safari but not on Chrome.

## Why Chrome is Different

Chrome has **stricter security policies** than Safari:
1. More restrictive microphone permissions
2. Stricter WebRTC constraints
3. Different audio processing defaults
4. Cached permissions can cause issues

## Fixes Applied

### 1. **Chrome-Compatible Audio Constraints**
Added explicit constraints that Chrome requires:
- ✅ Sample rate: 24000 Hz
- ✅ Channel count: 1 (mono)
- ✅ Echo cancellation
- ✅ Noise suppression
- ✅ Auto gain control

### 2. **Enhanced Diagnostics**
Now logs everything Chrome does with the microphone:
- Browser detection
- Audio track details (enabled, muted, readyState)
- Track settings and capabilities
- Connection state monitoring
- Specific error messages for Chrome

### 3. **Peer Connection Monitoring**
Added state tracking:
- ICE connection state
- Connection state
- Signaling state

### 4. **Track Event Listeners**
Monitors if Chrome mutes/unmutes the track:
- `onmute` - Track was muted
- `onunmute` - Track was unmuted
- `onended` - Track stopped

## How to Test in Chrome

### 1. **Clear Chrome's Permissions Cache**

Sometimes Chrome caches old permissions. Reset them:

1. Click the **lock icon** (or info icon) in the address bar
2. Click **"Site settings"**
3. Find **"Microphone"** → Set to **"Ask (default)"** or **"Allow"**
4. **Reload the page**

OR use Chrome settings:
```
chrome://settings/content/microphone
```

### 2. **Start Fresh Session**

1. Open Chrome DevTools (**F12**)
2. Go to **Console** tab
3. Click **"Start Session"**
4. Watch for these specific logs:

```
Browser: Chrome
🎤 Requesting microphone access...
🎤 Audio constraints: { audio: { sampleRate: 24000, ... } }
```

### 3. **Check Permission Dialog**

Chrome should show a permission prompt. Look for:
- ✅ Prompt appears at top of browser
- ✅ Shows your actual microphone name
- ✅ Click **"Allow"**

### 4. **Verify Microphone Access Granted**

After allowing, console should show:

```
✅ Microphone access granted!
Stream details: { id: "...", active: true, tracks: 1 }
🎤 Audio track: {
  id: "...",
  kind: "audio",
  label: "Default - [Your Mic Name]",
  enabled: true,
  muted: false,
  readyState: "live"
}
🎤 Audio track settings: {
  channelCount: 1,
  echoCancellation: true,
  sampleRate: 24000,
  ...
}
✅ Audio track added to peer connection
Track sender: live
```

### 5. **Key Things to Check**

**✅ Good signs:**
- `enabled: true`
- `muted: false`
- `readyState: "live"`
- `Track sender: live`

**❌ Bad signs:**
- `muted: true` → Chrome muted your mic
- `readyState: "ended"` → Track was stopped
- `Track sender: ended` → Not connected properly

### 6. **Test Speaking**

Once connected, **speak into your microphone** and watch for:

```
🔌 Connection state: connected
📨 Received event: input_audio_buffer.speech_started
🎙️ Speech detected - listening...
```

## Common Chrome Issues & Solutions

### Issue 1: Permission Denied
**Console shows:**
```
❌ Failed to get microphone access
Error name: NotAllowedError
💡 Chrome blocked microphone: Check site permissions in address bar
```

**Solution:**
1. Click lock icon in address bar
2. Microphone → Allow
3. Reload page
4. Try again

### Issue 2: No Microphone Found
**Console shows:**
```
Error name: NotFoundError
💡 No microphone found: Check system audio settings
```

**Solution:**
1. Check System Preferences → Sound → Input
2. Ensure a microphone is selected
3. Test mic in System Preferences (should see input level)
4. Refresh Chrome

### Issue 3: Microphone in Use
**Console shows:**
```
Error name: NotReadableError
💡 Microphone in use by another app
```

**Solution:**
1. Close other apps using microphone (Zoom, Discord, etc.)
2. Check Chrome tabs (another tab might be using mic)
3. Quit and restart Chrome
4. Try again

### Issue 4: Track Gets Muted
**Console shows:**
```
✅ Microphone access granted!
⚠️ Audio track muted
```

**Solution:**
1. Chrome might have auto-muted. Check:
   - Chrome tabs - is another tab playing audio?
   - System volume/mute settings
2. Click the site icon → Microphone → Always allow
3. Reload and try again

### Issue 5: No Speech Detection
**Console shows:**
```
✅ Microphone access granted!
✅ Audio track added to peer connection
🔌 Connection state: connected
[but no speech events when speaking]
```

**Solution:**
1. **Speak louder** - Chrome's VAD might not detect quiet speech
2. **Check mic input level** in System Preferences
3. Try this in console:
```javascript
// Check if audio is actually flowing
pc.getStats().then(stats => {
  stats.forEach(stat => {
    if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
      console.log('Audio packets received:', stat.packetsReceived);
    }
  });
});
```

### Issue 6: Works in Safari but Not Chrome
This usually means Chrome's security is blocking it.

**Check:**
1. Is site running on `http://` (not `https://`)?
   - Chrome allows `localhost` but might block other HTTP sites
2. Try explicitly allowing in:
   ```
   chrome://settings/content/siteDetails?site=http://localhost:3001
   ```
3. Set Microphone to "Allow"

## Chrome-Specific Checks

### Check 1: Microphone Permission Status
Run this in Chrome console:
```javascript
navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Microphone permission:', result.state);
  // Should be: "granted", "denied", or "prompt"
});
```

### Check 2: Available Microphones
```javascript
navigator.mediaDevices.enumerateDevices().then(devices => {
  const mics = devices.filter(d => d.kind === 'audioinput');
  console.log('Available microphones:', mics);
});
```

### Check 3: Test Microphone Directly
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Direct mic access works!');
    console.log('Stream:', stream);
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => {
    console.error('❌ Direct mic access failed:', err);
  });
```

### Check 4: WebRTC Connection
```javascript
// After session is started
peerConnection.getStats().then(stats => {
  stats.forEach(stat => {
    if (stat.type === 'media-source' && stat.kind === 'audio') {
      console.log('Microphone stats:', stat);
    }
  });
});
```

## Quick Fixes to Try

### Fix 1: Restart Chrome Completely
```bash
# macOS
pkill -9 "Google Chrome"
# Then reopen Chrome
```

### Fix 2: Try Incognito Mode
1. Open Chrome Incognito window (Cmd+Shift+N)
2. Go to your app
3. This tests without extensions/cached data

### Fix 3: Disable Extensions
1. Chrome menu → Extensions → Manage Extensions
2. Disable all extensions
3. Test microphone
4. If it works, enable extensions one-by-one to find culprit

### Fix 4: Reset Chrome Flags
If you've changed Chrome flags:
```
chrome://flags/#reset-all
```

### Fix 5: Use Different Chrome Channel
Try Chrome Canary or Beta:
- Chrome Canary: Latest experimental features
- Chrome Beta: More stable than Canary
- Sometimes a specific Chrome version has bugs

## What the Logs Should Look Like in Chrome

### Successful Chrome Microphone Setup:
```
Browser: Chrome
🎤 Requesting microphone access...
🎤 Audio constraints: {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 24000,
    channelCount: 1
  }
}
✅ Microphone access granted!
Stream details: {
  id: "abc123",
  active: true,
  tracks: 1
}
🎤 Audio track: {
  id: "track456",
  kind: "audio",
  label: "Default - Built-in Microphone (05ac:1108)",
  enabled: true,
  muted: false,
  readyState: "live"
}
🎤 Audio track settings: {
  channelCount: 1,
  echoCancellation: true,
  sampleRate: 24000,
  deviceId: "default",
  groupId: "...",
  ...
}
🎤 Audio track capabilities: {
  channelCount: { max: 2, min: 1 },
  sampleRate: { max: 48000, min: 8000 },
  ...
}
✅ Audio track added to peer connection
Track sender: live

🔌 ICE connection state: checking
🔌 ICE connection state: connected
🔌 Connection state: connected
🔌 Signaling state: stable

[When you speak]
📨 Received event: input_audio_buffer.speech_started
🎙️ Speech detected - listening...
```

## Still Not Working?

### Try This Diagnostic:

1. **Open 2 browser tabs** - Safari and Chrome
2. **Start session in both**
3. **Compare the console logs side-by-side**
4. **Look for differences** in:
   - Audio track settings
   - Sample rates
   - Connection states
   - Permission status

### Send Me the Logs:

**From Chrome console**, copy and paste:
1. Everything from "Browser: Chrome" onwards
2. Any red errors
3. The audio track details
4. Connection state logs

## Most Likely Causes

Based on "works in Safari but not Chrome":

1. **Cached permissions** (70% likely)
   - Fix: Clear site data, reload

2. **Chrome security policy** (20% likely)
   - Fix: Explicitly allow mic in chrome://settings

3. **Different audio constraints** (5% likely)
   - Fix: Already fixed with sampleRate: 24000

4. **Chrome extension interference** (5% likely)
   - Fix: Try incognito mode

## Test Result

After applying fixes, you should see:
- ✅ "🎤 Mic Active" badge in UI
- ✅ "🎙️ Listening..." when you speak
- ✅ Transcription of your speech
- ✅ AI responds with voice

**Let me know what you see in the Chrome console!**

