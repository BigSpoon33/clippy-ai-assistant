import { App, TFile, Notice } from 'obsidian';

interface ResearchProject {
    id: string;
    name: string;
    description: string;
    checklist: ChecklistItem[];
    createdAt: Date;
    status: 'processing' | 'completed' | 'cancelled';
    progress: {
        total: number;
        completed: number;
        failed: number;
    };
    outputFolder: string;
    template: string;
    generatedNotes: GeneratedNoteInfo[];
}

interface ChecklistItem {
    id: string;
    name: string;
    searchTerms: string[];
    category: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    noteId?: string;
    error?: string;
}

interface GeneratedNoteInfo {
    id: string;
    filePath: string;
    checklistItemId: string;
    createdAt: Date;
    status: 'processing' | 'completed';
    projectTag: string;
}

export class ProjectTracker {
    private app: App;
    private projects: Map<string, ResearchProject> = new Map();
    private storageKey = 'clippy-research-projects';

    constructor(app: App) {
        this.app = app;
        this.loadProjects();
    }

    /**
     * Create a new research project from a checklist.
     */
    async createProject(
        name: string,
        description: string,
        checklist: any[],
        options: any
    ): Promise<string> {
        const projectId = this.generateProjectId();
        
        const project: ResearchProject = {
            id: projectId,
            name: name || `Research Project ${new Date().toLocaleDateString()}`,
            description: description || 'Automated research note generation',
            checklist: checklist.map((item, index) => ({
                id: `${projectId}-item-${index}`,
                name: item.name,
                searchTerms: item.searchTerms || [item.name],
                category: item.category || 'Research',
                priority: item.priority || 'medium',
                status: 'pending'
            })),
            createdAt: new Date(),
            status: 'processing',
            progress: {
                total: checklist.length,
                completed: 0,
                failed: 0
            },
            outputFolder: options.outputFolder || 'Generated Research Notes',
            template: options.noteTemplate || 'research-standard',
            generatedNotes: []
        };

        this.projects.set(projectId, project);
        await this.saveProjects();

        console.log(`📋 Created research project: ${projectId} with ${checklist.length} items`);
        new Notice(`📋 Created research project: ${project.name}`);

        return projectId;
    }

    /**
     * Mark a checklist item as being processed.
     */
    async markItemProcessing(projectId: string, itemId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        const item = project.checklist.find(i => i.id === itemId);
        if (item) {
            item.status = 'processing';
            await this.saveProjects();
        }
    }

    /**
     * Mark a checklist item as completed and link it to generated note.
     */
    async markItemCompleted(
        projectId: string,
        itemId: string,
        noteFilePath: string
    ): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        const item = project.checklist.find(i => i.id === itemId);
        if (!item) return;

        // Update item status
        item.status = 'completed';
        item.noteId = noteFilePath;

        // Add to generated notes
        const noteInfo: GeneratedNoteInfo = {
            id: this.generateNoteId(),
            filePath: noteFilePath,
            checklistItemId: itemId,
            createdAt: new Date(),
            status: 'processing',
            projectTag: this.getProjectTag(projectId)
        };

        project.generatedNotes.push(noteInfo);

        // Update progress
        project.progress.completed++;

        // Add project tracking tag to the note
        await this.addProjectTagToNote(noteFilePath, this.getProjectTag(projectId));

        await this.saveProjects();

        console.log(`✅ Marked item ${itemId} as completed for project ${projectId}`);

