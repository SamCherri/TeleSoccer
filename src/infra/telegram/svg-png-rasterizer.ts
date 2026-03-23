const { deflateSync } = require('zlib') as { deflateSync: (input: Uint8Array) => Uint8Array };

/**
 * Rasterizador propositalmente limitado ao subset SVG usado pelos placeholders
 * atuais do TeleSoccer no Telegram.
 *
 * Escopo suportado neste arquivo:
 * - rect
 * - circle
 * - line
 * - path
 * - text
 * - image com `data:image/svg+xml;utf8,`
 * - linearGradient do placeholder atual
 * - transform básico: translate / scale / rotate
 *
 * Fora de escopo:
 * - renderização SVG completa/CSS completa
 * - filtros, máscaras, clipPath, stroke-linecap/linejoin avançados
 * - gradientes complexos, patterns, foreignObject, imagens remotas
 *
 * Se o SVG placeholder mudar para usar recursos fora deste subset, os testes
 * desta camada devem falhar e o rasterizador deve ser evoluído junto.
 */
type Color = readonly [number, number, number, number];
type Matrix = readonly [number, number, number, number, number, number];
type Paint = { kind: 'color'; color: Color } | { kind: 'linearGradient'; gradient: LinearGradient };

interface LinearGradient {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: Array<{ offset: number; color: string }>;
}

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text?: string;
}

interface RenderState {
  matrix: Matrix;
  opacity: number;
  color: string;
  gradients: Record<string, LinearGradient>;
}

const identity: Matrix = [1, 0, 0, 1, 0, 0];
const font: Record<string, string[]> = {
  A: ['01110','10001','10001','11111','10001','10001','10001'], B: ['11110','10001','11110','10001','10001','10001','11110'],
  C: ['01110','10001','10000','10000','10000','10001','01110'], D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','11110','10000','10000','10000','11111'], F: ['11111','10000','11110','10000','10000','10000','10000'],
  G: ['01110','10001','10000','10111','10001','10001','01110'], H: ['10001','10001','11111','10001','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'], J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','11100','10010','10010','10001','10001'], L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10001','10001','10001','10001'], N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'], P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'], R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'], T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'], V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10001','10101','11011','10001'], X: ['10001','01010','00100','00100','00100','01010','10001'],
  Y: ['10001','01010','00100','00100','00100','00100','00100'], Z: ['11111','00001','00010','00100','01000','10000','11111'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'], '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'], '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'], '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'], '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'], '9': ['01110','10001','10001','01111','00001','00001','01110'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'], ':': ['00000','00100','00100','00000','00100','00100','00000'],
  '.': ['00000','00000','00000','00000','00000','00110','00110'], "'": ['00100','00100','00000','00000','00000','00000','00000'],
  '/': ['00001','00010','00100','01000','10000','00000','00000'], '(': ['00010','00100','01000','01000','01000','00100','00010'],
  ')': ['01000','00100','00010','00010','00010','00100','01000'], ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  XLOW: ['10001','01010','00100','01010','10001','00000','00000']
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const createCanvas = (width: number, height: number, color: Color): Uint8Array => {
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) pixels.set(color, i * 4);
  return pixels;
};

const setPixel = (pixels: Uint8Array, width: number, height: number, x: number, y: number, color: Color): void => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const idx = (y * width + x) * 4;
  pixels[idx] = color[0]; pixels[idx + 1] = color[1]; pixels[idx + 2] = color[2]; pixels[idx + 3] = color[3];
};

const fillRect = (pixels: Uint8Array, width: number, height: number, x: number, y: number, w: number, h: number, color: Color): void => {
  for (let py = Math.max(0, y); py < Math.min(height, y + h); py += 1) for (let px = Math.max(0, x); px < Math.min(width, x + w); px += 1) setPixel(pixels, width, height, px, py, color);
};

const mixColor = (start: Color, end: Color, t: number): Color => [
  Math.round(start[0] + (end[0] - start[0]) * t),
  Math.round(start[1] + (end[1] - start[1]) * t),
  Math.round(start[2] + (end[2] - start[2]) * t),
  Math.round(start[3] + (end[3] - start[3]) * t)
];

