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
import { ProjectSettingsView, PROJECT_SETTINGS_VIEW_TYPE } from './project-settings-view';
import { ResearchTopicProgressTracker, TopicProgress } from './components/research-topic-progress';

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
    private topicProgressTracker: ResearchTopicProgressTracker | null = null;
    private progressCallback: ((progress: TopicProgress) => void) | null = null;

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
        this.setupTopicProgressTracking();
    }

    async onClose(): Promise<void> {
        console.log('🔬 Research Agent Sidebar: Closing view');
        this.stopRealTimeUpdates();
        this.cleanupTopicProgressTracking();
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

        // Minimal polling since progress tracker now provides real-time updates via callbacks
        this.updateInterval = window.setInterval(() => {
            if (this.isInitialized) {
                // Only check for new auto-research opportunities periodically
                // Progress updates are handled by the callback system now
                this.checkForActiveResearch();
            }
        }, 10000); // 10 seconds - only for auto-research detection

        console.log('🔄 Research Agent Sidebar: Started periodic updates (10s interval for auto-research only)');
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
                        // Progress updates are now handled by the progress tracker callback system
                    }
                ).then(() => {
                    console.log(`✅ Auto-research completed for project: ${project.name}`);
                    this.runningResearch.delete(project.id);
                    
                    // Mark as recently completed to prevent immediate restart
                    this.recentlyCompleted.add(project.id);
                    setTimeout(() => {
                        this.recentlyCompleted.delete(project.id);
                    }, 30000); // 30 second cooldown after completion
                    
                    // Final refresh only when research is complete
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

        // Showcase Mode toggle button
        const showcaseBtn = header.createEl('button', {
            cls: 'research-showcase-btn',
            title: 'Toggle Showcase Mode (Framework Testing)'
        });
        const updateShowcaseButton = () => {
            const status = this.researchSystem.getShowcaseStatus();
            showcaseBtn.innerHTML = status.enabled ? '🎭' : '🔬';
            showcaseBtn.style.background = status.enabled ? 'var(--color-accent)' : '';
        };
        updateShowcaseButton();
        
        showcaseBtn.addEventListener('click', () => {
            const status = this.researchSystem.getShowcaseStatus();
            if (status.enabled) {
                this.researchSystem.disableShowcaseMode();
                new Notice('🔬 Production Mode: Full AI research workflow');
            } else {
                this.researchSystem.enableShowcaseMode({
                    templateVariables: true,
                    includeRealData: true,
                    mockDataSample: "Sample AI-generated content for framework testing"
                });
                new Notice('🎭 Showcase Mode: Framework testing with template variables');
            }
            updateShowcaseButton();
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
        
        // Play/pause button (don't show for archived or 100% completed projects)
        // Move this right after status emoji, before project title
        const isFullyCompleted = project.progress.completed === project.progress.total && project.progress.total > 0;
        if (project.status !== 'archived' && !isFullyCompleted) {
            const playPauseBtn = projectHeader.createEl('button', { cls: 'project-play-pause-btn left-positioned' });
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
        
        const projectTitle = projectHeader.createSpan({ cls: 'project-title' });
        projectTitle.textContent = project.name;
        projectTitle.style.userSelect = 'text';
        
        // Project action buttons section
        const projectActionsSection = projectHeader.createDiv({ cls: 'project-actions-section' });
        
        // Cards button
        const projectCardsBtn = projectActionsSection.createEl('button', {
            cls: 'project-action-btn cards-btn',
            text: '🗃️',
            attr: { title: 'View project cards' }
        });
        projectCardsBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleProjectCardsAction(project);
        };
        
        // Quiz button
        const projectQuizBtn = projectActionsSection.createEl('button', {
            cls: 'project-action-btn quiz-btn',
            text: '📝',
            attr: { title: 'Take project quiz' }
        });
        projectQuizBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleProjectQuizAction(project);
        };
        
        // Conversation button
        const projectConversationBtn = projectActionsSection.createEl('button', {
            cls: 'project-action-btn conversation-btn',
            text: '🔊',
            attr: { title: 'Start project conversation' }
        });
        projectConversationBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleProjectConversationAction(project);
        };
        
        // Refresh button
        const projectRefreshBtn = projectActionsSection.createEl('button', {
            cls: 'project-utility-btn refresh-btn',
            text: '🔃',
            attr: { title: 'Refresh project' }
        });
        projectRefreshBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleProjectRefreshAction(project);
        };
        
        // Trash button
        const projectTrashBtn = projectActionsSection.createEl('button', {
            cls: 'project-utility-btn trash-btn',
            text: '🗑️',
            attr: { title: 'Delete project' }
        });
        projectTrashBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleProjectTrashAction(project);
        };
        
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

        // Project tab view container
        const projectTabContainer = projectDetails.createDiv({ cls: 'project-tab-container' });
        
        // Tab navigation
        const tabNavigation = projectTabContainer.createDiv({ cls: 'project-tab-nav' });
        
        // Add Topic tab
        const addTopicTab = tabNavigation.createEl('button', { 
            cls: 'project-tab-btn active',
            attr: { 'data-tab': 'add-topic' }
        });
        addTopicTab.textContent = '+ Add Topic';
        
        // Project Settings tab
        const settingsTab = tabNavigation.createEl('button', { 
            cls: 'project-tab-btn',
            attr: { 'data-tab': 'settings' }
        });
        settingsTab.textContent = '⚙️ Settings';
        
        // Tab content container
        const tabContentContainer = projectTabContainer.createDiv({ cls: 'project-tab-content' });
        
        // Add Topic content (default visible)
        const addTopicContent = tabContentContainer.createDiv({ 
            cls: 'project-tab-panel active',
            attr: { 'data-panel': 'add-topic' }
        });
        
        // Add topics form
        const addTopicsForm = addTopicContent.createEl('form', { cls: 'add-topics-form' });
        
        // Topics textarea
        const topicsLabel = addTopicsForm.createEl('label', { 
            text: 'Enter topics, one per line:',
            cls: 'topics-label' 
        });
        const topicsTextarea = addTopicsForm.createEl('textarea', {
            cls: 'topics-textarea',
            attr: { 
                placeholder: 'Topic 1\nTopic 2\nTopic 3...',
                rows: '4'
            }
        });
        
        // Add topics button
        const addTopicsBtn = addTopicsForm.createEl('button', { 
            cls: 'add-topics-submit-btn',
            text: '+ Add Topics',
            type: 'button'
        });
        
        addTopicsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const topicsText = topicsTextarea.value.trim();
            if (!topicsText) {
                new Notice('Please enter at least one topic');
                return;
            }
            
            const topics = topicsText.split('\n').filter(t => t.trim()).map(t => t.trim());
            if (topics.length > 0) {
                try {
                    await this.addTopicsToProject(project, topics);
                    new Notice(`✅ Added ${topics.length} topics to ${project.name}`);
                    topicsTextarea.value = ''; // Clear the textarea
                    this.refreshActiveProjects(); // Refresh to show new topics
                } catch (error) {
                    console.error('Error adding topics:', error);
                    new Notice('❌ Failed to add topics');
                }
            }
        });
        
        // Project Settings content (initially hidden)
        const settingsContent = tabContentContainer.createDiv({ 
            cls: 'project-tab-panel',
            attr: { 'data-panel': 'settings' }
        });
        
        // We'll populate settings content inline instead of opening a separate view
        this.renderInlineProjectSettings(settingsContent, project);
        
        // Tab switching logic
        const switchTab = (activeTabName: string) => {
            // Update tab buttons
            tabNavigation.querySelectorAll('.project-tab-btn').forEach(tab => {
                if (tab.getAttribute('data-tab') === activeTabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // Update tab panels
            tabContentContainer.querySelectorAll('.project-tab-panel').forEach(panel => {
                if (panel.getAttribute('data-panel') === activeTabName) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        };
        
        // Add click handlers for tabs
        addTopicTab.addEventListener('click', (e) => {
            e.stopPropagation();
            switchTab('add-topic');
        });
        
        settingsTab.addEventListener('click', (e) => {
            e.stopPropagation();
            switchTab('settings');
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
        
        // Left section with status icon and name
        const leftSection = itemEl.createDiv({ cls: 'item-left-section' });
        
        const itemIcon = leftSection.createSpan({ cls: 'item-icon' });
        // Calculate progress for processing items
        const progressPercentage = item.status === 'processing' ? this.estimateItemProgress(item) : undefined;
        itemIcon.textContent = this.getItemStatusIcon(item.status, progressPercentage);
        
        const itemName = leftSection.createSpan({ cls: 'item-name' });
        itemName.textContent = item.name;
        
        // Center section with action buttons
        const centerSection = itemEl.createDiv({ cls: 'item-center-section' });
        
        // Cards button
        const cardsBtn = centerSection.createEl('button', {
            cls: 'item-action-btn cards-btn',
            text: '🗃️',
            attr: { title: 'View cards' }
        });
        cardsBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleCardsAction(item);
        };
        
        // Quiz button
        const quizBtn = centerSection.createEl('button', {
            cls: 'item-action-btn quiz-btn',
            text: '📝',
            attr: { title: 'Take quiz' }
        });
        quizBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleQuizAction(item);
        };
        
        // Conversation button
        const conversationBtn = centerSection.createEl('button', {
            cls: 'item-action-btn conversation-btn',
            text: '🔊',
            attr: { title: 'Start conversation' }
        });
        conversationBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleConversationAction(item);
        };
        
        // Right section with utility buttons
        const rightSection = itemEl.createDiv({ cls: 'item-right-section' });
        
        // Refresh button
        const refreshBtn = rightSection.createEl('button', {
            cls: 'item-utility-btn refresh-btn',
            text: '🔃',
            attr: { title: 'Refresh topic' }
        });
        refreshBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleRefreshAction(item);
        };
        
        // Trashcan button
        const trashBtn = rightSection.createEl('button', {
            cls: 'item-utility-btn trash-btn',
            text: '🗑️',
            attr: { title: 'Delete topic' }
        });
        trashBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleTrashAction(item);
        };
        
        // Click to open research note if available  
        // Check both noteId and if file exists based on standard naming convention
        if (item.status === 'completed') {
            const project = this.getCurrentProject(item);
            if (project && (item.noteId || this.findResearchNoteForItem(project, item))) {
                leftSection.addClass('clickable');
                leftSection.addEventListener('click', () => {
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
            this.openTemplateManager();
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
                    this.showProjectSettings(project);
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
     * Show project settings in dedicated view (replaces modal)
     */
    private showProjectSettings(project: ResearchProject): void {
        const leaf = this.app.workspace.getLeaf('split', 'vertical');
        const settingsView = new ProjectSettingsView(
            leaf, 
            this.plugin, 
            project,
            () => {
                // Back button callback - return to research agent view
                leaf.detach();
                this.render(); // Refresh the main view to show any changes
            }
        );
        
        leaf.open(settingsView);
    }

    /**
     * Start comprehensive research for a project with progress tracking
     */
    private async startProjectResearch(project: ResearchProject): Promise<void> {
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
                        // Progress updates are now handled by the progress tracker callback system
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

    /**
     * Setup topic progress tracking
     */
    private setupTopicProgressTracking(): void {
        if (this.topicProgressTracker) {
            this.topicProgressTracker.clearAll();
        }

        // Create progress tracker container
        const progressContainer = this.containerEl.createEl('div', {
            cls: 'research-topic-progress-container'
        });
        progressContainer.style.cssText = `
            position: sticky;
            top: 0;
            background: var(--background-primary);
            z-index: 10;
            padding: 8px 0;
            border-bottom: 1px solid var(--background-modifier-border);
            margin-bottom: 8px;
        `;

        // Initialize progress tracker
        this.topicProgressTracker = new ResearchTopicProgressTracker(progressContainer);

        // Register progress callback with research system
        if (this.researchSystem) {
            this.progressCallback = (progress: TopicProgress) => {
                if (this.topicProgressTracker) {
                    this.topicProgressTracker.updateProgress(progress);
                }
            };
            // Check if onProgressUpdate method exists before calling
            if (typeof this.researchSystem.onProgressUpdate === 'function') {
                this.researchSystem.onProgressUpdate(this.progressCallback);
            } else {
                console.log('🔬 Research system does not support progress callbacks');
            }
        }

        console.log('✅ Topic progress tracking setup complete');
    }

    /**
     * Cleanup topic progress tracking
     */
    private cleanupTopicProgressTracking(): void {
        if (this.topicProgressTracker) {
            this.topicProgressTracker.clearAll();
            this.topicProgressTracker = null;
        }

        // Remove progress callback
        if (this.researchSystem && this.progressCallback) {
            // Check if offProgressUpdate method exists before calling
            if (typeof this.researchSystem.offProgressUpdate === 'function') {
                this.researchSystem.offProgressUpdate(this.progressCallback);
            }
            this.progressCallback = null;
        }

        console.log('🧹 Topic progress tracking cleanup complete');
    }

    /**
     * Placeholder handler methods for research topic action buttons
     */
    private handleCardsAction(item: ChecklistItem): void {
        console.log(`🗃️ Cards action triggered for topic: ${item.name}`);
        new Notice(`🗃️ Cards feature coming soon for: ${item.name}`);
        // TODO: Implement cards functionality
    }

    private handleQuizAction(item: ChecklistItem): void {
        console.log(`📝 Quiz action triggered for topic: ${item.name}`);
        new Notice(`📝 Quiz feature coming soon for: ${item.name}`);
        // TODO: Implement quiz functionality
    }

    private handleConversationAction(item: ChecklistItem): void {
        console.log(`🔊 Conversation action triggered for topic: ${item.name}`);
        new Notice(`🔊 Conversation feature coming soon for: ${item.name}`);
        // TODO: Implement conversation functionality
    }

    private handleRefreshAction(item: ChecklistItem): void {
        console.log(`🔃 Refresh action triggered for topic: ${item.name}`);
        new Notice(`🔃 Refreshing topic: ${item.name}`);
        // TODO: Implement refresh functionality
        // This could trigger re-research or data refresh for the topic
    }

    private handleTrashAction(item: ChecklistItem): void {
        console.log(`🗑️ Trash action triggered for topic: ${item.name}`);
        this.showDeleteTopicConfirmation(item);
    }

    /**
     * Show fun delete confirmation modal with keep/delete files toggle
     */
    private showDeleteTopicConfirmation(item: ChecklistItem): void {
        const modal = new Modal(this.app);
        modal.modalEl.addClass('delete-topic-modal');

        // Modal content
        const content = modal.contentEl;
        content.empty();

        // Header with emoji and title
        const header = content.createDiv({ cls: 'delete-modal-header' });
        header.createDiv({ cls: 'delete-modal-emoji', text: '🗑️' });
        header.createEl('h2', { 
            cls: 'delete-modal-title',
            text: `Delete Research Topic?` 
        });
        header.createDiv({ 
            cls: 'delete-modal-subtitle',
            text: `"${item.name}"` 
        });

        // Fun toggle section for files
        const toggleSection = content.createDiv({ cls: 'file-action-toggle-section' });
        
        const toggleLabel = toggleSection.createDiv({ 
            cls: 'toggle-label',
            text: '📄 What should we do with the research files?' 
        });

        const toggleContainer = toggleSection.createDiv({ cls: 'fun-toggle-container' });
        
        // Keep files option (left side)
        const keepOption = toggleContainer.createDiv({ cls: 'toggle-option keep-option active' });
        keepOption.createDiv({ cls: 'toggle-emoji', text: '💾' });
        keepOption.createDiv({ cls: 'toggle-text', text: 'Keep Files' });
        keepOption.createDiv({ cls: 'toggle-subtext', text: 'Files stay safe!' });

        // Delete files option (right side)
        const deleteOption = toggleContainer.createDiv({ cls: 'toggle-option delete-option' });
        deleteOption.createDiv({ cls: 'toggle-emoji', text: '🔥' });
        deleteOption.createDiv({ cls: 'toggle-text', text: 'Delete Files' });
        deleteOption.createDiv({ cls: 'toggle-subtext', text: 'Gone forever!' });

        // Toggle state
        let deleteFiles = false;

        // Toggle functionality
        const updateToggle = (shouldDeleteFiles: boolean) => {
            deleteFiles = shouldDeleteFiles;
            if (shouldDeleteFiles) {
                keepOption.removeClass('active');
                deleteOption.addClass('active');
            } else {
                deleteOption.removeClass('active');
                keepOption.addClass('active');
            }
        };

        keepOption.addEventListener('click', () => updateToggle(false));
        deleteOption.addEventListener('click', () => updateToggle(true));

        // Action buttons
        const buttonContainer = content.createDiv({ cls: 'delete-modal-buttons' });
        
        const cancelBtn = buttonContainer.createEl('button', {
            cls: 'delete-modal-btn cancel-btn',
            text: '❌ Cancel'
        });
        
        const confirmBtn = buttonContainer.createEl('button', {
            cls: 'delete-modal-btn confirm-btn',
            text: '🗑️ Delete Topic'
        });

        // Event handlers
        cancelBtn.addEventListener('click', () => {
            modal.close();
        });

        confirmBtn.addEventListener('click', async () => {
            modal.close();
            await this.executeTopicDeletion(item, deleteFiles);
        });

        modal.open();
    }

    /**
     * Execute the actual topic deletion
     */
    private async executeTopicDeletion(item: ChecklistItem, deleteFiles: boolean): void {
        try {
            // First, try the existing method
            let project = this.getCurrentProject(item);
            
            // If that fails, try to find it in the currently loaded active projects
            if (!project) {
                try {
                    const currentActiveProjects = this.projectTracker.getActiveProjects();
                    project = currentActiveProjects.find((p: any) => 
                        p.checklist && p.checklist.some((i: any) => i.id === item.id)
                    );
                    console.log(`🔍 Found project in current active projects: ${project?.name || 'not found'}`);
                } catch (error) {
                    console.error('Error getting active projects:', error);
                }
            }
            
            // If still no project, try a broader search
            if (!project) {
                console.log(`🔍 Searching for project with item ID: ${item.id}, item name: ${item.name}`);
                
                // Try to get all projects from project tracker
                try {
                    const allActiveProjects = this.projectTracker.getActiveProjects();
                    const allArchivedProjects = this.projectTracker.getArchivedProjects();
                    console.log(`🔍 Found ${allActiveProjects.length} active and ${allArchivedProjects.length} archived projects`);
                    
                    const allProjects = [...allActiveProjects, ...allArchivedProjects];
                    project = allProjects.find(p => {
                        if (p && p.checklist && Array.isArray(p.checklist)) {
                            return p.checklist.some(i => i && i.id === item.id);
                        }
                        return false;
                    });
                    
                    if (project) {
                        console.log(`🔍 Found project: ${project.name}`);
                    } else {
                        console.log(`🔍 Could not find project in ${allProjects.length} total projects`);
                        // Debug: log all project IDs and their checklists
                        allProjects.forEach(p => {
                            if (p && p.checklist) {
                                console.log(`Project "${p.name}": ${p.checklist.length} items, IDs: [${p.checklist.map(i => i?.id).join(', ')}]`);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error accessing project tracker:', error);
                }
            }
            
            if (!project) {
                new Notice('❌ Could not find project for this topic. Check console for debugging info.');
                return;
            }

            // Show deletion in progress
            const deleteEmoji = deleteFiles ? '🔥' : '💾';
            const actionText = deleteFiles ? 'files deleted' : 'files kept';
            new Notice(`🗑️ Deleting topic "${item.name}" (${actionText})...`);

            // Delete associated files if requested
            if (deleteFiles && item.status === 'completed') {
                await this.deleteTopicFiles(item, project);
            }

            // Remove topic from project
            await this.removeTopicFromProject(project.id, item.id);
            
            // Refresh the sidebar
            this.refreshActiveProjects();
            
            new Notice(`✅ Topic "${item.name}" deleted successfully! ${deleteEmoji}`);
            
        } catch (error) {
            console.error('Failed to delete topic:', error);
            new Notice(`❌ Failed to delete topic: ${error.message}`);
        }
    }

    /**
     * Delete files associated with a research topic
     */
    private async deleteTopicFiles(item: ChecklistItem, project: any): Promise<void> {
        try {
            // Find the research note file
            const notePath = item.noteId || this.getStandardNotePath(project, item);
            if (notePath) {
                const file = this.app.vault.getAbstractFileByPath(notePath);
                if (file) {
                    await this.app.vault.delete(file);
                    console.log(`🔥 Deleted research file: ${notePath}`);
                }
            }

            // Delete any web search notes directory (recursively)
            const webNotesPath = `${project.settings.outputFolder}/Web Search - ${item.name}`;
            const webNotesFolder = this.app.vault.getAbstractFileByPath(webNotesPath);
            if (webNotesFolder) {
                await this.app.vault.delete(webNotesFolder, true); // true = force recursive delete
                console.log(`🔥 Deleted web search folder: ${webNotesPath}`);
            }
        } catch (error) {
            console.error('Error deleting topic files:', error);
            throw new Error(`Failed to delete files: ${error.message}`);
        }
    }

    /**
     * Remove topic from project
     */
    private async removeTopicFromProject(projectId: string, itemId: string): Promise<void> {
        try {
            const project = this.projectTracker.getProject(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            // Remove the item from the checklist
            project.checklist = project.checklist.filter(item => item.id !== itemId);
            
            // Update project progress
            const completedCount = project.checklist.filter(item => item.status === 'completed').length;
            const failedCount = project.checklist.filter(item => item.status === 'failed').length;
            project.progress = {
                completed: completedCount,
                total: project.checklist.length,
                failed: failedCount
            };

            // Save the updated project (access through public method if available)
            // For now, the project should be automatically saved when modified
            
            console.log(`🗑️ Removed topic ${itemId} from project ${projectId}`);
        } catch (error) {
            console.error('Error removing topic from project:', error);
            throw new Error(`Failed to update project: ${error.message}`);
        }
    }


    /**
     * Placeholder handler methods for research project action buttons
     */
    private handleProjectCardsAction(project: ResearchProject): void {
        console.log(`🗃️ Project Cards action triggered for: ${project.name}`);
        new Notice(`🗃️ Project Cards feature coming soon for: ${project.name}`);
        // TODO: Implement project cards functionality
    }

    private handleProjectQuizAction(project: ResearchProject): void {
        console.log(`📝 Project Quiz action triggered for: ${project.name}`);
        new Notice(`📝 Project Quiz feature coming soon for: ${project.name}`);
        // TODO: Implement project quiz functionality
    }

    private handleProjectConversationAction(project: ResearchProject): void {
        console.log(`🔊 Project Conversation action triggered for: ${project.name}`);
        new Notice(`🔊 Project Conversation feature coming soon for: ${project.name}`);
        // TODO: Implement project conversation functionality
    }

    private handleProjectRefreshAction(project: ResearchProject): void {
        console.log(`🔃 Project Refresh action triggered for: ${project.name}`);
        new Notice(`🔃 Refreshing project: ${project.name}`);
        // TODO: Implement project refresh functionality
        // This could trigger re-research or data refresh for the entire project
    }

    private handleProjectTrashAction(project: ResearchProject): void {
        console.log(`🗑️ Project Trash action triggered for: ${project.name}`);
        new Notice(`🗑️ Project delete feature coming soon for: ${project.name}`);
        // TODO: Implement project delete functionality
        // This should probably use the existing cancelProject method
    }

    /**
     * Render inline project settings within the tab
     */
    private renderInlineProjectSettings(container: HTMLElement, project: ResearchProject): void {
        container.empty();
        
        // Settings form
        const settingsForm = container.createEl('form', { cls: 'inline-settings-form' });
        
        // Output folder setting
        const outputFolderGroup = settingsForm.createDiv({ cls: 'settings-group' });
        outputFolderGroup.createEl('label', { text: 'Output Folder:' });
        const outputFolderInput = outputFolderGroup.createEl('input', {
            type: 'text',
            cls: 'settings-input',
            attr: { value: project.settings.outputFolder || 'Generated Research Notes' }
        });
        
        // Research options
        const optionsGroup = settingsForm.createDiv({ cls: 'settings-group' });
        optionsGroup.createEl('h4', { text: 'Research Options' });
        
        // Web search toggle
        const webSearchLabel = optionsGroup.createEl('label', { cls: 'checkbox-label' });
        const webSearchCheckbox = webSearchLabel.createEl('input', { type: 'checkbox' });
        webSearchCheckbox.checked = project.settings.enableWebSearch;
        webSearchLabel.createSpan({ text: 'Enable web search' });
        
        // Save individual pages toggle
        const saveIndividualLabel = optionsGroup.createEl('label', { cls: 'checkbox-label' });
        const saveIndividualCheckbox = saveIndividualLabel.createEl('input', { type: 'checkbox' });
        saveIndividualCheckbox.checked = project.settings.saveIndividualPages;
        saveIndividualLabel.createSpan({ text: 'Save individual pages' });
        
        // Vault search toggle
        const vaultSearchLabel = optionsGroup.createEl('label', { cls: 'checkbox-label' });
        const vaultSearchCheckbox = vaultSearchLabel.createEl('input', { type: 'checkbox' });
        vaultSearchCheckbox.checked = project.settings.searchVaultExactWords;
        vaultSearchLabel.createSpan({ text: 'Search vault for exact words' });
        
        // AI enhance toggle
        const aiEnhanceLabel = optionsGroup.createEl('label', { cls: 'checkbox-label' });
        const aiEnhanceCheckbox = aiEnhanceLabel.createEl('input', { type: 'checkbox' });
        aiEnhanceCheckbox.checked = project.settings.aiEnhanceFinalNote;
        aiEnhanceLabel.createSpan({ text: 'AI enhance final notes' });
        
        // Advanced settings
        const advancedGroup = settingsForm.createDiv({ cls: 'settings-group' });
        advancedGroup.createEl('h4', { text: 'Advanced Settings' });
        
        // Max web search results
        const maxResultsLabel = advancedGroup.createEl('label', { text: 'Max web search results per item:' });
        const maxResultsInput = advancedGroup.createEl('input', {
            type: 'number',
            cls: 'settings-input',
            attr: { 
                value: String(project.settings.maxWebSearchResults || 10),
                min: '5',
                max: '20'
            }
        });
        
        // Custom template selection
        const templateLabel = advancedGroup.createEl('label', { text: 'Template:' });
        const templateSelect = advancedGroup.createEl('select', { cls: 'settings-select' });
        
        // Template options (same as in Research Template Manager)
        const templateOptions = [
            { value: 'research-standard', name: 'Research Standard' },
            { value: 'research-minimal', name: 'Research Minimal' },
            { value: 'research-scientific', name: 'Research Scientific' },
            { value: 'custom', name: 'Custom Template' }
        ];
        
        templateOptions.forEach(template => {
            const option = templateSelect.createEl('option', { 
                text: template.name,
                attr: { value: template.value }
            });
            if (template.value === (project.settings.customTemplate || 'research-standard')) {
                option.selected = true;
            }
        });
        
        // Save button
        const saveBtn = settingsForm.createEl('button', {
            cls: 'save-settings-btn',
            text: '💾 Save Settings',
            type: 'button'
        });
        
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            try {
                // Update project settings
                const updatedSettings = {
                    outputFolder: outputFolderInput.value || 'Generated Research Notes',
                    enableWebSearch: webSearchCheckbox.checked,
                    saveIndividualPages: saveIndividualCheckbox.checked,
                    searchVaultExactWords: vaultSearchCheckbox.checked,
                    aiEnhanceFinalNote: aiEnhanceCheckbox.checked,
                    maxWebSearchResults: parseInt(maxResultsInput.value) || 10,
                    customTemplate: templateSelect.value,
                    // Keep existing settings for other fields
                    enableSemanticSearch: project.settings.enableSemanticSearch
                };
                
                await this.projectTracker.updateProjectSettings(project.id, updatedSettings);
                new Notice(`✅ Settings updated for: ${project.name}`);
            } catch (error) {
                console.error('Failed to save settings:', error);
                new Notice('❌ Failed to save settings');
            }
        });
    }

    /**
     * Open template manager modal
     */
    private openTemplateManager(): void {
        const modal = new ResearchTemplateModal(this.app, this.plugin);
        modal.open();
    }
}

/**
 * Research Template Management Modal
 */
class ResearchTemplateModal extends Modal {
    plugin: ClippyPlugin;
    currentTemplate: string = 'research-standard';
    textArea: HTMLTextAreaElement;

    constructor(app: App, plugin: ClippyPlugin) {
        super(app);
        this.plugin = plugin;
        this.currentTemplate = plugin.settings.research.defaults.template;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: '📋 Research Template Manager' });
        contentEl.createEl('p', { 
            text: 'View, edit, and customize research note templates. Templates use {{variables}} for dynamic content.',
            cls: 'setting-item-description'
        });

        // Template Selection
        const templateSection = contentEl.createEl('div', { cls: 'template-selection-section' });
        templateSection.style.cssText = 'margin: 16px 0;';

        const templateHeader = templateSection.createEl('h3', { text: 'Template Selection' });
        const templateControls = templateSection.createEl('div', { cls: 'template-controls' });
        templateControls.style.cssText = 'display: flex; gap: 12px; align-items: center; margin: 12px 0;';

        const dropdown = templateControls.createEl('select', { cls: 'dropdown' });
        dropdown.style.cssText = 'flex: 0 0 200px;';

        const templates = [
            { value: 'research-standard', name: 'Research Standard' },
            { value: 'research-minimal', name: 'Research Minimal' },
            { value: 'research-scientific', name: 'Research Scientific' },
            { value: 'custom', name: 'Custom Template' }
        ];

        templates.forEach(template => {
            const option = dropdown.createEl('option', { 
                text: template.name,
                attr: { value: template.value }
            });
            if (template.value === this.currentTemplate) {
                option.selected = true;
            }
        });

        // Template Actions
        const setDefaultBtn = templateControls.createEl('button', {
            text: '⭐ Set as Default',
            type: 'button'
        });
        setDefaultBtn.style.cssText = 'padding: 6px 12px; font-size: 12px;';

        // Available Variables Section
        const variablesSection = contentEl.createEl('div', { cls: 'variables-section' });
        variablesSection.style.cssText = 'margin: 20px 0;';

        variablesSection.createEl('h3', { text: 'Available Variables' });
        
        const variablesGrid = variablesSection.createEl('div', { cls: 'variables-grid' });
        variablesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 8px;
            margin: 12px 0;
            font-family: var(--font-monospace);
            font-size: 11px;
        `;

        const variables = [
            { var: '{{tags}}', desc: 'AI-generated vault-aware tags' },
            { var: '{{projectName}}', desc: 'Research project name' },
            { var: '{{topicName}}', desc: 'Current research topic' },
            { var: '{{today}}', desc: 'Current date (YYYY-MM-DD)' },
            { var: '{{EXTRACTED_WISDOM}}', desc: 'AI-synthesized insights' },
            { var: '{{VAULT_SEARCH_RESULTS}}', desc: 'Relevant vault content' },
            { var: '{{WEB_SEARCH_RESULTS}}', desc: 'Web research findings' },
            { var: '{{RESEARCH_BACKLINKS}}', desc: 'Related concept links' }
        ];

        variables.forEach(v => {
            const varDiv = variablesGrid.createEl('div', { cls: 'variable-item' });
            varDiv.style.cssText = `
                padding: 6px 8px;
                background: var(--background-secondary);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            `;
            
            const varName = varDiv.createEl('div', { text: v.var });
            varName.style.cssText = 'color: var(--color-accent); font-weight: 500;';
            
            const varDesc = varDiv.createEl('div', { text: v.desc });
            varDesc.style.cssText = 'color: var(--text-muted); font-size: 10px; margin-top: 2px;';
        });

        // Template Editor
        const editorSection = contentEl.createEl('div', { cls: 'template-editor-section' });
        editorSection.style.cssText = 'margin: 20px 0;';

        editorSection.createEl('h3', { text: 'Template Content' });

        this.textArea = editorSection.createEl('textarea', { cls: 'template-editor' });
        this.textArea.style.cssText = `
            width: 100%;
            height: 300px;
            font-family: var(--font-monospace);
            font-size: 12px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            padding: 12px;
            background: var(--background-primary);
            color: var(--text-normal);
            resize: vertical;
        `;

        // Load current template
        this.loadTemplate().catch(error => {
            console.error('Failed to load initial template:', error);
        });

        // Action Buttons
        const buttonSection = contentEl.createEl('div', { cls: 'template-actions' });
        buttonSection.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;';

        const saveBtn = buttonSection.createEl('button', { 
            text: '💾 Save Template', 
            type: 'button', 
            cls: 'mod-cta' 
        });

        const resetBtn = buttonSection.createEl('button', { 
            text: '🔄 Reset to Default', 
            type: 'button' 
        });

        const closeBtn = buttonSection.createEl('button', { 
            text: 'Close', 
            type: 'button' 
        });

        // Event Handlers
        dropdown.addEventListener('change', () => {
            this.currentTemplate = dropdown.value;
            this.loadTemplate().catch(error => {
                console.error('Failed to load template:', error);
            });
        });

        setDefaultBtn.addEventListener('click', async () => {
            this.plugin.settings.research.defaults.template = this.currentTemplate;
            await this.plugin.saveSettings();
            new Notice(`✅ Set "${templates.find(t => t.value === this.currentTemplate)?.name}" as default template`);
        });

        saveBtn.addEventListener('click', async () => {
            try {
                const templateContent = this.textArea.value;
                
                // Validate template content is not empty
                if (!templateContent.trim()) {
                    new Notice('❌ Template cannot be empty');
                    return;
                }

                // Initialize templates object if it doesn't exist
                if (!this.plugin.settings.research.templates) {
                    this.plugin.settings.research.templates = {};
                }

                // Save the template based on the current template type
                if (this.currentTemplate === 'custom' || this.currentTemplate === 'research-standard') {
                    // For custom or editing the standard, save as the research template
                    this.plugin.settings.research.templates.research = templateContent;
                } else {
                    // For other template types, save with their specific key
                    this.plugin.settings.research.templates[this.currentTemplate] = templateContent;
                }

                // Also update the default template setting to use this template
                this.plugin.settings.research.defaults.template = 'custom';
                
                // Save settings to disk
                await this.plugin.saveSettings();
                
                new Notice('✅ Template saved successfully!');
                console.log(`Template "${this.currentTemplate}" saved:`, templateContent.substring(0, 100) + '...');
            } catch (error) {
                console.error('Failed to save template:', error);
                new Notice('❌ Failed to save template. Please try again.');
            }
        });

        resetBtn.addEventListener('click', async () => {
            await this.loadTemplate();
            new Notice('🔄 Template reset to default');
        });

        closeBtn.addEventListener('click', () => {
            this.close();
        });
    }

    private async loadTemplate(): Promise<void> {
        try {
            // Get template content based on current selection
            const template = await this.getTemplateContent(this.currentTemplate);
            this.textArea.value = template;
        } catch (error) {
            console.error('Failed to load template:', error);
            this.textArea.value = '// Failed to load template. Please try again.';
        }
    }

    private async getTemplateContent(templateType: string): Promise<string> {
        // Import ComprehensiveResearchSystem to get the RESEARCH_STANDARD_TEMPLATE
        const { ComprehensiveResearchSystem } = await import('../research/comprehensive-research-system');

        // Try to get saved template based on the type
        if (this.plugin.settings.research.templates) {
            if (templateType === 'custom') {
                // For custom, return the saved research template if it exists
                return this.plugin.settings.research.templates.research || ComprehensiveResearchSystem.RESEARCH_STANDARD_TEMPLATE;
            } else if (templateType === 'research-standard') {
                // For the standard template, return the standard template from the system
                return ComprehensiveResearchSystem.RESEARCH_STANDARD_TEMPLATE;
            } else {
                // For other template types, try to load their saved version
                return this.plugin.settings.research.templates[templateType] || await this.getBuiltInTemplate(templateType);
            }
        }

        // Fallback to standard template
        return ComprehensiveResearchSystem.RESEARCH_STANDARD_TEMPLATE;
    }

    private async getBuiltInTemplate(templateType: string): Promise<string> {
        // Import ComprehensiveResearchSystem for fallback
        const { ComprehensiveResearchSystem } = await import('../research/comprehensive-research-system');
        
        switch (templateType) {
            case 'research-minimal':
                return `---
project: "{{projectName}}"
status: "in-progress"
created: "{{today}}"
{{tags}}
---

# {{topicName}}

## Overview
{{EXTRACTED_WISDOM}}

## Sources
{{VAULT_SEARCH_RESULTS}}
{{WEB_SEARCH_RESULTS}}

---
*Generated by CLIPPY Research Agent*`;

            case 'research-scientific':
                return `---
project: "{{projectName}}"
status: "in-progress"
created: "{{today}}"
methodology: "systematic-review"
{{tags}}
---

# {{topicName}}: Systematic Analysis

## Abstract
{{EXTRACTED_WISDOM}}

## Literature Review
{{VAULT_SEARCH_RESULTS}}

## Methodology
*[Research methodology and approach]*

## Results
{{WEB_SEARCH_RESULTS}}

## Discussion
*[Analysis and interpretation of findings]*

## References
*[Scientific citations and references]*

---
*Generated by CLIPPY Research Agent*`;

            default:
                return ComprehensiveResearchSystem.RESEARCH_STANDARD_TEMPLATE;
        }
    }
}