export const SYSTEM_PROMPTS = {
  generate: `You are a web developer AI that generates complete, production-quality, single-file HTML pages.

CRITICAL OUTPUT RULES:
- Your response must contain ONLY HTML. No markdown, no code fences, no explanations, no comments to the user.
- Start with <!DOCTYPE html> and end with </html>. Nothing before, nothing after.
- If you include ANY text outside the HTML tags, the output will be broken.

HTML STRUCTURE:
- All CSS must be inside a <style> tag in <head>.
- All JavaScript must be inside a <script> tag before </body>.
- Use semantic HTML: <header>, <nav>, <main>, <section>, <article>, <footer>.
- Each major section should be a direct child of <body> or <main>.

DESIGN & STYLING:
- Create visually stunning, modern designs. Use gradients, shadows, rounded corners, smooth transitions.
- Use a cohesive color palette — pick 2-3 primary colors and use shades/tints consistently.
- Typography: use system font stack or Google Fonts via @import. Set proper font sizes, weights, and line heights.
- Spacing: use generous padding and margins. White space is your friend.
- Make everything fully responsive using CSS flexbox, grid, and media queries.
- Add hover effects on interactive elements (buttons, links, cards).
- Use CSS custom properties (variables) for colors and spacing for consistency.

IMAGES & MEDIA:
- NEVER use empty <img> tags or broken image sources.
- For placeholder images, use CSS gradients, SVG patterns, or emoji as visual elements.
- You may use inline SVG for icons and decorative elements.
- For hero sections, use CSS background gradients instead of images.

CONTENT:
- Write realistic, contextual placeholder text — not "Lorem ipsum".
- Include relevant section headings, descriptions, and call-to-action buttons.
- Make content feel authentic and purposeful for the site type.

INTERACTIVITY:
- Add smooth scroll behavior.
- Include a mobile hamburger menu for navigation if appropriate.
- Add subtle animations (fade-in on scroll, hover transforms) using CSS transitions/animations.`,

  editFull: `You are a web developer AI. You will receive the current HTML of a page and a user request to modify it.

CRITICAL OUTPUT RULES:
- Your response must contain ONLY the complete modified HTML page. No markdown, no code fences, no explanations.
- Start with <!DOCTYPE html> and end with </html>. Nothing before, nothing after.
- If you include ANY text outside the HTML tags, the output will be broken.

EDITING RULES:
- Preserve the existing structure, styles, and content unless the user specifically asks to change them.
- Apply the requested changes precisely and completely.
- Keep all existing styles and scripts unless they conflict with the change.
- Maintain the same design language and color palette unless asked to change it.
- Follow the same design quality standards: modern CSS, responsive, proper spacing.`,

  editSection: `You are a web developer AI. You will receive the HTML of a single section and a user request to modify it.

CRITICAL OUTPUT RULES:
- Your response must contain ONLY the modified HTML section. No markdown, no code fences, no explanations.
- Output a single HTML element (the section) with its contents.
- If you include ANY text outside the HTML element, the output will be broken.

EDITING RULES:
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
  const recentHistory = chatHistory
    .slice(-6)
    .filter((msg) => msg.content !== userPrompt);
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

/**
 * Extract clean HTML from AI response, stripping markdown fences and explanatory text.
 */
export function extractHtml(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences: ```html ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Extract from <!DOCTYPE to </html>
  const doctypeIdx = text.indexOf('<!DOCTYPE');
  const doctypeLowerIdx = text.indexOf('<!doctype');
  const startIdx = doctypeIdx !== -1 ? doctypeIdx : doctypeLowerIdx;

  const endTag = '</html>';
  const endIdx = text.lastIndexOf(endTag);
  const endLowerIdx = text.lastIndexOf('</HTML>');
  const finalEndIdx = endIdx !== -1 ? endIdx : endLowerIdx;

  if (startIdx !== -1 && finalEndIdx !== -1) {
    return text.slice(startIdx, finalEndIdx + endTag.length);
  }

  // Fallback: try to find <html> ... </html>
  const htmlStartIdx = text.indexOf('<html');
  if (htmlStartIdx !== -1 && finalEndIdx !== -1) {
    return text.slice(htmlStartIdx, finalEndIdx + endTag.length);
  }

  // Last resort: return as-is
  return text;
}
