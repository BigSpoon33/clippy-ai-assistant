# 🤖 CLIPPY AI Assistant

> Your intelligent companion for enhanced note-taking, content management, and research in Obsidian

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0-green.svg)](manifest.json)

CLIPPY AI Assistant is a powerful Obsidian plugin that integrates multiple AI providers to enhance your note-taking workflow with intelligent content enhancement, automated tagging, comprehensive research capabilities, and intelligent vault analysis.

## ✨ Features

### 🎯 **Multi-Provider AI Integration**
- **Ollama** (Local AI models) - Privacy-focused local processing
- **OpenAI** (GPT-4, GPT-3.5-turbo) - Advanced language understanding
- **Anthropic** (Claude models) - Sophisticated reasoning and analysis

### 📝 **Core Content Enhancement**
- **Smart Note Enhancement** - Improve clarity, organization, and readability
- **AI-Powered Tagging** - Context-aware tag suggestions with confidence scores
- **Note Formatting** - Automatic markdown structure optimization
- **Content Summarization** - Generate concise summaries for long notes
- **Live AI Chat** - Interactive AI conversation about your notes

### 🔬 **Advanced Research Features**
- **Comprehensive Research System** - Automated note generation from checklists
- **Web Search Integration** - SearXNG, Tavily, Brave, DuckDuckGo, SerpAPI, Serper support
- **Document Analysis** - Extract information from PDFs and personal documents
- **Quality Rating** - AI-powered source quality assessment
- **Vault Pattern Analysis** - Understand and preserve your note-taking style

### 🌉 **Intelligent Vault Management**
- **Bridge Discovery** - Find opportunities to connect related notes
- **Orphan Detection** - Identify isolated notes that need connections
- **Link Suggestions** - Smart wikilink recommendations
- **Knowledge Graph** - Visual relationship mapping
- **Semantic Search** - Vector-based content similarity

### 🎤 **Voice Assistant with Real-Time Visualizations (NEW!)**
- **Local Speech Recognition** - Whisper STT running locally (no internet required)
- **High-Quality Text-to-Speech** - Piper neural TTS with natural voices
- **Voice Commands** - Control CLIPPY with natural language
- **Wake Word Detection** - "Hey Clippy" activation
- **Privacy-First** - All voice processing happens locally
- **Audio File Management** - Automatic cleanup of temporary files

#### 🎨 **Voice Visualizers (LATEST UPDATE)**
- **Voice Activity Detection (VAD) Indicator** - Real-time visual feedback for speech detection
- **TTS Spectrum Analyzer** - Live frequency visualization during AI voice responses
- **Audio-Reactive UI** - Chat messages pulse with TTS volume for immersive feedback
- **Customizable Visualizations** - Adjustable colors, sensitivity, and display options
- **Professional Audio Analysis** - WebGL-accelerated spectrum rendering with audioMotion-analyzer
- **60 FPS Performance** - Optimized Canvas and WebGL rendering for smooth animations

### ⚙️ **Smart Features**
- **Vault Pattern Preservation** - Maintains your existing organizational structure
- **Secure API Management** - Encrypted credential storage
- **Error Boundaries** - Robust fallback mechanisms
- **Real-time Processing** - Non-blocking background operations
- **Customizable Templates** - Flexible output formatting

## 🚀 Installation

### Method 1: Manual Installation (Recommended)
1. Download the latest release from this repository
2. Extract the files to your vault's `.obsidian/plugins/clippy-ai-assistant/` directory
3. Reload Obsidian and enable the plugin in Settings → Community Plugins

### Method 2: Development Setup
```bash
cd your-vault/.obsidian/plugins/
git clone https://github.com/your-username/clippy-ai-assistant.git
cd clippy-ai-assistant
npm install
npm run build
```

## ⚙️ Configuration

### 1. Basic Setup
1. Open **Settings** → **Community Plugins** → **CLIPPY AI Assistant**
2. **Select your AI provider** (Ollama, OpenAI, or Anthropic)
3. **Configure connection details**:
   - **Ollama**: Set server URL (default: `http://localhost:11434/v1`) and model name
   - **OpenAI**: Add your API key and select model
   - **Anthropic**: Add your API key and select Claude model

### 2. Research Configuration
Configure search engines and research settings:
- **Search Provider**: Choose from SearXNG, Tavily, Brave, DuckDuckGo, SerpAPI, or Serper
- **API Keys**: Set up your preferred search engine API keys
- **Output Settings**: Customize research note templates and folders
- **Quality Thresholds**: Set minimum quality scores for research sources

### 3. Voice Visualizer Configuration
Configure real-time audio visualizations:
- **VAD Visualizer**: Voice activity detection with configurable sensitivity and colors
- **TTS Spectrum**: Real-time frequency analysis during AI speech with customizable bars and effects
- **Audio-Reactive Borders**: Message borders that pulse in sync with TTS volume
- **Performance Settings**: Adjust smoothing, frequency ranges, and rendering quality

