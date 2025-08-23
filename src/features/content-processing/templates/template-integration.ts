/**
 * Template Integration
 * Adds smart template generation capabilities to Clippy
 */

import { App } from 'obsidian';
import { ClippySettings } from '../../../types';
import { SmartTemplateGenerator } from './smart-template-generator';
import { VaultAgent, VaultTool } from '../../../agents/vault-agent';

export class TemplateIntegration {
    private app: App;
    private settings: ClippySettings;
    private templateGenerator: SmartTemplateGenerator;

    constructor(app: App, settings: ClippySettings) {
        this.app = app;
        this.settings = settings;
        this.templateGenerator = new SmartTemplateGenerator(app, settings);
    }

    /**
     * Get template tools for vault agent integration
     */
    getTemplateTools(): Map<string, VaultTool> {
        const tools = new Map<string, VaultTool>();

        // Smart template generation
        tools.set('generate_smart_template', {
            name: 'generate_smart_template',
            description: 'Generate an AI-powered template for movies, TV shows, habits, or other content. Automatically fetches data from the web and populates the template.',
            parameters: {
                templateType: {
                    type: 'string',
                    description: 'Type of template to generate: movie, show, habit, pet, book, project',
                    required: true
                },
                title: {
                    type: 'string',
                    description: 'Title or name for the content (e.g., "Attack on Titan", "Morning Exercise")',
                    required: true
                },
                folder: {
                    type: 'string',
                    description: 'Target folder path (optional, will use smart defaults)',
                    required: false
                },
                useAI: {
                    type: 'boolean',
                    description: 'Whether to use AI web search to auto-populate data (default: true)',
                    required: false
                }
            },
            execute: async (args: any) => {
                const { templateType, title, folder, useAI = true } = args;
                
                console.log(`🤖 CLIPPY: Generating ${templateType} template for "${title}"`);
                
                const file = await this.templateGenerator.generateSmartTemplate({
                    templateType,
                    title,
                    folder,
                    useAI,
                    openAfterCreation: true
                });

                if (file) {
                    return {
                        success: true,
                        message: `Created ${templateType} template: "${title}"`,
                        filePath: file.path,
                        fileName: file.name
                    };
                } else {
                    return {
                        success: false,
                        message: `Failed to create ${templateType} template for "${title}"`
                    };
                }
            }
        });

        // Quick template generation (simplified)
        tools.set('quick_template', {
            name: 'quick_template',
            description: 'Quickly create a template with minimal setup. Perfect for rapid content addition.',
            parameters: {
                type: {
                    type: 'string',
                    description: 'Template type: movie, show, habit',
                    required: true
                },
                title: {
                    type: 'string',
                    description: 'Title or name for the content',
                    required: true
                }
            },
            execute: async (args: any) => {
                const { type, title } = args;
                
                console.log(`⚡ CLIPPY: Quick generating ${type} template for "${title}"`);
                
                const file = await this.templateGenerator.quickGenerate(type, title);

                if (file) {
                    return {
                        success: true,
                        message: `Quick created ${type} template: "${title}"`,
                        filePath: file.path,
                        fileName: file.name
                    };
                } else {
                    return {
                        success: false,
                        message: `Failed to quick create ${type} template for "${title}"`
                    };
                }
            }
        });

        // AI research for existing templates
        tools.set('enhance_template', {
            name: 'enhance_template',
            description: 'Enhance an existing template with AI-researched data. Useful for filling in missing information.',
            parameters: {
                filePath: {
                    type: 'string',
                    description: 'Path to the existing template file',
                    required: true
                },
                templateType: {
                    type: 'string',
                    description: 'Type of template (movie, show, habit)',
                    required: true
                }
            },
            execute: async (args: any) => {
                const { filePath, templateType } = args;
                
                console.log(`🔍 CLIPPY: Enhancing ${templateType} template at ${filePath}`);
                
                // Get the existing file
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (!file) {
                    return {
                        success: false,
                        message: `File not found: ${filePath}`
                    };
                }

                // Read current content
                const content = await this.app.vault.read(file as any);
                
                // Extract title from frontmatter or filename
                const titleMatch = content.match(/title: (.+)/);
                const title = titleMatch ? titleMatch[1] : file.name.replace('.md', '');

                try {
                    // Generate enhanced data
                    let enhancedData;
                    switch (templateType) {
                        case 'movie':
                            enhancedData = await this.templateGenerator['autoPopulateService'].populateMovie(title);
                            break;
                        case 'show':
                            enhancedData = await this.templateGenerator['autoPopulateService'].populateShow(title);
                            break;
                        case 'habit':
                            enhancedData = await this.templateGenerator['autoPopulateService'].populateHabit(title);
                            break;
                        default:
                            throw new Error(`Unsupported template type: ${templateType}`);
                    }

                    // Update the file with enhanced data
                    const enhancedContent = this.mergeTemplateData(content, enhancedData);
                    await this.app.vault.modify(file as any, enhancedContent);

                    return {
                        success: true,
                        message: `Enhanced ${templateType} template with AI research data`,
                        enhancedFields: Object.keys(enhancedData)
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: `Failed to enhance template: ${error.message}`
                    };
                }
            }
        });

        return tools;
    }

