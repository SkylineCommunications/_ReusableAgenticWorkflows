/**
 * ux-mockup.spec.ts
 *
 * Generates "before" and "after" mockup screenshots for a DataMiner LCA
 * by injecting spec-aligned CSS and JS improvements into the live app.
 *
 * Each improvement is tagged with its ux-spec.md rule reference.
 *
 * Usage:
 *   $env:AUDIT_APP_URL  = "https://..."
 *   $env:AUDIT_APP_NAME = "MyApp"
 *   $env:AUDIT_BASE_URL = "https://..."
 *   npx playwright test tests/ux-mockup.spec.ts --project=dataminer
 *
 * Output: results/mockup/mockup-report.html
 */

import { test } from '@playwright/test';
import * as path from 'path';
import * as fs   from 'fs';

// ─── Config ──────────────────────────────────────────────────────────────────
const APP_URL  = process.env.AUDIT_APP_URL  ?? 'https://ziine-ziine.on.dataminer.services/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview';
const APP_NAME = process.env.AUDIT_APP_NAME ?? 'Ziine App 1';
const OUT_DIR  = path.join(__dirname, '..', 'results', 'mockup');

// ─── Spec improvements ────────────────────────────────────────────────────────
// Each entry maps one ux-spec.md rule to a concrete CSS/JS transformation.
// These are applied in the "after" pass only.

interface Improvement {
  id: string;
  title: string;
  specRef: string;
  impact: 'high' | 'medium' | 'low';
  css?: string;
  js?: string;
}

