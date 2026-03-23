import { TelegramScenePayload } from './types';

const { deflateSync } = require('zlib') as { deflateSync: (input: Uint8Array) => Uint8Array };

const WIDTH = 1080;
const HEIGHT = 1350;

const palette = {
  background: [8, 19, 31, 255],
  panel: [15, 34, 51, 255],
  panelAlt: [18, 48, 72, 255],
  border: [36, 73, 100, 255],
  text: [248, 251, 255, 255],
  muted: [152, 183, 206, 255],
  energy: [0, 208, 255, 255],
  warning: [255, 212, 59, 255],
  accent: [126, 240, 198, 255],
  pitch: [31, 143, 90, 255],
  pitchDark: [24, 116, 72, 255],
  home: [47, 155, 255, 255],
  away: [255, 93, 115, 255],
  white: [255, 255, 255, 255],
  black: [12, 20, 30, 255]
} as const;

type Color = readonly [number, number, number, number];

const font: Record<string, string[]> = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','11110','10001','10001','10001','11110'],
  C: ['01110','10001','10000','10000','10000','10001','01110'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','11110','10000','10000','10000','11111'],
  F: ['11111','10000','11110','10000','10000','10000','10000'],
  G: ['01110','10001','10000','10111','10001','10001','01110'],
  H: ['10001','10001','11111','10001','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','11100','10010','10010','10001','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10001','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10001','10101','11011','10001'],
  X: ['10001','01010','00100','00100','00100','01010','10001'],
  Y: ['10001','01010','00100','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00001','01110'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  ':': ['00000','00100','00100','00000','00100','00100','00000'],
  '.': ['00000','00000','00000','00000','00000','00110','00110'],
  "'": ['00100','00100','00000','00000','00000','00000','00000'],
  '/': ['00001','00010','00100','01000','10000','00000','00000'],
  '(': ['00010','00100','01000','01000','01000','00100','00010'],
  ')': ['01000','00100','00010','00010','00010','00100','01000'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000']
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

const setPixel = (pixels: Uint8Array, width: number, x: number, y: number, color: Color): void => {
  if (x < 0 || y < 0 || x >= width) return;
  const height = pixels.length / 4 / width;
  if (y >= height) return;
  const idx = (y * width + x) * 4;
  pixels[idx] = color[0]; pixels[idx + 1] = color[1]; pixels[idx + 2] = color[2]; pixels[idx + 3] = color[3];
};

const fillRect = (pixels: Uint8Array, width: number, x: number, y: number, w: number, h: number, color: Color): void => {
  for (let py = y; py < y + h; py += 1) for (let px = x; px < x + w; px += 1) setPixel(pixels, width, px, py, color);
};

const strokeRect = (pixels: Uint8Array, width: number, x: number, y: number, w: number, h: number, thickness: number, color: Color): void => {
  fillRect(pixels, width, x, y, w, thickness, color);
  fillRect(pixels, width, x, y + h - thickness, w, thickness, color);
  fillRect(pixels, width, x, y, thickness, h, color);
  fillRect(pixels, width, x + w - thickness, y, thickness, h, color);
};

const fillCircle = (pixels: Uint8Array, width: number, cx: number, cy: number, r: number, color: Color): void => {
  for (let y = -r; y <= r; y += 1) for (let x = -r; x <= r; x += 1) if (x * x + y * y <= r * r) setPixel(pixels, width, cx + x, cy + y, color);
};

const normalizeText = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const drawChar = (pixels: Uint8Array, width: number, x: number, y: number, scale: number, char: string, color: Color): number => {
  const glyph = font[char] ?? font[' '];
  glyph.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      if (cell === '1') fillRect(pixels, width, x + colIndex * scale, y + rowIndex * scale, scale, scale, color);
    });
  });
  return glyph[0].length * scale + scale;
};

const drawText = (pixels: Uint8Array, width: number, x: number, y: number, scale: number, text: string, color: Color): void => {
  let cursor = x;
  for (const char of normalizeText(text)) cursor += drawChar(pixels, width, cursor, y, scale, char, color);
};

