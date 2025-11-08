# System Prompt Configuration

## Overview

The system prompt for the OpenAI Realtime API is now managed via `system-prompt.json`, making it easy to update the AI's behavior without modifying code.

## Architecture

```
system-prompt.json
    ↓ (imported)
route.ts → formatSystemPrompt()
    ↓ (converts to text)
OpenAI Realtime API instructions
```

## File Structure

### `client/src/system-prompt.json`

Structured JSON defining the AI tutor's behavior:

```json
{
  "role": "system",
  "content": {
    "description": "Playful math tutor...",
    "behavior": {
      "realtime_start": [...],
      "interruptions": {...},
      "canvas_user_input": {...}
    },
    "teaching_style": {...},
    "topic_focus": [...],
    "allowed_tools": [...],
    "rules": [...],
    "workflow_example": {...},
    "good_examples": [...],
    "bad_examples": [...],
    "summary": "..."
  }
}
```

### Key Sections

#### 1. **description**
High-level description of the AI's role

#### 2. **behavior**
- `realtime_start`: Actions when session begins
- `interruptions`: How to handle user questions
- `canvas_user_input`: How to respond to user drawings

#### 3. **teaching_style**
- `tone`: Gentle, playful, slow-paced
- `approach`: List of teaching methods

#### 4. **topic_focus**
Topics the AI should teach (e.g., "Area of a circle")

#### 5. **allowed_tools**
MCP tools the AI can use (create_element, batch_create_elements, etc.)

#### 6. **rules**
Hard constraints (e.g., "Must draw when visuals help")

#### 7. **workflow_example**
Step-by-step lesson flow

#### 8. **good_examples / bad_examples**
What the AI should and shouldn't do

#### 9. **summary**
One-paragraph summary of the AI's role

## Formatter Function

The `formatSystemPrompt()` function converts the JSON structure into a markdown-style text format that the Realtime API can understand:

```typescript
function formatSystemPrompt(promptData: typeof systemPromptData): string {
  const content = promptData.content;
  
  let instructions = `${content.summary}\n\n`;
  
  instructions += `## DESCRIPTION\n${content.description}\n\n`;
  instructions += `## TEACHING STYLE\n...`;
  // ... and so on
  
  return instructions;
}
```

### Output Format

The formatter produces instructions like:

```
You are a playful, visual math tutor. You begin every realtime session teaching the area of a circle using Excalidraw...

## DESCRIPTION
Playful math tutor that teaches area of a circle using Excalidraw

## TEACHING STYLE
Tone: gentle, playful, slow-paced
Approach:
- Uses diagrams often
- Explains every new drawing
- Encourages student thinking
- May ask reflection questions

## TOPIC FOCUS
- Definition of circle
- Radius & diameter
- Why area = πr²
...

## BEHAVIOR
When session starts:
- Begin teaching area of a circle (A = πr²)
- Explain slowly using friendly language
- Use Excalidraw canvas frequently...

When user interrupts with a question:
- Answer the question
- Resume lesson on area of a circle

When user draws on canvas:
- Ask user what they want to show or do with their drawing
- If no explanation, ignore input and continue lesson

## AVAILABLE TOOLS
- create_element
- batch_create_elements
- create_from_mermaid
...

## IMPORTANT RULES
- Must draw when visuals help
- Do NOT describe a drawing; actually draw it
- Only switch topic if explicitly requested
- Resume lesson after interruptions

## WORKFLOW
Initial lesson flow:
Draw a circle with radius labeled
Explain what a circle and radius are
...

Example problems:
- Given radius r → find area
- Given area A → find radius

## GOOD EXAMPLES
✓ Draws labeled circle
✓ Explains slowly what radius means
✓ Uses playful shapes and colors
✓ Resumes lesson after Q&A

