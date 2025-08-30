name: "CLIPPY AI Assistant Plugin - Phase 1"
description: |

## Purpose
Implement an AI-powered personal assistant plugin for Obsidian that seamlessly integrates with the existing vault structure, providing intelligent note management and enhancement capabilities while following established patterns and conventions.

## Core Principles
1. **Vault Integration First**: Respect existing dataview queries, templates, and organizational patterns
2. **Multi-Provider Support**: Abstract AI services to support Ollama (local), OpenAI, and Anthropic
3. **Progressive Enhancement**: Add value without breaking existing workflows
4. **Privacy by Design**: Local-first options with secure credential management
5. **90% Confidence Requirement**: Comprehensive research and validation before implementation

---

## Goal
Create a TypeScript-based Obsidian plugin that provides AI-powered note enhancement, content generation, and task automation while maintaining perfect compatibility with the existing vault structure and user workflows.

## Why
- **Enhanced Productivity**: Automate repetitive note formatting and content enhancement tasks
- **Intelligent Organization**: Auto-tagging and content analysis based on vault patterns
- **Seamless Integration**: Work within existing dataview queries, templates, and folder structures
- **Multi-Provider Flexibility**: Support local privacy-focused models and cloud-based APIs
- **User Empowerment**: Enhance decision-making rather than replace user control

## What
Phase 1 implementation focusing on core AI integration and basic note enhancement:

### Success Criteria
- [ ] Plugin loads successfully in Obsidian without conflicts
- [ ] AI providers (Ollama, OpenAI, Anthropic) can be configured and switched dynamically
- [ ] Note formatting and enhancement works with existing markdown patterns
- [ ] Auto-tagging respects existing tag conventions and dataview queries
- [ ] All generated content follows vault's CSS classes and styling
- [ ] Settings interface allows configuration of all AI providers and features
- [ ] Command palette integration provides access to all AI functions
- [ ] No existing vault functionality is broken or disrupted

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Core implementation context
- url: https://docs.obsidian.md/Reference/TypeScript+API/Plugin
  why: Official plugin API for Obsidian development
  
- url: https://github.com/obsidianmd/obsidian-sample-plugin
  why: Official TypeScript plugin template and patterns
  
- file: /home/shuma/Documents/Obsidian-Homepage/Rainbell English/.obsidian/plugins/homepage/manifest.json
  why: Example of existing plugin manifest structure
  
- file: /home/shuma/Documents/Obsidian-Homepage/Rainbell English/40 - Obsidian/Homepages/00. Homepage.md
  why: Existing dataview patterns and CSS classes to preserve
  
- file: /home/shuma/Documents/Obsidian-Homepage/Rainbell English/40 - Obsidian/Templates/New Daily template.md  
  why: Templater patterns and frontmatter conventions to follow

# AI Integration Patterns
- url: https://github.com/qgrail/obsidian-ai-assistant
  why: Reference implementation for multi-provider AI integration
  
- url: https://github.com/kuzzh/obsidian-ai-bot
  why: Plugin architecture patterns for AI assistance in Obsidian
  
- url: https://ollama.com/blog/openai-compatibility
  why: OpenAI-compatible API pattern for unified provider interface
  
- url: https://docs.anthropic.com/en/api/getting-started
  why: Anthropic Claude API integration patterns
  
- url: https://platform.openai.com/docs/api-reference
  why: OpenAI API specification for consistent interface

# Vault Structure Analysis  
- file: /home/shuma/Documents/Obsidian-Homepage/Rainbell English/CLAUDE.md
  why: Project rules and conventions that must be followed
  
- file: /home/shuma/Documents/Obsidian-Homepage/Rainbell English/.obsidian/community-plugins.json
  why: Existing plugin ecosystem to ensure compatibility
  
- file: /home/shuma/Documents/Obsidian-Homepage/Rainbell English/31 - Anime/00. Cinematheque.md
  why: Example of complex dataviewjs queries to preserve
