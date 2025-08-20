## FEATURE:

**CLIPPY** - An AI-powered personal assistant plugin for Obsidian that provides intelligent note management, task automation, and knowledge enhancement capabilities.

### Core Capabilities:
- **Multi-Provider AI Integration**: Support for locally hosted Ollama, ChatGPT, Anthropic Claude, and other LLM providers via configurable API endpoints
- **Intelligent Note Enhancement**: Auto-format messy notes into clean markdown, auto-summarization, and intelligent tagging
- **Task Automation**: Calendar event creation, reminders, note cleanup, and workflow automation via customizable buttons
- **Voice Integration**: OpenWakeWord activation, speech-to-text input, and text-to-speech output for hands-free operation
- **Tool Integration**: MCP server support for extended capabilities and third-party service integration
- **Knowledge Management**: Auto-tagging based on content analysis, smart recommendations, and relationship mapping
- **Database Integration**: Support for PostgreSQL, Supabase, Neo4j, and Qdrant for advanced knowledge storage and retrieval

### Key Features:
1. **Smart Note Transformation**: Convert rough notes, voice memos, and unstructured text into properly formatted markdown following vault conventions
2. **Contextual AI Assistant**: Understands vault structure, dataview queries, templates, and CSS styling patterns
3. **Proactive Suggestions**: Recommend related notes, suggest tags, identify missing links, and propose organizational improvements
4. **Automation Hub**: One-click buttons for common tasks (summarize, format, tag, schedule, etc.)
5. **Voice-First Interface**: Wake word activation with natural language commands for note creation and management
6. **Intelligent Calendar Integration**: Parse natural language to create calendar events and reminders with proper metadata
7. **Advanced Search & Retrieval**: Vector-based semantic search with graph database relationships

## EXAMPLES:

### Plugin Architecture Examples:
- `examples/obsidian-plugin/` - TypeScript plugin structure following Obsidian API patterns
  - `main.ts` - Core plugin class with AI service integration
  - `settings.ts` - Configuration interface for AI providers and database connections
  - `commands.ts` - Command palette integration and hotkey bindings
  - `ui/` - Modal dialogs, settings panels, and interactive components
  - `ai/` - AI service abstraction layer supporting multiple providers
  - `tools/` - MCP tool implementations and automation functions

### AI Service Integration:
- `examples/ai-providers/` - Multi-provider AI integration patterns
  - `ollama-client.ts` - Local Ollama integration with model management
  - `openai-client.ts` - OpenAI/ChatGPT API implementation
  - `anthropic-client.ts` - Claude API integration with tool calling
  - `provider-factory.ts` - Dynamic provider selection and configuration

### Database Integration:
- `examples/database/` - Knowledge storage and retrieval systems
  - `postgres-adapter.ts` - PostgreSQL schema for note metadata and relationships
  - `supabase-client.ts` - Real-time sync and authentication patterns
  - `neo4j-graph.ts` - Graph database for note relationships and knowledge mapping
  - `qdrant-vector.ts` - Vector storage for semantic search and similarity

### Voice Interface:
- `examples/voice/` - Speech integration patterns
  - `wake-word.ts` - OpenWakeWord implementation for hands-free activation
  - `speech-recognition.ts` - Browser/system STT integration
  - `text-to-speech.ts` - Natural voice synthesis for AI responses

### Note Processing:
- `examples/processors/` - Content transformation and enhancement
  - `markdown-formatter.ts` - Clean formatting from messy input
  - `auto-tagger.ts` - Intelligent tag suggestion based on content analysis
  - `summarizer.ts` - Content summarization with different styles/lengths
  - `link-detector.ts` - Automatic wikilink creation and relationship mapping

## DOCUMENTATION:

### Obsidian Development:
- https://docs.obsidian.md/ - Official Obsidian Developer Documentation
- https://github.com/obsidianmd/obsidian-sample-plugin - Official plugin template and examples
- https://marcusolsson.github.io/obsidian-plugin-docs/ - Community TypeScript API documentation
- https://docs.obsidian.md/Reference/TypeScript+API/Plugin - Plugin API reference

### AI Integration:
- https://docs.anthropic.com/en/api/getting-started - Anthropic Claude API
- https://platform.openai.com/docs/api-reference - OpenAI API documentation
- https://ollama.ai/blog/openai-compatibility - Ollama OpenAI-compatible API
- https://modelcontextprotocol.io/docs - MCP server protocol documentation

### Database & Vector Storage:
- https://supabase.com/docs/reference/javascript - Supabase JavaScript client
- https://neo4j.com/docs/javascript-manual/current/ - Neo4j JavaScript driver
- https://qdrant.tech/documentation/ - Qdrant vector database
- https://www.postgresql.org/docs/current/index.html - PostgreSQL documentation

