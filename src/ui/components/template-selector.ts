/**
 * Centralized Template Selector Component
 * Provides a reusable dropdown for template selection across the application
 */

import { App } from 'obsidian';
import { TemplateRegistry } from '../../research/template-registry';

export interface TemplateSelectionOptions {
    includeCustomOption?: boolean;
    defaultTemplate?: string;
    onTemplateChange?: (templateName: string, templateContent: string) => void;
    containerClass?: string;
}

export class TemplateSelector {
    private app: App;
    private templateRegistry: TemplateRegistry;
    private selectElement: HTMLSelectElement;
    private previewElement: HTMLTextAreaElement;
    private variablesElement: HTMLDivElement;
    private options: TemplateSelectionOptions;

    constructor(app: App, options: TemplateSelectionOptions = {}) {
        this.app = app;
        this.templateRegistry = TemplateRegistry.getInstance();
        this.options = {
            includeCustomOption: true,
            defaultTemplate: 'research-standard',
            ...options
        };
    }

    /**
     * Create the complete template selector UI
     */
    createTemplateSelector(container: HTMLElement): {
        selectElement: HTMLSelectElement;
        previewElement: HTMLTextAreaElement;
        getSelectedTemplate: () => { name: string; content: string; isCustom: boolean };
        setTemplate: (templateName: string, content?: string) => void;
    } {
        const templateGroup = container.createDiv({ cls: `template-selector-group ${this.options.containerClass || ''}` });
        
        // Template dropdown
        const dropdownGroup = templateGroup.createDiv({ cls: 'template-dropdown-group' });
        dropdownGroup.createEl('label', { text: 'Template:' });
        
        this.selectElement = dropdownGroup.createEl('select', { cls: 'template-select' });
        this.selectElement.style.cssText = 'width: 100%; padding: 6px; margin-top: 4px; margin-bottom: 8px;';
        
        // Populate dropdown with available templates
        this.populateTemplateDropdown();

        // Template preview/editor
        this.previewElement = templateGroup.createEl('textarea', { 
            placeholder: 'Template content will be shown here...',
            cls: 'template-preview'
        });
        this.previewElement.style.cssText = `
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

        // Available variables section
        this.variablesElement = templateGroup.createDiv({ cls: 'template-variables' });
        this.updateVariablesDisplay();

        // Event handlers
        this.selectElement.addEventListener('change', () => {
            this.handleTemplateChange();
        });

        // Initialize with default template
        this.setTemplate(this.options.defaultTemplate || 'research-standard');

        return {
            selectElement: this.selectElement,
            previewElement: this.previewElement,
            getSelectedTemplate: () => this.getSelectedTemplate(),
            setTemplate: (templateName: string, content?: string) => this.setTemplate(templateName, content)
        };
    }

    /**
     * Populate the dropdown with available templates from the centralized registry
     */
    private populateTemplateDropdown(): void {
        // Clear existing options
        this.selectElement.innerHTML = '';

        // Get available template options from the registry
        const templateOptions = this.templateRegistry.getTemplateOptions(this.options.includeCustomOption);

        // Add each template as an option
        templateOptions.forEach(option => {
            const optionEl = this.selectElement.createEl('option', { value: option.value });
            optionEl.textContent = option.text;
        });
    }

    /**
     * Handle template selection changes
     */
    private handleTemplateChange(): void {
        const selectedTemplateName = this.selectElement.value;
        
        if (selectedTemplateName === 'custom') {
            this.previewElement.placeholder = 'Enter your custom template here...';
            this.previewElement.value = '';
            this.previewElement.disabled = false;
        } else {
            // Get template from registry
            const templateContent = this.templateRegistry.getTemplateContent(selectedTemplateName);
            this.previewElement.disabled = true;
            this.previewElement.value = templateContent;
        }

        // Call callback if provided
        if (this.options.onTemplateChange) {
            const { name, content } = this.getSelectedTemplate();
            this.options.onTemplateChange(name, content);
        }
    }

    /**
     * Update the variables display based on current template
     */
    private updateVariablesDisplay(): void {
        this.variablesElement.style.cssText = `
            font-size: 12px; 
            color: var(--text-muted); 
            margin: 8px 0 4px 0; 
            padding: 8px; 
            background: var(--background-secondary); 
            border-radius: 4px;
        `;
        
        // Get available variables (this could be expanded to be template-specific)
        const availableVariables = [
            '{{title}}', '{{today}}', '{{research.status}}', 
            '{{vault.references}}', '{{web.sources}}', '{{overview}}', 
            '{{definitions}}', '{{facts}}', '{{uses}}', '{{warnings}}', 
            '{{research}}', '{{concepts}}', '{{sources}}', '{{wisdom}}'
        ];

        this.variablesElement.innerHTML = `
            <strong>Available variables:</strong> ${availableVariables.join(', ')}
        `;
    }

    /**
     * Get the currently selected template
     */
    private getSelectedTemplate(): { name: string; content: string; isCustom: boolean } {
        const selectedName = this.selectElement.value;
        const isCustom = selectedName === 'custom';
        
        return {
            name: selectedName,
            content: this.previewElement.value,
            isCustom
        };
    }

    /**
     * Programmatically set the template
     */
    private setTemplate(templateName: string, content?: string): void {
        this.selectElement.value = templateName;
        
        if (content) {
            this.previewElement.value = content;
            this.previewElement.disabled = templateName !== 'custom';
        } else {
            this.handleTemplateChange();
        }
    }

    /**
     * Static method to get available templates (for other components that just need the list)
     */
    static getAvailableTemplates(): Array<{id: string, name: string, description: string}> {
        const registry = TemplateRegistry.getInstance();
        return registry.getAllTemplates().map(t => ({
            id: t.id,
            name: t.name,
            description: t.description
        }));
    }

    /**
     * Static method to get template options for dropdowns
     */
    static getTemplateOptions(includeCustom: boolean = true): Array<{value: string, text: string}> {
        const registry = TemplateRegistry.getInstance();
        return registry.getTemplateOptions(includeCustom);
    }
}