```

### Current Codebase Structure
```bash
/home/shuma/Documents/Obsidian-Homepage/Rainbell English/
├── .obsidian/
│   ├── plugins/                    # Existing plugin directory
│   ├── community-plugins.json      # Plugin registry
│   └── app.json                    # Obsidian configuration
├── 00 - DailyNotes/               # Time-based notes with templater
├── 10 - People/                   # Person entities with metadata
├── 20 - Work & Study/             # Project and learning notes
├── 30 - Reading/                  # Book and article notes
├── 31 - Anime/                    # Media tracking with dataview
├── 40 - Obsidian/                 # Vault meta (templates, attachments)
├── 50 - Zettelkasten/            # Atomic knowledge notes
├── CLAUDE.md                      # Project rules and conventions
└── examples/                      # Code examples and patterns
```

### Desired Plugin Structure
```bash
.obsidian/plugins/clippy-ai-assistant/
├── manifest.json                  # Plugin metadata
├── main.js                       # Compiled plugin code
├── styles.css                    # Plugin-specific styles
├── data.json                     # User settings and state
└── src/                          # Source files (development)
    ├── main.ts                   # Plugin entry point
    ├── settings.ts               # Settings interface
    ├── ai/                       # AI provider abstraction
    │   ├── provider-factory.ts   # Dynamic provider selection
    │   ├── ollama-client.ts      # Local Ollama integration
    │   ├── openai-client.ts      # OpenAI API client
    │   └── anthropic-client.ts   # Anthropic Claude client
    ├── processors/               # Content processing
    │   ├── markdown-formatter.ts # Note formatting enhancement
    │   ├── auto-tagger.ts        # Intelligent tagging
    │   └── content-analyzer.ts   # Vault pattern analysis
    ├── ui/                       # User interface components
    │   ├── settings-modal.ts     # Configuration interface
    │   ├── ai-chat-modal.ts      # AI interaction modal
    │   └── command-handlers.ts   # Command palette integration
    └── utils/                    # Utility functions
        ├── vault-analyzer.ts     # Vault structure analysis
        ├── security.ts          # Credential management
        └── constants.ts          # Plugin constants
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Obsidian plugin environment considerations
// Example: Obsidian runs in Electron with specific Node.js modules available
// Example: Plugin data must be stored in plugin folder as data.json
// Example: All UI must use Obsidian's theme system for consistency

// CRITICAL: Vault integration requirements
// Example: Preserve existing wikilink patterns [[Note Name]]
// Example: Respect frontmatter schemas used by dataview queries
// Example: CSS classes must follow vault's style settings
// Example: Templater syntax must be preserved in templates

// CRITICAL: AI provider patterns
// Example: Ollama uses OpenAI-compatible API at http://localhost:11434/v1
// Example: Rate limiting required for all cloud APIs
// Example: Secure credential storage using Obsidian's data encryption
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// Core plugin settings and AI provider configurations
interface ClippySettings {
  aiProvider: 'ollama' | 'openai' | 'anthropic';
  providers: {
    ollama: {
      baseUrl: string;
      model: string;
      enabled: boolean;
    };
    openai: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    anthropic: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
  };
  features: {
    autoTagging: boolean;
    noteFormatting: boolean;
    contentSuggestions: boolean;
  };
  vaultPatterns: {
    tagPrefix: string;
    dateFormat: string;
    templateFolder: string;
  };
}

// AI provider abstraction interface
interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(prompt: string, context?: string): Promise<string>;
  analyzeContent(content: string): Promise<ContentAnalysis>;
}

// Content analysis results
interface ContentAnalysis {
  suggestedTags: string[];
  topics: string[];
  summary: string;
  relatedNotes: string[];
  formattingIssues: string[];
}
```

### Task List (Implementation Order)

```yaml
Task 1 - Plugin Foundation:
CREATE .obsidian/plugins/clippy-ai-assistant/:
  - COPY pattern from: Official obsidian-sample-plugin template
  - MODIFY manifest.json with clippy-specific metadata
  - SETUP TypeScript build configuration
  - PRESERVE existing plugin ecosystem compatibility

