/**
 * B-37: expo-router `Stack.Protected` only guards routes declared in the root layout. An undeclared route stays
 * reachable before onboarding, and a fresh install opens the first one instead of S-01a. Every route file outside
 * (tabs)/ and onboarding/ must be declared in src/app/_layout.tsx.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP = path.join(__dirname, '..', '..', 'app');

function routeFiles(dir: string, prefix = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return routeFiles(path.join(dir, e.name), `${prefix}${e.name}/`);
    if (!e.name.endsWith('.tsx') || e.name.startsWith('_') || e.name.startsWith('+')) return [];
    return [`${prefix}${e.name.replace(/\.tsx$/, '')}`];
  });
}

test('every route is declared in the root Stack (so the onboarding guard covers it)', () => {
  const layout = fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8');
  const declared = new Set([...layout.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map((m) => m[1]));
  const missing = routeFiles(APP).filter((r) => !r.startsWith('(tabs)/') && !r.startsWith('onboarding/') && !declared.has(r));
  expect(missing).toEqual([]);
});
