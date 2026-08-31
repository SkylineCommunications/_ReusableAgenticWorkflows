"""
frontend-design skill: COMMAND GRID aesthetic applied to Facility Manager Overview.
Aesthetic direction: Dark cockpit / precision instrument / mission control.
- ONE warm orange accent: #E87722 (capacity/usage data)
- ONE teal accent: #6BD4C0 (free/available data — semantic contrast)
- Rajdhani font: KPI numbers (geometric, engineered, tight)
- Barlow Condensed: headers and labels (industrial, compact)
- Panels: deep shadow + dark background (mass without borders)
- Typographic hierarchy: number IS the message, label is the footnote
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

AUTH = r"playwright\.auth\user.json"
URL  = "https://ziine-ziine.on.dataminer.services/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview"
OUT  = Path("results/phase1-v2")
OUT.mkdir(parents=True, exist_ok=True)

# ── Design tokens ─────────────────────────────────────────────────────────────
ACCENT_ORANGE = "#E87722"   # capacity / usage — warm, authoritative
ACCENT_TEAL   = "#6BD4C0"   # free / available — cool, positive
ACCENT_RED    = "#E84444"   # critical / error state
PANEL_DARK    = "#10141C"   # deeper panel background (was #282832 / #393944)
HEADER_BG     = "#0C1018"   # panel header strip, slightly darker than body


def apply_command_grid(page) -> None:
    """
    Apply the COMMAND GRID aesthetic to the live page.
    Two-pass approach (webapp-testing: identify selectors first, then act):
    Pass A: CSS — handles cascade-accessible properties
    Pass B: JS inline styles — pierces Angular encapsulation for charts and KPIs
    """

    # ── Pass A: CSS injection ──────────────────────────────────────────────
    page.add_style_tag(content="""
        /* FONTS ── Rajdhani for numbers, Barlow Condensed for labels */
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Barlow+Condensed:wght@400;500;600;700&display=swap');

        /* PANEL DEPTH ── mass via shadow, zero decorative chrome */
        .component {
            box-shadow:
                0 12px 48px rgba(0,0,0,0.72),
                0 3px 10px  rgba(0,0,0,0.55) !important;
            background-color: #10141C !important;
            border: none !important;
            outline: none !important;
            border-radius: 2px !important;
        }

        /* PANEL HEADER ── orange left-rail, tight uppercase label */
        dma-db-component-header {
            border-left: 3px solid #E87722 !important;
            padding-left: 10px !important;
            background: transparent !important;
        }
        dma-db-component-header .title,
        dma-db-component-header [class*="title"],
        dma-db-component-header span:not(mat-icon):not([class*="icon"]) {
            font-family: 'Barlow Condensed', sans-serif !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            letter-spacing: 0.14em !important;
            text-transform: uppercase !important;
            color: rgba(255,255,255,0.7) !important;
        }

        /* KPI NUMBERS ── Rajdhani, hero weight */
        dma-fit-text,
        dma-fit-text span,
        dma-fit-text div,
        dma-fit-text * {
            font-family: 'Rajdhani', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: -0.02em !important;
            color: #FFFFFF !important;
        }

        /* KPI LABELS ── recede hard */
        dma-state-v2 [class*="sub"],
        dma-state-v2 [class*="label"],
        dma-state-v2 [class*="unit"],
        dma-state-layout [class*="sub"],
        dma-state-layout [class*="label"] {
            font-family: 'Barlow Condensed', sans-serif !important;
            font-size: 9px !important;
            font-weight: 600 !important;
            letter-spacing: 0.10em !important;
            text-transform: uppercase !important;
            color: rgba(255,255,255,0.38) !important;
        }

        /* TABLE HEADERS ── structural guide, not loud */
        [role="columnheader"], th {
            font-family: 'Barlow Condensed', sans-serif !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            letter-spacing: 0.12em !important;
            text-transform: uppercase !important;
            color: rgba(255,255,255,0.35) !important;
            border-bottom: 1px solid rgba(232,119,34,0.25) !important;
        }

        /* TABLE ROWS ── clean, high contrast */
        [role="row"]:not([class*="header"]) td,
        [role="row"]:not([class*="header"]) [role="cell"] {
            font-family: 'Barlow Condensed', sans-serif !important;
            font-size: 13px !important;
            color: rgba(255,255,255,0.85) !important;
            border-bottom: 1px solid rgba(255,255,255,0.04) !important;
        }

        /* BUTTONS ── precision corners */
        dma-button button, button.dma-button, .dma-button {
            font-family: 'Barlow Condensed', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: 0.06em !important;
            text-transform: uppercase !important;
            border-radius: 2px !important;
            border: 1px solid #E87722 !important;
            color: #E87722 !important;
            background: transparent !important;
        }
    """)

    # ── Pass B: JS — Angular encapsulation bypass + semantic chart colours ──
    page.evaluate("""
    (tokens) => {
        const { orange, teal, red, panelDark } = tokens;

        // 1. PANEL BACKGROUNDS ── deepen to PANEL_DARK
        document.querySelectorAll('.component').forEach(el => {
            el.style.setProperty('background-color', panelDark, 'important');
        });

        // 2. KPI NUMBERS ── walk dma-state-v2 and dma-generic-state,
        //    apply Rajdhani to every text-carrying element
        document.querySelectorAll(
            'dma-state-v2, dma-generic-state, dma-state-layout'
        ).forEach(comp => {
            comp.querySelectorAll('*').forEach(el => {
                const tag = el.tagName.toLowerCase();
                if (tag === 'mat-icon' || tag.includes('icon')) return;
                const txt = el.textContent.trim();
                if (!txt) return;

                const cs  = window.getComputedStyle(el);
                const fs  = parseFloat(cs.fontSize);

                if (fs >= 12) {
                    // Could be either the number or a label — apply Rajdhani to all
                    el.style.setProperty('font-family', "'Rajdhani', sans-serif", 'important');
                    el.style.setProperty('font-weight', '700', 'important');
                    el.style.setProperty('color', '#FFFFFF', 'important');
                }
            });
        });

        // 3. BAR CHARTS ── semantic colour system
        //    Identify chart by surrounding panel title, then apply correct accent
        document.querySelectorAll(
            'dma-generic-bar-chart, dma-bar-chart'
        ).forEach(chart => {
            // Find containing panel title
            const panel = chart.closest('.component');
            const titleEl = panel && panel.querySelector(
                'dma-db-component-header .title, dma-db-component-header span, [class*="title"]'
            );
            const title = (titleEl ? titleEl.textContent : '').toLowerCase();

            // Semantic: "free" = teal (positive/available), else orange (usage/capacity)
            const colour = title.includes('free') ? teal : orange;

            chart.querySelectorAll('svg rect, svg path').forEach(s => {
                const fill = (s.getAttribute('fill') ?? '').toLowerCase();
                if (!fill || fill === 'none' || fill === 'transparent'
                    || fill === '#fff' || fill === '#ffffff'
                    || fill === '#000' || fill === '#000000') return;
                s.setAttribute('fill', colour);
                s.style.setProperty('fill', colour, 'important');
            });
        });

        // 4. PIE CHARTS ── warm monochromatic family (same hue, varied saturation/lightness)
        const pieFamily = ['#E87722', '#BF4F10', '#FFAB64', '#C46020', '#FF8C3C'];
        let pieIndex = 0;
        document.querySelectorAll(
            'dma-generic-pie-chart svg path, dma-pie-chart svg path'
        ).forEach(p => {
            const fill = (p.getAttribute('fill') ?? '').toLowerCase();
            if (!fill || fill === 'none' || fill === 'transparent'
                || fill === '#fff' || fill === '#ffffff'
                || fill === '#000' || fill === '#000000') return;
            const c = pieFamily[pieIndex++ % pieFamily.length];
            p.setAttribute('fill', c);
            p.style.setProperty('fill', c, 'important');
        });

        // 5. STATUS CHIPS ── semantic colour replacing plain text
        const STATUS = {
            'active':         { bg: 'rgba(27,94,32,0.85)',   fg: '#A5D6A7' },
            'online':         { bg: 'rgba(27,94,32,0.85)',   fg: '#A5D6A7' },
            'running':        { bg: 'rgba(27,94,32,0.85)',   fg: '#A5D6A7' },
            'ok':             { bg: 'rgba(27,94,32,0.85)',   fg: '#A5D6A7' },
            'in service':     { bg: 'rgba(27,94,32,0.85)',   fg: '#A5D6A7' },
            'error':          { bg: 'rgba(180,20,20,0.85)',  fg: '#FFCDD2' },
            'critical':       { bg: 'rgba(180,20,20,0.85)',  fg: '#FFCDD2' },
            'failed':         { bg: 'rgba(180,20,20,0.85)',  fg: '#FFCDD2' },
            'warning':        { bg: 'rgba(191,79,16,0.85)',  fg: '#FFE0B2' },
            'major':          { bg: 'rgba(191,79,16,0.85)',  fg: '#FFE0B2' },
            'inactive':       { bg: 'rgba(40,50,60,0.85)',   fg: '#90A4AE' },
            'offline':        { bg: 'rgba(40,50,60,0.85)',   fg: '#90A4AE' },
            'out of service': { bg: 'rgba(40,50,60,0.85)',   fg: '#90A4AE' },
        };
        const STATUS_RE = new RegExp('^(' + Object.keys(STATUS).join('|') + ')$', 'i');
        document.querySelectorAll('[role="row"]:not([class*="header"])').forEach(row => {
            row.querySelectorAll('td,[role="cell"]').forEach(cell => {
                const txt = (cell.textContent?.trim() ?? '');
                if (!STATUS_RE.test(txt.toLowerCase()) || cell.querySelector('.__chip')) return;
                const colors = STATUS[txt.toLowerCase()];
                if (!colors) return;
                const chip = document.createElement('span');
                chip.className = '__chip';
                chip.textContent = txt;
                chip.style.cssText = [
                    `background:${colors.bg}`, `color:${colors.fg}`,
                    'padding:2px 8px', 'border-radius:2px',
                    'font-size:9px', 'font-weight:700',
                    'letter-spacing:0.08em', 'text-transform:uppercase',
                    'display:inline-block', 'white-space:nowrap',
                    "font-family:'Barlow Condensed',sans-serif"
                ].join(';');
                cell.innerHTML = '';
                cell.appendChild(chip);
            });
        });

    }
    """, {"orange": ACCENT_ORANGE, "teal": ACCENT_TEAL, "red": ACCENT_RED, "panelDark": PANEL_DARK})


# ── Main ──────────────────────────────────────────────────────────────────────
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        storage_state=AUTH,
        viewport={"width": 1920, "height": 1080}
    )
    page = ctx.new_page()

    print(f"Loading {URL} ...")
    page.goto(URL)

    # Wait for content using spinner-absence pattern (networkidle won't fire on WebSocket apps)
    try:
        page.wait_for_selector('.lds-ring, .loading-spinner, [class*="spinner"]',
                               state='hidden', timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(7000)

    # BEFORE ──────────────────────────────────────────────────────────────────
    page.screenshot(path=str(OUT / "before.png"), full_page=False)
    print(f"Before: {OUT / 'before.png'}")

    # INJECT COMMAND GRID aesthetic ───────────────────────────────────────────
    apply_command_grid(page)

    # Small wait for fonts to load
    page.wait_for_timeout(2500)

    # AFTER ───────────────────────────────────────────────────────────────────
    page.screenshot(path=str(OUT / "after.png"), full_page=False)
    print(f"After:  {OUT / 'after.png'}")

    browser.close()

print("\nMockup done. Generating HTML report ...")

# ── HTML report ───────────────────────────────────────────────────────────────
# Read images as base64 so the report is self-contained
import base64

def img_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

before_b64 = img_b64(OUT / "before.png")
after_b64  = img_b64(OUT / "after.png")

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Facility Manager — UX Audit: Command Grid Mockup</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Barlow+Condensed:wght@400;500;600;700&display=swap');

  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

  :root {{
    --bg:      #080C12;
    --surface: #0F1520;
    --card:    #141B26;
    --border:  rgba(232,119,34,0.25);
    --orange:  #E87722;
    --teal:    #6BD4C0;
    --text:    rgba(255,255,255,0.85);
    --muted:   rgba(255,255,255,0.38);
    --danger:  #E84444;
  }}

  body {{
    background: var(--bg);
    color: var(--text);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }}

  /* ── HEADER ── */
  .report-header {{
    padding: 40px 60px 32px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }}
  .report-header h1 {{
    font-family: 'Rajdhani', sans-serif;
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fff;
  }}
  .report-header .meta {{
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    line-height: 1.8;
  }}
  .badge {{
    display: inline-block;
    padding: 2px 10px;
    border-radius: 2px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }}
  .badge-orange {{ background: rgba(232,119,34,0.2); color: var(--orange); border: 1px solid var(--orange); }}
  .badge-teal   {{ background: rgba(107,212,192,0.15); color: var(--teal);   border: 1px solid var(--teal); }}

  /* ── SECTION ── */
  section {{
    padding: 40px 60px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }}
  section h2 {{
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 24px;
  }}

  /* ── COMPARISON ── */
  .comparison {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }}
  .comparison-pane {{
    background: var(--card);
    border-radius: 2px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  }}
  .comparison-label {{
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
  }}
  .comparison-label.before {{ color: var(--muted); }}
  .comparison-label.after  {{ color: var(--orange); border-left: 3px solid var(--orange); }}
  .comparison-pane img {{ width: 100%; display: block; }}

  /* ── FINDINGS TABLE ── */
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }}
  thead tr {{
    border-bottom: 1px solid var(--border);
  }}
  thead th {{
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 8px 12px;
    text-align: left;
  }}
  tbody tr {{
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.15s;
  }}
  tbody tr:hover {{ background: rgba(255,255,255,0.03); }}
  tbody td {{
    padding: 12px;
    vertical-align: top;
    color: var(--text);
    line-height: 1.4;
  }}
  .impact-high   {{ color: #E84444; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }}
  .impact-medium {{ color: var(--orange); font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }}
  .impact-low    {{ color: var(--muted); font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }}

  /* ── DESIGN SYSTEM ── */
  .tokens {{
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 16px;
  }}
  .token {{
    background: var(--card);
    border-radius: 2px;
    padding: 16px 20px;
    min-width: 160px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }}
  .token-swatch {{
    width: 36px; height: 36px;
    border-radius: 2px;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }}
  .token-name  {{ font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }}
  .token-value {{ font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; color: #fff; }}
  .token-use   {{ font-size: 10px; color: var(--muted); margin-top: 4px; }}
</style>
</head>
<body>

<header class="report-header">
  <div>
    <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">
      DataMiner LCA — UX Audit
    </p>
    <h1>Facility Manager</h1>
    <p style="font-size:12px;color:var(--muted);margin-top:6px">Overview page · ziine-ziine.on.dataminer.services</p>
  </div>
  <div class="meta" style="text-align:right">
    <div><span class="badge badge-orange">7 UX Findings</span></div>
    <br>
    <div>Aesthetic direction: <span style="color:var(--orange)">COMMAND GRID</span></div>
    <div>Score: <span style="color:var(--orange);font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700">45</span>/100</div>
  </div>
</header>

<!-- EXECUTIVE SUMMARY -->
<section>
  <h2>Executive Summary</h2>
  <p style="max-width:680px;line-height:1.8;color:var(--text)">
    The Facility Manager Overview page contains the right data — but delivers it without visual
    design intention. Panels have no depth (zero shadow), creating a flat, printed-sheet feeling
    rather than a live operations dashboard. Chart colours were chosen independently per widget,
    giving the page the appearance of four unrelated tools rather than one coherent system.
    Typography is uniform across numbers, labels and headers — there is no visual hierarchy to
    guide the eye to what matters most. Applied together, these issues make the page feel dated
    and hard to scan quickly.
  </p>
  <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
    <span class="badge badge-orange">No panel shadows → flat, lifeless layout</span>
    <span class="badge badge-orange">3 unrelated chart accent colours → visual noise</span>
    <span class="badge badge-orange">No typographic hierarchy → no focal point</span>
    <span class="badge badge-teal">Colour-blind status text → not scannable</span>
  </div>
</section>

<!-- BEFORE / AFTER -->
<section>
  <h2>Before / After — Command Grid Aesthetic</h2>
  <div class="comparison">
    <div class="comparison-pane">
      <div class="comparison-label before">Current state</div>
      <img src="data:image/png;base64,{before_b64}" alt="Before">
    </div>
    <div class="comparison-pane">
      <div class="comparison-label after">Command Grid — applied improvements</div>
      <img src="data:image/png;base64,{after_b64}" alt="After">
    </div>
  </div>
</section>

<!-- DESIGN SYSTEM TOKENS -->
<section>
  <h2>Applied Design System</h2>
  <p style="color:var(--muted);font-size:12px;margin-bottom:4px">
    These tokens should be codified into a shared DataMiner theme applied across ALL solutions — the foundation of a uniform landscape.
  </p>
  <div class="tokens">
    <div class="token">
      <div class="token-swatch" style="background:#E87722"></div>
      <div class="token-name">Accent Orange</div>
      <div class="token-value">#E87722</div>
      <div class="token-use">Capacity / usage data · CTAs</div>
    </div>
    <div class="token">
      <div class="token-swatch" style="background:#6BD4C0"></div>
      <div class="token-name">Accent Teal</div>
      <div class="token-value">#6BD4C0</div>
      <div class="token-use">Free / available data · positive states</div>
    </div>
    <div class="token">
      <div class="token-swatch" style="background:#E84444"></div>
      <div class="token-name">Danger Red</div>
      <div class="token-value">#E84444</div>
      <div class="token-use">Critical alerts · errors</div>
    </div>
    <div class="token">
      <div class="token-swatch" style="background:#10141C"></div>
      <div class="token-name">Panel Dark</div>
      <div class="token-value">#10141C</div>
      <div class="token-use">Panel/card background</div>
    </div>
    <div class="token">
      <div class="token-swatch" style="background:transparent;border:1px solid rgba(255,255,255,0.2)"></div>
      <div class="token-name">KPI Font</div>
      <div class="token-value" style="font-family:'Rajdhani',sans-serif">Rajdhani</div>
      <div class="token-use">Numbers / KPI values</div>
    </div>
    <div class="token">
      <div class="token-swatch" style="background:transparent;border:1px solid rgba(255,255,255,0.2)"></div>
      <div class="token-name">Label Font</div>
      <div class="token-value" style="font-size:14px;font-weight:600;letter-spacing:0.05em">Barlow Condensed</div>
      <div class="token-use">Headers / labels / body</div>
    </div>
  </div>
</section>

<!-- FINDINGS TABLE -->
<section>
  <h2>Findings — Facility Manager Overview</h2>
  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th style="width:80px">Source</th>
        <th style="width:80px">Rule</th>
        <th>Finding (principle)</th>
        <th>Action (how to fix)</th>
        <th style="width:80px">Impact</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Spec</td>
        <td>SG-04</td>
        <td><strong>Panels have no elevation.</strong> All 12 panels have <code>box-shadow: none</code>. A flat panel on a flat background has no visual hierarchy — the eye has no anchor.</td>
        <td>Add <code>box-shadow: 0 12px 48px rgba(0,0,0,0.7)</code> to <code>.component</code>. Elevation gives panels mass and separates them from the background.</td>
        <td><span class="impact-high">High</span></td>
      </tr>
      <tr>
        <td>2</td>
        <td>Expert</td>
        <td>—</td>
        <td><strong>3 unrelated chart accent colours.</strong> Yellow, orange and red are used across the 3 bar charts with no semantic meaning. The user cannot tell if colour encodes data or is decorative noise.</td>
        <td>Apply a semantic colour system: <span style="color:#E87722">orange = capacity/usage</span>, <span style="color:#6BD4C0">teal = free/available</span>. Every colour choice must answer the question: "what does this colour mean?"</td>
        <td><span class="impact-high">High</span></td>
      </tr>
      <tr>
        <td>3</td>
        <td>Expert</td>
        <td>—</td>
        <td><strong>No typographic hierarchy.</strong> KPI numbers, labels, panel headers and table text all render in the same generic font at similar weights. Nothing stands out as the primary signal.</td>
        <td>Introduce a 3-level type system: <strong>Rajdhani 700</strong> for KPI numbers (dominant), <strong>Barlow Condensed 700 uppercase 10px</strong> for headers (structural), <strong>Barlow Condensed 400</strong> for body/table text.</td>
        <td><span class="impact-high">High</span></td>
      </tr>
      <tr>
        <td>4</td>
        <td>Spec</td>
        <td>CC-07</td>
        <td><strong>Status values are plain text.</strong> The table renders status as unstyled text. A user scanning for problems has to read every cell — colour-coded chips allow instant visual triage.</td>
        <td>Replace plain status text with semantic chips: green = active/ok, red = error/critical, orange = warning/major, grey = inactive/offline. Use CSS <code>border-radius: 2px</code> to keep the industrial precision aesthetic.</td>
        <td><span class="impact-medium">Medium</span></td>
      </tr>
      <tr>
        <td>5</td>
        <td>Spec</td>
        <td>SG-06</td>
        <td><strong>Panel headers are visually undifferentiated.</strong> Headers use the same font and weight as body text. There is no accent device to separate "title" from "content".</td>
        <td>Apply a left-rail accent: <code>border-left: 3px solid #E87722</code> on panel headers. Combine with uppercase Barlow Condensed 700 for a clear structural signal without adding noise.</td>
        <td><span class="impact-medium">Medium</span></td>
      </tr>
      <tr>
        <td>6</td>
        <td>Expert</td>
        <td>—</td>
        <td><strong>Pie charts have a single segment.</strong> Both pie charts show only one colour, suggesting a single data category. If this is correct data, a pie chart is the wrong component — a KPI tile would communicate the value more clearly and in less space.</td>
        <td>Audit the data behind both pie charts. If they contain a single category, replace with a KPI state tile. If multi-category, check why only one segment renders.</td>
        <td><span class="impact-medium">Medium</span></td>
      </tr>
      <tr>
        <td>7</td>
        <td>Expert</td>
        <td>—</td>
        <td><strong>No cross-solution consistency.</strong> This app's colour choices, font selection and panel treatment will diverge from People, Tickets and other solution apps unless a shared design system token file is enforced at the DataMiner theme level.</td>
        <td>Extract the tokens from the Command Grid design system into a shared DataMiner theme JSON/CSS. Apply the same token file to all solution LCAs. Cross-app comparison is the Phase 3 deliverable of this audit programme.</td>
        <td><span class="impact-high">High</span></td>
      </tr>
    </tbody>
  </table>
</section>

<footer style="padding:24px 60px;border-top:1px solid rgba(255,255,255,0.05);color:var(--muted);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;display:flex;justify-content:space-between">
  <span>DataMiner LCA UX Audit — Skyline Communications</span>
  <span>Aesthetic direction: Command Grid · Phase 1</span>
</footer>

</body>
</html>"""

report_path = OUT / "report.html"
with open(report_path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Report: {report_path}")
print("Open the report in a browser to see the full before/after comparison.")
