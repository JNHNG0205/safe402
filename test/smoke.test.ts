import { describe, expect, it } from 'vitest';
import { REASON_CODES } from '../src/domain/reasonCodes.js';
describe('scaffold', () => { it('exports reason codes', () => { expect(REASON_CODES).toContain('ALL_CHECKS_SATISFIED'); }); });
