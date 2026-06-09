// apps/admin/src/lib/dashboard/svg.ts
// SVG chart primitives for Tile 5.
// Pure functions: take values + labels, return SVG markup string.
//
// Tooltips via native SVG <title> elements — browser shows them on hover
// after ~500ms. Zero JS, accessible to screen readers.

export interface BarLineChartProps {
  bars: number[];
  line: number[];
  labels: string[];
  barColor: string;
  lineColor: string;
  /** e.g. "Total visits" — shown in tooltip on bars */
  barTooltipLabel: string;
  /** e.g. "Unique students" — shown in tooltip on dots */
  lineTooltipLabel: string;
}

export interface StackedBarChartProps {
  /** bars[monthIdx][segmentIdx] = value for that month/segment */
  bars: number[][];
  /** Color per segment index */
  segmentColors: string[];
  /** Label per segment index (shown in tooltip) */
  segmentLabels: string[];
  /** X-axis labels per month */
  labels: string[];
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

/** Categorical palette for studios; cycles if >10 studios. */
export const STUDIO_COLORS = [
  "#8B5CF6", // violet-500
  "#F59E0B", // amber-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#EF4444", // red-500
  "#D946EF", // fuchsia-500
  "#84CC16", // lime-500
  "#0EA5E9", // sky-500
];

export function getStudioColor(index: number): string {
  return STUDIO_COLORS[index % STUDIO_COLORS.length];
}

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

  for (let i = 0; i <= TICK_DIVISIONS; i++) {
    const frac = i / TICK_DIVISIONS;
    const y = PAD_TOP + innerH - frac * innerH;
    parts.push(
      `<line x1="${PAD_LEFT}" y1="${y}" x2="${W - PAD_RIGHT_DUAL}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="1"/>`,
      `<text x="${PAD_LEFT - 5}" y="${y + 3}" text-anchor="end" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${formatTick(frac * barScale)}</text>`,
      `<text x="${W - PAD_RIGHT_DUAL + 5}" y="${y + 3}" text-anchor="start" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${formatTick(frac * lineScale)}</text>`,
    );
  }

  // Bars with tooltips
  for (let i = 0; i < n; i++) {
    const x = PAD_LEFT + i * barSpacing + (barSpacing - barWidth) / 2;
    const barH = barScale === 0 ? 0 : (p.bars[i] / barScale) * innerH;
    const y = PAD_TOP + innerH - barH;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${p.barColor}" rx="2"><title>${escapeXml(p.barTooltipLabel)} (${escapeXml(p.labels[i])}): ${p.bars[i]}</title></rect>`,
    );
  }

  // Line (no tooltip — dots carry it)
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

  // Dots with tooltips (bumped radius from 3 to 4 for easier hover)
  for (let i = 0; i < n; i++) {
    const cx = PAD_LEFT + i * barSpacing + barSpacing / 2;
    const cy =
      PAD_TOP +
      innerH -
      (lineScale === 0 ? 0 : (p.line[i] / lineScale) * innerH);
    parts.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${p.lineColor}"><title>${escapeXml(p.lineTooltipLabel)} (${escapeXml(p.labels[i])}): ${p.line[i]}</title></circle>`,
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
 * Renders a stacked bar chart with one bar per month and N segments per bar.
 * Each segment has its own tooltip.
 */
export function renderStackedBarChart(p: StackedBarChartProps): string {
  const W = CHART_WIDTH;
  const H = CHART2_HEIGHT;
  const innerW = W - PAD_LEFT - PAD_RIGHT_SINGLE;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  // Per-month totals = sum of segments
  const totals = p.bars.map((segments) =>
    segments.reduce((sum, v) => sum + v, 0),
  );
  const scale = niceMax(Math.max(...totals, 0));

  const n = p.bars.length;
  const barSpacing = innerW / n;
  const barWidth = barSpacing * 0.7;

  const parts: string[] = [];
  parts.push(
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">`,
  );

  // Grid + y-axis labels
  for (let i = 0; i <= TICK_DIVISIONS; i++) {
    const frac = i / TICK_DIVISIONS;
    const y = PAD_TOP + innerH - frac * innerH;
    parts.push(
      `<line x1="${PAD_LEFT}" y1="${y}" x2="${W - PAD_RIGHT_SINGLE}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="1"/>`,
      `<text x="${PAD_LEFT - 5}" y="${y + 3}" text-anchor="end" font-size="${TICK_FONT}" fill="${TICK_COLOR}">${formatTick(frac * scale)}</text>`,
    );
  }

  // Stacked bars: render from bottom up, skipping zero-value segments
  for (let monthIdx = 0; monthIdx < n; monthIdx++) {
    const x = PAD_LEFT + monthIdx * barSpacing + (barSpacing - barWidth) / 2;
    let yCursor = PAD_TOP + innerH; // bottom of chart area

    for (let segIdx = 0; segIdx < p.bars[monthIdx].length; segIdx++) {
      const value = p.bars[monthIdx][segIdx];
      if (value === 0) continue;
      const segHeight = scale === 0 ? 0 : (value / scale) * innerH;
      const y = yCursor - segHeight;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${segHeight.toFixed(1)}" fill="${p.segmentColors[segIdx]}"><title>${escapeXml(p.segmentLabels[segIdx])} (${escapeXml(p.labels[monthIdx])}): ${value}</title></rect>`,
      );
      yCursor = y;
    }
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

// ----- helpers -----

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
