/**
 * CLIPPY AI Assistant - Main Settings Tab
 * Orchestrates all settings sections in a modular way
 */

import { App, PluginSettingTab } from 'obsidian';
import ClippyPlugin from '../main';

// Import settings sections
import { AIProvidersSection } from './sections/ai-providers-section';
import { FeaturesSection } from './sections/features-section';
import { ConnectionTester } from './components/connection-tester';

export class ClippySettingsTab extends PluginSettingTab {
  plugin: ClippyPlugin;

  constructor(app: App, plugin: ClippyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Main header
    containerEl.createEl('h2', { text: 'CLIPPY AI Assistant Settings' });
    
    containerEl.createEl('p', { 
      text: 'Configure your AI providers and customize CLIPPY\'s behavior.' 
    });

    // Add documentation section (simplified for now)
    this.addDocumentationSection();

    // Core settings sections
    const aiProvidersSection = new AIProvidersSection(this.plugin, containerEl);
    aiProvidersSection.display();

    const featuresSection = new FeaturesSection(this.plugin, containerEl);
    featuresSection.display();

    // Connection testing
    const connectionTester = new ConnectionTester(this.plugin);
    connectionTester.createConnectionTestSection(containerEl);

    // TODO: Add other sections as they are created:
    // - Voice settings section
    // - Research settings section  
    // - MoE settings section
    // - System prompts section
  }

  private addDocumentationSection(): void {
    const { containerEl } = this;
    
    // Create a collapsible documentation section
    const docSection = containerEl.createDiv('setting-item');
    const docHeader = docSection.createEl('h3', { text: '📚 Documentation & Help' });
    docHeader.style.cursor = 'pointer';
    docHeader.style.userSelect = 'none';
    
    const docContent = docSection.createDiv('setting-item-description');
    docContent.style.display = 'none';
    
    docContent.createEl('p', { 
      text: 'Welcome to CLIPPY AI Assistant! Here are some helpful resources to get you started:' 
    });

    const linkList = docContent.createEl('ul');
    linkList.createEl('li').createEl('a', {
      text: '📖 Full Documentation',
      href: '#',
    }).addEventListener('click', (e) => {
      e.preventDefault();
      this.showDocumentationModal();
    });
    
    linkList.createEl('li').createEl('a', {
      text: '🚀 Quick Start Guide', 
      href: '#',
    }).addEventListener('click', (e) => {
      e.preventDefault();
      this.showQuickStartModal();
    });

    // Toggle visibility
    docHeader.addEventListener('click', () => {
      const isVisible = docContent.style.display !== 'none';
      docContent.style.display = isVisible ? 'none' : 'block';
      docHeader.textContent = isVisible ? '📚 Documentation & Help' : '📚 Documentation & Help (expanded)';
    });
  }

  private showDocumentationModal(): void {
    // TODO: Implement documentation modal
    console.log('Documentation modal would open here');
  }

  private showQuickStartModal(): void {
    // TODO: Implement quick start modal  
    console.log('Quick start modal would open here');
  }
}