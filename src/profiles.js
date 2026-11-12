import { useState } from "react";
import { defaultProfile, generatePlan, LOCATIONS } from "./planner.js";

const KEY = "fitt-workout-profiles-v1";
function initial() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    /* start with defaults */
  }
  const profiles = Object.fromEntries(
    LOCATIONS.map(({ id }) => {
      const stored = saved?.profiles?.[id];
      const config = generatePlan({
        ...defaultProfile(id),
        ...stored,
        location: id,
      }).config;
      return [id, { ...config, adjustments: stored?.adjustments ?? {} }];
    }),
  );
  return {
    location: LOCATIONS.some((l) => l.id === saved?.location)
      ? saved.location
      : "home",
    profiles,
  };
}
export function applyAdjustments(plan, adjustments) {
  return {
    ...plan,
    steps: plan.steps.map((step) => {
      const saved = adjustments?.[step.ex];
      const timed = step.secs != null;
      const valid =
        saved &&
        Number.isInteger(saved.sets) &&
        saved.sets >= 1 &&
        saved.sets <= 10 &&
        Number.isInteger(saved.target) &&
        saved.target >= (timed ? 5 : 1) &&
        saved.target <= (timed ? 600 : 100);
      return {
        ...step,
        recommendedTarget: step.secs ?? step.reps,
        recommendedSets: step.sets,
        ...(valid
          ? {
              sets: saved.sets,
              [timed ? "secs" : "reps"]: saved.target,
              customized: saved.target !== (step.secs ?? step.reps),
            }
          : {}),
      };
    }),
  };
}
export function useWorkoutProfiles() {
  const [state, setState] = useState(initial);
  function commit(change) {
    setState((current) => {
      const next = change(current);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }
  const selectLocation = (location) => commit((s) => ({ ...s, location }));
  const update = (patch) =>
    commit((s) => ({
      ...s,
      profiles: {
        ...s.profiles,
        [s.location]: { ...s.profiles[s.location], ...patch },
      },
    }));
  return {
    location: state.location,
    profile: state.profiles[state.location],
    selectLocation,
    update,
  };
}
