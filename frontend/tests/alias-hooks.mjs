// tests/alias-hooks.mjs — resolves "@/lib/policy" to <project>/src/lib/policy.js
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2));
    const file = [base, `${base}.js`, path.join(base, 'index.js')].find((p) => path.extname(p) && existsSync(p));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
