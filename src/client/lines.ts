// Official MTA line colors and display names
export interface LineStyle {
  bg: string;
  text: string;
  label: string;
}

const LINE_STYLES: Record<string, LineStyle> = {
  '1': { bg: '#EE352E', text: '#fff', label: '1' },
  '2': { bg: '#EE352E', text: '#fff', label: '2' },
  '3': { bg: '#EE352E', text: '#fff', label: '3' },
  '4': { bg: '#00933C', text: '#fff', label: '4' },
  '5': { bg: '#00933C', text: '#fff', label: '5' },
  '5X': { bg: '#00933C', text: '#fff', label: '5' },
  '6': { bg: '#00933C', text: '#fff', label: '6' },
  '6X': { bg: '#00933C', text: '#fff', label: '6' },
  '7': { bg: '#B933AD', text: '#fff', label: '7' },
  '7X': { bg: '#B933AD', text: '#fff', label: '7' },
  A: { bg: '#0039A6', text: '#fff', label: 'A' },
  C: { bg: '#0039A6', text: '#fff', label: 'C' },
  E: { bg: '#0039A6', text: '#fff', label: 'E' },
  B: { bg: '#FF6319', text: '#fff', label: 'B' },
  D: { bg: '#FF6319', text: '#fff', label: 'D' },
  F: { bg: '#FF6319', text: '#fff', label: 'F' },
  FX: { bg: '#FF6319', text: '#fff', label: 'F' },
  M: { bg: '#FF6319', text: '#fff', label: 'M' },
  G: { bg: '#6CBE45', text: '#fff', label: 'G' },
  J: { bg: '#996633', text: '#fff', label: 'J' },
  Z: { bg: '#996633', text: '#fff', label: 'Z' },
  L: { bg: '#A7A9AC', text: '#fff', label: 'L' },
  N: { bg: '#FCCC0A', text: '#000', label: 'N' },
  Q: { bg: '#FCCC0A', text: '#000', label: 'Q' },
  R: { bg: '#FCCC0A', text: '#000', label: 'R' },
  W: { bg: '#FCCC0A', text: '#000', label: 'W' },
  GS: { bg: '#808183', text: '#fff', label: 'S' },
  FS: { bg: '#808183', text: '#fff', label: 'S' },
  H: { bg: '#808183', text: '#fff', label: 'S' },
  SI: { bg: '#0039A6', text: '#fff', label: 'SI' },
};

const DEFAULT_STYLE: LineStyle = { bg: '#333', text: '#fff', label: '?' };

export function getLineStyle(line: string): LineStyle {
  return LINE_STYLES[line] ?? DEFAULT_STYLE;
}

export function createLineBullet(line: string): HTMLElement {
  const style = getLineStyle(line);
  const el = document.createElement('span');
  el.className = 'line-bullet';
  el.textContent = style.label;
  el.style.setProperty('--bg', style.bg);
  el.style.setProperty('--fg', style.text);
  return el;
}

// Normalize display routes: deduplicate express variants for UI lists
export function displayRoutes(routes: string[]): string[] {
  const seen = new Set<string>();
  return routes.filter((r) => {
    const label = getLineStyle(r).label;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}
