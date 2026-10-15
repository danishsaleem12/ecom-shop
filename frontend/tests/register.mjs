// tests/register.mjs
// Loaded with `node --import ./tests/register.mjs` (see the "test" script in package.json).
// Teaches Node's test runner the "@/..." shortcut the app uses (jsconfig.json: "@/*" -> "./src/*"),
// so the tests can import the real files from src/ exactly as the pages do.
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
