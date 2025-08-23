/**
 * CLIPPY AI Assistant - Core Type Definitions
 * Following PRP specifications for data models and interfaces
 */

// ===== PLUGIN SETTINGS =====

export interface ClippySettings {
  version?: number; // Settings schema version for migrations
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
    intelligentLinksEnabled: boolean;
    moeSystemEnabled: boolean;
  };
  
  // MoE System Settings
  moe: {
    agents: {
      enablePersonalization: boolean;
      confidenceThreshold: number;
      maxAgentsPerRequest: number;
      enableFallbackAgent: boolean;
    };
    feedback: {
      showFeedbackButtons: boolean;
      enableLearning: boolean;
      retryAttempts: number;
    };
    health: {
      enablePeriodicChecks: boolean;
      checkIntervalMs: number;
      autoFixMinorIssues: boolean;
    };
    maxChatHistory: number;
    showInitNotification: boolean;
    enableFeedback: boolean;
  };
  vaultPatterns: {
    tagPrefix: string;
    dateFormat: string;
    templateFolder: string;
    suggestionConfidenceThreshold: number;
  };
  research: {
    searchEngine: {
      provider: 'searxng' | 'tavily' | 'brave' | 'duckduckgo' | 'serpapi' | 'serper';
      searxngUrl: string;
      tavilyApiKey: string;
      braveApiKey: string;
      serpApiKey: string;
      serperApiKey: string;
    };
    defaults: {
      maxResults: number;
      qualityThreshold: number;
      outputFolder: string;
      template: string;
      showThinkingTags: boolean;
      maxTokens: number; // Maximum tokens for AI responses in research generation
    };
    // Moved to global RAG section
    prompts: {
      wisdomExtraction: string;
      conceptExtraction: string;
      
      // Vault Agent System Prompts
      vaultAgent: string;
      
      // MoE Expert System Prompts
      fileOrganizationExpert: string;
      searchNavigationExpert: string;
      contentCreationExpert: string;
      vaultMaintenanceExpert: string;
      commandExecutionExpert: string;
      contextMemoryExpert: string;
    };
  };
  voice: {
    enabled: boolean;
    wakeWord: string;
    customWakeWords: string[];
    continuousMode: boolean;
    ttsEngine: 'piper' | 'openai' | 'elevenlabs';
    ttsVoice: string;
    elevenlabsApiKey?: string;
    openaiTts: {
      baseUrl: string;
      apiKey: string;
      model: string;
      voice: string;
      responseSplitting: 'none' | 'sentences' | 'paragraphs';
    };
    sttLanguage: string;
    audioDevices: {
      microphone: string;
      speaker: string;
    };
    permissions: {
      microphoneAccess: boolean;
      autoStart: boolean;
    };
    processing: {
      wakeWordSensitivity: number;
      noiseReduction: boolean;
      audioBufferSize: number;
    };
    whisper: {
      device: 'cpu' | 'cuda';
      modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
    };
    fallbacks: {
      useWebSpeechAPI: boolean;
      showTextWhenNoAudio: boolean;
    };
    visualizers: VoiceVisualizersConfig;
  };

  // ===== CENTRALIZED RAG SYSTEM =====
  rag: {
    embeddings: {
      provider: 'ollama' | 'openai' | 'simple';
      model: string;
      ollamaUrl: string;
      openaiApiKey: string;
      dimensions: number;
      maxTokens: number;
      enableCache: boolean;
      cacheSize: number;
      cacheTTL: number; // Cache time-to-live in milliseconds
    };
    chunking: {
      strategy: 'sentence' | 'semantic' | 'fixed' | 'hybrid';
      chunkSize: number;
      chunkOverlap: number;
      maxChunkSize: number;
      minChunkSize: number;
      respectSentences: boolean;
      respectParagraphs: boolean;
    };
    retrieval: {
      maxResults: number;
      minRelevanceScore: number;
      enableHybridSearch: boolean;
      enableReranking: boolean;
      rerankingModel: string;
      contextWindow: number;
      enableMetadataFiltering: boolean;
    };
    storage: {
      vectorDatabase: 'memory' | 'file' | 'external';
      persistPath: string;
      indexingBatchSize: number;
      enableCompression: boolean;
      enableBackup: boolean;
    };
    advanced: {
      enableSemanticSearch: boolean;
      enableKeywordSearch: boolean;
      hybridSearchWeight: number; // 0.0-1.0, weight of semantic vs keyword
      enableCitations: boolean;
      enableSourceTracking: boolean;
      maxContextLength: number;
      contextTruncationStrategy: 'start' | 'end' | 'middle' | 'smart';
    };
  };
}