const fillRectLinearGradient = (
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  start: Color,
  end: Color,
  gradient: LinearGradient
): void => {
  const gx = gradient.x2 - gradient.x1;
  const gy = gradient.y2 - gradient.y1;
  const denominator = gx * gx + gy * gy || 1;
  for (let py = Math.max(0, y); py < Math.min(height, y + h); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(width, x + w); px += 1) {
      const localX = w <= 1 ? 0 : (px - x) / Math.max(1, w - 1);
      const localY = h <= 1 ? 0 : (py - y) / Math.max(1, h - 1);
      const t = Math.max(0, Math.min(1, ((localX - gradient.x1) * gx + (localY - gradient.y1) * gy) / denominator));
      setPixel(pixels, width, height, px, py, mixColor(start, end, t));
    }
  }
};

const strokeRect = (pixels: Uint8Array, width: number, height: number, x: number, y: number, w: number, h: number, thickness: number, color: Color): void => {
  fillRect(pixels, width, height, x, y, w, thickness, color); fillRect(pixels, width, height, x, y + h - thickness, w, thickness, color);
  fillRect(pixels, width, height, x, y, thickness, h, color); fillRect(pixels, width, height, x + w - thickness, y, thickness, h, color);
};

const fillCircle = (pixels: Uint8Array, width: number, height: number, cx: number, cy: number, r: number, color: Color): void => {
  for (let y = -r; y <= r; y += 1) for (let x = -r; x <= r; x += 1) if (x * x + y * y <= r * r) setPixel(pixels, width, height, cx + x, cy + y, color);
};

const normalizeText = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/×/g, 'X').replace(/•/g, ' ');

const drawChar = (pixels: Uint8Array, width: number, height: number, x: number, y: number, scale: number, char: string, color: Color): number => {
  const glyph = font[char] ?? font[' '];
  glyph.forEach((row, rowIndex) => [...row].forEach((cell, colIndex) => { if (cell === '1') fillRect(pixels, width, height, x + colIndex * scale, y + rowIndex * scale, scale, scale, color); }));
  return glyph[0].length * scale + scale;
};

const drawText = (pixels: Uint8Array, width: number, height: number, x: number, y: number, scale: number, text: string, color: Color, anchor: 'start' | 'middle' | 'end' = 'start'): void => {
  const normalized = normalizeText(text);
  const glyphWidth = [...normalized].reduce((sum, char) => sum + ((font[char] ?? font[' '])[0].length * scale + scale), 0);
  let cursor = anchor === 'middle' ? x - Math.floor(glyphWidth / 2) : anchor === 'end' ? x - glyphWidth : x;
  for (const char of normalized) cursor += drawChar(pixels, width, height, cursor, y, scale, char, color);
};

const mul = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5]
];
const apply = (m: Matrix, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const scale = (x: number, y: number): Matrix => [x, 0, 0, y, 0, 0];
const rotate = (deg: number): Matrix => { const r = deg * Math.PI / 180; const c = Math.cos(r); const s = Math.sin(r); return [c, s, -s, c, 0, 0]; };

const parseAttributes = (input: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  input.replace(/([\w:-]+)="([^"]*)"/g, (_, key, value) => { attrs[key] = value; return ''; });
  return attrs;
};

const parseXml = (svg: string): XmlNode => {
  const root: XmlNode = { name: 'root', attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  const tokens = svg.match(/<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (token.startsWith('<?') || token.startsWith('<!')) continue;
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const content = token.slice(1, token.length - (selfClosing ? 2 : 1)).trim();
      const space = content.indexOf(' ');
      const name = (space === -1 ? content : content.slice(0, space)).trim();
      const attrs = parseAttributes(space === -1 ? '' : content.slice(space + 1));
      const node: XmlNode = { name, attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    } else if (token.trim()) {
      stack[stack.length - 1].children.push({ name: '#text', attrs: {}, children: [], text: token.trim() });
    }
  }
  return root.children[0];
};

const parseUnitInterval = (input: string | undefined, fallback: number): number => {
  if (!input) return fallback;
  if (input.endsWith('%')) return Number(input.slice(0, -1)) / 100;
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
};

const parseColor = (input: string | undefined, state: RenderState): Color | null => {
  if (!input || input === 'none') return null;
  if (input === 'currentColor') return parseColor(state.color, state);
  if (input.startsWith('url(#')) {
    const id = input.slice(5, -1);
    const gradient = state.gradients[id];
    return parseColor(gradient?.stops[0]?.color ?? '#ffffff', state);
  }
  if (input.startsWith('#')) {
    const hex = input.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), Math.round(255 * state.opacity)];
  }
  if (input.startsWith('rgba')) {
    const [r, g, b, a] = input.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
    return [r, g, b, Math.round(255 * a * state.opacity)];
  }
  if (input.startsWith('rgb')) {
    const [r, g, b] = input.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    return [r, g, b, Math.round(255 * state.opacity)];
  }
  return null;
};

