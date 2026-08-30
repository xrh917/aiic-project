import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRecoveryScore } from './scoring.js';
test('recovery score reflects interruptions and delay', () => {
  assert.equal(calculateRecoveryScore({ interruptionCount: 0, resumeDelay: 0, elapsedSeconds: 240 }), 85);
  assert.ok(calculateRecoveryScore({ interruptionCount: 3, resumeDelay: 18, elapsedSeconds: 240 }) < 85);
});
