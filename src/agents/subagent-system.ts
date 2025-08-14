/**
 * Subagent Architecture for Specialized Research Tasks
 * Each agent has a specific responsibility in the research pipeline
 */

import { AIProvider } from '../types';
import { RAGSystem, RAGContext } from '../rag/rag-architecture';

export interface SubagentConfig {
  name: string;
  role: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SubagentContext {
  task: string;
  input: any;
  ragContext?: RAGContext;
  previousResults?: Record<string, any>;
}

export interface SubagentResult {
  agentName: string;
  success: boolean;
  output: any;
  confidence: number;
  reasoning?: string;
  metadata?: Record<string, any>;
  executionTime: number;
}

/**
 * Base class for all specialized subagents
 */
export abstract class BaseSubagent {
  protected config: SubagentConfig;
  protected aiProvider: AIProvider;
  protected ragSystem?: RAGSystem;
  protected plugin?: any; // Plugin reference for settings

  constructor(config: SubagentConfig, aiProvider: AIProvider, ragSystem?: RAGSystem, plugin?: any) {
    this.config = config;
    this.aiProvider = aiProvider;
    this.ragSystem = ragSystem;
    this.plugin = plugin;
  }

  abstract execute(context: SubagentContext): Promise<SubagentResult>;

  /**
   * Generate AI response with RAG context
   */
  protected async generateResponse(prompt: string, context?: SubagentContext): Promise<string> {
    let fullPrompt = `${this.config.systemPrompt}\n\n`;
    
    if (context?.ragContext) {
      fullPrompt += `## Research Context\n${await this.formatRAGContext(context.ragContext)}\n\n`;
    }
    
    fullPrompt += `## Task\n${prompt}`;

    return await this.aiProvider.generateResponse(fullPrompt);
  }

  /**
   * Format RAG context for AI consumption
   */
  private async formatRAGContext(ragContext: RAGContext): Promise<string> {
    let formatted = `Query: ${ragContext.query}\n`;
    formatted += `Found ${ragContext.results.length} relevant sources:\n\n`;

    for (const result of ragContext.results) {
      formatted += `### ${result.document.metadata.title} (${result.document.metadata.sourceType})\n`;
      formatted += `Quality: ${Math.round(result.qualityScore * 100)}%, Relevance: ${Math.round(result.relevanceScore * 100)}%\n`;
      formatted += `${result.chunk?.content || result.document.content.slice(0, 300)}...\n\n`;
    }

    return formatted;
  }
}

/**
 * Content Parser Agent - Extracts and cleans content from web sources
 */
export class ContentParserAgent extends BaseSubagent {
  constructor(aiProvider: AIProvider, ragSystem?: RAGSystem, plugin?: any) {
    super({
      name: 'ContentParser',
      role: 'Content extraction and cleaning specialist',
      systemPrompt: `You are a content parsing expert. Your job is to:
1. Extract relevant information from web sources
2. Remove irrelevant content (ads, navigation, contact info, etc.)
3. Preserve important context and structure
4. Identify key facts, concepts, and data points
5. Maintain source attribution

Focus on factual content that answers the research question. Remove promotional language, unnecessary formatting, and website-specific elements.`,
      maxTokens: 2000,
      temperature: 0.1
    }, aiProvider, ragSystem, plugin);
  }