const parsePaint = (input: string | undefined, state: RenderState): Paint | null => {
  if (!input || input === 'none') return null;
  if (input.startsWith('url(#')) {
    const id = input.slice(5, -1);
    const gradient = state.gradients[id];
    if (gradient) return { kind: 'linearGradient', gradient };
  }
  const color = parseColor(input, state);
  return color ? { kind: 'color', color } : null;
};

const parseTransform = (input: string | undefined): Matrix => {
  if (!input) return identity;
  let result = identity;
  const matches = [...input.matchAll(/(translate|scale|rotate)\(([^)]+)\)/g)];
  for (const [, kind, rawValues] of matches) {
    const values = rawValues.split(/[ ,]+/).filter(Boolean).map(Number);
    if (kind === 'translate') result = mul(result, translate(values[0] ?? 0, values[1] ?? 0));
    if (kind === 'scale') result = mul(result, scale(values[0] ?? 1, values[1] ?? values[0] ?? 1));
    if (kind === 'rotate') {
      const base = rotate(values[0] ?? 0);
      if (values.length >= 3) result = mul(result, mul(translate(values[1], values[2]), mul(base, translate(-values[1], -values[2]))));
      else result = mul(result, base);
    }
  }
  return result;
};

const drawSegment = (pixels: Uint8Array, width: number, height: number, from: { x: number; y: number }, to: { x: number; y: number }, stroke: Color, strokeWidth: number): void => {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(from.x + (to.x - from.x) * t);
    const y = Math.round(from.y + (to.y - from.y) * t);
    fillCircle(pixels, width, height, x, y, Math.max(1, Math.round(strokeWidth / 2)), stroke);
  }
};

const fillPolygon = (pixels: Uint8Array, width: number, height: number, points: Array<{ x: number; y: number }>, color: Color): void => {
  if (points.length < 3) return;
  let minY = Math.floor(Math.min(...points.map((p) => p.y)));
  let maxY = Math.ceil(Math.max(...points.map((p) => p.y)));
  for (let y = minY; y <= maxY; y += 1) {
    const intersections: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a.y > y) !== (b.y > y)) intersections.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) fillRect(pixels, width, height, Math.floor(intersections[i]), y, Math.ceil(intersections[i + 1] - intersections[i]), 1, color);
  }
};

const approximatePath = (d: string, matrix: Matrix): Array<Array<{ x: number; y: number }>> => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];
  const paths: Array<Array<{ x: number; y: number }>> = [];
  let index = 0; let cmd = 'M'; let current = { x: 0, y: 0 }; let start = { x: 0, y: 0 }; let active: Array<{ x: number; y: number }> = [];
  const next = () => Number(tokens[index++]);
  const point = (x: number, y: number) => apply(matrix, x, y);
  while (index < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[index])) cmd = tokens[index++];
    const relative = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();
    if (upper === 'M') {
      current = { x: (relative ? current.x : 0) + next(), y: (relative ? current.y : 0) + next() };
      start = { ...current }; active = [point(current.x, current.y)]; paths.push(active); cmd = relative ? 'l' : 'L';
    } else if (upper === 'L') {
      current = { x: (relative ? current.x : 0) + next(), y: (relative ? current.y : 0) + next() };
      active.push(point(current.x, current.y));
    } else if (upper === 'H') {
      current = { x: (relative ? current.x : 0) + next(), y: current.y }; active.push(point(current.x, current.y));
    } else if (upper === 'V') {
      current = { x: current.x, y: (relative ? current.y : 0) + next() }; active.push(point(current.x, current.y));
    } else if (upper === 'Q' || upper === 'C') {
      const p0 = { ...current };
      const cp1 = { x: (relative ? current.x : 0) + next(), y: (relative ? current.y : 0) + next() };
      const cp2 = upper === 'C' ? { x: (relative ? current.x : 0) + next(), y: (relative ? current.y : 0) + next() } : cp1;
      const end = { x: (relative ? current.x : 0) + next(), y: (relative ? current.y : 0) + next() };
      for (let t = 0.05; t <= 1.001; t += 0.05) {
        const x = upper === 'C'
          ? (1 - t) ** 3 * p0.x + 3 * (1 - t) ** 2 * t * cp1.x + 3 * (1 - t) * t * t * cp2.x + t ** 3 * end.x
          : (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * cp1.x + t ** 2 * end.x;
        const y = upper === 'C'
          ? (1 - t) ** 3 * p0.y + 3 * (1 - t) ** 2 * t * cp1.y + 3 * (1 - t) * t * t * cp2.y + t ** 3 * end.y
          : (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * cp1.y + t ** 2 * end.y;
        active.push(point(x, y));
      }
      current = end;
    } else if (upper === 'Z') {
      active.push(point(start.x, start.y)); current = start;
    } else {
      index += 1;
    }
  }
  return paths.filter((path) => path.length > 0);
};

