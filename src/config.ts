import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Process configuration. Secrets live only here and in `process.env`; never log `issuerSeedHex`. */
export interface Config { dataDir: string; dbPath: string; subjectId: string; issuerId: string; issuerSeedHex: string; trustedIssuers: string[]; profilePath: string }

export function loadConfig(root = process.cwd()): Config {
  const envFile = resolve(root, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const seed = process.env.SAFE402_ISSUER_PRIVATE_KEY;
  if (!seed || /replace-with/.test(seed)) throw new Error('SAFE402_ISSUER_PRIVATE_KEY missing');
  const dataDir = resolve(root, 'data');
  return {
    dataDir,
    dbPath: (process.env.DATABASE_URL ?? 'file:./data/safe402.db').replace(/^file:/, ''),
    subjectId: process.env.SAFE402_SUBJECT_ID ?? 'dev-subject',
    issuerId: process.env.SAFE402_ISSUER_ID ?? 'safe402-dev-issuer',
    issuerSeedHex: seed,
    trustedIssuers: (process.env.SAFE402_TRUSTED_ISSUERS ?? '').split(',').filter(Boolean),
    profilePath: resolve(root, 'runner/profiles/no-network-v1.json'),
  };
}
