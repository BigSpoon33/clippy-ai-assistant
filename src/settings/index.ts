/**
 * CLIPPY AI Assistant - Settings Module Exports
 * Clean exports for the modular settings system
 */

// Main settings tab
export { ClippySettingsTab } from './settings-tab';

// Settings sections
export { AIProvidersSection } from './sections/ai-providers-section';
export { FeaturesSection } from './sections/features-section';

// Settings components
export { ConnectionTester } from './components/connection-tester';

// Legacy export for compatibility during transition
export { ClippySettingsTab as SettingsManager } from './settings-tab';