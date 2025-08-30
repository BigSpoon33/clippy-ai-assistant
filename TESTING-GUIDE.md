# 🎮 CLIPPY TCG Writer - Testing Guide

## **Quick Start Testing (5 minutes)**

### 1. **Enable in Obsidian**
1. Open Obsidian with this vault
2. Go to Settings → Community Plugins
3. Find "CLIPPY AI Assistant" 
4. Make sure it's enabled
5. In plugin settings, find "TCG System" section
6. Toggle "Enable TCG System" to ON

### 2. **Test Basic Functionality**
Open Obsidian's Developer Console (`Ctrl+Shift+I`) and run:

```javascript
// Load test script
const script = document.createElement('script');
script.src = 'app://obsidian.md/.obsidian/plugins/clippy-ai-assistant/tcg-manual-test.js';
document.head.appendChild(script);

// Then run tests
testTCG.runAll();
```

### 3. **Test Commands**
Use Command Palette (`Ctrl+P`) and search for:
- `TCG: Test Keystroke Reward` - Awards EXP and packs
- `TCG: Pack Inventory` - View available packs  
- `TCG: Open Card Pack` - Open packs to get cards
- `TCG: View Collection` - See your cards
- `TCG: Open TCG Dashboard` - Main interface

---

## **Detailed Testing Scenarios**

### **🎯 Test 1: Basic System Initialization**

**Goal**: Verify TCG system starts correctly

**Steps**:
1. Restart Obsidian
2. Check console for: `🎮 TCG System initialized successfully`
3. Check Settings → CLIPPY AI Assistant → TCG settings appear
4. Verify no error messages

**Expected**: Clean initialization with no errors

---

### **⌨️ Test 2: Keystroke Tracking**

**Goal**: Test EXP earning from typing

**Steps**:
1. Create a new note
2. Type continuously for 2-3 minutes (aim for 200+ keystrokes)
3. Use command: `TCG: Test Keystroke Reward`
4. Check console for: `📦 Generated core-set pack`
5. Use `TCG: Pack Inventory` to see earned packs

**Expected**: EXP awarded, pack created in vault at `tcg/packs/`

---

### **📦 Test 3: Pack Opening**

**Goal**: Test pack opening and card generation

**Steps**:
1. Ensure you have packs (from Test 2)
2. Use command: `TCG: Pack Inventory`
3. Click "Open Pack" on any available pack
4. Watch the pack opening animation
5. Check generated cards appear
6. Verify cards saved to `tcg/cards/` folder

**Expected**: Cards generated with appropriate rarities, animations work

---

### **🎴 Test 4: Card Generation from Notes**

**Goal**: Test note-to-card conversion

**Steps**:
1. Create notes with different content:
   - Simple note (100 words)
   - Complex note (500+ words, code blocks, links)
   - Note with tags and metadata
2. Wait for automatic card generation OR
3. Run analysis manually via dashboard
4. Check `tcg/cards/` for generated cards
5. Verify different rarities based on content complexity

**Expected**: Cards reflect note content, appropriate rarities assigned

---

### **🎨 Test 5: Themes**

**Goal**: Test theme switching

**Steps**:
1. Go to Settings → CLIPPY → TCG → Themes
2. Switch between Pokemon, MTG, and Space themes
3. Open a pack after switching themes
4. Check if card styling changes
5. Verify theme-specific pack types appear

**Expected**: Visual appearance changes, theme-specific content

---

### **📊 Test 6: Player Progression**

**Goal**: Test leveling and achievements

**Steps**:
1. Use `TCG: Dashboard` to see current level/EXP
2. Earn EXP through typing or test commands
3. Check for level-up notifications
4. View achievements section
5. Check player stats update correctly

**Expected**: Levels increase, achievements unlock, stats accurate

---

### **🤖 Test 7: AI Commentary** 

**Goal**: Test contextual commentary system

**Steps**:
1. Enable AI Commentary in settings
2. Set frequency to "High"
3. Type rapidly in a note
4. Open packs
5. Level up
6. Watch for commentary notifications

**Expected**: Contextual messages appear based on actions

---

## **🐛 Common Issues & Solutions**

### **Issue**: "TCG System not initialized"
**Solution**: 
- Check plugin is enabled
- Restart Obsidian
- Enable in plugin settings

### **Issue**: "No packs generated"
**Solution**:
- Check keystroke threshold (default: 500)
- Use test command to force pack generation
- Verify `tcg/templates/` folder exists

### **Issue**: "Cards not appearing"
**Solution**:
- Check `tcg/cards/` folder permissions
- Verify notes exist in vault for analysis
- Check console for error messages

### **Issue**: "Animation problems"
**Solution**:
- Enable Performance Mode in settings
- Check browser compatibility
- Reduce particle effects

---

## **🚀 Advanced Testing**

### **Performance Testing**
1. Create 100+ notes
2. Enable TCG system
3. Monitor memory usage
4. Test with large vault (1000+ notes)

### **Data Integrity Testing**  
1. Export player data
2. Restart Obsidian
3. Verify data persistence
4. Test settings migration

### **Theme Development Testing**
1. Create custom theme
2. Test theme switching
3. Verify theme-specific packs
4. Test custom card templates

---

## **📋 Testing Checklist**

- [ ] System initializes without errors
- [ ] Keystroke tracking works
- [ ] EXP is awarded correctly
- [ ] Packs are generated and stored
- [ ] Pack opening animation works
- [ ] Cards are created from notes
- [ ] Themes can be switched
- [ ] Player progression works
- [ ] Achievements unlock
- [ ] AI commentary appears
- [ ] Settings persist across restarts
- [ ] Dashboard displays correctly
- [ ] Performance is acceptable
- [ ] No memory leaks
- [ ] All commands work

---

## **🎯 Success Criteria**

**Basic Functionality**: ✅
- TCG system starts
- Keystrokes award EXP  
- Packs can be opened
- Cards are generated

**Advanced Features**: ✅
- Themes work correctly
- AI commentary contextual
- Achievements unlock
- Data persists

**Performance**: ✅
- No memory leaks
- Smooth animations
- Responsive UI
- Fast card generation

---

## **📞 If You Need Help**

1. **Check Console**: Most issues show in developer console
2. **Check Folders**: Verify `tcg/` folder structure exists  
3. **Reset Data**: Use "Clear All Data" in advanced settings if needed
4. **Safe Mode**: Disable other plugins to test isolation

**Happy Testing!** 🎮✨