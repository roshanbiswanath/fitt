// Minimal localStorage-backed training log.
// History entry: { id, dateISO, planId, planName, secs, sets: [{ exId, set, target, actual, done }] }
// Adjustment rule: next session starts from your last actual (actual >= target
// → target + small progression; actual < target → your actual). The plan's
// recommended target is always displayed alongside.

import { useCallback, useState } from "react";

const KEY = "fitt-v1";

function blank() {
  return { history: [] };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    // Retired movements keep their original names/units; never relabel an old
    // bench-hop result as a deadlift or use it to adjust the new movement.
    const retired = {
      "bench-hops": { exerciseName: "Bench Hops", unit: "sec" },
      "goblet-squat": { exerciseName: "Dumbbell Goblet Squat", unit: "reps" },
    };
    return { history: Array.isArray(parsed.history) ? parsed.history.map((entry) => ({
      ...entry, sets: entry.sets.map((set) => ({ ...retired[set.exId], ...set })),
    })) : [] };
  } catch {
    return blank();
  }
}

/** Last logged actual for an exercise id, or null. */
export function lastActualFor(history, exId) {
  for (let i = history.length - 1; i >= 0; i--) {
    const logged = history[i].sets.filter((s) => s.exId === exId && typeof s.actual === "number");
    if (logged.length) return logged[logged.length - 1].actual;
  }
  return null;
}

/** Adjusted start point for today + whether it differs from recommended. */
export function adjustedTarget(step, lastActual) {
  const recommended = step.secs ?? step.reps;
  if (lastActual == null) return { today: recommended, progressed: false };
  const unit = step.secs != null ? 5 : 1; // +5s holds, +1 rep
  const today = lastActual >= recommended ? recommended + unit : lastActual;
  return { today, progressed: today !== recommended };
}

export function streakDays(history) {
  const days = new Set(history.map((h) => h.dateISO.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function useTrainingLog() {
  const [store, setStore] = useState(loadStore);

  const logWorkout = useCallback((entry) => {
    setStore((prev) => {
      const next = { history: [...prev.history, entry] };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode — session still completes */
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setStore(blank());
    localStorage.removeItem(KEY);
  }, []);

  return { history: store.history, logWorkout, clearAll };
}

/** crypto.randomUUID needs a secure context (missing on http:// LAN dev and
 *  some WebViews); getRandomValues works everywhere, Math.random last. */
export function newId() {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto?.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
