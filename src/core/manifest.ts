import fs from 'node:fs';
import path from 'node:path';
import type { Manifest } from '../types.js';

export function readManifest(manifestPath: string): Manifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

export function writeManifest(manifestPath: string, manifest: Manifest): void {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
