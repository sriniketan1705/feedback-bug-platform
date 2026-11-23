// Very small text-similarity helper (Jaccard similarity on words).
// Used as a fallback for duplicate detection when no AI key is configured.

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'it', 'this', 'that', 'to', 'of', 'in', 'on',
  'and', 'or', 'for', 'with', 'when', 'i', 'my', 'me', 'not', 'no', 'be', 'can', 'cant', 'do',
  'does', 'dont', 'at', 'as', 'but', 'if', 'so', 'we', 'you', 'there', 'have', 'has', 'after',
]);

function tokenize(text = '') {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccard(textA, textB) {
  const a = tokenize(textA);
  const b = tokenize(textB);
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  a.forEach((w) => {
    if (b.has(w)) common += 1;
  });
  return common / (a.size + b.size - common);
}

// candidates: [{ id, title, description }]
function findDuplicate(issue, candidates, threshold = 0.5) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = jaccard(`${issue.title} ${issue.description}`, `${c.title} ${c.description}`);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= threshold ? { id: best.id, score: bestScore } : null;
}

module.exports = { tokenize, jaccard, findDuplicate };