// ===== AI PROVIDER ABSTRACTION =====

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(prompt: string, context?: string): Promise<string>;
  generateStreamingResponse?(prompt: string, context?: string): AsyncGenerator<string, void, unknown>;
  analyzeContent(content: string): Promise<ContentAnalysis>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  validateConfig(): { valid: boolean; errors: string[] };
  getCapabilities(): { generateResponse: boolean; analyzeContent: boolean; streaming: boolean; maxTokens?: number };
  getConfig(): any;
  updateConfig(config: any): void;
  cleanup(): void;
}

export interface ContentAnalysis {
  suggestedTags: string[];
  topics: string[];
  summary: string;
  relatedNotes: string[];
  formattingIssues: string[];
}

// ===== VAULT PATTERN ANALYSIS =====

export interface VaultPatterns {
  tagPatterns: TagPattern[];
  dateFormats: string[];
  cssClasses: string[];
  frontmatterSchemas: FrontmatterSchema[];
  wikilinkPatterns: WikilinkPattern[];
}

export interface TagPattern {
  pattern: string;
  frequency: number;
  categories: string[];
}

export interface FrontmatterSchema {
  field: string;
  type: 'string' | 'number' | 'date' | 'array' | 'boolean';
  frequency: number;
  examples: string[];
}

export interface WikilinkPattern {
  pattern: RegExp;
  displayFormat: string;
  frequency: number;
}

// ===== CONTENT PROCESSING =====

export interface FormattingIssue {
  type: 'heading' | 'list' | 'link' | 'whitespace' | 'frontmatter';
  line: number;
  description: string;
  suggestion: string;
}

export interface EnhancementSuggestion {
  type: 'format' | 'tag' | 'link' | 'structure';
  priority: 'low' | 'medium' | 'high';
  description: string;
  before: string;
  after: string;
}

export interface ProcessingResult {
  originalContent: string;
  enhancedContent: string;
  suggestions: EnhancementSuggestion[];
  preservedElements: PreservedElement[];
}

export interface PreservedElement {
  type: 'frontmatter' | 'wikilink' | 'template' | 'dataview' | 'comment';
  startIndex: number;
  endIndex: number;
  content: string;
}

// ===== VOICE ASSISTANT TYPES =====

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  conversationActive: boolean;
  wakeWordDetected: boolean;
  error: string | null;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  frameSize: number;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant';
  text: string;
  audioData?: ArrayBuffer;
  metadata?: {
    processingTime?: number;
    confidence?: number;
    source?: 'voice' | 'text';
  };
}

export interface ConversationContext {
  history: ConversationTurn[];
  currentTurn: ConversationTurn | null;
  metadata: {
    startTime: Date;
    turnCount: number;
    lastActivity: Date;
  };
}

export interface VoiceCommand {
  text: string;
  intent: string;
  confidence: number;
  parameters?: Record<string, any>;
  timestamp: Date;
}

// Voice Visualizer Configuration Interfaces
export interface VADVisualizerConfig {
  enabled: boolean;
  sensitivity: number; // 0-1
  size: 'small' | 'medium' | 'large';
  position: 'inline' | 'floating' | 'corner';
  showConfidence: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  colors: {
    silent: string;
    speech: string;
    noise: string;
  };
}

export interface TTSVisualizerConfig {
  enabled: boolean;
  spectrumBars: number; // 8-48
  height: number; // pixels
  showBorder: boolean;
  borderIntensity: number; // 0.1-2.0
  showGlow: boolean;
  glowThreshold: number; // 0-1
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  smoothing: number; // 0-1
  minDecibels: number;
  maxDecibels: number;
}

export interface VoiceVisualizersConfig {
  vad: VADVisualizerConfig;
  tts: TTSVisualizerConfig;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

// ===== UI COMPONENTS =====

export interface ModalConfig {
  title: string;
  content: string;
  showPreview: boolean;
  allowEdit: boolean;
}

export interface CommandConfig {
  id: string;
  name: string;
  hotkey?: { modifiers: string[]; key: string };
  icon?: string;
  callback: () => void;
}

// ===== API RESPONSES =====

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    tokens?: number;
    duration?: number;
  };
}

