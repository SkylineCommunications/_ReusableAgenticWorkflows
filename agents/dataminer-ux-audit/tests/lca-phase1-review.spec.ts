/**
 * lca-phase1-review.spec.ts
 *
 * Phase 1 UX Review: single DataMiner LCA page.
 *
 * Produces one HTML report containing:
 *  • Executive summary (plain language, for the Product Owner)
 *  • Clean screenshot  (the page as-is)
 *  • Annotated screenshot  (numbered findings boxes)
 *  • Annotation key table  (finding + action + impact per box)
 *  • Before / After mockup  (side-by-side with CSS-injected improvements)
 *  • Full findings table  (all checks, pass and fail)
 *
 * Usage:
 *   $env:AUDIT_APP_URL  = "https://ziine-ziine.on.dataminer.services/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview"
 *   $env:AUDIT_APP_NAME = "Facility Manager"
 *   npx playwright test tests/lca-phase1-review.spec.ts --project=dataminer
 *
 * Output: results/phase1/report.html
 */

import { test, Page } from '@playwright/test';
import * as path from 'path';
import * as fs   from 'fs';
import { rgbStringToHex, contrastRatio, calculateScore, gradeFromScore, type AuditFinding } from './ux-audit-helpers';

// ── Config ────────────────────────────────────────────────────────────────────

const PAGE_URL  = process.env.AUDIT_APP_URL  ?? 'https://ziine-ziine.on.dataminer.services/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview';
const APP_NAME  = process.env.AUDIT_APP_NAME ?? 'Facility Manager';
const OUT_DIR   = path.join(__dirname, '..', 'results', 'phase1');

const WCAG_ENABLED = false;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Annotation {
  bbox:       { x: number; y: number; width: number; height: number };
  label:      string;
  suggestion: string;
  category:   string;
  rule:       string;
  impact:     string;
  color:      string;
  num:        number;
}

// ── Wait helpers ──────────────────────────────────────────────────────────────

async function waitForPageReady(page: Page): Promise<{ loadTimeMs: number; loadingNote: string | null }> {
  const t0 = Date.now();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
  try {
    await page.waitForFunction(() => {
      const visible = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return ![ ...Array.from(document.querySelectorAll('dma-spinner')),
                ...Array.from(document.querySelectorAll('[aria-busy="true"]')) ].some(visible);
    }, { timeout: 20_000 });
  } catch { /* charts still loading — continue */ }
  await page.waitForTimeout(1500);
  const ms = Date.now() - t0;
  const note = ms > 10_000
    ? `⚠️ Page took ${(ms / 1000).toFixed(1)}s to load (measured live). Users will experience this as slow.`
    : ms > 5_000
      ? `⏱️ Page took ${(ms / 1000).toFixed(1)}s to load.`
      : null;
  return { loadTimeMs: ms, loadingNote: note };
}

// ── Annotation helpers ────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  'Style Guide':   '#C62828',
  'Accessibility': '#6A1B9A',
  'UX Expert':     '#1565C0',
};

async function injectAnnotations(page: Page, annotations: Annotation[]) {
  await page.evaluate((items) => {
    for (const a of items) {
      const wrap = document.createElement('div');
      wrap.className = '__ux-annotation';
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
      ].join(';');
      badge.textContent = `${a.num}. ${a.label}`;
      wrap.appendChild(badge);
      document.body.appendChild(wrap);
    }
  }, annotations);
}

async function removeAnnotations(page: Page) {
  await page.evaluate(() => document.querySelectorAll('.__ux-annotation').forEach(el => el.remove()));
}

// ── Audit checks ──────────────────────────────────────────────────────────────

