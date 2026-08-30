import test from 'node:test';
import assert from 'node:assert/strict';
import { decideInterruption } from './controller.js';
test('prioritizes professor-interest signal', () => assert.equal(decideInterruption({ text: 'we use multi-agent systems', interests: ['multi-agent systems'], secondsLeft: 200, totalSeconds: 300, segmentCount: 0 }).reason, 'PROFESSOR INTEREST'));
test('recognizes bilingual multi-agent signal without exact profile wording', () => assert.equal(decideInterruption({ text: '我们采用了 Multi-Agent framework', interests: ['强化学习'], secondsLeft: 200, totalSeconds: 300, segmentCount: 0 }).reason, 'PROFESSOR INTEREST'));
test('checks unsupported evidence', () => assert.equal(decideInterruption({ text: '性能提升比较明显', secondsLeft: 200, totalSeconds: 300, segmentCount: 0 }).reason, 'EVIDENCE CHECK'));
test('keeps agenda bounded', () => assert.equal(decideInterruption({ text: 'more details', secondsLeft: 200, totalSeconds: 300, segmentCount: 3, maxFollowups: 1 }).type, 'END_TOPIC'));
test('does not interrupt on time alone', () => assert.equal(decideInterruption({ text: '这是一段很长的背景说明，没有具体触发信号。'.repeat(30), secondsLeft: 20, totalSeconds: 300, segmentCount: 0 }).type, 'CONTINUE'));