        // Check if project is complete
        await this.checkProjectCompletion(projectId);
    }

    /**
     * Mark a checklist item as failed.
     */
    async markItemFailed(
        projectId: string,
        itemId: string,
        error: string
    ): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        const item = project.checklist.find(i => i.id === itemId);
        if (item) {
            item.status = 'failed';
            item.error = error;
            project.progress.failed++;
            await this.saveProjects();
        }
    }

    /**
     * Mark a generated note as completed (user sets tag to completed).
     */
    async markNoteCompleted(filePath: string): Promise<void> {
        console.log(`📝 Marking note as completed: ${filePath}`);

        // Find the project and note
        for (const [projectId, project] of this.projects) {
            const noteInfo = project.generatedNotes.find(n => n.filePath === filePath);
            if (noteInfo && noteInfo.status === 'processing') {
                noteInfo.status = 'completed';

                // Update the original checklist item
                const item = project.checklist.find(i => i.id === noteInfo.checklistItemId);
                if (item) {
                    // Mark as fully completed in the original checklist
                    console.log(`✅ Marking original checklist item as completed: ${item.name}`);
                }

                await this.saveProjects();

                // Check if all notes in project are completed
                await this.checkProjectCompletion(projectId);
                break;
            }
        }
    }

    /**
     * Check if project is completed and clean up if necessary.
     */
    private async checkProjectCompletion(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        const allNotesCompleted = project.generatedNotes.every(n => n.status === 'completed');
        const allItemsProcessed = project.checklist.every(i => 
            i.status === 'completed' || i.status === 'failed'
        );

        if (allNotesCompleted && allItemsProcessed) {
            project.status = 'completed';
            
            // Remove project tracking tags from all notes
            for (const noteInfo of project.generatedNotes) {
                await this.removeProjectTagFromNote(noteInfo.filePath, noteInfo.projectTag);
            }

            new Notice(`🎉 Research project completed: ${project.name}`);
            console.log(`🎉 Project ${projectId} completed and cleaned up`);

            // Optionally remove the project after a delay
            setTimeout(async () => {
                this.projects.delete(projectId);
                await this.saveProjects();
                console.log(`🗑️ Cleaned up completed project: ${projectId}`);
            }, 5000); // 5 second delay before cleanup
        }
    }

    /**
     * Generate a unique project ID.
     */
    private generateProjectId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `clippy-research-${timestamp}-${random}`;
    }

    /**
     * Generate a unique note ID.
     */
    private generateNoteId(): string {
        return `note-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    }

    /**
     * Get project tracking tag.
     */
    private getProjectTag(projectId: string): string {
        return `project-${projectId}`;
    }

    /**
     * Add project tracking tag to a note.
     */
    private async addProjectTagToNote(filePath: string, projectTag: string): Promise<void> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return;

            const content = await this.app.vault.read(file);
            
            // Check if note already has the tag
            if (content.includes(`#${projectTag}`)) return;

            // Add tag to frontmatter or inline
            let newContent: string;

            if (content.startsWith('---')) {
                // Has frontmatter - add to tags
                const frontmatterEndIndex = content.indexOf('---', 3);
                if (frontmatterEndIndex > 0) {
                    const frontmatter = content.substring(0, frontmatterEndIndex + 3);
                    const restContent = content.substring(frontmatterEndIndex + 3);

                    if (frontmatter.includes('tags:')) {
                        // Add to existing tags
                        newContent = frontmatter.replace(
                            /tags:\s*\[(.*?)\]/s,
                            (match, tagList) => {
                                const tags = tagList.split(',').map((t: string) => t.trim().replace(/"/g, ''));
                                tags.push(projectTag);
                                return `tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]`;
                            }
                        ) + restContent;
                    } else {
                        // Add tags field
                        newContent = frontmatter.replace(
                            '---',
                            `tags: ["${projectTag}"]\n---`
                        ) + restContent;
                    }
                } else {
                    newContent = content;
                }
            } else {
                // No frontmatter - add tag inline at the end
                newContent = content + `\n\n---\n*Project: #${projectTag}*`;
            }

            await this.app.vault.modify(file, newContent);
            console.log(`🏷️ Added project tag ${projectTag} to ${filePath}`);

        } catch (error) {
            console.error('Error adding project tag:', error);
        }
    }

    /**
     * Remove project tracking tag from a note.
     */
    private async removeProjectTagFromNote(filePath: string, projectTag: string): Promise<void> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return;

            const content = await this.app.vault.read(file);
            
            // Remove tag from frontmatter or inline
            let newContent = content
                .replace(new RegExp(`"${projectTag}",?\\s*`, 'g'), '')
                .replace(new RegExp(`${projectTag},?\\s*`, 'g'), '')
                .replace(new RegExp(`#${projectTag}`, 'g'), '')
                .replace(/---\s*\*Project:\s*\*\s*$/gm, '') // Remove inline project sections
                .replace(/\n\s*\n\s*\n/g, '\n\n'); // Clean up extra newlines

            // Clean up empty tags arrays
            newContent = newContent.replace(/tags:\s*\[\s*\]/g, '');

            if (newContent !== content) {
                await this.app.vault.modify(file, newContent);
                console.log(`🗑️ Removed project tag ${projectTag} from ${filePath}`);
            }

        } catch (error) {
            console.error('Error removing project tag:', error);
        }
    }

    /**
     * Get project by ID.
     */
    getProject(projectId: string): ResearchProject | undefined {
        return this.projects.get(projectId);
    }

    /**
     * Get all active projects.
     */
    getActiveProjects(): ResearchProject[] {
        return Array.from(this.projects.values()).filter(p => p.status === 'processing');
    }

    /**
     * Get project by note file path.
     */
    getProjectByNotePath(filePath: string): ResearchProject | undefined {
        for (const project of this.projects.values()) {
            if (project.generatedNotes.some(n => n.filePath === filePath)) {
                return project;
            }
        }
        return undefined;
    }

    /**
     * Cancel a project.
     */
    async cancelProject(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) return;

        project.status = 'cancelled';

        // Remove tags from all generated notes
        for (const noteInfo of project.generatedNotes) {
            await this.removeProjectTagFromNote(noteInfo.filePath, noteInfo.projectTag);
        }

        await this.saveProjects();
        new Notice(`❌ Cancelled research project: ${project.name}`);
    }

    /**
     * Load projects from storage.
     */
    private async loadProjects(): Promise<void> {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const projectsData = JSON.parse(data);
                this.projects = new Map(
                    Object.entries(projectsData).map(([id, project]: [string, any]) => [
                        id,
                        {
                            ...project,
                            createdAt: new Date(project.createdAt),
                            generatedNotes: project.generatedNotes.map((note: any) => ({
                                ...note,
                                createdAt: new Date(note.createdAt)
                            }))
                        }
                    ])
                );
                console.log(`📂 Loaded ${this.projects.size} research projects`);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    /**
     * Save projects to storage.
     */
    private async saveProjects(): Promise<void> {
        try {
            const projectsData = Object.fromEntries(this.projects);
            localStorage.setItem(this.storageKey, JSON.stringify(projectsData));
        } catch (error) {
            console.error('Error saving projects:', error);
        }
    }

    /**
     * Clear completed projects older than specified days.
     */
    async cleanupOldProjects(daysOld: number = 7): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let removedCount = 0;
        for (const [projectId, project] of this.projects) {
            if (project.status === 'completed' && project.createdAt < cutoffDate) {
                this.projects.delete(projectId);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            await this.saveProjects();
            console.log(`🧹 Cleaned up ${removedCount} old completed projects`);
        }
    }
}