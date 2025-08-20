/**
 * MoE Orchestrator for Clippy Vault Agent
 * Provides specialized expert routing and system prompts for vault operations
 */

import { App, TFile, TFolder } from 'obsidian';
import { ClippySettings } from '../types';
import { AgentContext } from './vault-agent';

export interface MoEExpert {
  name: string;
  specialties: string[];
  systemPrompt: string;
  confidence: number;
}

export interface MoEResponse {
  expert: string;
  systemPrompt: string;
  executionPlan: ExecutionStep[];
  confidence: number;
}

export interface ExecutionStep {
  action: string;
  tool: string;
  parameters: any;
  description: string;
}

export interface VaultKnowledge {
  folderPatterns: Map<string, string[]>; // content type -> preferred folders
  namingConventions: Map<string, string>; // file type -> naming pattern
  templateMappings: Map<string, string>; // content type -> template path
  userPreferences: Map<string, any>; // learned user patterns
}

export class VaultMoEOrchestrator {
  private app: App;
  private settings: ClippySettings;
  private experts: MoEExpert[] = [];
  private knowledge: VaultKnowledge;

  constructor(app: App, settings: ClippySettings) {
    this.app = app;
    this.settings = settings;
    this.knowledge = {
      folderPatterns: new Map(),
      namingConventions: new Map(),
      templateMappings: new Map(),
      userPreferences: new Map()
    };
    
    this.initializeExperts();
    this.learnVaultPatterns();
  }

  /**
   * Route user request to appropriate expert and generate specialized response
   */
  async routeRequest(message: string, context: AgentContext): Promise<MoEResponse> {
    const intent = await this.analyzeIntent(message);
    const expert = this.selectExpert(intent, message);
    const executionPlan = this.createExecutionPlan(intent, message, context);
    
    const systemPrompt = this.generateExpertSystemPrompt(expert, context, executionPlan);
    
    return {
      expert: expert.name,
      systemPrompt,
      executionPlan,
      confidence: expert.confidence
    };
  }

  private initializeExperts(): void {
    this.experts = [
      {
        name: 'file_organization_expert',
        specialties: ['create note', 'move file', 'organize', 'folder structure', 'file placement'],
        systemPrompt: this.getFileOrganizationPrompt(),
        confidence: 0.0
      },
      {
        name: 'search_navigation_expert', 
        specialties: ['find', 'search', 'locate', 'navigate', 'open', 'switch to'],
        systemPrompt: this.getSearchNavigationPrompt(),
        confidence: 0.0
      },
      {
        name: 'content_creation_expert',
        specialties: ['write', 'create content', 'template', 'generate', 'draft', 'compose'],
        systemPrompt: this.getContentCreationPrompt(),
        confidence: 0.0
      },
      {
        name: 'vault_maintenance_expert',
        specialties: ['clean', 'organize vault', 'fix', 'maintain', 'health', 'optimize'],
        systemPrompt: this.getVaultMaintenancePrompt(),
        confidence: 0.0
      },
      {
        name: 'command_execution_expert',
        specialties: ['toggle', 'enable', 'disable', 'setting', 'command', 'execute'],
        systemPrompt: this.getCommandExecutionPrompt(),
        confidence: 0.0
      },
      {
        name: 'context_memory_expert',
        specialties: ['remember', 'recall', 'pattern', 'preference', 'history', 'learn'],
        systemPrompt: this.getContextMemoryPrompt(),
        confidence: 0.0
      }
    ];
  }

