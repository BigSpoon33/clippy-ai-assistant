# 📝 CLIPPY AI Assistant - Naming Conventions

**Date**: 2025-08-20  
**Status**: Standardized and Enforced

## 🎯 **File Naming Standards**

### ✅ **Enforced Patterns**
- **TypeScript files**: `kebab-case.ts` (e.g., `vault-agent.ts`, `tts-spectrum-widget.ts`)
- **Directories**: `kebab-case` (e.g., `content-processing`, `knowledge-management`)
- **Test files**: `*.test.ts` (e.g., `vault-agent.test.ts`)

### ❌ **Avoided Patterns**
- ~~camelCase.ts~~ 
- ~~PascalCase.ts~~
- ~~snake_case.ts~~

## 🏗️ **Code Naming Standards**

### ✅ **Classes and Interfaces**
- **Classes**: `PascalCase` (e.g., `VaultAgent`, `SimpleMoEOrchestrator`)
- **Interfaces**: `PascalCase` (e.g., `AgentContext`, `VoiceConfiguration`)
- **Enums**: `PascalCase` (e.g., `VoiceStatus`, `VoiceEngineType`)

### ✅ **Variables and Functions**
- **Variables**: `camelCase` (e.g., `voiceSystem`, `moeOrchestrator`)
- **Functions**: `camelCase` (e.g., `processUserInput`, `generateResponse`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_SETTINGS`, `VIEW_TYPE_VAULT_AGENT`)

### ✅ **Acronym Handling**
- **In PascalCase**: `TTSManager`, `STTEngine`, `VADIndicator`, `RAGSystem`
- **In camelCase**: `ttsManager`, `sttEngine`, `vadIndicator`, `ragSystem`
- **In kebab-case**: `tts-manager.ts`, `stt-engine.ts`, `vad-indicator.ts`

## 📁 **Directory Structure Standards**

### ✅ **Feature-Based Organization**
```
src/
├── agents/              # AI agents and orchestrators
├── ai/                  # AI provider integrations  
├── features/            # Feature modules
│   ├── content-processing/    # Content analysis and enhancement
│   └── knowledge-management/  # Knowledge graph, search, discovery
├── ui/                  # User interface components
├── voice/               # Voice assistant system
├── utils/               # Shared utilities
└── types.ts             # Global type definitions
```

### ✅ **Component Grouping**
- **UI Components**: Grouped by type (`modals/`, `views/`, `components/`)
- **Voice Engines**: Grouped by function (`engines/tts/`, `engines/stt/`, `engines/wake-word/`)
- **Feature Modules**: Self-contained with clear boundaries

## 🚫 **Eliminated Issues**

### ✅ **Resolved**
- **Duplicate files**: Removed `src/voice/managers/tts-manager.ts` duplicate
- **Inconsistent imports**: All import paths updated to match new structure
- **Mixed naming**: All files now follow consistent kebab-case pattern

### ✅ **Standardized Acronyms**
- **MoE**: "Mixture of Experts" - consistently used in class names
- **TTS**: "Text-to-Speech" - consistently capitalized
- **STT**: "Speech-to-Text" - consistently capitalized  
- **VAD**: "Voice Activity Detection" - consistently capitalized
- **RAG**: "Retrieval-Augmented Generation" - consistently capitalized

## 📋 **Compliance Status**

**✅ ALL NAMING CONVENTIONS ARE NOW STANDARDIZED AND ENFORCED**

- **File naming**: 100% compliant with kebab-case
- **Class/Interface naming**: 100% compliant with PascalCase
- **Variable naming**: 100% compliant with camelCase
- **Directory structure**: 100% organized and consistent
- **Import paths**: 100% updated and functional

---

**Next Steps**: These conventions should be maintained for all future development.