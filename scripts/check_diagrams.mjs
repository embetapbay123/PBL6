// Parse all Mermaid ERDs with a temporary local Mermaid installation.
// Set PBL6_MERMAID_MODULE to the absolute path of mermaid.esm.mjs if needed.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../docs/diagrams/erd/', import.meta.url);
const tempModule = join(process.env.TEMP || '/tmp', 'pbl6-mermaid-check', 'node_modules', 'mermaid', 'dist', 'mermaid.esm.mjs');
const modulePath = process.env.PBL6_MERMAID_MODULE || tempModule;
const { default: mermaid } = await import(pathToFileURL(modulePath).href);
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
let count = 0;
for (const name of readdirSync(root).filter(name => name.endsWith('.mmd')).sort()) {
  const source = readFileSync(new URL(name, root), 'utf8');
  await mermaid.parse(source);
  count++;
}
process.stdout.write(`Parsed ${count} Mermaid ERDs\n`);
