# DataMiner LCA UX Audit

A reusable Playwright-based UX auditor for any [DataMiner Low-Code App (LCA)](https://docs.dataminer.services/dataminer/Functions/Dashboards_and_Low_Code_Apps/Low_Code_Apps/).

Visits every page of an app, waits for data to load, takes annotated screenshots, and produces a scored HTML report comparing the app against:
- The [DataMiner LCA style guide](https://docs.dataminer.services/dataminer/Functions/Dashboards_and_Low_Code_Apps/Low_Code_Apps/Style_guide.html)
- Modern UX / UI best practices (spacing, elevation, typography, status chips, …)

---

## Quick start — Copilot CLI

The easiest way to run an audit is through the Copilot CLI skill:

```
Audit this app: https://fleetops-skyline.on.dataminer.services/app/7defd98c-.../Overview
```

The `run_dataminer_ux_audit` tool is exposed as a Copilot CLI extension.  
To activate it, copy `extension/extension.mjs` to your user extensions folder:

```powershell
# Windows
$dest = "$env:USERPROFILE\.copilot\extensions\dataminer-ux-audit"
New-Item -ItemType Directory -Force $dest
Copy-Item extension\extension.mjs $dest\
```

> **Note:** The extension resolves `AUDIT_DIR` relative to its own file location, so  
> it will always point at the cloned repo folder automatically.

---

## Manual run

### 1. Install dependencies

```powershell
cd agents\dataminer-ux-audit
npm install
npx playwright install chromium
```

### 2. Authenticate (first run only, or when session expires)

A browser window will open for SAML → Microsoft login.  
The session is saved to `playwright/.auth/user.json` (gitignored) and reused for **8 hours**.

```powershell
$env:AUDIT_BASE_URL = "https://fleetops-skyline.on.dataminer.services"
$env:AUDIT_APP_URL  = "https://fleetops-skyline.on.dataminer.services/app/7defd98c-50b9-40fb-bb55-2ceba50085ef/Overview"
npx playwright test tests/auth.setup.ts --project=setup
```

### 3. Run the audit

```powershell
$env:AUDIT_APP_URL  = "https://fleetops-skyline.on.dataminer.services/app/7defd98c-50b9-40fb-bb55-2ceba50085ef/Overview"
$env:AUDIT_APP_NAME = "FleetOps"
$env:AUDIT_BASE_URL = "https://fleetops-skyline.on.dataminer.services"
npx playwright test tests/lca-ux-audit.spec.ts --project=dataminer
```

### 4. Open the report

```powershell
Start-Process results\audit-report.html
```

---

## Output

| Path | Contents |
|---|---|
| `results/audit-report.html` | Full HTML report — open in any browser |
| `results/screenshots/` | Clean + annotated PNG screenshots per page |

Screenshots and the HTML report are committed to the repo so audit results can be tracked over time.  
Only `playwright/.auth/user.json` (auth state) is gitignored.

---

## Check categories

| Prefix | Source | Colour |
|---|---|---|
| SG-xx | DataMiner Style Guide | 🔴 Red |
| A-xx | WCAG Accessibility *(disabled by default)* | 🟣 Purple |
| UX-xx | Modern UI/UX best practices | 🔵 Blue |

Toggle WCAG checks with `WCAG_ENABLED = true/false` at the top of `tests/lca-ux-audit.spec.ts`.

---

## Scoring

Each check carries a weight. The overall score is `Σ(passed weights) / Σ(total weights) × 100`.  
A grade A–F is assigned per standard thresholds (90/80/70/60).

Checks also detect open side-panels: icon buttons in table rows are clicked automatically
to capture panel screenshots.

---

## Files

```
agents/dataminer-ux-audit/
├── tests/
│   ├── lca-ux-audit.spec.ts    ← main audit spec
│   ├── ux-audit-helpers.ts     ← scoring, contrast, grade utilities
│   ├── auth.setup.ts           ← SAML + Microsoft login
│   ├── style-helpers.ts        ← style guide check helpers
│   └── dom-inspector.spec.ts   ← debug helper (inspect DOM structure)
├── playwright.config.ts
├── package.json
├── extension/
│   └── extension.mjs           ← Copilot CLI extension
├── results/                    ← audit output (committed)
│   └── screenshots/
└── playwright/.auth/           ← auth state (gitignored)
```
