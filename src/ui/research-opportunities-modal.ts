/**
 * Research Opportunities Modal
 * Displays discovered research opportunities with details and prioritization
 */

import { App, Modal } from 'obsidian';
import { ResearchOpportunity } from '../research/strategy-engine';

export class ResearchOpportunitiesModal extends Modal {
  private opportunities: ResearchOpportunity[];
  private topic: string;

  constructor(app: App, opportunities: ResearchOpportunity[], topic: string) {
    super(app);
    this.opportunities = opportunities.sort((a, b) => b.priority - a.priority);
    this.topic = topic;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Title
    contentEl.createEl('h2', { text: `Research Opportunities: ${this.topic}` });
    
    // Summary
    const summaryEl = contentEl.createEl('div', { cls: 'opportunities-summary' });
    summaryEl.style.cssText = `
      background: var(--background-secondary);
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 20px;
      align-items: center;
    `;

    const statsEl = summaryEl.createEl('div');
    statsEl.innerHTML = `
      <div style="font-size: 1.2em; font-weight: 600; color: var(--interactive-accent);">
        ${this.opportunities.length} Opportunities Found
      </div>
      <div style="font-size: 0.9em; color: var(--text-muted); margin-top: 4px;">
        ${this.categorizeOpportunities()}
      </div>
    `;

    const priorityEl = summaryEl.createEl('div');
    const highPriority = this.opportunities.filter(o => o.priority > 0.8).length;
    const mediumPriority = this.opportunities.filter(o => o.priority > 0.6 && o.priority <= 0.8).length;
    priorityEl.innerHTML = `
      <div style="font-size: 0.9em; color: var(--text-muted);">Priority Breakdown:</div>
      <div style="margin-top: 4px;">
        <span style="color: var(--text-error);">●</span> ${highPriority} High Priority<br>
        <span style="color: var(--text-warning);">●</span> ${mediumPriority} Medium Priority<br>
        <span style="color: var(--text-muted);">●</span> ${this.opportunities.length - highPriority - mediumPriority} Lower Priority
      </div>
    `;

    // Opportunities list
    const listContainer = contentEl.createEl('div', { cls: 'opportunities-list' });
    listContainer.style.cssText = `
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
    `;

    this.opportunities.forEach((opportunity, index) => {
      this.createOpportunityCard(listContainer, opportunity, index);
    });

    // Action buttons
    const buttonContainer = contentEl.createEl('div', { cls: 'opportunities-actions' });
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--background-modifier-border);
    `;

    // Research top opportunities button
    const researchTopBtn = buttonContainer.createEl('button', {
      text: '🚀 Research Top 5 Opportunities',
      cls: 'mod-cta'
    });
    researchTopBtn.addEventListener('click', () => {
      this.close();
      // This would trigger research expedition for top opportunities
      console.log('Starting research for top opportunities:', this.opportunities.slice(0, 5));
    });

    // Close button
    const closeBtn = buttonContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-muted'
    });
    closeBtn.addEventListener('click', () => {
      this.close();
    });
  }

  private createOpportunityCard(container: HTMLElement, opportunity: ResearchOpportunity, index: number): void {
    const card = container.createEl('div', { cls: 'opportunity-card' });
    card.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid var(--background-modifier-border);
      transition: background-color 0.2s ease;
    `;

    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'var(--background-secondary)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = 'transparent';
    });

    // Header
    const headerEl = card.createEl('div', { cls: 'opportunity-header' });
    headerEl.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;';

    const titleEl = headerEl.createEl('div');
    titleEl.innerHTML = `
      <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 4px;">
        ${index + 1}. ${opportunity.topic}
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        ${this.getTypeIcon(opportunity.type)} 
        <span style="font-size: 0.85em; color: var(--text-muted);">${this.formatType(opportunity.type)}</span>
        <span style="font-size: 0.85em; color: var(--text-muted);">•</span>
        <span style="font-size: 0.85em; color: var(--text-muted);">${opportunity.complexity}</span>
        <span style="font-size: 0.85em; color: var(--text-muted);">•</span>
        <span style="font-size: 0.85em; color: var(--text-muted);">~${opportunity.timeEstimate}min</span>
      </div>
    `;

    // Priority indicator
    const priorityEl = headerEl.createEl('div');
    priorityEl.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    `;

    const priorityScore = priorityEl.createEl('div');
    priorityScore.style.cssText = `
      background: ${this.getPriorityColor(opportunity.priority)};
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
    `;
    priorityScore.textContent = `${Math.round(opportunity.priority * 100)}%`;

    const priorityBar = priorityEl.createEl('div');
    priorityBar.style.cssText = `
      width: 60px;
      height: 4px;
      background: var(--background-modifier-border);
      border-radius: 2px;
      overflow: hidden;
    `;
    const priorityFill = priorityBar.createEl('div');
    priorityFill.style.cssText = `
      width: ${opportunity.priority * 100}%;
      height: 100%;
      background: ${this.getPriorityColor(opportunity.priority)};
      transition: width 0.3s ease;
    `;

    // Reasoning
    const reasoningEl = card.createEl('div');
    reasoningEl.style.cssText = `
      color: var(--text-muted);
      font-size: 0.9em;
      line-height: 1.4;
      margin-bottom: 12px;
    `;
    reasoningEl.textContent = opportunity.reasoning;

    // Details section (collapsible)
    if (opportunity.prerequisites.length > 0 || opportunity.expectedOutcomes.length > 0 || opportunity.knowledgeAreas.length > 0) {
      const detailsToggle = card.createEl('details', { cls: 'opportunity-details' });
      const detailsSummary = detailsToggle.createEl('summary', { 
        text: 'Show Details',
        style: 'cursor: pointer; font-size: 0.85em; color: var(--interactive-accent); margin-bottom: 8px;'
      });

      const detailsContent = detailsToggle.createEl('div');
      detailsContent.style.cssText = `
        background: var(--background-secondary);
        padding: 12px;
        border-radius: 6px;
        font-size: 0.85em;
        line-height: 1.4;
      `;

      if (opportunity.prerequisites.length > 0) {
        detailsContent.createEl('div', { 
          innerHTML: `<strong>Prerequisites:</strong><br>${opportunity.prerequisites.map(p => `• ${p}`).join('<br>')}`
        });
      }

      if (opportunity.expectedOutcomes.length > 0) {
        if (opportunity.prerequisites.length > 0) detailsContent.createEl('br');
        detailsContent.createEl('div', { 
          innerHTML: `<strong>Expected Outcomes:</strong><br>${opportunity.expectedOutcomes.map(o => `• ${o}`).join('<br>')}`
        });
      }

      if (opportunity.knowledgeAreas.length > 0) {
        if (opportunity.prerequisites.length > 0 || opportunity.expectedOutcomes.length > 0) detailsContent.createEl('br');
        detailsContent.createEl('div', { 
          innerHTML: `<strong>Knowledge Areas:</strong><br>${opportunity.knowledgeAreas.map(a => `• ${a}`).join('<br>')}`
        });
      }
    }
  }

  private categorizeOpportunities(): string {
    const types = this.opportunities.reduce((acc, opp) => {
      acc[opp.type] = (acc[opp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(types)
      .map(([type, count]) => `${count} ${this.formatType(type)}`)
      .join(', ');
  }

  private getTypeIcon(type: string): string {
    const icons = {
      'gap-fill': '🔍',
      'connection-bridge': '🌉',
      'deep-dive': '🏊‍♂️',
      'cross-pollination': '🔄',
      'validation': '✅'
    };
    return icons[type] || '📋';
  }

  private formatType(type: string): string {
    const names = {
      'gap-fill': 'Gap Fill',
      'connection-bridge': 'Bridge Building',
      'deep-dive': 'Deep Dive',
      'cross-pollination': 'Cross-Pollination',
      'validation': 'Validation'
    };
    return names[type] || type;
  }

  private getPriorityColor(priority: number): string {
    if (priority > 0.8) return 'var(--text-error)';
    if (priority > 0.6) return 'var(--text-warning)';
    if (priority > 0.4) return 'var(--text-accent)';
    return 'var(--text-muted)';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}