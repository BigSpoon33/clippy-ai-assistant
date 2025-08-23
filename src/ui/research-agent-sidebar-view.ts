/**
 * CLIPPY AI Assistant - Research Agent Sidebar View
 * Persistent sidebar interface for research project management
 */

import { ItemView, WorkspaceLeaf, Notice, Menu, Modal } from 'obsidian';
import ClippyPlugin from '../main';
import { ComprehensiveResearchSystem } from '../research/comprehensive-research-system';
import { ProjectTracker, ResearchProject, ChecklistItem, GeneratedNoteInfo, ResearchSettings } from '../research/project-tracker';
import { NoteStatusMonitor } from '../research/note-status-monitor';
import { AutomatedNoteGenerator } from '../research/automated-note-generator';

export const VIEW_TYPE_RESEARCH_AGENT = 'clippy-research-agent-view';

export class ResearchAgentSidebarView extends ItemView {
    private plugin: ClippyPlugin;
    private researchSystem: ComprehensiveResearchSystem;
    private projectTracker: ProjectTracker;
    private statusMonitor: NoteStatusMonitor;
    private updateInterval: number | null = null;
    private isInitialized = false;
    private collapsedProjects: Set<string> = new Set(); // Track which projects are collapsed
    private collapsedSections: Set<string> = new Set(); // Track which sections are collapsed
    private runningResearch: Set<string> = new Set(); // Track which projects are currently running research
    private recentlyToggled: Set<string> = new Set(); // Track recently toggled projects to prevent immediate auto-research
    private recentlyCompleted: Set<string> = new Set(); // Track recently completed research to prevent immediate restart

    constructor(leaf: WorkspaceLeaf, plugin: ClippyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_RESEARCH_AGENT;
    }

    getDisplayText(): string {
        return 'Research Agent';
    }

    getIcon(): string {
        return 'microscope';
    }

    async onOpen(): Promise<void> {
        console.log('🔬 Research Agent Sidebar: Opening view');
        await this.initializeComponents();
        this.render();
        this.startRealTimeUpdates();
    }

    async onClose(): Promise<void> {
        console.log('🔬 Research Agent Sidebar: Closing view');
        this.stopRealTimeUpdates();
    }

    /**
     * Initialize research system components
     */
    private async initializeComponents(): Promise<void> {
        try {
            this.researchSystem = new ComprehensiveResearchSystem(this.app, this.plugin);
            
            // Use shared project tracker from plugin
            this.projectTracker = this.plugin.projectTracker;
            
            this.statusMonitor = new NoteStatusMonitor(this.app, this.projectTracker);
            
            this.isInitialized = true;
            console.log('✅ Research Agent Sidebar: Components initialized');
        } catch (error) {
            console.error('❌ Research Agent Sidebar: Failed to initialize components:', error);
            new Notice('❌ Failed to initialize Research Agent sidebar');
        }
    }

    /**
     * Start real-time updates for the sidebar
     */
    private startRealTimeUpdates(): void {
        if (this.updateInterval) return;

        // Update every 1 second for responsive UI during research
        this.updateInterval = window.setInterval(() => {
            if (this.isInitialized) {
                const hasRunningResearch = this.runningResearch.size > 0;
                if (hasRunningResearch) {
                    // During active research, use full re-render to catch all status changes
                    console.log(`🔄 UI refresh during research (${this.runningResearch.size} active)`);
                    this.render();
                } else {
                    // Normal refresh when no active research
                    this.refreshActiveProjects();
                }
                this.checkForActiveResearch();
            }
        }, 1000); // Always 1 second for responsive updates

        console.log('🔄 Research Agent Sidebar: Started real-time updates (2s interval)');
    }

    /**
     * Stop real-time updates
     */
    private stopRealTimeUpdates(): void {
        if (this.updateInterval) {
            window.clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Research Agent Sidebar: Stopped real-time updates');
        }
    }

    /**
     * Refresh active projects display
     */
    private refreshActiveProjects(): void {
        const projectsContainer = this.containerEl.querySelector('.research-projects-container');
        if (projectsContainer && this.isInitialized) {
            this.renderActiveProjects(projectsContainer as HTMLElement);
        }
    }

    /**
     * Check for active projects that need research continuation
     */
    private async checkForActiveResearch(): Promise<void> {
        if (!this.isInitialized) return;

        try {
            const activeProjects = this.projectTracker.getActiveProjects();
            
            for (const project of activeProjects) {
                // Only process projects with 'processing' status (not paused)
                if (project.status !== 'processing') continue;

                // Check if there are unfinished items
                const unfinishedItems = project.checklist.filter(item => 
                    item.status === 'pending' || item.status === 'failed'
                );

                if (unfinishedItems.length === 0) continue;

                // Check if any items are currently being processed to avoid double-processing
                const processingItems = project.checklist.filter(item => item.status === 'processing');
                if (processingItems.length > 0) {
                    console.log(`⏳ Project has items processing, skipping auto-research: ${project.name}`);
                    continue; // Already processing something
                }

                // Check if we're already running research for this project
                if (this.runningResearch.has(project.id)) {
                    console.log(`🔄 Research already running for project: ${project.name} (auto-research skipping)`);
                    continue;
                }

                // Skip recently toggled projects to prevent race conditions
                if (this.recentlyToggled.has(project.id)) {
                    console.log(`⏳ Skipping recently toggled project: ${project.name}`);
                    continue;
                }

                // Skip recently completed research to prevent immediate restart
                if (this.recentlyCompleted.has(project.id)) {
                    console.log(`⏳ Skipping recently completed research project: ${project.name}`);
                    continue;
                }

                console.log(`🔍 Auto-continuing research for project: ${project.name} (${unfinishedItems.length} unfinished items)`);
                
                // Continue research automatically using project settings + global API settings
                const researchOptions = {
                    enableWebSearch: project.settings.enableWebSearch,
                    saveIndividualPages: project.settings.saveIndividualPages,
                    searchVaultExactWords: project.settings.searchVaultExactWords,
                    enableSemanticSearch: project.settings.enableSemanticSearch,
                    aiEnhanceFinalNote: project.settings.aiEnhanceFinalNote,
                    maxWebSearchResults: project.settings.maxWebSearchResults,
                    outputFolder: project.settings.outputFolder,
                    customTemplate: project.settings.customTemplate
                };

                // Mark as running and start research
                this.runningResearch.add(project.id);

                // Run research in background without blocking UI
                this.researchSystem.continueProjectResearch(
                    project.id,
                    researchOptions,
                    (progress) => {
                        console.log(`Auto-research progress: ${progress.percentage}% - ${progress.message}`);
                        // Trigger UI refresh when progress updates
                        this.refreshActiveProjects();
                    }
                ).then(() => {
                    console.log(`✅ Auto-research completed for project: ${project.name}`);
                    this.runningResearch.delete(project.id);
                    
                    // Mark as recently completed to prevent immediate restart
                    this.recentlyCompleted.add(project.id);
                    setTimeout(() => {
                        this.recentlyCompleted.delete(project.id);
                    }, 30000); // 30 second cooldown after completion
                    
                    this.refreshActiveProjects();
                }).catch((error) => {
                    console.error(`❌ Auto-research failed for project ${project.name}:`, error);
                    this.runningResearch.delete(project.id);
                    this.refreshActiveProjects();
                });

                // Only start one project at a time to avoid overwhelming the system
                break;
            }
        } catch (error) {
            console.error('Error checking for active research:', error);
        }
    }

    /**
     * Main render method
     */
    private render(): void {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('research-agent-sidebar');

        // Header
        this.renderHeader(container);

        // Active Projects Section
        this.renderActiveProjectsSection(container);

        // Archived Projects Section
        this.renderArchivedProjectsSection(container);

        // Quick Actions Section
        this.renderQuickActionsSection(container);

        // Insights Section
        this.renderInsightsSection(container);
    }

