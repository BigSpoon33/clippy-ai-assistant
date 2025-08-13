# 🤖 CLIPPY AI Assistant

> Your intelligent companion for enhanced note-taking and content management in Obsidian

[![GitHub release](https://img.shields.io/github/release/larsladewig/clippy-ai-assistant.svg)](https://GitHub.com/larsladewig/clippy-ai-assistant/releases/)
[![License](https://img.shields.io/github/license/larsladewig/clippy-ai-assistant.svg)](https://github.com/larsladewig/clippy-ai-assistant/blob/main/LICENSE)

CLIPPY AI Assistant is a powerful Obsidian plugin that integrates multiple AI providers to enhance your note-taking workflow with intelligent content enhancement and automated tagging.

## ✨ Features

### 🎯 **Multi-Provider AI Integration**
- **Ollama** (Local AI models)
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude models)

### 📝 **Content Enhancement**
- Improve clarity, organization, and readability
- Custom enhancement instructions
- Preserve wikilinks, tags, and frontmatter
- Grammar and spelling corrections
- Structure optimization with headings

### 🏷️ **Intelligent Tagging**
- AI-powered tag suggestions with confidence scores
- Context-aware recommendations
- YAML-formatted tag integration
- Preserve existing vault patterns

### ⚙️ **Advanced Features**
- Vault pattern analysis and preservation
- Secure API key management
- Connection testing for all providers
- Modal-based intuitive UI
- Comprehensive error handling

## 🚀 Installation

### Method 1: Manual Installation (Recommended)
1. Download the latest release from [GitHub Releases](https://github.com/larsladewig/clippy-ai-assistant/releases)
2. Extract the files to your vault's `.obsidian/plugins/clippy-ai-assistant/` directory
3. Reload Obsidian and enable the plugin in Settings → Community Plugins

### Method 2: BRAT (Beta Reviewers Auto-update Tool)
1. Install the BRAT plugin
2. Add `larsladewig/clippy-ai-assistant` to BRAT
3. Enable the plugin in Settings → Community Plugins

### Method 3: Development Setup
```bash
cd your-vault/.obsidian/plugins/
git clone https://github.com/larsladewig/clippy-ai-assistant.git
cd clippy-ai-assistant
npm install
npm run build
```

## ⚙️ Configuration

1. **Open Settings** → Community Plugins → CLIPPY AI Assistant
2. **Select your AI provider** (Ollama, OpenAI, or Anthropic)
3. **Configure connection details**:
   - **Ollama**: Set server URL (default: `http://localhost:11434`) and model name
   - **OpenAI**: Add your API key
   - **Anthropic**: Add your API key
4. **Test connection** using the "Test CLIPPY Connection" command
5. **Enable features** toggle

## 🎮 Usage

### Commands Available in Command Palette (`Ctrl+P`):

#### 🔧 **Test CLIPPY Connection**
Verify your AI provider connection and check available models.

#### ✨ **Enhance current note with AI**
- Requires: Active note in edit mode
- Improves content clarity and organization
- Supports custom enhancement instructions
- Preserves all wikilinks, tags, and frontmatter

#### 🏷️ **Quick AI tagging suggestions**
- Requires: Active note with content
- Analyzes note content for relevant tags
- Shows confidence scores and reasoning
- Adds tags in YAML format to frontmatter

### Ribbon Icon
Click the sparkles (✨) icon in the left sidebar to quickly test your connection.

## 🛠️ Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- TypeScript knowledge

### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/larsladewig/clippy-ai-assistant.git
cd clippy-ai-assistant

# Install dependencies
npm install

# Build for development (watch mode)
npm run dev

# Build for production
npm run build
```

### Project Structure
```
├── main.ts              # Main plugin entry point
├── src/                 # Source code (advanced structure)
│   ├── ai/             # AI provider implementations
│   ├── processors/     # Content processing utilities
│   ├── ui/             # UI components and modals
│   └── utils/          # Helper utilities
├── styles.css          # Plugin styling
├── manifest.json       # Plugin metadata
└── README.md           # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with different AI providers
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](https://github.com/larsladewig/clippy-ai-assistant/issues) page to report bugs or request features.

When reporting bugs, please include:
- Obsidian version
- Plugin version
- AI provider being used
- Steps to reproduce
- Expected vs actual behavior

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find CLIPPY AI Assistant helpful, consider supporting the project:

- ⭐ Star this repository
- 🐛 Report bugs and suggest features
- 💰 [Sponsor the project](https://github.com/sponsors/larsladewig)
- ☕ [Buy me a coffee](https://buymeacoffee.com/larsladewig)

## 🙏 Acknowledgments

- Built with the [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the need for intelligent note management
- Thanks to the Obsidian community for feedback and support

---

**Made with ❤️ by [Lars Ladewig](https://github.com/larsladewig)**

*Enhancing your digital brain, one note at a time* 🧠✨