async function runAuditChecks(page: Page): Promise<{ findings: AuditFinding[]; annotations: Annotation[] }> {
  const findings: AuditFinding[] = [];
  const annotations: Annotation[] = [];
  let annNum = 1;

  const ann = (bbox: Annotation['bbox'] | null, label: string, suggestion: string, impact: string, category: string, rule: string) => {
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;
    const baseColor = CATEGORY_COLOR[category] ?? CATEGORY_COLOR['UX Expert'];
    annotations.push({ bbox, label, suggestion, category, rule, impact, color: baseColor, num: annNum++ });
  };

  // ── Style Guide checks ────────────────────────────────────────────────────

  // SG-01 Font family
  const font = await page.$eval('body', el => getComputedStyle(el).fontFamily).catch(() => '');
  findings.push({ category: 'Style Guide', rule: 'SG-01 Segoe UI font', impact: 'medium',
    status: font.includes('Segoe UI') ? 'pass' : 'fail',
    detail: font.includes('Segoe UI') ? 'OK' : `Body font is "${font.slice(0, 60)}" — expected Segoe UI` });

  // SG-06 VIN/ID columns
  const idColHeaders = page.locator('[role="columnheader"], th').filter({ hasText: /^(VIN|ID|GUID|UUID)$/i });
  const idCount = await idColHeaders.count();
  if (idCount > 0) {
    const details: string[] = [];
    for (let i = 0; i < idCount; i++) {
      const col = idColHeaders.nth(i);
      const text = (await col.textContent() ?? '').trim();
      details.push(`Column "${text}"`);
      ann(await col.boundingBox(), `SG-06: Hide "${text}" column`,
        `Open the table component settings and hide the "${text}" column. Raw identifiers are internal database keys — end users should never see them.`,
        'high', 'Style Guide', 'SG-06');
    }
    findings.push({ category: 'Style Guide', rule: 'SG-06 No raw ID columns', impact: 'high', status: 'fail', detail: details.join('; ') });
  } else {
    findings.push({ category: 'Style Guide', rule: 'SG-06 No raw ID columns', impact: 'high', status: 'pass', detail: 'OK' });
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
        const title = header?.textContent?.trim() ?? null;
        return { index: i + 1, hasHeader: !!header, title, bbox: { x: r.left, y: r.top, width: r.width, height: r.height } };
      })
  );
  if (compData.length > 0) {
    const noHeader = compData.filter(c => !c.hasHeader);
    findings.push({ category: 'Style Guide', rule: 'SG-08 All components have a title', impact: 'medium',
      status: noHeader.length === 0 ? 'pass' : noHeader.length < compData.length ? 'warn' : 'fail',
      detail: noHeader.length === 0 ? 'OK'
        : `${noHeader.length}/${compData.length} components missing title` });
    for (const c of noHeader)
      ann(c.bbox, `SG-08: Add a title to widget #${c.index}`,
        `In the LCA editor: select this component → Layout panel → enable "Show header" → add a descriptive title. Every widget needs a title so users know what they are looking at.`,
        'medium', 'Style Guide', 'SG-08');
  }

  // SG-09 Button icons
  const allBtns = await page.locator('dma-button:visible').all();
  if (allBtns.length > 0) {
    const noIconBtns: string[] = [];
    for (const b of allBtns.slice(0, 15)) {
      if (await b.locator('dma-icon,[class*="ms-Icon"],svg').count() === 0) {
        const lbl = (await b.textContent() ?? '').trim().slice(0, 25);
        noIconBtns.push(`"${lbl}"`);
        ann(await b.boundingBox(), 'SG-09: Add an icon to this button',
          `In the button settings, assign a Fluent/Segoe icon. Buttons with icons are faster to scan and visually richer.`,
          'low', 'Style Guide', 'SG-09');
      }
    }
    findings.push({ category: 'Style Guide', rule: 'SG-09 Buttons include an icon', impact: 'low',
      status: noIconBtns.length === 0 ? 'pass' : noIconBtns.length <= 2 ? 'warn' : 'fail',
      detail: noIconBtns.length === 0 ? 'OK' : `Buttons without icon: ${noIconBtns.join(', ')}` });
  }

  // SG-12 WCAG AA contrast (always run, informational)
  const textEls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('p,span,h1,h2,h3,h4,td,li,label,button'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (el.textContent?.trim().length ?? 0) > 1; })
      .slice(0, 80)
      .map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const bgAlpha = parseFloat(cs.backgroundColor.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1] ?? '1');
        return { tag: el.tagName.toLowerCase(), text: el.textContent?.trim().slice(0, 30) ?? '',
          fg: cs.color, bg: cs.backgroundColor, bgAlpha, size: cs.fontSize,
          bold: parseInt(cs.fontWeight) >= 700,
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
      contrastFails.push(`<${e.tag}> "${e.text}" — ${ratio.toFixed(1)}:1 (needs ${thresh}:1)`);
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        ann(e.bbox, `Contrast ${ratio.toFixed(1)}:1 (needs ${thresh}:1)`,
          `Text ${e.fg} on background ${e.bg} has insufficient contrast. Darken the text or lighten the background. Check at https://webaim.org/resources/contrastchecker/`,
          'high', 'Style Guide', 'SG-12');
      }
    }
  }
  findings.push({ category: 'Style Guide', rule: 'SG-12 WCAG AA contrast ≥4.5:1', impact: 'high',
    status: contrastFails.length === 0 ? 'pass' : contrastFails.length <= 2 ? 'warn' : 'fail',
    detail: contrastFails.length === 0 ? 'OK' : contrastFails.slice(0, 5).join('\n') });

  // ── UX Expert checks ──────────────────────────────────────────────────────

  // UX-02 Component density
  const compCount = await page.evaluate(() => {
    const vh = window.innerHeight;
    return Array.from(document.querySelectorAll('dma-db-component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.top < vh && r.bottom > 0 && r.width > 50; }).length;
  });
  findings.push({ category: 'UX Expert', rule: 'UX-02 Page density (widgets above fold)', impact: 'medium',
    status: compCount <= 7 ? 'pass' : compCount <= 11 ? 'warn' : 'fail',
    detail: compCount <= 7 ? `OK — ${compCount} widgets above fold`
      : `${compCount} widgets visible at once (target ≤7). Consider grouping related widgets into tabs or collapsible sections.` });

  // UX-03 Spacing between widgets
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
    return { min: gaps.length ? Math.min(...gaps) : 99, avg: gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0, n: gaps.length };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-03 Consistent spacing between widgets', impact: 'low',
    status: spacingData.n === 0 || spacingData.min >= 12 ? 'pass' : spacingData.min >= 6 ? 'warn' : 'fail',
    detail: spacingData.min >= 12 || spacingData.n === 0 ? `OK — avg gutter ${spacingData.avg}px`
      : `Min gap between widgets is ${spacingData.min}px. Use a consistent 16–24px gutter.` });

  // UX-04 Card elevation (box-shadow)
  const shadowData = await page.evaluate(() => {
    const comps = Array.from(document.querySelectorAll('dma-db-component, .component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 100 && r.height > 80; });
    const withShadow = comps.filter(c => { const s = getComputedStyle(c).boxShadow; return !!s && s !== 'none'; }).length;
    const first = comps[0] as HTMLElement | undefined;
    const r = first?.getBoundingClientRect();
    return { total: comps.length, withShadow, firstBbox: r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-04 Card elevation (box-shadow on widgets)', impact: 'medium',
    status: shadowData.withShadow > 0 ? 'pass' : shadowData.total === 0 ? 'skip' : 'fail',
    detail: shadowData.withShadow > 0 ? `OK — ${shadowData.withShadow}/${shadowData.total} widgets have box-shadow`
      : `None of the ${shadowData.total} widgets have box-shadow. Flat cards on a flat background is the most common sign of an outdated enterprise UI. Add "0 2px 8px rgba(0,0,0,0.15)" to the widget card in the LCA theme.` });
  if (shadowData.total > 0 && shadowData.withShadow === 0 && shadowData.firstBbox)
    ann(shadowData.firstBbox, 'UX-04: No elevation — add box-shadow',
      'In the LCA theme editor, add box-shadow to dma-db-component. Even "0 2px 8px rgba(0,0,0,0.12)" makes cards "lift" off the canvas — a foundational modern UI pattern with zero layout cost.',
      'medium', 'UX Expert', 'UX-04');

  // UX-05 Rounded corners
  const radiusData = await page.evaluate(() => {
    const comps = Array.from(document.querySelectorAll('dma-db-component, .component'))
      .filter(c => { const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 50 && r.height > 50; });
    const withRadius = comps.filter(c => parseFloat(getComputedStyle(c).borderRadius) > 0).length;
    const first = comps[0] as HTMLElement | undefined;
    const r = first?.getBoundingClientRect();
    return { total: comps.length, withRadius, firstBbox: r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-05 Rounded corners on widget cards', impact: 'low',
    status: radiusData.total === 0 ? 'skip' : radiusData.withRadius / (radiusData.total || 1) > 0.5 ? 'pass' : radiusData.withRadius > 0 ? 'warn' : 'fail',
    detail: radiusData.withRadius === 0 && radiusData.total > 0
      ? `All ${radiusData.total} widget cards have square corners (border-radius: 0). Square corners are associated with pre-2015 enterprise UIs. Apply a 6–12px radius in the LCA theme.`
      : `${radiusData.withRadius}/${radiusData.total} widget cards use rounded corners` });
  if (radiusData.total > 0 && radiusData.withRadius === 0 && radiusData.firstBbox)
    ann(radiusData.firstBbox, 'UX-05: Square corners — apply border-radius',
      'In the LCA theme editor, set border-radius: 8px on dma-db-component. Rounded corners are one of the quickest, highest-impact visual improvements — one CSS property, zero structural change.',
      'low', 'UX Expert', 'UX-05');

  // UX-06 Primary CTA button
  const ctaData = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('dma-button, button'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const primary = btns.filter(el => {
      const bg = getComputedStyle(el).backgroundColor;
      const rgb = bg.match(/\d+/g)?.map(Number) ?? [];
      if (rgb.length < 3) return false;
      const [r2, g2, b2] = rgb;
      return Math.max(r2, g2, b2) - Math.min(r2, g2, b2) > 30 && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
    });
    const first = btns[0] as HTMLElement | undefined;
    const r = first?.getBoundingClientRect();
    return { total: btns.length, primaryCount: primary.length, firstBbox: r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null };
  });
  if (ctaData.total > 0) {
    findings.push({ category: 'UX Expert', rule: 'UX-06 Primary CTA is visually distinct', impact: 'medium',
      status: ctaData.primaryCount >= 1 ? 'pass' : 'fail',
      detail: ctaData.primaryCount >= 1 ? `OK — ${ctaData.primaryCount} button(s) have a filled colour`
        : `All ${ctaData.total} buttons appear flat/grey — no visual hierarchy. Designate the main action as "Primary" in button settings to apply the accent colour.` });
    if (ctaData.primaryCount === 0 && ctaData.firstBbox)
      ann(ctaData.firstBbox, 'UX-06: No primary CTA button',
        'In button settings → set Variant to "Primary". This applies the accent colour and makes the most important action immediately obvious without reading every label.',
        'medium', 'UX Expert', 'UX-06');
  }

  // UX-07 Status chips vs plain text
  const statusData = await page.evaluate(() => {
    const STATUS_RE = /^(active|inactive|error|ok|warning|critical|online|offline|pending|running|stopped|failed|success|idle|busy|in service|out of service)$/i;
    const rows = Array.from(document.querySelectorAll('[role="row"]:not([class*="header"])'));
    if (!rows.length) return { hasRows: false, chipCount: 0, plainCount: 0, firstBbox: null as any };
    let chipCount = 0, plainCount = 0, firstPlainRect: DOMRect | null = null;
    for (const row of rows.slice(0, 20)) {
      for (const cell of Array.from(row.querySelectorAll('td,[role="cell"]'))) {
        const txt = (cell.textContent?.trim() ?? '').split(/\s/)[0];
        if (!STATUS_RE.test(txt)) continue;
        const child = cell.querySelector('span,div,[class*="badge"],[class*="chip"],[class*="tag"],[class*="status"]');
        const bg = child ? getComputedStyle(child).backgroundColor : 'rgba(0,0,0,0)';
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') chipCount++;
        else { plainCount++; if (!firstPlainRect) firstPlainRect = (cell as HTMLElement).getBoundingClientRect(); }
      }
    }
    return { hasRows: true, chipCount, plainCount,
      firstBbox: firstPlainRect ? { x: firstPlainRect.left, y: firstPlainRect.top, width: firstPlainRect.width, height: firstPlainRect.height } : null };
  });
  if (statusData.hasRows && (statusData.chipCount + statusData.plainCount) > 0) {
    const total = statusData.chipCount + statusData.plainCount;
    findings.push({ category: 'UX Expert', rule: 'UX-07 Status values as colored chips', impact: 'medium',
      status: statusData.chipCount >= statusData.plainCount ? 'pass' : statusData.chipCount > 0 ? 'warn' : 'fail',
      detail: statusData.chipCount >= statusData.plainCount
        ? `OK — ${statusData.chipCount}/${total} status values use colour indicators`
        : `${statusData.plainCount}/${total} status values are plain text. Wrapping them in colored chips (green=Active, red=Error, orange=Warning) is the single highest-impact visual improvement in data-heavy apps — users scan 10× faster with colour.` });
    if (statusData.plainCount > statusData.chipCount && statusData.firstBbox)
      ann(statusData.firstBbox, 'UX-07: Status as plain text — replace with colored chip',
        'In the LCA editor, wrap each status column cell in a conditional background component: Active/OK → green #2E7D32 white text; Error/Critical → red #C62828; Warning → orange #E65100; Offline/Inactive → grey #616161. Apply to every status column on every table page-wide.',
        'medium', 'UX Expert', 'UX-07');
  }

  // UX-08 Typography hierarchy
  const typoData = await page.evaluate(() => {
    const sizes = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,td,span,label'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 0 && (el.textContent?.trim().length ?? 0) > 2; })
      .map(el => parseFloat(getComputedStyle(el).fontSize))
      .filter(s => !isNaN(s) && s > 0);
    const unique = [...new Set(sizes)].sort((a, b) => b - a);
    return { unique: unique.slice(0, 8), count: unique.length };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-08 Typography hierarchy (≥3 font sizes)', impact: 'low',
    status: typoData.count >= 3 && typoData.count <= 6 ? 'pass' : typoData.count < 3 ? 'fail' : 'warn',
    detail: typoData.count < 3
      ? `Only ${typoData.count} font size(s): ${typoData.unique.join(', ')}px. Needs at least 3 levels: headline (~24px), body (~14px), label/meta (~11px).`
      : `${typoData.count} sizes: ${typoData.unique.join(', ')}px` });

  // UX-09 Data visualisation variety
  const vizData = await page.evaluate(() => {
    const hasChart = document.querySelectorAll('dma-chart,canvas:not([class*="map"]),dma-generic-pie-chart,dma-generic-bar-chart,dma-bar-chart,dma-pie-chart').length > 0;
    const hasMap   = document.querySelectorAll('iframe,dma-map').length > 0;
    const hasKpi   = Array.from(document.querySelectorAll('dma-db-component')).some(c => {
      const r = (c as HTMLElement).getBoundingClientRect(); return r.width > 40 && r.width < 350 && r.height > 40 && r.height < 200;
    });
    const hasTable = document.querySelectorAll('dma-generic-grid,dma-grid').length > 0;
    const types = [hasChart && 'chart', hasMap && 'map', hasKpi && 'KPI tile', hasTable && 'table'].filter(Boolean);
    return { types, onlyTable: hasTable && !hasChart && !hasKpi };
  });
  findings.push({ category: 'UX Expert', rule: 'UX-09 Data visualisation variety', impact: 'low',
    status: !vizData.onlyTable ? 'pass' : 'warn',
    detail: vizData.onlyTable
      ? 'Only tables — no charts or KPI tiles. Tables require row-by-row reading; a KPI summary strip lets users understand state at a glance.'
      : `OK — visualisation mix: ${vizData.types.join(', ')}` });

  return { findings, annotations };
}

// ── CSS/JS mockup improvements (frontend-design skill: "Precision Instrument") ─
//
// Aesthetic direction: PRECISION INSTRUMENT
// This is operations software for engineers managing physical infrastructure.
// Every design decision must communicate: authoritative, data-forward, unambiguous.
//
// Commitments (from frontend-design skill):
//  1. ONE accent — #E65100 warm orange. Already the app's character. Own it fully.
//     No purple, no blue, no competing hues. One colour = intentional language.
//  2. Numbers are the hero. KPI values: largest, heaviest, tightest tracking.
//     Labels recede. The number is the signal; the label is the footnote.
//  3. Panels have mass. Deep shadow, no outline, no radius exaggeration.
//     Weight comes from shadow depth, not decorative borders.
//  4. Bar charts: ONE colour per chart — uniform bars show magnitude clearly.
//     Colour variation in a bar chart is visual noise, not information.
//  5. Pie charts: monochromatic warm family (same hue, varied lightness/saturation).
//     Cohesive, not a random rainbow.
//  6. Typography: explicit hierarchy — number >> label. Flat type = no hierarchy.
//
async function injectMockupImprovements(page: Page): Promise<void> {
  const ACCENT = '#E65100';

  // Pass A — CSS
  await page.addStyleTag({ content: `
    /* PANELS: mass via shadow, no decorative chrome */
    .component {
      box-shadow: 0 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.40) !important;
      overflow: hidden !important;
    }

    /* KPI VALUES: unmissable — bold, tight, white */
    dma-generic-state .value,
    dma-generic-state [class*="value"],
    dma-fit-text {
      font-weight: 800 !important;
      letter-spacing: -0.03em !important;
      color: #FFFFFF !important;
    }

    /* KPI LABELS: recede — small, muted, uppercase */
    dma-generic-state .label,
    dma-generic-state [class*="sub-label"],
    dma-generic-state [class*="unit"],
    dma-generic-state small {
      font-size: 9px !important;
      font-weight: 500 !important;
      letter-spacing: 0.10em !important;
      text-transform: uppercase !important;
      opacity: 0.45 !important;
    }

    /* PANEL TITLES: confident, not dominant */
    dma-db-component-header .title,
    dma-db-component-header [class*="title"],
    dma-db-component-header span:not([class*="icon"]):not(i) {
      font-weight: 600 !important;
      letter-spacing: 0.02em !important;
      font-size: 12px !important;
    }

    /* TABLE HEADERS: structural guide — muted, uppercase */
    [role="columnheader"], th {
      opacity: 0.45 !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
    }

    /* BUTTONS: minimal rounding — a precision tool, not a consumer app */
    dma-button button, button.dma-button {
      border-radius: 3px !important;
    }
  ` });

  // Pass B — JS (bypasses Angular encapsulation, handles SVG colour directly)
  await page.evaluate((accent: string) => {
    // 1. Panel shadow — direct override
    document.querySelectorAll('.component').forEach((el: any) => {
      el.style.setProperty('box-shadow',
        '0 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.40)', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
    });

    // 1b. KPI values — force white + bold on all large-font elements
    //     DataMiner's Angular encapsulation means CSS selectors may not penetrate.
    //     We apply via JS inline styles as a guaranteed override.
    document.querySelectorAll('dma-generic-state, dma-state-v2').forEach((comp: any) => {
      comp.querySelectorAll('*').forEach((el: any) => {
        const cs = window.getComputedStyle(el);
        const fs = parseFloat(cs.fontSize);
        if (fs >= 20) {
          // Big numbers — hero treatment
          el.style.setProperty('color', '#FFFFFF', 'important');
          el.style.setProperty('font-weight', '800', 'important');
          el.style.setProperty('letter-spacing', '-0.03em', 'important');
        } else if (fs >= 8 && fs <= 13) {
          // Labels — recede
          el.style.setProperty('color', 'rgba(255,255,255,0.45)', 'important');
          el.style.setProperty('font-weight', '500', 'important');
          el.style.setProperty('letter-spacing', '0.08em', 'important');
          el.style.setProperty('text-transform', 'uppercase', 'important');
        }
      });
    });
    // Also hit dma-fit-text directly — pierce shadow DOM if present
    document.querySelectorAll('dma-fit-text').forEach((el: any) => {
      el.style.setProperty('color', '#FFFFFF', 'important');
      el.style.setProperty('font-weight', '800', 'important');
      // Check for shadow root (Angular ViewEncapsulation.ShadowDom)
      const root = el.shadowRoot ?? el;
      root.querySelectorAll('*').forEach((child: any) => {
        child.style.setProperty('color', '#FFFFFF', 'important');
        child.style.setProperty('font-weight', '800', 'important');
      });
    });
    // Catch-all: walk the full DOM and force white on any large scaled text
    // DataMiner applies CSS transform:scale to fit numbers — fontSize may read as small
    // even though visually large. So target parent containers instead.
    document.querySelectorAll('dma-generic-state, dma-state-v2, dma-state').forEach((comp: any) => {
      // Force white on ALL text nodes in state/KPI components
      const all = comp.querySelectorAll('*');
      all.forEach((el: any) => {
        // Skip icons
        if (el.tagName.toLowerCase().startsWith('mat-icon') || el.classList.contains('icon')) return;
        el.style.setProperty('color', '#FFFFFF', 'important');
      });
      // Find spans directly containing text (the scaled number) 
      all.forEach((el: any) => {
        const cs = window.getComputedStyle(el);
        const fs = parseFloat(cs.fontSize);
        if (fs >= 18) {
          el.style.setProperty('font-weight', '800', 'important');
          el.style.setProperty('letter-spacing', '-0.03em', 'important');
        }
      });
    });

    // 2. Pie charts — monochromatic warm family (same hue, varied lightness)
    //    Coherent palette = designed. Rainbow = default.
    const PIE_FAMILY = ['#E65100', '#BF360C', '#FF8A50', '#FF6D00', '#FFAB40'];
    let pi = 0;
    document.querySelectorAll(
      'dma-generic-pie-chart svg path, dma-pie-chart svg path'
    ).forEach((p: any) => {
      const fill = (p.getAttribute('fill') ?? '').toLowerCase();
      if (!fill || fill === 'none' || fill === 'transparent'
          || fill === '#fff' || fill === '#ffffff'
          || fill === '#000' || fill === '#000000') return;
      const c = PIE_FAMILY[pi++ % PIE_FAMILY.length];
      p.setAttribute('fill', c);
      (p as any).style.setProperty('fill', c, 'important');
    });

    // 3. Bar charts — ONE colour per chart, full accent saturation
    //    Uniform bars make the height difference the only signal.
    //    That is the correct signal for a bar chart.
    document.querySelectorAll('dma-generic-bar-chart, dma-bar-chart').forEach((chart: any) => {
      chart.querySelectorAll('svg rect, svg path').forEach((s: any) => {
        const fill = (s.getAttribute('fill') ?? '').toLowerCase();
        if (!fill || fill === 'none' || fill === 'transparent'
            || fill === '#fff' || fill === '#ffffff'
            || fill === '#000' || fill === '#000000') return;
        s.setAttribute('fill', accent);
        (s as any).style.setProperty('fill', accent, 'important');
      });
    });

    // 4. Status chips — colour replaces plain text
    //    Semantic colour system must be cross-solution consistent.
    //    Square pill (border-radius: 3px) matches the precision instrument aesthetic.
    const STATUS: Record<string, { bg: string; fg: string }> = {
      'active':         { bg: 'rgba(27,94,32,0.85)',  fg: '#A5D6A7' },
      'online':         { bg: 'rgba(27,94,32,0.85)',  fg: '#A5D6A7' },
      'running':        { bg: 'rgba(27,94,32,0.85)',  fg: '#A5D6A7' },
      'ok':             { bg: 'rgba(27,94,32,0.85)',  fg: '#A5D6A7' },
      'success':        { bg: 'rgba(27,94,32,0.85)',  fg: '#A5D6A7' },
      'in service':     { bg: 'rgba(27,94,32,0.85)',  fg: '#A5D6A7' },
      'error':          { bg: 'rgba(127,0,0,0.85)',   fg: '#EF9A9A' },
      'critical':       { bg: 'rgba(127,0,0,0.85)',   fg: '#EF9A9A' },
      'failed':         { bg: 'rgba(127,0,0,0.85)',   fg: '#EF9A9A' },
      'warning':        { bg: 'rgba(191,54,12,0.85)', fg: '#FFE0B2' },
      'major':          { bg: 'rgba(191,54,12,0.85)', fg: '#FFE0B2' },
      'pending':        { bg: 'rgba(0,77,64,0.85)',   fg: '#80CBC4' },
      'waiting':        { bg: 'rgba(0,77,64,0.85)',   fg: '#80CBC4' },
      'inactive':       { bg: 'rgba(55,71,79,0.85)',  fg: '#90A4AE' },
      'offline':        { bg: 'rgba(55,71,79,0.85)',  fg: '#90A4AE' },
      'stopped':        { bg: 'rgba(55,71,79,0.85)',  fg: '#90A4AE' },
      'out of service': { bg: 'rgba(55,71,79,0.85)',  fg: '#90A4AE' },
    };
    const STATUS_RE = new RegExp(`^(${Object.keys(STATUS).join('|')})$`, 'i');
    document.querySelectorAll('[role="row"]:not([class*="header"])').forEach(row => {
      row.querySelectorAll('td,[role="cell"]').forEach((cell: any) => {
        const txt = (cell.textContent?.trim() ?? '');
        if (!STATUS_RE.test(txt.toLowerCase()) || cell.querySelector('.__ux-chip')) return;
        const colors = STATUS[txt.toLowerCase()];
        if (!colors) return;
        const chip = document.createElement('span');
        chip.className = '__ux-chip';
        chip.textContent = txt;
        chip.style.cssText = [
          `background:${colors.bg}`, `color:${colors.fg}`,
          'padding:1px 9px', 'border-radius:3px',
          'font-size:10px', 'font-weight:700',
          'letter-spacing:0.05em', 'text-transform:uppercase',
          'display:inline-block', 'white-space:nowrap',
        ].join(';');
        cell.innerHTML = '';
        cell.appendChild(chip);
      });
    });
  }, ACCENT);

  await page.waitForTimeout(1000);
}

// ── Executive summary (plain language, for the PO) ────────────────────────────

const PLAIN_LANGUAGE: Record<string, string> = {
  'SG-01': 'The app is not using the standard Segoe UI font, creating a visual inconsistency with the rest of the product portfolio.',
  'SG-06': 'Internal database ID columns are visible to end users. These are technical identifiers that end users should never see — they create confusion and distrust.',
  'SG-07': 'Table rows are not the correct height (49px standard). Non-standard row heights make the app feel misaligned compared to other solutions.',
  'SG-08': 'Some widgets do not have a title. Without labels, users cannot understand what each panel shows.',
  'SG-09': 'Some buttons are missing icons, making it slower to find the right action at a glance.',
  'SG-12': 'Some text does not have sufficient contrast against its background, making it harder to read — especially in bright environments.',
  'UX-04': 'Widget cards sit completely flat on the page with no shadow or depth. This is the visual signature of a dated enterprise UI and makes the layout feel unfinished.',
  'UX-05': 'All widget corners are perfectly square. Rounded corners are a universal marker of modern UI design and take one CSS setting to change.',
  'UX-06': 'There is no visually prominent primary action button. Users must read every button label to decide what to click — they cannot tell which action matters most.',
  'UX-07': 'Status values (Active, Error, Warning…) are displayed as plain text. Replacing them with colored badges is the single most impactful visual improvement: users scan status 10× faster with colour than text.',
  'UX-08': 'The page uses fewer than 3 different text sizes, producing a flat typographic hierarchy that is slow to read and feels unstructured.',
  'UX-09': 'The page contains only tables — no KPI tiles or charts. Tables require row-by-row reading; a summary strip of key numbers gives users instant situational awareness.',
  'UX-02': 'Too many widgets are visible at once, creating information overload. Grouping related widgets into tabs or collapsible sections would make each view easier to understand.',
};

function buildExecSummary(findings: AuditFinding[]): string[] {
  const prioritised = findings
    .filter(f => f.status === 'fail' || f.status === 'warn')
    .sort((a, b) => {
      const w: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return (w[b.impact] ?? 0) - (w[a.impact] ?? 0);
    });
  const bullets: string[] = [];
  for (const f of prioritised) {
    if (bullets.length >= 5) break;
    const key = f.rule.match(/^([A-Z]+-\d+)/)?.[1] ?? '';
    const plain = PLAIN_LANGUAGE[key];
    if (plain) bullets.push(plain);
  }
  if (bullets.length === 0)
    bullets.push('No critical issues found — minor improvements identified. See the detailed findings below.');
  return bullets;
}

// ── HTML report ────────────────────────────────────────────────────────────────

function b64(imgPath: string): string {
  try { return `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`; }
  catch { return ''; }
}

function buildHtmlReport(opts: {
  appName: string; pageUrl: string; score: number; grade: string;
  loadTimeMs: number; loadingNote: string | null;
  findings: AuditFinding[]; annotations: Annotation[];
  cleanShot: string; annotatedShot: string; beforeShot: string; afterShot: string;
}): string {
  const { appName, pageUrl, score, grade, loadTimeMs, loadingNote,
          findings, annotations, cleanShot, annotatedShot, beforeShot, afterShot } = opts;

  const gc = (g: string) => ({'A':'#2E7D32','B':'#388E3C','C':'#F57F17','D':'#E65100','F':'#B71C1C'}[g] ?? '#666');
  const catTag = (cat: string) => {
    const bg: Record<string,string> = {'Style Guide':'#C62828','Accessibility':'#6A1B9A','UX Expert':'#1565C0'};
    const em: Record<string,string> = {'Style Guide':'📋','Accessibility':'♿','UX Expert':'👁'};
    return `<span style="background:${bg[cat]??'#333'};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${em[cat]??''} ${cat}</span>`;
  };
  const impBadge = (i: string) => {
    const c: Record<string,string> = {critical:'#B71C1C',high:'#E53935',medium:'#FB8C00',low:'#888'};
    const bg: Record<string,string> = {critical:'#FFEBEE',high:'#FFF3E0',medium:'#FFF8E1',low:'#F5F5F5'};
    return `<span style="color:${c[i]??'#888'};background:${bg[i]??'#F5F5F5'};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase">${i}</span>`;
  };
  const si = (s: string) => ({pass:'✅',warn:'⚠️',fail:'❌',skip:'⏭'}[s] ?? '');

  const execSummary = buildExecSummary(findings);
  const failCount   = findings.filter(f => f.status === 'fail').length;
  const warnCount   = findings.filter(f => f.status === 'warn').length;

  const CSS = `
*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f8;color:#1a1a2e;margin:0;padding:0}
.topbar{background:#1a1a2e;color:#fff;padding:16px 32px;display:flex;align-items:center;gap:20px}
.topbar h1{margin:0;font-size:20px;font-weight:400;flex:1}
.topbar small{font-size:11px;color:#90caf9}
.hero{display:flex;gap:0;background:#fff;border-bottom:3px solid #1a1a2e}
.hero-score{padding:24px 32px;display:flex;align-items:center;gap:16px;min-width:250px}
.circle{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;flex-shrink:0}
.exec{flex:1;padding:20px 32px;border-left:1px solid #e0e0e0;background:#FAFFFE}
.exec h2{margin:0 0 8px;font-size:14px;font-weight:700;color:#0D47A1;text-transform:uppercase;letter-spacing:0.06em}
.exec ul{margin:0;padding-left:18px}
.exec li{font-size:13px;line-height:1.7;color:#333}
.exec li+li{margin-top:4px}
.badges{display:flex;gap:10px;padding:10px 32px;background:#fff;border-bottom:1px solid #e0e0e0;flex-wrap:wrap}
.badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.wrap{max-width:1400px;margin:0 auto;padding:24px 32px}
.section{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);margin-bottom:28px;overflow:hidden}
.sec-hdr{padding:12px 18px;background:#1a1a2e;color:#fff;display:flex;align-items:center;gap:12px}
.sec-hdr h2{margin:0;font-size:15px;font-weight:600}
.sec-body{padding:18px}
.shots2{display:flex;gap:16px;flex-wrap:wrap}
.shot-box{flex:1 1 380px}
.shot-box img{width:100%;border:1px solid #e0e0e0;border-radius:6px;display:block}
.shot-box .cap{font-size:11px;color:#666;text-align:center;margin-top:4px;font-style:italic}
.mockup-row{display:flex;gap:0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-top:4px}
.mockup-side{flex:1;display:flex;flex-direction:column}
.mockup-side img{width:100%;display:block}
.mockup-label{padding:8px 14px;font-size:12px;font-weight:700;text-align:center}
.mockup-label.before{background:#FFEBEE;color:#B71C1C}
.mockup-label.after{background:#E8F5E9;color:#1B5E20}
.divider{width:4px;background:#1a1a2e}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 0}
th{background:#f5f5f5;padding:8px 10px;text-align:left;border:1px solid #e0e0e0;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em}
td{padding:8px 10px;border:1px solid #e0e0e0;vertical-align:top;word-break:break-word}
tr:nth-child(even) td{background:#fafafa}
tr.fail td{background:#FFF8F8}
tr.warn td{background:#FFFDF0}
.nb{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;color:#fff;font-weight:700;font-size:10px;flex-shrink:0}
.note{background:#FFF8E1;border-left:4px solid #FB8C00;padding:8px 12px;border-radius:0 4px 4px 0;font-size:12px;margin-bottom:12px}
.sec-label{font-size:12px;font-weight:700;margin:16px 0 4px;color:#555;text-transform:uppercase;letter-spacing:0.05em}
`;

  let h = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">`;
  h += `<title>${appName} — UX Review</title><style>${CSS}</style></head><body>`;

  // Top bar
  h += `<div class="topbar"><h1>${appName} — UX Review</h1>`;
  h += `<small>Generated: ${new Date().toLocaleString()} · <a href="${pageUrl}" style="color:#90caf9">${pageUrl}</a></small></div>`;

  // Hero: score + exec summary
  const gradeCol = gc(grade);
  h += `<div class="hero"><div class="hero-score">`;
  h += `<div class="circle" style="background:${gradeCol}"><span style="color:#fff;font-size:22px;font-weight:700">${score}</span><span style="color:#fff;font-size:13px">${grade}</span></div>`;
  h += `<div><div style="font-size:18px;font-weight:700">Score: ${score}/100</div><div style="font-size:13px;color:#666;margin-top:2px">Grade ${grade} · ${(loadTimeMs/1000).toFixed(1)}s load</div></div></div>`;
  h += `<div class="exec"><h2>🎯 Executive Summary — Key Issues</h2><ul>`;
  for (const b of execSummary) h += `<li>${b}</li>`;
  h += `</ul></div></div>`;

  // Badges
  h += `<div class="badges">`;
  h += `<span class="badge" style="background:#FFEBEE;color:#C62828">❌ ${failCount} failing</span>`;
  h += `<span class="badge" style="background:#FFF8E1;color:#E65100">⚠️ ${warnCount} warnings</span>`;
  h += `<span class="badge" style="background:#E8F5E9;color:#1B5E20">✅ ${findings.filter(f=>f.status==='pass').length} passing</span>`;
  h += `<span class="badge" style="background:#E8EAF6;color:#283593">📸 ${annotations.length} annotated findings</span>`;
  h += `</div>`;

  h += `<div class="wrap">`;

  // Section 1: Screenshots (clean + annotated)
  h += `<div class="section"><div class="sec-hdr"><h2>📸 Page Screenshots</h2></div><div class="sec-body">`;
  h += `<div class="shots2">`;
  const cSrc = b64(cleanShot);
  const aSrc = b64(annotatedShot);
  if (cSrc) h += `<div class="shot-box"><img src="${cSrc}" alt="Clean view"><div class="cap">Current state — as the user sees it today</div></div>`;
  if (aSrc) h += `<div class="shot-box"><img src="${aSrc}" alt="Annotated"><div class="cap">Annotated — numbered boxes correspond to the finding table below</div></div>`;
  h += `</div></div></div>`;

  // Section 2: Annotation key table
  if (annotations.length > 0) {
    h += `<div class="section"><div class="sec-hdr"><h2>🔍 Findings — What Each Box Means &amp; How to Fix It</h2></div><div class="sec-body">`;
    h += `<table><thead><tr><th style="width:36px">#</th><th style="width:110px">Type</th><th style="width:75px">Impact</th><th style="width:200px">Finding</th><th>What to change (action for the developer)</th></tr></thead><tbody>`;
    for (const a of annotations) {
      h += `<tr><td><span class="nb" style="background:${a.color}">${a.num}</span></td>`;
      h += `<td>${catTag(a.category)}</td><td>${impBadge(a.impact)}</td>`;
      h += `<td style="font-size:12px;font-weight:600">${a.label.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`;
      h += `<td style="font-size:12px">${a.suggestion.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>`;
    }
    h += `</tbody></table></div></div>`;
  }

  // Section 3: Before / After mockup
  const bSrc = b64(beforeShot);
  const afSrc = b64(afterShot);
  if (bSrc && afSrc) {
    h += `<div class="section"><div class="sec-hdr"><h2>🎨 Before / After — Design Mockup</h2><span style="font-size:11px;color:#90caf9;margin-left:auto">CSS-injected in-browser · not a production change</span></div>`;
    h += `<div class="sec-body">`;
    h += `<div style="background:#F3F4F6;border-radius:6px;padding:12px 16px;margin-bottom:14px;font-size:12px;line-height:1.7;color:#333">`;
    h += `<strong>Design approach:</strong> The "after" view does not add new visual elements — it refines what is already there. `;
    h += `Improvements: <b>colour cohesion</b> (chart palette harmonised to the app's warm orange/rose character), `;
    h += `<b>typographic hierarchy</b> (KPI values more dominant, labels visually recede), `;
    h += `<b>subtle depth</b> (shadow gives panels lift without adding outline chrome), and `;
    h += `<b>status chips</b> where applicable (colour replaces plain text for instant status scanning). `;
    h += `Layout, framework elements, and panel structure are unchanged.</div>`;
    h += `<div class="mockup-row">`;
    h += `<div class="mockup-side"><div class="mockup-label before">BEFORE — current state</div><img src="${bSrc}" alt="Before"></div>`;
    h += `<div class="divider"></div>`;
    h += `<div class="mockup-side"><div class="mockup-label after">AFTER — with improvements applied</div><img src="${afSrc}" alt="After"></div>`;
    h += `</div></div></div>`;
  }

  // Section 4: Design Expert Analysis (plain language, designer perspective)
  h += `<div class="section"><div class="sec-hdr" style="background:#0D3B66"><h2>🧠 Design Expert Analysis</h2><span style="font-size:11px;color:#90caf9;margin-left:auto">Beyond rule-checking — a designer's perspective</span></div><div class="sec-body">`;
  h += `<p style="font-size:13px;color:#444;margin:0 0 14px">The rule checks above tell you what is <em>technically wrong</em>. This section tells you what a UX designer would say about the <em>experience</em>.</p>`;
  const expertItems = [
    { title: 'Colour is not a strategy — it is a default', body: 'The chart colours on this page appear to be the DataMiner default palette, not a deliberate choice. When colour has no meaning, it is noise. A designed colour system would assign each semantic category its own hue (facilities by type → warm rose family; by state → a single accent for "active" vs a muted tone for everything else). Every colour on screen should earn its place.' },
    { title: 'Information hierarchy is flat', body: 'Every widget on this page has roughly the same visual weight — the pie charts, the bar charts, the KPI tiles, and the filter panel all compete equally for attention. A designed dashboard has a clear reading order: the most important information is immediately obvious (1–2 KPI numbers), secondary context follows (charts), detail is available on demand (tables and filters). A user landing on this page for the first time has no visual guide to where to look first.' },
    { title: 'The KPI row is underselling its value', body: 'The bottom row of KPI tiles (710 / 6567 / 387 / 6180) contains the most actionable numbers on the page. Yet visually they are smaller and quieter than the charts above them. In a well-designed facilities dashboard, the KPI strip would be the hero — large numbers, clear labels that step back, and consistent sizing that makes comparison instant.' },
    { title: 'Chart titles are descriptive but not helpful', body: '"Top 10 facilities with most used rack units (%)" is accurate but verbose. A designer would write "Highest Rack Utilisation" — a headline that communicates intent, not methodology. Shorter, more confident titles create a calmer, more professional feel.' },
    { title: 'The right-side filter panel disrupts visual flow', body: 'The Facility Filter panel on the right edge sits at the same visual level as the main content. Filters are a secondary utility — they help users narrow data, but they are not data themselves. A designed layout would clearly differentiate primary content from utility panels, either through visual weight reduction or a collapsible drawer pattern.' },
  ];
  for (const item of expertItems) {
    h += `<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f0f0f0">`;
    h += `<div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:4px">${item.title}</div>`;
    h += `<div style="font-size:12px;line-height:1.7;color:#444">${item.body}</div>`;
    h += `</div>`;
  }
  h += `</div></div>`;

  // Section 5: Full findings table
  h += `<div class="section"><div class="sec-hdr"><h2>📋 Full Findings</h2></div><div class="sec-body">`;
  for (const cat of ['Style Guide', 'UX Expert', 'Accessibility']) {
    const catFindings = findings.filter(f => f.category === cat);
    if (!catFindings.length) continue;
    const hdrMap: Record<string,string> = {'Style Guide':'📋 Style Guide checks','UX Expert':'👁 UX Expert observations','Accessibility':'♿ Accessibility (WCAG)'};
    h += `<div class="sec-label">${hdrMap[cat]}</div>`;
    h += `<table><thead><tr><th>Rule</th><th style="width:50px">Result</th><th>Detail / Improvement guidance</th></tr></thead><tbody>`;
    for (const fi of catFindings) {
      const trCls = fi.status === 'fail' ? 'fail' : fi.status === 'warn' ? 'warn' : '';
      h += `<tr class="${trCls}"><td style="font-weight:600;font-size:12px;white-space:nowrap">${fi.rule}</td>`;
      h += `<td style="text-align:center;font-size:16px">${si(fi.status)}</td>`;
      h += `<td style="font-size:12px;white-space:pre-wrap">${fi.detail.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>`;
    }
    h += `</tbody></table>`;
  }
  h += `</div></div>`;

  h += `</div></body></html>`;
  return h;
}

// ── Main test ─────────────────────────────────────────────────────────────────

test('Phase 1 — single page UX review', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n🌐 Loading: ${PAGE_URL}`);
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const { loadTimeMs, loadingNote } = await waitForPageReady(page);
  console.log(`✅ Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s`);
  if (loadingNote) console.log(`  ${loadingNote}`);

  // ── 1. BEFORE screenshot ─────────────────────────────────────────────────
  const beforePath = path.join(OUT_DIR, 'before.png');
  await page.screenshot({ path: beforePath, fullPage: false });
  await testInfo.attach('📸 Before (clean)', { path: beforePath, contentType: 'image/png' });
  console.log(`📸 Before: ${beforePath}`);

  // ── 2. Audit checks ──────────────────────────────────────────────────────
  console.log('\n🔍 Running audit checks...');
  const { findings, annotations } = await runAuditChecks(page);
  const score = calculateScore(findings);
  const grade = gradeFromScore(score);
  console.log(`\n  Score: ${score}/100 (${grade})`);
  for (const fi of findings.filter(f => f.status !== 'pass'))
    console.log(`  ${fi.status === 'fail' ? '❌' : '⚠️'} [${fi.category}][${fi.impact}] ${fi.rule}`);

  // ── 3. Annotated screenshot ──────────────────────────────────────────────
  const annotatedPath = path.join(OUT_DIR, 'annotated.png');
  if (annotations.length > 0) {
    await injectAnnotations(page, annotations);
    await page.screenshot({ path: annotatedPath, fullPage: false });
    await removeAnnotations(page);
  } else {
    fs.copyFileSync(beforePath, annotatedPath);
  }
  await testInfo.attach('🔍 Annotated', { path: annotatedPath, contentType: 'image/png' });
  console.log(`📸 Annotated: ${annotatedPath}`);

  // ── 4. AFTER screenshot (CSS mockup) ─────────────────────────────────────
  await injectMockupImprovements(page);
  const afterPath = path.join(OUT_DIR, 'after.png');
  await page.screenshot({ path: afterPath, fullPage: false });
  await testInfo.attach('🎨 After (mockup)', { path: afterPath, contentType: 'image/png' });
  console.log(`📸 After:  ${afterPath}`);

  // ── 5. HTML report ────────────────────────────────────────────────────────
  const reportPath = path.join(OUT_DIR, 'report.html');
  fs.writeFileSync(reportPath, buildHtmlReport({
    appName: APP_NAME, pageUrl: PAGE_URL,
    score, grade, loadTimeMs, loadingNote,
    findings, annotations,
    cleanShot: beforePath, annotatedShot: annotatedPath,
    beforeShot: beforePath, afterShot: afterPath,
  }), 'utf-8');
  await testInfo.attach('🌐 HTML report', { path: reportPath, contentType: 'text/plain' });

  console.log(`\n✅ Report written: ${reportPath}`);
  console.log(`   Open in a browser to view the full review.\n`);
});