  private async analyzeIntent(message: string): Promise<{
    primaryAction: string;
    contentType: string;
    complexity: 'simple' | 'medium' | 'complex';
    requiresPlanning: boolean;
  }> {
    const lowerMessage = message.toLowerCase();
    
    let primaryAction = 'unknown';
    let contentType = 'generic';
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    let requiresPlanning = false;

    // Analyze primary action
    if (lowerMessage.includes('create') || lowerMessage.includes('new') || lowerMessage.includes('make')) {
      primaryAction = 'create';
      complexity = 'medium';
    } else if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('locate')) {
      primaryAction = 'search';
    } else if (lowerMessage.includes('organize') || lowerMessage.includes('move') || lowerMessage.includes('restructure')) {
      primaryAction = 'organize';
      complexity = 'complex';
      requiresPlanning = true;
    } else if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      primaryAction = 'delete';
      complexity = 'medium';
    } else if (lowerMessage.includes('toggle') || lowerMessage.includes('enable') || lowerMessage.includes('disable')) {
      primaryAction = 'command';
    }

    // Analyze content type
    if (lowerMessage.includes('note') || lowerMessage.includes('document')) {
      contentType = 'note';
    } else if (lowerMessage.includes('folder') || lowerMessage.includes('directory')) {
      contentType = 'folder';
    } else if (lowerMessage.includes('project')) {
      contentType = 'project';
    } else if (lowerMessage.includes('daily') || lowerMessage.includes('journal')) {
      contentType = 'daily';
    } else if (lowerMessage.includes('template')) {
      contentType = 'template';
    }

    // Check for complexity indicators
    if (lowerMessage.includes(' and ') || lowerMessage.includes(' then ') || lowerMessage.includes(' also ')) {
      complexity = 'complex';
      requiresPlanning = true;
    }

    return { primaryAction, contentType, complexity, requiresPlanning };
  }

  private selectExpert(intent: any, message: string): MoEExpert {
    const lowerMessage = message.toLowerCase();
    
    // Calculate confidence scores for each expert
    for (const expert of this.experts) {
      expert.confidence = 0;
      
      // Check specialty keywords
      for (const specialty of expert.specialties) {
        if (lowerMessage.includes(specialty)) {
          expert.confidence += 0.3;
        }
      }
      
      // Boost confidence based on intent
      if (intent.primaryAction === 'create' && expert.name === 'file_organization_expert') {
        expert.confidence += 0.5;
      } else if (intent.primaryAction === 'search' && expert.name === 'search_navigation_expert') {
        expert.confidence += 0.5;
      } else if (intent.primaryAction === 'organize' && expert.name === 'vault_maintenance_expert') {
        expert.confidence += 0.4;
      } else if (intent.primaryAction === 'command' && expert.name === 'command_execution_expert') {
        expert.confidence += 0.5;
      }
      
      // Consider content creation needs
      if ((lowerMessage.includes('write') || lowerMessage.includes('content')) && expert.name === 'content_creation_expert') {
        expert.confidence += 0.4;
      }
    }
    
    // Return expert with highest confidence, fallback to file organization
    const bestExpert = this.experts.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );
    
    return bestExpert.confidence > 0.3 ? bestExpert : this.experts[0];
  }

  private createExecutionPlan(intent: any, message: string, context: AgentContext): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    if (intent.primaryAction === 'create') {
      // Step 1: Determine appropriate location
      steps.push({
        action: 'determine_location',
        tool: 'analyze_content',
        parameters: { content_type: intent.contentType },
        description: 'Analyze content to determine optimal folder placement'
      });
      
      // Step 2: Create the file
      steps.push({
        action: 'create_file',
        tool: 'create_note',
        parameters: { use_template: intent.contentType !== 'generic' },
        description: 'Create the note in the determined location'
      });
      
      // Step 3: Open for editing if requested
      if (message.toLowerCase().includes('open') || message.toLowerCase().includes('edit')) {
        steps.push({
          action: 'open_file',
          tool: 'open_note',
          parameters: {},
          description: 'Open the newly created note for editing'
        });
      }
    } else if (intent.primaryAction === 'search') {
      // Step 1: Perform search
      steps.push({
        action: 'search',
        tool: 'search_notes',
        parameters: { execute_if_single: true },
        description: 'Search for matching notes'
      });
      
      // Step 2: Execute action if found
      if (message.toLowerCase().includes('open') || message.toLowerCase().includes('go to')) {
        steps.push({
          action: 'open_result',
          tool: 'open_note',
          parameters: { auto_select_best_match: true },
          description: 'Open the best matching note'
        });
      }
    } else if (intent.primaryAction === 'organize') {
      // Multi-step organization plan
      steps.push({
        action: 'analyze_vault',
        tool: 'analyze_vault_structure',
        parameters: {},
        description: 'Analyze current vault organization'
      });
      
      steps.push({
        action: 'create_plan',
        tool: 'create_organization_plan',
        parameters: {},
        description: 'Create reorganization plan'
      });
      
      steps.push({
        action: 'execute_moves',
        tool: 'batch_move_files',
        parameters: { confirm_before_execution: true },
        description: 'Execute the reorganization plan'
      });
    }
    
    return steps;
  }

  private generateExpertSystemPrompt(expert: MoEExpert, context: AgentContext, plan: ExecutionStep[]): string {
    const vaultStats = this.getVaultStats();
    const folderStructure = this.getFolderStructureString();
    const executionPlanString = plan.map(step => 
      `- ${step.description} (${step.tool})`
    ).join('\n');

    return `${expert.systemPrompt}

CURRENT VAULT CONTEXT:
- Total notes: ${vaultStats.noteCount}
- Folder structure: ${folderStructure}
- Current directory: ${context.workingDirectory || 'root'}
${context.currentNote ? `- Current note: ${context.currentNote.name}` : ''}

LEARNED PATTERNS:
${this.getLearnedPatternsString()}

EXECUTION PLAN:
${executionPlanString}

CRITICAL INSTRUCTIONS:
1. ALWAYS complete the full execution plan - don't stop at partial completion
2. Use consistent folder placement based on learned patterns
3. When creating files, use appropriate templates and naming conventions
4. For searches, if you find matches, EXECUTE the most likely intended action
5. Chain tool calls to complete complex tasks in one response
6. Remember successful patterns for future requests

TOOL EXECUTION CHAIN:
Execute tools in sequence following the plan. Each tool result should inform the next step.`;
  }

  private getFileOrganizationPrompt(): string {
    return this.settings.research.prompts.fileOrganizationExpert;
  }

  private getSearchNavigationPrompt(): string {
    return this.settings.research.prompts.searchNavigationExpert;
  }

  private getContentCreationPrompt(): string {
    return this.settings.research.prompts.contentCreationExpert;
  }

  private getVaultMaintenancePrompt(): string {
    return this.settings.research.prompts.vaultMaintenanceExpert;
  }

  private getCommandExecutionPrompt(): string {
    return this.settings.research.prompts.commandExecutionExpert;
  }

  private getContextMemoryPrompt(): string {
    return this.settings.research.prompts.contextMemoryExpert;
  }

  private learnVaultPatterns(): void {
    // Analyze existing vault structure to learn patterns
    const files = this.app.vault.getMarkdownFiles();
    
    // Learn folder patterns
    for (const file of files) {
      const folder = file.parent?.path || 'root';
      const fileName = file.basename.toLowerCase();
      
      // Detect content types based on naming patterns
      if (fileName.includes('daily') || fileName.match(/\d{4}-\d{2}-\d{2}/)) {
        this.addFolderPattern('daily', folder);
      } else if (fileName.includes('meeting') || fileName.includes('standup')) {
        this.addFolderPattern('meeting', folder);
      } else if (fileName.includes('project')) {
        this.addFolderPattern('project', folder);
      } else if (fileName.includes('template')) {
        this.addFolderPattern('template', folder);
      }
    }

    // Learn naming conventions
    this.learnNamingConventions(files);
  }

  private addFolderPattern(contentType: string, folder: string): void {
    if (!this.knowledge.folderPatterns.has(contentType)) {
      this.knowledge.folderPatterns.set(contentType, []);
    }
    const patterns = this.knowledge.folderPatterns.get(contentType)!;
    if (!patterns.includes(folder)) {
      patterns.push(folder);
    }
  }

  private learnNamingConventions(files: TFile[]): void {
    // Analyze file naming patterns
    const dailyPattern = files.find(f => f.basename.match(/\d{4}-\d{2}-\d{2}/));
    if (dailyPattern) {
      this.knowledge.namingConventions.set('daily', 'YYYY-MM-DD');
    }

    // More patterns can be added here
  }

  private getVaultStats() {
    const files = this.app.vault.getMarkdownFiles();
    return {
      noteCount: files.length,
      folderCount: this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder).length
    };
  }

  private getFolderStructureString(): string {
    const folders = this.app.vault.getAllLoadedFiles()
      .filter(f => f instanceof TFolder)
      .map(f => f.path)
      .slice(0, 10); // Limit for prompt length
    
    return folders.length > 0 ? folders.join(', ') : 'root only';
  }

  private getLearnedPatternsString(): string {
    const patterns: string[] = [];
    
    for (const [type, folders] of this.knowledge.folderPatterns.entries()) {
      if (folders.length > 0) {
        patterns.push(`${type} files → ${folders[0]} folder`);
      }
    }
    
    return patterns.length > 0 ? patterns.join('\n') : 'No patterns learned yet';
  }

  /**
   * Learn from successful actions to improve future decisions
   */
  recordSuccessfulAction(action: string, parameters: any, result: string): void {
    // Store successful patterns for future use
    if (action === 'create_note' && parameters.folder) {
      this.addFolderPattern(parameters.contentType || 'generic', parameters.folder);
    }
  }

  /**
   * Get the best folder for a given content type based on learned patterns
   */
  getBestFolderForContent(contentType: string, fallback: string = 'root'): string {
    const patterns = this.knowledge.folderPatterns.get(contentType);
    return patterns && patterns.length > 0 ? patterns[0] : fallback;
  }
}