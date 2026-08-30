export function decideInterruption({ text, interests = [], secondsLeft, totalSeconds, segmentCount, maxFollowups = 2 }) {
  const lower = text.toLowerCase();
  if (interests.some((x) => lower.includes(x.toLowerCase()))) return { type: 'INTERRUPT', reason: 'PROFESSOR INTEREST', question: `等一下。你刚才提到${interests[0]}，为什么这里必须采用这个方向？` };
  if (/明显|显著|很多|参与|负责|提升|improv|significant/i.test(text) && !(/\d/.test(text))) return { type: 'INTERRUPT', reason: 'EVIDENCE CHECK', question: '先停一下。你说“有明显提升”，具体指标是多少？你个人负责哪一部分？' };
  if (secondsLeft < totalSeconds * 0.55 && text.length > 90) return { type: 'INTERRUPT', reason: 'TIME CONTROL', question: '这一部分不用继续展开，请直接说你的核心贡献。' };
  if (segmentCount >= 2 && maxFollowups <= 1) return { type: 'END_TOPIC', reason: 'AGENDA CONTROL', question: '好，这部分我了解了。我们换一个问题。' };
  return { type: 'CONTINUE' };
}
