/**
 * Converts a hex color string (#RRGGBB) to the CSS `rgb(r, g, b)` format
 * that `getComputedStyle` returns — useful for comparing color values.
 */
export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Returns the computed CSS property value of the first matching element.
 */
export async function getCssProperty(
  page: import('@playwright/test').Page,
  selector: string,
  property: string
): Promise<string> {
  return page.$eval(selector, (el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
}
