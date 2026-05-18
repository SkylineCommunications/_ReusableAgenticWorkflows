/**
 * overview-mockup.spec.ts
 *
 * Focused single-page UX mockup for any DataMiner Low-Code App page.
 * Produces a clear BEFORE and AFTER screenshot showing spec improvements.
 *
 * Approach:
 *  1. Navigate to the page and wait for charts to fully render.
 *  2. Capture the BEFORE screenshot.
 *  3. Inject improvements via BOTH CSS (known DM selectors) AND
 *     JavaScript inline-style injection driven by visual heuristics —
 *     this works regardless of the exact Angular component names used.
 *  4. Capture the AFTER screenshot.
 *
 * Usage:
 *   $env:AUDIT_BASE_URL = "https://ziine-ziine.on.dataminer.services"
 *   $env:AUDIT_APP_PATH = "/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview"
 *   npx playwright test tests/overview-mockup.spec.ts --project=dataminer
 *
 * Output: results/overview-mockup/before.png + after.png
 */

import { test } from '@playwright/test';
import * as path from 'path';
import * as fs   from 'fs';

const PAGE_URL =
  process.env.AUDIT_APP_URL ??
  `${process.env.AUDIT_BASE_URL ?? 'https://ziine-ziine.on.dataminer.services'}${process.env.AUDIT_APP_PATH ?? '/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview'}`;

const OUT_DIR = path.join(__dirname, '..', 'results', 'overview-mockup');

// ─── Wait helpers ─────────────────────────────────────────────────────────────

async function waitForFull(page: any) {
  // Mirror the pattern from the working lca-ux-audit.spec.ts.
  // DataMiner apps have persistent WebSocket connections, so networkidle may
  // never fire — the .catch() ensures we continue regardless.
  await page.waitForLoadState('networkidle').catch(() => {});
  // Wait for Angular loading spinners to disappear
  await page.waitForFunction(
    () => !document.querySelector('dma-spinner[visible], [aria-busy="true"]'),
    { timeout: 20_000 }
  ).catch(() => {});
  await page.waitForTimeout(2_000); // Allow chart animations to finish
}

// ─── Main test ────────────────────────────────────────────────────────────────