const renderNode = (node: XmlNode, pixels: Uint8Array, width: number, height: number, state: RenderState): void => {
  const nextState: RenderState = {
    matrix: mul(state.matrix, parseTransform(node.attrs.transform)),
    opacity: state.opacity * Number(node.attrs.opacity ?? 1),
    color: node.attrs.color ?? state.color,
    gradients: state.gradients
  };

  if (node.name === 'defs') {
    node.children.forEach((child) => {
      if (child.name === 'linearGradient' && child.attrs.id) {
        const stops = child.children.filter((item) => item.name === 'stop');
        nextState.gradients[child.attrs.id] = {
          x1: parseUnitInterval(child.attrs.x1, 0),
          y1: parseUnitInterval(child.attrs.y1, 0),
          x2: parseUnitInterval(child.attrs.x2, 1),
          y2: parseUnitInterval(child.attrs.y2, 0),
          stops: stops.map((stop) => ({
            offset: parseUnitInterval(stop.attrs.offset, 0),
            color: stop.attrs['stop-color'] ?? '#ffffff'
          }))
        };
      }
    });
    return;
  }

  if (node.name === 'svg' || node.name === 'g') { node.children.forEach((child) => renderNode(child, pixels, width, height, nextState)); return; }
  if (node.name === '#text' || !node.name) return;

  const fill = parsePaint(node.attrs.fill, nextState);
  const stroke = parseColor(node.attrs.stroke, nextState);
  const strokeWidth = Number(node.attrs['stroke-width'] ?? 1);

  if (node.name === 'rect') {
    const p = apply(nextState.matrix, Number(node.attrs.x ?? 0), Number(node.attrs.y ?? 0));
    const w = Math.round(Number(node.attrs.width ?? 0) * nextState.matrix[0]);
    const h = Math.round(Number(node.attrs.height ?? 0) * nextState.matrix[3]);
    if (fill?.kind === 'color') fillRect(pixels, width, height, Math.round(p.x), Math.round(p.y), w, h, fill.color);
    if (fill?.kind === 'linearGradient') {
      const firstStop = fill.gradient.stops[0]?.color ?? '#ffffff';
      const lastStop = fill.gradient.stops.at(-1)?.color ?? firstStop;
      fillRectLinearGradient(
        pixels,
        width,
        height,
        Math.round(p.x),
        Math.round(p.y),
        w,
        h,
        parseColor(firstStop, nextState) ?? [255, 255, 255, 255],
        parseColor(lastStop, nextState) ?? [255, 255, 255, 255],
        fill.gradient
      );
    }
    if (stroke) strokeRect(pixels, width, height, Math.round(p.x), Math.round(p.y), w, h, Math.max(1, Math.round(strokeWidth)), stroke);
  } else if (node.name === 'circle') {
    const p = apply(nextState.matrix, Number(node.attrs.cx ?? 0), Number(node.attrs.cy ?? 0));
    const r = Math.max(1, Math.round(Number(node.attrs.r ?? 0) * Math.abs(nextState.matrix[0])));
    if (fill?.kind === 'color') fillCircle(pixels, width, height, Math.round(p.x), Math.round(p.y), r, fill.color);
  } else if (node.name === 'line') {
    if (!stroke) return;
    const a = apply(nextState.matrix, Number(node.attrs.x1 ?? 0), Number(node.attrs.y1 ?? 0));
    const b = apply(nextState.matrix, Number(node.attrs.x2 ?? 0), Number(node.attrs.y2 ?? 0));
    drawSegment(pixels, width, height, a, b, stroke, Math.max(1, Math.round(strokeWidth)));
  } else if (node.name === 'path') {
    const paths = approximatePath(node.attrs.d ?? '', nextState.matrix);
    if (fill?.kind === 'color') paths.forEach((path) => fillPolygon(pixels, width, height, path, fill.color));
    if (stroke) paths.forEach((path) => path.slice(1).forEach((point, index) => drawSegment(pixels, width, height, path[index], point, stroke, Math.max(1, Math.round(strokeWidth)))));
  } else if (node.name === 'text') {
    const text = node.children.filter((child) => child.name === '#text').map((child) => child.text ?? '').join('');
    const p = apply(nextState.matrix, Number(node.attrs.x ?? 0), Number(node.attrs.y ?? 0));
    const fontSize = Number(node.attrs['font-size'] ?? 16);
    const scaleSize = Math.max(1, Math.round(fontSize / 8));
    drawText(
      pixels,
      width,
      height,
      Math.round(p.x),
      Math.round(p.y),
      scaleSize,
      text,
      fill?.kind === 'color' ? fill.color : parseColor('#ffffff', nextState)!,
      (node.attrs['text-anchor'] as 'start' | 'middle' | 'end') ?? 'start'
    );
  } else if (node.name === 'image' && node.attrs.href?.startsWith('data:image/svg+xml;utf8,')) {
    // Mantido intencionalmente restrito ao uso atual do placeholder: SVG inline
    // embutido por data URI. Não há suporte a imagens remotas/raster externas.
    const innerSvg = decodeURIComponent(node.attrs.href.slice('data:image/svg+xml;utf8,'.length));
    const inner = rasterizeSvgToCanvas(innerSvg, Math.round(Number(node.attrs.width ?? 1)), Math.round(Number(node.attrs.height ?? 1)));
    const p = apply(nextState.matrix, Number(node.attrs.x ?? 0), Number(node.attrs.y ?? 0));
    for (let y = 0; y < inner.height; y += 1) for (let x = 0; x < inner.width; x += 1) {
      const idx = (y * inner.width + x) * 4;
      setPixel(pixels, width, height, Math.round(p.x) + x, Math.round(p.y) + y, [inner.pixels[idx], inner.pixels[idx + 1], inner.pixels[idx + 2], inner.pixels[idx + 3]]);
    }
  }
};