    /**
     * Render sidebar header
     */
    private renderHeader(container: HTMLElement): void {
        const header = container.createDiv({ cls: 'research-header' });
        
        const titleContainer = header.createDiv({ cls: 'research-title-container' });
        titleContainer.createSpan({ cls: 'research-icon', text: '🔬' });
        titleContainer.createSpan({ cls: 'research-title', text: 'CLIPPY RESEARCH AGENT' });
        
        // Settings button
        const settingsBtn = header.createEl('button', {
            cls: 'research-settings-btn',
            title: 'Research Settings'
        });
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.addEventListener('click', () => {
            // TODO: Open research settings
            new Notice('Research settings coming soon!');
        });
    }

    /**
     * Render active projects section
     */
    private renderActiveProjectsSection(container: HTMLElement): void {
        if (!this.isInitialized) return;

        const activeProjects = this.projectTracker.getActiveProjects();
        
        const section = container.createDiv({ cls: 'research-section' });
        
        const sectionHeader = section.createDiv({ cls: 'research-section-header collapsible-header' });
        sectionHeader.style.cursor = 'pointer';
        
        // Expand/collapse arrow for section
        const expandArrow = sectionHeader.createSpan({ cls: 'section-expand-arrow' });
        const isCollapsed = this.collapsedSections.has('active-projects');
        expandArrow.textContent = isCollapsed ? '▶' : '▼';
        
        sectionHeader.createSpan({ cls: 'section-icon', text: '📊' });
        sectionHeader.createSpan({ cls: 'section-title', text: `ACTIVE PROJECTS (${activeProjects.length})` });
        
        const projectsContainer = section.createDiv({ cls: 'research-projects-container' });
        projectsContainer.style.display = isCollapsed ? 'none' : 'block';
        this.renderActiveProjects(projectsContainer);

        // Collapse/expand functionality for section
        sectionHeader.addEventListener('click', () => {
            const isCurrentlyCollapsed = this.collapsedSections.has('active-projects');
            
            if (isCurrentlyCollapsed) {
                // Expand
                this.collapsedSections.delete('active-projects');
                projectsContainer.style.display = 'block';
                expandArrow.textContent = '▼';
            } else {
                // Collapse
                this.collapsedSections.add('active-projects');
                projectsContainer.style.display = 'none';
                expandArrow.textContent = '▶';
            }
        });
    }

    /**
     * Render active projects list
     */
    private renderActiveProjects(container: HTMLElement): void {
        container.empty();

        if (!this.isInitialized) {
            container.createDiv({ cls: 'loading-message', text: 'Initializing research system...' });
            return;
        }

        try {
            const activeProjects = this.projectTracker.getActiveProjects();
            
            if (activeProjects.length === 0) {
                const emptyState = container.createDiv({ cls: 'empty-state' });
                emptyState.createDiv({ cls: 'empty-icon', text: '📭' });
                emptyState.createDiv({ cls: 'empty-text', text: 'No active research projects' });
                emptyState.createDiv({ cls: 'empty-hint', text: 'Click "New Research Project" to get started' });
                return;
            }

            activeProjects.forEach(project => {
                this.renderProjectItem(container, project);
            });

        } catch (error) {
            console.error('Error rendering active projects:', error);
            container.createDiv({ cls: 'error-message', text: 'Failed to load projects' });
        }
    }

    /**
     * Render individual project item
     */
    private renderProjectItem(container: HTMLElement, project: ResearchProject): void {
        const projectItem = container.createDiv({ cls: 'research-project-item' });
        projectItem.style.userSelect = 'text'; // Make text selectable

        // Project header
        const projectHeader = projectItem.createDiv({ cls: 'project-header' });
        projectHeader.style.cursor = 'pointer';
        
        // Expand/collapse arrow
        const expandArrow = projectHeader.createSpan({ cls: 'expand-arrow' });
        expandArrow.textContent = '▼';
        
        // Dynamic status emoji based on project status
        const statusEmoji = projectHeader.createSpan({ cls: 'project-status-emoji' });
        statusEmoji.textContent = this.getProjectStatusEmoji(project);
        
        const projectTitle = projectHeader.createSpan({ cls: 'project-title' });
        projectTitle.textContent = project.name;
        projectTitle.style.userSelect = 'text';
        
        // Play/pause button (don't show for archived or 100% completed projects)
        const isFullyCompleted = project.progress.completed === project.progress.total && project.progress.total > 0;
        if (project.status !== 'archived' && !isFullyCompleted) {
            const playPauseBtn = projectHeader.createEl('button', { cls: 'project-play-pause-btn' });
            playPauseBtn.textContent = project.status === 'processing' ? '⏸️' : '▶️';
            playPauseBtn.title = project.status === 'processing' ? 'Pause project' : 
                                project.status === 'paused' ? 'Resume project' : 
                                project.status === 'completed' ? 'Restart research on unfinished topics' : 'Cannot toggle';
            // Use onclick instead of addEventListener to avoid duplicate handlers
            playPauseBtn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent any default behavior
                console.log(`🔘 DEBUG: Button clicked for project ${project.name}, current status: ${project.status}`);
                
                // Disable button temporarily to prevent rapid clicks
                playPauseBtn.disabled = true;
                setTimeout(() => {
                    playPauseBtn.disabled = false;
                }, 2000);
                
                this.toggleProjectStatus(project);
            };
        }
        
