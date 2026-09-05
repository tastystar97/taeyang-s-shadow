import { cp, mkdir, readdir, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = process.cwd();
const output = resolve(root, 'dist-netlify');
if (output !== join(root, 'dist-netlify')) throw new Error('Invalid output directory');
// This generated directory is the only deletion target.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const allowed = ['index.html','control.html','app.js','control.js','styles.css','archive-editor.js','login-sequence.js','session-guard.js','personnel-control.js','archive-control.js','form-templates.js','workflow-control.js','cases-ui.js'];
for (const name of allowed) await cp(resolve('public', name), join(output, name));
const files = await readdir(output);
if (files.some(name => !allowed.includes(name))) throw new Error('Unexpected public file');
const app = await readFile(join(output, 'app.js'), 'utf8');
if (app.includes('const PERSONNEL = [') || app.includes('const STATIC_EVIDENCE = [') || app.includes('tcb-offline-state\", JSON')) throw new Error('Private seed records remain in public bundle');
console.log('Netlify public build prepared: application shell only; originals are served by authenticated Functions.');
