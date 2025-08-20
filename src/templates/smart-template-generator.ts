/**
 * Smart Template Generator
 * Integrates with vault agent to provide AI-powered template creation
 */

import { App, TFile, Notice } from 'obsidian';
import { ClippySettings } from '../types';
import { AutoPopulateService } from './auto-populate-service';

export interface TemplateGenerationOptions {
    templateType: 'movie' | 'show' | 'habit' | 'pet' | 'book' | 'project';
    title: string;
    folder?: string;
    openAfterCreation?: boolean;
    useAI?: boolean;
}

export class SmartTemplateGenerator {
    private app: App;
    private settings: ClippySettings;
    private autoPopulateService: AutoPopulateService;

    constructor(app: App, settings: ClippySettings) {
        this.app = app;
        this.settings = settings;
        this.autoPopulateService = new AutoPopulateService(app, settings);
    }

    /**
     * Generate a smart template with AI assistance
     */
    async generateSmartTemplate(options: TemplateGenerationOptions): Promise<TFile | null> {
        const { templateType, title, folder, openAfterCreation = true, useAI = true } = options;

        try {
            // Show loading notice
            const loadingNotice = new Notice(`🤖 Generating ${templateType} template for "${title}"...`, 0);

            let content: string;
            let fileName: string;
            let targetFolder: string;

            // Determine file name and folder
            switch (templateType) {
                case 'movie':
                    fileName = `${title}.md`;
                    targetFolder = folder || '31 - Cinematheque';
                    break;
                case 'show':
                    fileName = `${title}.md`;
                    targetFolder = folder || '31 - Cinematheque';
                    break;
                case 'habit':
                    fileName = `${title} - Habit Profile.md`;
                    targetFolder = folder || '40 - Obsidian/Habits';
                    break;
                case 'pet':
                    fileName = `${title}.md`;
                    targetFolder = folder || '10 - People/Pets';
                    break;
                default:
                    throw new Error(`Unsupported template type: ${templateType}`);
            }

            if (useAI && (templateType === 'movie' || templateType === 'show' || templateType === 'habit')) {
                // Generate AI-powered template
                content = await this.autoPopulateService.generateTemplateWithAI(templateType, title);
            } else {
                // Fall back to basic template
                content = this.generateBasicTemplate(templateType, title);
            }

            // Create the file
            const file = await this.createTemplateFile(fileName, targetFolder, content);

            // Close loading notice
            loadingNotice.hide();

            if (file) {
                new Notice(`✅ Created ${templateType} template: "${title}"`);
                
                if (openAfterCreation) {
                    // Open the newly created file
                    const leaf = this.app.workspace.getUnpinnedLeaf();
                    await leaf.openFile(file);
                }
                
                return file;
            }

            return null;
        } catch (error) {
            console.error('Error generating smart template:', error);
            new Notice(`❌ Failed to generate ${templateType} template: ${error.message}`);
            return null;
        }
    }

    /**
     * Quick template generation (minimal prompts)
     */
    async quickGenerate(templateType: 'movie' | 'show' | 'habit', title: string): Promise<TFile | null> {
        return this.generateSmartTemplate({
            templateType,
            title,
            useAI: true,
            openAfterCreation: true
        });
    }

    /**
     * Create template file in the vault
     */
    private async createTemplateFile(fileName: string, folder: string, content: string): Promise<TFile | null> {
        try {
            // Ensure folder exists
            await this.ensureFolderExists(folder);

            // Create unique filename if file already exists
            const uniqueFileName = await this.getUniqueFileName(folder, fileName);
            const filePath = `${folder}/${uniqueFileName}`;

            // Create the file
            const file = await this.app.vault.create(filePath, content);
            return file;
        } catch (error) {
            console.error('Error creating template file:', error);
            throw new Error(`Failed to create file: ${error.message}`);
        }
    }

