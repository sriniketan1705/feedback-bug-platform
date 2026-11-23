const { findDuplicate } = require('./similarity');

const TYPES = ['bug', 'feedback', 'feature'];
const CATEGORIES = ['ui', 'performance', 'crash', 'security', 'content', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

/* ---------------------------------------------------------------------------
 * 1) Rule-based fallback (works with no API key, also used if the AI call fails)
 * ------------------------------------------------------------------------- */
function ruleBasedAnalysis(issue, candidates) {
  const text = `${issue.title} ${issue.description}`.toLowerCase();
  const has = (words) => words.some((w) => text.includes(w));

  let type = issue.type && TYPES.includes(issue.type) ? issue.type : 'bug';
  if (has(['please add', 'would be nice', 'feature request', 'it would be great', 'wish', 'add support'])) {
    type = 'feature';
  }

  let category = 'other';
  if (has(['crash', 'freeze', 'white screen', 'blank page', 'exception', 'error 500'])) category = 'crash';
  else if (has(['slow', 'lag', 'loading', 'performance', 'timeout'])) category = 'performance';
  else if (has(['password', 'login', 'hack', 'xss', 'security', 'leak', 'token'])) category = 'security';
  else if (has(['button', 'layout', 'overlap', 'mobile', 'responsive', 'alignment', 'color', 'css', 'ui'])) category = 'ui';
  else if (has(['typo', 'spelling', 'wrong text', 'content'])) category = 'content';

  let severity = 'medium';
  if (has(['crash', 'data loss', 'cannot login', "can't login", 'security', 'payment failed'])) severity = 'critical';
  else if (has(['not working', "doesn't work", 'broken', 'error', 'fails'])) severity = 'high';
  else if (has(['typo', 'minor', 'small', 'color', 'suggestion'])) severity = 'low';
  if (type !== 'bug') severity = 'low';

  const firstSentence = issue.description.split(/(?<=[.!?])\s/)[0].slice(0, 160);
  const summary = `${type === 'bug' ? 'Bug' : type === 'feature' ? 'Feature request' : 'Feedback'}: ${firstSentence}`;

  const dup = findDuplicate(issue, candidates);
  return { type, category, severity, summary, duplicateOf: dup ? dup.id : null, source: 'rules' };
}

/* ---------------------------------------------------------------------------
 * 2) Generative AI (Google Gemini REST API)
 *    One call does everything: classify + summarize + duplicate detection.
 * ------------------------------------------------------------------------- */
async function geminiAnalysis(issue, candidates) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const candidateText = candidates.length
    ? candidates.map((c) => `- id: ${c.id} | title: ${c.title}`).join('\n')
    : '(none)';

  const prompt = `You are a bug triage assistant for a website feedback tool.
Analyse the new report below and answer ONLY with JSON in this exact shape:
{"type":"bug|feedback|feature","category":"ui|performance|crash|security|content|other","severity":"low|medium|high|critical","summary":"one short sentence (max 25 words)","duplicateOf":"id of an existing issue that describes the SAME problem, or null"}

Rules:
- "feature" = user wants something new, "feedback" = opinion or praise, "bug" = something is broken.
- Only set duplicateOf if an existing issue clearly describes the same problem.

New report:
Title: ${issue.title}
Description: ${issue.description}
Page: ${issue.pageInfo?.url || 'unknown'}

Existing open issues:
${candidateText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini API responded with ${res.status}`);

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseAiJson(raw, candidates);
  } finally {
    clearTimeout(timer);
  }
}

// Validates the model output so a bad answer can never break the database
function parseAiJson(raw, candidates) {
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  const validIds = new Set(candidates.map((c) => c.id));
  return {
    type: TYPES.includes(parsed.type) ? parsed.type : 'bug',
    category: CATEGORIES.includes(parsed.category) ? parsed.category : 'other',
    severity: SEVERITIES.includes(parsed.severity) ? parsed.severity : 'medium',
    summary: String(parsed.summary || '').slice(0, 300),
    duplicateOf: validIds.has(parsed.duplicateOf) ? parsed.duplicateOf : null,
    source: 'gemini',
  };
}

/* ---------------------------------------------------------------------------
 * Public function used by the routes
 * ------------------------------------------------------------------------- */
async function analyzeIssue(issue, candidates = []) {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiAnalysis(issue, candidates);
    } catch (err) {
      console.warn('AI call failed, using rule-based fallback:', err.message);
    }
  }
  return ruleBasedAnalysis(issue, candidates);
}

module.exports = { analyzeIssue, ruleBasedAnalysis, parseAiJson };