// ===== SECURITY & PRIVACY =====

export interface CredentialConfig {
  encrypted: boolean;
  lastUpdated: Date;
  testConnection: boolean;
}

export interface PrivacySettings {
  allowCloudProviders: boolean;
  logLevel: 'none' | 'errors' | 'info' | 'debug';
  shareAnalytics: boolean;
  localProcessingOnly: boolean;
}

// ===== DEFAULT SETTINGS =====

export const DEFAULT_SETTINGS: ClippySettings = {
  version: 3, // Current settings schema version (v3 includes maxTokens for research)
  aiProvider: 'ollama',
  providers: {
    ollama: {
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3.2',
      enabled: true,
    },
    openai: {
      apiKey: '',
      model: 'gpt-4',
      enabled: false,
    },
    anthropic: {
      apiKey: '',
      model: 'claude-3-sonnet-20240229',
      enabled: false,
    },
  },
  features: {
    autoTagging: true,
    noteFormatting: true,
    contentSuggestions: true,
    intelligentLinksEnabled: true,
    moeSystemEnabled: true,
  },
  
  // MoE System Default Settings
  moe: {
    agents: {
      enablePersonalization: true,
      confidenceThreshold: 0.7,
      maxAgentsPerRequest: 3,
      enableFallbackAgent: true,
    },
    feedback: {
      showFeedbackButtons: true,
      enableLearning: true,
      retryAttempts: 2,
    },
    health: {
      enablePeriodicChecks: true,
      checkIntervalMs: 24 * 60 * 60 * 1000, // Daily
      autoFixMinorIssues: false,
    },
    maxChatHistory: 100,
    showInitNotification: true,
    enableFeedback: true,
  },
  vaultPatterns: {
    tagPrefix: '#',
    dateFormat: 'YYYY-MM-DD',
    templateFolder: '40 - Obsidian/Templates',
    suggestionConfidenceThreshold: 0.7,
  },
  research: {
    searchEngine: {
      provider: 'searxng',
      searxngUrl: 'http://localhost:8088',
      tavilyApiKey: '',
      braveApiKey: '',
      serpApiKey: '',
      serperApiKey: '',
    },
    defaults: {
      maxResults: 10,
      qualityThreshold: 0.6,
      outputFolder: 'Generated Research Notes',
      template: 'research-standard',
      showThinkingTags: false,
      maxTokens: 0, // 0 = unlimited
    },
    // RAG settings moved to centralized rag section
    prompts: {
      wisdomExtraction: `You are a research assistant extracting comprehensive information about "{{searchTerm}}".

Please analyze all the following sources and extract the most important information:

{{allContent}}

Please extract and organize information into these categories:

1. **Key Definitions**: Clear, concise definitions of "{{searchTerm}}" and related terms
2. **Key Facts**: The most important factual information
3. **Uses & Applications**: How "{{searchTerm}}" is used or applied
4. **Warnings & Precautions**: Any safety concerns, side effects, or warnings
5. **Research Findings**: Scientific studies, evidence, or research results
6. **Related Concepts**: Connected ideas, similar topics, or related terms

Format your response with clear headings and bullet points for each section.`,
      conceptExtraction: `Based on the research findings about "{{searchTerm}}", extract and organize the key concepts:

**Content to analyze:**
{{content}}

**Instructions:**
1. Identify the 5 most important concepts related to {{searchTerm}}
2. For each concept, provide a brief definition and its relationship to {{searchTerm}}
3. Note any hierarchical relationships between concepts
4. Highlight any contradictory or debated aspects

**Format as:**
## Key Concepts
- **Concept Name**: Definition and relationship
- **Concept Name**: Definition and relationship
[etc.]

## Relationships
- Describe connections between concepts

## Important Notes
- Any warnings, contradictions, or areas of debate`,
      
      // Vault Agent System Prompts
      vaultAgent: `You are CLIPPY, an AI assistant for Obsidian vault management. You have access to powerful tools for managing notes, folders, and content.

AVAILABLE TOOLS:
{{toolsDescription}}

IMPORTANT: Always use <think> or <thinking> tags when you need to think through a problem, plan your approach, or reason about the user's request. This content will be hidden from the user by default but can be toggled visible.`,

      // MoE Expert System Prompts
      fileOrganizationExpert: `You are the FILE ORGANIZATION EXPERT. Your specialty is intelligent file placement, folder management, and maintaining consistent vault structure.

CORE RESPONSIBILITIES:
- Determine optimal locations for new files based on content type and context
- Maintain consistent folder hierarchies and naming conventions  
- Apply learned patterns from user behavior
- Create folders when needed following organizational principles

KEY DECISION FACTORS:
- Content type and purpose (daily notes, projects, references)
- Existing vault structure and learned patterns
- User's current working context
- Related file locations

EXECUTION PRINCIPLES:
- Always suggest the most logical location based on content
- Create intermediate folders if the structure demands it
- Never place files randomly in root - always find appropriate location`,

      searchNavigationExpert: `You are the SEARCH & NAVIGATION EXPERT. Your specialty is finding content and executing navigation commands.

CORE RESPONSIBILITIES:
- Perform intelligent searches across vault content
- Navigate to specific files and locations
- Execute search results automatically when intent is clear
- Understand search context and refine queries

SEARCH CAPABILITIES:
- Full-text content search
- Tag-based filtering
- Date and time-based queries
- Link relationship analysis
- Metadata and frontmatter search

EXECUTION PRINCIPLES:
- Rank results by relevance and recency
- Learn from user's selection patterns`,

      contentCreationExpert: `You are the CONTENT CREATION EXPERT. Your specialty is generating, structuring, and templating content.

CORE RESPONSIBILITIES:
- Create well-structured content using appropriate templates
- Apply consistent formatting and style
- Generate content that matches vault's existing patterns
- Adapt templates to specific use cases

CONTENT TYPES:
- Daily notes with consistent structure
- Project documentation
- Meeting notes
- Research notes
- Template generation

EXECUTION PRINCIPLES:
- Match existing vault patterns and style
- Use templates when available and appropriate
- If no specific template exists, create well-structured content
- Learn from existing note structures to maintain consistency`,

      vaultMaintenanceExpert: `You are the VAULT MAINTENANCE EXPERT. Your specialty is organizing, cleaning, and optimizing vault structure.

CORE RESPONSIBILITIES:
- Reorganize files and folders for better structure
- Identify and fix organizational issues
- Maintain vault health and cleanliness
- Optimize note relationships and links

MAINTENANCE TASKS:
- File and folder reorganization
- Duplicate detection and merging
- Broken link identification and repair
- Tag standardization
- Archive management

EXECUTION PRINCIPLES:
- Always backup before major changes
- Preserve important relationships between notes
- Always confirm destructive operations`,

      commandExecutionExpert: `You are the COMMAND EXECUTION EXPERT. Your specialty is translating user intents to specific Obsidian commands.

CORE RESPONSIBILITIES:
- Find and execute appropriate Obsidian commands
- Translate natural language requests to specific actions
- Handle UI and setting changes
- Execute complex command sequences

COMMAND CATEGORIES:
- File operations (create, rename, delete, move)
- View management (split, focus, navigate)
- Search and replace operations
- Plugin and setting management

EXECUTION PRINCIPLES:
- Match user intent to appropriate commands
- Always confirm the action was completed successfully`,

      contextMemoryExpert: `You are the CONTEXT MEMORY EXPERT. Your specialty is learning and applying user patterns and preferences.

CORE RESPONSIBILITIES:
- Remember successful file placement decisions
- Learn user naming and organization preferences
- Track frequently used locations and patterns
- Apply contextual knowledge to improve responses

LEARNING AREAS:
- File organization preferences
- Naming conventions
- Frequently accessed locations
- User workflow patterns
- Template usage patterns

EXECUTION PRINCIPLES:
- Build user preference profiles over time
- Apply learned patterns to new situations
- Maintain consistency with established patterns`
    },
  },
  voice: {
    enabled: false,
    wakeWord: 'hey clippy',
    customWakeWords: [],
    continuousMode: true,
    ttsEngine: 'piper', // Piper as default for high quality local TTS
    ttsVoice: 'en_US-lessac-medium',
    openaiTts: {
      baseUrl: 'http://localhost:4123/v1',
      apiKey: 'none',
      model: 'tts-1',
      voice: 'alloy',
      responseSplitting: 'paragraphs',
    },
    sttLanguage: 'en-US',
    audioDevices: {
      microphone: 'default',
      speaker: 'default',
    },
    permissions: {
      microphoneAccess: false,
      autoStart: false,
    },
    processing: {
      wakeWordSensitivity: 0.7,
      noiseReduction: true,
      audioBufferSize: 4096,
    },
    whisper: {
      device: 'cpu', // Default to CPU to avoid CUDA memory issues
      modelSize: 'base',
    },
    fallbacks: {
      useWebSpeechAPI: false, // Disabled since we're using local Whisper
      showTextWhenNoAudio: true,
    },
    visualizers: {
      vad: {
        enabled: true,
        sensitivity: 0.7, // VAD detection sensitivity (0-1)
        size: 'medium', // 'small' | 'medium' | 'large'
        position: 'inline', // 'inline' | 'floating' | 'corner'
        showConfidence: true, // Show confidence score
        animationSpeed: 'normal', // 'slow' | 'normal' | 'fast'
        colors: {
          silent: '#6b7280', // Gray for silent
          speech: '#10b981', // Green for speech detected  
          noise: '#f59e0b', // Amber for noise/uncertain
        },
      },
      tts: {
        enabled: true,
        spectrumBars: 24, // Number of frequency bars (8-48)
        height: 50, // Spectrum height in pixels
        showBorder: true, // Audio-reactive border pulsing
        borderIntensity: 1.0, // Border pulse intensity (0.1-2.0)
        showGlow: true, // Glow effect during loud speech
        glowThreshold: 0.7, // Volume threshold for glow (0-1)
        colors: {
          primary: 'auto', // 'auto' uses theme accent color
          secondary: 'auto', // 'auto' uses theme accent hover
          background: 'auto', // 'auto' uses theme background
        },
        smoothing: 0.85, // Frequency smoothing (0-1)
        minDecibels: -90, // Minimum audio level
        maxDecibels: -10, // Maximum audio level
      },
    },
  },

  // ===== CENTRALIZED RAG SYSTEM DEFAULTS =====
  rag: {
    embeddings: {
      provider: 'ollama',
      model: 'nomic-embed-text',
      ollamaUrl: 'http://localhost:11434',
      openaiApiKey: '',
      dimensions: 768,
      maxTokens: 2048,
      enableCache: true,
      cacheSize: 10000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    },
    chunking: {
      strategy: 'semantic',
      chunkSize: 1000,
      chunkOverlap: 100,
      maxChunkSize: 2000,
      minChunkSize: 200,
      respectSentences: true,
      respectParagraphs: true,
    },
    retrieval: {
      maxResults: 10,
      minRelevanceScore: 0.7,
      enableHybridSearch: true,
      enableReranking: false,
      rerankingModel: '',
      contextWindow: 8192,
      enableMetadataFiltering: true,
    },
    storage: {
      vectorDatabase: 'memory',
      persistPath: '.obsidian/plugins/clippy-ai-assistant/embeddings',
      indexingBatchSize: 100,
      enableCompression: false,
      enableBackup: true,
    },
    advanced: {
      enableSemanticSearch: true,
      enableKeywordSearch: true,
      hybridSearchWeight: 0.7, // 70% semantic, 30% keyword
      enableCitations: true,
      enableSourceTracking: true,
      maxContextLength: 6000,
      contextTruncationStrategy: 'smart',
    },
  },
};

// ===== CONSTANTS =====

export const PLUGIN_ID = 'clippy-ai-assistant';
export const PLUGIN_NAME = 'CLIPPY AI Assistant';

export const COMMANDS = {
  ENHANCE_NOTE: 'clippy-enhance-note',
  QUICK_TAG: 'clippy-quick-tag',
  SUMMARIZE: 'clippy-summarize',
  CHAT_WITH_AI: 'clippy-chat',
  ANALYZE_VAULT: 'clippy-analyze-vault',
  DISCOVER_BRIDGES: 'clippy-discover-bridges',
  SEMANTIC_SEARCH: 'clippy-semantic-search',
  INTELLIGENT_BACKLINKS: 'clippy-intelligent-backlinks',
} as const;

export const AI_MODELS = {
  OLLAMA: ['llama3.2', 'llama3.1', 'codellama', 'mistral'],
  OPENAI: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  ANTHROPIC: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
} as const;