import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db/db.js';
import { JobRepo } from '../src/jobs/repo.js';
import { assertTransition, TransitionError } from '../src/jobs/stateMachine.js';

const tmpDb = () => join(mkdtempSync(join(tmpdir(), 's402db-')), 'x.db');
const job = (id: string) => ({ auditId: id, artifactHash: 'sha256:a', policyId: 'p', subjectId: 's', profileId: 'no-network-v1', profileHash: 'sha256:h' });

describe('state machine', () => {
  it('allows the happy path and rejects illegal moves', () => {
    for (const [f, t] of [['QUEUED', 'PREPARING'], ['PREPARING', 'SCANNING'], ['SCANNING', 'TESTING'], ['TESTING', 'EVALUATING'], ['EVALUATING', 'COMPLETED'], ['TESTING', 'FAILED']] as const) expect(() => assertTransition(f, t)).not.toThrow();
    expect(() => assertTransition('COMPLETED', 'QUEUED')).toThrow(TransitionError);
    expect(() => assertTransition('QUEUED', 'COMPLETED')).toThrow(TransitionError);
  });
});

describe('JobRepo', () => {
  it('claims atomically, heartbeats, transitions, persists, and reopens', () => {
    const path = tmpDb(); const repo = new JobRepo(openDb(path));
    repo.createJob(job('a1')); repo.createJob(job('a2'));
    const c1 = repo.claimNext('w1', 1000)!; const c2 = repo.claimNext('w2', 1000)!;
    expect(c1.audit_id).toBe('a1'); expect(c2.audit_id).toBe('a2'); expect(repo.claimNext('w3', 1000)).toBeNull();
    expect(c1.status).toBe('PREPARING'); expect(c1.attempts).toBe(1);
    repo.transition('a1', 'SCANNING', { stageCheckpoint: 'artifact' });
    expect(() => repo.transition('a1', 'COMPLETED')).toThrow(TransitionError);
    repo.appendEvent('a1', 'stage', { to: 'SCANNING' }); repo.appendEvent('a1', 'stage', { to: 'TESTING' });
    expect(repo.listEvents('a1').map((e) => e.sequence)).toEqual([1, 2]);
    repo.saveCapsule('sha256:c1', 'a1', { decision: 'ALLOW' }, 'key1');
    expect(repo.nextAuthorizationSequence('key1')).toBe(2); expect(repo.nextAuthorizationSequence('other')).toBe(1);
    const again = new JobRepo(openDb(path));
    expect(again.getJob('a1')!.status).toBe('SCANNING');
  });
  it('refuses a transition from a worker whose lease was reassigned', () => {
    const repo = new JobRepo(openDb(tmpDb()));
    repo.createJob(job('a1'));
    expect(repo.claimNext('w1', 1000)!.lease_owner).toBe('w1');
    repo.transition('a1', 'SCANNING', { stageCheckpoint: 'artifact' }, 'w1');
    repo.sweepExpiredLeases(1061);
    expect(repo.claimNext('w2', 5000)!.lease_owner).toBe('w2');
    expect(() => repo.transition('a1', 'SCANNING', { stageCheckpoint: 'stale' }, 'w1')).toThrow('lease lost');
    expect(repo.getJob('a1')!.status).toBe('PREPARING');
    expect(repo.getJob('a1')!.stage_checkpoint).toBeNull();
    repo.transition('a1', 'SCANNING', { stageCheckpoint: 'artifact' }, 'w2');
    expect(repo.getJob('a1')!.status).toBe('SCANNING');
  });
  it('sweeps expired leases back to QUEUED until attempts exhausted', () => {
    const repo = new JobRepo(openDb(tmpDb()));
    repo.createJob(job('a1'));
    for (let i = 1; i <= 3; i++) { const c = repo.claimNext('w', 1000 * i)!; expect(c.attempts).toBe(i); repo.sweepExpiredLeases(1000 * i + 61); }
    expect(repo.getJob('a1')!.status).toBe('FAILED');
    expect(repo.claimNext('w', 99999)).toBeNull();
  });
});