    /**
     * Ensure folder exists, create if it doesn't
     */
    private async ensureFolderExists(folderPath: string): Promise<void> {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            await this.app.vault.createFolder(folderPath);
        }
    }

    /**
     * Get unique filename if file already exists
     */
    private async getUniqueFileName(folder: string, fileName: string): Promise<string> {
        const baseName = fileName.replace('.md', '');
        let counter = 1;
        let testName = fileName;

        while (this.app.vault.getAbstractFileByPath(`${folder}/${testName}`)) {
            testName = `${baseName} ${counter}.md`;
            counter++;
        }

        return testName;
    }

    /**
     * Generate basic template without AI (fallback)
     */
    private generateBasicTemplate(templateType: string, title: string): string {
        const date = new Date().toISOString().split('T')[0];
        
        switch (templateType) {
            case 'movie':
                return `---
title: ${title}
status: plan-to-watch
rating: 
tags:
  - plan-to-watch
  - movie
cssclass: zettelkasten
---

# 🎬 ${title}

*Quick add - fill in details later*

## 📋 Basic Info
**Director:** 
**Genre:** 
**Year:** 
**Runtime:** minutes
**Where to Watch:** 

## ⭐ My Rating
**Rating:** ⭐⭐⭐⭐⭐ *(Update when finished)*

**Quick thoughts:**

---
*Created: ${date}*`;

            case 'show':
                return `---
title: ${title}
status: plan-to-watch
rating: 
episodes: 12
tags:
  - plan-to-watch
  - tv-show
cssclass: zettelkasten
---

# 📺 ${title}

*Quick add - fill in details later*

## 📋 Basic Info
**Creator:** 
**Genre:** 
**Year:** 
**Episodes:** 12 *(update this number)*
**Where to Watch:** 

## 📊 Progress
**Episodes:**
- [ ] Episode 1
- [ ] Episode 2
- [ ] Episode 3
- [ ] Episode 4
- [ ] Episode 5
- [ ] Episode 6
- [ ] Episode 7
- [ ] Episode 8
- [ ] Episode 9
- [ ] Episode 10
- [ ] Episode 11
- [ ] Episode 12

## ⭐ My Rating
**Rating:** ⭐⭐⭐⭐⭐ *(Update when finished)*

---
*Created: ${date}*`;

            case 'habit':
                return `---
habit_name: ${title}
category: other
frequency: daily
time_required: 30 minutes
best_time: morning
priority: medium
start_date: ${date}
target_streak: 30
current_streak: 0
tags:
  - habits
  - habit-tracking
cssclass: habit-profile
---

# 🎯 ${title} - Habit Profile

*Quick setup - customize as needed*

## 📋 Habit Details
**Frequency:** Daily
**Time Required:** 30 minutes
**Best Time:** Morning
**Priority:** Medium

## 🎯 Why This Matters
> *Write your motivation here...*

## 📅 Daily Tracking
Use this format in your daily notes:
\`\`\`
- [ ] ${title} (30 min) 📅 YYYY-MM-DD 🔁 daily #Habit/${title.replace(/\s+/g, '')}
\`\`\`

---
*Created: ${date}*`;

            default:
                return `# ${title}\n\n*Template created: ${date}*`;
        }
    }

    /**
     * Add template generation tools to vault agent
     */
    getVaultAgentTools() {
        return {
            generateSmartTemplate: {
                name: 'generate_smart_template',
                description: 'Generate an AI-powered template for movies, TV shows, habits, or other content types',
                parameters: {
                    templateType: {
                        type: 'string',
                        description: 'Type of template to generate (movie, show, habit, pet)',
                        required: true
                    },
                    title: {
                        type: 'string', 
                        description: 'Title or name for the template',
                        required: true
                    },
                    folder: {
                        type: 'string',
                        description: 'Target folder (optional, will use defaults)',
                        required: false
                    },
                    useAI: {
                        type: 'boolean',
                        description: 'Whether to use AI to populate the template with web search data',
                        required: false
                    }
                },
                execute: async (args: TemplateGenerationOptions) => {
                    return await this.generateSmartTemplate(args);
                }
            },

            quickTemplate: {
                name: 'quick_template',
                description: 'Quickly generate a template with AI assistance (for movies, shows, habits)',
                parameters: {
                    type: {
                        type: 'string',
                        description: 'Template type (movie, show, habit)',
                        required: true
                    },
                    title: {
                        type: 'string',
                        description: 'Title or name',
                        required: true
                    }
                },
                execute: async (args: { type: 'movie' | 'show' | 'habit', title: string }) => {
                    return await this.quickGenerate(args.type, args.title);
                }
            }
        };
    }
}