        // Context menu button
        const menuBtn = projectHeader.createEl('button', { cls: 'project-menu-btn', text: '⋮' });
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showProjectContextMenu(e, project);
        });

        // Collapsible project details container
        const projectDetails = projectItem.createDiv({ cls: 'project-details' });
        const isCollapsed = this.collapsedProjects.has(project.id);
        projectDetails.style.display = isCollapsed ? 'none' : 'block';
        expandArrow.textContent = isCollapsed ? '▶' : '▼';

        // Progress bar
        const progressContainer = projectDetails.createDiv({ cls: 'progress-container' });
        const progressBar = progressContainer.createDiv({ cls: 'progress-bar' });
        
        const percentage = project.progress.total > 0 ? 
            (project.progress.completed / project.progress.total) * 100 : 0;
        
        const progressFill = progressBar.createDiv({ cls: 'progress-fill' });
        progressFill.style.width = `${percentage}%`;
        
        const progressText = progressContainer.createDiv({ cls: 'progress-text' });
        progressText.textContent = `${Math.round(percentage)}% (${project.progress.completed}/${project.progress.total})`;

        // Checklist items
        if (project.checklist.length > 0) {
            const checklistContainer = projectDetails.createDiv({ cls: 'checklist-container' });
            
            project.checklist.forEach(item => {
                this.renderChecklistItem(checklistContainer, item);
            });
        }

        // Add topic button
        const addTopicBtn = projectDetails.createEl('button', { cls: 'add-topic-btn' });
        addTopicBtn.textContent = '+ Add Topic';
        addTopicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showAddTopicModal(project);
        });

        // Collapse/expand functionality
        projectHeader.addEventListener('click', (e) => {
            // Don't collapse if clicking on buttons
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            
            const isCurrentlyCollapsed = this.collapsedProjects.has(project.id);
            
            if (isCurrentlyCollapsed) {
                // Expand
                this.collapsedProjects.delete(project.id);
                projectDetails.style.display = 'block';
                expandArrow.textContent = '▼';
            } else {
                // Collapse
                this.collapsedProjects.add(project.id);
                projectDetails.style.display = 'none';
                expandArrow.textContent = '▶';
            }
        });
    }

    /**
     * Render checklist item
     */
    private renderChecklistItem(container: HTMLElement, item: ChecklistItem): void {
        const itemEl = container.createDiv({ cls: `checklist-item ${item.status}` });
        
        const itemIcon = itemEl.createSpan({ cls: 'item-icon' });
        // Calculate progress for processing items
        const progressPercentage = item.status === 'processing' ? this.estimateItemProgress(item) : undefined;
        itemIcon.textContent = this.getItemStatusIcon(item.status, progressPercentage);
        
        const itemName = itemEl.createSpan({ cls: 'item-name' });
        itemName.textContent = item.name;
        
        // Click to open research note if available  
        // Check both noteId and if file exists based on standard naming convention
        if (item.status === 'completed') {
            const project = this.getCurrentProject(item);
            if (project && (item.noteId || this.findResearchNoteForItem(project, item))) {
                itemEl.addClass('clickable');
                itemEl.addEventListener('click', () => {
                    const notePath = item.noteId || this.getStandardNotePath(project, item);
                    this.openResearchNote(notePath);
                });
            }
        }

        // Show error if failed
        if (item.status === 'failed' && item.error) {
            const errorEl = itemEl.createDiv({ cls: 'item-error' });
            errorEl.textContent = `Error: ${item.error}`;
        }
    }

    /**
     * Render quick actions section
     */
    private renderQuickActionsSection(container: HTMLElement): void {
        const section = container.createDiv({ cls: 'research-section' });
        
        const sectionHeader = section.createDiv({ cls: 'research-section-header' });
        sectionHeader.createSpan({ cls: 'section-icon', text: '🎯' });
        sectionHeader.createSpan({ cls: 'section-title', text: 'QUICK ACTIONS' });
        
        const actionsContainer = section.createDiv({ cls: 'quick-actions-container' });
        
        // New Research Project button
        const newProjectBtn = actionsContainer.createEl('button', {
            cls: 'quick-action-btn primary',
            text: '+ New Research Project'
        });
        newProjectBtn.addEventListener('click', () => {
            this.showNewProjectModal();
        });

        // Secondary actions
        const secondaryActions = actionsContainer.createDiv({ cls: 'secondary-actions' });
        
        const templatesBtn = secondaryActions.createEl('button', {
            cls: 'quick-action-btn secondary',
            text: '📋 Templates'
        });
        templatesBtn.addEventListener('click', () => {
            new Notice('Research templates coming soon!');
        });

        const suggestBtn = secondaryActions.createEl('button', {
            cls: 'quick-action-btn secondary',
            text: '🔍 Suggest Topics'
        });
        suggestBtn.addEventListener('click', () => {
            this.showTopicSuggestions();
        });
    }

    /**
     * Render archived projects section
     */
    private renderArchivedProjectsSection(container: HTMLElement): void {
        if (!this.isInitialized) return;

        try {
            const archivedProjects = this.projectTracker.getArchivedProjects();
            
            if (archivedProjects.length === 0) {
                return; // Don't show section if no archived projects
            }

            const section = container.createDiv({ cls: 'research-section' });
            
            const sectionHeader = section.createDiv({ cls: 'research-section-header collapsible-header' });
            sectionHeader.style.cursor = 'pointer';

            // Expand/collapse arrow for section
            const expandArrow = sectionHeader.createSpan({ cls: 'section-expand-arrow' });
            const isCollapsed = this.collapsedSections.has('archived-projects');
            expandArrow.textContent = isCollapsed ? '▶' : '▼';
            
            sectionHeader.createSpan({ cls: 'section-icon', text: '📦' });
            sectionHeader.createSpan({ cls: 'section-title', text: `ARCHIVED PROJECTS (${archivedProjects.length})` });
            
            const projectsContainer = section.createDiv({ cls: 'research-projects-container' });
            projectsContainer.style.display = isCollapsed ? 'none' : 'block';
            
            archivedProjects.forEach(project => {
                this.renderProjectItem(projectsContainer, project);
            });

            // Collapse/expand functionality for section
            sectionHeader.addEventListener('click', () => {
                const isCurrentlyCollapsed = this.collapsedSections.has('archived-projects');
                
                if (isCurrentlyCollapsed) {
                    // Expand
                    this.collapsedSections.delete('archived-projects');
                    projectsContainer.style.display = 'block';
                    expandArrow.textContent = '▼';
                } else {
                    // Collapse
                    this.collapsedSections.add('archived-projects');
                    projectsContainer.style.display = 'none';
                    expandArrow.textContent = '▶';
                }
            });
            
        } catch (error) {
            console.error('Error rendering archived projects:', error);
        }
    }

    /**
     * Render insights section
     */
    private renderInsightsSection(container: HTMLElement): void {
        const section = container.createDiv({ cls: 'research-section' });
        
        const sectionHeader = section.createDiv({ cls: 'research-section-header' });
        sectionHeader.createSpan({ cls: 'section-icon', text: '📈' });
        sectionHeader.createSpan({ cls: 'section-title', text: 'INSIGHTS' });
        
        const insightsContainer = section.createDiv({ cls: 'insights-container' });
        
        // TODO: Implement research analytics
        const placeholderInsights = [
            '• Research projects this week: 3',
            '• Average completion rate: 85%',
            '• Most researched topic: herbal medicine',
            '• Quality score average: 87%'
        ];
        
        placeholderInsights.forEach(insight => {
            const insightEl = insightsContainer.createDiv({ cls: 'insight-item' });
            insightEl.textContent = insight;
        });
    }

    // Helper methods

    private getItemStatusIcon(status: string, progressPercentage?: number): string {
        switch (status) {
            case 'completed': return '✅';
            case 'failed': return '❌';
            case 'processing': 
                // Return circular progress indicator based on percentage
                if (progressPercentage !== undefined) {
                    return this.getCircularProgressIcon(progressPercentage);
                }
                return '🔄'; // Generic processing icon if no progress available
            case 'pending': return '⏳';
            default: return '⏳';
        }
    }

    /**
     * Get circular progress icon based on percentage
     */
    private getCircularProgressIcon(percentage: number): string {
        if (percentage >= 100) return '✅';
        if (percentage >= 87.5) return '🔵'; // Almost complete
        if (percentage >= 75) return '🟦'; // 3/4
        if (percentage >= 62.5) return '🟨'; // 5/8
        if (percentage >= 50) return '🟧'; // 1/2
        if (percentage >= 37.5) return '🟥'; // 3/8
        if (percentage >= 25) return '🔴'; // 1/4
        if (percentage >= 12.5) return '⚫'; // 1/8
        return '🔄'; // Just started
    }

    /**
     * Estimate progress percentage for a processing item
     * This is a rough estimation based on typical research steps
     */
    private estimateItemProgress(item: ChecklistItem): number {
        // Since we don't have real-time progress from the research system,
        // we'll use time-based estimation as a fallback
        // In a real implementation, this would be connected to the actual research progress
        
        // For now, return a cycling progress indicator
        const now = Date.now();
        const cycleTime = 30000; // 30 second cycle
        const progress = ((now / 100) % cycleTime) / cycleTime * 100;
        
        return Math.floor(progress);
    }


    /**
     * Helper methods for finding research notes
     */
    private getCurrentProject(item: ChecklistItem): ResearchProject | null {
        const projects = this.projectTracker.getActiveProjects().concat(this.projectTracker.getArchivedProjects());
        return projects.find(p => p.checklist.some(i => i.id === item.id)) || null;
    }

    private findResearchNoteForItem(project: ResearchProject, item: ChecklistItem): boolean {
        const standardPath = this.getStandardNotePath(project, item);
        return this.app.vault.getAbstractFileByPath(standardPath) !== null;
    }

    private getStandardNotePath(project: ResearchProject, item: ChecklistItem): string {
        // Use the same naming convention as the research system
        const sanitizedName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        return `${project.outputFolder}/${sanitizedName}.md`;
    }

    private async openResearchNote(notePath: string): Promise<void> {
        try {
            const file = this.app.vault.getAbstractFileByPath(notePath);
            if (file) {
                await this.app.workspace.getLeaf().openFile(file as any);
            } else {
                new Notice(`Research note not found: ${notePath}`);
            }
        } catch (error) {
            console.error('Error opening research note:', error);
            new Notice('Failed to open research note');
        }
    }

    private showNewProjectModal(): void {
        // Trigger the comprehensive research command directly through the command handler
        if (this.plugin.commandHandlers) {
            this.plugin.commandHandlers.handleComprehensiveResearch();
        } else {
            new Notice('❌ Command handlers not available');
        }
    }

    private showProjectDetails(project: ResearchProject): void {
        // TODO: Implement project details modal
        new Notice(`Project: ${project.name}\nProgress: ${project.progress.completed}/${project.progress.total}\nCreated: ${project.createdAt.toLocaleDateString()}`);
    }

    private async cancelProject(project: ResearchProject): Promise<void> {
        try {
            // Check if there are project files and folders to delete
            const { files, folders } = this.projectTracker.getProjectFilesAndFolders(project.id);
            const allItems = [...files, ...folders];
            
            if (allItems.length > 0) {
                // Show confirmation dialog for file deletion
                const shouldDeleteFiles = await this.showFilesDeletionConfirmation(project, allItems);
                
                // Cancel the project first
                await this.projectTracker.cancelProject(project.id);
                
                // Delete files if confirmed
                if (shouldDeleteFiles) {
                    await this.projectTracker.deleteProjectFiles(project.id);
                    new Notice(`🗑️ Cancelled project and deleted ${files.length} files + ${folders.length} folders: ${project.name}`);
                } else {
                    new Notice(`❌ Cancelled project (files preserved): ${project.name}`);
                }
            } else {
                // No files to delete, just cancel
                await this.projectTracker.cancelProject(project.id);
                new Notice(`❌ Cancelled project: ${project.name}`);
            }
            
            this.refreshActiveProjects();
        } catch (error) {
            console.error('Error cancelling project:', error);
            new Notice('Failed to cancel project');
        }
    }

    /**
     * Show confirmation dialog for deleting project files
     */
    private async showFilesDeletionConfirmation(project: ResearchProject, files: string[]): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'delete-files-modal';
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 20px;
                z-index: 1000;
                width: 500px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            `;

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            `;

            const fileList = files.slice(0, 5).join('\n• ');
            const moreFiles = files.length > 5 ? `\n... and ${files.length - 5} more files` : '';

            modal.innerHTML = `
                <h3>🗑️ Delete Project Files?</h3>
                <p>Cancelling project: <strong>${project.name}</strong></p>
                <p>This project has <strong>${files.length}</strong> associated files:</p>
                <div style="background: var(--background-secondary); padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 12px; max-height: 150px; overflow-y: auto;">
                    • ${fileList}${moreFiles}
                </div>
                <p><strong>Do you want to delete these files?</strong></p>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button id="keep-files-btn" style="padding: 8px 16px; background: var(--background-modifier-border); border: 1px solid var(--background-modifier-border-hover); border-radius: 4px;">Keep Files</button>
                    <button id="delete-files-btn" style="padding: 8px 16px; background: var(--text-error); color: white; border: none; border-radius: 4px;">Delete Files</button>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            const cleanup = () => {
                document.body.removeChild(overlay);
                document.body.removeChild(modal);
            };

            // Handle buttons
            modal.querySelector('#keep-files-btn')?.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            modal.querySelector('#delete-files-btn')?.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // Close on overlay click
            overlay.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
        });
    }

    private showTopicSuggestions(): void {
        // TODO: Implement AI-powered topic suggestions
        new Notice('AI topic suggestions coming soon!');
    }

    /**
     * Get dynamic status emoji based on project status
     */
    private getProjectStatusEmoji(project: ResearchProject): string {
        // Check if project is 100% complete regardless of status
        const isFullyCompleted = project.progress.completed === project.progress.total && project.progress.total > 0;
        
        if (isFullyCompleted) {
            return '✅'; // Always show green check for 100% completed projects
        }
        
        switch (project.status) {
            case 'processing':
                return '🔄'; // Processing/Active
            case 'completed':
                return '✅'; // Completed (though should be caught above)
            case 'cancelled':
                return '❌'; // Cancelled
            case 'paused':
                return '⏸️'; // Paused
            case 'archived':
                return '📦'; // Archived
            default:
                return '❓'; // Unknown
        }
    }

    /**
     * Toggle project status between processing and paused
     */
    private async toggleProjectStatus(project: ResearchProject): Promise<void> {
        try {
            // Mark as recently toggled to prevent immediate auto-research
            this.recentlyToggled.add(project.id);
            
            // Clear the flag after 5 seconds
            setTimeout(() => {
                this.recentlyToggled.delete(project.id);
            }, 5000);

            if (project.status === 'processing') {
                // Pause project - this should work even during active research
                await this.projectTracker.pauseProject(project.id);
                // Clear any running research flag to stop the queue
                this.runningResearch.delete(project.id);
                console.log(`⏸️ Paused project and cleared research queue: ${project.name}`);
                new Notice(`⏸️ Paused project: ${project.name} (current topic will finish)`);
            } else if (project.status === 'paused') {
                // Resume project and start research immediately
                await this.projectTracker.resumeProject(project.id);
                new Notice(`▶️ Resumed project: ${project.name}`);
                
                // Start research immediately to avoid race conditions with auto-research system
                await this.startProjectResearch(project);
            } else if (project.status === 'completed') {
                // Restart research on unfinished topics
                await this.restartProjectResearch(project);
            } else {
                new Notice('Cannot toggle status for cancelled/archived projects');
            }
            this.refreshActiveProjects();
        } catch (error) {
            console.error('Error toggling project status:', error);
            new Notice('Failed to toggle project status');
        }
    }

    /**
     * Show modal to add topics to existing project
     */
    private showAddTopicModal(project: ResearchProject): void {
        const modal = document.createElement('div');
        modal.className = 'add-topic-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 20px;
            z-index: 1000;
            width: 400px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;

        modal.innerHTML = `
            <h3>Add Topics to: ${project.name}</h3>
            <textarea id="topics-input" placeholder="Enter topics, one per line..." 
                style="width: 100%; height: 120px; margin: 10px 0; padding: 8px; resize: vertical;"></textarea>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-btn" style="padding: 8px 16px;">Cancel</button>
                <button id="add-btn" style="padding: 8px 16px; background: var(--interactive-accent); color: white; border: none; border-radius: 4px;">Add Topics</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Focus the textarea
        const textarea = modal.querySelector('#topics-input') as HTMLTextAreaElement;
        textarea.focus();

        // Handle buttons
        modal.querySelector('#cancel-btn')?.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });

        modal.querySelector('#add-btn')?.addEventListener('click', async () => {
            const topics = textarea.value.split('\n').filter(t => t.trim()).map(t => t.trim());
            if (topics.length > 0) {
                await this.addTopicsToProject(project, topics);
                new Notice(`Added ${topics.length} topics to ${project.name}`);
            }
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });

        // Close on overlay click
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });
    }

    /**
     * Add topics to existing project
     */
    private async addTopicsToProject(project: ResearchProject, topics: string[]): Promise<void> {
        try {
            // Use the project tracker to actually add the topics
            await this.projectTracker.addTopicsToProject(project.id, topics);
            
            // Refresh the display to show the new topics
            this.refreshActiveProjects();
        } catch (error) {
            console.error('Error adding topics to project:', error);
            new Notice('Failed to add topics to project');
        }
    }

    /**
     * Enhanced context menu with rename option
     */
    private showProjectContextMenu(event: MouseEvent, project: ResearchProject): void {
        const menu = new Menu();

        menu.addItem((item) => {
            item.setTitle('Rename Project')
                .setIcon('edit')
                .onClick(() => {
                    this.showRenameProjectModal(project);
                });
        });

        menu.addItem((item) => {
            item.setTitle('Add Topics')
                .setIcon('plus')
                .onClick(() => {
                    this.showAddTopicModal(project);
                });
        });

        menu.addSeparator();

        menu.addItem((item) => {
            item.setTitle('Project Settings')
                .setIcon('settings')
                .onClick(() => {
                    this.showProjectSettingsModal(project);
                });
        });

        menu.addItem((item) => {
            item.setTitle('View Details')
                .setIcon('info')
                .onClick(() => {
                    this.showProjectDetails(project);
                });
        });

        if (project.status !== 'archived') {
            menu.addItem((item) => {
                item.setTitle('Archive Project')
                    .setIcon('archive')
                    .onClick(() => {
                        this.archiveProject(project);
                    });
            });

            menu.addItem((item) => {
                item.setTitle('Cancel Project')
                    .setIcon('trash')
                    .onClick(() => {
                        this.cancelProject(project);
                    });
            });
        } else {
            menu.addItem((item) => {
                item.setTitle('Unarchive Project')
                    .setIcon('archive')
                    .onClick(() => {
                        this.unarchiveProject(project);
                    });
            });
        }

        menu.showAtMouseEvent(event);
    }

    /**
     * Show modal to rename project
     */
    private showRenameProjectModal(project: ResearchProject): void {
        const modal = document.createElement('div');
        modal.className = 'rename-project-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 20px;
            z-index: 1000;
            width: 400px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;

        modal.innerHTML = `
            <h3>Rename Project</h3>
            <input type="text" id="project-name-input" value="${project.name}" 
                style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid var(--background-modifier-border); border-radius: 4px;">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-btn" style="padding: 8px 16px;">Cancel</button>
                <button id="save-btn" style="padding: 8px 16px; background: var(--interactive-accent); color: white; border: none; border-radius: 4px;">Save</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Focus and select the input
        const input = modal.querySelector('#project-name-input') as HTMLInputElement;
        input.focus();
        input.select();

        // Handle buttons
        modal.querySelector('#cancel-btn')?.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });

        modal.querySelector('#save-btn')?.addEventListener('click', async () => {
            const newName = input.value.trim();
            if (newName && newName !== project.name) {
                await this.renameProject(project, newName);
                new Notice(`Renamed project to: ${newName}`);
            }
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });

        // Save on Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                (modal.querySelector('#save-btn') as HTMLButtonElement)?.click();
            } else if (e.key === 'Escape') {
                (modal.querySelector('#cancel-btn') as HTMLButtonElement)?.click();
            }
        });

        // Close on overlay click
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });
    }

    /**
     * Rename project
     */
    private async renameProject(project: ResearchProject, newName: string): Promise<void> {
        try {
            // Use the project tracker to actually rename the project
            await this.projectTracker.renameProject(project.id, newName);
            
            // Refresh the display to show the new name
            this.refreshActiveProjects();
        } catch (error) {
            console.error('Error renaming project:', error);
            new Notice('Failed to rename project');
        }
    }

    /**
     * Archive a project
     */
    private async archiveProject(project: ResearchProject): Promise<void> {
        try {
            await this.projectTracker.archiveProject(project.id);
            new Notice(`📦 Archived project: ${project.name}`);
            this.render(); // Re-render to update both sections
        } catch (error) {
            console.error('Error archiving project:', error);
            new Notice('Failed to archive project');
        }
    }

    /**
     * Unarchive a project (move back to active)
     */
    private async unarchiveProject(project: ResearchProject): Promise<void> {
        try {
            await this.projectTracker.unarchiveProject(project.id);
            new Notice(`📤 Unarchived project: ${project.name}`);
            this.render(); // Re-render to update both sections
        } catch (error) {
            console.error('Error unarchiving project:', error);
            new Notice('Failed to unarchive project');
        }
    }

    /**
     * Show project settings modal (identical to comprehensive research command interface)
     */
    private showProjectSettingsModal(project: ResearchProject): void {
        // Capture reference to the sidebar view for use in modal
        const sidebarView = this;
        
        // Create Obsidian modal
        const modal = new class extends Modal {
            constructor(app: any, project: ResearchProject, projectTracker: any, onComplete: () => void) {
                super(app);
                this.project = project;
                this.projectTracker = projectTracker;
                this.onComplete = onComplete;
            }

            private project: ResearchProject;
            private projectTracker: any;
            private onComplete: () => void;

            onOpen() {
                const { contentEl } = this;
                contentEl.empty();
                contentEl.addClass('clippy-comprehensive-research-modal');

                // Header
                const header = contentEl.createEl('div', { cls: 'modal-header' });
                header.createEl('h2', { text: '⚙️ Project Settings', cls: 'modal-title' });
                header.createEl('p', { 
                    text: `Configure research options for project: ${this.project.name}`,
                    cls: 'modal-subtitle'
                });

                // Form
                const form = contentEl.createEl('form');
                form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

                // Options section
                const optionsEl = form.createEl('div', { cls: 'options-section' });
                optionsEl.createEl('h3', { text: 'Research Options' });

                // Output folder
                const folderEl = optionsEl.createEl('div', { cls: 'option-group' });
                folderEl.createEl('label', { text: 'Research Output Folder:' });
                const folderInput = folderEl.createEl('input', { 
                    type: 'text', 
                    value: this.project.settings.outputFolder,
                    placeholder: 'Comprehensive Research'
                });
                folderInput.style.cssText = 'width: 100%; padding: 6px; margin-top: 4px;';

                // Search options
                const searchOptionsEl = optionsEl.createEl('div', { cls: 'option-group' });
                
                const webSearchCheck = searchOptionsEl.createEl('label');
                webSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
                const webSearchInput = webSearchCheck.createEl('input', { type: 'checkbox' });
                webSearchInput.checked = this.project.settings.enableWebSearch;
                webSearchCheck.createEl('span', { text: 'Enable web search' });

                const saveIndividualPagesCheck = searchOptionsEl.createEl('label');
                saveIndividualPagesCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; margin-left: 20px;';
                const saveIndividualPagesInput = saveIndividualPagesCheck.createEl('input', { type: 'checkbox' });
                saveIndividualPagesInput.checked = this.project.settings.saveIndividualPages;
                saveIndividualPagesCheck.createEl('span', { text: 'Save individual web pages' });

                const vaultSearchCheck = searchOptionsEl.createEl('label');
                vaultSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
                const vaultSearchInput = vaultSearchCheck.createEl('input', { type: 'checkbox' });
                vaultSearchInput.checked = this.project.settings.searchVaultExactWords;
                vaultSearchCheck.createEl('span', { text: 'Search vault for notes with exact words' });

                const semanticSearchCheck = searchOptionsEl.createEl('label');
                semanticSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; margin-left: 20px;';
                const semanticSearchInput = semanticSearchCheck.createEl('input', { type: 'checkbox' });
                semanticSearchInput.checked = this.project.settings.enableSemanticSearch;
                semanticSearchCheck.createEl('span', { text: 'Enable semantic search' });

                const aiEnhanceCheck = searchOptionsEl.createEl('label');
                aiEnhanceCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
                const aiEnhanceInput = aiEnhanceCheck.createEl('input', { type: 'checkbox' });
                aiEnhanceInput.checked = this.project.settings.aiEnhanceFinalNote;
                aiEnhanceCheck.createEl('span', { text: 'AI-enhance final notes' });

                // Advanced options
                const advancedEl = optionsEl.createEl('details');
                advancedEl.createEl('summary', { text: 'Advanced Options' });
                
                const maxResultsEl = advancedEl.createEl('div', { cls: 'option-group' });
                maxResultsEl.style.marginTop = '12px';
                maxResultsEl.createEl('label', { text: 'Max web search results per item:' });
                const maxResultsInput = maxResultsEl.createEl('input', { 
                    type: 'number', 
                    value: String(this.project.settings.maxWebSearchResults)
                });
                maxResultsInput.min = '5';
                maxResultsInput.max = '20';
                maxResultsInput.style.cssText = 'width: 100px; padding: 4px; margin-top: 4px;';

                // Research Topics Management Section
                const topicsEl = optionsEl.createEl('div', { cls: 'option-group' });
                topicsEl.style.marginTop = '16px';
                topicsEl.createEl('h4', { text: '📝 Research Topics Management' });
                
                const topicsContainer = topicsEl.createEl('div', { cls: 'topics-container' });
                topicsContainer.style.cssText = `
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 6px;
                    padding: 12px;
                    background: var(--background-secondary);
                    max-height: 300px;
                    overflow-y: auto;
                    margin-top: 8px;
                `;

                // Get topics for this project
                const topics = this.projectTracker.getProjectTopics(this.project.id);
                
                if (topics.length === 0) {
                    topicsContainer.createEl('p', { 
                        text: 'No research topics found for this project.',
                        cls: 'text-muted'
                    });
                } else {
                    topics.forEach(({ item, associatedFiles, hasFiles }) => {
                        const topicItem = topicsContainer.createEl('div', { cls: 'topic-item' });
                        topicItem.style.cssText = `
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 8px 12px;
                            border: 1px solid var(--background-modifier-border);
                            border-radius: 4px;
                            margin-bottom: 8px;
                            background: var(--background-primary);
                        `;

                        const topicInfo = topicItem.createEl('div', { cls: 'topic-info' });
                        topicInfo.style.cssText = 'flex: 1; margin-right: 12px;';
                        
                        const topicName = topicInfo.createEl('div', { cls: 'topic-name' });
                        topicName.textContent = item.name;
                        topicName.style.cssText = 'font-weight: 500; margin-bottom: 4px;';
                        
                        const topicDetails = topicInfo.createEl('div', { cls: 'topic-details' });
                        topicDetails.style.cssText = 'font-size: 12px; color: var(--text-muted);';
                        
                        const statusEmoji = item.status === 'completed' ? '✅' : 
                                          item.status === 'processing' ? '⏳' : 
                                          item.status === 'failed' ? '❌' : '⏸️';
                        
                        topicDetails.innerHTML = `
                            ${statusEmoji} <strong>${item.status}</strong> | 
                            📁 ${associatedFiles.length} file${associatedFiles.length !== 1 ? 's' : ''} | 
                            🏷️ ${item.category} | 
                            ⚡ ${item.priority}
                        `;

                        const topicActions = topicItem.createEl('div', { cls: 'topic-actions' });
                        topicActions.style.cssText = 'display: flex; gap: 8px;';

                        // Remove topic button
                        const removeBtn = topicActions.createEl('button', {
                            text: '🗑️',
                            type: 'button',
                            attr: { 'aria-label': 'Remove topic' }
                        });
                        removeBtn.style.cssText = `
                            padding: 4px 8px;
                            font-size: 12px;
                            background: var(--interactive-normal);
                            border: 1px solid var(--background-modifier-border);
                            border-radius: 3px;
                            cursor: pointer;
                            color: var(--text-on-accent);
                        `;

                        removeBtn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            await sidebarView.showTopicRemovalConfirmation(item, hasFiles);
                        });

                        // Show files info if any
                        if (hasFiles) {
                            const filesBtn = topicActions.createEl('button', {
                                text: `📄 ${associatedFiles.length}`,
                                type: 'button',
                                attr: { 'aria-label': 'View associated files' }
                            });
                            filesBtn.style.cssText = `
                                padding: 4px 8px;
                                font-size: 12px;
                                background: var(--interactive-normal);
                                border: 1px solid var(--background-modifier-border);
                                border-radius: 3px;
                                cursor: pointer;
                                color: var(--text-muted);
                            `;

                            filesBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                sidebarView.showTopicFiles(item, associatedFiles);
                            });
                        }
                    });
                }

                // Custom template option
                const templateEl = advancedEl.createEl('div', { cls: 'option-group' });
                templateEl.style.marginTop = '16px';
                templateEl.createEl('label', { text: 'Custom Template (optional):' });
                const templateHelp = templateEl.createEl('div', { cls: 'template-help' });
                templateHelp.style.cssText = 'font-size: 12px; color: var(--text-muted); margin: 4px 0;';
                templateHelp.innerHTML = `
                    <strong>Available variables:</strong> {{title}}, {{today}}, {{research.status}}, {{vault.references}}, {{web.sources}}, {{overview}}, {{definitions}}, {{facts}}, {{uses}}, {{warnings}}, {{research}}, {{concepts}}, {{sources}}, {{wisdom}}
                `;
                
                const templateInput = templateEl.createEl('textarea', { 
                    placeholder: `Leave empty to use default template, or enter custom template with variables:

---
title: {{title}}
created: {{today}}
tags: [research, {{title}}]
---

# {{title}}

## Research Status
{{research.status}}

## Overview
{{overview}}

## Vault Notes
{{vault.references}}

## Web Sources  
{{web.sources}}

## Key Information
{{facts}}

## Sources
{{sources}}`,
                    cls: 'custom-template-input'
                });
                templateInput.style.cssText = `
                    width: 100%;
                    min-height: 150px;
                    padding: 8px;
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 4px;
                    background: var(--background-primary);
                    color: var(--text-normal);
                    font-family: var(--font-monospace);
                    font-size: 12px;
                    resize: vertical;
                    margin-top: 4px;
                `;

                // Set current template if it's custom
                if (this.project.settings.customTemplate && this.project.settings.customTemplate !== 'research-standard') {
                    templateInput.value = this.project.settings.customTemplate;
                }

                // Add file selector for template
                const templateControls = templateEl.createEl('div', { cls: 'template-controls' });
                templateControls.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';
                
                const loadTemplateBtn = templateControls.createEl('button', {
                    text: '📁 Load Template from Vault',
                    type: 'button'
                });
                loadTemplateBtn.style.cssText = 'padding: 6px 12px; font-size: 12px;';
                
                const templateFileSpan = templateControls.createEl('span', { cls: 'template-file-name' });
                templateFileSpan.style.cssText = 'font-size: 12px; color: var(--text-muted);';
                
                loadTemplateBtn.addEventListener('click', async () => {
                    const markdownFiles = this.app.vault.getMarkdownFiles();
                    const templateFiles = markdownFiles.filter(file => 
                        file.path.toLowerCase().includes('template') || 
                        file.path.toLowerCase().includes('40 - obsidian') ||
                        file.extension === 'md'
                    );
                    
                    // Create a simple file selection modal
                    const fileModal = new class extends Modal {
                        constructor(app: any) {
                            super(app);
                        }
                        
                        onOpen() {
                            const { contentEl } = this;
                            contentEl.empty();
                            contentEl.createEl('h3', { text: 'Select Template File' });
                            
                            const fileList = contentEl.createEl('div', { cls: 'template-file-list' });
                            fileList.style.cssText = 'max-height: 300px; overflow-y: auto; margin: 16px 0;';
                            
                            templateFiles.forEach(file => {
                                const fileItem = fileList.createEl('div', { cls: 'template-file-item' });
                                fileItem.style.cssText = `
                                    padding: 8px 12px;
                                    border: 1px solid var(--background-modifier-border);
                                    border-radius: 4px;
                                    margin-bottom: 4px;
                                    cursor: pointer;
                                    background: var(--background-secondary);
                                `;
                                
                                fileItem.textContent = file.path;
                                fileItem.addEventListener('click', async () => {
                                    try {
                                        const content = await this.app.vault.read(file);
                                        templateInput.value = content;
                                        templateFileSpan.textContent = `📝 ${file.basename}`;
                                        new Notice(`✅ Loaded template: ${file.basename}`);
                                        this.close();
                                    } catch (error) {
                                        new Notice(`❌ Failed to load template: ${error.message}`);
                                    }
                                });
                            });
                            
                            if (templateFiles.length === 0) {
                                fileList.createEl('p', { 
                                    text: 'No template files found. Create a .md file with "template" in the name.',
                                    cls: 'text-muted'
                                });
                            }
                        }
                    }(this.app);
                    
                    fileModal.open();
                });

                // Buttons
                const buttonContainer = form.createEl('div', { cls: 'button-container' });
                buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;';

                const cancelBtn = buttonContainer.createEl('button', { 
                    text: 'Cancel',
                    type: 'button'
                });
                cancelBtn.addEventListener('click', () => this.close());

                const saveBtn = buttonContainer.createEl('button', { 
                    text: '⚙️ Save Settings',
                    type: 'submit',
                    cls: 'mod-cta'
                });

                // Form submission
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    // Prepare updated settings
                    const customTemplate = templateInput.value.trim();
                    const newSettings: Partial<ResearchSettings> = {
                        outputFolder: folderInput.value || 'Comprehensive Research',
                        enableWebSearch: webSearchInput.checked,
                        saveIndividualPages: saveIndividualPagesInput.checked,
                        searchVaultExactWords: vaultSearchInput.checked,
                        enableSemanticSearch: semanticSearchInput.checked,
                        aiEnhanceFinalNote: aiEnhanceInput.checked,
                        maxWebSearchResults: parseInt(maxResultsInput.value) || 10,
                        customTemplate: customTemplate || 'research-standard'
                    };

                    await this.projectTracker.updateProjectSettings(this.project.id, newSettings);
                    new Notice(`⚙️ Updated settings for: ${this.project.name}`);
                    
                    this.close();
                    this.onComplete();
                });
            }
        }(this.app, project, this.projectTracker, () => {
            this.render();
        });
        
        modal.open();
    }

    /**
     * Start research for a specific project (used by manual play/pause)
     */
    private async startProjectResearch(project: ResearchProject): Promise<void> {
        try {
            // Check if there are unfinished items
            const unfinishedItems = project.checklist.filter(item => 
                item.status === 'pending' || item.status === 'failed'
            );

            if (unfinishedItems.length === 0) {
                new Notice('All topics in this project have been completed');
                return;
            }

            // Check if we're already running research for this project
            if (this.runningResearch.has(project.id)) {
                console.log(`🔄 Research already running for project: ${project.name}`);
                return;
            }

            console.log(`🔍 Starting research for project: ${project.name} (${unfinishedItems.length} unfinished items)`);
            
            // Mark as running to prevent auto-research interference
            this.runningResearch.add(project.id);
            console.log(`🔒 DEBUG: Marked project as running research: ${project.name}`);
            
            // Mark as recently toggled to prevent immediate auto-research interference
            this.recentlyToggled.add(project.id);
            setTimeout(() => {
                this.recentlyToggled.delete(project.id);
            }, 10000); // Longer timeout for manual research

            const researchOptions = {
                enableWebSearch: project.settings.enableWebSearch,
                saveIndividualPages: project.settings.saveIndividualPages,
                searchVaultExactWords: project.settings.searchVaultExactWords,
                enableSemanticSearch: project.settings.enableSemanticSearch,
                aiEnhanceFinalNote: project.settings.aiEnhanceFinalNote,
                maxWebSearchResults: project.settings.maxWebSearchResults,
                outputFolder: project.settings.outputFolder,
                customTemplate: project.settings.customTemplate
            };

            // Run research in background without blocking UI
            this.researchSystem.continueProjectResearch(
                project.id,
                researchOptions,
                (progress) => {
                    console.log(`Manual research progress: ${progress.percentage}% - ${progress.message}`);
                    // Trigger immediate UI refresh when progress updates
                    this.render(); // Full re-render to ensure fresh data
                }
            ).then(async () => {
                console.log(`✅ Manual research completed for project: ${project.name}`);
                this.runningResearch.delete(project.id);
                console.log(`🔓 DEBUG: Cleared running research flag: ${project.name}`);
                
                // Check if all topics are now complete, if so mark project as completed
                const updatedProject = this.projectTracker.getProject(project.id);
                const unfinishedItems = updatedProject?.checklist.filter(item => 
                    item.status === 'pending' || item.status === 'failed'
                ) || [];
                
                if (unfinishedItems.length === 0) {
                    // All topics complete - mark project as completed
                    const proj = this.projectTracker.getProject(project.id);
                    if (proj) {
                        proj.status = 'completed';
                        await this.projectTracker.saveProjects();
                    }
                    console.log(`🎉 Project fully completed: ${project.name}`);
                } else {
                    // Still has unfinished topics - pause so user can choose to continue
                    await this.projectTracker.pauseProject(project.id);
                    console.log(`⏸️ Project paused with ${unfinishedItems.length} unfinished items: ${project.name}`);
                }
                
                // Mark as recently completed to prevent immediate auto-research restart
                this.recentlyCompleted.add(project.id);
                setTimeout(() => {
                    this.recentlyCompleted.delete(project.id);
                }, 30000); // 30 second cooldown after completion
                
                this.render(); // Force full re-render to show updated statuses
            }).catch((error) => {
                console.error(`❌ Manual research failed for project ${project.name}:`, error);
                this.runningResearch.delete(project.id);
                this.render(); // Force full re-render even on error
            });
            
        } catch (error) {
            console.error('Error starting project research:', error);
            this.runningResearch.delete(project.id);
            new Notice('Failed to start project research');
        }
    }

    /**
     * Restart research for completed projects with unfinished topics
     */
    private async restartProjectResearch(project: ResearchProject): Promise<void> {
        try {
            // Find unfinished checklist items
            const unfinishedItems = project.checklist.filter(item => 
                item.status === 'pending' || item.status === 'failed'
            );

            if (unfinishedItems.length === 0) {
                new Notice('All topics in this project have been completed');
                return;
            }

            // Resume the project and start research on unfinished items
            await this.projectTracker.resumeProject(project.id);
            new Notice(`🔄 Starting research on ${unfinishedItems.length} unfinished topics: ${project.name}`);
            
            // Start comprehensive research for unfinished items using project settings + global API settings
            try {
                // Mark as running to prevent auto-research interference
                this.runningResearch.add(project.id);

                const researchOptions = {
                    enableWebSearch: project.settings.enableWebSearch,
                    saveIndividualPages: project.settings.saveIndividualPages,
                    searchVaultExactWords: project.settings.searchVaultExactWords,
                    enableSemanticSearch: project.settings.enableSemanticSearch,
                    aiEnhanceFinalNote: project.settings.aiEnhanceFinalNote,
                    maxWebSearchResults: project.settings.maxWebSearchResults,
                    outputFolder: project.settings.outputFolder,
                    customTemplate: project.settings.customTemplate
                };

                await this.researchSystem.continueProjectResearch(
                    project.id,
                    researchOptions,
                    (progress) => {
                        console.log(`Research progress: ${progress.percentage}% - ${progress.message}`);
                        // Trigger UI refresh when progress updates
                        this.refreshActiveProjects();
                    }
                );

                this.runningResearch.delete(project.id);
                
                // Mark as recently completed to prevent immediate auto-research restart
                this.recentlyCompleted.add(project.id);
                setTimeout(() => {
                    this.recentlyCompleted.delete(project.id);
                }, 30000); // 30 second cooldown after completion
                
                new Notice(`✅ Research completed for ${unfinishedItems.length} topics in: ${project.name}`);
            } catch (error) {
                console.error('Research continuation failed:', error);
                this.runningResearch.delete(project.id);
                new Notice(`❌ Research failed: ${error.message}`);
            }
            
            this.refreshActiveProjects();
        } catch (error) {
            console.error('Error restarting project research:', error);
            new Notice('Failed to restart project research');
        }
    }

    /**
     * Show confirmation dialog for removing a research topic
     */
    private async showTopicRemovalConfirmation(item: ChecklistItem, hasFiles: boolean): Promise<void> {
        const modal = new class extends Modal {
            constructor(app: any, item: ChecklistItem, hasFiles: boolean, onConfirm: (deleteFiles: boolean) => void) {
                super(app);
                this.item = item;
                this.hasFiles = hasFiles;
                this.onConfirm = onConfirm;
            }

            private item: ChecklistItem;
            private hasFiles: boolean;
            private onConfirm: (deleteFiles: boolean) => void;

            onOpen() {
                const { contentEl } = this;
                contentEl.empty();
                contentEl.addClass('topic-removal-confirmation-modal');

                // Header
                const header = contentEl.createEl('div', { cls: 'modal-header' });
                header.createEl('h2', { text: '🗑️ Remove Research Topic', cls: 'modal-title' });
                header.createEl('p', { 
                    text: `Are you sure you want to remove "${this.item.name}" from this project?`,
                    cls: 'modal-subtitle'
                });

                // Content
                const content = contentEl.createEl('div', { cls: 'modal-content' });
                content.style.cssText = 'margin: 20px 0;';

                // Topic info
                const topicInfo = content.createEl('div', { cls: 'topic-info-card' });
                topicInfo.style.cssText = `
                    background: var(--background-secondary);
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                `;

                topicInfo.createEl('div', { text: `📝 Topic: ${this.item.name}` });
                topicInfo.createEl('div', { text: `🏷️ Category: ${this.item.category}` });
                topicInfo.createEl('div', { text: `⚡ Priority: ${this.item.priority}` });
                topicInfo.createEl('div', { text: `📊 Status: ${this.item.status}` });

                // File handling options
                if (this.hasFiles) {
                    const filesSection = content.createEl('div', { cls: 'files-section' });
                    filesSection.createEl('h4', { text: '📁 Associated Files' });
                    filesSection.createEl('p', { 
                        text: 'This topic has associated research files. What would you like to do with them?',
                        cls: 'text-muted'
                    });

                    // Radio button group for file handling
                    const fileOptions = filesSection.createEl('div', { cls: 'file-options' });
                    fileOptions.style.cssText = 'margin: 12px 0; display: flex; flex-direction: column; gap: 8px;';

                    const preserveOption = fileOptions.createEl('label', { cls: 'file-option' });
                    preserveOption.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
                    const preserveRadio = preserveOption.createEl('input', { type: 'radio', attr: { name: 'fileAction', value: 'preserve' } });
                    preserveRadio.checked = true; // Default to preserve
                    preserveOption.createEl('span', { text: '💾 Keep files (remove only from project tracking)' });

                    const deleteOption = fileOptions.createEl('label', { cls: 'file-option' });
                    deleteOption.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
                    const deleteRadio = deleteOption.createEl('input', { type: 'radio', attr: { name: 'fileAction', value: 'delete' } });
                    deleteOption.createEl('span', { text: '🗑️ Delete files permanently' });

                    // Warning for delete option
                    const deleteWarning = filesSection.createEl('div', { cls: 'delete-warning' });
                    deleteWarning.style.cssText = `
                        background: var(--background-modifier-error);
                        border: 1px solid var(--background-modifier-border-focus);
                        border-radius: 4px;
                        padding: 8px;
                        margin-top: 8px;
                        font-size: 12px;
                        color: var(--text-error);
                        display: none;
                    `;
                    deleteWarning.innerHTML = '⚠️ <strong>Warning:</strong> This action cannot be undone. The associated research files will be permanently deleted from your vault.';

                    // Show/hide warning based on selection
                    const updateWarningVisibility = () => {
                        deleteWarning.style.display = deleteRadio.checked ? 'block' : 'none';
                    };

                    preserveRadio.addEventListener('change', updateWarningVisibility);
                    deleteRadio.addEventListener('change', updateWarningVisibility);
                }

                // Buttons
                const buttonContainer = contentEl.createEl('div', { cls: 'modal-buttons' });
                buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;';

                const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel', type: 'button' });
                cancelBtn.addEventListener('click', () => this.close());

                const confirmBtn = buttonContainer.createEl('button', { 
                    text: '🗑️ Remove Topic',
                    type: 'button',
                    cls: 'mod-warning'
                });

                confirmBtn.addEventListener('click', () => {
                    let deleteFiles = false;
                    if (this.hasFiles) {
                        const deleteRadio = contentEl.querySelector('input[name="fileAction"][value="delete"]') as HTMLInputElement;
                        deleteFiles = deleteRadio?.checked || false;
                    }
                    this.onConfirm(deleteFiles);
                    this.close();
                });
            }
        }(this.app, item, hasFiles, async (deleteFiles: boolean) => {
            try {
                await this.projectTracker.removeTopicFromProject(
                    this.getProjectByChecklistItem(item)?.id || '',
                    item.id,
                    deleteFiles
                );
                this.render(); // Refresh the view
            } catch (error) {
                console.error('Failed to remove topic:', error);
                new Notice(`❌ Failed to remove topic: ${error.message}`);
            }
        });

        modal.open();
    }

    /**
     * Show modal displaying associated files for a topic
     */
    private showTopicFiles(item: ChecklistItem, associatedFiles: GeneratedNoteInfo[]): void {
        const modal = new class extends Modal {
            constructor(app: any, item: ChecklistItem, files: GeneratedNoteInfo[]) {
                super(app);
                this.item = item;
                this.files = files;
            }

            private item: ChecklistItem;
            private files: GeneratedNoteInfo[];

            onOpen() {
                const { contentEl } = this;
                contentEl.empty();
                contentEl.addClass('topic-files-modal');

                // Header
                const header = contentEl.createEl('div', { cls: 'modal-header' });
                header.createEl('h2', { text: '📄 Associated Files', cls: 'modal-title' });
                header.createEl('p', { 
                    text: `Files generated for topic: ${this.item.name}`,
                    cls: 'modal-subtitle'
                });

                // Files list
                const filesList = contentEl.createEl('div', { cls: 'files-list' });
                filesList.style.cssText = 'max-height: 400px; overflow-y: auto; margin: 16px 0;';

                this.files.forEach(file => {
                    const fileItem = filesList.createEl('div', { cls: 'file-item' });
                    fileItem.style.cssText = `
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 8px 12px;
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 4px;
                        margin-bottom: 8px;
                        background: var(--background-secondary);
                    `;

                    const fileInfo = fileItem.createEl('div', { cls: 'file-info' });
                    fileInfo.style.cssText = 'flex: 1;';

                    const fileName = fileInfo.createEl('div', { cls: 'file-name' });
                    fileName.textContent = file.filePath.split('/').pop() || file.filePath;
                    fileName.style.cssText = 'font-weight: 500; margin-bottom: 4px;';

                    const filePath = fileInfo.createEl('div', { cls: 'file-path' });
                    filePath.textContent = file.filePath;
                    filePath.style.cssText = 'font-size: 12px; color: var(--text-muted);';

                    const fileDate = fileInfo.createEl('div', { cls: 'file-date' });
                    fileDate.textContent = `Created: ${new Date(file.createdAt).toLocaleString()}`;
                    fileDate.style.cssText = 'font-size: 11px; color: var(--text-muted); margin-top: 2px;';

                    const fileActions = fileItem.createEl('div', { cls: 'file-actions' });
                    
                    const openBtn = fileActions.createEl('button', {
                        text: '🔗 Open',
                        type: 'button'
                    });
                    openBtn.style.cssText = 'padding: 4px 8px; font-size: 12px; margin-left: 8px;';
                    
                    openBtn.addEventListener('click', async () => {
                        const vaultFile = this.app.vault.getAbstractFileByPath(file.filePath);
                        if (vaultFile) {
                            await this.app.workspace.openLinkText(vaultFile.path, '');
                            this.close();
                        } else {
                            new Notice(`File not found: ${file.filePath}`);
                        }
                    });
                });

                // Close button
                const buttonContainer = contentEl.createEl('div', { cls: 'modal-buttons' });
                buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 16px;';

                const closeBtn = buttonContainer.createEl('button', { text: 'Close', type: 'button' });
                closeBtn.addEventListener('click', () => this.close());
            }
        }(this.app, item, associatedFiles);

        modal.open();
    }

    /**
     * Find project containing a specific checklist item
     */
    private getProjectByChecklistItem(item: ChecklistItem): ResearchProject | undefined {
        for (const project of this.projectTracker.getActiveProjects()) {
            if (project.checklist.find(checklistItem => checklistItem.id === item.id)) {
                return project;
            }
        }
        return undefined;
    }
}