    /**
     * Merge AI-researched data into existing template
     */
    private mergeTemplateData(existingContent: string, newData: any): string {
        let updatedContent = existingContent;

        // Update frontmatter fields that are empty
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const frontmatterMatch = existingContent.match(frontmatterRegex);
        
        if (frontmatterMatch) {
            let frontmatter = frontmatterMatch[1];
            
            // Update empty fields
            Object.entries(newData).forEach(([key, value]) => {
                if (value && key !== 'title') {
                    const fieldRegex = new RegExp(`^${key}:\\s*$`, 'm');
                    if (fieldRegex.test(frontmatter)) {
                        frontmatter = frontmatter.replace(fieldRegex, `${key}: ${value}`);
                    }
                }
            });
            
            updatedContent = updatedContent.replace(frontmatterMatch[1], frontmatter);
        }

        // Add enhancement notice
        if (!updatedContent.includes('*Auto-populated')) {
            updatedContent = updatedContent.replace(
                /(# [^\n]+\n)/,
                `$1\n*Auto-enhanced with web search data - verify and update as needed*\n`
            );
        }

        return updatedContent;
    }

    /**
     * Register template commands for Obsidian
     */
    registerCommands() {
        // Command: Generate Smart Movie Template
        (this.app as any).commands.addCommand({
            id: 'clippy-generate-movie-template',
            name: 'Generate Smart Movie Template',
            callback: async () => {
                const title = await this.promptForTitle('Movie Title');
                if (title) {
                    await this.templateGenerator.quickGenerate('movie', title);
                }
            }
        });

        // Command: Generate Smart Show Template
        (this.app as any).commands.addCommand({
            id: 'clippy-generate-show-template',
            name: 'Generate Smart TV Show Template',
            callback: async () => {
                const title = await this.promptForTitle('TV Show Title');
                if (title) {
                    await this.templateGenerator.quickGenerate('show', title);
                }
            }
        });

        // Command: Generate Smart Habit Template
        (this.app as any).commands.addCommand({
            id: 'clippy-generate-habit-template',
            name: 'Generate Smart Habit Template',
            callback: async () => {
                const title = await this.promptForTitle('Habit Name');
                if (title) {
                    await this.templateGenerator.quickGenerate('habit', title);
                }
            }
        });
    }

    /**
     * Prompt user for title input
     */
    private async promptForTitle(placeholder: string): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
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
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            `;

            const title = document.createElement('h3');
            title.textContent = `Create Smart Template`;
            title.style.marginTop = '0';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder;
            input.style.cssText = `
                width: 300px;
                padding: 8px;
                margin: 10px 0;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background: var(--background-primary);
                color: var(--text-normal);
            `;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;';

            const createButton = document.createElement('button');
            createButton.textContent = 'Create';
            createButton.style.cssText = `
                padding: 8px 16px;
                background: var(--interactive-accent);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                padding: 8px 16px;
                background: var(--background-modifier-hover);
                color: var(--text-normal);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
            `;

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
            `;

            const cleanup = () => {
                document.body.removeChild(overlay);
                document.body.removeChild(modal);
            };

            createButton.onclick = () => {
                const value = input.value.trim();
                cleanup();
                resolve(value || null);
            };

            cancelButton.onclick = () => {
                cleanup();
                resolve(null);
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    createButton.click();
                } else if (e.key === 'Escape') {
                    cancelButton.click();
                }
            };

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(createButton);
            modal.appendChild(title);
            modal.appendChild(input);
            modal.appendChild(buttonContainer);

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            input.focus();
        });
    }
}