// apps/admin/src/lib/dashboard/svg.ts
// SVG chart primitives for Tile 5.
// Pure functions: take values + labels, return SVG markup string.

export interface BarLineChartProps {
  /** Values for bars; should have same length as `labels` */
  bars: number[];
  /** Values for the line; should have same length as `labels` */
  line: number[];
  /** X-axis labels */
  labels: string[];
  /** CSS color for bars */
  barColor: string;
  /** CSS color for line + dots */
  lineColor: string;
}

export interface BarChartProps {
  bars: number[];
  labels: string[];
  color: string;
}

const CHART_WIDTH = 480;
const CHART1_HEIGHT = 220;
const CHART2_HEIGHT = 160;
const PAD_TOP = 20;
const PAD_BOTTOM = 35;
const PAD_LEFT = 40;
const PAD_RIGHT_DUAL = 50;
const PAD_RIGHT_SINGLE = 15;
const TICK_DIVISIONS = 5;
const TICK_FONT = 10;
const TICK_COLOR = "#6B7280";
const GRID_COLOR = "#E5E7EB";

/**
 * Renders a combined chart: bars + line with dual y-axis (left = bars, right = line).
 */
export function renderBarLineChart(p: BarLineChartProps): string {
  const W = CHART_WIDTH;
  const H = CHART1_HEIGHT;
  const innerW = W - PAD_LEFT - PAD_RIGHT_DUAL;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const barScale = niceMax(Math.max(...p.bars, 0));
  const lineScale = niceMax(Math.max(...p.line, 0));

  const n = p.bars.length;
  const barSpacing = innerW / n;
  const barWidth = barSpacing * 0.7;

  const parts: string[] = [];
  parts.push(
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">`,
  );

  // Grid lines + dual y-axis labels
  for (let i = 0; i <= TICK_DIVISIONS; i++) {
    const frac = i / TICK_DIVISIONS;
    const y = PAD_TOP + innerH - frac * innerH;
    parts.push(
      `<line x1="${PAD_LEFT}" y1="${y}" x2="${W - PAD_RIGHT_DUAL}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="1"/>`,
      `<text x="${PAD_LEFT - 5}" y="${y + 3}" text-anchor="end" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${formatTick(frac * barScale)}</text>`,
      `<text x="${W - PAD_RIGHT_DUAL + 5}" y="${y + 3}" text-anchor="start" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${formatTick(frac * lineScale)}</text>`,
    );
  }

  // Bars
  for (let i = 0; i < n; i++) {
    const x = PAD_LEFT + i * barSpacing + (barSpacing - barWidth) / 2;
    const barH = barScale === 0 ? 0 : (p.bars[i] / barScale) * innerH;
    const y = PAD_TOP + innerH - barH;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${p.barColor}" rx="2"/>`,
    );
  }

  // Line (polyline) + dots
  const linePoints: string[] = [];
  for (let i = 0; i < n; i++) {
    const cx = PAD_LEFT + i * barSpacing + barSpacing / 2;
    const cy =
      PAD_TOP +
      innerH -
      (lineScale === 0 ? 0 : (p.line[i] / lineScale) * innerH);
    linePoints.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);
  }
  parts.push(
    `<polyline points="${linePoints.join(" ")}" fill="none" stroke="${p.lineColor}" stroke-width="2"/>`,
  );
  for (let i = 0; i < n; i++) {
    const cx = PAD_LEFT + i * barSpacing + barSpacing / 2;
    const cy =
      PAD_TOP +
      innerH -
      (lineScale === 0 ? 0 : (p.line[i] / lineScale) * innerH);
    parts.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${p.lineColor}"/>`,
    );
  }

  // X-axis labels
  for (let i = 0; i < n; i++) {
    const cx = PAD_LEFT + i * barSpacing + barSpacing / 2;
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${H - PAD_BOTTOM + 15}" text-anchor="middle" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${escapeXml(p.labels[i])}</text>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}

/**
 * Renders a simple bar chart with single y-axis.
 */
export function renderBarChart(p: BarChartProps): string {
  const W = CHART_WIDTH;
  const H = CHART2_HEIGHT;
  const innerW = W - PAD_LEFT - PAD_RIGHT_SINGLE;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const scale = niceMax(Math.max(...p.bars, 0));

  const n = p.bars.length;
  const barSpacing = innerW / n;
  const barWidth = barSpacing * 0.7;

  const parts: string[] = [];
  parts.push(
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">`,
  );

  for (let i = 0; i <= TICK_DIVISIONS; i++) {
    const frac = i / TICK_DIVISIONS;
    const y = PAD_TOP + innerH - frac * innerH;
    parts.push(
      `<line x1="${PAD_LEFT}" y1="${y}" x2="${W - PAD_RIGHT_SINGLE}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="1"/>`,
      `<text x="${PAD_LEFT - 5}" y="${y + 3}" text-anchor="end" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${formatTick(frac * scale)}</text>`,
    );
  }

  for (let i = 0; i < n; i++) {
    const x = PAD_LEFT + i * barSpacing + (barSpacing - barWidth) / 2;
    const barH = scale === 0 ? 0 : (p.bars[i] / scale) * innerH;
    const y = PAD_TOP + innerH - barH;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${p.color}" rx="2"/>`,
    );
  }

  for (let i = 0; i < n; i++) {
    const cx = PAD_LEFT + i * barSpacing + barSpacing / 2;
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${H - PAD_BOTTOM + 15}" text-anchor="middle" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${escapeXml(p.labels[i])}</text>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}

// ----- helpers -----

/**
 * Rounds n up to a "nice" value for chart y-axis.
 * Multipliers [1, 2, 5, 10] × power of 10, gives clean ticks
 * when divided by TICK_DIVISIONS (5).
 */
function niceMax(n: number): number {
  if (n <= 0) return 5;
  if (n < 1) return 1;
  const log = Math.floor(Math.log10(n));
  const magnitude = Math.pow(10, log);
  const normalized = n / magnitude;
  let multiplier: number;
  if (normalized <= 1) multiplier = 1;
  else if (normalized <= 2) multiplier = 2;
  else if (normalized <= 5) multiplier = 5;
  else multiplier = 10;
  return multiplier * magnitude;
}

function formatTick(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
