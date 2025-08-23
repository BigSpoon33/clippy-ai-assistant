import { App, TFile, Notice } from 'obsidian';

interface ResearchSettings {
    outputFolder: string;
    enableWebSearch: boolean;
    saveIndividualPages: boolean;
    searchVaultExactWords: boolean;
    enableSemanticSearch: boolean;
    aiEnhanceFinalNote: boolean;
    maxWebSearchResults: number;
    customTemplate: string;
}

interface ResearchProject {
    id: string;
    name: string;
    description: string;
    checklist: ChecklistItem[];
    createdAt: Date;
    status: 'processing' | 'completed' | 'cancelled' | 'paused' | 'archived';
    progress: {
        total: number;
        completed: number;
        failed: number;
    };
    outputFolder: string;
    template: string;
    generatedNotes: GeneratedNoteInfo[];
    settings: ResearchSettings;
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

export { ResearchSettings, ResearchProject, ChecklistItem, GeneratedNoteInfo };

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
        
        // Create default research settings
        const defaultSettings: ResearchSettings = {
            outputFolder: options.outputFolder || 'Generated Research Notes',
            enableWebSearch: options.enableWebSearch !== false, // Default to true
            saveIndividualPages: options.saveIndividualPages !== false, // Default to true
            searchVaultExactWords: options.searchVaultExactWords !== false, // Default to true
            enableSemanticSearch: options.enableSemanticSearch || false, // Default to false
            aiEnhanceFinalNote: options.aiEnhanceFinalNote !== false, // Default to true
            maxWebSearchResults: options.maxWebSearchResults || 5,
            customTemplate: options.noteTemplate || 'research-standard'
        };

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
            outputFolder: defaultSettings.outputFolder,
            template: defaultSettings.customTemplate,
            generatedNotes: [],
            settings: defaultSettings
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
     * Get all active projects (processing, paused, and completed).
     */
    getActiveProjects(): ResearchProject[] {
        return Array.from(this.projects.values()).filter(p => 
            p.status === 'processing' || p.status === 'paused' || p.status === 'completed'
        );
    }

    /**
     * Get all archived projects.
     */
    getArchivedProjects(): ResearchProject[] {
        return Array.from(this.projects.values()).filter(p => p.status === 'archived');
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
                    Object.entries(projectsData).map(([id, project]: [string, any]) => {
                        const loadedProject = {
                            ...project,
                            createdAt: new Date(project.createdAt),
                            generatedNotes: project.generatedNotes.map((note: any) => ({
                                ...note,
                                createdAt: new Date(note.createdAt)
                            }))
                        };

                        // Add backward compatibility for projects without settings
                        if (!loadedProject.settings) {
                            loadedProject.settings = {
                                outputFolder: loadedProject.outputFolder || 'Generated Research Notes',
                                enableWebSearch: true,
                                saveIndividualPages: true,
                                searchVaultExactWords: true,
                                enableSemanticSearch: false,
                                aiEnhanceFinalNote: true,
                                maxWebSearchResults: 5,
                                customTemplate: loadedProject.template || 'research-standard'
                            };
                        }

                        return [id, loadedProject];
                    })
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

    /**
     * Pause a project
     */
    async pauseProject(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        project.status = 'paused';
        await this.saveProjects();
        console.log(`⏸️ Paused project: ${projectId}`);
    }

    /**
     * Resume a paused project
     */
    async resumeProject(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        project.status = 'processing';
        await this.saveProjects();
        console.log(`▶️ Resumed project: ${projectId}`);
    }

    /**
     * Rename a project
     */
    async renameProject(projectId: string, newName: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const oldName = project.name;
        project.name = newName.trim();
        await this.saveProjects();
        console.log(`📝 Renamed project ${projectId} from "${oldName}" to "${newName}"`);
    }

    /**
     * Add topics (checklist items) to an existing project
     */
    async addTopicsToProject(projectId: string, topics: string[]): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const newItems: ChecklistItem[] = topics.map((topic, index) => ({
            id: `${projectId}-topic-${Date.now()}-${index}`,
            name: topic.trim(),
            searchTerms: [topic.trim()],
            category: 'Research',
            priority: 'medium',
            status: 'pending'
        }));

        project.checklist.push(...newItems);
        project.progress.total += newItems.length;
        
        await this.saveProjects();
        console.log(`➕ Added ${newItems.length} topics to project: ${projectId}`);
    }

    /**
     * Get project files for deletion confirmation
     */
    getProjectFiles(projectId: string): string[] {
        const project = this.projects.get(projectId);
        if (!project) {
            return [];
        }

        const files: string[] = [];
        
        // Add all generated note files
        project.generatedNotes.forEach(note => {
            files.push(note.filePath);
        });

        // Add any checklist item note files
        project.checklist.forEach(item => {
            if (item.noteId) {
                files.push(item.noteId);
            }
        });

        return files;
    }

    /**
     * Get project files and folders for deletion (including web search folders)
     */
    getProjectFilesAndFolders(projectId: string): { files: string[], folders: string[] } {
        const project = this.projects.get(projectId);
        if (!project) {
            return { files: [], folders: [] };
        }

        const files: string[] = [];
        const folders: string[] = [];
        
        // Add all generated note files
        project.generatedNotes.forEach(note => {
            files.push(note.filePath);
        });

        // Add any checklist item note files
        project.checklist.forEach(item => {
            if (item.noteId) {
                files.push(item.noteId);
            }
        });

        // Add web search folders for each checklist item
        project.checklist.forEach(item => {
            const webSearchFolder = `${project.outputFolder}/Web Search - ${this.sanitizeFileName(item.name)}`;
            folders.push(webSearchFolder);
        });

        return { files, folders };
    }

