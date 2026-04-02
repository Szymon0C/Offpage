export const SYSTEM_PROMPTS = {
  generate: `You are a web developer AI. Generate a complete, single-file HTML page with inline CSS and JavaScript.

Rules:
- Output ONLY valid HTML. No markdown, no explanation, no code fences.
- Start with <!DOCTYPE html> and end with </html>.
- All CSS must be in a <style> tag in <head>.
- All JavaScript must be in a <script> tag before </body>.
- Use modern CSS (flexbox, grid, custom properties).
- Make the page fully responsive.
- Use semantic HTML elements (header, main, section, footer, nav, article).
- Each major section should be a direct child of <body> or <main>.
- Include placeholder text that matches the site's purpose.
- Design should be clean, modern, and professional.`,

  editFull: `You are a web developer AI. You will receive the current HTML of a page and a user request to modify it.

Rules:
- Output ONLY the complete modified HTML page. No markdown, no explanation, no code fences.
- Start with <!DOCTYPE html> and end with </html>.
- Preserve the existing structure and content unless the user specifically asks to change it.
- Apply the requested changes precisely.
- Keep all existing styles and scripts unless they conflict with the change.`,

  editSection: `You are a web developer AI. You will receive the HTML of a single section and a user request to modify it.

Rules:
- Output ONLY the modified HTML section. No markdown, no explanation, no code fences.
- Output a single HTML element (the section) with its contents.
- Preserve the existing structure unless the user specifically asks to change it.
- Keep inline styles consistent with what was provided.
- Do not add <!DOCTYPE>, <html>, <head>, or <body> tags.`,
} as const;

export function buildGenerateMessages(
  userPrompt: string,
  siteType: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'user',
      content: `Create a ${siteType} website: ${userPrompt}`,
    },
  ];
}

export function buildEditMessages(
  currentHtml: string,
  chatHistory: Array<{ role: string; content: string }>,
  userPrompt: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'user',
      content: `Here is the current HTML of the page:\n\n${currentHtml}`,
    },
    {
      role: 'assistant',
      content: 'I see the current page. What would you like me to change?',
    },
  ];
  const recentHistory = chatHistory.slice(-6);
  messages.push(...recentHistory);
  messages.push({ role: 'user', content: userPrompt });
  return messages;
}

export function buildSectionEditMessages(
  sectionHtml: string,
  userPrompt: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'user',
      content: `Here is the HTML of the section to modify:\n\n${sectionHtml}\n\nChange request: ${userPrompt}`,
    },
  ];
}
