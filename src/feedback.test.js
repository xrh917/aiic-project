import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEvidence } from './feedback.js';
test('returns quoted evidence and actionable gaps', () => {
  const findings = analyzeEvidence([{ text: '效果提升比较明显，我参与了这个项目。' }], []);
  assert.equal(findings.length, 2);
  assert.ok(findings[0].quote.includes('效果提升'));
  assert.ok(findings[0].advice.includes('具体数字'));
});
