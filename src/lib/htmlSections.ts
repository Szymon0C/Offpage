// src/lib/htmlSections.ts

/**
 * Replace a section in full HTML identified by data-offpage-id.
 * Uses regex to find the element with the matching attribute and replaces its outerHTML.
 *
 * @param fullHtml - The complete page HTML
 * @param sectionId - The data-offpage-id value to find
 * @param newSectionHtml - The replacement HTML for that section
 * @returns Updated full HTML, or original if section not found
 */
export function replaceSectionInHtml(
  fullHtml: string,
  sectionId: string,
  newSectionHtml: string
): string {
  // Match the opening tag with data-offpage-id="sectionId"
  const escapedId = sectionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const openTagRegex = new RegExp(
    `(<(\\w+)[^>]*data-offpage-id\\s*=\\s*"${escapedId}"[^>]*>)`,
    's'
  );
  const match = openTagRegex.exec(fullHtml);
  if (!match) return fullHtml;

  const tagName = match[2];
  const startIndex = match.index;

  // Find the matching closing tag
  // Simple approach: find the corresponding closing tag by counting nesting
  let depth = 1;
  let searchFrom = startIndex + match[0].length;
  const openPattern = new RegExp(`<${tagName}[\\s>]`, 'gi');
  const closePattern = new RegExp(`</${tagName}>`, 'gi');

  openPattern.lastIndex = searchFrom;
  closePattern.lastIndex = searchFrom;

  while (depth > 0) {
    const nextOpen = openPattern.exec(fullHtml);
    const nextClose = closePattern.exec(fullHtml);

    if (!nextClose) break; // malformed HTML, bail

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      openPattern.lastIndex = nextOpen.index + nextOpen[0].length;
      closePattern.lastIndex = nextClose.index; // re-check this close
    } else {
      depth--;
      if (depth === 0) {
        const endIndex = nextClose.index + nextClose[0].length;
        return fullHtml.slice(0, startIndex) + newSectionHtml + fullHtml.slice(endIndex);
      }
    }
  }

  return fullHtml;
}

/**
 * Ensure the replacement HTML has the correct data-offpage-id attribute.
 */
export function ensureSectionId(sectionHtml: string, sectionId: string): string {
  // Check if data-offpage-id already present
  if (sectionHtml.includes(`data-offpage-id="${sectionId}"`)) {
    return sectionHtml;
  }
  // Add to first opening tag
  return sectionHtml.replace(/^(<\w+)/, `$1 data-offpage-id="${sectionId}"`);
}
