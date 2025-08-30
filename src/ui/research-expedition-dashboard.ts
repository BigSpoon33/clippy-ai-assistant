/**
 * Research Expedition Dashboard
 * Real-time dashboard for monitoring autonomous research expeditions
 */

import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import ClippyPlugin from '../main';
import { ResearchState, ResearchTask } from '../research/research-expedition-system';
import { ResearchOpportunity } from '../research/strategy-engine';

export const VIEW_TYPE_RESEARCH_DASHBOARD = 'clippy-research-dashboard';

export class ResearchExpeditionDashboard extends ItemView {
  private plugin: ClippyPlugin;
  private refreshInterval: number | null = null;
  private currentExpedition: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClippyPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_RESEARCH_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Research Expedition Dashboard';
  }

  getIcon(): string {
    return 'compass';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    
    // Header
    const headerEl = container.createEl('div', { cls: 'research-dashboard-header' });
    headerEl.style.cssText = `
      padding: 20px;
      background: var(--background-secondary);
      border-bottom: 1px solid var(--background-modifier-border);
    `;

    const titleEl = headerEl.createEl('h2', { 
      text: '🚀 Research Expedition Dashboard',
      cls: 'dashboard-title'
    });
    titleEl.style.cssText = 'margin: 0; color: var(--interactive-accent);';

    const statusEl = headerEl.createEl('div', { cls: 'dashboard-status' });
    statusEl.style.cssText = 'margin-top: 8px; color: var(--text-muted);';

    // Controls
    const controlsEl = headerEl.createEl('div', { cls: 'dashboard-controls' });
    controlsEl.style.cssText = `
      display: flex;
      gap: 12px;
      margin-top: 16px;
    `;

    // Start expedition button
    const startBtn = controlsEl.createEl('button', {
      text: '🚀 Start New Expedition',
      cls: 'mod-cta'
    });
    startBtn.addEventListener('click', () => {
      this.startNewExpedition();
    });

    // Refresh button
    const refreshBtn = controlsEl.createEl('button', {
      text: '🔄 Refresh',
      cls: 'mod-muted'
    });
    refreshBtn.addEventListener('click', () => {
      this.refreshDashboard();
    });

    // Auto-refresh toggle
    const autoRefreshBtn = controlsEl.createEl('button', {
      text: '⏱️ Auto-refresh: OFF',
      cls: 'mod-muted'
    });
    autoRefreshBtn.addEventListener('click', () => {
      this.toggleAutoRefresh(autoRefreshBtn);
    });

    // Main content area
    const contentEl = container.createEl('div', { cls: 'research-dashboard-content' });
    contentEl.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px;';

    // Initialize dashboard content
    await this.updateDashboard(contentEl, statusEl);

    // Set up auto-refresh
    this.startAutoRefresh();
  }

  async onClose() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private async startNewExpedition(): void {
    try {
      // Import and create research topic modal
      const { ResearchTopicInputModal } = await import('./research-topic-modal');
      
      const modal = new ResearchTopicInputModal(this.app, async (topic, config) => {
        try {
          // Initialize research expedition agent if needed
          if (!this.plugin.researchExpeditionAgent) {
            const { ResearchExpeditionAgent } = await import('../agents/research-expedition-agent');
            this.plugin.researchExpeditionAgent = new ResearchExpeditionAgent(
              this.app, 
              this.plugin.settings, 
              this.plugin
            );
          }

          // Start expedition
          new Notice(`🚀 Starting research expedition: ${topic}`, 3000);
          const expeditionId = await this.plugin.researchExpeditionAgent.startResearchExpedition(topic, config);
          
          this.currentExpedition = expeditionId;
          await this.refreshDashboard();
          
          new Notice(`✅ Research expedition started: ${expeditionId.slice(-8)}`, 5000);

        } catch (error) {
          console.error('Dashboard: Failed to start expedition:', error);
          new Notice(`❌ Failed to start expedition: ${error.message}`, 5000);
        }
      });
      
      modal.open();

    } catch (error) {
      console.error('Dashboard: Error opening expedition modal:', error);
      new Notice(`❌ Error starting expedition: ${error.message}`);
    }
  }

  private async updateDashboard(contentEl: HTMLElement, statusEl: HTMLElement): Promise<void> {
    contentEl.empty();

    if (!this.plugin.researchExpeditionAgent) {
      this.showNoAgentMessage(contentEl, statusEl);
      return;
    }

    // Get active expeditions
    const activeExpeditions = this.plugin.researchExpeditionAgent.getActiveExpeditions();
    
    if (activeExpeditions.length === 0) {
      this.showNoExpeditionsMessage(contentEl, statusEl);
      return;
    }

    // Update status
    statusEl.textContent = `${activeExpeditions.length} active expedition${activeExpeditions.length === 1 ? '' : 's'}`;

    // Show expedition details
    for (const expeditionId of activeExpeditions.slice(-3)) { // Show last 3 expeditions
      const state = await this.plugin.researchExpeditionAgent.getExpeditionStatus(expeditionId);
      if (state) {
        this.createExpeditionPanel(contentEl, state, expeditionId === activeExpeditions[activeExpeditions.length - 1]);
      }
    }

    // Research opportunities section
    if (this.currentExpedition) {
      await this.showResearchOpportunities(contentEl);
    }
  }

  private showNoAgentMessage(contentEl: HTMLElement, statusEl: HTMLElement): void {
    statusEl.textContent = 'Research system not initialized';
    
    const messageEl = contentEl.createEl('div', { cls: 'dashboard-message' });
    messageEl.style.cssText = `
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    `;
    
    messageEl.innerHTML = `
      <div style="font-size: 3em; margin-bottom: 16px;">🧪</div>
      <h3>Research System Ready</h3>
      <p>Start your first autonomous research expedition to begin exploring!</p>
      <p style="font-size: 0.9em; margin-top: 20px;">
        The Research Expedition Agent will automatically:<br>
        • Analyze your vault for knowledge gaps<br>
        • Conduct comprehensive web research<br>
        • Create intelligent connections<br>
        • Build knowledge bridges
      </p>
    `;
  }

  private showNoExpeditionsMessage(contentEl: HTMLElement, statusEl: HTMLElement): void {
    statusEl.textContent = 'No active expeditions';
    
    const messageEl = contentEl.createEl('div', { cls: 'dashboard-message' });
    messageEl.style.cssText = `
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    `;
    
    messageEl.innerHTML = `
      <div style="font-size: 3em; margin-bottom: 16px;">🚀</div>
      <h3>Ready for Research</h3>
      <p>No research expeditions are currently running.</p>
      <p style="font-size: 0.9em; margin-top: 20px;">
        Click "Start New Expedition" to begin autonomous research on any topic!
      </p>
    `;
  }

  private createExpeditionPanel(contentEl: HTMLElement, state: ResearchState, isLatest: boolean): void {
    const panelEl = contentEl.createEl('div', { cls: 'expedition-panel' });
    panelEl.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      ${isLatest ? 'border-left: 4px solid var(--interactive-accent);' : ''}
    `;

    // Header
    const headerEl = panelEl.createEl('div', { cls: 'expedition-header' });
    headerEl.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    `;

    const titleEl = headerEl.createEl('div');
    titleEl.innerHTML = `
      <h3 style="margin: 0; color: var(--text-normal);">${state.startTopic}</h3>
      <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 4px;">
        ${isLatest ? '🔴 Active' : ''} • Started ${this.formatTime(state.startTime)} • Level ${state.currentLevel}
      </div>
    `;

    const statusEl = headerEl.createEl('div');
    statusEl.style.cssText = 'text-align: right;';
    
    const statusBadge = statusEl.createEl('div');
    statusBadge.style.cssText = `
      background: ${this.getStatusColor(state.status)};
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
      margin-bottom: 8px;
    `;
    statusBadge.textContent = state.status.toUpperCase();

    const timeEl = statusEl.createEl('div');
    timeEl.style.cssText = 'font-size: 0.8em; color: var(--text-muted);';
    timeEl.textContent = `${Math.round((Date.now() - state.startTime) / 60000)}min elapsed`;

    // Progress section
    const progressEl = panelEl.createEl('div', { cls: 'expedition-progress' });
    this.createProgressSection(progressEl, state);

    // Tasks section
    const tasksEl = panelEl.createEl('div', { cls: 'expedition-tasks' });
    this.createTasksSection(tasksEl, state);

    // Results section
    if (state.createdNotes.length > 0 || state.discoveredConnections.length > 0) {
      const resultsEl = panelEl.createEl('div', { cls: 'expedition-results' });
      this.createResultsSection(resultsEl, state);
    }
  }

  private createProgressSection(container: HTMLElement, state: ResearchState): void {
    const progressEl = container.createEl('div', { cls: 'progress-section' });
    progressEl.style.cssText = 'margin-bottom: 16px;';

    const totalTasks = state.completedTasks.length + state.researchQueue.length;
    const completedCount = state.completedTasks.length;
    const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    progressEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 600;">Research Progress</span>
        <span style="font-size: 0.9em; color: var(--text-muted);">${completedCount}/${totalTasks} tasks</span>
      </div>
      <div style="background: var(--background-modifier-border); border-radius: 4px; height: 8px; overflow: hidden;">
        <div style="background: var(--interactive-accent); height: 100%; width: ${progressPercent}%; transition: width 0.3s ease;"></div>
      </div>
    `;

    // Stats grid
    const statsEl = progressEl.createEl('div');
    statsEl.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 12px;
    `;

    const stats = [
      { label: 'Notes Created', value: state.createdNotes.length, icon: '📝' },
      { label: 'Connections', value: state.discoveredConnections.length, icon: '🔗' },
      { label: 'Topics Explored', value: state.exploredTopics.size, icon: '🔍' },
      { label: 'Current Level', value: state.currentLevel, icon: '🎯' }
    ];

    stats.forEach(stat => {
      const statEl = statsEl.createEl('div');
      statEl.style.cssText = `
        background: var(--background-secondary);
        padding: 8px 12px;
        border-radius: 6px;
        text-align: center;
      `;
      statEl.innerHTML = `
        <div style="font-size: 1.2em; font-weight: 600; color: var(--interactive-accent);">
          ${stat.icon} ${stat.value}
        </div>
        <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 2px;">
          ${stat.label}
        </div>
      `;
    });
  }

  private createTasksSection(container: HTMLElement, state: ResearchState): void {
    const tasksEl = container.createEl('details', { cls: 'tasks-section' });
    tasksEl.style.cssText = 'margin-bottom: 16px;';
    
    const summaryEl = tasksEl.createEl('summary');
    summaryEl.style.cssText = 'cursor: pointer; font-weight: 600; margin-bottom: 8px;';
    summaryEl.textContent = `Research Tasks (${state.completedTasks.length + state.researchQueue.length})`;

    const tasksListEl = tasksEl.createEl('div');
    tasksListEl.style.cssText = 'max-height: 200px; overflow-y: auto;';

    // Recent completed tasks
    const recentCompleted = state.completedTasks.slice(-3).reverse();
    if (recentCompleted.length > 0) {
      tasksListEl.createEl('div', { 
        text: 'Recently Completed:',
        style: 'font-weight: 600; color: var(--text-success); margin-bottom: 8px;'
      });
      
      recentCompleted.forEach(task => {
        this.createTaskItem(tasksListEl, task, 'completed');
      });
    }

    // Queued tasks
    const queuedTasks = state.researchQueue.filter(task => task.status === 'queued').slice(0, 5);
    if (queuedTasks.length > 0) {
      if (recentCompleted.length > 0) {
        tasksListEl.createEl('hr', { style: 'margin: 12px 0; border: none; border-top: 1px solid var(--background-modifier-border);' });
      }
      
      tasksListEl.createEl('div', { 
        text: 'Queued Tasks:',
        style: 'font-weight: 600; color: var(--text-warning); margin-bottom: 8px;'
      });
      
      queuedTasks.forEach(task => {
        this.createTaskItem(tasksListEl, task, 'queued');
      });
    }
  }

  private createTaskItem(container: HTMLElement, task: ResearchTask, status: 'completed' | 'queued'): void {
    const taskEl = container.createEl('div', { cls: 'task-item' });
    taskEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 0.9em;
    `;

    const iconEl = taskEl.createEl('div');
    iconEl.style.cssText = 'flex-shrink: 0;';
    iconEl.textContent = status === 'completed' ? '✅' : '⏳';

    const contentEl = taskEl.createEl('div');
    contentEl.style.cssText = 'flex: 1; min-width: 0;';
    
    const titleEl = contentEl.createEl('div');
    titleEl.style.cssText = `
      color: var(--text-normal);
      ${status === 'completed' ? 'text-decoration: line-through; opacity: 0.7;' : ''}
    `;
    titleEl.textContent = task.topic;

    const metaEl = contentEl.createEl('div');
    metaEl.style.cssText = 'font-size: 0.8em; color: var(--text-muted);';
    metaEl.textContent = `${this.formatResearchType(task.researchType)} • Priority: ${(task.priority * 100).toFixed(0)}%`;
  }

  private createResultsSection(container: HTMLElement, state: ResearchState): void {
    const resultsEl = container.createEl('details', { cls: 'results-section' });
    const summaryEl = resultsEl.createEl('summary');
    summaryEl.style.cssText = 'cursor: pointer; font-weight: 600; margin-bottom: 8px;';
    summaryEl.textContent = `Research Results (${state.createdNotes.length + state.discoveredConnections.length})`;

    const resultsContent = resultsEl.createEl('div');
    
    // Created notes
    if (state.createdNotes.length > 0) {
      resultsContent.createEl('div', { 
        text: `📝 Created Notes (${state.createdNotes.length}):`,
        style: 'font-weight: 600; margin-bottom: 8px;'
      });
      
      const notesListEl = resultsContent.createEl('div');
      notesListEl.style.cssText = 'margin-bottom: 12px;';
      
      state.createdNotes.slice(-5).forEach(note => {
        const noteEl = notesListEl.createEl('div');
        noteEl.style.cssText = `
          padding: 4px 0;
          font-size: 0.9em;
          color: var(--text-muted);
        `;
        noteEl.innerHTML = `• <span style="color: var(--text-normal);">[[${note.basename}]]</span>`;
      });
    }

    // Discovered connections
    if (state.discoveredConnections.length > 0) {
      resultsContent.createEl('div', { 
        text: `🔗 Discovered Connections (${state.discoveredConnections.length}):`,
        style: 'font-weight: 600; margin-bottom: 8px;'
      });
      
      const connectionsListEl = resultsContent.createEl('div');
      
      state.discoveredConnections.slice(-3).forEach(conn => {
        const connEl = connectionsListEl.createEl('div');
        connEl.style.cssText = `
          padding: 4px 0;
          font-size: 0.9em;
          color: var(--text-muted);
        `;
        connEl.innerHTML = `
          • <span style="color: var(--text-normal);">[[${conn.sourceNote}]]</span> 
          ↔ <span style="color: var(--text-normal);">[[${conn.targetNote}]]</span>
          <span style="font-size: 0.8em;">(${conn.connectionType}, ${(conn.confidence * 100).toFixed(0)}%)</span>
        `;
      });
    }
  }

  private async showResearchOpportunities(contentEl: HTMLElement): Promise<void> {
    try {
      if (!this.plugin.researchExpeditionAgent) return;

      const opportunities = await this.plugin.researchExpeditionAgent.discoverResearchOpportunities('general', 5);
      
      if (opportunities.length === 0) return;

      const opportunitiesEl = contentEl.createEl('div', { cls: 'research-opportunities' });
      opportunitiesEl.style.cssText = `
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 16px;
        margin-top: 20px;
      `;

      opportunitiesEl.createEl('h4', { 
        text: '💡 Research Opportunities',
        style: 'margin: 0 0 12px 0; color: var(--interactive-accent);'
      });

      opportunities.slice(0, 3).forEach((opportunity, index) => {
        const oppEl = opportunitiesEl.createEl('div');
        oppEl.style.cssText = `
          padding: 8px 0;
          ${index < 2 ? 'border-bottom: 1px solid var(--background-modifier-border);' : ''}
        `;
        
        oppEl.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${this.getOpportunityIcon(opportunity.type)} ${opportunity.topic}
          </div>
          <div style="font-size: 0.85em; color: var(--text-muted);">
            ${opportunity.reasoning}
          </div>
          <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 4px;">
            Priority: ${(opportunity.priority * 100).toFixed(0)}% • ${opportunity.complexity} • ~${opportunity.timeEstimate}min
          </div>
        `;
      });

    } catch (error) {
      console.error('Dashboard: Error showing research opportunities:', error);
    }
  }

  private async refreshDashboard(): Promise<void> {
    const container = this.containerEl.children[1];
    const statusEl = container.querySelector('.dashboard-status') as HTMLElement;
    const contentEl = container.querySelector('.research-dashboard-content') as HTMLElement;
    
    if (statusEl && contentEl) {
      await this.updateDashboard(contentEl, statusEl);
    }
  }

  private toggleAutoRefresh(button: HTMLButtonElement): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      button.textContent = '⏱️ Auto-refresh: OFF';
      button.removeClass('is-active');
    } else {
      this.startAutoRefresh();
      button.textContent = '⏱️ Auto-refresh: ON';
      button.addClass('is-active');
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = window.setInterval(() => {
      this.refreshDashboard();
    }, 10000); // Refresh every 10 seconds
  }

  // Helper methods
  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  private getStatusColor(status: string): string {
    const colors = {
      'planning': 'var(--text-warning)',
      'researching': 'var(--interactive-accent)',
      'synthesizing': 'var(--text-accent)',
      'complete': 'var(--text-success)',
      'paused': 'var(--text-muted)',
      'error': 'var(--text-error)'
    };
    return colors[status] || 'var(--text-muted)';
  }

  private formatResearchType(type: string): string {
    const names = {
      'gap-fill': 'Gap Fill',
      'expansion': 'Expansion',
      'bridge': 'Bridge',
      'validation': 'Validation'
    };
    return names[type] || type;
  }

  private getOpportunityIcon(type: string): string {
    const icons = {
      'gap-fill': '🔍',
      'connection-bridge': '🌉',
      'deep-dive': '🏊‍♂️',
      'cross-pollination': '🔄',
      'validation': '✅'
    };
    return icons[type] || '📋';
  }
}