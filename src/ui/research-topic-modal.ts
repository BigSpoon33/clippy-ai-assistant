/**
 * Research Topic Input Modal
 * Modal for inputting research topics and configuring research expeditions
 */

import { App, Modal, Setting } from 'obsidian';
import { ResearchExpeditionConfig, ResearchProject } from '../research/research-expedition-system';

export interface ProjectContext {
  projectId?: string;
  projectName?: string;
  createNew?: { 
    name: string; 
    description?: string; 
    tags?: string[] 
  };
}

export class ResearchTopicInputModal extends Modal {
  private topic = '';
  private config: Partial<ResearchExpeditionConfig> = {
    maxDepth: 3,
    maxBranchesPerLevel: 5,
    timeLimit: 30,
    qualityThreshold: 0.7
  };
  private projectContext: ProjectContext = {};
  private selectedProjectId: string | null = null;
  private createNewProject = false;
  private newProjectName = '';
  private newProjectDescription = '';
  
  private onSubmit: (topic: string, config?: Partial<ResearchExpeditionConfig>, projectContext?: ProjectContext) => Promise<void>;
  private availableProjects: ResearchProject[] = [];
  private refreshProjectInputs: () => void = () => {};
  private options: {
    title?: string;
    placeholder?: string;
    showAdvanced?: boolean;
  };

