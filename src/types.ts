/**
 * CLIPPY AI Assistant - Core Type Definitions
 * Following PRP specifications for data models and interfaces
 */

// ===== PLUGIN SETTINGS =====

export interface ClippySettings {
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
    };
    prompts: {
      wisdomExtraction: string;
      conceptExtraction: string;
    };
  };
}

// ===== AI PROVIDER ABSTRACTION =====

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(prompt: string, context?: string): Promise<string>;
  analyzeContent(content: string): Promise<ContentAnalysis>;
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
  },
  vaultPatterns: {
    tagPrefix: '#',
    dateFormat: 'YYYY-MM-DD',
    templateFolder: '40 - Obsidian/Templates',
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
    },
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
- Any warnings, contradictions, or areas of debate`
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
} as const;

export const AI_MODELS = {
  OLLAMA: ['llama3.2', 'llama3.1', 'codellama', 'mistral'],
  OPENAI: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  ANTHROPIC: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
} as const;