// Compila Tailwind v4 y envuelve el CSS en <style> para incluirlo con include() en Apps Script.
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = join(root, 'tailwind', 'input.css');
const tmpCss = join(root, 'tailwind', '.out.css');
const outHtml = join(root, 'src', 'frontend', 'styles', 'tailwind.generated.html');
const cli = join(root, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs');

function wrap() {
  const css = readFileSync(tmpCss, 'utf8');
  mkdirSync(dirname(outHtml), { recursive: true });
  writeFileSync(outHtml, `<style>\n${css}\n</style>\n`);
}

if (process.argv.includes('--watch')) {
  const p = spawn(process.execPath, [cli, '-i', input, '-o', tmpCss, '--watch'], { stdio: 'inherit' });
  setInterval(() => { try { wrap(); } catch { /* aún no existe */ } }, 1000);
  p.on('exit', (c) => process.exit(c ?? 0));
} else {
  execFileSync(process.execPath, [cli, '-i', input, '-o', tmpCss, '--minify'], { stdio: 'inherit' });
  wrap();
  unlinkSync(tmpCss);
  console.log('Generado:', outHtml);
}
