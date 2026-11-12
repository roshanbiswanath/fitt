import {
  EQUIPMENT_OPTIONS,
  EXERCISES,
  exerciseById,
  planTotals,
} from "./data/library.js";

export const LOCATIONS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "gym", label: "Gym", icon: "gym" },
  { id: "quick", label: "Quick", icon: "bolt" },
];
export const FOCUSES = [
  { id: "fat-loss", label: "Fat loss" },
  { id: "full-body", label: "Full body" },
  { id: "cardio", label: "Cardio" },
  { id: "arms", label: "Arms" },
  { id: "shoulders", label: "Shoulders" },
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "mobility", label: "Mobility" },
];
export const DURATIONS = [10, 15, 20, 30, 45];
export const defaultProfile = (location) => ({
  location,
  equipment: [],
  focus:
    location === "gym"
      ? "full-body"
      : location === "quick"
        ? "cardio"
        : "fat-loss",
  minutes: location === "gym" ? 30 : location === "quick" ? 10 : 20,
});
const gearIds = new Set(EQUIPMENT_OPTIONS.map((e) => e.id));
const preferred = [
  "bw-squat",
  "db-squat",
  "db-rdl",
  "push-up",
  "db-floor-press",
  "db-bent-row",
  "band-row",
  "machine-row",
  "glute-bridge",
  "plank",
  "dead-bug",
  "jumping-jacks",
  "high-knees",
  "no-jump-burpee",
  "db-curl",
  "db-triceps",
  "db-lateral",
  "db-standing-press",
];
const special = new Set(["fat-loss", "full-body", "cardio", "mobility"]);
const indoorCardio = new Set([
  "treadmill",
  "bike",
  "air-bike",
  "elliptical",
  "rower",
  "stepper",
]);

export function generatePlan(input) {
  const location = LOCATIONS.some((l) => l.id === input.location)
    ? input.location
    : "home";
  const defaults = defaultProfile(location);
  const config = {
    location,
    equipment: [
      ...new Set((input.equipment ?? []).filter((id) => gearIds.has(id))),
    ].sort(),
    focus: FOCUSES.some((f) => f.id === input.focus)
      ? input.focus
      : defaults.focus,
    minutes: DURATIONS.includes(Number(input.minutes))
      ? Number(input.minutes)
      : defaults.minutes,
  };
  const available = new Set(config.equipment);
  const muscleFocus = !special.has(config.focus);
  const candidates = EXERCISES.filter((e) =>
    e.equipment.every((g) => available.has(g)),
  ).filter((e) => {
    if (config.focus === "cardio") return e.pattern === "cardio";
    if (config.focus === "mobility") return e.pattern === "mobility";
    if (muscleFocus)
      return (
        e.pattern !== "mobility" &&
        e.pattern !== "cardio" &&
        e.muscles.includes(config.focus)
      );
    return (
      e.pattern !== "mobility" &&
      (config.focus === "fat-loss" || e.pattern !== "cardio")
    );
  });
  const score = (e) => {
    const rank = preferred.indexOf(e.id);
    return (
      e.equipment.length * 20 +
      (muscleFocus && e.muscles[0] === config.focus ? 18 : 0) +
      (rank < 0 ? 0 : 15 - rank / 2) -
      (e.perSide ? 2 : 0) -
      (["pike-pushup", "pull-up", "burpee", "bb-rev-lunge"].includes(e.id)
        ? 25
        : 0)
    );
  };
  candidates.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const desired = Math.min(8, Math.max(3, Math.ceil(config.minutes / 5)));
  const chosen = [];
  function choose(pattern, primaryMuscle) {
    const match = candidates.find(
      (e) =>
        !chosen.includes(e) &&
        (!pattern || e.pattern === pattern) &&
        (!primaryMuscle || e.muscles[0] === primaryMuscle),
    );
    if (match) chosen.push(match);
  }
  if (config.focus === "full-body" || config.focus === "fat-loss") {
    for (const pattern of ["squat", "push", "pull", "hinge", "core"])
      if (chosen.length < desired) choose(pattern);
    if (config.focus === "fat-loss" && chosen.length < desired)
      choose("cardio");
  } else if (config.focus === "arms") {
    // Include both elbow flexion and extension rather than only curls.
    const curl = candidates.find((e) => /curl/i.test(e.name));
    const triceps = candidates.find((e) => /tricep|push.?up|dip/i.test(e.name));
    if (curl) chosen.push(curl);
    if (triceps && !chosen.includes(triceps)) chosen.push(triceps);
  }
  while (chosen.length < Math.min(desired, candidates.length)) {
    const next =
      candidates.find(
        (e) =>
          !chosen.includes(e) &&
          (muscleFocus ||
            !chosen.some(
              (c) => c.pattern === e.pattern && c.muscles[0] === e.muscles[0],
            )),
      ) ?? candidates.find((e) => !chosen.includes(e));
    if (!next) break;
    chosen.push(next);
  }
  const plan = {
    id: `${config.location}:${config.focus}:${config.minutes}:${config.equipment.join("+") || "bodyweight"}`,
    name: `${FOCUSES.find((f) => f.id === config.focus).label} · ${LOCATIONS.find((l) => l.id === location).label}`,
    config,
    steps: chosen.map((e) => ({
      ex: e.id,
      sets: 3,
      ...(e.kind === "TIME"
        ? {
            secs: e.equipment.some((g) => indoorCardio.has(g))
              ? 180
              : (e.defaultSecs ?? 30),
          }
        : { reps: e.defaultReps ?? 10 }),
      rest:
        config.focus === "mobility"
          ? 15
          : config.focus === "cardio" || config.focus === "fat-loss"
            ? 30
            : 60,
    })),
  };
  if (!plan.steps.length)
    return {
      ...plan,
      note: "No matching exercises with this equipment. Change your focus or equipment.",
    };
  const seconds = config.minutes * 60;
  // Add sets only while they improve the estimate; never generate unbounded volume.
  for (let i = 0; i < 48; i++) {
    const before = planTotals(plan).seconds;
    let best = null,
      error = Math.abs(seconds - before);
    const minSets = Math.min(
      ...plan.steps.filter((step) => step.sets < 4).map((step) => step.sets),
    );
    for (let index = 0; index < plan.steps.length; index++) {
      const current = plan.steps[index];
      if (current.sets >= 4 || current.sets > minSets) continue;
      const extra =
        (current.secs ?? current.reps * 3) *
          (exerciseById[current.ex].perSide ? 2 : 1) +
        current.rest;
      const nextError = Math.abs(seconds - before - extra);
      if (nextError < error) {
        best = index;
        error = nextError;
      }
    }
    if (best == null) break;
    plan.steps[best].sets++;
  }
  const estimate = planTotals(plan).seconds;
  if (estimate < seconds * 0.8)
    plan.note =
      "A shorter session fits this equipment and focus. Add sets or choose another focus for more variety.";
  return plan;
}
