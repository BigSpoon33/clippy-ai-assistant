import { App, TFile, TAbstractFile, Notice } from 'obsidian';
import { ProjectTracker } from './project-tracker';

export class NoteStatusMonitor {
    private app: App;
    private projectTracker: ProjectTracker;
    private isMonitoring: boolean = false;
    private monitoringInterval: number | null = null;

    constructor(app: App, projectTracker: ProjectTracker) {
        this.app = app;
        this.projectTracker = projectTracker;
    }

    /**
     * Start monitoring notes for completion status changes.
     */
    startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        console.log('📊 Starting note status monitoring for research projects');

        // Monitor file modifications
        this.app.vault.on('modify', this.handleFileModification.bind(this));

        // Periodic check for project completion
        this.monitoringInterval = window.setInterval(() => {
            this.checkProjectCompletions();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop monitoring notes.
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        console.log('📊 Stopping note status monitoring');

        // Remove event listeners
        this.app.vault.off('modify', this.handleFileModification.bind(this));

        // Clear interval
        if (this.monitoringInterval) {
            window.clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Handle file modification events.
     */
    private async handleFileModification(file: TAbstractFile): Promise<void> {
        if (!(file instanceof TFile) || file.extension !== 'md') return;

        // Check if this file is part of a research project
        const project = this.projectTracker.getProjectByNotePath(file.path);
        if (!project) return;

        try {
            const content = await this.app.vault.read(file);
            const isCompleted = this.checkNoteCompletionStatus(content);

            if (isCompleted) {
                await this.projectTracker.markNoteCompleted(file.path);
                console.log(`✅ Note marked as completed: ${file.path}`);
            }

        } catch (error) {
            console.error('Error checking note completion status:', error);
        }
    }

    /**
     * Check if a note is marked as completed based on various indicators.
     */
    private checkNoteCompletionStatus(content: string): boolean {
        const completionIndicators = [
            // Frontmatter status
            /status:\s*["\']?completed["\']?/i,
            /research-status:\s*["\']?completed["\']?/i,
            /note-status:\s*["\']?completed["\']?/i,
            
            // Tag-based indicators
            /#completed[\s\n]/i,
            /#research-completed[\s\n]/i,
            /#status-completed[\s\n]/i,
            
            // Text-based indicators
            /\[status:?\s*completed\]/i,
            /\*\*status:?\s*completed\*\*/i,
            /status:\s*completed/i,
            
            // Checkbox indicators (all main checkboxes checked)
            /- \[x\].*research.*complete/i,
            /- \[x\].*note.*complete/i,
            /✅.*completed/i,
            /✅.*finished/i,
            /✅.*done/i,
            
            // Section-based indicators
            /## status.*completed/i,
            /### completion.*yes/i
        ];

        return completionIndicators.some(pattern => pattern.test(content));
    }

    /**
     * Periodically check all active projects for completion.
     */
    private async checkProjectCompletions(): Promise<void> {
        const activeProjects = this.projectTracker.getActiveProjects();
        
        for (const project of activeProjects) {
            // Check each generated note in the project
            for (const noteInfo of project.generatedNotes) {
                if (noteInfo.status === 'processing') {
                    try {
                        const file = this.app.vault.getAbstractFileByPath(noteInfo.filePath);
                        if (file instanceof TFile) {
                            const content = await this.app.vault.read(file);
                            const isCompleted = this.checkNoteCompletionStatus(content);
                            
                            if (isCompleted) {
                                await this.projectTracker.markNoteCompleted(noteInfo.filePath);
                            }
                        }
                    } catch (error) {
                        console.warn(`Error checking note ${noteInfo.filePath}:`, error);
                    }
                }
            }
        }
    }

    /**
     * Manually mark a note as completed (for user commands).
     */
    async markNoteCompleted(filePath: string): Promise<boolean> {
        const project = this.projectTracker.getProjectByNotePath(filePath);
        if (!project) {
            new Notice('❌ This note is not part of a research project');
            return false;
        }

        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) {
                new Notice('❌ File not found');
                return false;
            }

            // Add completion marker to the note
            await this.addCompletionMarker(file);
            
            // Mark as completed in project tracker
            await this.projectTracker.markNoteCompleted(filePath);
            
            new Notice(`✅ Marked note as completed: ${file.basename}`);
            return true;

        } catch (error) {
            console.error('Error marking note as completed:', error);
            new Notice(`❌ Error marking note as completed: ${error.message}`);
            return false;
        }
    }

    /**
     * Add completion marker to a note.
     */
    private async addCompletionMarker(file: TFile): Promise<void> {
        const content = await this.app.vault.read(file);
        
        // Don't add marker if already present
        if (this.checkNoteCompletionStatus(content)) return;

        let newContent: string;

        // Try to add to frontmatter first
        if (content.startsWith('---')) {
            const frontmatterEndIndex = content.indexOf('---', 3);
            if (frontmatterEndIndex > 0) {
                const frontmatter = content.substring(0, frontmatterEndIndex);
                const restContent = content.substring(frontmatterEndIndex);

                newContent = frontmatter + '\nresearch-status: completed' + restContent;
            } else {
                // Add to end of note
                newContent = content + '\n\n---\n**Status**: ✅ Completed\n';
            }
        } else {
            // Add frontmatter
            newContent = '---\nresearch-status: completed\n---\n\n' + content;
        }

        await this.app.vault.modify(file, newContent);
    }

    /**
     * Get completion status of all notes in a project.
     */
    getProjectCompletionStatus(projectId: string): {
        total: number;
        completed: number;
        processing: number;
        percentage: number;
    } {
        const project = this.projectTracker.getProject(projectId);
        if (!project) {
            return { total: 0, completed: 0, processing: 0, percentage: 0 };
        }

        const total = project.generatedNotes.length;
        const completed = project.generatedNotes.filter(n => n.status === 'completed').length;
        const processing = project.generatedNotes.filter(n => n.status === 'processing').length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, processing, percentage };
    }

    /**
     * Show project completion dashboard.
     */
    showCompletionDashboard(): void {
        const activeProjects = this.projectTracker.getActiveProjects();
        
        if (activeProjects.length === 0) {
            new Notice('📊 No active research projects found');
            return;
        }

        const dashboard = activeProjects.map(project => {
            const status = this.getProjectCompletionStatus(project.id);
            return `📋 ${project.name}: ${status.completed}/${status.total} completed (${status.percentage}%)`;
        }).join('\n');

        new Notice(`📊 Research Project Dashboard:\n\n${dashboard}`, 10000);
    }

    /**
     * Force cleanup of completed projects.
     */
    async forceCleanupCompletedProjects(): Promise<void> {
        await this.projectTracker.cleanupOldProjects(0); // Clean up all completed projects
        new Notice('🧹 Cleaned up completed research projects');
    }
}