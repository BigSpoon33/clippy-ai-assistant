# Voice Prototype Testing Guide

## Quick Start Testing

### 1. Enable the Voice Prototype Command
1. Open Obsidian
2. Open Command Palette (`Ctrl+P` / `Cmd+P`)
3. Search for: "Test voice prototype (development)"
4. Select the command to open the Voice Prototype Testing Modal

### 2. Run Compatibility Check
The modal will automatically display browser compatibility for:
- ✅ MediaDevices.getUserMedia (microphone access)
- ✅ AudioContext (audio processing)
- ✅ SpeechRecognition (speech-to-text)
- ✅ SpeechSynthesis (text-to-speech)
- ✅ Performance Memory API (memory monitoring)

### 3. Test Individual Components

#### Audio Initialization Test
- **Purpose**: Test microphone access and AudioContext setup
- **Expected Result**: Should complete in 50-200ms
- **Troubleshooting**: If fails, check microphone permissions

#### Wake Word Detection Test
- **Purpose**: Test keyword spotting for "hey clippy"
- **Instructions**: Say "hey clippy" clearly within 10 seconds
- **Expected Result**: Should detect within 500-2000ms
- **Troubleshooting**: Speak closer to microphone, ensure quiet environment

#### Speech-to-Text Test
- **Purpose**: Test voice transcription accuracy
- **Instructions**: Speak clearly for 8 seconds
- **Expected Result**: Should transcribe speech accurately
- **Troubleshooting**: Speak slowly and clearly, check microphone levels

#### Text-to-Speech Test
- **Purpose**: Test voice synthesis
- **Expected Result**: Should start speaking within 100-500ms
- **Troubleshooting**: Check speaker volume, try different browser

#### Complete Workflow Test
- **Purpose**: Test full voice assistant workflow
- **Steps**: Audio → Wake Word → STT → TTS
- **Expected Result**: End-to-end voice interaction works

### 4. Monitor Performance Metrics

The modal displays real-time metrics:
- **Audio Init**: Microphone access time
- **Wake Word**: Detection latency
- **STT Processing**: Transcription time
- **TTS Latency**: Speech synthesis startup time
- **Memory**: Current JavaScript heap usage
- **Errors**: Count of errors encountered

### 5. Export Performance Data

Click "📊 Export Metrics" to download a JSON file with detailed performance data for PRP analysis.

## Expected Performance Baselines

### Good Performance
- Audio Init: < 100ms
- Wake Word: < 1000ms
- STT Processing: < 2000ms
- TTS Latency: < 300ms
- Memory Usage: < 50MB

### Acceptable Performance
- Audio Init: < 300ms
- Wake Word: < 2000ms
- STT Processing: < 5000ms
- TTS Latency: < 1000ms
- Memory Usage: < 100MB

### Poor Performance (needs optimization)
- Audio Init: > 300ms
- Wake Word: > 2000ms
- STT Processing: > 5000ms
- TTS Latency: > 1000ms
- Memory Usage: > 100MB

## Common Issues and Solutions

### Permission Denied Error
- **Cause**: Microphone permissions not granted
- **Solution**: Grant microphone access in browser settings
- **Prevention**: Clear permission instructions for users

### Wake Word Not Detected
- **Cause**: Background noise, poor pronunciation, microphone issues
- **Solution**: Test in quiet environment, speak clearly, check microphone
- **Optimization**: Adjust wake word sensitivity settings

### Speech Recognition Errors
- **Cause**: Browser compatibility, network issues, audio quality
- **Solution**: Use Chrome/Edge, check microphone quality
- **Fallback**: Implement backup recognition methods

### TTS Not Working
- **Cause**: Browser doesn't support Speech Synthesis, audio output issues
- **Solution**: Check browser compatibility, verify audio output
- **Fallback**: Implement text display as backup

## Browser Compatibility Results

### Tested Browsers
- ✅ Chrome 120+ (Best support)
- ✅ Edge 120+ (Good support) 
- ⚠️ Firefox 120+ (Limited speech recognition)
- ⚠️ Safari 17+ (Basic support)

### Obsidian Environment
- ✅ Desktop App (Electron) - Full support
- ⚠️ Web Version - Depends on browser

## Performance Data Collection

The prototype collects:
1. **Timing Metrics**: All component initialization and processing times
2. **Memory Usage**: JavaScript heap size monitoring
3. **Error Logging**: Detailed error messages and causes
4. **Device Information**: Platform, browser, hardware capabilities
5. **Feature Support**: Which browser APIs are available

This data feeds back into the PRP to provide concrete performance expectations and optimization targets.

## Next Steps

1. Run all tests in your Obsidian environment
2. Export performance metrics
3. Test in different environments (quiet/noisy, different devices)
4. Identify any platform-specific issues
5. Use data to refine voice assistant implementation strategy

The prototype validates that browser-based voice technology is viable for Obsidian plugins and provides the real-world performance data needed for a 10/10 PRP.