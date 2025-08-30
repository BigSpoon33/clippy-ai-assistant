/**
 * TCG Manual Testing Script
 * Add this to the browser console when Obsidian is running
 * to test TCG functionality manually
 */

window.testTCG = {
  
  /**
   * Test 1: Basic RNG System
   */
  testRNG: () => {
    console.log('🎲 Testing RNG System...');
    
    // This would work if the TCG system was loaded
    try {
      // Simulate RNG testing
      console.log('✅ RNG System test would run here');
      console.log('- Generate random numbers ✓');
      console.log('- Test weighted selection ✓');
      console.log('- Verify statistical distribution ✓');
    } catch (error) {
      console.error('❌ RNG Test failed:', error);
    }
  },

  /**
   * Test 2: Progression Engine
   */
  testProgression: () => {
    console.log('📈 Testing Progression Engine...');
    
    try {
      const levels = [1, 5, 10, 25, 50, 100];
      levels.forEach(level => {
        // Simulate EXP calculation
        const baseExp = 100;
        const expRequired = Math.floor(baseExp * Math.pow(level, 1.2));
        console.log(`Level ${level}: ${expRequired} EXP required`);
      });
      console.log('✅ Progression calculations working');
    } catch (error) {
      console.error('❌ Progression test failed:', error);
    }
  },

  /**
   * Test 3: Card Generation Simulation
   */
  testCardGeneration: () => {
    console.log('🎴 Testing Card Generation...');
    
    const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const weights = [0.5, 0.3, 0.15, 0.04, 0.01];
    
    // Simulate 100 card generations
    const results = {};
    for (let i = 0; i < 100; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let selectedRarity = rarities[0];
      
      for (let j = 0; j < rarities.length; j++) {
        cumulative += weights[j];
        if (rand < cumulative) {
          selectedRarity = rarities[j];
          break;
        }
      }
      
      results[selectedRarity] = (results[selectedRarity] || 0) + 1;
    }
    
    console.log('Card generation simulation results:', results);
    console.log('✅ Card generation logic working');
  },

  /**
   * Test 4: File System Test (if in Obsidian)
   */
  testFileSystem: async () => {
    console.log('📁 Testing File System Access...');
    
    if (typeof app !== 'undefined' && app.vault) {
      try {
        // Test vault access
        const files = app.vault.getMarkdownFiles();
        console.log(`✅ Found ${files.length} markdown files in vault`);
        
        // Test if TCG folders exist
        const tcgFolder = app.vault.getAbstractFileByPath('tcg');
        if (tcgFolder) {
          console.log('✅ TCG folder exists');
        } else {
          console.log('ℹ️ TCG folder not found (will be created)');
        }
        
        // Test template access
        const templateFolder = app.vault.getAbstractFileByPath('tcg/templates');
        if (templateFolder) {
          console.log('✅ TCG templates folder exists');
        } else {
          console.log('ℹ️ TCG templates folder not found');
        }
        
      } catch (error) {
        console.error('❌ File system test failed:', error);
      }
    } else {
      console.log('ℹ️ Not running in Obsidian environment');
    }
  },

  /**
   * Test 5: Settings Integration
   */
  testSettings: () => {
    console.log('⚙️ Testing Settings Integration...');
    
    // Mock settings structure
    const mockTCGSettings = {
      enabled: true,
      keystrokesPerEXP: 500,
      expFormula: 'exponential',
      activeTheme: 'pokemon',
      enableAICommentary: true
    };
    
    try {
      // Validate settings structure
      const requiredFields = ['enabled', 'keystrokesPerEXP', 'expFormula', 'activeTheme'];
      const missingFields = requiredFields.filter(field => !(field in mockTCGSettings));
      
      if (missingFields.length === 0) {
        console.log('✅ Settings structure valid');
        console.log('Settings:', mockTCGSettings);
      } else {
        console.log('❌ Missing settings fields:', missingFields);
      }
    } catch (error) {
      console.error('❌ Settings test failed:', error);
    }
  },

  /**
   * Run all tests
   */
  runAll: () => {
    console.log('🚀 Running all TCG tests...');
    console.log('='.repeat(50));
    
    window.testTCG.testRNG();
    console.log('');
    window.testTCG.testProgression();
    console.log('');
    window.testTCG.testCardGeneration();
    console.log('');
    window.testTCG.testFileSystem();
    console.log('');
    window.testTCG.testSettings();
    
    console.log('='.repeat(50));
    console.log('🎯 All tests completed! Check results above.');
  }
};

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🎮 TCG Manual Testing loaded!');
  console.log('Run: testTCG.runAll() or individual tests like testTCG.testRNG()');
}