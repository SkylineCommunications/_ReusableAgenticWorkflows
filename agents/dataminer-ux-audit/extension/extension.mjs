// Extension: dataminer-ux-audit
// Runs a full UX and style guide audit against any DataMiner low-code app.
// Usage: ask Copilot "audit this app: https://my-dms.on.dataminer.services/app/abc123/Overview"

import { joinSession } from "@github/copilot-sdk/extension";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve AUDIT_DIR relative to this extension file so the extension works
// wherever the repo is cloned.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_DIR = path.resolve(__dirname, "..");

function execAsync(cmd, opts) {
    return new Promise((resolve, reject) => {
        exec(cmd, opts, (err, stdout, stderr) => {
            if (err) { err.stdout = stdout; err.stderr = stderr; reject(err); }
            else resolve({ stdout, stderr });
        });
    });
}

const session = await joinSession({
    tools: [
        {
            name: "run_dataminer_ux_audit",
            description: [
                "Run a full UX and DataMiner style-guide audit against any DataMiner low-code app.",
                "Opens a headed browser for SAML/Microsoft login (skipped if a valid session exists),",
                "then visits every page, takes clean and annotated screenshots, checks all style rules,",
                "and produces an HTML report with a per-page score, improvement plan, and annotation table.",
                "Takes 3–10 minutes per app.",
            ].join(" "),
            parameters: {
                type: "object",
                properties: {
                    app_url: {
                        type: "string",
                        description: "Full URL to the DataMiner low-code app (e.g. https://my-dms.on.dataminer.services/app/abc123/Overview)",
                    },
                    app_name: {
                        type: "string",
                        description: "Human-readable name for the app, used in the report title (e.g. 'FleetOps', 'Network Monitor'). Derived from the URL if omitted.",
                    },
                },
                required: ["app_url"],
            },
            handler: async (args) => {
                const { app_url, app_name } = args;

                // Validate URL
                let parsedUrl;
                try { parsedUrl = new URL(app_url); }
                catch { return `❌ Invalid URL: "${app_url}". Provide a full URL including https://`; }

                const baseUrl = parsedUrl.origin;
                // Derive a readable app name from the URL path if not supplied
                const appName = app_name ?? (() => {
                    const parts = parsedUrl.pathname.split('/').filter(Boolean);
                    // e.g. /app/abc123/Overview → "Overview"
                    return parts[parts.length - 1] ?? parts[1] ?? "DataMiner App";
                })();

                const reportPath = path.join(AUDIT_DIR, "results", "audit-report.html");
                const shotsPath  = path.join(AUDIT_DIR, "results", "screenshots");

                await session.log(`🚀 Auditing "${appName}" on ${baseUrl}…`);
                await session.log(`   Auth: reusing session if < 8h old, otherwise a browser window will open for SAML login.`);
                await session.log(`   Estimated time: 3–10 minutes.`);

                const env = {
                    ...process.env,
                    AUDIT_APP_URL:  app_url,
                    AUDIT_APP_NAME: appName,
                    AUDIT_BASE_URL: baseUrl,
                };

                let stdout = "", stderr = "";
                try {
                    const result = await execAsync(
                        "npx playwright test tests/lca-ux-audit.spec.ts --project=dataminer",
                        { cwd: AUDIT_DIR, env, timeout: 660_000 }
                    );
                    stdout = result.stdout ?? "";
                    stderr = result.stderr ?? "";
                } catch (err) {
                    stdout = err.stdout ?? "";
                    stderr = err.stderr ?? "";
                    const out = stdout + stderr;
                    if (out.includes("browserType.launch") || out.includes("Executable doesn't exist")) {
                        return "❌ Playwright browsers not installed.\nRun:  cd " + AUDIT_DIR + "  &&  npx playwright install chromium";
                    }
                    if (out.includes("storageState") || out.includes("user.json") || out.match(/auth|login|sign.?in/i)) {
                        return [
                            "⚠️  Authentication session missing or expired.",
                            "Run the login setup first:",
                            `  cd ${AUDIT_DIR}`,
                            `  $env:AUDIT_BASE_URL="${baseUrl}"`,
                            `  $env:AUDIT_APP_URL="${app_url}"`,
                            `  npx playwright test --project=setup`,
                            "Then ask me to audit the app again.",
                        ].join("\n");
                    }
                    // Surface the actual error so it can be diagnosed
                    return `❌ Audit failed.\n\n${out.slice(0, 1200)}`;
                }

                const scoreMatch = stdout.match(/OVERALL SCORE:\s*(\d+)\/100\s+Grade\s+(\S+)/);
                const score = scoreMatch ? `${scoreMatch[1]}/100 — Grade ${scoreMatch[2]}` : "see report";

                return [
                    `✅ Audit complete — "${appName}"`,
                    `📊 Overall score: ${score}`,
                    ``,
                    `📄 HTML report (open in browser):`,
                    `   ${reportPath}`,
                    ``,
                    `📸 Annotated screenshots:`,
                    `   ${shotsPath}`,
                    ``,
                    `The HTML report includes:`,
                    `  • Per-page annotated screenshots with numbered boxes`,
                    `  • A table under each screenshot explaining every box and the exact fix`,
                    `  • A ranked improvement plan showing which fixes give the biggest score gain`,
                ].join("\n");
            },
        },
    ],
});
