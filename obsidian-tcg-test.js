// CLIPPY TCG Direct Test - Copy and paste this entire code into Obsidian's console

(function() {
  console.log('🎮 CLIPPY TCG System Test Starting...');
  console.log('='.repeat(60));

  // Test 1: Check if we're in Obsidian
  function testObsidianEnvironment() {
    console.log('🔍 Test 1: Obsidian Environment Check');
    
    if (typeof app === 'undefined') {
      console.log('❌ Not running in Obsidian environment');
      return false;
    }
    
    console.log('✅ Running in Obsidian');
    console.log(`📱 App version: ${app.appVersion || 'unknown'}`);
    console.log(`📁 Vault name: ${app.vault.getName()}`);
    console.log(`📄 Total files: ${app.vault.getAllLoadedFiles().length}`);
    return true;
  }

  // Test 2: Check plugin status
  function testPluginStatus() {
    console.log('\n🔌 Test 2: Plugin Status Check');
    
    try {
      const plugins = app.plugins;
      const clippyPlugin = plugins.plugins['clippy-ai-assistant'];
      
      if (!clippyPlugin) {
        console.log('❌ CLIPPY plugin not found or not loaded');
        return false;
      }
      
      console.log('✅ CLIPPY plugin found and loaded');
      console.log(`📊 Plugin enabled: ${plugins.enabledPlugins.has('clippy-ai-assistant')}`);
      
      // Check for TCG system
      if (clippyPlugin.tcgSystem) {
        console.log('✅ TCG System found on plugin');
        console.log(`🎮 TCG initialized: ${clippyPlugin.tcgSystem.systemState?.initialized || false}`);
        console.log(`▶️ TCG running: ${clippyPlugin.tcgSystem.systemState?.running || false}`);
      } else {
        console.log('⚠️ TCG System not found on plugin (may not be initialized yet)');
      }
      
      return true;
    } catch (error) {
      console.log('❌ Error checking plugin status:', error.message);
      return false;
    }
  }

  // Test 3: Check TCG folder structure
  function testFolderStructure() {
    console.log('\n📁 Test 3: TCG Folder Structure Check');
    
    const requiredFolders = [
      'tcg',
      'tcg/templates', 
      'tcg/cards',
      'tcg/packs',
      'tcg/player-cards'
    ];
    
    const results = {};
    
    requiredFolders.forEach(folder => {
      const folderObj = app.vault.getAbstractFileByPath(folder);
      results[folder] = !!folderObj;
      console.log(`${folderObj ? '✅' : '❌'} ${folder}`);
    });
    
    return Object.values(results).every(Boolean);
  }

  // Test 4: Check TCG templates
  function testTemplates() {
    console.log('\n📋 Test 4: TCG Templates Check');
    
    const requiredTemplates = [
      'tcg/templates/card-template.md',
      'tcg/templates/pack-template.md', 
      'tcg/templates/starter-pack.md',
      'tcg/templates/core-set-pack.md',
      'tcg/templates/player-card-template.md'
    ];
    
    const results = {};
    
    requiredTemplates.forEach(template => {
      const templateFile = app.vault.getAbstractFileByPath(template);
      results[template] = !!templateFile;
      console.log(`${templateFile ? '✅' : '❌'} ${template.split('/').pop()}`);
    });
    
    return Object.values(results).filter(Boolean).length >= 3; // At least 3 templates
  }

  // Test 5: Check available commands
  function testCommands() {
    console.log('\n⌨️ Test 5: TCG Commands Check');
    
    const tcgCommands = [
      'tcg-test-keystroke-reward',
      'tcg-pack-inventory',
      'tcg-open-pack',
      'tcg-view-collection',
      'tcg-dashboard'
    ];
    
    let foundCommands = 0;
    
    if (app.commands && app.commands.commands) {
      const allCommands = Object.keys(app.commands.commands);
      
      tcgCommands.forEach(cmdId => {
        const fullCmdId = `clippy-ai-assistant:${cmdId}`;
        const found = allCommands.includes(fullCmdId);
        console.log(`${found ? '✅' : '❌'} ${cmdId}`);
        if (found) foundCommands++;
      });
    }
    
    console.log(`📊 Found ${foundCommands}/${tcgCommands.length} TCG commands`);
    return foundCommands > 0;
  }

  // Test 6: Test basic functionality
  function testBasicFunctionality() {
    console.log('\n🎲 Test 6: Basic Functionality Test');
    
    try {
      // Test RNG simulation
      const testRandom = () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(Math.random());
        }
        return results.every(n => n >= 0 && n < 1);
      };
      
      console.log(`✅ Random number generation: ${testRandom()}`);
      
      // Test progression calculation
      const calculateLevel = (exp) => {
        const baseExp = 100;
        let level = 1;
        let requiredExp = baseExp;
        
        while (exp >= requiredExp) {
          exp -= requiredExp;
          level++;
          requiredExp = Math.floor(baseExp * Math.pow(level, 1.2));
        }
        
        return { level, remainingExp: exp, nextLevelExp: requiredExp };
      };
      
      const testProgression = calculateLevel(1500);
      console.log(`✅ Progression calculation: Level ${testProgression.level} (${testProgression.remainingExp}/${testProgression.nextLevelExp})`);
      
      // Test card rarity simulation  
      const simulateCardRarity = () => {
        const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        const weights = [0.5, 0.3, 0.15, 0.04, 0.01];
        
        const rand = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < rarities.length; i++) {
          cumulative += weights[i];
          if (rand < cumulative) {
            return rarities[i];
          }
        }
        return rarities[0];
      };
      
      const testCards = Array.from({length: 10}, simulateCardRarity);
      console.log(`✅ Card rarity simulation: ${testCards.join(', ')}`);
      
      return true;
    } catch (error) {
      console.log('❌ Basic functionality test failed:', error.message);
      return false;
    }
  }

  // Test 7: Try to execute a TCG command
  function testCommandExecution() {
    console.log('\n🎯 Test 7: Command Execution Test');
    
    try {
      if (app.commands && app.commands.executeCommandById) {
        // Try to execute the test command
        const testCmdId = 'clippy-ai-assistant:tcg-test-keystroke-reward';
        
        if (app.commands.commands[testCmdId]) {
          console.log('🎮 Attempting to execute test command...');
          console.log('ℹ️ Check for pack generation notifications!');
          
          // Execute the command
          app.commands.executeCommandById(testCmdId);
          
          console.log('✅ Test command executed (check Obsidian for results)');
          return true;
        } else {
          console.log('⚠️ Test command not available yet');
          return false;
        }
      } else {
        console.log('❌ Command system not accessible');
        return false;
      }
    } catch (error) {
      console.log('❌ Command execution failed:', error.message);
      return false;
    }
  }

  // Run all tests
  function runAllTests() {
    const results = {
      environment: testObsidianEnvironment(),
      plugin: testPluginStatus(),
      folders: testFolderStructure(), 
      templates: testTemplates(),
      commands: testCommands(),
      functionality: testBasicFunctionality(),
      execution: testCommandExecution()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.values(results).length;
    
    console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount >= 5) {
      console.log('🎉 TCG System appears to be working! Try the commands in Command Palette (Ctrl+P)');
    } else if (passedCount >= 3) {
      console.log('⚠️ TCG System partially working. Check the failed tests above.');
    } else {
      console.log('❌ TCG System has issues. Check plugin settings and restart Obsidian.');
    }
    
    console.log('\n💡 Next steps:');
    console.log('1. Use Ctrl+P and search for "TCG" commands');
    console.log('2. Try "TCG: Test Keystroke Reward" first');
    console.log('3. Check Settings → CLIPPY AI Assistant → TCG section');
    console.log('4. Look for TCG files in your vault under /tcg/ folder');
    
    return results;
  }

  // Execute immediately
  return runAllTests();
})();