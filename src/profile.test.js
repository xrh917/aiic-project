import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProfessorProfile } from './profile.js';
test('generates structured professor profile and bounded agenda', () => {
  const profile = generateProfessorProfile({ professorName: 'Wang', affiliation: 'AI Lab', researchDirection: 'RL, agents', candidateMaterials: 'built a robot', presentation: '' });
  assert.equal(profile.professor_profile.name, 'Wang');
  assert.equal(profile.professor_profile.research_interests.length, 2);
  assert.ok(profile.agenda.every((topic) => topic.max_followups <= 2));
});