### 4. Feature Toggles
Enable/disable specific features:
- **Auto-Tagging**: AI-powered tag suggestions
- **Note Formatting**: Automatic structure enhancement
- **Content Suggestions**: Intelligent content recommendations
- **Intelligent Links**: Smart link suggestion system

## 🎮 Usage

### Available Commands in Command Palette (`Ctrl/Cmd+P`):

#### 🔧 **Core AI Commands**
- **Enhance current note with AI** - Improve content clarity and organization
- **Quick AI tagging suggestions** - Get intelligent tag recommendations
- **Summarize current note** - Generate concise note summaries
- **Chat with AI about current note** - Interactive AI conversation
- **Format current note** - Clean up markdown structure

#### 🔍 **Analysis & Insights**
- **Analyze vault patterns** - Understand your note organization
- **Get content suggestions** - AI-powered improvement recommendations
- **Get quick insights about note** - Note statistics and analysis

#### 🌉 **Knowledge Management**
- **Discover bridge opportunities** - Find ways to connect related notes
- **Show research project dashboard** - Track research progress
- **Mark research note as completed** - Update research status

#### 🔬 **Research System**
- **Generate research notes from checklist** - Automated research workflow
- **Comprehensive research with vault analysis and web search** - Advanced research system

#### 🎤 **Voice Assistant Commands**
- **Toggle Voice Assistant** - Activate/deactivate the voice system
- **Test Voice - Speak** - Test text-to-speech functionality
- **Test Voice - Listen** - Test speech-to-text functionality

### Quick Actions
- **Ribbon Icon**: Click the sparkles (✨) icon to quickly access key features
- **Hotkeys**: 
  - `Ctrl/Cmd+Shift+T` - Quick AI tagging
  - Configure additional hotkeys in Settings → Hotkeys

### Research Workflow Example
1. Use **"Comprehensive research"** command
2. Enter research topics (one per line):
   ```
   Turmeric benefits
   Ashwagandha dosage
   Natural anti-inflammatory herbs
   ```
3. Configure options:
   - Enable web search and vault analysis
   - Choose output folder
   - Set quality thresholds
4. CLIPPY will:
   - Create research notes for each topic
   - Search your vault for related content
   - Perform web searches and save sources
   - Extract and synthesize information
   - Generate comprehensive research reports

## 🎤 Voice Assistant Setup

The Voice Assistant uses **local AI models** for maximum privacy and offline functionality.

### Prerequisites
1. **Python Environment**: A Python virtual environment with voice dependencies
2. **Audio System**: Working microphone and speakers/headphones
3. **System Audio Tools**: Basic audio recording/playback utilities

### Quick Setup
The voice system is **automatically configured** when you activate it:

1. **Activate Voice Assistant**:
   - Use Command Palette → "Toggle Voice Assistant"
   - Or click the voice status indicator in the status bar

2. **First-Time Setup**:
   - Python dependencies will be checked
   - Whisper STT models will download automatically (one-time)
   - Piper TTS voices will download automatically (one-time)

3. **Test the System**:
   - Use "Test Voice - Speak" to test text-to-speech
   - Use "Test Voice - Listen" to test speech recognition

### Voice Commands
Once activated, you can:
- **Wake Word**: Say "Hey Clippy" to get attention
- **Enhancement**: "Enhance this note" / "Improve this note"
- **Tagging**: "Tag this note" / "Add tags"
- **Summarization**: "Summarize this note"
- **Deactivation**: "Stop" / "Disable voice"

### Technical Details
- **Speech-to-Text**: OpenAI Whisper (runs locally)
- **Text-to-Speech**: Piper neural TTS (high-quality, local)
- **Audio Processing**: Temporary files automatically cleaned up
- **Status Indicator**: Color-coded status bar indicator shows system state:
  - 🟠 Orange: Inactive
  - 🔵 Blue: Active/Ready
  - 🟢 Green: Listening
  - 🟡 Yellow: Speaking

### Voice System Requirements
- **Python 3.10-3.12**: For AI model execution
- **Audio Drivers**: System audio input/output
- **Disk Space**: ~500MB for AI models (downloaded once)
- **RAM**: ~2GB during voice processing

### Troubleshooting Voice Issues
1. **"Voice System not initialized"**: Check Python environment
2. **"No speech detected"**: Check microphone permissions and levels
3. **"TTS failed"**: Verify audio output and system speakers
4. **Poor recognition**: Speak clearly, reduce background noise
5. **Slow response**: First-time model loading takes longer

## 📁 Project Structure

