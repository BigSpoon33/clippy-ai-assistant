/**
 * Unified Research Project System
 * Bridges Research Agent Projects and Research Expedition Projects
 */

import { TFile } from 'obsidian';

// Legacy imports for conversion
import { ResearchProject as AgentProject, ChecklistItem, GeneratedNoteInfo, ResearchSettings } from './project-tracker';
import { ResearchProject as ExpeditionProject } from './research-expedition-system';

export interface UnifiedResearchProject {
  // Core identification
  id: string;
  name: string;
  description: string;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // Status and organization
  status: 'active' | 'processing' | 'completed' | 'paused' | 'cancelled' | 'archived';
  tags: string[];
  folderPath: string;
  
  // Progress tracking
  progress: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  
  // Research Agent specific
  checklist: ChecklistItem[];
  template: string;
  generatedNotes: GeneratedNoteInfo[];
  settings: ResearchSettings;
  
  // Research Expedition specific  
  expeditions: string[];
  
  // Unified metrics
  totalNotes: number;
  totalConnections: number;
  researchHours: number;
}

export interface ProjectConversionResult {
  success: boolean;
  project?: UnifiedResearchProject;
  errors: string[];
}

export class UnifiedProjectSystem {
  private projects: Map<string, UnifiedResearchProject> = new Map();
  