const IMPROVEMENTS: Improvement[] = [
  // ── UX-04: Widget card elevation ─────────────────────────────────────────
  {
    id: 'UX-04',
    title: 'Add elevation shadow to widget containers',
    specRef: 'ux-spec.md §2.5 — Level 1 shadow + 8px border-radius on all widget containers (CC-06)',
    impact: 'high',
    css: `
      dma-db-component {
        box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        margin: 4px !important;
      }
    `,
  },

  // ── UX-05: Rounded corners on buttons ────────────────────────────────────
  {
    id: 'UX-05',
    title: 'Rounded corners on all buttons',
    specRef: 'ux-spec.md §2.4 — border-radius: 6px for buttons (CC-07)',
    impact: 'medium',
    css: `
      dma-button button,
      .ms-Button,
      .ms-Button--primary,
      .ms-Button--default,
      button[class*="Button"],
      [class*="action-button"] button {
        border-radius: 6px !important;
      }
    `,
  },

  // ── UX-06: Primary CTA — brand colour fill ───────────────────────────────
  {
    id: 'UX-06',
    title: 'Primary CTA button uses brand-primary colour',
    specRef: 'ux-spec.md §4.2 — filled #4527A0 for primary action button (CC-03)',
    impact: 'medium',
    css: `
      .ms-Button--primary,
      dma-button[kind="primary"] button,
      dma-button[variant="primary"] button,
      button[class*="primary"] {
        background-color: #4527A0 !important;
        border-color: #4527A0 !important;
        color: #ffffff !important;
        border-radius: 6px !important;
        font-weight: 600 !important;
      }
      .ms-Button--primary:hover {
        background-color: #311B92 !important;
      }
    `,
  },

  // ── UX-08: Typography hierarchy ──────────────────────────────────────────
  {
    id: 'UX-08',
    title: 'Typography — widget titles 16px 600, table headers uppercase 12px',
    specRef: 'ux-spec.md §2.2 — typography scale (CC-05)',
    impact: 'medium',
    css: `
      dma-db-component-header .header-title,
      dma-db-component-header [class*="title"],
      .component-header-title,
      [class*="widget-title"],
      [class*="panel-title"] {
        font-size: 16px !important;
        font-weight: 600 !important;
        letter-spacing: 0 !important;
      }
      th,
      [class*="column-header"],
      [class*="grid-header-cell"],
      [class*="header-label"] {
        font-size: 12px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
      }
    `,
  },

  // ── ROW-HOVER: Table row hover tint ──────────────────────────────────────
  {
    id: 'ROW-HOVER',
    title: 'Table row hover — brand-bg-subtle tint (#EDE7F6)',
    specRef: 'ux-spec.md §4.1 — row hover uses brand-bg-subtle',
    impact: 'low',
    css: `
      tr:hover td,
      [class*="grid-row"]:hover [class*="grid-cell"],
      [class*="table-row"]:hover [class*="table-cell"] {
        background-color: rgba(69,39,160,0.10) !important;
        cursor: pointer;
      }
    `,
  },

  // ── UX-03: Grid spacing ───────────────────────────────────────────────────
  {
    id: 'UX-03',
    title: 'Consistent 16px gap between widget containers',
    specRef: 'ux-spec.md §2.3 — spacing grid, space-md = 16px',
    impact: 'low',
    css: `
      dma-generic-grid > *,
      [class*="layout-row"],
      [class*="dashboard-layout"] {
        gap: 16px !important;
      }
    `,
  },

  // ── SG-10 / UX-07: Convert plain-text status values to semantic chips ─────
  {
    id: 'SG-10',
    title: 'Status values → semantic colour chips (replaces plain text)',
    specRef: 'ux-spec.md §4.4 — status chip colour table; §2.1 — semantic colours (CC-02)',
    impact: 'high',
    js: `(() => {
      const STATUS_MAP = {
        'active':       { bg: '#E3F2FD', fg: '#0D47A1' },
        'in progress':  { bg: '#E3F2FD', fg: '#0D47A1' },
        'resolved':     { bg: '#E8F5E9', fg: '#1B5E20' },
        'ok':           { bg: '#E8F5E9', fg: '#1B5E20' },
        'healthy':      { bg: '#E8F5E9', fg: '#1B5E20' },
        'completed':    { bg: '#E8F5E9', fg: '#1B5E20' },
        'critical':     { bg: '#FFEBEE', fg: '#B71C1C' },
        'major':        { bg: '#FFF9C4', fg: '#F57F17' },
        'warning':      { bg: '#FFF9C4', fg: '#F57F17' },
        'minor':        { bg: '#E8EAF6', fg: '#283593' },
        'pending':      { bg: '#FFF8E1', fg: '#E65100' },
        'on hold':      { bg: '#FFF3E0', fg: '#BF360C' },
        'acknowledged': { bg: '#E0F2F1', fg: '#004D40' },
        'unknown':      { bg: '#F5F5F5', fg: '#757575' },
        'none':         { bg: '#F5F5F5', fg: '#757575' },
        'notdefined':   { bg: '#F5F5F5', fg: '#757575' },
        'not defined':  { bg: '#F5F5F5', fg: '#757575' },
        'n/a':          { bg: '#F5F5F5', fg: '#757575' },
        'draft':        { bg: '#F3E5F5', fg: '#6A1B9A' },
        'deprecated':   { bg: '#FFF3E0', fg: '#BF360C' },
        'inactive':     { bg: '#F5F5F5', fg: '#757575' },
      };
      const chip = (text, bg, fg) =>
        \`<span data-ux-chip="1" style="background:\${bg};color:\${fg};padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;display:inline-block;line-height:18px">\${text}</span>\`;

      document.querySelectorAll(
        'td, [class*="cell-value"], dma-template-text-visualizer, [class*="grid-cell"]'
      ).forEach(el => {
        if (el.querySelector('[data-ux-chip]')) return;
        if (el.children.length > 0 && !el.querySelector('dma-template-text-visualizer')) return;
        const text = el.textContent.trim();
        const key  = text.toLowerCase();
        if (STATUS_MAP[key]) {
          const { bg, fg } = STATUS_MAP[key];
          el.innerHTML = chip(text, bg, fg);
        }
      });
    })();`,
  },

  // ── EMPTY-STATE: Empty table placeholder ─────────────────────────────────
  {
    id: 'SG-08',
    title: 'Empty tables show icon + message instead of bare empty container',
    specRef: 'ux-spec.md §4.8 — empty state: icon + heading + optional action',
    impact: 'medium',
    js: `(() => {
      document.querySelectorAll('table tbody, [class*="grid-body"]').forEach(tbody => {
        const rows = tbody.querySelectorAll('tr, [class*="grid-row"]');
        if (rows.length === 0) {
          const placeholder = document.createElement('div');
          placeholder.setAttribute('data-ux-empty', '1');
          placeholder.style.cssText =
            'padding:48px;text-align:center;color:#9E9E9E;font-size:14px;';
          placeholder.innerHTML =
            '<div style="font-size:32px;margin-bottom:12px">🔍</div>' +
            '<div style="font-weight:600;color:#616161;margin-bottom:4px">No items found</div>' +
            '<div style="font-size:12px">Try adjusting your filters</div>';
          tbody.parentNode.insertBefore(placeholder, tbody);
        }
      });
    })();`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function waitForReady(page: any) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForFunction(
    () => !document.querySelector('dma-spinner[visible], [aria-busy="true"]'),
    { timeout: 20_000 }
  ).catch(() => {});
  await page.waitForTimeout(1_500);
}

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

// ─── Page discovery ───────────────────────────────────────────────────────────
// Uses URL-change detection to reliably identify real page tabs while ignoring
// utility buttons (hamburger, back arrow) whose clicks don't change the route.
// Returns pages[0] with domIndex=-1 (sentinel: "already here, no click needed").
async function discoverPages(page: any): Promise<Array<{ domIndex: number; label: string }>> {
  const pages: Array<{ domIndex: number; label: string }> = [];
  const seenUrls = new Set<string>();

  // Seed with the initial page we're already on.
  const initialUrl = page.url();
  seenUrls.add(initialUrl);
  const firstLabel = decodeURIComponent(initialUrl.split('/').filter(Boolean).pop() ?? '').replace(/-/g, ' ') || 'Overview';
  pages.push({ domIndex: -1, label: firstLabel });

  const tabCount = await page.locator('dma-app-sidebar-wrapper .sidebar-tab').count();
  for (let i = 0; i < tabCount; i++) {
    await page.locator('dma-app-sidebar-wrapper .sidebar-tab').nth(i).click();
    // Brief wait for SPA route to settle (no full networkidle — that's too slow for discovery).
    await page.waitForTimeout(700);
    const currentUrl = page.url();
    if (!seenUrls.has(currentUrl)) {
      seenUrls.add(currentUrl);
      const label = decodeURIComponent(currentUrl.split('/').filter(Boolean).pop() ?? '').replace(/-/g, ' ') || `Page ${pages.length + 1}`;
      pages.push({ domIndex: i, label });
    }
  }

  console.log(`\n📋  Discovered ${pages.length} page(s): ${pages.map(p => `${p.label}(${p.domIndex})`).join(', ')}`);
  return pages;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
// domIndex === -1 means "we're already on this page — no click needed".
async function goToPage(page: any, domIndex: number) {
  if (domIndex === -1) return;
  await page.locator('dma-app-sidebar-wrapper .sidebar-tab').nth(domIndex).click();
  await waitForReady(page);
}

// ─── Spec injection ───────────────────────────────────────────────────────────
async function injectSpec(page: any) {
  // Inject all CSS
  const allCSS = IMPROVEMENTS.filter(i => i.css).map(i => `/* ${i.id} */\n${i.css}`).join('\n');
  await page.addStyleTag({ content: allCSS });

  // Run all JS transforms
  for (const imp of IMPROVEMENTS.filter(i => i.js)) {
    await page.evaluate(imp.js!).catch(() => {});
  }
  await page.waitForTimeout(600);
}

// ─── Main test ────────────────────────────────────────────────────────────────
test('UX Spec Mockup — before / after', async ({ page }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Warm-up / auth ──────────────────────────────────────────────────────
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForReady(page);

  const pages = await discoverPages(page);
  if (pages.length === 0) pages.push({ domIndex: 0, label: 'Overview' });

  type PageResult = {
    label:      string;
    beforeFile: string;
    afterFile:  string;
  };
  const results: PageResult[] = [];

  // ── Phase 1: "Before" screenshots ─────────────────────────────────────
  // We are already on page 0 (Overview) from the initial page.goto.
  // goToPage handles domIndex===-1 as "no-op" (we're already on this page).
  for (let i = 0; i < pages.length; i++) {
    await goToPage(page, pages[i].domIndex);
    const beforeFile = `${String(i + 1).padStart(2, '0')}-${slug(pages[i].label)}-before.png`;
    await page.screenshot({ path: path.join(OUT_DIR, beforeFile), fullPage: true });
    results.push({ label: pages[i].label, beforeFile, afterFile: '' });
  }

  // ── Phase 2+3: Reload to clear state, inject spec CSS, take "after" shots ─
  // Reloading resets the SPA to page 0 (Overview). Inject once; CSS persists
  // across SPA navigation for all subsequent pages.
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForReady(page);
  await injectSpec(page);

  // ── Phase 3: "After" screenshots ──────────────────────────────────────
  // goToPage no-ops for pages[0] (domIndex===-1); SPA nav keeps CSS for i>0.
  for (let i = 0; i < pages.length; i++) {
    await goToPage(page, pages[i].domIndex);
    const afterFile = `${String(i + 1).padStart(2, '0')}-${slug(pages[i].label)}-after.png`;
    await page.screenshot({ path: path.join(OUT_DIR, afterFile), fullPage: true });
    results[i].afterFile = afterFile;
  }

  // ── Report ────────────────────────────────────────────────────────────
  const html = buildReport(APP_NAME, APP_URL, results);
  const reportPath = path.join(OUT_DIR, 'mockup-report.html');
  fs.writeFileSync(reportPath, html, 'utf-8');
  console.log(`\n✅ Mockup report: ${reportPath}`);
});

// ─── HTML report builder ──────────────────────────────────────────────────────
function buildReport(appName: string, appUrl: string, pages: any[]): string {
  const high   = IMPROVEMENTS.filter(i => i.impact === 'high');
  const medium = IMPROVEMENTS.filter(i => i.impact === 'medium');
  const low    = IMPROVEMENTS.filter(i => i.impact === 'low');

  const impactBadge = (i: string) =>
    i === 'high'   ? `<span style="background:#FFEBEE;color:#B71C1C;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">HIGH</span>` :
    i === 'medium' ? `<span style="background:#FFF8E1;color:#E65100;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">MEDIUM</span>` :
                     `<span style="background:#F5F5F5;color:#616161;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">LOW</span>`;

  const improvementsTable = `
    <table>
      <thead><tr>
        <th>#</th><th>ID</th><th>Improvement</th><th>Impact</th><th>Spec Reference</th>
      </tr></thead>
      <tbody>
        ${IMPROVEMENTS.map((imp, i) => `
          <tr>
            <td style="color:#9E9E9E">${i + 1}</td>
            <td><code style="background:#F5F5F5;padding:2px 6px;border-radius:3px;font-size:12px">${imp.id}</code></td>
            <td>${imp.title}</td>
            <td>${impactBadge(imp.impact)}</td>
            <td style="font-size:12px;color:#616161">${imp.specRef}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const summaryBar = `
    <div style="display:flex;gap:24px;margin:24px 0">
      <div style="background:#FFEBEE;border-radius:8px;padding:16px 24px;flex:1;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#B71C1C">${high.length}</div>
        <div style="font-size:12px;color:#B71C1C;font-weight:600;text-transform:uppercase">High-impact changes</div>
      </div>
      <div style="background:#FFF8E1;border-radius:8px;padding:16px 24px;flex:1;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#E65100">${medium.length}</div>
        <div style="font-size:12px;color:#E65100;font-weight:600;text-transform:uppercase">Medium-impact changes</div>
      </div>
      <div style="background:#F5F5F5;border-radius:8px;padding:16px 24px;flex:1;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#616161">${low.length}</div>
        <div style="font-size:12px;color:#616161;font-weight:600;text-transform:uppercase">Low-impact changes</div>
      </div>
      <div style="background:#E8F5E9;border-radius:8px;padding:16px 24px;flex:1;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#1B5E20">${IMPROVEMENTS.length}</div>
        <div style="font-size:12px;color:#1B5E20;font-weight:600;text-transform:uppercase">Total improvements</div>
      </div>
    </div>`;

  const pageComparisons = pages.map((pg, idx) => `
    <section style="margin-bottom:64px">
      <h2 style="font-size:18px;font-weight:700;color:#212121;border-bottom:2px solid #4527A0;padding-bottom:8px;margin-bottom:24px">
        Page ${idx + 1}: ${pg.label}
      </h2>

      <!-- Slider comparison -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#B71C1C;letter-spacing:0.08em;margin-bottom:8px">
            ❌ BEFORE — current state
          </div>
          <img src="${pg.beforeFile}" style="width:100%;border:2px solid #FFCDD2;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#1B5E20;letter-spacing:0.08em;margin-bottom:8px">
            ✅ AFTER — with ux-spec.md applied
          </div>
          <img src="${pg.afterFile}" style="width:100%;border:2px solid #C8E6C9;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        </div>
      </div>

      <!-- Changes applied -->
      <details open>
        <summary style="cursor:pointer;font-weight:600;font-size:14px;color:#4527A0;margin-bottom:12px;user-select:none">
          📋 Changes applied on this page (${IMPROVEMENTS.length} rules)
        </summary>
        <table>
          <thead><tr>
            <th>Rule ID</th><th>What changed</th><th>Impact</th><th>Spec rule</th>
          </tr></thead>
          <tbody>
            ${IMPROVEMENTS.map(imp => `
              <tr>
                <td><code style="background:#F5F5F5;padding:2px 6px;border-radius:3px;font-size:12px">${imp.id}</code></td>
                <td>${imp.title}</td>
                <td>${impactBadge(imp.impact)}</td>
                <td style="font-size:12px;color:#616161">${imp.specRef}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </details>
    </section>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UX Mockup — ${appName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F5F5F5;
      color: #212121;
      margin: 0;
      padding: 0;
    }
    .header {
      background: #4527A0;
      color: white;
      padding: 32px 48px;
    }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; }
    .header p  { margin: 0; opacity: 0.8; font-size: 14px; }
    .header a  { color: #B39DDB; }
    .content   { max-width: 1400px; margin: 0 auto; padding: 40px 48px; }

    h2 { margin-top: 0; }

    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      padding: 24px;
      margin-bottom: 32px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #F5F5F5;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #616161;
      letter-spacing: 0.06em;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #F0F0F0;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    details summary::-webkit-details-marker { display: none; }
    details summary::before { content: "▶ "; font-size: 10px; }
    details[open] summary::before { content: "▼ "; }
    code { font-family: 'Consolas', monospace; }
  </style>
</head>
<body>

<div class="header">
  <h1>🎨 UX Spec Mockup — ${appName}</h1>
  <p>
    <a href="${appUrl}" target="_blank">${appUrl}</a>
    &nbsp;·&nbsp; Generated ${new Date().toLocaleString('en-GB')}
    &nbsp;·&nbsp; Based on <strong>ux-spec.md</strong>
  </p>
</div>

<div class="content">

  <!-- Summary -->
  <div class="card">
    <h2 style="margin-top:0;font-size:18px">What was changed — overview</h2>
    <p style="color:#616161;font-size:14px;margin-top:0">
      The "After" screenshots show the live app with
      <strong>${IMPROVEMENTS.length} ux-spec.md improvements injected via CSS and JavaScript</strong>
      directly into the running application. No app files were modified — this is a visual prototype only.
      The left sidebar and header bar are excluded as per spec scope.
    </p>
    ${summaryBar}
    ${improvementsTable}
  </div>

  <!-- Per-page comparisons -->
  ${pages.map((pg, idx) => `
    <div class="card">
      ${pageComparisons.split('</section>')[idx] ?? ''}
    </div>`).join('')}

  <p style="text-align:center;color:#9E9E9E;font-size:12px;margin-top:32px">
    DataMiner LCA UX Audit · <em>ux-spec.md</em> · Skyline Communications
  </p>
</div>
</body>
</html>`;
}
