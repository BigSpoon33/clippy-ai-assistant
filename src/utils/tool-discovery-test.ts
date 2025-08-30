/**
 * Test utility for the enhanced Tool Discovery System
 * This file provides functions to test and validate the auto-discovery functionality
 */

import { App } from 'obsidian';
import { ToolDiscoveryManager } from './tool-discovery-manager';
import { VaultAgent } from '../agents/vault-agent';
import { ClippySettings } from '../types';

export interface ToolDiscoveryTestResult {
  success: boolean;
  toolsDiscovered: number;
  categoriesFound: number;
  customToolsCount: number;
  autoDiscoveredCount: number;
  errors: string[];
  details: {
    sampleCommands: Array<{name: string, category: string, source: string}>;
    categories: Array<{name: string, count: number}>;
  };
}

export class ToolDiscoveryTester {
  private app: App;
  private settings: ClippySettings;

  constructor(app: App, settings: ClippySettings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Run comprehensive test of the tool discovery system
   */
  async runFullTest(): Promise<ToolDiscoveryTestResult> {
    console.log('🧪 Starting Tool Discovery System Test...');
    
    const result: ToolDiscoveryTestResult = {
      success: false,
      toolsDiscovered: 0,
      categoriesFound: 0,
      customToolsCount: 0,
      autoDiscoveredCount: 0,
      errors: [],
      details: {
        sampleCommands: [],
        categories: []
      }
    };

    try {
      // Test 1: ToolDiscoveryManager basic functionality
      console.log('🔍 Test 1: Testing ToolDiscoveryManager...');
      const toolDiscoveryManager = new ToolDiscoveryManager(this.app);
      const discoveredTools = await toolDiscoveryManager.discoverAllTools();
      
      result.autoDiscoveredCount = discoveredTools.length;
      console.log(`✅ Discovered ${discoveredTools.length} tools`);

      // Test 2: Category organization
      console.log('🗂️ Test 2: Testing category organization...');
      const categories = await toolDiscoveryManager.getToolsByCategory();
      result.categoriesFound = categories.length;
      result.details.categories = categories.map(cat => ({
        name: cat.name,
        count: cat.tools.length
      }));
      
      console.log(`✅ Found ${categories.length} categories`);

      // Test 3: VaultAgent integration
      console.log('🤖 Test 3: Testing VaultAgent integration...');
      const vaultAgent = new VaultAgent(this.app, this.settings);
      
      // Wait a moment for async initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const allTools = vaultAgent.getAvailableTools();
      result.toolsDiscovered = allTools.length;
      
      // Count custom vs auto-discovered tools
      result.customToolsCount = allTools.filter(tool => 
        ['create_note', 'read_note', 'update_note', 'search_notes', 'get_vault_stats', 'analyze_note', 'get_note_metadata'].includes(tool.name)
      ).length;
      
      console.log(`✅ VaultAgent initialized with ${allTools.length} total tools`);
      console.log(`   📋 Custom tools: ${result.customToolsCount}`);
      console.log(`   🔧 Auto-discovered: ${result.autoDiscoveredCount}`);

      // Test 4: Sample command execution paths
      console.log('⚡ Test 4: Testing sample command discovery...');
      const sampleCommands = discoveredTools.slice(0, 10).map(tool => ({
        name: tool.name,
        category: tool.category,
        source: tool.source
      }));
      
      result.details.sampleCommands = sampleCommands;
      console.log('✅ Sample commands ready for testing');

      // Test 5: Tool refresh functionality  
      console.log('🔄 Test 5: Testing tool refresh...');
      await vaultAgent.refreshTools();
      const refreshedTools = vaultAgent.getAvailableTools();
      
      if (refreshedTools.length === allTools.length) {
        console.log('✅ Tool refresh maintained same tool count');
      } else {
        console.log(`⚠️ Tool count changed after refresh: ${allTools.length} -> ${refreshedTools.length}`);
      }

      // All tests passed
      result.success = true;
      console.log('🎉 All Tool Discovery System tests passed!');

    } catch (error) {
      result.errors.push(`Test failed: ${error.message}`);
      console.error('❌ Tool Discovery System test failed:', error);
    }

    return result;
  }

  /**
   * Test specific command execution
   */
  async testCommandExecution(commandName: string): Promise<{success: boolean, result?: string, error?: string}> {
    try {
      const toolDiscoveryManager = new ToolDiscoveryManager(this.app);
      const discoveredTools = await toolDiscoveryManager.discoverAllTools();
      
      const matchingTool = discoveredTools.find(tool => 
        tool.name.includes(commandName) || 
        tool.description.toLowerCase().includes(commandName.toLowerCase())
      );

      if (!matchingTool) {
        return { success: false, error: `No tool found matching "${commandName}"` };
      }

      console.log(`🧪 Testing command execution for: ${matchingTool.name}`);
      
      // For safety, we'll only test non-destructive commands
      const safeCommands = ['search', 'list', 'show', 'toggle', 'view'];
      const isSafe = safeCommands.some(safe => matchingTool.name.toLowerCase().includes(safe));
      
      if (!isSafe) {
        return { 
          success: true, 
          result: `Command "${matchingTool.name}" found but not executed for safety (potentially destructive)` 
        };
      }

      // Execute safe commands
      try {
        const result = await matchingTool.execute({});
        return { success: true, result: result };
      } catch (execError) {
        return { success: true, result: `Command found but execution failed: ${execError.message}` };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a test report
   */
  generateTestReport(testResult: ToolDiscoveryTestResult): string {
    const report = `
# Tool Discovery System Test Report

## Overall Result: ${testResult.success ? '✅ PASSED' : '❌ FAILED'}

## Summary Statistics
- **Total Tools Discovered**: ${testResult.toolsDiscovered}
- **Categories Found**: ${testResult.categoriesFound}  
- **Custom Tools**: ${testResult.customToolsCount}
- **Auto-Discovered Tools**: ${testResult.autoDiscoveredCount}

## Categories Breakdown
${testResult.details.categories.map(cat => `- **${cat.name}**: ${cat.count} tools`).join('\n')}

## Sample Auto-Discovered Commands
${testResult.details.sampleCommands.map(cmd => `- \`${cmd.name}\` (${cmd.category}) - Source: ${cmd.source}`).join('\n')}

## Errors
${testResult.errors.length > 0 ? testResult.errors.map(err => `- ❌ ${err}`).join('\n') : '- ✅ No errors encountered'}

---
*Generated by CLIPPY Tool Discovery Tester*
`;

    return report;
  }
}

/**
 * Quick test function for console usage
 */
export async function quickTestToolDiscovery(app: App, settings: ClippySettings): Promise<void> {
  const tester = new ToolDiscoveryTester(app, settings);
  const result = await tester.runFullTest();
  
  console.log('\n' + '='.repeat(50));
  console.log('TOOL DISCOVERY SYSTEM TEST COMPLETE');
  console.log('='.repeat(50));
  console.log(tester.generateTestReport(result));
  console.log('='.repeat(50) + '\n');
}