```
clippy-ai-assistant/
├── main.ts                 # Entry point
├── src/                    # Modular source code
│   ├── main.ts            # Main plugin class
│   ├── types.ts           # Core type definitions
│   ├── settings.ts        # Settings management
│   ├── ai/                # AI provider implementations
│   │   ├── base-provider.ts
│   │   ├── ollama-client.ts
│   │   ├── openai-client.ts
│   │   ├── anthropic-client.ts
│   │   └── provider-factory.ts
│   ├── voice-v2/          # Voice Assistant System
│   │   ├── local-voice-integration.ts
│   │   ├── engines/        # TTS/STT engines
│   │   ├── utils/          # VAD engine and audio processing
│   │   ├── components/     # Voice visualization components
│   │   └── types/          # Voice system type definitions
│   ├── python-bridge/     # Python AI model bridges
│   │   ├── whisper_stt.py    # Whisper speech recognition
│   │   ├── piper_tts.py      # Piper text-to-speech
│   │   └── system_tts.py     # System TTS fallback
│   ├── ui/                # User interface components
│   │   ├── modals/        # Modal dialogs
│   │   ├── views/         # Custom views
│   │   ├── components/    # UI components and visualizers
│   │   │   └── audio-visualizers/ # Voice visualization widgets
│   │   └── command-handlers.ts
│   ├── services/          # Core services
│   │   ├── content-enhancer.ts
│   │   ├── tag-generator.ts
│   │   └── tag-editor.ts
│   ├── research/          # Research system
│   │   ├── automated-note-generator.ts
│   │   ├── comprehensive-research-system.ts
│   │   ├── web-search-engine.ts
│   │   └── quality-rater.ts
│   ├── processors/        # Content processing
│   ├── utils/             # Utilities and error handling
│   └── knowledge-graph/   # Relationship mapping
├── styles.css             # Plugin styling
├── manifest.json          # Plugin metadata
└── README.md              # This file
```

## 🛠️ Settings Reference

### AI Provider Settings
```json
{
  "aiProvider": "ollama",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "model": "llama3.2",
      "enabled": true
    },
    "openai": {
      "apiKey": "your-api-key",
      "model": "gpt-4",
      "enabled": false
    },
    "anthropic": {
      "apiKey": "your-api-key", 
      "model": "claude-3-sonnet-20240229",
      "enabled": false
    }
  }
}
```

### Research Settings
```json
{
  "research": {
    "searchEngine": {
      "provider": "searxng",
      "searxngUrl": "http://localhost:8088"
    },
    "defaults": {
      "maxResults": 10,
      "qualityThreshold": 0.6,
      "outputFolder": "Generated Research Notes",
      "showThinkingTags": false
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### AI Provider Not Working
1. **Check Settings**: Verify API keys and URLs are correct
2. **Test Connection**: Use "Analyze vault patterns" command to test
3. **Check Logs**: Open Developer Console (Ctrl+Shift+I) for error details
4. **Firewall**: Ensure Obsidian can access your AI provider URLs

#### Research Features Not Working
1. **Search Engine Setup**: Verify search engine API keys
2. **Internet Connection**: Ensure stable internet for web searches
3. **Rate Limits**: Some APIs have rate limits - wait and retry
4. **Output Folder**: Ensure the configured output folder exists

#### Voice Assistant Issues
1. **Voice System Not Starting**: Check Python environment and dependencies
2. **Poor Speech Recognition**: Ensure clear speech, quiet environment, working microphone
3. **TTS Not Working**: Verify audio output, check system volume and speakers
4. **Slow Voice Response**: First-time model loading takes longer, subsequent uses are faster
5. **Model Download Failures**: Check internet connection for initial model downloads

#### Performance Issues
1. **Large Vaults**: Research operations may take longer with many notes
2. **AI Model Size**: Larger models provide better results but slower responses
3. **Background Processing**: Most operations run in background to avoid UI blocking
4. **Voice Processing**: Voice operations require additional RAM and CPU during use

### Getting Help
1. Check the [Issues](https://github.com/your-username/clippy-ai-assistant/issues) page
2. Enable debug logging in plugin settings
3. Check Obsidian's Developer Console for error messages
4. Include your Obsidian version, plugin version, and AI provider when reporting issues

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Test thoroughly with different AI providers
5. Update documentation as needed
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Structure Guidelines
- Follow the modular architecture in `/src`
- Use TypeScript with proper type definitions
- Implement error boundaries for all AI operations
- Add JSDoc comments for public methods
- Include unit tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the need for intelligent knowledge management
- Thanks to the Obsidian community for feedback and support
- Special thanks to AI providers making their APIs accessible

---

**Made with ❤️ for the Obsidian community**

*Enhancing your digital brain, one note at a time* 🧠✨

## 📞 Support & Community

- **Documentation**: This README and inline code comments
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Join discussions about features and use cases
- **Updates**: Follow releases for new features and improvements

### Tips for Best Results
1. **Start Small**: Begin with simple note enhancement before using complex research features
2. **Configure Properly**: Take time to set up your preferred AI provider and search engines
3. **Understand Your Vault**: Use vault analysis to understand your existing patterns
4. **Experiment**: Try different AI models and settings to find what works best for your workflow
5. **Stay Organized**: Use consistent folder structures and naming conventions for best results