const rasterizeSvgToCanvas = (svg: string, widthOverride?: number, heightOverride?: number): { width: number; height: number; pixels: Uint8Array } => {
  const tree = parseXml(svg);
  const viewBox = (tree.attrs.viewBox ?? `0 0 ${tree.attrs.width ?? widthOverride ?? 640} ${tree.attrs.height ?? heightOverride ?? 360}`).split(/\s+/).map(Number);
  const width = widthOverride ?? Math.round(viewBox[2]);
  const height = heightOverride ?? Math.round(viewBox[3]);
  const scaleMatrix: Matrix = [width / viewBox[2], 0, 0, height / viewBox[3], -viewBox[0] * width / viewBox[2], -viewBox[1] * height / viewBox[3]];
  const pixels = createCanvas(width, height, [255, 255, 255, 0]);
  renderNode(tree, pixels, width, height, { matrix: scaleMatrix, opacity: 1, color: '#ffffff', gradients: {} });
  return { width, height, pixels };
};

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length); out.set(typeBytes, 4); out.set(data, 8); view.setUint32(out.length - 4, crc32(out.slice(4, out.length - 4)));
  return out;
};

const encodePng = (width: number, height: number, pixels: Uint8Array): Uint8Array => {
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13); const view = new DataView(ihdr.buffer);
  view.setUint32(0, width); view.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) { raw[y * (1 + width * 4)] = 0; raw.set(pixels.slice(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1); }
  const compressed = deflateSync(raw);
  const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', new Uint8Array())];
  const total = parts.reduce((sum, part) => sum + part.length, 0); const out = new Uint8Array(total); let offset = 0; parts.forEach((part) => { out.set(part, offset); offset += part.length; });
  return out;
};

export interface RasterizedTelegramScene { width: number; height: number; png: Uint8Array; }

export const rasterizeTelegramSceneSvgToPng = (svg: string): RasterizedTelegramScene => {
  const canvas = rasterizeSvgToCanvas(svg);
  return { width: canvas.width, height: canvas.height, png: encodePng(canvas.width, canvas.height, canvas.pixels) };
};
