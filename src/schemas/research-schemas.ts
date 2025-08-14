/**
 * Zod validation schemas for research system
 */
import { z } from 'zod';

// Core data validation schemas
export const RAGDocumentSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  metadata: z.object({
    title: z.string().min(1),
    source: z.string().min(1),
    sourceType: z.enum(['web', 'vault', 'pdf', 'document']),
    url: z.string().url().optional(),
    qualityScore: z.number().min(0).max(1),
    relevanceScore: z.number().min(0).max(1),
    lastUpdated: z.date().optional(),
    extractedAt: z.date()
  })
});

export const RAGChunkSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  parentDocumentId: z.string().min(1)
});

export const RAGQuerySchema = z.object({
  text: z.string().min(1),
  maxResults: z.number().min(1).max(50).default(10),
  minRelevance: z.number().min(0).max(1).default(0.3),
  sourceTypes: z.array(z.enum(['web', 'vault', 'pdf', 'document'])).optional(),
  timeRange: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional()
});

export const RAGResultSchema = z.object({
  relevanceScore: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(1),
  combinedScore: z.number().min(0).max(1),
  reason: z.string().min(1)
});

// Agent validation schemas
export const SubagentContextSchema = z.object({
  task: z.string().min(1),
  input: z.any(),
  ragContext: z.object({
    query: z.string(),
    results: z.array(z.any()),
    totalDocuments: z.number().min(0),
    searchTime: z.number().min(0),
    qualityDistribution: z.object({
      high: z.number().min(0),
      medium: z.number().min(0),
      low: z.number().min(0)
    })
  }).optional(),
  previousResults: z.record(z.any()).optional()
});

export const SubagentResultSchema = z.object({
  agentName: z.string().min(1),
  success: z.boolean(),
  output: z.any(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  executionTime: z.number().min(0)
});

// Research source validation
export const ResearchSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  url: z.string().url().optional(),
  type: z.enum(['web', 'vault', 'pdf', 'document', 'note']),
  lastUpdated: z.date().optional(),
  qualityScore: z.number().min(0).max(1).optional()
});

// Quality metrics validation
export const QualityMetricsSchema = z.object({
  credibilityScore: z.number().min(0).max(1),
  relevanceScore: z.number().min(0).max(1),
  freshnessScore: z.number().min(0).max(1),
  completenessScore: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1)
});

// Settings validation schemas
export const SearchEngineConfigSchema = z.object({
  engine: z.enum(['searxng', 'tavily', 'brave']),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1).optional(),
  enabled: z.boolean().default(true),
  maxResults: z.number().min(1).max(50).default(10),
  timeout: z.number().min(1000).max(30000).default(10000)
});

export const AIProviderConfigSchema = z.object({
  provider: z.enum(['ollama', 'openai', 'anthropic']),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1),
  enabled: z.boolean().default(true),
  maxTokens: z.number().min(100).max(8000).default(2000),
  temperature: z.number().min(0).max(2).default(0.7)
});

// Template and frontmatter validation
export const TemplateStructureSchema = z.object({
  frontmatter: z.record(z.any()).optional(),
  sections: z.array(z.object({
    name: z.string().min(1),
    content: z.string(),
    required: z.boolean().default(false)
  })),
  mandatorySections: z.array(z.string()).default(['Research Status', 'Vault References', 'Web Search Sources'])
});

export const ChecklistItemSchema = z.object({
  name: z.string().min(1),
  id: z.string().min(1),
  completed: z.boolean(),
  researchNoteFile: z.any().optional() // TFile type
});

// Web search result validation
export const WebSearchResultSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  content: z.string(),
  snippet: z.string().optional(),
  publishedDate: z.date().optional(),
  source: z.string().optional(),
  score: z.number().min(0).max(1).optional()
});

// Wisdom extraction validation (matches existing ExtractedWisdom interface)
export const ExtractedWisdomSchema = z.object({
  keyFacts: z.array(z.string()),
  definitions: z.array(z.string()),
  uses: z.array(z.string()),
  warnings: z.array(z.string()),
  researchFindings: z.array(z.string()),
  relatedConcepts: z.array(z.string()),
  sources: z.array(z.string())
});

// Type inference for TypeScript
export type RAGDocument = z.infer<typeof RAGDocumentSchema>;
export type RAGChunk = z.infer<typeof RAGChunkSchema>;
export type RAGQuery = z.infer<typeof RAGQuerySchema>;
export type RAGResult = z.infer<typeof RAGResultSchema>;
export type SubagentContext = z.infer<typeof SubagentContextSchema>;
export type SubagentResult = z.infer<typeof SubagentResultSchema>;
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;
export type SearchEngineConfig = z.infer<typeof SearchEngineConfigSchema>;
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;
export type TemplateStructure = z.infer<typeof TemplateStructureSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;
export type ExtractedWisdom = z.infer<typeof ExtractedWisdomSchema>;

// Validation helper functions
export class ValidationHelper {
  /**
   * Safely parse and validate data with Zod schema
   */
  static safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  }

  /**
   * Validate and throw on error
   */
  static parse<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`${context ? context + ': ' : ''}${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Validate array of items
   */
  static parseArray<T>(schema: z.ZodSchema<T>, data: unknown[], context?: string): T[] {
    return data.map((item, index) => {
      try {
        return schema.parse(item);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          throw new Error(`${context ? context + ' ' : ''}item ${index}: ${errorMessage}`);
        }
        throw error;
      }
    });
  }

  /**
   * Create partial schema for updates
   */
  static createUpdateSchema<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>): z.ZodObject<{
    [K in keyof T]: z.ZodOptional<T[K]>;
  }> {
    return baseSchema.partial();
  }
}

// Schema registry for dynamic validation
export class SchemaRegistry {
  private static schemas = new Map<string, z.ZodSchema<any>>();

  static register(name: string, schema: z.ZodSchema<any>): void {
    this.schemas.set(name, schema);
  }

  static get(name: string): z.ZodSchema<any> | undefined {
    return this.schemas.get(name);
  }

  static validate(schemaName: string, data: unknown): any {
    const schema = this.get(schemaName);
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }
    return schema.parse(data);
  }

  static safeValidate(schemaName: string, data: unknown): { success: boolean; data?: any; errors?: string[] } {
    const schema = this.get(schemaName);
    if (!schema) {
      return { success: false, errors: [`Schema '${schemaName}' not found`] };
    }
    return ValidationHelper.safeParse(schema, data);
  }
}

// Initialize schema registry
SchemaRegistry.register('RAGDocument', RAGDocumentSchema);
SchemaRegistry.register('RAGQuery', RAGQuerySchema);
SchemaRegistry.register('SubagentContext', SubagentContextSchema);
SchemaRegistry.register('SubagentResult', SubagentResultSchema);
SchemaRegistry.register('ResearchSource', ResearchSourceSchema);
SchemaRegistry.register('QualityMetrics', QualityMetricsSchema);
SchemaRegistry.register('SearchEngineConfig', SearchEngineConfigSchema);
SchemaRegistry.register('AIProviderConfig', AIProviderConfigSchema);
SchemaRegistry.register('ChecklistItem', ChecklistItemSchema);
SchemaRegistry.register('WebSearchResult', WebSearchResultSchema);
SchemaRegistry.register('ExtractedWisdom', ExtractedWisdomSchema);