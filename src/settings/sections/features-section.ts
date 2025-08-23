/**
 * CLIPPY AI Assistant - Features Settings Section
 * Handles core feature toggles and configurations
 */

import { Setting } from 'obsidian';
import { ClippySettings } from '../../types';
import ClippyPlugin from '../../main';

export class FeaturesSection {
  private plugin: ClippyPlugin;
  private containerEl: HTMLElement;

  constructor(plugin: ClippyPlugin, containerEl: HTMLElement) {
    this.plugin = plugin;
    this.containerEl = containerEl;
  }

  display(): void {
    this.containerEl.createEl('h3', { text: 'Features' });

    new Setting(this.containerEl)
      .setName('Auto-tagging')
      .setDesc('Automatically suggest tags based on note content')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.autoTagging)
          .onChange(async (value) => {
            this.plugin.settings.features.autoTagging = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(this.containerEl)
      .setName('Note formatting')
      .setDesc('Suggest formatting improvements for notes')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.noteFormatting)
          .onChange(async (value) => {
            this.plugin.settings.features.noteFormatting = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(this.containerEl)
      .setName('Content suggestions')
      .setDesc('Provide suggestions for expanding and improving notes')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.contentSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.features.contentSuggestions = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(this.containerEl)
      .setName('Intelligent Links')
      .setDesc('Enable intelligent link suggestions between notes')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.intelligentLinksEnabled)
          .onChange(async (value) => {
            this.plugin.settings.features.intelligentLinksEnabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(this.containerEl)
      .setName('MoE System')
      .setDesc('Enable Mixture of Experts routing system for specialized AI assistance')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.moeSystemEnabled)
          .onChange(async (value) => {
            this.plugin.settings.features.moeSystemEnabled = value;
            await this.plugin.saveSettings();
          });
      });
  }
}