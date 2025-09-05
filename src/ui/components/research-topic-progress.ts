/**
 * Research Topic Progress Tracker Component
 * Visual progress tracking for individual research topics with animated progress bars
 */

export interface TopicProgress {
    topicId: string;
    topicName: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    overallProgress: number; // 0-100
    currentStep?: string;
    steps: TopicProgressStep[];
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}

export interface TopicProgressStep {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number; // 0-100
}

export class ResearchTopicProgressTracker {
    private containerEl: HTMLElement;
    private progressMap: Map<string, HTMLElement> = new Map();
    private animationFrames: Map<string, number> = new Map();

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
        this.setupStyles();
    }

    /**
     * Setup CSS styles for progress tracker
     */
    private setupStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .research-topic-progress {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                margin: 4px 0;
                background: var(--background-secondary);
                border-radius: 6px;
                border: 1px solid var(--background-modifier-border);
                transition: all 0.2s ease;
            }

            .research-topic-progress.active {
                border-color: var(--interactive-accent);
                box-shadow: 0 0 8px var(--interactive-accent-hover);
            }

            .research-topic-progress.completed {
                background: var(--color-green-rgb) / 0.1;
                border-color: var(--color-green);
            }

            .research-topic-progress.failed {
                background: var(--color-red-rgb) / 0.1;
                border-color: var(--color-red);
            }

            .topic-status-icon {
                font-size: 16px;
                margin-right: 8px;
                min-width: 20px;
                text-align: center;
            }

            .topic-status-icon.spinning {
                animation: spin 2s linear infinite;
            }

            .topic-info {
                flex: 1;
                margin-right: 12px;
            }

            .topic-name {
                font-weight: 600;
                font-size: 13px;
                color: var(--text-normal);
                margin-bottom: 2px;
            }

            .topic-step {
                font-size: 11px;
                color: var(--text-muted);
                opacity: 0.8;
            }

            .topic-progress-container {
                display: flex;
                align-items: center;
                min-width: 120px;
            }

            .topic-percentage {
                font-size: 11px;
                font-weight: 600;
                color: var(--text-accent);
                margin-right: 8px;
                min-width: 35px;
                text-align: right;
            }

            .topic-progress-bar {
                width: 80px;
                height: 4px;
                background: var(--background-modifier-border);
                border-radius: 2px;
                overflow: hidden;
                position: relative;
            }

            .topic-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--interactive-accent) 0%, var(--interactive-accent-hover) 100%);
                border-radius: 2px;
                transition: width 0.3s ease;
                position: relative;
            }

            .topic-progress-fill.active::after {
                content: '';
                position: absolute;
                top: 0;
                left: -20px;
                width: 20px;
                height: 100%;
                background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
                animation: shimmer 1.5s infinite;
            }

            .topic-progress-sprites {
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                height: 2px;
                transform: translateY(-50%);
                overflow: hidden;
            }

            .progress-sprite {
                position: absolute;
                width: 8px;
                height: 8px;
                background: var(--text-accent);
                border-radius: 50%;
                top: -3px;
                opacity: 0.8;
                transition: left 0.3s ease;
            }

            .progress-sprite.active {
                animation: pulse 1s ease-in-out infinite alternate;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes shimmer {
                0% { left: -20px; }
                100% { left: 100px; }
            }

            @keyframes pulse {
                from { 
                    opacity: 0.6;
                    transform: scale(1);
                }
                to { 
                    opacity: 1;
                    transform: scale(1.2);
                }
            }

            .research-topic-progress:hover {
                background: var(--background-modifier-hover);
            }

            .topic-error {
                font-size: 10px;
                color: var(--color-red);
                margin-top: 2px;
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Update or create progress display for a topic
     */
    updateProgress(progress: TopicProgress): void {
        let element = this.progressMap.get(progress.topicId);
        
        if (!element) {
            element = this.createProgressElement(progress);
            this.progressMap.set(progress.topicId, element);
            this.containerEl.appendChild(element);
        }

        this.updateProgressElement(element, progress);
    }

    /**
     * Create new progress element
     */
    private createProgressElement(progress: TopicProgress): HTMLElement {
        const element = document.createElement('div');
        element.className = 'research-topic-progress';
        element.dataset.topicId = progress.topicId;

        element.innerHTML = `
            <div class="topic-status-icon"></div>
            <div class="topic-info">
                <div class="topic-name"></div>
                <div class="topic-step"></div>
                <div class="topic-error" style="display: none;"></div>
            </div>
            <div class="topic-progress-container">
                <div class="topic-percentage">0%</div>
                <div class="topic-progress-bar">
                    <div class="topic-progress-fill"></div>
                    <div class="topic-progress-sprites"></div>
                </div>
            </div>
        `;

        return element;
    }

    /**
     * Update existing progress element
     */
    private updateProgressElement(element: HTMLElement, progress: TopicProgress): void {
        const statusIcon = element.querySelector('.topic-status-icon') as HTMLElement;
        const topicName = element.querySelector('.topic-name') as HTMLElement;
        const topicStep = element.querySelector('.topic-step') as HTMLElement;
        const topicError = element.querySelector('.topic-error') as HTMLElement;
        const percentage = element.querySelector('.topic-percentage') as HTMLElement;
        const progressFill = element.querySelector('.topic-progress-fill') as HTMLElement;
        const spritesContainer = element.querySelector('.topic-progress-sprites') as HTMLElement;

        // Update status icon
        statusIcon.textContent = this.getStatusIcon(progress.status);
        statusIcon.className = `topic-status-icon ${progress.status === 'in_progress' ? 'spinning' : ''}`;

        // Update topic name
        topicName.textContent = progress.topicName;

        // Update current step
        if (progress.currentStep && progress.status === 'in_progress') {
            topicStep.textContent = progress.currentStep;
            topicStep.style.display = 'block';
        } else {
            topicStep.style.display = 'none';
        }

        // Update error display
        if (progress.error) {
            topicError.textContent = progress.error;
            topicError.style.display = 'block';
        } else {
            topicError.style.display = 'none';
        }

        // Update percentage
        percentage.textContent = `${Math.round(progress.overallProgress)}%`;

        // Update progress bar
        progressFill.style.width = `${progress.overallProgress}%`;
        progressFill.className = `topic-progress-fill ${progress.status === 'in_progress' ? 'active' : ''}`;

        // Update element class
        element.className = `research-topic-progress ${progress.status}`;

        // Update sprites only for active topics
        if (progress.status === 'in_progress') {
            this.updateProgressSprites(spritesContainer, progress);
        } else {
            this.clearProgressSprites(spritesContainer);
        }
    }

    /**
     * Update animated sprites for active progress
     */
    private updateProgressSprites(container: HTMLElement, progress: TopicProgress): void {
        container.innerHTML = ''; // Clear existing sprites

        // Create sprites for completed and in-progress steps
        const completedSteps = progress.steps.filter(s => s.status === 'completed').length;
        const inProgressSteps = progress.steps.filter(s => s.status === 'in_progress').length;
        
        // Add sprites for completed steps (static)
        for (let i = 0; i < completedSteps; i++) {
            const sprite = document.createElement('div');
            sprite.className = 'progress-sprite';
            sprite.style.left = `${(i + 1) * (80 / progress.steps.length) - 4}px`;
            container.appendChild(sprite);
        }

        // Add animated sprite for current step (if any in progress)
        if (inProgressSteps > 0) {
            const sprite = document.createElement('div');
            sprite.className = 'progress-sprite active';
            sprite.style.left = `${(completedSteps + 0.5) * (80 / progress.steps.length) - 4}px`;
            container.appendChild(sprite);
        }
    }

    /**
     * Clear progress sprites
     */
    private clearProgressSprites(container: HTMLElement): void {
        container.innerHTML = '';
    }

    /**
     * Remove progress tracker for a topic
     */
    removeProgress(topicId: string): void {
        const element = this.progressMap.get(topicId);
        if (element) {
            // Stop any animations
            const animationFrame = this.animationFrames.get(topicId);
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                this.animationFrames.delete(topicId);
            }

            // Remove element
            element.remove();
            this.progressMap.delete(topicId);
        }
    }

    /**
     * Clear all progress trackers
     */
    clearAll(): void {
        // Stop all animations
        this.animationFrames.forEach(frame => cancelAnimationFrame(frame));
        this.animationFrames.clear();

        // Remove all elements
        this.progressMap.forEach(element => element.remove());
        this.progressMap.clear();
    }

    /**
     * Get status icon for progress state
     */
    private getStatusIcon(status: 'pending' | 'in_progress' | 'completed' | 'failed'): string {
        switch (status) {
            case 'pending': return '⏳';
            case 'in_progress': return '🔄';
            case 'completed': return '✅';
            case 'failed': return '❌';
            default: return '❓';
        }
    }

    /**
     * Get all active topic IDs
     */
    getActiveTopics(): string[] {
        return Array.from(this.progressMap.keys());
    }

    /**
     * Check if topic is being tracked
     */
    hasProgress(topicId: string): boolean {
        return this.progressMap.has(topicId);
    }
}