  constructor(
    app: App, 
    onSubmit: (topic: string, config?: Partial<ResearchExpeditionConfig>, projectContext?: ProjectContext) => Promise<void>,
    availableProjects: ResearchProject[] = [],
    options: {
      title?: string;
      placeholder?: string;
      showAdvanced?: boolean;
    } = {}
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.availableProjects = availableProjects;
    this.options = {
      title: 'Start Research Expedition',
      placeholder: 'Enter research topic (e.g., "machine learning fundamentals")...',
      showAdvanced: true,
      ...options
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Title
    contentEl.createEl('h2', { text: this.options.title });
    
    // Description
    const descEl = contentEl.createEl('p', { cls: 'research-description' });
    descEl.innerHTML = `
      <strong>Autonomous Research Expedition</strong><br>
      The AI will automatically explore your topic, identify knowledge gaps, 
      conduct web research, create comprehensive notes, and build intelligent connections.
    `;
    descEl.style.cssText = `
      background: var(--background-secondary);
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid var(--interactive-accent);
    `;

    // Project selection section
    const projectSection = contentEl.createEl('div', { cls: 'research-project-section' });
    projectSection.style.cssText = `
      background: var(--background-modifier-border-hover);
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid var(--background-modifier-border);
    `;

    const projectHeader = projectSection.createEl('h3', { 
      text: '📁 Research Project',
      cls: 'project-section-header'
    });
    projectHeader.style.cssText = 'margin: 0 0 12px 0; font-size: 16px; font-weight: 600;';

    // Project toggle (existing vs new)
    const projectToggle = new Setting(projectSection)
      .setName('Project Mode')
      .setDesc('Select an existing project or create a new one');

    projectToggle.controlEl.style.display = 'flex';
    projectToggle.controlEl.style.gap = '10px';

    const existingBtn = projectToggle.controlEl.createEl('button', {
      text: 'Use Existing',
      cls: 'mod-cta' + (!this.createNewProject ? ' is-active' : '')
    });
    const newBtn = projectToggle.controlEl.createEl('button', {
      text: 'Create New',
      cls: 'mod-cta' + (this.createNewProject ? ' is-active' : '')
    });

    existingBtn.addEventListener('click', () => {
      this.createNewProject = false;
      existingBtn.classList.add('is-active');
      newBtn.classList.remove('is-active');
      this.refreshProjectInputs();
    });

    newBtn.addEventListener('click', () => {
      this.createNewProject = true;
      newBtn.classList.add('is-active');
      existingBtn.classList.remove('is-active');
      this.refreshProjectInputs();
    });

    // Project inputs container
    const projectInputsEl = projectSection.createEl('div', { cls: 'project-inputs' });

    // Existing project dropdown
    const existingProjectEl = projectInputsEl.createEl('div', { cls: 'existing-project-input' });
    if (this.availableProjects.length > 0) {
      const projectSetting = new Setting(existingProjectEl)
        .setName('Select Project')
        .setDesc('Choose from your existing research projects');

      const projectSelect = projectSetting.controlEl.createEl('select');
      projectSelect.style.width = '100%';

      // Add empty option
      const emptyOption = projectSelect.createEl('option', { value: '', text: 'Select a project...' });
      
      // Add project options
      this.availableProjects.forEach(project => {
        const option = projectSelect.createEl('option', {
          value: project.id,
          text: `${project.name} (${project.expeditions.length} expeditions)`
        });
      });

      projectSelect.addEventListener('change', (e) => {
        const selectedId = (e.target as HTMLSelectElement).value;
        this.selectedProjectId = selectedId || null;
        const selectedProject = this.availableProjects.find(p => p.id === selectedId);
        if (selectedProject) {
          this.projectContext = {
            projectId: selectedProject.id,
            projectName: selectedProject.name
          };
        } else {
          this.projectContext = {};
        }
      });
    } else {
      existingProjectEl.createEl('p', {
        text: 'No existing projects found. Create your first project below.',
        cls: 'setting-item-description'
      });
    }

    // New project inputs
    const newProjectEl = projectInputsEl.createEl('div', { cls: 'new-project-input' });
    
    const newProjectNameSetting = new Setting(newProjectEl)
      .setName('Project Name')
      .setDesc('Name for your new research project');

    const newProjectNameInput = newProjectNameSetting.controlEl.createEl('input', {
      type: 'text',
      placeholder: 'e.g., "Sustainable Agriculture Research"'
    });
    newProjectNameInput.style.width = '100%';
    newProjectNameInput.addEventListener('input', (e) => {
      this.newProjectName = (e.target as HTMLInputElement).value;
    });

    const newProjectDescSetting = new Setting(newProjectEl)
      .setName('Description (Optional)')
      .setDesc('Brief description of the project scope');

    const newProjectDescInput = newProjectDescSetting.controlEl.createEl('textarea', {
      placeholder: 'What aspects of this topic will you be researching?'
    });
    newProjectDescInput.style.width = '100%';
    newProjectDescInput.style.minHeight = '60px';
    newProjectDescInput.addEventListener('input', (e) => {
      this.newProjectDescription = (e.target as HTMLTextAreaElement).value;
    });

    // Initially hide/show appropriate inputs
    this.refreshProjectInputs = () => {
      if (this.createNewProject) {
        existingProjectEl.style.display = 'none';
        newProjectEl.style.display = 'block';
      } else {
        existingProjectEl.style.display = 'block';
        newProjectEl.style.display = 'none';
      }
    };
    this.refreshProjectInputs();

    // Topic input
    const topicSetting = new Setting(contentEl)
      .setName('Research Topic')
      .setDesc('What would you like to research?');

    const topicInput = topicSetting.controlEl.createEl('input', {
      type: 'text',
      placeholder: this.options.placeholder
    });
    topicInput.style.width = '100%';
    topicInput.addEventListener('input', (e) => {
      this.topic = (e.target as HTMLInputElement).value;
    });

    if (this.options.showAdvanced) {
      // Advanced configuration section
      const advancedEl = contentEl.createEl('details', { cls: 'research-advanced-config' });
      const summaryEl = advancedEl.createEl('summary', { text: 'Advanced Configuration' });
      summaryEl.style.cssText = 'cursor: pointer; font-weight: 600; margin: 20px 0 10px 0;';
      
      const configEl = advancedEl.createEl('div');
      configEl.style.cssText = 'padding: 10px 0;';

      // Research depth
      new Setting(configEl)
        .setName('Research Depth')
        .setDesc('How many levels deep to research (1-5)')
        .addSlider(slider => slider
          .setLimits(1, 5, 1)
          .setValue(this.config.maxDepth || 3)
          .setDynamicTooltip()
          .onChange(value => {
            this.config.maxDepth = value;
          }));

      // Branches per level
      new Setting(configEl)
        .setName('Research Breadth')
        .setDesc('Maximum research branches per level (3-10)')
        .addSlider(slider => slider
          .setLimits(3, 10, 1)
          .setValue(this.config.maxBranchesPerLevel || 5)
          .setDynamicTooltip()
          .onChange(value => {
            this.config.maxBranchesPerLevel = value;
          }));

      // Time limit
      new Setting(configEl)
        .setName('Time Limit (minutes)')
        .setDesc('Maximum research time (10-60 minutes)')
        .addSlider(slider => slider
          .setLimits(10, 60, 5)
          .setValue(this.config.timeLimit || 30)
          .setDynamicTooltip()
          .onChange(value => {
            this.config.timeLimit = value;
          }));

      // Quality threshold
      new Setting(configEl)
        .setName('Quality Threshold')
        .setDesc('Minimum quality score for content creation (0.5-0.9)')
        .addSlider(slider => slider
          .setLimits(0.5, 0.9, 0.1)
          .setValue(this.config.qualityThreshold || 0.7)
          .setDynamicTooltip()
          .onChange(value => {
            this.config.qualityThreshold = value;
          }));

      // Focus areas
      const focusAreasSetting = new Setting(configEl)
        .setName('Focus Areas (optional)')
        .setDesc('Specific areas to prioritize (comma-separated)');

      const focusAreasInput = focusAreasSetting.controlEl.createEl('input', {
        type: 'text',
        placeholder: 'e.g., fundamentals, applications, best practices'
      });
      focusAreasInput.style.width = '100%';
      focusAreasInput.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.config.focusAreas = value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
      });

      // Exclude patterns
      const excludePatternsSetting = new Setting(configEl)
        .setName('Exclude Patterns (optional)')
        .setDesc('Topics/patterns to avoid (comma-separated)');

      const excludePatternsInput = excludePatternsSetting.controlEl.createEl('input', {
        type: 'text',
        placeholder: 'e.g., commercial, marketing, outdated'
      });
      excludePatternsInput.style.width = '100%';
      excludePatternsInput.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.config.excludePatterns = value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
      });
    }

    // Examples section
    if (this.options.title?.includes('Research Expedition')) {
      const examplesEl = contentEl.createEl('div', { cls: 'research-examples' });
      examplesEl.style.cssText = `
        background: var(--background-secondary);
        padding: 12px;
        border-radius: 6px;
        margin: 20px 0;
      `;
      
      examplesEl.createEl('h4', { text: 'Example Topics:' });
      const examplesList = examplesEl.createEl('ul');
      const examples = [
        'Quantum computing applications',
        'Sustainable agriculture methods', 
        'Neural network architectures',
        'Medieval European trade routes',
        'Renewable energy storage solutions'
      ];
      
      examples.forEach(example => {
        const li = examplesList.createEl('li');
        const link = li.createEl('a', { 
          text: example,
          href: '#'
        });
        link.style.cursor = 'pointer';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          topicInput.value = example;
          this.topic = example;
          topicInput.focus();
        });
      });
    }

    // Buttons
    const buttonContainer = contentEl.createEl('div', { cls: 'research-modal-buttons' });
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid var(--background-modifier-border);
    `;

    // Cancel button
    const cancelBtn = buttonContainer.createEl('button', { 
      text: 'Cancel',
      cls: 'mod-muted'
    });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    // Start button
    const startBtn = buttonContainer.createEl('button', { 
      text: '🚀 Start Research Expedition',
      cls: 'mod-cta'
    });
    startBtn.addEventListener('click', async () => {
      if (!this.topic.trim()) {
        topicInput.focus();
        topicInput.style.borderColor = 'var(--text-error)';
        return;
      }

      // Validate project context
      if (this.createNewProject) {
        if (!this.newProjectName.trim()) {
          // Find the input element to focus
          const nameInput = newProjectEl.querySelector('input') as HTMLInputElement;
          if (nameInput) {
            nameInput.focus();
            nameInput.style.borderColor = 'var(--text-error)';
          }
          return;
        }
        this.projectContext = {
          createNew: {
            name: this.newProjectName.trim(),
            description: this.newProjectDescription.trim() || undefined
          }
        };
      } else if (!this.selectedProjectId && this.availableProjects.length > 0) {
        // User must select a project if projects are available
        const selectEl = existingProjectEl.querySelector('select') as HTMLSelectElement;
        if (selectEl) {
          selectEl.style.borderColor = 'var(--text-error)';
        }
        return;
      }

      this.close();
      await this.onSubmit(this.topic.trim(), this.config, this.projectContext);
    });

    // Focus the input
    topicInput.focus();

    // Enter key to submit
    topicInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.topic.trim()) {
        startBtn.click();
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}