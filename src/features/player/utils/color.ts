function normalizeHex(input: string): string | null {
  const value = input.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(value)) return [...value].map(char => char + char).join('');
  if (/^[0-9a-f]{6}$/i.test(value)) return value;
  return null;
}

function rgbFromHex(hex: string): [number, number, number] | null {
  const value = normalizeHex(hex);
  if (!value) return null;
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map(value => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('')}`;
}

export function adjustColorBrightness(hex: string, amount: number): string {
  const rgb = rgbFromHex(hex);
  return rgb ? toHex(rgb.map(value => value + amount) as [number, number, number]) : '#ffffff';
}

export function adjustColorBrightnessHSV(hex: string, amount: number): string {
  const rgb = rgbFromHex(hex);
  if (!rgb) return '#ffffff';
  const max = Math.max(...rgb);
  const target = Math.min(255, Math.max(0, max + amount * 2.55));
  return toHex(rgb.map(value => max === 0 ? target : value * target / max) as [number, number, number]);
}

export function hexToRgbString(hex: string): string | null {
  return rgbFromHex(hex)?.join(',') ?? null;
}
