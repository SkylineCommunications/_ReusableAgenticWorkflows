import { test, Page, TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';
import * as fs from 'fs';
import {
  rgbStringToHex, contrastRatio,
  calculateScore, gradeFromScore, buildImprovementList,
  type AuditFinding,
} from './ux-audit-helpers';

// Both are set automatically by the Copilot "run_dataminer_ux_audit" extension tool.
// You can also set them manually: AUDIT_APP_URL, AUDIT_APP_NAME.
const APP_URL  = process.env.AUDIT_APP_URL  ?? '/app/7defd98c-50b9-40fb-bb55-2ceba50085ef/Overview';
const APP_NAME = process.env.AUDIT_APP_NAME ?? 'FleetOps';

// Set to true to re-enable WCAG / axe accessibility checks (A-01, A-02, UX-01).
const WCAG_ENABLED = false;
const SHOTS   = path.join(__dirname, '..', 'results', 'screenshots');
const REPORT  = path.join(__dirname, '..', 'results');
const FORBIDDEN_BUTTON = /\b(save|delete|submit|confirm|create|add|import|remove)\b/i;

const ICON_NAMES: Record<string, string> = {
  DiagnosticDataBarTooltip: 'Diagnostics', Car: 'Fleet', Onboarding: 'Onboarding',
  Zoom: 'Inspect', TextDocumentEdit: 'Documents', CircleDollar: 'Finance',
  LightningBolt: 'Events', LightningBoltSolid: 'Active', MapPin: 'Travel',
};

const CATEGORY_COLOR: Record<string, string> = {
  'Style Guide':   '#E53935',
  'Accessibility': '#6A1B9A',
  'UX Expert':     '#1565C0',
};

// Developer-facing fix instructions for each rule (used in the improvement plan)
const RULE_SUGGESTIONS: Record<string, string> = {
  'SG-01': 'Update the LCA theme to use "Segoe UI" as the base font family.',
  'SG-02': 'In the LCA theme settings, set H1 font-size to 24px and font-weight to 400.',
  'SG-03': 'In the LCA theme settings, change the page title (H1) colour to #151A22 (dark) or #FDFDFD (light).',
  'SG-06': 'In each table component, hide all VIN/ID/GUID columns via the column visibility settings. End users should never see raw database identifiers.',
  'SG-07': 'In each table component settings, set the row height to exactly 49px.',
  'SG-08': 'For each untitled component: LCA editor → select component → Layout panel → enable "Show header" → add a descriptive title.',
  'SG-09': 'For each button without an icon: open the button settings → assign a Fluent/Segoe icon from the icon picker.',
  'SG-10': 'In each empty grid component settings, configure an empty-state message such as "No data available" or "No items match the current filter".',
  'SG-12': 'Fix text/background colour combinations below 4.5:1 contrast ratio. Use the WebAIM Contrast Checker to find compliant colour pairs.',
  'A-01':  'Add aria-label or associated <label> to all form inputs — WCAG Level A mandatory requirement.',
  'A-02':  'Fix: (1) add title="Map" to all embedded <iframe> elements, (2) add tabindex="0" to scrollable containers.',
  'UX-01': 'Increase all interactive elements to minimum 44×44 px by adjusting padding or min-size in component settings (WCAG 2.5.5).',
  'UX-02': 'Reduce widget count above the fold: group related widgets into tabs or collapsible sections so each page has a single clear focus.',
  'UX-03': 'Apply a consistent 16–24px gutter between all widget cards in the LCA layout settings.',
  'UX-04': 'In the LCA theme editor, add box-shadow: "0 2px 8px rgba(0,0,0,0.12)" to the dma-db-component selector. Gives widgets a modern lifted feel.',
  'UX-05': 'In the LCA theme editor, set border-radius: 6px on dma-db-component and dma-button. Rounded corners are a hallmark of modern UI design.',
  'UX-06': 'Set the primary action button to "Primary" variant in button component settings to apply the brand accent color (e.g. #00A9FF). Without a primary CTA, users must read every button to decide what to do.',
  'UX-07': 'Replace plain-text status values (Active/Error/Warning) with colored chip components: green=#2E7D32, red=#C62828, orange=#E65100, grey=#666. This is the single biggest visual improvement in data-heavy apps.',
  'UX-08': 'Define a 3–4 level type scale in the LCA theme: ~24px headline, ~14px body, ~11px label/meta. Flat typography makes pages hard to scan.',
  'UX-09': 'Add a KPI tile row or a trend chart above the main table. Tables require row-by-row reading; a KPI summary lets users understand state at a glance.',
};

const EFFORT_BY_RULE: Record<string, string> = {
  'SG-01': 'Medium', 'SG-02': 'Low', 'SG-03': 'Low', 'SG-06': 'Low', 'SG-07': 'Low',
  'SG-08': 'Low', 'SG-09': 'Low', 'SG-10': 'Low', 'SG-12': 'Medium',
  'A-01': 'Low', 'A-02': 'Low', 'UX-01': 'Medium',
  'UX-02': 'Medium', 'UX-03': 'Low', 'UX-04': 'Low', 'UX-05': 'Low',
  'UX-06': 'Low', 'UX-07': 'Medium', 'UX-08': 'Low', 'UX-09': 'High',
};

// ── Annotation system ─────────────────────────────────────────────────────────

interface Annotation {
  bbox: { x: number; y: number; width: number; height: number };
  label: string;        // short badge on the screenshot
  suggestion: string;   // plain-English "what to change" for the table
  category: string;
  rule: string;
  impact: string;
  color: string;
  num: number;
}

async function injectAnnotations(page: Page, annotations: Annotation[]) {
  await page.evaluate((items) => {
    for (const a of items) {
      const wrap = document.createElement('div');
      wrap.className = '__ux-audit-annotation';
      wrap.style.cssText = [
        'position:fixed', `left:${a.bbox.x}px`, `top:${a.bbox.y}px`,
        `width:${Math.max(a.bbox.width, 4)}px`, `height:${Math.max(a.bbox.height, 4)}px`,
        `border:3px solid ${a.color}`, 'pointer-events:none', 'z-index:2147483647', 'box-sizing:border-box',
      ].join(';');
      const badge = document.createElement('div');
      badge.style.cssText = [
        'position:absolute', 'top:-22px', 'left:-3px', `background:${a.color}`, 'color:#fff',
        'font:bold 11px/20px Arial,sans-serif', 'padding:0 6px', 'border-radius:3px 3px 0 0',
        'white-space:nowrap', 'max-width:260px', 'overflow:hidden', 'text-overflow:ellipsis',
        'text-shadow:0 1px 2px rgba(0,0,0,.5)',
      ].join(';');
      badge.textContent = `${a.num}. ${a.label}`;
      wrap.appendChild(badge);
      document.body.appendChild(wrap);
    }
  }, annotations);
}

async function removeAnnotations(page: Page) {
  await page.evaluate(() => document.querySelectorAll('.__ux-audit-annotation').forEach(el => el.remove()));
}

// ── Wait for page and grids to finish loading ─────────────────────────────────

async function waitForPageReady(page: Page): Promise<{ loadingNote: string | null; loadTimeMs: number }> {
  const t0 = Date.now();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
  try {
    await page.waitForFunction(() => {
      const visible = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return ![...Array.from(document.querySelectorAll('dma-spinner')),
               ...Array.from(document.querySelectorAll('[aria-busy="true"]'))].some(visible);
    }, { timeout: 20_000 });
  } catch {
    const ms = Date.now() - t0;
    return { loadingNote: `⚠️ Loading indicators still visible after 20s (${(ms / 1000).toFixed(1)}s elapsed) — data may be incomplete.`, loadTimeMs: ms };
  }
  await page.waitForTimeout(1000);
  const ms = Date.now() - t0;
  let note: string | null = null;
  if (ms > 10_000) note = `⚠️ Performance: page took ${(ms / 1000).toFixed(1)}s to load (measured on 2nd visit, after cache warm-up). Users will experience this as slow.`;
  else if (ms > 5_000) note = `⏱️ Page took ${(ms / 1000).toFixed(1)}s (2nd visit, after cache warm-up) — acceptable but worth monitoring.`;
  return { loadingNote: note, loadTimeMs: ms };
}

// ── Panel helpers ─────────────────────────────────────────────────────────────

async function tryOpenPanel(page: Page): Promise<boolean> {
  const panelVisible = () =>
    page.locator('[class*="panel"]:visible, [class*="overlay"]:visible, [class*="side-panel"]:visible')
      .count().then(n => n > 0);

  // Known DataMiner interactive row elements (may not have cursor:pointer)
  const INTERACTIVE_TAGS = new Set([
    'dma-generic-state', 'dma-state-v2', 'dma-dbc-action', 'dma-button',
    'dma-icon', 'dma-gqi-template-shape-visualizer', 'dma-template-text-visualizer',
    'dma-db-visualization-action-button', 'button', 'a',
  ]);

  const clickTargets = await page.evaluate((interactiveTags: string[]) => {
    const FORBIDDEN = /\b(save|delete|submit|confirm|create|add|import|remove)\b/i;
    const tagSet = new Set(interactiveTags);

    const allRows = Array.from(document.querySelectorAll(
      'dma-generic-grid [role="row"]:not([class*="header"]), dma-grid [role="row"]:not([class*="header"])'
    ));

    for (const row of allRows.slice(0, 5)) {
      const targets: { x: number; y: number; tag: string; text: string; priority: number }[] = [];

      for (const el of Array.from(row.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.top < 0 || r.top > window.innerHeight) continue;
        const tag    = el.tagName.toLowerCase();
        const text   = (el.textContent?.trim() ?? '');
        const cursor = getComputedStyle(el).cursor;
        const cls    = (typeof el.className === 'string' ? el.className : '');
        if (FORBIDDEN.test(text)) continue;

        const isKnownTag   = tagSet.has(tag);
        const hasPointer   = cursor === 'pointer';
        const hasActionCls = /action|icon|btn|clickable|link/i.test(cls);
        if (!isKnownTag && !hasPointer && !hasActionCls) continue;

        // Higher priority = try first
        const priority = isKnownTag ? 3 : hasPointer ? 2 : 1;
        targets.push({ x: r.left + r.width / 2, y: r.top + r.height / 2,
          tag, text: text.slice(0, 20), priority });
      }

      if (targets.length === 0) continue;

      // Sort by priority, then deduplicate points within 4px of each other
      const sorted = targets.sort((a, b) => b.priority - a.priority);
      const deduped = sorted.filter((t, i, arr) =>
        !arr.slice(0, i).some(p => Math.abs(p.x - t.x) < 4 && Math.abs(p.y - t.y) < 4));
      return deduped.slice(0, 12);
    }

    // Fallback: center of first row
    if (allRows.length > 0) {
      const r = allRows[0].getBoundingClientRect();
      return [{ x: r.left + r.width / 2, y: r.top + r.height / 2, tag: 'row', text: '', priority: 0 }];
    }
    return [];
  }, [...INTERACTIVE_TAGS]);

  for (const t of clickTargets) {
    try {
      console.log(`    🖱  clicking <${t.tag}> "${t.text}" at (${Math.round(t.x)},${Math.round(t.y)})`);
      await page.mouse.click(t.x, t.y);
      await page.waitForTimeout(1000);
      if (await panelVisible()) { console.log('    ✅ panel opened'); return true; }
    } catch { continue; }
  }

  // Last resort: top-level action buttons
  const btns = page.locator('dma-db-visualization-action-button:visible');
  for (let i = 0; i < Math.min(await btns.count(), 5); i++) {
    const label = (await btns.nth(i).textContent() ?? '').trim();
    if (FORBIDDEN_BUTTON.test(label)) continue;
    await btns.nth(i).click();
    await page.waitForTimeout(800);
    if (await panelVisible()) return true;
  }
  return false;
}

async function closePanel(page: Page) {
  const btn = page.locator('[class*="panel"] [class*="close"]:visible, [class*="overlay"] [class*="close"]:visible, [class*="side-panel"] [class*="close"]:visible').first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(500); }
}

