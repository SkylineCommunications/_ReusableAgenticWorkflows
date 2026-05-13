/**
 * UX Audit helpers — contrast checking, scoring, report writing.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Contrast ────────────────────────────────────────────────────────────────

function relativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

export function contrastRatio(hex1: string, hex2: string): number {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const c1 = parse(hex1);
  const c2 = parse(hex2);
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse `rgb(r, g, b)` or `rgba(r, g, b, a)` strings returned by getComputedStyle. */
export function rgbStringToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export interface AuditFinding {
  category: string;
  rule: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

export interface AuditReport {
  timestamp: string;
  appUrl: string;
  score: number;           // 0–100
  grade: string;           // A / B / C / D / F
  findings: AuditFinding[];
  improvements: string[];  // Prioritised improvement list
  screenshotPath?: string;
}

const IMPACT_WEIGHT: Record<AuditFinding['impact'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function calculateScore(findings: AuditFinding[]): number {
  const scoreable = findings.filter(f => f.status !== 'skip');
  if (scoreable.length === 0) return 100;

  let totalWeight = 0;
  let passWeight = 0;

  for (const f of scoreable) {
    const w = IMPACT_WEIGHT[f.impact];
    totalWeight += w;
    if (f.status === 'pass') passWeight += w;
    else if (f.status === 'warn') passWeight += w * 0.5;
  }

  return Math.round((passWeight / totalWeight) * 100);
}

export function gradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function buildImprovementList(findings: AuditFinding[]): string[] {
  const EMOJI: Record<string, string> = {
    'Style Guide':   '📋',
    'Accessibility': '♿',
    'UX Expert':     '👁',
    // legacy fallbacks
    'Guideline': '📋',
    'UX':        '👁',
  };
  return findings
    .filter(f => f.status === 'fail' || f.status === 'warn')
    .sort((a, b) => IMPACT_WEIGHT[b.impact] - IMPACT_WEIGHT[a.impact])
    .map(f => `[${f.impact.toUpperCase()}] ${EMOJI[f.category] ?? ''} ${f.category} — ${f.rule}: ${f.detail}`);
}

export function saveReport(report: AuditReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `ux-audit-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
  return filepath;
}