  /**
   * Convert Research Agent Project to Unified Project
   */
  convertFromAgentProject(agentProject: AgentProject): ProjectConversionResult {
    try {
      const unifiedProject: UnifiedResearchProject = {
        // Core identification
        id: agentProject.id,
        name: agentProject.name,
        description: agentProject.description,
        
        // Timestamps (convert Date to number)
        createdAt: agentProject.createdAt.getTime(),
        updatedAt: Date.now(),
        
        // Status mapping
        status: agentProject.status,
        tags: [], // Agent projects don't have tags
        folderPath: agentProject.outputFolder,
        
        // Progress (direct copy)
        progress: {
          ...agentProject.progress,
          inProgress: agentProject.checklist.filter(item => item.status === 'processing').length
        },
        
        // Research Agent specific (direct copy)
        checklist: agentProject.checklist,
        template: agentProject.template,
        generatedNotes: agentProject.generatedNotes,
        settings: agentProject.settings,
        
        // Research Expedition specific (empty for agent projects)
        expeditions: [],
        
        // Unified metrics
        totalNotes: agentProject.generatedNotes.length,
        totalConnections: 0, // Not tracked in agent projects
        researchHours: this.estimateResearchHours(agentProject.checklist)
      };
      
      return { success: true, project: unifiedProject, errors: [] };
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to convert agent project: ${error.message}`] 
      };
    }
  }
  
  /**
   * Convert Research Expedition Project to Unified Project
   */
  convertFromExpeditionProject(expeditionProject: ExpeditionProject): ProjectConversionResult {
    try {
      const unifiedProject: UnifiedResearchProject = {
        // Core identification
        id: expeditionProject.id,
        name: expeditionProject.name,
        description: expeditionProject.description || '',
        
        // Timestamps (already numbers)
        createdAt: expeditionProject.createdAt,
        updatedAt: expeditionProject.updatedAt,
        
        // Status mapping
        status: expeditionProject.status === 'active' ? 'active' : 
               expeditionProject.status === 'completed' ? 'completed' : 'archived',
        tags: expeditionProject.tags || [],
        folderPath: expeditionProject.folderPath || '',
        
        // Progress (estimated from expeditions)
        progress: {
          total: expeditionProject.expeditions.length,
          completed: 0, // Would need expedition status to calculate
          failed: 0,
          inProgress: expeditionProject.expeditions.length
        },
        
        // Research Agent specific (empty for expedition projects)
        checklist: [],
        template: '',
        generatedNotes: [],
        settings: this.getDefaultSettings(),
        
        // Research Expedition specific (direct copy)
        expeditions: expeditionProject.expeditions,
        
        // Unified metrics (estimated)
        totalNotes: 0, // Would need to query expedition results
        totalConnections: 0,
        researchHours: expeditionProject.expeditions.length * 2 // Estimate 2 hours per expedition
      };
      
      return { success: true, project: unifiedProject, errors: [] };
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to convert expedition project: ${error.message}`] 
      };
    }
  }
  
  /**
   * Convert Unified Project back to Research Agent Project
   */
  convertToAgentProject(unifiedProject: UnifiedResearchProject): AgentProject {
    return {
      id: unifiedProject.id,
      name: unifiedProject.name,
      description: unifiedProject.description,
      checklist: unifiedProject.checklist,
      createdAt: new Date(unifiedProject.createdAt),
      status: unifiedProject.status,
      progress: {
        total: unifiedProject.progress.total,
        completed: unifiedProject.progress.completed,
        failed: unifiedProject.progress.failed
      },
      outputFolder: unifiedProject.folderPath,
      template: unifiedProject.template,
      generatedNotes: unifiedProject.generatedNotes,
      settings: unifiedProject.settings
    };
  }
  
  /**
   * Convert Unified Project back to Research Expedition Project
   */
  convertToExpeditionProject(unifiedProject: UnifiedResearchProject): ExpeditionProject {
    return {
      id: unifiedProject.id,
      name: unifiedProject.name,
      description: unifiedProject.description,
      createdAt: unifiedProject.createdAt,
      updatedAt: unifiedProject.updatedAt,
      expeditions: unifiedProject.expeditions,
      status: unifiedProject.status === 'processing' || unifiedProject.status === 'paused' ? 'active' : 
             unifiedProject.status === 'cancelled' ? 'archived' : 
             unifiedProject.status as 'active' | 'completed' | 'archived',
      tags: unifiedProject.tags,
      folderPath: unifiedProject.folderPath
    };
  }
  
  /**
   * Create a new unified project
   */
  createUnifiedProject(
    name: string, 
    description: string, 
    type: 'agent' | 'expedition' | 'hybrid' = 'hybrid'
  ): UnifiedResearchProject {
    const id = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project: UnifiedResearchProject = {
      id,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      tags: [],
      folderPath: `Research Projects/${name}`,
      progress: { total: 0, completed: 0, failed: 0, inProgress: 0 },
      checklist: [],
      template: '',
      generatedNotes: [],
      settings: this.getDefaultSettings(),
      expeditions: [],
      totalNotes: 0,
      totalConnections: 0,
      researchHours: 0
    };
    
    this.projects.set(id, project);
    return project;
  }
  
  /**
   * Add project to unified system
   */
  addProject(project: UnifiedResearchProject): void {
    this.projects.set(project.id, project);
  }
  
  /**
   * Get all unified projects
   */
  getAllProjects(): UnifiedResearchProject[] {
    return Array.from(this.projects.values());
  }
  
  /**
   * Get project by ID
   */
  getProject(id: string): UnifiedResearchProject | undefined {
    return this.projects.get(id);
  }
  
  /**
   * Update project
   */
  updateProject(id: string, updates: Partial<UnifiedResearchProject>): boolean {
    const project = this.projects.get(id);
    if (!project) return false;
    
    Object.assign(project, updates, { updatedAt: Date.now() });
    this.projects.set(id, project);
    return true;
  }
  
  /**
   * Delete project
   */
  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }
  
  /**
   * Estimate research hours from checklist
   */
  private estimateResearchHours(checklist: ChecklistItem[]): number {
    return checklist.reduce((hours, item) => {
      switch (item.priority) {
        case 'high': return hours + 2;
        case 'medium': return hours + 1;
        case 'low': return hours + 0.5;
        default: return hours + 1;
      }
    }, 0);
  }
  
  /**
   * Get default research settings
   */
  private getDefaultSettings(): ResearchSettings {
    return {
      outputFolder: 'Research Notes',
      enableWebSearch: true,
      saveIndividualPages: true,
      searchVaultExactWords: false,
      enableSemanticSearch: true,
      aiEnhanceFinalNote: true,
      maxWebSearchResults: 10,
      customTemplate: ''
    };
  }
}

// Singleton instance
export const unifiedProjectSystem = new UnifiedProjectSystem();