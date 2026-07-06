import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// --- Reference data (seeded once from data/exerciseLibrary.seed.json) ---

export const muscleGroups = sqliteTable('muscle_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  bodyRegion: text('body_region', { enum: ['upper', 'lower', 'core'] }).notNull(),
  recoveryClass: text('recovery_class', { enum: ['large', 'medium', 'small'] }).notNull(),
});

export const equipment = sqliteTable('equipment', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', {
    enum: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell'],
  }).notNull(),
});

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mechanicsType: text('mechanics_type', { enum: ['compound', 'isolation'] }).notNull(),
  forceType: text('force_type', { enum: ['push', 'pull', 'static'] }).notNull(),
  unilateral: integer('unilateral', { mode: 'boolean' }).notNull().default(false),
  instructions: text('instructions').notNull(),
  repRangeMin: integer('rep_range_min').notNull(),
  repRangeMax: integer('rep_range_max').notNull(),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
});

export const exerciseMuscles = sqliteTable(
  'exercise_muscles',
  {
    exerciseId: text('exercise_id').notNull().references(() => exercises.id),
    muscleGroupId: text('muscle_group_id').notNull().references(() => muscleGroups.id),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.exerciseId, t.muscleGroupId] }),
  })
);

export const exerciseEquipment = sqliteTable(
  'exercise_equipment',
  {
    exerciseId: text('exercise_id').notNull().references(() => exercises.id),
    equipmentId: text('equipment_id').notNull().references(() => equipment.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.exerciseId, t.equipmentId] }),
  })
);

// --- User configuration ---

// MVP keeps a single "my equipment" set rather than multiple named profiles.
export const userEquipment = sqliteTable('user_equipment', {
  equipmentId: text('equipment_id').primaryKey().references(() => equipment.id),
});

// --- Workout logging ---

export const workoutSessions = sqliteTable('workout_sessions', {
  id: text('id').primaryKey(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  sourceType: text('source_type', { enum: ['generated', 'manual', 'imported'] }).notNull(),
  notes: text('notes'),
});

export const workoutSessionFocusMuscles = sqliteTable(
  'workout_session_focus_muscles',
  {
    sessionId: text('session_id').notNull().references(() => workoutSessions.id),
    muscleGroupId: text('muscle_group_id').notNull().references(() => muscleGroups.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sessionId, t.muscleGroupId] }),
  })
);

export const setLogs = sqliteTable('set_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => workoutSessions.id),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  setNumber: integer('set_number').notNull(),
  weightKg: real('weight_kg'),
  reps: integer('reps').notNull(),
  rpe: real('rpe'),
  isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at').notNull(),
});

// --- Muscle recovery (populated/updated starting with the recovery-tracking milestone) ---

export const muscleRecoveryState = sqliteTable('muscle_recovery_state', {
  muscleGroupId: text('muscle_group_id').primaryKey().references(() => muscleGroups.id),
  lastTrainedAt: text('last_trained_at'),
  accumulatedFatigue: real('accumulated_fatigue').notNull().default(0),
  recoveryHalfLifeHours: real('recovery_half_life_hours').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// --- External health data (populated starting with the Health integration milestone) ---

export const externalActivities = sqliteTable('external_activities', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['healthkit', 'healthconnect'] }).notNull(),
  activityType: text('activity_type').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  durationMin: real('duration_min').notNull(),
  activeEnergyKcal: real('active_energy_kcal'),
  avgHeartRate: real('avg_heart_rate'),
  distanceKm: real('distance_km'),
  mappedMuscleImpact: text('mapped_muscle_impact', { mode: 'json' }).$type<Record<string, number>>(),
  rawPayload: text('raw_payload'),
});
