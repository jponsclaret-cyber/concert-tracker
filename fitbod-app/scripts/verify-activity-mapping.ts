// Sanity check for the external-activity -> muscle-impact mapping used to fold
// Apple Health / Health Connect workouts into the in-app recovery model.
// Run with: npx tsx scripts/verify-activity-mapping.ts
import { computeIntensityFactor, mapActivityToMuscleImpact } from '../services/health/activityMapping';

function main() {
  const runImpact = mapActivityToMuscleImpact('running', {
    durationMin: 30,
    activeEnergyKcal: 300,
    avgHeartRate: 140,
  });
  if (!(runImpact.calves > 0 && runImpact.quads > 0)) {
    throw new Error('Running should impact calves and quads');
  }
  if (runImpact.chest !== undefined) {
    throw new Error('Running should not directly impact chest');
  }

  const shortEasyWalk = computeIntensityFactor({ durationMin: 10, activeEnergyKcal: 40, avgHeartRate: 90 });
  const longHardRun = computeIntensityFactor({ durationMin: 60, activeEnergyKcal: 600, avgHeartRate: 170 });
  if (!(longHardRun > shortEasyWalk)) {
    throw new Error('A longer, harder session should produce a higher intensity factor');
  }

  const strengthImpact = mapActivityToMuscleImpact('strength_training', {
    durationMin: 45,
    activeEnergyKcal: null,
    avgHeartRate: null,
  });
  const affectedGroups = Object.keys(strengthImpact);
  if (affectedGroups.length < 5) {
    throw new Error('Unattributed strength training should spread impact across several muscle groups');
  }

  const unknownImpact = mapActivityToMuscleImpact('other', { durationMin: 20, activeEnergyKcal: null, avgHeartRate: null });
  if (Object.keys(unknownImpact).length !== 0) {
    throw new Error('Unrecognized activity types should not affect recovery');
  }

  console.log('All activity mapping sanity checks passed.');
}

main();