### Voice Integration:
- https://github.com/dscripka/openWakeWord - OpenWakeWord implementation
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API - Web Speech API
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis - Text-to-Speech API

### Vault-Specific Documentation:
- https://silentvoid13.github.io/Templater/ - Templater plugin for template automation
- https://blacksmithgu.github.io/obsidian-dataview/ - Dataview query language and API
- https://github.com/mgmeyers/obsidian-style-settings - Style settings for CSS customization
- https://github.com/Rainbell129/Obsidian-Homepage - Homepage dashboard patterns

## OTHER CONSIDERATIONS:

### Plugin Architecture & Performance:
- **TypeScript Development**: Use official Obsidian plugin template with proper TypeScript configurations
- **Modular Design**: Separate AI providers, database adapters, and UI components for maintainability
- **Async Operations**: All AI calls and database operations must be non-blocking to prevent UI freezing
- **Error Handling**: Robust fallback mechanisms for API failures, network issues, and model unavailability
- **Memory Management**: Efficient caching strategies for AI responses and database queries

### Security & Privacy:
- **API Key Management**: Secure storage of credentials with proper encryption
- **Local-First Options**: Prioritize Ollama and local models for privacy-conscious users
- **Data Isolation**: Vault data should never leave the local environment without explicit user consent
- **Permission System**: Granular controls for AI access to different note types and folders

### Vault Integration Standards:
- **Markdown Compliance**: All generated content must follow proper markdown syntax and vault conventions
- **Dataview Compatibility**: Generated metadata should work seamlessly with existing dataview queries
- **Template Integration**: Respect existing templater patterns and folder structures
- **CSS Styling**: Follow vault's CSS classes and style settings for consistent appearance
- **Link Preservation**: Maintain existing wikilinks and avoid breaking note relationships

### AI Behavior & Reliability:
- **Context Awareness**: AI should understand vault structure, naming conventions, and organizational patterns
- **Consistent Output**: Standardized formatting and metadata generation across all AI operations
- **User Preferences**: Respect user's writing style, tagging patterns, and organizational preferences
- **Progressive Enhancement**: Graceful degradation when AI services are unavailable

### Database & Search Considerations:
- **Incremental Indexing**: Efficient updates when notes are modified without full re-indexing
- **Relationship Mapping**: Automatic detection and storage of note relationships and concept connections
- **Search Performance**: Fast semantic search with caching for frequently accessed content
- **Data Portability**: Easy export/import of AI-generated metadata and relationships

### Voice Interface Requirements:
- **Wake Word Accuracy**: Reliable activation without false positives during normal computer use
- **Background Processing**: Continuous listening without impacting system performance
- **Command Recognition**: Natural language understanding for complex note operations
- **Audio Privacy**: Local processing options for sensitive voice data

### Automation & Workflow:
- **Command Palette Integration**: All AI functions accessible via standard Obsidian command interface
- **Hotkey Support**: Configurable keyboard shortcuts for frequent AI operations
- **Batch Operations**: Efficient processing of multiple notes for cleanup, tagging, and formatting
- **Workflow Customization**: User-defined automation rules and trigger conditions

### Development Methodology:

#### **90% Confidence Requirement**
- **No development begins without 90%+ confidence rating**
- Each feature requires comprehensive research and planning phase
- Integration analysis with existing vault structure mandatory
- User consultation and approval required before implementation

#### **Pre-Development Process**
1. **Discovery Phase**: Research existing vault patterns, plugins, and workflows
2. **Integration Analysis**: Map how new features interact with current systems
3. **Risk Assessment**: Identify potential conflicts with existing functionality
4. **User Validation**: Present detailed plans and get explicit approval
5. **Confidence Rating**: Rate understanding and implementation confidence (must be ≥90%)

#### **Vault Integration Standards**
- **Zero Breaking Changes**: New features must not disrupt existing workflows
- **Pattern Compliance**: Follow established vault conventions and organizational structure
- **Plugin Compatibility**: Ensure harmony with current plugin ecosystem
- **Data Preservation**: Protect existing notes, links, and metadata
- **Graceful Enhancement**: Add value without forcing workflow changes

### Development Priorities:
1. **Phase 1**: Core AI integration, basic note enhancement, and simple automation
2. **Phase 2**: Voice interface, advanced database integration, and MCP server support
3. **Phase 3**: Graph visualization, advanced analytics, and collaborative features
4. **Phase 4**: Mobile support, offline capabilities, and advanced AI reasoning

### Common Pitfalls to Avoid:
- **Over-automation**: Don't replace user decision-making; enhance and suggest instead
- **API Rate Limits**: Implement proper throttling and queue management for AI requests
- **Vault Corruption**: Never modify notes without proper backup and validation mechanisms
- **Performance Issues**: Avoid blocking the main thread with heavy AI or database operations
- **User Experience**: Maintain Obsidian's fast, responsive feel despite AI processing overhead