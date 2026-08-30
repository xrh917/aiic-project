export function decideInterruption({ text, interests = [], secondsLeft, totalSeconds, segmentCount, maxFollowups = 2, mode = 'kind', interruptionCount = 0, lastInterruptionAt = null }) {
  if (mode === 'none') return { type: 'CONTINUE' };
  const maxInterruptions = mode === 'pressure' ? 4 : 2;
  if (interruptionCount >= maxInterruptions) return { type: 'CONTINUE' };
  if (lastInterruptionAt !== null && Math.abs(lastInterruptionAt - secondsLeft) < 35) return { type: 'CONTINUE' };
  const lower = text.toLowerCase();
  const interestHit = interests.find((x) => lower.includes(x.toLowerCase())) || (/multi[- ]?agent|多智能体/.test(lower) ? '多智能体系统' : null);
  if (interestHit) return { type: 'INTERRUPT', reason: 'PROFESSOR INTEREST', question: `等一下。你刚才提到${interestHit}，为什么这里必须采用这个方向？单 Agent 为什么不行？` };
  const vagueEvidence = /提升比较明显|效果明显|效果显著|表现更好|提升很多|有明显提升|improv(?:ed|ement)? significantly|significant improvement|我参与了(?:这个|该)?项目/i.test(text);
  if (vagueEvidence && !(/\d/.test(text))) return { type: 'INTERRUPT', reason: 'EVIDENCE CHECK', question: '先停一下。你说“有明显提升”，具体指标是多少？你个人负责哪一部分？' };
  if (secondsLeft !== undefined && totalSeconds && totalSeconds - secondsLeft > 90 && text.length > 140 && text.length <= 500 && segmentCount > 0) {
    return { type: 'INTERRUPT', reason: 'TIME CONTROL', question: '我先打断一下。这部分展开得有些久了，请先用一句话总结核心贡献，再继续后面的结果。' };
  }
  if (segmentCount >= 2 && maxFollowups <= 1) return { type: 'END_TOPIC', reason: 'AGENDA CONTROL', question: '好，这部分我了解了。我们换一个问题。' };
  return { type: 'CONTINUE' };
}