const drawPitch = (pixels: Uint8Array, width: number, x: number, y: number, w: number, h: number): void => {
  fillRect(pixels, width, x, y, w, h, palette.pitch);
  fillRect(pixels, width, x, y + Math.floor(h * 0.45), w, Math.max(4, Math.floor(h * 0.1)), palette.pitchDark);
  strokeRect(pixels, width, x + 8, y + 8, w - 16, h - 16, 4, palette.white);
  fillRect(pixels, width, x + Math.floor(w / 2) - 2, y + 8, 4, h - 16, palette.white);
  fillCircle(pixels, width, x + Math.floor(w / 2), y + Math.floor(h / 2), 18, palette.white);
  fillCircle(pixels, width, x + Math.floor(w / 2), y + Math.floor(h / 2), 14, palette.pitch);
};

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  view.setUint32(out.length - 4, crc32(out.slice(4, out.length - 4)));
  return out;
};

const encodePng = (width: number, height: number, pixels: Uint8Array): Uint8Array => {
  const signature = Uint8Array.from([137,80,78,71,13,10,26,10]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + width * 4)] = 0;
    raw.set(pixels.slice(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }

  const compressed = deflateSync(raw);
  const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', new Uint8Array())];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => { out.set(part, offset); offset += part.length; });
  return out;
};

export interface RasterizedTelegramScene {
  width: number;
  height: number;
  png: Uint8Array;
}

export const rasterizeTelegramSceneSvgToPng = (svg: string, scene: TelegramScenePayload): RasterizedTelegramScene => {
  const pixels = createCanvas(WIDTH, HEIGHT, palette.background);

  fillRect(pixels, WIDTH, 36, 34, 1008, 132, palette.panelAlt);
  strokeRect(pixels, WIDTH, 36, 34, 1008, 132, 4, palette.border);
  drawText(pixels, WIDTH, 72, 62, 4, 'TELESOCCER MATCH', palette.muted);
  drawText(pixels, WIDTH, 72, 108, 5, scene.hud, palette.text);
  drawText(pixels, WIDTH, 72, 150, 3, scene.title, palette.accent);

  fillRect(pixels, WIDTH, 36, 190, 1008, 720, palette.panel);
  strokeRect(pixels, WIDTH, 36, 190, 1008, 720, 4, palette.border);
  drawText(pixels, WIDTH, 72, 222, 4, 'CARD VISUAL DO LANCE', palette.text);
  drawText(pixels, WIDTH, 72, 262, 3, scene.phrase, palette.muted);
  drawPitch(pixels, WIDTH, 72, 306, 936, 526);
  drawText(pixels, WIDTH, 116, 344, 5, scene.title, palette.warning);
  drawText(pixels, WIDTH, 116, 392, 3, scene.assetKeys?.[0] ?? 'SCENE', palette.text);
  drawText(pixels, WIDTH, 116, 430, 3, `SVG ${svg.length}B`, palette.muted);
  fillCircle(pixels, WIDTH, 432, 566, 18, palette.white);
  fillCircle(pixels, WIDTH, 338, 610, 26, palette.home);
  fillCircle(pixels, WIDTH, 566, 512, 26, palette.away);
  fillCircle(pixels, WIDTH, 740, 476, 26, palette.warning);

  fillRect(pixels, WIDTH, 36, 942, 360, 332, palette.panel);
  strokeRect(pixels, WIDTH, 36, 942, 360, 332, 4, palette.border);
  drawText(pixels, WIDTH, 72, 974, 4, 'MINI CAMPO', palette.text);
  drawPitch(pixels, WIDTH, 72, 1048, 288, 184);

  fillRect(pixels, WIDTH, 430, 942, 614, 332, palette.panel);
  strokeRect(pixels, WIDTH, 430, 942, 614, 332, 4, palette.border);
  drawText(pixels, WIDTH, 466, 974, 4, 'ACOES PRINCIPAIS', palette.text);
  const slots = (scene.replacementSlots ?? []).slice(0, 3);
  slots.forEach((slot, index) => {
    const x = 466 + (index % 2) * 250;
    const y = 1046 + Math.floor(index / 2) * 98;
    fillRect(pixels, WIDTH, x, y, 220, 84, palette.panelAlt);
    strokeRect(pixels, WIDTH, x, y, 220, 84, 3, palette.border);
    fillCircle(pixels, WIDTH, x + 42, y + 42, 24, index === 0 ? palette.accent : index === 1 ? palette.home : palette.warning);
    drawText(pixels, WIDTH, x + 78, y + 28, 2, slot.split('.').slice(-1)[0] ?? 'ACAO', palette.text);
  });

  return { width: WIDTH, height: HEIGHT, png: encodePng(WIDTH, HEIGHT, pixels) };
};