## BAD EXAMPLES (AVOID)
✗ Describes what would be drawn instead of drawing
✗ Ignores user questions
✗ Leaves topic permanently
```

## Benefits

### 1. **Easy to Edit**
- No code changes needed to update AI behavior
- Clear JSON structure
- Comments and structure make intent obvious

### 2. **Version Control Friendly**
- Track changes to prompts in git
- See history of prompt modifications
- Easy to revert or compare versions

### 3. **Maintainable**
- Separate concerns: prompt vs. code
- Multiple people can edit prompts without coding
- Easy to A/B test different prompts

### 4. **Extensible**
- Add new sections without changing formatter (much)
- Can add multiple prompt files for different topics
- Easy to create prompt variants

## Usage

### To Change the AI's Behavior

1. Edit `client/src/system-prompt.json`
2. Modify relevant sections (description, rules, workflow, etc.)
3. Restart the Next.js dev server
4. Start a new Realtime session

Example change:

```json
{
  "content": {
    "description": "Expert calculus tutor...",  // ← Changed from "Playful math tutor"
    "topic_focus": [
      "Derivatives",           // ← Changed topic
      "Chain rule",
      "Product rule"
    ]
  }
}
```

### To Add New Behaviors

Add to the `behavior` section:

```json
{
  "behavior": {
    "realtime_start": [...],
    "interruptions": {...},
    "canvas_user_input": {...},
    "on_error": {              // ← New behavior
      "tool_call_fails": [
        "Acknowledge the error",
        "Try a simpler approach"
      ]
    }
  }
}
```

Then update `formatSystemPrompt()` to include it:

```typescript
instructions += `\nWhen a tool call fails:\n`;
content.behavior.on_error.tool_call_fails.forEach((action) => {
  instructions += `- ${action}\n`;
});
```

## Current Configuration

The AI is currently configured as:
- **Role**: Playful math tutor
- **Topic**: Area of a circle (A = πr²)
- **Style**: Gentle, playful, slow-paced, visual
- **Model**: gpt-realtime (latest)

**Key Behaviors**:
- Starts teaching immediately when session begins
- Uses Excalidraw to draw diagrams frequently
- Answers questions then resumes the lesson
- Asks users about their drawings instead of ignoring them

## Testing Changes

After modifying the system prompt:

1. Restart dev server:
   ```bash
   cd client && npm run dev
   ```

2. Open http://localhost:3001

3. Start a new Realtime session

4. Check console for formatted instructions:
   ```
   📝 System Instructions:
   You are a playful, visual math tutor...
   ```

5. Verify AI behavior matches your changes

## Console Output

When a session starts, you'll see:

```
🔧 REALTIME SESSION SETUP
📡 Fetching tools from MCP Excalidraw client...
✅ Retrieved 7 tools from MCP server

📋 Formatted tools for OpenAI Realtime API:
[tool definitions...]

📝 System Instructions:
You are a playful, visual math tutor. You begin every realtime session teaching...
[full formatted prompt...]
```

## Advanced: Multiple Prompts

To support multiple topics/tutors, you could:

1. Create multiple JSON files:
   - `system-prompt-geometry.json`
   - `system-prompt-calculus.json`
   - `system-prompt-algebra.json`

2. Add a query parameter to select which prompt:
   ```typescript
   export async function POST(request: Request) {
     const { searchParams } = new URL(request.url);
     const topic = searchParams.get('topic') || 'geometry';
     
     const promptData = await import(`@/system-prompt-${topic}.json`);
     const instructions = formatSystemPrompt(promptData);
     // ...
   }
   ```

3. Call with topic:
   ```typescript
   fetch('/api/realtime/session?topic=calculus', { method: 'POST' })
   ```

## Tips for Writing Good Prompts

### DO ✅
- Be specific about desired behaviors
- Give clear examples of good vs. bad responses
- Structure information hierarchically
- Include edge cases (interruptions, errors, etc.)
- Use action-oriented language ("Draw a circle" not "You should draw circles")

### DON'T ❌
- Be vague ("be helpful" → what does helpful mean?)
- Overcomplicate (keep instructions clear and concise)
- Contradict yourself (rules should be consistent)
- Forget to test changes

## Troubleshooting

### AI Not Following Instructions

**Check**:
- Console shows formatted instructions
- Instructions are clear and specific
- No contradictions in rules
- Model is correct (gpt-realtime vs gpt-realtime-mini)

### JSON Import Error

**Check**:
- `resolveJsonModule: true` in tsconfig.json ✅ (already set)
- JSON syntax is valid (use a linter)
- File path is correct (`@/system-prompt.json`)

### AI Ignoring Canvas Updates

**Check**:
- `canvas_user_input` section in prompt
- Rules mention responding to canvas changes
- Canvas updates are being sent (check console for 🎨)

## Summary

The system prompt is now:
- ✅ **Externalized** in JSON file
- ✅ **Easy to edit** without code changes
- ✅ **Well-structured** with clear sections
- ✅ **Formatted automatically** for Realtime API
- ✅ **Version controlled** alongside code

You can now customize the AI tutor's personality, topic, teaching style, and behaviors by simply editing `system-prompt.json`! 🎓✨