Task 2 - Settings Infrastructure:
CREATE src/settings.ts:
  - MIRROR pattern from: existing plugins in vault
  - IMPLEMENT secure credential storage using Obsidian data encryption
  - CREATE settings modal UI following Obsidian design patterns
  - VALIDATE all API keys and connections on save

Task 3 - AI Provider Abstraction:
CREATE src/ai/provider-factory.ts:
  - IMPLEMENT factory pattern for dynamic provider selection
  - ABSTRACT common AI operations (completion, analysis)
  - HANDLE provider failures with graceful fallbacks
  - PRESERVE user choice and privacy settings

CREATE src/ai/ollama-client.ts:
  - IMPLEMENT OpenAI-compatible client for local Ollama
  - HANDLE connection testing and model availability
  - OPTIMIZE for local performance and caching

CREATE src/ai/openai-client.ts & src/ai/anthropic-client.ts:
  - IMPLEMENT cloud provider clients with rate limiting
  - SECURE credential handling and request encryption
  - ERROR handling for API failures and quotas

Task 4 - Vault Pattern Analysis:
CREATE src/utils/vault-analyzer.ts:
  - SCAN existing notes for tagging patterns
  - ANALYZE frontmatter schemas used in dataview queries
  - DETECT CSS classes and styling conventions
  - PRESERVE user's organizational preferences

Task 5 - Content Processing:
CREATE src/processors/markdown-formatter.ts:
  - ANALYZE messy notes and suggest formatting improvements
  - PRESERVE existing wikilinks and metadata
  - FOLLOW vault's markdown conventions
  - NEVER modify notes without user confirmation

CREATE src/processors/auto-tagger.ts:
  - SUGGEST tags based on content analysis
  - RESPECT existing tag hierarchy and patterns
  - INTEGRATE with dataview query expectations
  - LEARN from user's tagging history

Task 6 - Command Integration:
CREATE src/ui/command-handlers.ts:
  - REGISTER commands in Obsidian command palette
  - IMPLEMENT hotkey support for frequent operations
  - CREATE context-aware commands based on current note
  - PRESERVE Obsidian's native keyboard shortcuts

Task 7 - User Interface:
CREATE src/ui/ai-chat-modal.ts:
  - IMPLEMENT modal dialog for AI interactions
  - FOLLOW Obsidian's modal design patterns
  - SUPPORT markdown rendering in responses
  - MAINTAIN theme compatibility

Task 8 - Plugin Registration:
MODIFY src/main.ts:
  - EXTEND Obsidian Plugin class properly
  - REGISTER all commands and UI components
  - HANDLE plugin lifecycle events
  - IMPLEMENT proper cleanup on disable
```

### Implementation Pseudocode

```typescript
// Task 1-2: Plugin Foundation & Settings
class ClippyPlugin extends Plugin {
    settings: ClippySettings;
    
    async onload() {
        // PATTERN: Load settings from data.json (see existing plugins)
        this.settings = await this.loadSettings();
        
        // PATTERN: Register settings tab (see obsidian-sample-plugin)
        this.addSettingTab(new ClippySettingsTab(this.app, this));
        
        // CRITICAL: Validate vault compatibility on load
        await this.analyzeVaultPatterns();
    }
    
    async analyzeVaultPatterns() {
        // PATTERN: Scan vault structure without modifying (see dataview plugin)
        const vaultFiles = this.app.vault.getMarkdownFiles();
        
        // GOTCHA: Must respect user's privacy and vault isolation
        const patterns = {
            tagPatterns: await this.extractTagPatterns(vaultFiles),
            dateFormats: await this.detectDateFormats(vaultFiles),
            cssClasses: await this.analyzeCSSUsage(vaultFiles)
        };
        
        // CRITICAL: Store patterns for AI to follow
        this.settings.vaultPatterns = patterns;
    }
}

