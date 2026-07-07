export interface MuscleRecoveryStateLike {
  accumulatedFatigue: number;
  recoveryHalfLifeHours: number;
  updatedAt: string;
}

const PRIMARY_FATIGUE_CONTRIBUTION = 45;
const SECONDARY_FATIGUE_CONTRIBUTION = 20;
const FULL_CONTRIBUTION_SET_COUNT = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeCurrentFatigue(state: MuscleRecoveryStateLike, now: number): number {
  const hoursSince = (now - new Date(state.updatedAt).getTime()) / (1000 * 60 * 60);
  const decayed = state.accumulatedFatigue * Math.pow(2, -hoursSince / state.recoveryHalfLifeHours);
  return clamp(decayed, 0, 100);
}

export function computeRecoveryPct(state: MuscleRecoveryStateLike, now: number = Date.now()): number {
  return clamp(100 - computeCurrentFatigue(state, now), 0, 100);
}

export function fatigueContributionForSets(setCount: number, isPrimary: boolean): number {
  const base = isPrimary ? PRIMARY_FATIGUE_CONTRIBUTION : SECONDARY_FATIGUE_CONTRIBUTION;
  return base * clamp(setCount / FULL_CONTRIBUTION_SET_COUNT, 0, 1);
}

export function applyFatigueContribution(
  state: MuscleRecoveryStateLike,
  contribution: number,
  now: number = Date.now()
): { accumulatedFatigue: number; updatedAt: string } {
  const decayedFatigue = computeCurrentFatigue(state, now);
  return {
    accumulatedFatigue: clamp(decayedFatigue + contribution, 0, 100),
    updatedAt: new Date(now).toISOString(),
  };
}
