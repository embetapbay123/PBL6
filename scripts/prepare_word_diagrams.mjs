// Render SVG diagram sources with Chromium so Mermaid HTML/foreignObject labels
// survive. Sharp/librsvg drops those labels and produces unreadable ERD nodes.
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sourceRoot = 'C:/PBL6/docs/diagrams';
const outputRoot = process.argv[2];
if (!outputRoot) throw new Error('Output asset directory required');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.name.endsWith('.svg')) out.push(path);
  }
  return out;
}

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--disable-gpu'],
});
const context = await browser.newContext({ deviceScaleFactor: 2 });
const page = await context.newPage();
let count = 0;
try {
  for (const source of await walk(sourceRoot)) {
    const rel = relative(sourceRoot, source).replace(/\.svg$/i, '.png');
    const target = join(outputRoot, rel);
    await mkdir(dirname(target), { recursive: true });
    const svg = await readFile(source, 'utf8');
    const match = svg.match(/viewBox="([^"]+)"/);
    if (!match) throw new Error(`Missing viewBox: ${source}`);
    const [, , width, height] = match[1].split(/\s+/).map(Number);
    if (!width || !height) throw new Error(`Invalid viewBox: ${source}`);
    await page.setViewportSize({ width: Math.ceil(width) + 40, height: Math.ceil(height) + 40 });
    await page.setContent(`<html><head><meta charset="utf-8"><style>body{margin:0;background:white}</style></head><body>${svg}</body></html>`);
    await page.locator('svg').first().evaluate((element, dims) => {
      element.setAttribute('width', `${dims.width}px`);
      element.setAttribute('height', `${dims.height}px`);
      element.style.width = `${dims.width}px`;
      element.style.height = `${dims.height}px`;
      element.style.maxWidth = 'none';
      element.style.background = 'white';
    }, { width: Math.ceil(width), height: Math.ceil(height) });
    await page.locator('svg').first().screenshot({ path: target, animations: 'disabled' });
    count++;
  }
} finally {
  await browser.close();
}
process.stdout.write(`Prepared ${count} diagram PNGs\n`);