test('Overview — before / after mockup', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── 1. Load page ─────────────────────────────────────────────────────────
  console.log(`\n🌐 Loading: ${PAGE_URL}`);
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForFull(page);
  console.log('✅ Page fully loaded');

  // ── 2. DOM inspection — log element names for diagnostics ────────────────
  const domInfo = await page.evaluate(() => {
    const customTags = [...new Set([...document.querySelectorAll('*')]
      .map((el: any) => el.tagName.toLowerCase())
      .filter((t: string) => t.includes('-'))
    )].sort();

    // Identify panel-like elements in the content area
    const panels: any[] = [];
    document.querySelectorAll('*').forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 60 || rect.left < 180 || rect.top < 50) return;
      const bg = window.getComputedStyle(el).backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return;
      if (!el.querySelector('svg, canvas')) return;
      panels.push({
        tag: el.tagName.toLowerCase(),
        cls: [...(el.classList ?? [])].slice(0, 4).join(' '),
        x: Math.round(rect.left), y: Math.round(rect.top),
        w: Math.round(rect.width), h: Math.round(rect.height),
      });
    });
    return { customTags, panels: panels.slice(0, 30) };
  });

  console.log('\n📋 Custom elements found:');
  console.log('  ', domInfo.customTags.join(', '));
  console.log(`\n📦 Panel-like elements (containing SVG/canvas): ${domInfo.panels.length}`);
  for (const p of domInfo.panels) {
    console.log(`  <${p.tag} class="${p.cls}"> ${p.w}×${p.h} @ (${p.x}, ${p.y})`);
  }

  // ── 3. BEFORE screenshot ──────────────────────────────────────────────────
  const beforePath = path.join(OUT_DIR, 'before.png');
  await page.screenshot({ path: beforePath, fullPage: false });
  console.log(`\n📸 BEFORE: ${beforePath}`);

  // ── 4. Inject improvements ────────────────────────────────────────────────

  // Pass A — CSS tag: now using the REAL class names found via DOM inspection.
  await page.addStyleTag({ content: `
    /* ── 1. All panels: rounded corners + subtle elevation ─────────────────
       .component is the real wrapper class for every dashboard panel.     */
    .component {
      border-radius: 16px !important;
      overflow: hidden !important;
      border: 1px solid rgba(255, 255, 255, 0.10) !important;
      box-shadow:
        0 2px 4px  rgba(0, 0, 0, 0.30),
        0 8px 24px rgba(0, 0, 0, 0.50) !important;
    }
    /* Inner content area: ensure clipping respects radius */
    .component-body.component-content {
      border-radius: 0 0 16px 16px !important;
    }

    /* ── 2. Panel headers: clear label hierarchy ────────────────────────── */
    dma-db-component-header {
      padding: 10px 16px 6px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
    }
    dma-db-component-header .title,
    dma-db-component-header [class*="title"] {
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      opacity: 0.60 !important;
    }

    /* ── 3. KPI value: consistent sizing across all stat tiles ──────────── */
    dma-generic-state .value,
    dma-generic-state [class*="value"],
    dma-fit-text {
      font-size: 2.4rem !important;
      font-weight: 700 !important;
      letter-spacing: -0.02em !important;
    }

    /* ── 4. Sidebar: force expanded so page names are readable ─────────── */
    dma-app-sidebar-wrapper {
      width: 186px !important;
      min-width: 186px !important;
    }
    dma-app-sidebar-wrapper .sidebar-tab {
      flex-direction: row !important;
      justify-content: flex-start !important;
      padding: 0 14px !important;
      gap: 10px !important;
      height: 40px !important;
      align-items: center !important;
    }
    dma-app-sidebar-wrapper .sidebar-tab .label,
    dma-app-sidebar-wrapper .sidebar-tab [class*="label"],
    dma-app-sidebar-wrapper .sidebar-tab span:not([class*="icon"]):not(i) {
      display: block !important;
      font-size: 13px !important;
      white-space: nowrap !important;
      opacity: 1 !important;
      max-width: 130px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    /* ── 5. Buttons: rounded ────────────────────────────────────────────── */
    button, [role="button"] {
      border-radius: 8px !important;
    }

    /* ── 6. Grid / table header: uppercase small caps ───────────────────── */
    th, [class*="header-cell"], [class*="column-header"] {
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.07em !important;
    }
  ` });

  // Pass B — JavaScript: direct inline-style injection for guaranteed coverage,
  // PLUS SVG chart colour improvements (modern palette replaces washed-out pinks).
  const styled = await page.evaluate(() => {
    // ── 1. Style every .component panel ──────────────────────────────────
    let count = 0;
    document.querySelectorAll('.component').forEach((el: any) => {
      el.style.setProperty('border-radius', '16px', 'important');
      el.style.setProperty('overflow',      'hidden',  'important');
      el.style.setProperty('border',
        '1px solid rgba(255, 255, 255, 0.10)', 'important');
      el.style.setProperty('box-shadow',
        '0 2px 4px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.50)', 'important');
      count++;
    });

    // ── 2. Modern chart colour palette ────────────────────────────────────
    // Replace the washed-out salmon/peach default palette with vivid,
    // readable colours that feel contemporary.
    const MODERN = ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1',
                    '#E53935', '#3949AB', '#00897B', '#F4511E', '#039BE5'];

    // Pie / donut charts – each path segment gets a new fill
    let piePaletteIdx = 0;
    document.querySelectorAll(
      'dma-generic-pie-chart svg path, dma-pie-chart svg path'
    ).forEach((path: any) => {
      const fill = (path.getAttribute('fill') || '').toLowerCase();
      if (!fill || fill === 'none' || fill === 'transparent'
          || fill === '#ffffff' || fill === '#fff'
          || fill === '#000000' || fill === '#000') return;
      path.setAttribute('fill', MODERN[piePaletteIdx % MODERN.length]);
      (path as SVGElement).style.setProperty('fill',
        MODERN[piePaletteIdx % MODERN.length], 'important');
      piePaletteIdx++;
    });

    // Bar / column charts – each chart container gets one coherent colour
    const BAR_PALETTE = ['#1565C0', '#2E7D32', '#E65100'];
    let barChartIdx = 0;
    document.querySelectorAll(
      'dma-generic-bar-chart, dma-bar-chart'
    ).forEach((chart: any) => {
      const barColour = BAR_PALETTE[barChartIdx % BAR_PALETTE.length];
      chart.querySelectorAll('svg rect, svg path').forEach((shape: any) => {
        const fill = (shape.getAttribute('fill') || '').toLowerCase();
        if (!fill || fill === 'none' || fill === 'transparent') return;
        // Skip axis / gridline elements (near-white or very transparent)
        if (fill.startsWith('rgba(255') || fill === '#ffffff' || fill === '#fff') return;
        shape.setAttribute('fill', barColour);
        (shape as SVGElement).style.setProperty('fill', barColour, 'important');
      });
      barChartIdx++;
    });

    // Log for diagnostics
    const tags = [...new Set([...document.querySelectorAll('*')]
      .map((e: any) => e.tagName.toLowerCase()).filter((t: string) => t.includes('-')))
    ].sort();
    console.log('[UX-MOCKUP] Tags:', tags.join(', '));
    console.log('[UX-MOCKUP] .component panels styled:', count);

    return count;
  });
  console.log(`\n🎨 Pass B (JS heuristic) styled ${styled} panel(s)`);

  await page.waitForTimeout(800); // Allow CSS transitions to settle

  // ── 5. AFTER screenshot ───────────────────────────────────────────────────
  const afterPath = path.join(OUT_DIR, 'after.png');
  await page.screenshot({ path: afterPath, fullPage: false });
  console.log(`📸 AFTER:  ${afterPath}`);

  console.log(`\n✅ Done.  Open both PNGs to compare:\n   ${beforePath}\n   ${afterPath}`);
});
