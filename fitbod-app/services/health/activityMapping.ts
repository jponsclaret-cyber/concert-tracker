// Canonical activity types this app understands, independent of the platform-specific
// enum/string each health SDK returns. healthkit.ts / healthConnect.ts translate the
// native value into one of these before anything else touches it.
export type CanonicalActivityType =
  | 'running'
  | 'walking'
  | 'hiking'
  | 'cycling'
  | 'swimming'
  | 'rowing'
  | 'elliptical'
  | 'strength_training'
  | 'other';

// Fraction (0-1) of a "full" training effect on each muscle group for a session of
// this activity type, before scaling by session intensity. Strength training done
// outside the app has no per-exercise detail, so it gets an even, moderate bump
// across all major movers instead of a precise breakdown.
export const ACTIVITY_MUSCLE_IMPACT: Record<CanonicalActivityType, Record<string, number>> = {
  running: { quads: 0.35, hamstrings: 0.15, calves: 0.4, glutes: 0.2, abs: 0.1 },
  walking: { quads: 0.15, calves: 0.15, glutes: 0.1 },
  hiking: { quads: 0.3, hamstrings: 0.2, calves: 0.3, glutes: 0.25 },
  cycling: { quads: 0.5, calves: 0.2, glutes: 0.2 },
  swimming: { shoulders: 0.4, back_lats: 0.3, abs: 0.3, triceps: 0.2 },
  rowing: { back_upper: 0.4, back_lats: 0.3, biceps: 0.2, quads: 0.2 },
  elliptical: { quads: 0.3, glutes: 0.2, calves: 0.15 },
  strength_training: {
    chest: 0.15,
    back_lats: 0.15,
    back_upper: 0.15,
    shoulders: 0.15,
    quads: 0.15,
    hamstrings: 0.15,
    glutes: 0.15,
  },
  other: {},
};

export function computeIntensityFactor(input: {
  durationMin: number;
  activeEnergyKcal: number | null;
  avgHeartRate: number | null;
}): number {
  // A ~30 min moderate session is the baseline (factor 1); longer/harder sessions
  // scale up, capped so a single outlier activity can't fully re-fatigue everything.
  const durationFactor = Math.min(2, input.durationMin / 30);
  const heartRateFactor = input.avgHeartRate ? Math.min(1.3, input.avgHeartRate / 130) : 1;
  return Math.min(2, durationFactor * heartRateFactor);
}

export function mapActivityToMuscleImpact(
  activityType: CanonicalActivityType,
  input: { durationMin: number; activeEnergyKcal: number | null; avgHeartRate: number | null }
): Record<string, number> {
  const baseImpact = ACTIVITY_MUSCLE_IMPACT[activityType] ?? ACTIVITY_MUSCLE_IMPACT.other;
  const intensity = computeIntensityFactor(input);
  const result: Record<string, number> = {};
  for (const [muscleGroupId, weight] of Object.entries(baseImpact)) {
    result[muscleGroupId] = weight * intensity;
  }
  return result;
}
