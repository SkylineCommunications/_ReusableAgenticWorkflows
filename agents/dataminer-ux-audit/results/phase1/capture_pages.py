"""
Capture all pages of the DataMiner Facility Manager app.
Uses saved auth_state.json - no login needed after first run.
Uses Playwright shadow-piercing locators + coordinate nav for icon-only sidebar.
"""
import re, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright

APP_HOST  = "ziine-ziine.on.dataminer.services"
APP_URL   = f"https://{APP_HOST}/app/fc029a44-88f2-419d-ba86-06c9c2c3dcc4/Overview"
OUT_DIR   = Path(__file__).parent
AUTH_FILE = OUT_DIR / "auth_state.json"

def slugify(text):
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_") or "page"

with sync_playwright() as p:
    if not AUTH_FILE.exists():
        print("ERROR: auth_state.json not found. Run the script once with login first.")
        raise SystemExit(1)

    print(f"Loading auth state from {AUTH_FILE.name}")
    browser = p.chromium.launch(headless=False, slow_mo=50)
    ctx = browser.new_context(
        viewport={"width": 1600, "height": 900},
        storage_state=str(AUTH_FILE)
    )
    page = ctx.new_page()

    print(f"Opening {APP_URL}")
    page.goto(APP_URL, timeout=60_000)

    # Wait for app - poll URL
    print("Waiting for app to load...")
    deadline = time.time() + 60
    while time.time() < deadline:
        if APP_HOST in page.url and "/app/" in page.url:
            break
        time.sleep(1)

    try:
        page.wait_for_load_state("networkidle", timeout=20_000)
    except Exception:
        pass
    time.sleep(4)  # extra settle for DataMiner to render

    print(f"App loaded: {page.url}\n")

    taken = []

    def snap(name):
        path = OUT_DIR / f"cap_{slugify(name)}.png"
        page.screenshot(path=str(path), full_page=False)
        url = page.url
        page_id = url.split("/")[-1] if "/app/" in url else slugify(name)
        print(f"  + [{page_id}] {name}  ->  {path.name}")
        taken.append({"name": name, "file": path.name, "url": url})

    # ── Use Playwright shadow-piercing locators to find all buttons ──
    print("Finding nav buttons via shadow-piercing locators...")
    all_buttons = page.locator("button").all()
    print(f"  Found {len(all_buttons)} buttons total")
    for i, btn in enumerate(all_buttons[:20]):
        try:
            txt = btn.inner_text(timeout=500).strip()
            bb  = btn.bounding_box()
            print(f"    [{i}] txt={repr(txt[:40])} box={bb}")
        except Exception:
            pass

    # ── Snapshot Overview first ──────────────────────────────────────
    snap("Overview")

    # ── Identify nav items: left sidebar icons (icon-only, no text) ──
    # From screenshot: sidebar is ~48px wide, icons at x=24
    # Icon y-positions (approx): 80, 120, 160, 200, 250, 330
    # Try clicking each and see what page loads
    sidebar_icon_ys = [80, 120, 165, 205, 250, 335]
    nav_x = 24

    seen_urls = {page.url}
    for icon_y in sidebar_icon_ys:
        try:
            prev_url = page.url
            page.mouse.click(nav_x, icon_y)
            time.sleep(0.4)
            try:
                page.wait_for_load_state("networkidle", timeout=10_000)
            except Exception:
                pass
            time.sleep(1.5)
            cur_url = page.url
            # Derive page name from URL
            page_name = cur_url.split("/")[-1] if "/app/" in cur_url else f"page_y{icon_y}"
            if cur_url not in seen_urls and page_name != "Overview":
                seen_urls.add(cur_url)
                snap(page_name)
            elif cur_url == prev_url:
                print(f"  - y={icon_y}: no navigation (same URL)")
        except Exception as e:
            print(f"  ! y={icon_y}: {e}")

    # ── Save manifest ────────────────────────────────────────────────
    print(f"\nCaptured {len(taken)} pages:")
    for t in taken:
        print(f"  {t['name']}  ->  {t['file']}")

    manifest = OUT_DIR / "pages_manifest.txt"
    manifest.write_text("\n".join(f"{t['name']}|{t['file']}|{t['url']}" for t in taken))
    print(f"Manifest -> {manifest.name}")

    input("\nPress Enter to close browser...")
    browser.close()
