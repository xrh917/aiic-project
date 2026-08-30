export function calculateRecoveryScore({ interruptionCount = 0, resumeDelay = 0, elapsedSeconds = 0, totalSeconds = 300 }) {
  const overrunPenalty = elapsedSeconds > totalSeconds ? Math.min(20, (elapsedSeconds - totalSeconds) * 2) : 0;
  return Math.max(0, Math.round(85 - interruptionCount * 6 - resumeDelay * 0.5 - overrunPenalty));
}
