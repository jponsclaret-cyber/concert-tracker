const SMALLEST_WEIGHT_INCREMENT_KG = 2.5;

export function estimateOneRepMax(weightKg: number, reps: number): number {
  // Epley formula.
  return weightKg * (1 + reps / 30);
}

export interface SetHistoryEntry {
  weightKg: number | null;
  reps: number;
}

export interface PrescribedSet {
  weightKg: number | null;
  reps: number;
}

export function prescribeNextSet(
  exercise: { repRangeMin: number; repRangeMax: number; mechanicsType: 'compound' | 'isolation' },
  lastSessionSets: SetHistoryEntry[]
): PrescribedSet {
  if (lastSessionSets.length === 0) {
    return { weightKg: null, reps: exercise.repRangeMin };
  }

  const best = lastSessionSets.reduce((a, b) => {
    if (a.weightKg == null) return b.weightKg == null ? a : b;
    if (b.weightKg == null) return a;
    return estimateOneRepMax(b.weightKg, b.reps) > estimateOneRepMax(a.weightKg, a.reps) ? b : a;
  });

  const metRepGoal = best.reps >= exercise.repRangeMax;

  if (best.weightKg == null) {
    // Bodyweight exercise: progress by adding reps instead of weight.
    return { weightKg: null, reps: metRepGoal ? best.reps + 1 : Math.max(exercise.repRangeMin, best.reps) };
  }

  const e1rm = estimateOneRepMax(best.weightKg, best.reps);
  const targetIntensityPct = exercise.mechanicsType === 'compound' ? 0.8 : 0.65;
  let targetWeightKg = e1rm * targetIntensityPct;
  if (metRepGoal) {
    targetWeightKg += SMALLEST_WEIGHT_INCREMENT_KG;
  }
  targetWeightKg = Math.round(targetWeightKg / 1.25) * 1.25;

  return {
    weightKg: targetWeightKg,
    reps: metRepGoal ? exercise.repRangeMin : Math.max(exercise.repRangeMin, best.reps),
  };
}