// Task 3: AI Provider Abstraction
class ProviderFactory {
    static async createProvider(settings: ClippySettings): Promise<AIProvider> {
        // PATTERN: Factory pattern with fallback handling
        switch (settings.aiProvider) {
            case 'ollama':
                const ollama = new OllamaClient(settings.providers.ollama);
                if (await ollama.isAvailable()) return ollama;
                // FALLBACK: to next available provider
            case 'openai':
                return new OpenAIClient(settings.providers.openai);
            case 'anthropic':
                return new AnthropicClient(settings.providers.anthropic);
            default:
                throw new Error('No AI provider available');
        }
    }
}

// Task 4-5: Content Processing
class MarkdownFormatter {
    async enhanceNote(content: string, vaultPatterns: VaultPatterns): Promise<string> {
        // PATTERN: Analyze content without modifying original
        const analysis = await this.aiProvider.analyzeContent(content);
        
        // CRITICAL: Preserve existing wikilinks and frontmatter
        const preservedElements = this.extractPreservedElements(content);
        
        // GOTCHA: Never auto-save, always present suggestions
        const suggestions = await this.generateFormattingImpressions(
            content, 
            analysis, 
            vaultPatterns
        );
        
        // PATTERN: Return enhanced content with preserved elements
        return this.mergeEnhancements(content, suggestions, preservedElements);
    }
}

// Task 6-7: Command Integration & UI
async registerCommands() {
    // PATTERN: Command palette integration (see obsidian-sample-plugin)
    this.addCommand({
        id: 'clippy-enhance-note',
        name: 'Enhance current note with AI',
        editorCallback: async (editor: Editor, view: MarkdownView) => {
            // CRITICAL: Get current note content
            const content = editor.getValue();
            
            // PATTERN: Show modal for user interaction
            const modal = new AIEnhancementModal(this.app, content, this.settings);
            modal.open();
        }
    });
    
    // HOTKEY: Configurable shortcuts for power users
    this.addCommand({
        id: 'clippy-quick-tag',
        name: 'Quick AI tagging suggestions',
        hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 't' }],
        editorCallback: this.handleQuickTagging.bind(this)
    });
}
```

### Integration Points
```yaml
PLUGIN_MANIFEST:
  - file: manifest.json
  - pattern: Follow existing plugin metadata format
  - version: Use semantic versioning
  - dependencies: Declare Obsidian API version requirements

SETTINGS_STORAGE:
  - file: data.json  
  - pattern: Use Obsidian's built-in data persistence
  - encryption: Secure API key storage
  - validation: Runtime settings validation

COMMAND_PALETTE:
  - integration: Register all AI functions as Obsidian commands
  - pattern: Follow command naming conventions
  - hotkeys: Configurable keyboard shortcuts
  - context: Context-aware command availability

VAULT_COMPATIBILITY:
  - dataview: Preserve existing query functionality
  - templater: Respect template syntax and automation
  - css: Follow vault's styling and theme system
  - links: Maintain wikilink integrity and suggestions
```

## Validation Loop

### Level 1: Development Environment Setup
```bash
# CRITICAL: Obsidian plugin development setup
cd "/home/shuma/Documents/Obsidian-Homepage/Rainbell English/.obsidian/plugins"
git clone https://github.com/obsidianmd/obsidian-sample-plugin clippy-ai-assistant
cd clippy-ai-assistant

# Install dependencies and setup TypeScript compilation
npm install
npm run dev

# Expected: main.js generated successfully, no TypeScript errors
```

### Level 2: Plugin Loading & Integration
```bash
# Enable plugin in Obsidian settings
# Navigate to: Settings > Community plugins > Installed plugins
# Enable: "Clippy AI Assistant"

