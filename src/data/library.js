// Static, offline exercise and plan library. Demonstrations live in bundled
// src/assets/animations; no remote video IDs or media URLs are needed.
import { additionalExercises, equipmentOptions } from "./catalog.js";
const EQUIPMENT = {
  BODY_ONLY: "BODY_ONLY",
  DUMBBELL: "DUMBBELL",
  BARBELL: "BARBELL",
  BANDS: "BANDS",
  CABLE: "CABLE",
  BENCH: "BENCH",
};

const baseExercises = [
  {
    id: "jumping-jacks",
    name: "Jumping Jacks",
    muscle: "FULL_BODY",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "TIME",
    how: [
      "Feet together, arms at sides",
      "Jump feet out, arms overhead",
      "Land soft, keep a steady rhythm",
    ],
  },
  {
    id: "bw-squat",
    name: "Bodyweight Squat",
    muscle: "QUADRICEPS",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "REPS",
    how: [
      "Feet shoulder-width, toes slightly out",
      "Push hips back, chest up",
      "Lower only as far as you can keep control, then stand tall",
    ],
  },
  {
    id: "push-up",
    name: "Push-Up",
    muscle: "CHEST",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "REPS",
    how: [
      "Hands under shoulders, body straight",
      "Lower chest to fist height",
      "Drop to knees if form breaks",
    ],
  },
  {
    id: "rev-lunge-bw",
    name: "Alternating Reverse Lunges",
    muscle: "QUADRICEPS",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "REPS",
    perSide: true,
    how: [
      "Stand tall, step one foot back",
      "Back knee hovers above floor",
      "Push up through front heel, alternate",
    ],
  },
  {
    id: "plank",
    name: "Plank Hold",
    muscle: "ABDOMINALS",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "TIME",
    stillFrame: 0,
    how: [
      "Elbows under shoulders, both toes on the floor",
      "Keep head, hips and heels in one line",
      "Brace your core and breathe; stop if hips sag",
    ],
  },
  {
    id: "mountain-climbers",
    name: "Mountain Climbers",
    muscle: "FULL_BODY",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "TIME",
    how: [
      "High plank position",
      "Drive knees to chest fast",
      "Hips low, shoulders over hands",
    ],
  },
  {
    id: "sl-bridge",
    name: "Single-Leg Glute Bridge",
    muscle: "GLUTES",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "REPS",
    perSide: true,
    how: [
      "Back flat, one foot planted",
      "Drive hips up, squeeze hard",
      "2 sec hold, lower slow, swap sides",
    ],
  },
  {
    id: "burpee",
    name: "Burpee",
    muscle: "FULL_BODY",
    equipment: [EQUIPMENT.BODY_ONLY],
    kind: "TIME",
    how: [
      "Chest to floor each rep",
      "Jump up, clap overhead",
      "Keep a steady pace and land softly",
    ],
  },
  {
    id: "db-squat",
    name: "Dumbbell Squat",
    muscle: "QUADRICEPS",
    equipment: [EQUIPMENT.DUMBBELL],
    kind: "REPS",
    how: [
      "Hold a dumbbell in each hand at your sides",
      "Sit down between your hips, keeping your chest up",
      "Push through your feet and stand tall without locking your knees",
    ],
  },
  {
    id: "db-press",
    name: "Seated Dumbbell Shoulder Press",
    muscle: "SHOULDERS",
    equipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH],
    kind: "REPS",
    how: [
      "Back supported, dumbbells at shoulder height",
      "Press up without shrugging",
      "Lower with control",
    ],
  },
  {
    id: "db-bent-row",
    name: "Dumbbell Bent-Over Row",
    muscle: "BACK",
    equipment: [EQUIPMENT.DUMBBELL],
    kind: "REPS",
    how: [
      "Hinge forward, back flat",
      "Row both dumbbells to hips",
      "Squeeze shoulder blades",
    ],
  },
  {
    id: "bb-rev-lunge",
    name: "Barbell Reverse Lunges",
    muscle: "QUADRICEPS",
    equipment: [EQUIPMENT.BARBELL],
    kind: "REPS",
    perSide: true,
    how: [
      "Bar across upper back, stand tall",
      "Step back 2–3 feet",
      "Front knee at 90°, drive up, alternate",
    ],
  },
  {
    id: "facepulls",
    name: "Cable Face Pull",
    muscle: "SHOULDERS",
    equipment: [EQUIPMENT.CABLE],
    kind: "REPS",
    how: [
      "Rope at face height",
      "Pull to forehead, elbows high",
      "Rotate knuckles back, squeeze",
    ],
  },
  {
    id: "db-rdl",
    name: "Dumbbell Romanian Deadlift",
    muscle: "HAMSTRINGS",
    equipment: [EQUIPMENT.DUMBBELL],
    kind: "REPS",
    how: [
      "Hold dumbbells in front of your thighs, knees slightly bent",
      "Push hips back, keeping the weights close and your spine neutral",
      "Stop at a comfortable hamstring stretch, then stand by driving hips forward",
    ],
  },
];

const metadata = {
  "jumping-jacks": {
    muscles: ["legs", "shoulders", "core"],
    pattern: "cardio",
  },
  "bw-squat": { muscles: ["legs"], pattern: "squat" },
  "push-up": { muscles: ["chest", "arms", "shoulders"], pattern: "push" },
  "rev-lunge-bw": { muscles: ["legs"], pattern: "squat" },
  plank: { muscles: ["core"], pattern: "core" },
  "mountain-climbers": { muscles: ["core", "legs"], pattern: "cardio" },
  "sl-bridge": { muscles: ["legs"], pattern: "hinge" },
  burpee: { muscles: ["legs", "chest", "core"], pattern: "cardio" },
  "db-squat": { muscles: ["legs"], pattern: "squat" },
  "db-press": { muscles: ["shoulders", "arms"], pattern: "push" },
  "db-bent-row": { muscles: ["back", "arms"], pattern: "pull" },
  "bb-rev-lunge": { muscles: ["legs"], pattern: "squat" },
  facepulls: { muscles: ["shoulders", "back"], pattern: "pull" },
  "db-rdl": { muscles: ["legs", "back"], pattern: "hinge" },
};
const gearIds = {
  BODY_ONLY: null,
  DUMBBELL: "dumbbells",
  BARBELL: "barbell",
  CABLE: "cable",
  BENCH: "bench",
};
export const EXERCISES = [
  ...baseExercises.map((exercise) => ({
    ...exercise,
    ...metadata[exercise.id],
    equipment: [
      ...exercise.equipment.map((id) => gearIds[id]).filter(Boolean),
      ...(exercise.id === "bb-rev-lunge" ? ["rack"] : []),
    ],
    defaultReps: 10,
    defaultSecs: 30,
  })),
  ...additionalExercises,
];
export const EQUIPMENT_OPTIONS = equipmentOptions;
export const exerciseById = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
);

export function planTotals(plan) {
  const sets = plan.steps.reduce((n, step) => n + step.sets, 0);
  const workSecs = plan.steps.reduce((n, step, index) => {
    const perSet =
      (step.secs ?? step.reps * 3) * (exerciseById[step.ex]?.perSide ? 2 : 1);
    const rests = step.sets - (index === plan.steps.length - 1 ? 1 : 0);
    return n + perSet * step.sets + step.rest * Math.max(0, rests);
  }, 0);
  return {
    sets,
    mins: Math.max(1, Math.round(workSecs / 60)),
    seconds: workSecs,
  };
}
