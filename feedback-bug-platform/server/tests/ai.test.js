const test = require('node:test');
const assert = require('node:assert');
const { ruleBasedAnalysis, parseAiJson } = require('../src/services/ai');
const { jaccard, findDuplicate } = require('../src/services/similarity');

test('jaccard similarity is high for near-identical text and low for different text', () => {
  assert.ok(jaccard('Login button not working', 'login button is not working') > 0.6);
  assert.ok(jaccard('Login button not working', 'Please add dark mode') < 0.2);
});

test('findDuplicate returns the matching candidate', () => {
  const candidates = [
    { id: 'a1', title: 'Checkout page crashes', description: 'App crashes on the checkout page' },
    { id: 'b2', title: 'Typo in footer', description: 'Footer has a spelling mistake' },
  ];
  const issue = { title: 'Checkout crashes', description: 'The checkout page crashes when I pay' };
  const dup = findDuplicate(issue, candidates, 0.3);
  assert.strictEqual(dup.id, 'a1');
});

test('rule-based analysis classifies a crash as critical bug', () => {
  const r = ruleBasedAnalysis(
    { title: 'App crash', description: 'The page crash every time I click pay.', type: 'bug' },
    []
  );
  assert.strictEqual(r.type, 'bug');
  assert.strictEqual(r.category, 'crash');
  assert.strictEqual(r.severity, 'critical');
});

test('rule-based analysis detects feature requests', () => {
  const r = ruleBasedAnalysis(
    { title: 'Dark mode', description: 'It would be great to have a dark mode.', type: 'feedback' },
    []
  );
  assert.strictEqual(r.type, 'feature');
});

test('parseAiJson rejects invalid values and unknown duplicate ids', () => {
  const raw = '```json\n{"type":"banana","category":"ui","severity":"high","summary":"x","duplicateOf":"zzz"}\n```';
  const r = parseAiJson(raw, [{ id: 'a1' }]);
  assert.strictEqual(r.type, 'bug'); // invalid -> default
  assert.strictEqual(r.category, 'ui');
  assert.strictEqual(r.duplicateOf, null); // id not in candidates -> null
});
