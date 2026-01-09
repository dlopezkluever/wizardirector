Let me look at the images to understand the highlighting issue:

[3 tools called]

I can see the issues clearly now. Before I fix them, I need to clarify a few things:

## Issues I See:

1. **`<center>` tags in text** - The LLM is outputting HTML tags that should be stripped
2. **Character names not blue** - The regex isn't catching them because of the `<center>` tags
3. **Highlighting wrap issue** - When text wraps across lines, the selection highlight (blue box) doesn't align perfectly with the visible text

## Questions:

**For screenplay formatting (#2):**
In traditional screenplays, character names and dialogue are centered/indented. However, in a plain textarea, we have limited options:

- **Option A**: Keep everything left-aligned (simplest, current state)
- **Option B**: Add spaces/tabs to indent character names (e.g., "          HANSEL")
- **Option C**: Use a more complex editor that supports proper screenplay formatting

Which would you prefer? **I'd recommend Option A** (left-aligned) for now since it's most reliable with our syntax highlighting approach.

**For the highlighting issue (#4):**
This is a known limitation of the "transparent textarea over colored pre" technique. When text wraps, the browser's selection highlight can misalign. 

- **Option A**: Accept this minor visual quirk (doesn't affect functionality)
- **Option B**: Switch to a `contenteditable` div (more complex, different editing behavior)
- **Option C**: Disable text wrapping entirely (use horizontal scroll instead)

**I'd recommend Option A** unless the highlighting issue is a dealbreaker for you.

**For character name color (#3):**
Should I:
- Make them light baby blue (`text-blue-300`)
- Or just leave them white like the rest of the text?

---

**Once you confirm your preferences, I'll:**
1. Strip all HTML tags from the LLM output (fixes `<center>` tags)
2. Implement your preferred screenplay formatting approach
3. Apply your preferred character name color
4. Implement your preferred solution for the highlighting issue

What would you like me to do?