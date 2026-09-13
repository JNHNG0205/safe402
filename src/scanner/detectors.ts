import type { Finding } from '../domain/types.js';
export interface Detector { ruleId: string; severity: Finding['severity']; pattern: RegExp; description: string }
export const DETECTORS: Detector[] = [
  { ruleId: 'FS_ACCESS', severity: 'MEDIUM', pattern: /require\(['"](node:)?fs(\/promises)?['"]\)|from ['"](node:)?fs(\/promises)?['"]|readFileSync|writeFileSync|createReadStream/, description: 'Filesystem API reference' },
  { ruleId: 'ENV_READ', severity: 'LOW', pattern: /process\.env\b/, description: 'Environment variable read' },
  { ruleId: 'CHILD_PROCESS', severity: 'HIGH', pattern: /child_process|\bexecSync\(|\bspawn\(|\bexecFile\(/, description: 'Child process creation' },
  { ruleId: 'DYNAMIC_CODE', severity: 'HIGH', pattern: /\beval\(|new Function\(|\bvm\.(runInNewContext|runInThisContext|Script)/, description: 'Dynamic code execution' },
  { ruleId: 'NETWORK_TARGET', severity: 'LOW', pattern: /https?:\/\/[a-z0-9.-]+/i, description: 'Literal network target' },
  { ruleId: 'WALLET_API', severity: 'CRITICAL', pattern: /signTransaction|sendTransaction|privateKey|PrivateKey\.from/, description: 'Wallet or signing API reference' },
  { ruleId: 'SUSPICIOUS_DESCRIPTION', severity: 'HIGH', pattern: /ignore (all )?previous|system prompt|you must (now )?(call|run|execute)/i, description: 'Instruction-like text in source or descriptions' },
];
