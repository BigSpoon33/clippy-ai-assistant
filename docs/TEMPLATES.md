## FEATURE:

We're creating a comprehensive template system for an aesthetically beautiful and functional Obsidian vault. These templates will integrate with clippy-ai-assistant to create visually stunning notes with banners, animations, progress visualizations, and dynamic visual elements.

**Visual Design Philosophy:**
- **Animated Elements**: Growing trees for streaks, flowing vines for aging content, progress bars that fill
- **Banner Integration**: Each template type has distinctive visual headers with animations
- **ASCII Art & Symbols**: Visual progress indicators, mood trackers, habit trees
- **Color Themes**: Leverage built-in Obsidian color schemes for consistent visual hierarchy
- **Dynamic Visuals**: Elements that change based on data (completion rates, streaks, time)

**Template Integration System:**
- Daily notes track mood, tasks, habits with visual progress indicators
- Weekly notes display habit streaks as growing trees or flourishing gardens
- Monthly dashboards show animated progress summaries
- Each template includes visual streak counters, animated progress elements
- Advanced URI integration for seamless navigation between visual elements 

## EXAMPLES:

### ✅ EXISTING SUCCESSFUL TEMPLATES

Based on your current vault, these templates are working well:

**📱 Enhanced Daily Template** (`40 - Obsidian/Templates/Enhanced-Daily-Template.md`)
- **Strengths:** Advanced Templater JavaScript, dynamic pet care sections, habit integration
- **Pattern:** Uses `<%* %>` code blocks for dynamic content generation
- **Integration:** Connects with dataview, tasks plugin, and CSS classes

**🎬 Movie Template** (`40 - Obsidian/Templates/New-Movie-Template.md`)
- **Strengths:** Comprehensive media tracking, rating system, dataview analytics
- **Pattern:** Interactive prompts with `tp.system.prompt()` and `tp.system.suggester()`
- **Integration:** File placement in `31 - Cinematheque/`, status tracking

**🐾 Pet Onboarding** (`40 - Obsidian/Templates/New-Pet-Onboarding-Template.md`)
- **Strengths:** Complete lifecycle management, weight tracking, emergency info
- **Pattern:** Category-specific care tasks, birthday calculations, automated tagging
- **Integration:** Links to daily notes, dashboard integration, CSS styling

### 📋 TEMPLATE SUCCESS PATTERNS IDENTIFIED

1. **Folder Structure Respect**: All templates use correct paths (`40 - Obsidian/Templates/`, `31 - Cinematheque/`, `10 - People/Pets/`)
2. **CSS Integration**: Templates use existing CSS classes (`zettelkasten`, `pet-profile`, `myhome`)
3. **Dataview Integration**: Rich analytics and tracking queries
4. **Interactive Setup**: User prompts for customization during creation
5. **Tag System**: Consistent tagging for filtering and organization
6. **Banner Support**: Integration with banner plugin for visual headers
7. **Visual Consistency**: Unified aesthetic across all templates
8. **Mobile Responsive**: CSS snippets include mobile considerations

## DOCUMENTATION:

# Obsidian
[Templater Documentation](https://silentvoid13.github.io/Templater/internal-functions/internal-modules/date-module.html)
[Dataview Documentation](https://blacksmithgu.github.io/obsidian-dataview/api/code-examples/)
[Tasks Documentation](https://schemar.github.io/obsidian-tasks/)
[Minimal Documentation](https://minimal.guide/Home)
[BookNote Documentation](https://kknwfe6755.feishu.cn/docs/doccnBfbtETItLHMmbDBGBRdPrh)
[Advanced URI Documentation](https://vinzent03.github.io/obsidian-advanced-uri/concepts/schema)
[List out any documentation (web pages, sources for an MCP server like Crawl4AI RAG, etc.) that will need to be referenced during development]

## TEMPLATE CREATION REQUIREMENTS:

### 🎯 HIGH-CONFIDENCE COMPLETION CRITERIA

For AI assistants to create templates with 95%+ success rate, provide these specifics:

#### **📁 FOLDER STRUCTURE (CRITICAL)**
```yaml
Required Paths:
  Templates: "40 - Obsidian/Templates/"
  Daily Notes: "00 - DailyNotes/"
  People: "10 - People/"
  Pets: "10 - People/Pets/"
  Work & Study: "20 - Work & Study/"
  Reading: "30 - Reading/"
  Cinematheque: "31 - Cinematheque/"
  Obsidian: "40 - Obsidian/"
  Zettelkasten: "50 - Zettelkasten/"
  Clippy: "42 - Clippy/"
```

#### **🎨 VISUAL DESIGN SYSTEM**
```yaml
Core Visual Classes:
  Homepage: "myhome" - Main dashboard styling
  Cards: "zettelkasten" - Card-based layouts
  Pet Dashboard: "pet-profile" - Animal tracking visuals
  Clean View: "noyaml" - Hide metadata for clean display
  Sidebar: "rightlane" - Right panel layouts

Visual Enhancement Snippets (16 available):
  - 【主页设置】Homepage Settings: Main page visual styling
  - 【卡片视图】Card Views: Beautiful card-based layouts  
  - 【宠物管理】Pet Management: Animal care visual tracking
  - 【进度颜色】Progress Colors: Animated colorful progress bars
  - 【音乐播放器】Music Player: Interactive music controls with visualizations
  - 【生日倒计时】Birthday Countdown: Animated countdown timers
  - 【情绪记录】Mood Tracker: Emotional state visualizations
  - 【日记时间轴】Timeline Views: Temporal progress displays
  - 【边栏图标】Sidebar Icons: Custom navigation icons
  - 【主页设置移动端】Mobile Responsive: Touch-friendly layouts
  - And 6 more aesthetic enhancement snippets

Visual Element Types:
  🌳 Growing Trees: Habit streaks, goal progress
  🌿 Flowing Vines: Page aging, connection indicators  
  📊 Animated Bars: Progress tracking, completion rates
  🎨 Color Themes: Consistent visual hierarchy
  ✨ Hover Effects: Interactive visual feedback
  🎭 Mood Symbols: Emotional state indicators
```

#### **🎬 VISUAL TEMPLATER INTEGRATION**
```yaml
Refer to official Templater documentation for syntax:
https://silentvoid13.github.io/Templater/

Visual Template Features:
  Interactive Setup: User prompts for customizing visual elements
  Dynamic Banners: Context-aware header animations
  Progress Calculations: Visual streak counters and progress bars
  Conditional Visuals: Show/hide elements based on data
  
Visual Enhancement Patterns:
  🌟 Animated Headers: Banners that change with progress
  📈 Progress Trees: ASCII trees that grow with streaks
  🎨 Theme Integration: Colors that match vault theme
  💫 Hover States: Interactive visual feedback
  🔄 Dynamic Updates: Visuals that refresh with new data

ASCII Art Examples:
  Habit Trees:     🌱 → 🌿 → 🌳 → 🌲
  Progress Bars:   ▰▰▰▰▱▱▱▱▱▱ 40%
  Mood Indicators: 😊 😐 😔 😴 🤔
  Streak Counters: 🔥×7 💪×14 📚×30
```

#### **📊 DATAVIEW QUERY PATTERNS**
```javascript
// Your vault uses these dataview patterns:

// 1. File-specific queries
FROM ""
WHERE file = this.file

// 2. Folder-specific queries  
FROM "31 - Cinematheque"
WHERE director = this.director

// 3. Tag-based filtering
WHERE contains(tags, "movie")
WHERE contains(file.content, "#PetCare/PetName")

// 4. Progress calculations
choice(
  status = "completed",
  "✅ **COMPLETED**",
  "📋 **PLANNED**"
)
```

#### **🏷️ TAGGING SYSTEM**
```yaml
Tag Conventions:
  Status Tags: #plan-to-watch, #watching, #completed, #dropped
  Category Tags: #movie, #pet-profile, #habit-tracker, #project/open
  Specific Tags: #PetCare/PetName, #Habit/HabitName, #WatchList
  Year Tags: #year-2024, #director-StudioName
  
Critical: Use hyphenated tags, not spaces
```

#### **🎪 BANNER INTEGRATION**
```yaml
# All templates should include banner support
banner: "40 - Obsidian/Attachments/banners/template-specific-banner.gif"
banner_x: 0.5
banner_y: 0.38
banner_icon: 🎯
```

### 🚨 CRITICAL SUCCESS REQUIREMENTS

**MUST HAVES for template completion:**

1. **Correct Folder Paths**: Never use `./Templates` - always use `40 - Obsidian/Templates/`
2. **CSS Class Integration**: Templates must use existing CSS classes
3. **Templater Syntax**: Follow exact patterns from existing templates
4. **Dataview Compatibility**: Queries must work with vault structure
5. **Tag Consistency**: Follow established tagging conventions
6. **Mobile Responsive**: Consider mobile CSS snippets
7. **Banner Integration**: Include banner properties for visual consistency
8. **Interactive Setup**: Use prompts for user customization
9. **Analytics Integration**: Include progress tracking and analytics
10. **Automation Tags**: Set up proper tags for daily note automation

### 📋 TEMPLATE SPECIFICATION FORMAT

**For each template request, provide:**

```yaml
Template_Name: "Descriptive-Template-Name"
Purpose: "Specific use case and goals"
Folder_Location: "40 - Obsidian/Templates/"
Target_Folder: "Where files created from template should be placed"
CSS_Class: "Existing CSS class to use"
Frontmatter_Fields: ["List of required YAML fields"]
Templater_Features: ["Interactive prompts", "Dynamic content", "Date functions"]
Dataview_Integration: ["Required queries for analytics"]
Tag_System: ["Tags for organization and automation"]
Dependencies: ["Required plugins: Templater, Dataview, Tasks, Banner"]
Success_Metrics: ["How to measure if template works correctly"]
```

## OTHER CONSIDERATIONS:

### 🎯 AI ASSISTANT GOTCHAS (CRITICAL TO AVOID)

**1. PATH MISTAKES** ⚠️
- ❌ WRONG: `./Templates/` or `Templates/`
- ✅ CORRECT: `40 - Obsidian/Templates/`
- ❌ WRONG: `Pets/` 
- ✅ CORRECT: `10 - People/Pets/`

**2. TEMPLATER SYNTAX ERRORS** ⚠️
- ❌ WRONG: Mixing `<% %>` inside `<%* %>` blocks
- ✅ CORRECT: Use `tp.date.now()` directly in JavaScript blocks
- ❌ WRONG: `${tp.date.now()}` in template literals inside `<%* %>`
- ✅ CORRECT: `tp.date.now()` + string concatenation

**3. CSS CLASS ASSUMPTIONS** ⚠️
- ❌ WRONG: Creating new CSS classes without checking existing
- ✅ CORRECT: Use documented CSS classes: `zettelkasten`, `pet-profile`, `myhome`
- ❌ WRONG: Assuming generic CSS frameworks
- ✅ CORRECT: Leverage existing Chinese-named CSS snippets

**4. DATAVIEW QUERY ISSUES** ⚠️
- ❌ WRONG: `FROM "*"` (scans entire vault)
- ✅ CORRECT: `FROM "31 - Cinematheque"` (specific folder)
- ❌ WRONG: Complex queries without performance consideration
- ✅ CORRECT: Use LIMIT and specific WHERE clauses

**5. TAG SYSTEM VIOLATIONS** ⚠️
- ❌ WRONG: Tags with spaces `#Pet Care`
- ✅ CORRECT: Hyphenated tags `#pet-profile`
- ❌ WRONG: Inconsistent tag hierarchies
- ✅ CORRECT: Follow existing patterns `#PetCare/PetName`

**6. MOBILE RESPONSIVENESS IGNORED** ⚠️
- ❌ WRONG: Desktop-only template design
- ✅ CORRECT: Consider existing mobile CSS snippets
- ❌ WRONG: Complex layouts without mobile testing
- ✅ CORRECT: Use existing responsive patterns

**7. PLUGIN COMPATIBILITY** ⚠️
- ❌ WRONG: Assuming plugins not in vault
- ✅ CORRECT: Leverage Templater, Dataview, Tasks, Banner plugins
- ❌ WRONG: Creating functionality that exists in plugins
- ✅ CORRECT: Use plugin features properly

### 🔧 VAULT-SPECIFIC TECHNICAL REQUIREMENTS

**Plugin Stack (MUST use these):**
- Templater (advanced JavaScript usage)
- Dataview (analytics and automation)
- Tasks (task management integration)
- Banner (visual headers)
- CSS Snippets (styling system)
- Advanced URI (deep linking)

**Performance Considerations:**
- Vault has 16+ CSS snippets - avoid conflicts
- Complex dataview queries exist - optimize new ones
- Mobile usage important - test responsive design
- Large vault size - use efficient folder structure

**Content Patterns:**
- Mixed Chinese/English naming (respect this)
- Numbered folder system (maintain hierarchy)
- Extensive use of emojis in headers
- Tag-based automation systems
- Progress tracking with visual elements

### 💡 TEMPLATE CREATION WORKFLOW

**For AI assistants creating templates:**

1. **ANALYZE REQUEST** - Determine template type and requirements
2. **CHECK EXISTING** - Review similar existing templates for patterns
3. **VALIDATE PATHS** - Confirm folder structure and file locations
4. **SELECT CSS** - Choose appropriate existing CSS classes
5. **DESIGN FRONTMATTER** - Follow established YAML patterns
6. **IMPLEMENT TEMPLATER** - Use proven JavaScript patterns
7. **ADD DATAVIEW** - Include analytics and tracking queries
8. **SET UP TAGS** - Follow established tagging conventions
9. **INTEGRATE PLUGINS** - Leverage Banner, Tasks, Advanced URI
10. **TEST COMPATIBILITY** - Ensure mobile and desktop functionality

**Quality Checklist:**
- [ ] Correct folder paths used
- [ ] Existing CSS classes applied  
- [ ] Templater syntax validated
- [ ] Dataview queries optimized
- [ ] Tags follow conventions
- [ ] Banner integration included
- [ ] Mobile responsiveness considered
- [ ] Plugin compatibility verified
- [ ] User prompts for customization
- [ ] Analytics and tracking included