  async execute(context: SubagentContext): Promise<SubagentResult> {
    const startTime = Date.now();
    
    try {
      const { rawContent, url, title } = context.input;
      
      const prompt = `Parse and extract relevant information from this web content:

URL: ${url}
Title: ${title}

Raw Content:
${rawContent}

Extract only the relevant, factual content that relates to the research topic. Remove:
- Navigation elements
- Advertisements
- Contact information
- Website branding
- Promotional content
- Comments/social media elements

Preserve:
- Key facts and data
- Important explanations
- Relevant context
- Proper structure with headings

Return the cleaned content in markdown format.`;

      const response = await this.generateResponse(prompt, context);
      
      return {
        agentName: this.config.name,
        success: true,
        output: response,
        confidence: 0.9,
        reasoning: 'Successfully extracted and cleaned web content',
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        agentName: this.config.name,
        success: false,
        output: null,
        confidence: 0,
        reasoning: `Content parsing failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
}

/**
 * Quality Grader Agent - Assesses content quality using AI analysis
 */
export class QualityGraderAgent extends BaseSubagent {
  constructor(aiProvider: AIProvider, ragSystem?: RAGSystem, plugin?: any) {
    super({
      name: 'QualityGrader',
      role: 'Content quality assessment specialist',
      systemPrompt: `You are a quality assessment expert. Evaluate content based on:
1. Credibility - Source authority, citations, expertise indicators
2. Accuracy - Factual correctness, consistency, evidence quality
3. Relevance - How well content addresses the research topic
4. Completeness - Depth of coverage, comprehensiveness
5. Freshness - Recency and currency of information

Provide scores from 0.0 to 1.0 for each dimension and overall quality.`,
      maxTokens: 1000,
      temperature: 0.2
    }, aiProvider, ragSystem, plugin);
  }

  async execute(context: SubagentContext): Promise<SubagentResult> {
    const startTime = Date.now();
    
    try {
      const { content, source, searchTopic } = context.input;
      
      const prompt = `Grade the quality of this content for research on "${searchTopic}":

Source: ${source.url || source.title}
Content Type: ${source.type}

Content:
${content}

Provide quality scores (0.0-1.0) for:
1. Credibility
2. Accuracy  
3. Relevance
4. Completeness
5. Freshness

Format your response as:
Credibility: X.X - [reasoning]
Accuracy: X.X - [reasoning]
Relevance: X.X - [reasoning] 
Completeness: X.X - [reasoning]
Freshness: X.X - [reasoning]
Overall: X.X - [summary reasoning]`;

      const response = await this.generateResponse(prompt, context);
      
      // Parse the response to extract scores
      const scores = this.parseQualityScores(response);
      
      return {
        agentName: this.config.name,
        success: true,
        output: scores,
        confidence: 0.85,
        reasoning: 'Quality assessment completed using AI analysis',
        metadata: { rawResponse: response },
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        agentName: this.config.name,
        success: false,
        output: null,
        confidence: 0,
        reasoning: `Quality grading failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private parseQualityScores(response: string): Record<string, number> {
    const scores: Record<string, number> = {};
    const lines = response.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(Credibility|Accuracy|Relevance|Completeness|Freshness|Overall):\s*(\d+\.?\d*)/i);
      if (match) {
        const dimension = match[1].toLowerCase();
        const score = parseFloat(match[2]);
        if (!isNaN(score)) {
          scores[dimension] = Math.min(Math.max(score, 0), 1);
        }
      }
    }
    
    return scores;
  }
}

/**
 * Frontmatter Extractor Agent - Generates dynamic frontmatter
 */
export class FrontmatterExtractorAgent extends BaseSubagent {
  constructor(aiProvider: AIProvider, ragSystem?: RAGSystem, plugin?: any) {
    super({
      name: 'FrontmatterExtractor',
      role: 'Dynamic frontmatter generation specialist',
      systemPrompt: `You are a frontmatter expert. Extract and generate appropriate frontmatter based on:
1. Template requirements and structure
2. Content analysis of the research note
3. RAG context from vault and web sources
4. Domain-specific conventions (herbs, manga, academic, etc.)

Generate accurate, contextual metadata that follows the template's expectations.`,
      maxTokens: 800,
      temperature: 0.3
    }, aiProvider, ragSystem, plugin);
  }

