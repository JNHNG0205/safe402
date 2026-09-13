import type { JobStatus } from '../domain/types.js';

export class TransitionError extends Error {}

const ALLOWED: Record<JobStatus, JobStatus[]> = {
  AWAITING_PAYMENT: ['PAYMENT_RECONCILING', 'QUEUED', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_RECONCILING: ['QUEUED', 'PAYMENT_FAILED'],
  QUEUED: ['PREPARING', 'CANCELLED', 'FAILED'],
  PREPARING: ['SCANNING', 'FAILED', 'QUEUED'],
  SCANNING: ['TESTING', 'FAILED', 'QUEUED'],
  TESTING: ['EVALUATING', 'FAILED', 'INCONCLUSIVE', 'QUEUED'],
  EVALUATING: ['PUBLISHING', 'COMPLETED', 'FAILED', 'QUEUED'],
  PUBLISHING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  PAYMENT_FAILED: [],
  FAILED: [],
  INCONCLUSIVE: [],
  CANCELLED: [],
};

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!ALLOWED[from]?.includes(to)) throw new TransitionError(`illegal transition ${from} -> ${to}`);
}
