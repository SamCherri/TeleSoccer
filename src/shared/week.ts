const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const TELE_SOCCER_EPOCH = Date.UTC(2026, 0, 5);

export const getGameWeekNumber = (referenceDate: Date): number => {
  const elapsed = referenceDate.getTime() - TELE_SOCCER_EPOCH;
  return Math.max(1, Math.floor(elapsed / MILLISECONDS_PER_WEEK) + 1);
};
