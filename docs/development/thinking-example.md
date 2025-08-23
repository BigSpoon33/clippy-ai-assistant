# 🤔 Thinking Tags Implementation Example

## How it Works

When the LLM responds with thinking content wrapped in `<thinking>` tags, it will be automatically:

1. **Extracted** from the main response
2. **Hidden** in a collapsible toggle header
3. **Displayed** only when the user clicks to expand it

## Example LLM Response

**Input Text:**
```
<thinking>
The user wants to create a new note about machine learning. I should:
1. Use the create_note tool with an appropriate filename
2. Include some basic structure for the note
3. Maybe suggest some related topics they might want to explore
</thinking>

I'll help you create a new note about machine learning!

TOOL_CALL: create_note({"filename": "Machine Learning Basics.md", "content": "# Machine Learning Basics\n\n## Overview\n\n## Key Concepts\n\n## Applications\n\n"})

✅ Created your new note "Machine Learning Basics.md" with a basic structure. You can now add your content about machine learning concepts, algorithms, and applications.
```

## What the User Sees

**Main Response (always visible):**
```
I'll help you create a new note about machine learning!

✅ Created your new note "Machine Learning Basics.md" with a basic structure. You can now add your content about machine learning concepts, algorithms, and applications.
```

**Thinking Section (collapsible):**
```
🤔 Thinking... (click to expand)
▶ [collapsed by default]

When clicked:
▼ 🤔 Thinking... (click to hide)
┌─────────────────────────────────────────┐
│ The user wants to create a new note     │
│ about machine learning. I should:       │
│ 1. Use the create_note tool with an     │
│    appropriate filename                 │
│ 2. Include some basic structure for     │
│    the note                             │
│ 3. Maybe suggest some related topics    │
│    they might want to explore           │
└─────────────────────────────────────────┘
```

## UI Features

### Visual Design
- **Subtle styling**: Muted colors, smaller font
- **Clear hierarchy**: Thinking content visually separated from main response
- **Smooth animations**: Expand/collapse with CSS transitions
- **Consistent theming**: Uses Obsidian's CSS variables

### Interaction
- **Click to toggle**: Tap the header to show/hide thinking
- **Icon indication**: ▶ (collapsed) / ▼ (expanded)
- **Hover effects**: Visual feedback on interaction
- **Keyboard accessible**: Proper focus handling

## Implementation Details

### Both Streaming and Non-Streaming
- **Streaming**: Real-time extraction of `<thinking>` tags during response
- **Non-streaming**: Post-processing to extract thinking content
- **Voice integration**: Thinking content excluded from TTS
- **Tool results**: Thinking shown before tool execution

### Regex Pattern
```javascript
const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
```

This captures:
- Multiple thinking blocks in one response
- Multi-line thinking content
- Nested formatting within thinking tags

## Benefits

1. **Clean Interface**: Users see concise, actionable responses
2. **Optional Transparency**: Can view AI reasoning when desired
3. **Better UX**: Reduced cognitive load, focused on results
4. **Educational**: Users can learn from AI's thought process
5. **Debugging**: Helps understand AI decision-making

The thinking tags are now fully implemented and will work with any AI provider that includes `<thinking>` tags in their responses!