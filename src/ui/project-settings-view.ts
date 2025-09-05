import { ItemView, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import ClippyPlugin from '../main';
import { ResearchProject } from '../research/project-tracker';

export const PROJECT_SETTINGS_VIEW_TYPE = 'project-settings-view';

export class ProjectSettingsView extends ItemView {
    private plugin: ClippyPlugin;
    private project: ResearchProject;
    private onBack: () => void;

    constructor(leaf: WorkspaceLeaf, plugin: ClippyPlugin, project: ResearchProject, onBack: () => void) {
        super(leaf);
        this.plugin = plugin;
        this.project = project;
        this.onBack = onBack;
    }

    getViewType(): string {
        return PROJECT_SETTINGS_VIEW_TYPE;
    }

    getDisplayText(): string {
        return `Project Settings: ${this.project.name}`;
    }

    getIcon(): string {
        return 'settings';
    }

    async onOpen(): Promise<void> {
        this.render();
    }

    async onClose(): Promise<void> {
        // Save any pending changes
        await this.plugin.researchProjectTracker?.saveProjects();
    }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('project-settings-view');

        // Add styles
        this.addStyles();

        // Header with back button
        this.renderHeader(contentEl);

        // Project overview
        this.renderProjectOverview(contentEl);

        // Research topics list
        this.renderTopicsList(contentEl);

        // Project settings
        this.renderProjectSettings(contentEl);
    }

    private addStyles(): void {
        if (document.getElementById('project-settings-styles')) return;

        const style = document.createElement('style');
        style.id = 'project-settings-styles';
        style.textContent = `
            .project-settings-view {
                padding: 0;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .project-settings-header {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                position: sticky;
                top: 0;
                z-index: 100;
            }

            .back-button {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: transparent;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-muted);
                transition: all 0.2s;
            }

            .back-button:hover {
                background: var(--background-modifier-hover);
                color: var(--text-normal);
            }

            .project-title {
                flex: 1;
                text-align: center;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-normal);
                margin: 0;
            }

            .project-settings-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            .project-overview {
                background: var(--background-secondary);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
            }

            .project-overview h3 {
                margin: 0 0 12px 0;
                color: var(--text-normal);
                font-size: 14px;
                font-weight: 600;
            }

            .project-meta {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
                font-size: 12px;
            }

            .project-meta-item {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .project-meta-label {
                color: var(--text-muted);
                font-weight: 500;
            }

            .project-meta-value {
                color: var(--text-normal);
                font-weight: 400;
            }

            .section {
                margin-bottom: 24px;
            }

            .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--background-modifier-border);
            }

            .section-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-normal);
                margin: 0;
            }

            .topics-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .topic-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: var(--background-secondary);
                border-radius: 6px;
                border: 1px solid transparent;
                transition: all 0.2s;
            }

            .topic-item:hover {
                border-color: var(--background-modifier-border);
                background: var(--background-modifier-hover);
            }

            .topic-info {
                flex: 1;
                min-width: 0;
            }

            .topic-name {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-normal);
                margin: 0 0 4px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .topic-status {
                font-size: 11px;
                color: var(--text-muted);
                margin: 0;
            }

            .topic-actions {
                display: flex;
                gap: 4px;
                flex-shrink: 0;
            }

            .topic-action-btn {
                padding: 6px;
                background: transparent;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: var(--text-muted);
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .topic-action-btn:hover {
                background: var(--background-modifier-hover);
                color: var(--text-normal);
            }

            .topic-action-btn.delete:hover {
                background: var(--background-modifier-error);
                color: var(--text-error);
            }

            .settings-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .form-label {
                font-size: 12px;
                font-weight: 500;
                color: var(--text-muted);
                margin: 0;
            }

            .form-input {
                padding: 8px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 13px;
                transition: border-color 0.2s;
            }

            .form-input:focus {
                outline: none;
                border-color: var(--interactive-accent);
            }

            .form-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 0;
            }

            .form-checkbox input {
                margin: 0;
            }

            .form-checkbox-label {
                font-size: 13px;
                color: var(--text-normal);
                cursor: pointer;
            }

            .form-textarea {
                min-height: 120px;
                resize: vertical;
                font-family: var(--font-monospace);
                font-size: 12px;
            }

            .form-section {
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 16px;
                background: var(--background-secondary);
            }

            .form-section-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-normal);
                margin: 0 0 12px 0;
            }

            .status-completed { color: var(--text-success); }
            .status-processing { color: var(--text-accent); }
            .status-failed { color: var(--text-error); }
            .status-pending { color: var(--text-muted); }
        `;
        document.head.appendChild(style);
    }

    private renderHeader(contentEl: HTMLElement): void {
        const header = contentEl.createEl('div', { cls: 'project-settings-header' });

        // Back button
        const backBtn = header.createEl('button', { cls: 'back-button' });
        backBtn.innerHTML = '← Back';
        backBtn.addEventListener('click', this.onBack);

        // Project title
        header.createEl('h2', { 
            text: this.project.name,
            cls: 'project-title'
        });

        // Spacer to balance the back button
        header.createEl('div', { 
            attr: { style: 'width: 60px;' } // Same width as back button
        });
    }

    private renderProjectOverview(contentEl: HTMLElement): void {
        const content = contentEl.createEl('div', { cls: 'project-settings-content' });
        
        const overview = content.createEl('div', { cls: 'project-overview' });
        overview.createEl('h3', { text: 'Project Overview' });

        const meta = overview.createEl('div', { cls: 'project-meta' });

        // Progress
        const progressItem = meta.createEl('div', { cls: 'project-meta-item' });
        progressItem.createEl('div', { text: 'Progress', cls: 'project-meta-label' });
        progressItem.createEl('div', { 
            text: `${this.project.progress.completed}/${this.project.progress.total}`,
            cls: 'project-meta-value'
        });

        // Status
        const statusItem = meta.createEl('div', { cls: 'project-meta-item' });
        statusItem.createEl('div', { text: 'Status', cls: 'project-meta-label' });
        const statusValue = statusItem.createEl('div', { cls: 'project-meta-value' });
        statusValue.setText(this.project.status);
        statusValue.addClass(`status-${this.project.status}`);

        // Created date
        const dateItem = meta.createEl('div', { cls: 'project-meta-item' });
        dateItem.createEl('div', { text: 'Created', cls: 'project-meta-label' });
        dateItem.createEl('div', { 
            text: this.project.createdAt.toLocaleDateString(),
            cls: 'project-meta-value'
        });

        // Output folder
        const folderItem = meta.createEl('div', { cls: 'project-meta-item' });
        folderItem.createEl('div', { text: 'Output Folder', cls: 'project-meta-label' });
        folderItem.createEl('div', { 
            text: this.project.settings.outputFolder,
            cls: 'project-meta-value'
        });
    }

    private renderTopicsList(contentEl: HTMLElement): void {
        const content = contentEl.querySelector('.project-settings-content') as HTMLElement;
        
        const section = content.createEl('div', { cls: 'section' });
        const header = section.createEl('div', { cls: 'section-header' });
        header.createEl('h3', { text: 'Research Topics', cls: 'section-title' });

        const topicsList = section.createEl('div', { cls: 'topics-list' });

        for (const item of this.project.checklist) {
            const topicItem = topicsList.createEl('div', { cls: 'topic-item' });

            // Topic info
            const topicInfo = topicItem.createEl('div', { cls: 'topic-info' });
            topicInfo.createEl('div', { text: item.name, cls: 'topic-name' });
            
            const status = item.completed ? 'Completed' : 
                         item.id && this.plugin.researchProjectTracker?.isItemProcessing(this.project.id, item.id) ? 'Processing' :
                         'Pending';
            
            const statusEl = topicInfo.createEl('div', { text: status, cls: 'topic-status' });
            statusEl.addClass(`status-${status.toLowerCase()}`);

            // Topic actions
            const actions = topicItem.createEl('div', { cls: 'topic-actions' });

            // Open note button
            if (item.researchNoteFile || item.completed) {
                const openBtn = actions.createEl('button', { 
                    cls: 'topic-action-btn',
                    attr: { title: 'Open research note' }
                });
                openBtn.innerHTML = '📄';
                openBtn.addEventListener('click', () => this.openTopicNote(item));
            }

            // Delete topic button
            const deleteBtn = actions.createEl('button', { 
                cls: 'topic-action-btn delete',
                attr: { title: 'Delete topic' }
            });
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.addEventListener('click', () => this.deleteTopic(item));
        }
    }

    private renderProjectSettings(contentEl: HTMLElement): void {
        const content = contentEl.querySelector('.project-settings-content') as HTMLElement;
        
        const section = content.createEl('div', { cls: 'section' });
        const header = section.createEl('div', { cls: 'section-header' });
        header.createEl('h3', { text: 'Project Settings', cls: 'section-title' });

        const form = section.createEl('div', { cls: 'settings-form' });

        // Basic Settings
        this.renderBasicSettings(form);

        // Research Options  
        this.renderResearchOptions(form);

        // Advanced Options
        this.renderAdvancedOptions(form);
    }

    private renderBasicSettings(form: HTMLElement): void {
        const basicSection = form.createEl('div', { cls: 'form-section' });
        basicSection.createEl('div', { text: 'Basic Settings', cls: 'form-section-title' });

        // Output folder
        const folderGroup = basicSection.createEl('div', { cls: 'form-group' });
        folderGroup.createEl('label', { text: 'Research Output Folder', cls: 'form-label' });
        const folderInput = folderGroup.createEl('input', { 
            cls: 'form-input',
            attr: { 
                type: 'text',
                value: this.project.settings.outputFolder,
                placeholder: 'Generated Research Notes'
            }
        }) as HTMLInputElement;

        folderInput.addEventListener('change', async () => {
            this.project.settings.outputFolder = folderInput.value || 'Generated Research Notes';
            await this.plugin.researchProjectTracker?.saveProjects();
        });
    }

    private renderResearchOptions(form: HTMLElement): void {
        const optionsSection = form.createEl('div', { cls: 'form-section' });
        optionsSection.createEl('div', { text: 'Research Options', cls: 'form-section-title' });

        // Web search options
        const webSearchCheckbox = this.createCheckbox(
            optionsSection,
            'Enable web search',
            this.project.settings.enableWebSearch,
            (checked) => {
                this.project.settings.enableWebSearch = checked;
                this.plugin.researchProjectTracker?.saveProjects();
            }
        );

        const saveIndividualCheckbox = this.createCheckbox(
            optionsSection,
            'Save individual web pages',
            this.project.settings.saveIndividualPages,
            (checked) => {
                this.project.settings.saveIndividualPages = checked;
                this.plugin.researchProjectTracker?.saveProjects();
            }
        );

        // Vault search options
        const vaultSearchCheckbox = this.createCheckbox(
            optionsSection,
            'Search vault for notes with exact words',
            this.project.settings.searchVaultExactWords,
            (checked) => {
                this.project.settings.searchVaultExactWords = checked;
                this.plugin.researchProjectTracker?.saveProjects();
            }
        );

        const semanticSearchCheckbox = this.createCheckbox(
            optionsSection,
            'Enable semantic search',
            this.project.settings.enableSemanticSearch,
            (checked) => {
                this.project.settings.enableSemanticSearch = checked;
                this.plugin.researchProjectTracker?.saveProjects();
            }
        );

        // AI options
        const aiEnhanceCheckbox = this.createCheckbox(
            optionsSection,
            'AI-enhance final notes',
            this.project.settings.aiEnhanceFinalNote,
            (checked) => {
                this.project.settings.aiEnhanceFinalNote = checked;
                this.plugin.researchProjectTracker?.saveProjects();
            }
        );
    }

    private renderAdvancedOptions(form: HTMLElement): void {
        const advancedSection = form.createEl('div', { cls: 'form-section' });
        advancedSection.createEl('div', { text: 'Advanced Options', cls: 'form-section-title' });

        // Max web search results
        const maxResultsGroup = advancedSection.createEl('div', { cls: 'form-group' });
        maxResultsGroup.createEl('label', { text: 'Max web search results per item', cls: 'form-label' });
        const maxResultsInput = maxResultsGroup.createEl('input', { 
            cls: 'form-input',
            attr: { 
                type: 'number',
                value: String(this.project.settings.maxWebSearchResults),
                min: '5',
                max: '20'
            }
        }) as HTMLInputElement;

        maxResultsInput.addEventListener('change', async () => {
            this.project.settings.maxWebSearchResults = parseInt(maxResultsInput.value) || 5;
            await this.plugin.researchProjectTracker?.saveProjects();
        });

        // Custom template
        const templateGroup = advancedSection.createEl('div', { cls: 'form-group' });
        templateGroup.createEl('label', { text: 'Custom Template (optional)', cls: 'form-label' });
        const templateTextarea = templateGroup.createEl('textarea', { 
            cls: 'form-input form-textarea',
            attr: { 
                placeholder: 'Leave empty to use default template, or enter custom template with variables like {{title}}, {{sources}}, etc.'
            }
        }) as HTMLTextAreaElement;

        if (this.project.settings.customTemplate && this.project.settings.customTemplate !== 'research-standard') {
            templateTextarea.value = this.project.settings.customTemplate;
        }

        templateTextarea.addEventListener('change', async () => {
            this.project.settings.customTemplate = templateTextarea.value || 'research-standard';
            await this.plugin.researchProjectTracker?.saveProjects();
        });
    }

    private createCheckbox(
        parent: HTMLElement, 
        label: string, 
        checked: boolean, 
        onChange: (checked: boolean) => void
    ): HTMLInputElement {
        const checkboxDiv = parent.createEl('div', { cls: 'form-checkbox' });
        const checkbox = checkboxDiv.createEl('input', { 
            attr: { type: 'checkbox' }
        }) as HTMLInputElement;
        checkbox.checked = checked;
        
        const labelEl = checkboxDiv.createEl('label', { 
            text: label, 
            cls: 'form-checkbox-label' 
        });
        
        labelEl.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            onChange(checkbox.checked);
        });

        checkbox.addEventListener('change', () => {
            onChange(checkbox.checked);
        });

        return checkbox;
    }

    private async openTopicNote(item: any): Promise<void> {
        const outputFolder = this.project.settings.outputFolder || 'Generated Research Notes';
        const notePath = `${outputFolder}/${item.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, ' ')}.md`;
        
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf();
            await leaf.openFile(file);
        } else {
            new Notice(`Research note not found: ${notePath}`);
        }
    }

    private async deleteTopic(item: any): Promise<void> {
        const confirmed = await this.confirmDelete(item.name);
        if (!confirmed) return;

        // Remove from project checklist
        const index = this.project.checklist.findIndex(i => i.id === item.id);
        if (index !== -1) {
            this.project.checklist.splice(index, 1);
            
            // Update project progress
            this.project.progress.total = this.project.checklist.length;
            this.project.progress.completed = this.project.checklist.filter(i => i.completed).length;
            
            await this.plugin.researchProjectTracker?.saveProjects();
            this.render(); // Re-render to update UI
            
            new Notice(`Deleted topic: ${item.name}`);
        }
    }

    private async confirmDelete(topicName: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'delete-confirmation-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

            const dialog = modal.createEl('div');
            dialog.style.cssText = `
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
            `;

            dialog.createEl('h3', { 
                text: 'Delete Topic?', 
                attr: { style: 'margin: 0 0 12px 0; color: var(--text-normal);' }
            });
            
            dialog.createEl('p', { 
                text: `Are you sure you want to delete "${topicName}"? This action cannot be undone.`,
                attr: { style: 'margin: 0 0 20px 0; color: var(--text-muted);' }
            });

            const buttons = dialog.createEl('div');
            buttons.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

            const cancelBtn = buttons.createEl('button', { text: 'Cancel' });
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-secondary);
                color: var(--text-normal);
                border-radius: 6px;
                cursor: pointer;
            `;

            const deleteBtn = buttons.createEl('button', { text: 'Delete' });
            deleteBtn.style.cssText = `
                padding: 8px 16px;
                border: none;
                background: var(--text-error);
                color: var(--text-on-accent);
                border-radius: 6px;
                cursor: pointer;
            `;

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            deleteBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });

            document.body.appendChild(modal);
        });
    }
}