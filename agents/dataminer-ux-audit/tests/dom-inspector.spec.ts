/**
 * DOM inspector — reads the page structure and dumps selectors.
 * Read-only: no clicks, no form submissions, no saves.
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const APP_URL = '/app/7defd98c-50b9-40fb-bb55-2ceba50085ef/Overview';
const OUT = path.join(__dirname, '..', 'playwright-report', 'dom-inspector.json');

test('Inspect DataMiner DOM structure (read-only)', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    function attrs(el: Element) {
      const out: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) out[a.name] = a.value;
      return out;
    }

    function describeEl(el: Element, depth = 0): object {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classes: el.className || undefined,
        attrs: attrs(el),
        text: el.textContent?.trim().slice(0, 80) || undefined,
        visible: rect.width > 0 && rect.height > 0,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        children: depth < 3
          ? Array.from(el.children).slice(0, 15).map(c => describeEl(c, depth + 1))
          : [],
      };
    }

    // ── Collect nav-like elements ──────────────────────────────────────────
    const navCandidates = Array.from(document.querySelectorAll(
      'nav, aside, [class*="nav"], [class*="sidebar"], [class*="side-bar"], [class*="menu"], dma-sidebar, dma-nav'
    )).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    // ── Collect all links inside the app shell ─────────────────────────────
    const appLinks = Array.from(document.querySelectorAll('a[href]'))
      .filter(a => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map(a => ({
        text: a.textContent?.trim().slice(0, 60),
        href: (a as HTMLAnchorElement).href,
        classes: a.className,
        parentTag: a.parentElement?.tagName.toLowerCase(),
        parentClass: a.parentElement?.className,
      }));

    // ── Sidebar tab details ────────────────────────────────────────────────
    const tabs = Array.from(document.querySelectorAll('dma-app-sidebar-wrapper .sidebar-tab'));
    const tabDetails = tabs.map(tab => ({
      outerHTML: tab.outerHTML.slice(0, 300),
      text: tab.textContent?.trim().slice(0, 80),
      children: Array.from(tab.children).map(c => ({
        tag: c.tagName.toLowerCase(),
        classes: c.className,
        text: c.textContent?.trim().slice(0, 60),
      })),
    }));

    // ── Custom element tags present in the document ────────────────────────
    const customTags = [...new Set(
      Array.from(document.querySelectorAll('*'))
        .map(e => e.tagName.toLowerCase())
        .filter(t => t.includes('-'))
    )].sort();

    // ── All unique class names containing nav/sidebar/menu keywords ────────
    const navClasses = [...new Set(
      Array.from(document.querySelectorAll('*'))
        .flatMap(el => Array.from(el.classList))
        .filter(c => /nav|sidebar|side-bar|menu|panel|header/i.test(c))
    )].sort();

    return {
      tabDetails,
      navCandidates: navCandidates.map(el => describeEl(el)),
      appLinks,
      customTags,
      navClasses,
    };
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log('\n✅  DOM inspection saved to:', OUT);
  console.log('\n🗂  Sidebar tab details:');
  for (const t of (result as any).tabDetails) {
    console.log(`  text="${t.text}"  children:`, JSON.stringify(t.children));
  }
  console.log('\n📦  Custom element tags found:');
  console.log('   ', (result as any).customTags.join(', '));
  console.log('\n🎨  Nav-related CSS classes found:');
  console.log('   ', (result as any).navClasses.slice(0, 30).join(', '));
  console.log('\n🔗  Visible links:');
  for (const l of (result as any).appLinks.slice(0, 20)) {
    console.log(`   [${l.parentTag}.${l.parentClass?.slice(0,40)}]  "${l.text}"  →  ${l.href}`);
  }
});
