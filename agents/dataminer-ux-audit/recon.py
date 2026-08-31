"""
webapp-testing skill: Reconnaissance pass on Facility Manager Overview.
Step 1 of Reconnaissance-then-Action: inspect the real DOM, identify selectors,
understand what's actually rendered before writing any design code.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

AUTH = r"playwright\.auth\user.json"
URL  = "https://ziine-ziine.on.dataminer.services/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview"
OUT  = Path("results/phase1-v2")
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        storage_state=AUTH,
        viewport={"width": 1920, "height": 1080}
    )
    page = ctx.new_page()

    print(f"Loading {URL} ...")
    page.goto(URL)

    # Wait: spinner disappears = page is ready (networkidle never fires on live WebSocket apps)
    try:
        page.wait_for_selector('.lds-ring, .loading-spinner, [class*="spinner"]',
                               state='hidden', timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(6000)  # give Angular time to render

    # ── Before screenshot ────────────────────────────────────────────────────
    page.screenshot(path=str(OUT / "before.png"), full_page=False)
    print(f"Before screenshot: {OUT / 'before.png'}")

    # ── DOM Reconnaissance ────────────────────────────────────────────────────
    dom_info = page.evaluate("""
    () => {
        const info = {
            pageTitle: document.title,
            bodyBackground: window.getComputedStyle(document.body).backgroundColor,
            components: [],
            kpiSelectors: [],
            chartSelectors: [],
            tableSelectors: [],
            allCustomElements: [],
            fontFamilies: new Set()
        };

        // 1. Find all custom elements (dma-*)
        const allEls = Array.from(document.querySelectorAll('*'));
        const custom = new Set();
        allEls.forEach(el => {
            if (el.tagName.includes('-')) custom.add(el.tagName.toLowerCase());
        });
        info.allCustomElements = Array.from(custom).sort();

        // 2. Panel/component wrappers
        document.querySelectorAll('.component').forEach((el, i) => {
            const r = el.getBoundingClientRect();
            if (r.width < 10 || r.height < 10) return;
            const header = el.querySelector('[class*="title"], dma-db-component-header, .header');
            const title = header ? header.textContent.trim().substring(0, 60) : '(no title)';
            const shadow = window.getComputedStyle(el).boxShadow;
            const bg     = window.getComputedStyle(el).backgroundColor;
            info.components.push({
                index: i,
                title,
                width: Math.round(r.width),
                height: Math.round(r.height),
                x: Math.round(r.x),
                y: Math.round(r.y),
                boxShadow: shadow === 'none' ? 'NONE' : shadow.substring(0, 80),
                background: bg,
                innerHTML_preview: el.innerHTML.substring(0, 200).replace(/\s+/g, ' ')
            });
        });

        // 3. KPI / state components — what text is inside?
        ['dma-generic-state','dma-state-v2','dma-state','dma-fit-text'].forEach(sel => {
            document.querySelectorAll(sel).forEach((el, i) => {
                const cs = window.getComputedStyle(el);
                info.kpiSelectors.push({
                    selector: sel,
                    index: i,
                    textContent: el.textContent.trim().substring(0, 80),
                    color: cs.color,
                    fontSize: cs.fontSize,
                    fontFamily: cs.fontFamily.substring(0, 60),
                    hasShadowRoot: !!el.shadowRoot,
                    children: Array.from(el.children).map(c => ({
                        tag: c.tagName,
                        class: c.className,
                        text: c.textContent.trim().substring(0, 40),
                        color: window.getComputedStyle(c).color,
                        fontSize: window.getComputedStyle(c).fontSize
                    }))
                });
            });
        });

        // 4. Charts
        ['dma-generic-pie-chart','dma-pie-chart','dma-generic-bar-chart','dma-bar-chart',
         'dma-generic-line-chart','dma-line-chart'].forEach(sel => {
            document.querySelectorAll(sel).forEach((el, i) => {
                const svgPaths = Array.from(el.querySelectorAll('svg path, svg rect'))
                    .map(p => p.getAttribute('fill') || p.style.fill || 'no-fill')
                    .filter(f => f && f !== 'none')
                    .slice(0, 10);
                info.chartSelectors.push({
                    selector: sel,
                    index: i,
                    svgFills: [...new Set(svgPaths)]
                });
            });
        });

        // 5. Tables
        document.querySelectorAll('dma-generic-grid, [role="grid"], table, dma-table').forEach((el, i) => {
            const headers = Array.from(el.querySelectorAll('[role="columnheader"], th'))
                .map(h => h.textContent.trim()).filter(Boolean);
            info.tableSelectors.push({
                selector: el.tagName.toLowerCase(),
                index: i,
                headers: headers.slice(0, 8)
            });
        });

        return info;
    }
    """)

    with open(OUT / "recon.json", "w") as f:
        json.dump(dom_info, f, indent=2, default=str)
    print(f"Recon data: {OUT / 'recon.json'}")

    # Pretty print key findings
    print(f"\n=== PAGE: {dom_info['pageTitle']} ===")
    print(f"Body bg: {dom_info['bodyBackground']}")
    print(f"\n--- PANELS ({len(dom_info['components'])}) ---")
    for c in dom_info['components'][:15]:
        print(f"  [{c['index']}] {c['title'][:40]:<40}  {c['width']}x{c['height']}  bg={c['background']}  shadow={c['boxShadow'][:40]}")

    print(f"\n--- KPI COMPONENTS ({len(dom_info['kpiSelectors'])}) ---")
    for k in dom_info['kpiSelectors'][:10]:
        print(f"  {k['selector']}[{k['index']}]  text='{k['textContent'][:30]}'  color={k['color']}  fontSize={k['fontSize']}  shadowRoot={k['hasShadowRoot']}")
        for ch in k['children'][:3]:
            print(f"      child: <{ch['tag']} class='{ch['class'][:30]}'> '{ch['text'][:30]}'  color={ch['color']}  size={ch['fontSize']}")

    print(f"\n--- CHARTS ({len(dom_info['chartSelectors'])}) ---")
    for ch in dom_info['chartSelectors']:
        print(f"  {ch['selector']}[{ch['index']}]  fills={ch['svgFills']}")

    print(f"\n--- TABLES ({len(dom_info['tableSelectors'])}) ---")
    for t in dom_info['tableSelectors']:
        print(f"  {t['selector']}[{t['index']}]  headers={t['headers']}")

    print(f"\n--- CUSTOM ELEMENTS ---")
    print("  " + ", ".join(dom_info['allCustomElements'][:30]))

    browser.close()

print("\nDone. Recon complete.")
