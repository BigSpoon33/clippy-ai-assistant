/**
 * Enhanced Research Agent Sidebar View
 * Integrates new GUI enhancements with research functionality
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { GUIEnhancementManager } from './components/gui-enhancement-manager';
import { GeometricPatternGenerator } from './components/visualizers/geometric-pattern-generator';

export const ENHANCED_RESEARCH_AGENT_VIEW_TYPE = 'enhanced-research-agent-view';

export class EnhancedResearchAgentSidebarView extends ItemView {
    private guiManager: GUIEnhancementManager | null = null;
    private patternGenerator: GeometricPatternGenerator | null = null;
    private projectsContainer: HTMLElement | null = null;
    private currentResearchProjects: Map<string, any> = new Map();

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return ENHANCED_RESEARCH_AGENT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Research Agent (Enhanced)';
    }

    getIcon(): string {
        return 'search';
    }

    async onOpen(): Promise<void> {
        await this.initializeEnhancedResearchView();
    }

    private async initializeEnhancedResearchView(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('enhanced-research-agent-sidebar');

        // Initialize GUI Enhancement Manager with research-optimized settings
        this.guiManager = new GUIEnhancementManager(this.app, {
            enableMascot: true,
            enableParticles: true,
            enableGeometricPatterns: true, // Enable for research visualization
            enableAudioVisualizers: false, // Not needed for research
            enableAdaptiveThemes: true,
            enableActivityTracking: true,
            performanceMode: 'high' // Research needs high performance
        });

        await this.guiManager.initialize();

        // Create enhanced research header
        this.createEnhancedResearchHeader(container);

        // Create research project management area
        this.createEnhancedProjectsArea(container);

        // Create quick research tools
        this.createEnhancedResearchTools(container);

        // Create knowledge visualization area
        this.createKnowledgeVisualizationArea(container);

        // Set up research-specific integrations
        this.setupResearchIntegration();

        console.log('🔍 Enhanced Research Agent Sidebar initialized');
    }

    private createEnhancedResearchHeader(container: HTMLElement): void {
        const header = container.createEl('div', { cls: 'research-header enhanced-research-header' });
        
        const titleContainer = header.createEl('div', { cls: 'research-title-container' });
        titleContainer.createEl('span', { text: '🔍', cls: 'research-icon' });
        titleContainer.createEl('h3', { text: 'Research Agent', cls: 'research-title' });

        // Enhanced research status
        const statusContainer = header.createEl('div', { cls: 'research-status-container' });
        const statusIndicator = statusContainer.createEl('div', {
            cls: 'research-status-indicator clippy-pulse-active',
            text: 'Ready for Research'
        });

        // Research mode controls
        const controlsContainer = header.createEl('div', { cls: 'research-controls' });
        
        const modeBtn = controlsContainer.createEl('button', {
            cls: 'research-mode-btn clippy-modern-button',
            text: '🧠 Deep Mode'
        });
        modeBtn.onclick = () => this.toggleResearchMode();

        const visualizeBtn = controlsContainer.createEl('button', {
            cls: 'visualize-btn clippy-modern-button',
            text: '🔮 Visualize'
        });
        visualizeBtn.onclick = () => this.generateResearchVisualization();
    }

    private createEnhancedProjectsArea(container: HTMLElement): void {
        const projectsSection = container.createEl('div', { cls: 'research-section enhanced-projects-section' });
        
        const sectionHeader = projectsSection.createEl('div', { cls: 'research-section-header collapsible-header' });
        sectionHeader.createEl('span', { text: '▼', cls: 'section-expand-arrow' });
        sectionHeader.createEl('span', { text: '📚', cls: 'section-icon' });
        sectionHeader.createEl('span', { text: 'ACTIVE PROJECTS', cls: 'section-title' });

        this.projectsContainer = projectsSection.createEl('div', { cls: 'research-projects-container enhanced-projects-container' });

        // Add some demo projects
        this.addEnhancedResearchProject('Quantum Computing Research', 'active', 0.65);
        this.addEnhancedResearchProject('Ancient Philosophy Analysis', 'processing', 0.30);
        this.addEnhancedResearchProject('Climate Change Data', 'completed', 1.0);

        // Quick add project button
        const addProjectBtn = projectsSection.createEl('button', {
            cls: 'add-project-btn clippy-modern-button',
            text: '✨ New Research Project'
        });
        addProjectBtn.onclick = () => this.createNewResearchProject();
    }

    private createEnhancedResearchTools(container: HTMLElement): void {
        const toolsSection = container.createEl('div', { cls: 'research-section enhanced-tools-section' });
        
        const sectionHeader = toolsSection.createEl('div', { cls: 'research-section-header' });
        sectionHeader.createEl('span', { text: '🛠️', cls: 'section-icon' });
        sectionHeader.createEl('span', { text: 'RESEARCH TOOLS', cls: 'section-title' });

        const toolsContainer = toolsSection.createEl('div', { cls: 'research-tools-container' });

        // Enhanced search tool
        const searchTool = toolsContainer.createEl('div', { cls: 'research-tool enhanced-search-tool' });
        searchTool.createEl('div', { text: '🔍 Smart Vault Search', cls: 'tool-title' });
        
        const searchInput = searchTool.createEl('div', { cls: 'clippy-floating-label' });
        const searchField = searchInput.createEl('input', { 
            type: 'text',
            cls: 'clippy-modern-input',
            attr: { placeholder: ' ' }
        });
        searchInput.createEl('label', { text: 'Enter search query...' });

        const searchBtn = searchTool.createEl('button', {
            cls: 'tool-action-btn clippy-modern-button',
            text: '🚀 Search'
        });
        searchBtn.onclick = () => this.performEnhancedSearch(searchField.value);

        // Knowledge graph tool
        const graphTool = toolsContainer.createEl('div', { cls: 'research-tool enhanced-graph-tool' });
        graphTool.createEl('div', { text: '🕸️ Knowledge Graph', cls: 'tool-title' });
        
        const graphBtn = graphTool.createEl('button', {
            cls: 'tool-action-btn clippy-modern-button',
            text: '🔗 Generate Graph'
        });
        graphBtn.onclick = () => this.generateKnowledgeGraph();

        // AI research assistant
        const aiTool = toolsContainer.createEl('div', { cls: 'research-tool enhanced-ai-tool' });
        aiTool.createEl('div', { text: '🤖 AI Research Assistant', cls: 'tool-title' });
        
        const aiBtn = aiTool.createEl('button', {
            cls: 'tool-action-btn clippy-modern-button',
            text: '💫 Ask AI'
        });
        aiBtn.onclick = () => this.openAIResearchDialog();
    }

    private createKnowledgeVisualizationArea(container: HTMLElement): void {
        const vizSection = container.createEl('div', { cls: 'research-section enhanced-visualization-section' });
        
        const sectionHeader = vizSection.createEl('div', { cls: 'research-section-header' });
        sectionHeader.createEl('span', { text: '🔮', cls: 'section-icon' });
        sectionHeader.createEl('span', { text: 'KNOWLEDGE VISUALIZATION', cls: 'section-title' });

        const vizContainer = vizSection.createEl('div', { 
            cls: 'knowledge-visualization-container',
            attr: { style: 'height: 200px; position: relative; border: 1px solid var(--background-modifier-border); border-radius: 8px;' }
        });

        // Initialize geometric pattern generator for knowledge visualization
        this.patternGenerator = new GeometricPatternGenerator(vizContainer, {
            width: 280,
            height: 200,
            centerX: 140,
            centerY: 100,
            animated: true,
            opacity: 0.6,
            strokeColor: 'var(--interactive-accent)'
        });

        // Start with a default pattern
        this.patternGenerator.generateFlowerOfLife(40);

        // Visualization controls
        const controlsContainer = vizSection.createEl('div', { cls: 'visualization-controls' });
        
        const patternBtns = [
            { text: '🌸 Sacred', pattern: 'flowerOfLife' },
            { text: '🌀 Spiral', pattern: 'goldenSpiral' },
            { text: '🌳 Tree', pattern: 'fractalTree' },
            { text: '🕉️ Mandala', pattern: 'mandala' }
        ];

        patternBtns.forEach(btn => {
            const button = controlsContainer.createEl('button', {
                cls: 'pattern-btn clippy-modern-button',
                text: btn.text
            });
            button.onclick = () => this.generateResearchPattern(btn.pattern);
        });
    }

    private addEnhancedResearchProject(title: string, status: string, progress: number): void {
        if (!this.projectsContainer) return;

        const projectEl = this.projectsContainer.createEl('div', { 
            cls: 'research-project-item enhanced-project-item clippy-modern-card' 
        });

        // Project header with status
        const header = projectEl.createEl('div', { cls: 'project-header enhanced-project-header' });
        
        const statusIcon = this.getStatusIcon(status);
        header.createEl('span', { text: statusIcon, cls: 'project-status-icon' });
        header.createEl('span', { text: title, cls: 'project-title' });

        // Enhanced menu button
        const menuBtn = header.createEl('button', {
            cls: 'project-menu-btn',
            text: '⚙️'
        });
        menuBtn.onclick = () => this.openProjectMenu(title);

        // Enhanced progress visualization
        const progressContainer = projectEl.createEl('div', { cls: 'progress-container enhanced-progress' });
        
        const progressBar = progressContainer.createEl('div', { cls: 'progress-bar' });
        const progressFill = progressBar.createEl('div', { 
            cls: 'progress-fill animated',
            attr: { style: `width: ${progress * 100}%` }
        });

        const progressText = progressContainer.createEl('div', { 
            cls: 'progress-text',
            text: `${Math.round(progress * 100)}% Complete`
        });

        // Research insights preview
        const insightsContainer = projectEl.createEl('div', { cls: 'project-insights' });
        insightsContainer.createEl('div', {
            cls: 'insight-preview',
            text: this.generateInsightPreview(title, progress)
        });

        // Store project data
        this.currentResearchProjects.set(title, {
            status,
            progress,
            element: projectEl
        });
    }

    private getStatusIcon(status: string): string {
        const icons = {
            'active': '⚡',
            'processing': '🧠',
            'completed': '✅',
            'paused': '⏸️',
            'error': '❌'
        };
        return icons[status] || '📝';
    }

    private generateInsightPreview(title: string, progress: number): string {
        const insights = [
            `${Math.floor(progress * 50)} connections found`,
            `${Math.floor(progress * 20)} key concepts identified`,
            `${Math.floor(progress * 10)} research gaps discovered`,
            `${Math.floor(progress * 15)} related notes found`
        ];
        return insights[Math.floor(Math.random() * insights.length)];
    }

    private setupResearchIntegration(): void {
        if (!this.guiManager) return;

        // Enter research mode automatically
        this.guiManager.enterResearchMode();

        // Set up research activity tracking
        document.addEventListener('research-activity', (event: any) => {
            const { type, data } = event.detail;
            
            switch (type) {
                case 'search':
                    this.handleResearchSearch(data);
                    break;
                case 'analysis':
                    this.handleResearchAnalysis(data);
                    break;
                case 'discovery':
                    this.handleResearchDiscovery(data);
                    break;
            }
        });
    }

    private toggleResearchMode(): void {
        if (!this.guiManager) return;

        // Toggle between normal and deep research mode
        const isDeepMode = this.containerEl.classList.contains('deep-research-mode');
        
        if (!isDeepMode) {
            this.containerEl.classList.add('deep-research-mode');
            this.guiManager.enterResearchMode();
            
            // Generate research visualization
            if (this.patternGenerator) {
                this.patternGenerator.generateMetatronsCube(60);
            }
        } else {
            this.containerEl.classList.remove('deep-research-mode');
        }
    }

    private generateResearchVisualization(): void {
        if (!this.patternGenerator) return;

        const patterns = [
            () => this.patternGenerator!.generateFlowerOfLife(50),
            () => this.patternGenerator!.generateGoldenSpiral(80),
            () => this.patternGenerator!.generateFractalTree(70),
            () => this.patternGenerator!.generateMandala(60)
        ];

        const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
        randomPattern();

        if (this.guiManager) {
            this.guiManager.celebrateSuccess('Research visualization generated!');
        }
    }

    private generateResearchPattern(patternType: string): void {
        if (!this.patternGenerator) return;

        const patternFunctions = {
            'flowerOfLife': () => this.patternGenerator!.generateFlowerOfLife(40),
            'goldenSpiral': () => this.patternGenerator!.generateGoldenSpiral(70),
            'fractalTree': () => this.patternGenerator!.generateFractalTree(60),
            'mandala': () => this.patternGenerator!.generateMandala(50)
        };

        const generateFunction = patternFunctions[patternType];
        if (generateFunction) {
            generateFunction();
        }
    }

    private async performEnhancedSearch(query: string): Promise<void> {
        if (!query.trim()) return;

        if (this.guiManager) {
            this.guiManager.enterResearchMode();
        }

        // Simulate enhanced search with progress
        const searchProgress = this.createSearchProgress();
        
        try {
            // Simulate search stages
            await this.simulateSearchStage('Indexing vault...', 500);
            await this.simulateSearchStage('Semantic analysis...', 800);
            await this.simulateSearchStage('Finding connections...', 600);
            await this.simulateSearchStage('Generating insights...', 400);

            // Remove progress indicator
            searchProgress.remove();

            // Show results
            this.displaySearchResults(query);

            if (this.guiManager) {
                this.guiManager.celebrateSuccess('Search completed!');
            }

        } catch (error) {
            searchProgress.remove();
            
            if (this.guiManager) {
                this.guiManager.handleError('Search failed');
            }
        }
    }

    private createSearchProgress(): HTMLElement {
        const progressEl = this.projectsContainer!.createEl('div', { cls: 'search-progress enhanced-search-progress' });
        
        progressEl.createEl('div', { text: '🔍 Searching...', cls: 'progress-title' });
        
        const progressBar = progressEl.createEl('div', { cls: 'progress-bar' });
        const progressFill = progressBar.createEl('div', { cls: 'progress-fill animated' });
        
        const statusText = progressEl.createEl('div', { text: 'Initializing...', cls: 'progress-status' });
        
        return progressEl;
    }

    private async simulateSearchStage(status: string, duration: number): Promise<void> {
        const statusEl = this.containerEl.querySelector('.progress-status');
        if (statusEl) {
            statusEl.textContent = status;
        }

        return new Promise(resolve => setTimeout(resolve, duration));
    }

    private displaySearchResults(query: string): void {
        // Create results container
        const resultsEl = this.projectsContainer!.createEl('div', { cls: 'search-results enhanced-search-results' });
        
        resultsEl.createEl('h4', { text: `🔍 Results for "${query}"`, cls: 'results-title' });
        
        // Simulate search results
        const mockResults = [
            { title: 'Related Note 1', relevance: 0.9, snippet: 'This note contains relevant information about...' },
            { title: 'Connected Concept 2', relevance: 0.8, snippet: 'Found strong conceptual links...' },
            { title: 'Research Paper 3', relevance: 0.7, snippet: 'Academic source with matching topics...' }
        ];

        mockResults.forEach(result => {
            const resultItem = resultsEl.createEl('div', { cls: 'result-item clippy-modern-card' });
            
            resultItem.createEl('div', { text: result.title, cls: 'result-title' });
            resultItem.createEl('div', { text: result.snippet, cls: 'result-snippet' });
            
            const relevanceBar = resultItem.createEl('div', { cls: 'relevance-bar' });
            const relevanceFill = relevanceBar.createEl('div', { 
                cls: 'relevance-fill',
                attr: { style: `width: ${result.relevance * 100}%` }
            });
        });
    }

    private generateKnowledgeGraph(): void {
        if (!this.guiManager) return;

        // Generate a complex knowledge visualization
        if (this.patternGenerator) {
            this.patternGenerator.generateMetatronsCube(70);
        }

        this.guiManager.celebrateSuccess('Knowledge graph generated!');
        
        // Simulate creating project for knowledge graph
        this.addEnhancedResearchProject('Knowledge Graph Analysis', 'processing', 0.45);
    }

    private openAIResearchDialog(): void {
        // This would open a modal for AI research assistance
        console.log('Opening AI Research Dialog...');
        
        if (this.guiManager) {
            this.guiManager.enterCommunicationMode();
        }
    }

    private createNewResearchProject(): void {
        const projectName = `Research Project ${this.currentResearchProjects.size + 1}`;
        this.addEnhancedResearchProject(projectName, 'active', 0.1);
        
        if (this.guiManager) {
            this.guiManager.celebrateSuccess('New research project created!');
        }
    }

    private openProjectMenu(projectTitle: string): void {
        console.log(`Opening menu for project: ${projectTitle}`);
        // This would show a context menu with project options
    }

    private handleResearchSearch(data: any): void {
        console.log('Research search activity:', data);
    }

    private handleResearchAnalysis(data: any): void {
        console.log('Research analysis activity:', data);
    }

    private handleResearchDiscovery(data: any): void {
        console.log('Research discovery activity:', data);
        
        if (this.guiManager) {
            this.guiManager.celebrateSuccess('New research discovery!');
        }
    }

    async onClose(): Promise<void> {
        // Cleanup GUI enhancements
        if (this.guiManager) {
            this.guiManager.destroy();
            this.guiManager = null;
        }

        if (this.patternGenerator) {
            this.patternGenerator.destroy();
            this.patternGenerator = null;
        }

        this.currentResearchProjects.clear();
    }
}