// ── Automated checks ──────────────────────────────────────────────────────────

async function runChecks(page: Page): Promise<{ findings: AuditFinding[]; annotations: Annotation[] }> {
  const findings: AuditFinding[] = [];
  const annotations: Annotation[] = [];
  let annNum = 1;

  const ann = (bbox: Annotation['bbox'] | null, label: string, suggestion: string, impact: string, category: string, rule: string) => {
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;
    let color = CATEGORY_COLOR[category] ?? CATEGORY_COLOR['UX Expert'];
    if (impact === 'medium' || impact === 'low') {
      const h = color.slice(1);
      const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
      const f = impact === 'medium' ? 0.75 : 0.55;
      const bl = (c: number) => Math.round(c * f + 255 * (1 - f));
      color = '#' + [bl(r),bl(g),bl(b)].map(c => c.toString(16).padStart(2,'0')).join('');
    }
    annotations.push({ bbox, label, suggestion, category, rule, impact, color, num: annNum++ });
  };

  // SG-01 Font
  const font = await page.$eval('body', el => getComputedStyle(el).fontFamily).catch(() => '');
  findings.push({ category: 'Style Guide', rule: 'SG-01 Segoe UI font', impact: 'medium',
    status: font.includes('Segoe UI') ? 'pass' : 'fail',
    detail: font.includes('Segoe UI') ? 'OK' : `Body font is "${font.slice(0,60)}" — expected "Segoe UI"` });

  // SG-02/03 H1 style + colour
  if (await page.locator('h1').count() > 0) {
    const h1 = page.locator('h1').first();
    const s = await h1.evaluate(el => ({ text: el.textContent?.trim().slice(0,40) ?? '',
      size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight, color: getComputedStyle(el).color }));
    const okSize = s.size === '24px' && ['400','normal'].includes(s.weight);
    findings.push({ category: 'Style Guide', rule: 'SG-02 H1 24px / weight 400', impact: 'low',
      status: okSize ? 'pass' : 'fail', detail: okSize ? 'OK' : `H1 "${s.text}" → size:${s.size} weight:${s.weight}` });
    const validColors = [rgbStringToHex('#151A22'), rgbStringToHex('#FDFDFD')].filter(Boolean);
    const colorOk = validColors.includes(rgbStringToHex(s.color) ?? '');
    findings.push({ category: 'Style Guide', rule: 'SG-03 H1 theme color (#151A22 or #FDFDFD)', impact: 'low',
      status: colorOk ? 'pass' : 'fail', detail: colorOk ? 'OK' : `H1 "${s.text}" colour ${s.color} — expected #151A22 or #FDFDFD` });
    if (!colorOk) ann(await h1.boundingBox(), 'SG-03: Wrong H1 colour',
      `Change the page title colour to #151A22 (dark theme) or #FDFDFD (light theme). In the LCA editor go to Theme settings → Heading colour.`,
      'low', 'Style Guide', 'SG-03');
  }

  // SG-06 VIN/ID columns
  const idColHeaders = page.locator('[role="columnheader"], th').filter({ hasText: /^(VIN|ID|GUID|UUID)$/i });
  const idCount = await idColHeaders.count();
  if (idCount > 0) {
    const details: string[] = [];
    for (let i = 0; i < idCount; i++) {
      const col = idColHeaders.nth(i);
      const text = (await col.textContent() ?? '').trim();
      const comp = await col.evaluate(el =>
        el.closest('dma-db-component')?.querySelector('dma-db-component-header')?.textContent?.trim() ?? 'this table');
      details.push(`Column "${text}" in "${comp}"`);
      ann(await col.boundingBox(), `SG-06: Hide "${text}" column`,
        `Open the table component settings and hide the "${text}" column. Raw identifiers (VIN/ID/GUID) are internal database keys — end users should never see them. Set column visibility to hidden in the column configuration.`,
        'high', 'Style Guide', 'SG-06');
    }
    findings.push({ category: 'Style Guide', rule: 'SG-06 No ID columns (VIN/ID/GUID)', impact: 'high', status: 'fail', detail: details.join('; ') });
  } else {
    findings.push({ category: 'Style Guide', rule: 'SG-06 No ID columns (VIN/ID/GUID)', impact: 'high', status: 'pass', detail: 'OK' });
  }

  // SG-07 Row height
  const firstRow = page.locator('dma-generic-grid [role="row"]:not([class*="header"])').first();
  if (await firstRow.count() > 0) {
    const h = await firstRow.evaluate(el => getComputedStyle(el).height);
    findings.push({ category: 'Style Guide', rule: 'SG-07 Table row height 49px', impact: 'low',
      status: h === '49px' ? 'pass' : 'fail', detail: h === '49px' ? 'OK' : `Row height is ${h} — expected 49px` });
  }

  // SG-08 Component headers
  const compData = await page.evaluate(() =>
    Array.from(document.querySelectorAll('dma-db-component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 50 && r.height > 50; })
      .map((c, i) => {
        const r = (c as HTMLElement).getBoundingClientRect();
        const header = c.querySelector('dma-db-component-header');
        const title = header?.textContent?.trim() ?? c.querySelector('h1,h2,h3,[class*="title"]')?.textContent?.trim().slice(0,30) ?? null;
        return { index: i + 1, hasHeader: !!header, title, bbox: { x: r.left, y: r.top, width: r.width, height: r.height } };
      })
  );
  if (compData.length > 0) {
    const noHeader = compData.filter(c => !c.hasHeader);
    findings.push({ category: 'Style Guide', rule: 'SG-08 Components have a title', impact: 'medium',
      status: noHeader.length === 0 ? 'pass' : noHeader.length < compData.length ? 'warn' : 'fail',
      detail: noHeader.length === 0 ? 'OK'
        : `${noHeader.length}/${compData.length} components missing title. Components: ${noHeader.map(c => c.title ? `"${c.title}" (#${c.index})` : `#${c.index}`).join(', ')}` });
    for (const c of noHeader) ann(c.bbox, `SG-08: Add a title to component #${c.index}`,
      `In the LCA editor: select this component → open the Layout panel → enable "Show header" → type a descriptive title (e.g. "Fleet Overview", "Recent Events"). Every widget needs a title so users understand what they are looking at.`,
      'medium', 'Style Guide', 'SG-08');
  }

  // SG-09 Button icons
  const allBtns = await page.locator('dma-button:visible').all();
  if (allBtns.length > 0) {
    const noIconBtns: string[] = [];
    for (const b of allBtns.slice(0,15)) {
      if (await b.locator('dma-icon,[class*="ms-Icon"],svg').count() === 0) {
        const lbl = (await b.textContent() ?? '').trim().slice(0,25);
        noIconBtns.push(`"${lbl}"`);
        ann(await b.boundingBox(), 'SG-09: Add an icon',
          `This button has no icon. In the button component settings, assign a Fluent/Segoe icon. Buttons with icons are easier to scan and reinforce meaning at a glance.`,
          'low', 'Style Guide', 'SG-09');
      }
    }
    findings.push({ category: 'Style Guide', rule: 'SG-09 Buttons include an icon', impact: 'low',
      status: noIconBtns.length === 0 ? 'pass' : noIconBtns.length <= 2 ? 'warn' : 'fail',
      detail: noIconBtns.length === 0 ? 'OK' : `Buttons without icon: ${noIconBtns.join(', ')}` });
  }

  // SG-10 Empty state messages
  const emptyGrids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('dma-generic-grid, dma-grid'))
      .filter(g => { const r = (g as HTMLElement).getBoundingClientRect(); return r.width > 50 && r.height > 50 && g.querySelectorAll('[role="row"]').length <= 1; })
      .map(g => {
        const r = (g as HTMLElement).getBoundingClientRect();
        const comp = g.closest('dma-db-component');
        const name = comp?.querySelector('dma-db-component-header')?.textContent?.trim() ?? 'unnamed grid';
        const hasMsg = !!(g.querySelector('[class*="empty"],[class*="no-data"],[class*="no-result"]') ?? comp?.querySelector('[class*="empty"],[class*="no-data"]'));
        return { name, hasMsg, bbox: { x: r.left, y: r.top, width: r.width, height: r.height } };
      })
  );
  if (emptyGrids.length > 0) {
    const missing = emptyGrids.filter(g => !g.hasMsg);
    findings.push({ category: 'Style Guide', rule: 'SG-10 Empty grids show a helpful message', impact: 'high',
      status: missing.length === 0 ? 'warn' : 'fail',
      detail: missing.length === 0 ? `${emptyGrids.length} empty grid(s), all have an empty-state message`
        : `${missing.length} empty grid(s) with no message: ${missing.map(g => `"${g.name}"`).join(', ')}` });
    for (const g of missing) ann(g.bbox, `SG-10: Add empty-state message to "${g.name}"`,
      `This grid is empty with no explanation. In the component settings, add an empty-state message such as "No data available" or "No items match the current filter". Without this, users think the app is broken.`,
      'high', 'Style Guide', 'SG-10');
  }

  // SG-12 Contrast
  const textEls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('p,span,h1,h2,h3,h4,td,li,label,button'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (el.textContent?.trim().length ?? 0) > 1; })
      .slice(0, 80)
      .map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const comp = el.closest('dma-db-component')?.querySelector('dma-db-component-header')?.textContent?.trim().slice(0,30) ?? null;
        const bgAlpha = parseFloat(cs.backgroundColor.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1] ?? '1');
        return { tag: el.tagName.toLowerCase(), text: el.textContent?.trim().slice(0,30) ?? '',
          fg: cs.color, bg: cs.backgroundColor, bgAlpha, size: cs.fontSize,
          bold: parseInt(cs.fontWeight) >= 700, component: comp,
          bbox: { x: r.left, y: r.top, width: r.width, height: r.height } };
      })
  );
  const contrastFails: string[] = [];
  const seenPairs = new Set<string>();
  for (const e of textEls) {
    if (e.bgAlpha < 0.1) continue;
    const fg = rgbStringToHex(e.fg), bg = rgbStringToHex(e.bg);
    if (!fg || !bg) continue;
    const thresh = (parseFloat(e.size) >= 18 || (parseFloat(e.size) >= 14 && e.bold)) ? 3.0 : 4.5;
    const ratio = contrastRatio(fg, bg);
    if (ratio < thresh) {
      const pairKey = `${fg}|${bg}`;
      const loc = e.component ? ` in "${e.component}"` : '';
      contrastFails.push(`<${e.tag}> "${e.text}"${loc} — ${ratio.toFixed(1)}:1 (needs ${thresh}:1)`);
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        ann(e.bbox, `SG-12: Contrast ${ratio.toFixed(1)}:1 (needs ${thresh}:1)`,
          `Text colour ${e.fg} on background ${e.bg} has a contrast ratio of only ${ratio.toFixed(1)}:1. WCAG AA requires at least ${thresh}:1. Fix: darken the background or use a darker text colour. Verify at https://webaim.org/resources/contrastchecker/`,
          'high', 'Style Guide', 'SG-12');
      }
    }
  }
  findings.push({ category: 'Style Guide', rule: 'SG-12 WCAG AA contrast', impact: 'high',
    status: contrastFails.length === 0 ? 'pass' : contrastFails.length <= 2 ? 'warn' : 'fail',
    detail: contrastFails.length === 0 ? 'OK'
      : contrastFails.slice(0,5).join('\n') + (contrastFails.length > 5 ? `\n  …and ${contrastFails.length - 5} more` : '') });

  // ── Accessibility checks (WCAG) — re-enable by setting WCAG_ENABLED = true ──
  if (WCAG_ENABLED) {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();
    const crit = axe.violations.filter(v => v.impact === 'critical');
    const ser  = axe.violations.filter(v => v.impact === 'serious');
    const fmtV = (v: { id: string; description: string; nodes: Array<{ html: string; target: string[] }> }) => {
      const sample = v.nodes.slice(0,2).map(n => (n.html ?? '').replace(/\s+/g,' ').slice(0,80)).filter(Boolean).join('; ');
      return `${v.id}: ${v.description}${sample ? ` [e.g. ${sample}]` : ''}`;
    };
    const AXE_SUGGESTIONS: Record<string, string> = {
      'label':                       'Add aria-label or <label> to every form input.',
      'color-contrast':              'Increase contrast to at least 4.5:1 (WebAIM Contrast Checker).',
      'frame-title':                 'Add title="Map" to the <iframe> tag in the DataMiner HTML editor.',
      'scrollable-region-focusable': 'Add tabindex="0" to this scrollable container.',
    };
    findings.push({ category: 'Accessibility', rule: 'A-01 No critical WCAG violations', impact: 'critical',
      status: crit.length === 0 ? 'pass' : 'fail',
      detail: crit.length === 0 ? 'OK' : crit.map(fmtV).join('\n') });
    for (const v of [...crit, ...ser]) {
      for (const node of v.nodes.slice(0,3)) {
        if (!node.target?.[0]) continue;
        const bbox = await page.locator(node.target[0]).first().boundingBox().catch(() => null);
        ann(bbox, `${v.impact === 'critical' ? 'A-01' : 'A-02'}: ${v.id}`,
          AXE_SUGGESTIONS[v.id] ?? `Fix WCAG "${v.id}": ${v.description}`,
          v.impact === 'critical' ? 'critical' : 'high', 'Accessibility',
          v.impact === 'critical' ? 'A-01' : 'A-02');
      }
    }
    if (ser.length > 0) findings.push({ category: 'Accessibility', rule: 'A-02 No serious WCAG violations', impact: 'high',
      status: 'fail', detail: ser.map(fmtV).join('\n') });

    // UX-01 Target size (WCAG 2.5.5)
    const smallTargets = await page.evaluate((min: number) =>
      Array.from(document.querySelectorAll('button,a,[role="button"],dma-button'))
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < min || r.height < min); })
        .slice(0,8)
        .map(el => {
          const r = el.getBoundingClientRect();
          const text = el.textContent?.trim().slice(0,25) || (el as HTMLElement).getAttribute('aria-label') || el.tagName.toLowerCase();
          const comp = el.closest('dma-db-component')?.querySelector('dma-db-component-header')?.textContent?.trim().slice(0,25) ?? null;
          return { label: `"${text}" (${Math.round(r.width)}x${Math.round(r.height)}px)${comp ? ` in "${comp}"` : ''}`,
            bbox: { x: r.left, y: r.top, width: r.width, height: r.height } };
        }), 44
    );
    findings.push({ category: 'Accessibility', rule: 'UX-01 Clickable targets >= 44px (WCAG 2.5.5)', impact: 'medium',
      status: smallTargets.length === 0 ? 'pass' : smallTargets.length <= 3 ? 'warn' : 'fail',
      detail: smallTargets.length === 0 ? 'OK' : `${smallTargets.length} element(s) below 44px:\n${smallTargets.map(t => t.label).join('\n')}` });
    for (const t of smallTargets) ann(t.bbox, `UX-01: Too small (${t.label.match(/\((\d+x\d+)/)?.[1] ?? ''})`,
      'Increase to min 44×44 px (WCAG 2.5.5). Adjust padding or min-size in component settings.',
      'medium', 'Accessibility', 'UX-01');
  }

  // ── UX Expert: Modern UI observations ────────────────────────────────────────

  // UX-02 Component density above the fold
  const compCount = await page.evaluate(() => {
    const vh = window.innerHeight;
    return Array.from(document.querySelectorAll('dma-db-component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.top < vh && r.bottom > 0 && r.width > 50; }).length;
  });
  findings.push({ category: 'UX Expert', rule: 'UX-02 Page density (widgets above fold)', impact: 'medium',
    status: compCount <= 7 ? 'pass' : compCount <= 11 ? 'warn' : 'fail',
    detail: compCount <= 7 ? `OK — ${compCount} widgets above fold`
      : `${compCount} widgets visible at once (max 7–8 recommended). Information overload makes users miss key data. Group related widgets into tabs or collapsible sections so each page has one clear focus.` });

  // UX-03 Spacing / gutter between widgets
  const spacingData = await page.evaluate(() => {
    const rects = Array.from(document.querySelectorAll('dma-db-component'))
      .map(c => (c as HTMLElement).getBoundingClientRect())
      .filter(r => r.width > 50 && r.height > 50 && r.top > 0)
      .sort((a, b) => a.top - b.top);
    const gaps: number[] = [];
    for (let i = 0; i < rects.length - 1; i++) {
      const g = rects[i + 1].top - rects[i].bottom;
      if (g >= 0 && g < 200) gaps.push(g);
    }
    return { min: gaps.length ? Math.min(...gaps) : 99, avg: gaps.length ? Math.round(gaps.reduce((s,g)=>s+g,0)/gaps.length) : 0, n: gaps.length };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-03 Consistent spacing between widgets', impact: 'low',
    status: spacingData.n === 0 || spacingData.min >= 12 ? 'pass' : spacingData.min >= 6 ? 'warn' : 'fail',
    detail: spacingData.n === 0 ? 'Single widget — spacing n/a'
      : spacingData.min >= 12 ? `OK — avg gutter ${spacingData.avg}px`
      : `Min gap between widgets is ${spacingData.min}px (avg ${spacingData.avg}px). Use a consistent 16–24px gutter. Cramped layouts feel dated and make widget boundaries ambiguous.` });

  // UX-04 Card elevation (box-shadow)
  const shadowData = await page.evaluate(() => {
    const comps = Array.from(document.querySelectorAll('dma-db-component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 100 && r.height > 80; });
    const withShadow = comps.filter(c => { const s = getComputedStyle(c).boxShadow; return !!s && s !== 'none'; }).length;
    const first = comps[0] as HTMLElement | undefined;
    const r = first?.getBoundingClientRect();
    return { total: comps.length, withShadow,
      firstBbox: r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-04 Card elevation (box-shadow on widgets)', impact: 'medium',
    status: shadowData.withShadow > 0 ? 'pass' : shadowData.total === 0 ? 'skip' : 'fail',
    detail: shadowData.withShadow > 0
      ? `OK — ${shadowData.withShadow}/${shadowData.total} widget cards use box-shadow`
      : `None of the ${shadowData.total} widget cards have a box-shadow. Cards that lie flat on the background blur visually into the page — a very common sign of a dated enterprise UI. Add "0 2px 8px rgba(0,0,0,0.12)" to dma-db-component in the LCA theme.` });
  if (shadowData.total > 0 && shadowData.withShadow === 0 && shadowData.firstBbox)
    ann(shadowData.firstBbox, 'UX-04: No elevation — add box-shadow',
      'In the LCA theme editor, add: box-shadow: 0 2px 8px rgba(0,0,0,0.12) to dma-db-component. This single change makes widgets "lift" off the background and gives the app a modern, polished feel with essentially zero layout work.',
      'medium', 'UX Expert', 'UX-04');

  // UX-05 Border radius (rounded corners on widget cards)
  const radiusData = await page.evaluate(() => {
    const comps = Array.from(document.querySelectorAll('dma-db-component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 50 && r.height > 50; });
    const withRadius = comps.filter(c => parseFloat(getComputedStyle(c).borderRadius) > 0).length;
    const first = comps[0] as HTMLElement | undefined;
    const r = first?.getBoundingClientRect();
    return { total: comps.length, withRadius, firstRadius: first ? getComputedStyle(first).borderRadius : '0',
      firstBbox: r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-05 Rounded corners on widget cards', impact: 'low',
    status: radiusData.total === 0 ? 'skip' : radiusData.withRadius / radiusData.total > 0.5 ? 'pass' : radiusData.withRadius > 0 ? 'warn' : 'fail',
    detail: radiusData.withRadius === 0 && radiusData.total > 0
      ? `All ${radiusData.total} widget cards have square corners (border-radius: 0). Square corners are associated with pre-2015 enterprise UIs. Apply a consistent 6–8px radius in the LCA theme.`
      : `${radiusData.withRadius}/${radiusData.total} widget cards use rounded corners (first card: ${radiusData.firstRadius})` });
  if (radiusData.total > 0 && radiusData.withRadius === 0 && radiusData.firstBbox)
    ann(radiusData.firstBbox, 'UX-05: Square corners — add border-radius: 6px',
      'In the LCA theme editor, set border-radius: 6px on dma-db-component. Rounded corners are a foundational modern UI pattern and require no structural changes — just one CSS property.',
      'low', 'UX Expert', 'UX-05');

  // UX-06 Primary / CTA button clarity
  const ctaData = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('dma-button, button'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const primary = btns.filter(el => {
      const bg = getComputedStyle(el).backgroundColor;
      const rgb = bg.match(/\d+/g)?.map(Number) ?? [];
      if (rgb.length < 3) return false;
      const [r2,g2,b2] = rgb;
      return Math.max(r2,g2,b2) - Math.min(r2,g2,b2) > 30
        && (r2 < 220 || g2 < 220 || b2 < 220)
        && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
    });
    const first = btns[0] as HTMLElement | undefined;
    const r = first?.getBoundingClientRect();
    return { total: btns.length, primaryCount: primary.length,
      firstBbox: r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null };
  });
  if (ctaData.total > 0) {
    findings.push({ category: 'UX Expert', rule: 'UX-06 Primary CTA button is visually distinct', impact: 'medium',
      status: ctaData.primaryCount >= 1 ? 'pass' : 'fail',
      detail: ctaData.primaryCount >= 1 ? `OK — ${ctaData.primaryCount}/${ctaData.total} button(s) have a distinct fill color`
        : `All ${ctaData.total} buttons appear flat/grey — no visual action hierarchy. Set the main action to "Primary" variant (brand accent color). Users default to clicking the most visually prominent button, so without a primary CTA they must read every label.` });
    if (ctaData.primaryCount === 0 && ctaData.firstBbox)
      ann(ctaData.firstBbox, 'UX-06: No primary CTA — all buttons look the same',
        'Open the button component settings → set Variant to "Primary". This applies the brand accent color (DataMiner #00A9FF or your custom theme color). Designate only the single most important action per section as Primary.',
        'medium', 'UX Expert', 'UX-06');
  }

  // UX-07 Status values — colored chips vs plain text
  const statusData = await page.evaluate(() => {
    const STATUS_RE = /^(active|inactive|error|ok|warning|critical|online|offline|pending|running|stopped|failed|success|idle|busy)$/i;
    const rows = Array.from(document.querySelectorAll('[role="row"]:not([class*="header"])'));
    if (!rows.length) return { hasRows: false, chipCount: 0, plainCount: 0,
      firstBbox: null as null | { x:number; y:number; width:number; height:number } };
    let chipCount = 0, plainCount = 0, firstPlainRect: DOMRect | null = null;
    for (const row of rows.slice(0, 20)) {
      for (const cell of Array.from(row.querySelectorAll('td,[role="cell"]'))) {
        const txt = (cell.textContent?.trim() ?? '').split(/\s/)[0];
        if (!STATUS_RE.test(txt)) continue;
        const child = cell.querySelector('span,div,[class*="badge"],[class*="chip"],[class*="tag"],[class*="status"]');
        const bg = child ? getComputedStyle(child).backgroundColor : 'rgba(0,0,0,0)';
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { chipCount++; }
        else { plainCount++; if (!firstPlainRect) firstPlainRect = (cell as HTMLElement).getBoundingClientRect(); }
      }
    }
    return { hasRows: true, chipCount, plainCount,
      firstBbox: firstPlainRect ? { x: firstPlainRect.left, y: firstPlainRect.top, width: firstPlainRect.width, height: firstPlainRect.height } : null };
  });
  if (statusData.hasRows && (statusData.chipCount + statusData.plainCount) > 0) {
    const total = statusData.chipCount + statusData.plainCount;
    findings.push({ category: 'UX Expert', rule: 'UX-07 Status values shown as colored chips', impact: 'medium',
      status: statusData.chipCount >= statusData.plainCount ? 'pass' : statusData.chipCount > 0 ? 'warn' : 'fail',
      detail: statusData.chipCount >= statusData.plainCount
        ? `OK — ${statusData.chipCount}/${total} status values use colored indicators`
        : `${statusData.plainCount}/${total} status values are plain text (e.g. "Active", "Error"). Wrapping them in colored chips — green=Active, red=Error, orange=Warning — is the single most impactful visual improvement in data-heavy apps. Users can scan 10× faster with color than text.` });
    if (statusData.plainCount > statusData.chipCount && statusData.firstBbox)
      ann(statusData.firstBbox, 'UX-07: Plain text status — replace with colored chip',
        'Use a conditional background component in the LCA editor: Active/OK → background #2E7D32 white text, Error/Critical → #C62828, Warning → #E65100, Offline/Inactive → #666. Apply to every status column in every table on this page.',
        'medium', 'UX Expert', 'UX-07');
  }

  // UX-08 Typography hierarchy
  const typoData = await page.evaluate(() => {
    const sizes = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,td,span,label'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 0 && (el.textContent?.trim().length ?? 0) > 2; })
      .map(el => parseFloat(getComputedStyle(el).fontSize))
      .filter(s => !isNaN(s) && s > 0);
    const unique = [...new Set(sizes)].sort((a,b) => b - a);
    return { unique: unique.slice(0, 8), count: unique.length };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-08 Typography hierarchy (≥3 font sizes)', impact: 'low',
    status: typoData.count >= 3 && typoData.count <= 6 ? 'pass' : typoData.count < 3 ? 'fail' : 'warn',
    detail: typoData.count < 3
      ? `Only ${typoData.count} font size(s) found: ${typoData.unique.join(', ')}px. Needs at least 3 levels: headline (~24px), body (~14px), label/meta (~11px). Monotone type makes pages flat and slow to scan.`
      : typoData.count > 6 ? `${typoData.count} different sizes (${typoData.unique.join(', ')}px) — too many creates visual noise. Define a 3–4 level type scale in the theme.`
      : `OK — ${typoData.count} sizes: ${typoData.unique.join(', ')}px` });

  // UX-09 Data visualisation variety
  const vizData = await page.evaluate(() => {
    const hasChart = document.querySelectorAll('dma-chart,canvas:not([class*="map"])').length > 0;
    const hasMap   = document.querySelectorAll('iframe,dma-map').length > 0;
    const hasKpi   = Array.from(document.querySelectorAll('dma-db-component')).some(c => {
      const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 40 && r.width < 350 && r.height > 40 && r.height < 200;
    });
    const hasTable = document.querySelectorAll('dma-generic-grid,dma-grid').length > 0;
    const types    = [hasChart && 'chart', hasMap && 'map', hasKpi && 'KPI tile', hasTable && 'table'].filter(Boolean);
    return { types, onlyTable: hasTable && !hasChart && !hasKpi };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-09 Data visualisation variety', impact: 'low',
    status: !vizData.onlyTable ? 'pass' : 'warn',
    detail: vizData.onlyTable
      ? `Only tables — no charts or KPI tiles detected. Tables demand row-by-row reading; a trend chart or KPI tile row lets users understand state at a glance. Consider adding a KPI summary strip above the main table with total counts and key metrics.`
      : `OK — visualisation mix: ${vizData.types.join(', ')}` });

  return { findings, annotations };
}

// ── Cross-page improvement plan ────────────────────────────────────────────────

interface ImprovementItem { rule: string; category: string; impact: string; affectedPages: string[]; totalScoreGain: number; effort: string; }

function buildImprovementPlan(allReports: { name: string; findings: AuditFinding[] }[]): ImprovementItem[] {
  const W: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const map = new Map<string, ImprovementItem>();
  for (const r of allReports) {
    const totalW = r.findings.reduce((s, f) => s + (W[f.impact] ?? 1), 0);
    for (const f of r.findings.filter(f => f.status === 'fail' || f.status === 'warn')) {
      const key = f.rule.match(/^([A-Z]+-\d+)/)?.[1] ?? f.rule.slice(0,6);
      const delta = (f.status === 'fail' ? 1 : 0.5) * (W[f.impact] ?? 1);
      const gain = totalW > 0 ? (delta / totalW) * 100 / allReports.length : 0;
      if (!map.has(key)) map.set(key, { rule: f.rule, category: f.category, impact: f.impact, affectedPages: [], totalScoreGain: 0, effort: EFFORT_BY_RULE[key] ?? 'Medium' });
      const item = map.get(key)!;
      if (!item.affectedPages.includes(r.name)) item.affectedPages.push(r.name);
      item.totalScoreGain += gain;
    }
  }
  return [...map.values()].sort((a, b) => b.totalScoreGain - a.totalScoreGain).slice(0, 14);
}

// ── Main test ─────────────────────────────────────────────────────────────────

interface FullReport {
  name: string; score: number; grade: string; findings: AuditFinding[];
  annotations: Annotation[]; improvements: string[]; panelNote: string;
  loadingNote: string | null; loadTimeMs: number; annotatedShot: string; cleanShot: string;
}

test('DataMiner LCA — full UX & style audit', async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  [SHOTS, REPORT].forEach(d => fs.mkdirSync(d, { recursive: true }));

  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  // Read all sidebar tabs with their DOM index AND bounding box so we can sort by visual position.
  const tabData = await page.evaluate(() =>
    Array.from(document.querySelectorAll('dma-app-sidebar-wrapper .sidebar-tab')).map((el, i) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const cls = (el.querySelector('[class*="ms-Icon--"]') as HTMLElement | null)?.className ?? '';
      const key = cls.match(/ms-Icon--(\w+)/)?.[1] ?? '';
      // Also try aria-label and title for a readable name
      const ariaLabel = (el as HTMLElement).getAttribute('aria-label') ?? (el.querySelector('[aria-label]') as HTMLElement | null)?.getAttribute('aria-label') ?? '';
      return { domIndex: i, key, ariaLabel: ariaLabel.trim(), left: r.left, top: r.top };
    })
  );
  // Sort by visual position: left sidebar = sort by top, top sidebar = sort by left
  const isVertical = tabData.length > 1 && Math.abs(tabData[0].top - tabData[tabData.length-1].top) > Math.abs(tabData[0].left - tabData[tabData.length-1].left);
  tabData.sort((a, b) => isVertical ? a.top - b.top : a.left - b.left);

  const pages: { name: string; index: number }[] = tabData.map((t, ordinal) => {
    const nameFromIcon = ICON_NAMES[t.key] ?? (t.key || '');
    const name = ordinal === 0 ? 'Overview' : (nameFromIcon || t.ariaLabel || `Page ${ordinal + 1}`);
    return { name, index: t.domIndex };
  });
  console.log(`\n📋  Auditing ${pages.length} pages: ${pages.map(p => p.name).join(', ')}\n`);

  // ── Pass 1: cache warm-up (no data collected) ──────────────────────────────
  console.log('🔥  Pass 1: warming up cache...');
  for (const { name, index } of pages) {
    await page.locator('dma-app-sidebar-wrapper .sidebar-tab').nth(index).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(300);
    console.log(`     ✓ ${name}`);
  }
  console.log('   Cache warm-up done.\n');
  await page.locator('dma-app-sidebar-wrapper .sidebar-tab').nth(0).click();
  await page.waitForTimeout(500);

  // ── Pass 2: measured audit ─────────────────────────────────────────────────
  console.log('📊  Pass 2: measured audit (cache is warm)...\n');
  const allReports: FullReport[] = [];

  for (const { name, index } of pages) {
    console.log(`\n${'─'.repeat(70)}\n  PAGE: ${name.toUpperCase()}\n${'─'.repeat(70)}`);

    await page.locator('dma-app-sidebar-wrapper .sidebar-tab').nth(index).click();
    const { loadingNote, loadTimeMs } = await waitForPageReady(page);
    if (loadingNote) console.log(`  ${loadingNote}`);
    else console.log(`  ⏱ Loaded in ${(loadTimeMs / 1000).toFixed(1)}s (cached)`);

    const { findings, annotations } = await runChecks(page);

    // Clean screenshot
    const cleanShot = path.join(SHOTS, `${String(index+1).padStart(2,'0')}-${name}.png`);
    await page.screenshot({ path: cleanShot, fullPage: false });
    await testInfo.attach(`📸 ${name} — clean`, { path: cleanShot, contentType: 'image/png' });

    // Annotated screenshot
    const annotatedShot = path.join(SHOTS, `${String(index+1).padStart(2,'0')}-${name}-annotated.png`);
    if (annotations.length > 0) {
      await injectAnnotations(page, annotations);
      await page.screenshot({ path: annotatedShot, fullPage: false });
      await removeAnnotations(page);
    } else {
      fs.copyFileSync(cleanShot, annotatedShot);
    }
    await testInfo.attach(`🔍 ${name} — annotated`, { path: annotatedShot, contentType: 'image/png' });

    // Panel walkthrough
    let panelNote = 'No table rows or safe action buttons found to open a panel.';
    try {
      const opened = await tryOpenPanel(page);
      if (opened) {
        const panelShot = path.join(SHOTS, `${String(index+1).padStart(2,'0')}-${name}-panel.png`);
        await page.screenshot({ path: panelShot, fullPage: false });
        await testInfo.attach(`📸 ${name} — panel`, { path: panelShot, contentType: 'image/png' });
        const hasClose = await page.locator('[class*="panel"] [class*="close"]:visible, [class*="overlay"] [class*="close"]:visible').count() > 0;
        panelNote = hasClose ? '✅ Panel opened, close button present.'
          : '⚠️ Panel opened but no close button found — every panel needs one per style guide.';
        await closePanel(page);
      }
    } catch { panelNote = 'Panel interaction failed.'; }

    const score = calculateScore(findings);
    const grade = gradeFromScore(score);
    const improvements = buildImprovementList(findings);

    for (const fi of findings.filter(fi => fi.status !== 'pass')) {
      const icon = fi.status === 'warn' ? '⚠️ ' : '❌';
      console.log(`  ${icon} [${fi.category}][${fi.impact}] ${fi.rule}: ${fi.detail.replace(/\n/g, '\n       ')}`);
    }
    console.log(`  → Score: ${score}/100 (${grade})`);
    allReports.push({ name, score, grade, findings, annotations, improvements, panelNote, loadingNote, loadTimeMs, annotatedShot, cleanShot });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const avg = Math.round(allReports.reduce((s, r) => s + r.score, 0) / allReports.length);
  const avgGrade = gradeFromScore(avg);
  console.log(`\n\n${'='.repeat(80)}\n OVERALL SCORE: ${avg}/100  Grade ${avgGrade}\n${'='.repeat(80)}`);
  for (const r of allReports)
    console.log(`  ${r.name.padEnd(16)} ${(r.score+'/100').padEnd(10)} ${r.grade.padEnd(6)} ${r.improvements.slice(0,1).map(i=>i.slice(0,60)).join('')}`);

  const improvementPlan = buildImprovementPlan(allReports);

  // Write reports
  const mdPath = path.join(REPORT, 'audit-report.md');
  fs.writeFileSync(mdPath, buildMarkdown(allReports, avg, avgGrade, improvementPlan), 'utf-8');
  await testInfo.attach('📄 Markdown report', { path: mdPath, contentType: 'text/plain' });

  const htmlPath = path.join(REPORT, 'audit-report.html');
  fs.writeFileSync(htmlPath, buildHtmlReport(allReports, avg, avgGrade, improvementPlan), 'utf-8');
  await testInfo.attach('🌐 HTML report', { path: htmlPath, contentType: 'text/plain' });

  console.log(`\n📄 Markdown: ${mdPath}`);
  console.log(`🌐 HTML:     ${htmlPath}\n`);
});

// ── Markdown report ────────────────────────────────────────────────────────────

function buildMarkdown(reports: FullReport[], avg: number, avgGrade: string, plan: ImprovementItem[]): string {
  let md = `# DataMiner ${APP_NAME} LCA — UX & Style Audit\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}  \n**Overall score:** ${avg}/100 — Grade ${avgGrade}\n\n`;
  md += `| Tag | Meaning |\n|-----|---------||\n`;
  md += `| 📋 Style Guide | Violates the [DataMiner LCA style guide](https://docs.dataminer.services/dataminer/Functions/Dashboards_and_Low_Code_Apps/Low_Code_Apps/Style_guide.html) — rules your team defined |\n`;
  md += `| ♿ Accessibility | Violates WCAG industry standard (checked by axe-core) |\n`;
  md += `| 👁 UX Expert | Observation from an independent UX reviewer |\n\n---\n\n`;

  // Improvement plan
  md += `## 🚀 How to improve your score (${avg}/100)\n\n`;
  const grades = [{g:'A',m:90},{g:'B',m:75},{g:'C',m:60},{g:'D',m:40}].filter(t => t.m > avg);
  if (grades.length) md += `> To reach **Grade ${grades[0].g}** (${grades[0].m}+) you need **+${grades[0].m - avg} pts** — fix the top items in the table below.\n\n`;
  md += `| Priority | Type | Rule | Fix | Score gain | Effort | Pages |\n|----------|------|------|-----|-----------|--------|-------|\n`;
  for (const item of plan) {
    const emoji = { 'Style Guide':'📋', 'Accessibility':'♿', 'UX Expert':'👁' }[item.category] ?? '';
    const ruleKey = item.rule.match(/^([A-Z]+-\d+)/)?.[1] ?? '';
    const fix = (RULE_SUGGESTIONS[ruleKey] ?? item.rule).slice(0, 80);
    md += `| ${item.impact.toUpperCase()} | ${emoji} ${item.category} | ${item.rule} | ${fix} | +${item.totalScoreGain.toFixed(1)} pts | ${item.effort} | ${item.affectedPages.length} page(s) |\n`;
  }
  md += `\n---\n\n## Summary\n\n| Page | Score | Grade | Load time | Top issues |\n|------|-------|-------|-----------|------------|\n`;
  for (const r of reports) {
    const load = r.loadTimeMs > 0 ? `${(r.loadTimeMs/1000).toFixed(1)}s` : '—';
    const top = r.improvements.slice(0,2).map(i => i.replace(/^\[.*?\]\s*/,'')).join('<br>') || '—';
    md += `| **${r.name}** | ${r.score}/100 | ${r.grade} | ${load} | ${top} |\n`;
  }
  md += `\n---\n\n## Per-page details\n\n`;
  for (const r of reports) {
    md += `### ${r.name} — ${r.score}/100 (${r.grade})\n\n`;
    if (r.loadingNote) md += `> ⚠️ ${r.loadingNote}\n\n`;
    md += `> **Panel:** ${r.panelNote}\n\n`;
    for (const cat of ['Style Guide','Accessibility','UX Expert']) {
      const catF = r.findings.filter(f => f.category === cat);
      if (!catF.length) continue;
      const hdr = {'Style Guide':'📋 Style Guide','Accessibility':'♿ Accessibility (WCAG)','UX Expert':'👁 UX Expert'}[cat];
      md += `#### ${hdr}\n\n| Rule | Result | Detail |\n|------|--------|--------|\n`;
      for (const fi of catF) {
        const icon = {pass:'✅',warn:'⚠️',fail:'❌',skip:'⏭'}[fi.status];
        md += `| ${fi.rule} | ${icon} | ${fi.detail.replace(/\n/g,'<br>')} |\n`;
      }
      md += '\n';
    }
    if (r.improvements.length > 0) {
      md += `#### Issues to fix (by priority)\n\n`;
      r.improvements.forEach((item, i) => { md += `${i+1}. ${item.replace(/\n/g,'\n   ')}\n`; });
    }
    md += `\n---\n\n`;
  }
  return md;
}

// ── HTML report ────────────────────────────────────────────────────────────────

function buildHtmlReport(reports: FullReport[], avg: number, avgGrade: string, plan: ImprovementItem[]): string {
  const gc = (g: string) => ({'A':'#2E7D32','B':'#388E3C','C':'#F57F17','D':'#E65100','F':'#B71C1C'}[g] ?? '#666');
  const catTag = (cat: string) => {
    const s: Record<string,string> = {'Style Guide':'background:#E53935','Accessibility':'background:#6A1B9A','UX Expert':'background:#1565C0'};
    const e: Record<string,string> = {'Style Guide':'📋','Accessibility':'♿','UX Expert':'👁'};
    return `<span style="${s[cat]??''};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${e[cat]??''} ${cat}</span>`;
  };
  // Plain version for the annotation key table (# badge already provides the colour)
  const catPlain = (cat: string) => {
    const e: Record<string,string> = {'Style Guide':'📋','Accessibility':'♿','UX Expert':'👁'};
    const c: Record<string,string> = {'Style Guide':'#B71C1C','Accessibility':'#4A148C','UX Expert':'#0D47A1'};
    return `<span style="font-size:12px;font-weight:600;color:${c[cat]??'#333'}">${e[cat]??''} ${cat}</span>`;
  };
  const imp = (i: string) => { const c: Record<string,string> = {critical:'#B71C1C',high:'#E53935',medium:'#FB8C00',low:'#888'}; return `<b style="font-size:10px;text-transform:uppercase;color:${c[i]??'#888'}">${i}</b>`; };
  const si = (s: string) => ({pass:'✅',warn:'⚠️',fail:'❌',skip:'⏭'}[s] ?? '');

  const CSS = `*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f8;color:#1a1a2e;margin:0;padding:0}
.bar{background:#1a1a2e;color:#fff;padding:16px 32px}.bar h1{margin:0;font-size:18px;font-weight:400}.bar p{margin:4px 0 0;font-size:12px;color:#90caf9}
.scores{display:flex;align-items:center;gap:20px;background:#fff;border-bottom:3px solid #1a1a2e;padding:16px 32px}
.sc{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column}
.legend{display:flex;gap:16px;flex-wrap:wrap;padding:10px 32px;background:#fff;border-bottom:1px solid #e0e0e0;font-size:12px}
.legend span{display:flex;align-items:center;gap:5px}.legend b{width:12px;height:12px;border-radius:2px;display:inline-block}
.wrap{max-width:1400px;margin:0 auto;padding:20px 32px}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);margin-bottom:28px;overflow:hidden}
.card-hdr{padding:12px 18px;display:flex;align-items:center;gap:14px;background:#1a1a2e;color:#fff}
.card-hdr h2{margin:0;font-size:15px;font-weight:600}.card-body{padding:18px}
.shots{display:flex;gap:14px;margin-bottom:16px;flex-wrap:wrap}
.shot-wrap{flex:1 1 400px}.shot-wrap img{width:100%;border:1px solid #e0e0e0;border-radius:4px}
.shot-wrap .cap{font-size:11px;color:#666;margin-top:3px;text-align:center}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 16px}
th{background:#f5f5f5;padding:8px 10px;text-align:left;border:1px solid #e0e0e0;font-weight:600}
td{padding:8px 10px;border:1px solid #e0e0e0;vertical-align:top;word-break:break-word}
tr:nth-child(even){background:#fafafa}
.nb{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;color:#fff;font-weight:700;font-size:10px}
.sec{font-size:13px;font-weight:700;margin:14px 0 4px;color:#333}
.plan-hdr{background:#0d47a1;color:#fff;padding:12px 18px}.plan-hdr h2{margin:0;font-size:15px}.plan-hdr p{margin:4px 0 0;font-size:12px;color:#90caf9}
.targets{display:flex;gap:10px;padding:12px 18px;background:#e8f4fd;flex-wrap:wrap}
.target{padding:6px 12px;border-radius:6px;background:#fff;border:1px solid #bbdefb;font-size:12px}
.eL{background:#E8F5E9;color:#2E7D32;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700}
.eM{background:#FFF3E0;color:#E65100;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700}
.eH{background:#FCE4EC;color:#B71C1C;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700}
.note{background:#FFF8E1;border-left:4px solid #FB8C00;padding:8px 12px;border-radius:0 4px 4px 0;font-size:12px;margin-bottom:10px}`;

  let h = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>DataMiner ${APP_NAME} — UX Audit</title><style>${CSS}</style></head><body>`;
  h += `<div class="bar"><h1>DataMiner ${APP_NAME} LCA — UX &amp; Style Audit</h1><p>Generated: ${new Date().toLocaleString()} · ${reports.length} pages audited</p></div>`;
  h += `<div class="scores"><div class="sc" style="background:${gc(avgGrade)}"><span style="color:#fff;font-size:20px;font-weight:700">${avg}</span><span style="color:#fff;font-size:12px">${avgGrade}</span></div>`;
  h += `<div><div style="font-size:18px;font-weight:600">Overall Score: ${avg}/100 — Grade ${avgGrade}</div>`;
  h += `<div style="font-size:12px;color:#666;margin-top:3px">${reports.map(r=>`${r.name}: <b>${r.score}</b>`).join(' · ')}</div></div></div>`;
  h += `<div class="legend"><strong>Annotation colours:</strong>`;
  h += `<span><b style="background:#E53935"></b>📋 Style Guide — your defined rules</span>`;
  h += `<span><b style="background:#6A1B9A"></b>♿ Accessibility — WCAG standard</span>`;
  h += `<span><b style="background:#1565C0"></b>👁 UX Expert — reviewer observations</span></div>`;
  h += `<div class="wrap">`;

  // Improvement plan card
  h += `<div class="card"><div class="plan-hdr"><h2>🚀 How to improve your score</h2><p>Current: ${avg}/100 (${avgGrade}). Items sorted by score impact — fix the top ones first.</p></div>`;
  const grades = [{g:'A',m:90},{g:'B',m:75},{g:'C',m:60},{g:'D',m:40}].filter(t => t.m > avg);
  if (grades.length) {
    h += `<div class="targets">`;
    for (const t of grades) h += `<div class="target"><b>Grade ${t.g} (${t.m}+)</b> — need +${t.m-avg} pts. Fix the top ${Math.ceil((t.m-avg)/3)} rows below.</div>`;
    h += `</div>`;
  }
  h += `<table><thead><tr><th>Type</th><th>Priority</th><th>Rule</th><th>What to do</th><th style="white-space:nowrap">Score gain</th><th>Effort</th><th>Pages</th></tr></thead><tbody>`;
  for (const item of plan) {
    const rk = item.rule.match(/^([A-Z]+-\d+)/)?.[1] ?? '';
    const fix = (RULE_SUGGESTIONS[rk] ?? item.rule).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const efClass = item.effort === 'Low' ? 'eL' : item.effort === 'Medium' ? 'eM' : 'eH';
    h += `<tr><td>${catPlain(item.category)}</td><td>${imp(item.impact)}</td><td style="font-weight:600;font-size:12px">${item.rule}</td>`;
    h += `<td style="font-size:12px">${fix}</td><td style="text-align:center;font-weight:700;color:#2E7D32">+${item.totalScoreGain.toFixed(1)}</td>`;
    h += `<td><span class="${efClass}">${item.effort}</span></td><td style="font-size:11px;color:#666">${item.affectedPages.join(', ')}</td></tr>`;
  }
  h += `</tbody></table></div>`;

  // Per-page cards
  for (const r of reports) {
    const cl = path.relative(REPORT, r.cleanShot).replace(/\\/g,'/');
    const al = path.relative(REPORT, r.annotatedShot).replace(/\\/g,'/');
    h += `<div class="card"><div class="card-hdr"><h2>${r.name}</h2>`;
    h += `<div style="background:${gc(r.grade)};color:#fff;padding:3px 10px;border-radius:4px;font-weight:700">${r.score}/100 — ${r.grade}</div>`;
    h += `<div style="margin-left:auto;font-size:11px;color:#90caf9">⏱ ${(r.loadTimeMs/1000).toFixed(1)}s (cached)</div></div>`;
    h += `<div class="card-body">`;
    if (r.loadingNote) h += `<div class="note">${r.loadingNote}</div>`;

    h += `<div class="shots">`;
    h += `<div class="shot-wrap"><img src="${cl}" alt="${r.name}"><div class="cap">Clean view</div></div>`;
    h += `<div class="shot-wrap"><img src="${al}" alt="${r.name} annotated"><div class="cap">Annotated — each numbered box is explained in the table below</div></div>`;
    h += `</div>`;

    // Annotation key table
    if (r.annotations.length > 0) {
      h += `<div class="sec">🔍 Annotation key — what each numbered box means and how to fix it</div>`;
      h += `<table><thead><tr><th style="width:36px">#</th><th style="width:110px">Type</th><th style="width:70px">Priority</th><th style="width:180px">Finding</th><th>What to change</th></tr></thead><tbody>`;
      for (const a of r.annotations) {
        h += `<tr><td><span class="nb" style="background:${a.color}">${a.num}</span></td>`;
        h += `<td>${catPlain(a.category)}</td><td>${imp(a.impact)}</td>`;
        h += `<td style="font-size:11px">${a.label.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`;
        h += `<td style="font-size:12px">${a.suggestion.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>`;
      }
      h += `</tbody></table>`;
    }

    // Findings tables per category
    for (const cat of ['Style Guide','Accessibility','UX Expert']) {
      const catF = r.findings.filter(f => f.category === cat);
      if (!catF.length) continue;
      const hdr: Record<string,string> = {'Style Guide':'📋 Style Guide checks','Accessibility':'♿ Accessibility (WCAG)','UX Expert':'👁 UX Expert observations'};
      h += `<div class="sec">${hdr[cat]}</div><table><thead><tr><th>Rule</th><th style="width:50px">Result</th><th>Detail</th></tr></thead><tbody>`;
      for (const fi of catF) {
        const rb = fi.status === 'fail' ? 'background:#FFF8F8' : fi.status === 'warn' ? 'background:#FFFDF0' : '';
        h += `<tr style="${rb}"><td>${fi.rule}</td><td style="text-align:center">${si(fi.status)}</td>`;
        h += `<td style="white-space:pre-wrap">${fi.detail.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>`;
      }
      h += `</tbody></table>`;
    }
    h += `</div></div>`;
  }
  h += `</div></body></html>`;
  return h;
}