# Expected: Plugin loads without errors, settings tab appears
# Validate: No conflicts with existing plugins (dataview, templater, homepage)
```

### Level 3: AI Provider Testing
```typescript
// Test each AI provider connection
async function validateProviders() {
    // Test Ollama (local)
    const ollama = new OllamaClient({ baseUrl: 'http://localhost:11434' });
    assert(await ollama.isAvailable(), 'Ollama connection failed');
    
    // Test OpenAI (if API key provided)
    if (settings.providers.openai.apiKey) {
        const openai = new OpenAIClient(settings.providers.openai);
        assert(await openai.isAvailable(), 'OpenAI connection failed');
    }
    
    // Test provider switching
    const factory = new ProviderFactory();
    const provider = await factory.createProvider(settings);
    assert(provider !== null, 'No provider available');
}
```

### Level 4: Vault Integration Testing
```bash
# Test note enhancement without breaking existing content
# Create test note with complex dataview frontmatter
# Run AI enhancement command
# Validate: Original dataview queries still work, wikilinks preserved

# Test auto-tagging suggestions
# Select note with existing tags matching vault patterns
# Run auto-tag command
# Validate: Suggestions follow existing tag hierarchy and conventions

# Test with existing homepage dashboard
# Ensure dataviewjs queries still function
# Validate: No CSS conflicts, styling preserved
```

### Level 5: Security & Privacy Validation
```bash
# Validate secure credential storage
# Check: API keys encrypted in data.json
# Test: Plugin works offline with Ollama only
# Verify: No data sent to cloud without explicit user consent

# Test plugin disable/enable cycle
# Disable plugin in settings
# Restart Obsidian
# Enable plugin
# Expected: All settings preserved, no data loss
```

## Final Validation Checklist
- [ ] Plugin installs and loads without Obsidian errors
- [ ] All AI providers connect and respond appropriately
- [ ] Note enhancement preserves existing vault patterns
- [ ] Auto-tagging follows vault's tag hierarchy
- [ ] Command palette integration works seamlessly
- [ ] Settings interface is intuitive and follows Obsidian design
- [ ] No conflicts with existing plugins (dataview, templater, homepage)
- [ ] Existing dataviewjs queries continue to function
- [ ] Wikilinks and note relationships are preserved
- [ ] CSS styling follows vault's theme and style settings
- [ ] API credentials are stored securely
- [ ] Plugin gracefully handles AI provider failures
- [ ] All enhanced content follows markdown best practices
- [ ] Performance impact is minimal and non-blocking

---

## Anti-Patterns to Avoid
- ❌ Don't auto-modify notes without explicit user confirmation
- ❌ Don't break existing wikilinks or note relationships  
- ❌ Don't ignore vault's CSS classes and styling conventions
- ❌ Don't store API keys in plain text
- ❌ Don't block Obsidian UI with synchronous AI calls
- ❌ Don't override existing plugin functionality
- ❌ Don't send vault data to cloud without consent
- ❌ Don't create new organizational patterns that conflict with existing ones
- ❌ Don't assume internet connectivity (support offline/local mode)
- ❌ Don't ignore existing templater syntax in templates

## Confidence Rating: 9/10

**Why 9/10:**
- ✅ Comprehensive research of existing AI Obsidian plugins
- ✅ Deep understanding of vault structure and patterns  
- ✅ Clear implementation path following proven TypeScript patterns
- ✅ Extensive validation framework covering all integration points
- ✅ Security and privacy considerations addressed
- ✅ Gradual rollout approach (Phase 1 only) reduces risk
- ✅ Real examples and reference implementations identified

**Remaining 1% uncertainty:**
- Specific edge cases in dataview query interactions
- Performance optimization for large vaults (>10k notes)
- Advanced Obsidian API behaviors in specific environments

**Risk Mitigation:**
- Comprehensive testing with real vault data
- Gradual feature rollout with user feedback loops
- Fallback mechanisms for all external dependencies

[[CLIPPY|clippy (see CLIPPY)]]

[[CLIPPY|clippy (see CLIPPY)]]