    /**
     * Sanitize filename for folder creation (same logic as comprehensive research system)
     */
    private sanitizeFileName(name: string): string {
        return name
            .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .substring(0, 100); // Limit length
    }

    /**
     * Delete project files
     */
    async deleteProjectFiles(projectId: string): Promise<void> {
        const { files, folders } = this.getProjectFilesAndFolders(projectId);
        let deletedFilesCount = 0;
        let deletedFoldersCount = 0;

        // Delete individual files
        for (const filePath of files) {
            try {
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (file) {
                    await this.app.vault.delete(file);
                    deletedFilesCount++;
                    console.log(`🗑️ Deleted project file: ${filePath}`);
                }
            } catch (error) {
                console.warn(`Failed to delete file ${filePath}:`, error);
            }
        }

        // Delete web search folders and their contents
        for (const folderPath of folders) {
            try {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (folder && folder.children) {
                    // Delete all files in the folder first
                    const folderFiles = folder.children.filter(child => child.path.endsWith('.md'));
                    for (const file of folderFiles) {
                        try {
                            await this.app.vault.delete(file);
                            deletedFilesCount++;
                            console.log(`🗑️ Deleted web search file: ${file.path}`);
                        } catch (error) {
                            console.warn(`Failed to delete web search file ${file.path}:`, error);
                        }
                    }
                    
                    // Then delete the folder itself
                    await this.app.vault.delete(folder);
                    deletedFoldersCount++;
                    console.log(`🗑️ Deleted web search folder: ${folderPath}`);
                }
            } catch (error) {
                console.warn(`Failed to delete folder ${folderPath}:`, error);
            }
        }

        console.log(`🗑️ Deleted ${deletedFilesCount} files and ${deletedFoldersCount} folders for project: ${projectId}`);
    }

    /**
     * Update project settings
     */
    async updateProjectSettings(projectId: string, newSettings: Partial<ResearchSettings>): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        // Update settings
        project.settings = { ...project.settings, ...newSettings };
        
        // Update legacy fields for backward compatibility
        if (newSettings.outputFolder) {
            project.outputFolder = newSettings.outputFolder;
        }
        if (newSettings.customTemplate) {
            project.template = newSettings.customTemplate;
        }
        
        await this.saveProjects();
        console.log(`⚙️ Updated settings for project: ${projectId}`);
    }

    /**
     * Archive a project
     */
    async archiveProject(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        project.status = 'archived';
        await this.saveProjects();
        console.log(`📦 Archived project: ${projectId}`);
    }

    /**
     * Unarchive a project (move back to active)
     */
    async unarchiveProject(projectId: string): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        // Determine if it should be paused or processing based on completion
        const hasUnfinishedItems = project.checklist.some(item => 
            item.status === 'pending' || item.status === 'processing'
        );
        
        project.status = hasUnfinishedItems ? 'paused' : 'completed';
        await this.saveProjects();
        console.log(`📤 Unarchived project: ${project.name} (ID: ${projectId}, status: ${project.status})`);
        
        // Debug: Check if project appears in active projects
        const activeProjects = this.getActiveProjects();
        const isInActive = activeProjects.find(p => p.id === projectId);
        console.log(`🐛 UNARCHIVE DEBUG: Project in active list: ${!!isInActive}, Total active: ${activeProjects.length}`);
    }

    /**
     * Remove a research topic (checklist item) from a project
     */
    async removeTopicFromProject(projectId: string, itemId: string, deleteFiles: boolean = false): Promise<void> {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
        }

        // Find the checklist item
        const itemIndex = project.checklist.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            throw new Error(`Topic with ID ${itemId} not found in project ${projectId}`);
        }

        const item = project.checklist[itemIndex];
        
        // Find associated generated notes
        const associatedNotes = project.generatedNotes.filter(note => note.checklistItemId === itemId);
        
        if (deleteFiles) {
            // Delete associated files
            for (const noteInfo of associatedNotes) {
                try {
                    const file = this.app.vault.getAbstractFileByPath(noteInfo.filePath);
                    if (file instanceof TFile) {
                        await this.app.vault.delete(file);
                        console.log(`🗑️ Deleted file: ${noteInfo.filePath}`);
                    }
                } catch (error) {
                    console.warn(`Failed to delete file ${noteInfo.filePath}:`, error);
                }
            }
        }

        // Remove the checklist item
        project.checklist.splice(itemIndex, 1);
        
        // Remove associated generated notes from tracking
        project.generatedNotes = project.generatedNotes.filter(note => note.checklistItemId !== itemId);
        
        // Update progress counters
        project.progress.total--;
        if (item.status === 'completed') {
            project.progress.completed--;
        } else if (item.status === 'failed') {
            project.progress.failed--;
        }

        await this.saveProjects();
        
        const action = deleteFiles ? 'removed topic and deleted associated files' : 'removed topic (files preserved)';
        console.log(`🗑️ ${action}: ${item.name} from project ${project.name}`);
        
        new Notice(`${deleteFiles ? 'Removed topic and deleted files' : 'Removed topic (files preserved)'}: ${item.name}`);
    }

    /**
     * Get all topics (checklist items) for a project with their associated files
     */
    getProjectTopics(projectId: string): Array<{
        item: ChecklistItem;
        associatedFiles: GeneratedNoteInfo[];
        hasFiles: boolean;
    }> {
        const project = this.projects.get(projectId);
        if (!project) {
            return [];
        }

        return project.checklist.map(item => {
            const associatedFiles = project.generatedNotes.filter(note => note.checklistItemId === item.id);
            return {
                item,
                associatedFiles,
                hasFiles: associatedFiles.length > 0
            };
        });
    }
}