  async execute(context: SubagentContext): Promise<SubagentResult> {
    const startTime = Date.now();
    
    try {
      const { templateFrontmatter, noteContent, topic } = context.input;
      
      const prompt = `Generate frontmatter for a research note on "${topic}".

Template frontmatter structure:
${templateFrontmatter}

Note content:
${noteContent}

Analyze the template structure and generate appropriate values for each frontmatter field.
Use RAG context to fill in missing information.
Return only the frontmatter in YAML format, properly formatted.`;

      const response = await this.generateResponse(prompt, context);
      
      // Clean the response to extract just the YAML frontmatter
      const cleanedFrontmatter = this.extractYAMLFrontmatter(response);
      
      return {
        agentName: this.config.name,
        success: true,
        output: cleanedFrontmatter,
        confidence: 0.8,
        reasoning: 'Generated contextual frontmatter based on template and content analysis',
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        agentName: this.config.name,
        success: false,
        output: null,
        confidence: 0,
        reasoning: `Frontmatter extraction failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private extractYAMLFrontmatter(response: string): string {
    // Remove any surrounding text and extract YAML
    const yamlMatch = response.match(/```ya?ml\n([\s\S]*?)\n```/i);
    if (yamlMatch) {
      return yamlMatch[1];
    }
    
    // If no code block, look for frontmatter delimiters
    const frontmatterMatch = response.match(/---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      return frontmatterMatch[1];
    }
    
    // Fallback: assume the entire response is YAML
    return response.trim();
  }
}

/**
 * Section Specialist Agent - Fills specific template sections
 */
export class SectionSpecialistAgent extends BaseSubagent {
  constructor(aiProvider: AIProvider, ragSystem?: RAGSystem, plugin?: any) {
    super({
      name: 'SectionSpecialist',
      role: 'Template section content specialist',
      systemPrompt: `You are a research writing specialist. Generate high-quality content for specific sections of research notes.
Focus on:
1. Accuracy and factual content
2. Proper structure and formatting
3. Integration of sources and evidence
4. Clear, informative writing
5. Appropriate depth for the section type

Always use RAG context to support your responses with evidence.`,
      maxTokens: 1500,
      temperature: 0.4
    }, aiProvider, ragSystem, plugin);
  }

  async execute(context: SubagentContext): Promise<SubagentResult> {
    const startTime = Date.now();
    
    try {
      const { sectionName, sectionContext, topic, template } = context.input;
      
      const prompt = `Write content for the "${sectionName}" section of a research note on "${topic}".

Section context from template:
${sectionContext}

Requirements:
- Use information from the provided RAG context
- Write clear, informative content appropriate for this section
- Maintain academic/research tone
- Include relevant evidence and sources
- Format using markdown
- Do not include <thinking> tags in output

Generate only the section content, no additional explanation.`;

      const response = await this.generateResponse(prompt, context);
      
      // Remove any <thinking> tags from the response
      const cleanedResponse = this.removeThinkingTags(response);
      
      return {
        agentName: this.config.name,
        success: true,
        output: cleanedResponse,
        confidence: 0.9,
        reasoning: `Generated content for ${sectionName} section`,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        agentName: this.config.name,
        success: false,
        output: null,
        confidence: 0,
        reasoning: `Section generation failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private removeThinkingTags(content: string): string {
    // Check if user wants to show thinking tags
    const showThinkingTags = this.plugin?.settings?.research?.defaults?.showThinkingTags || false;
    
    if (showThinkingTags) {
      // Keep thinking tags but format them nicely
      return content
        .replace(/<thinking>/gi, '\n\n**🤔 AI Thinking Process:**\n> ')
        .replace(/<\/thinking>/gi, '\n\n')
        .replace(/\n\n+/g, '\n\n')
        .trim();
    } else {
      // Remove thinking tags completely
      return content
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/\n\n+/g, '\n\n')
        .trim();
    }
  }
}

/**
 * Subagent Coordinator - Orchestrates all subagents
 */
export class SubagentCoordinator {
  private agents: Map<string, BaseSubagent> = new Map();
  private aiProvider: AIProvider;
  private ragSystem?: RAGSystem;
  private plugin?: any; // Plugin reference for settings

  constructor(aiProvider: AIProvider, ragSystem?: RAGSystem, plugin?: any) {
    this.aiProvider = aiProvider;
    this.ragSystem = ragSystem;
    this.plugin = plugin;
    this.initializeAgents();
  }

  /**
   * Initialize all subagents
   */
  private initializeAgents(): void {
    this.agents.set('contentParser', new ContentParserAgent(this.aiProvider, this.ragSystem, this.plugin));
    this.agents.set('qualityGrader', new QualityGraderAgent(this.aiProvider, this.ragSystem, this.plugin));
    this.agents.set('frontmatterExtractor', new FrontmatterExtractorAgent(this.aiProvider, this.ragSystem, this.plugin));
    this.agents.set('sectionSpecialist', new SectionSpecialistAgent(this.aiProvider, this.ragSystem, this.plugin));
  }

  /**
   * Execute a specific agent task
   */
  async executeAgent(agentName: string, context: SubagentContext): Promise<SubagentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }

    return await agent.execute(context);
  }

  /**
   * Execute multiple agents in parallel
   */
  async executeParallel(tasks: Array<{ agent: string; context: SubagentContext }>): Promise<SubagentResult[]> {
    const promises = tasks.map(task => this.executeAgent(task.agent, task.context));
    return await Promise.all(promises);
  }

  /**
   * Execute agents in sequence with context passing
   */
  async executeSequence(
    tasks: Array<{ agent: string; context: SubagentContext }>,
    contextPassing: boolean = true
  ): Promise<SubagentResult[]> {
    const results: SubagentResult[] = [];
    let accumulatedContext: Record<string, any> = {};

    for (const task of tasks) {
      if (contextPassing && results.length > 0) {
        task.context.previousResults = accumulatedContext;
      }

      const result = await this.executeAgent(task.agent, task.context);
      results.push(result);

      if (contextPassing && result.success) {
        accumulatedContext[result.agentName] = result.output;
      }
    }

    return results;
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agent performance statistics
   */
  getAgentStats(): Record<string, any> {
    // This could track execution times, success rates, etc.
    return {
      totalAgents: this.agents.size,
      availableAgents: this.getAvailableAgents()
    };
  }
}