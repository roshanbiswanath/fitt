import { exerciseById } from "./data/library.js";
import { adjustedTarget, lastActualFor, newId } from "./store.js";

export const targetOf = (step) => step.secs ?? step.reps;
export const unitOf = (step) => (step.secs == null ? "reps" : "sec");
export const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export const localDay = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function startSession(plan, history) {
  const queue = plan.steps.flatMap((step) =>
    Array.from({ length: step.sets }, (_, setIndex) => ({ ...step, setIndex })),
  );
  if (!queue.length) throw new Error("A workout needs at least one exercise");
  const today = Math.max(
    queue[0].secs == null ? 1 : 5,
    queue[0].customized
      ? targetOf(queue[0])
      : adjustedTarget(queue[0], lastActualFor(history, queue[0].ex)).today,
  );
  return {
    id: newId(),
    planId: plan.id,
    planName: plan.name,
    location: plan.config?.location,
    startedAt: Date.now(),
    queue,
    pos: 0,
    records: [],
    actual: today,
    today,
    phase: "work",
    restUntil: null,
    restDuration: 0,
    timerStartedAt: null,
    elapsed: 0,
  };
}

export function elapsedWork(session, now) {
  return Math.min(
    session.today,
    session.elapsed +
      (session.timerStartedAt == null
        ? 0
        : Math.max(0, Math.floor((now - session.timerStartedAt) / 1000))),
  );
}

export function recordSet(session, history, now = Date.now(), skipped = false) {
  const q = session.queue[session.pos];
  const actual = Math.max(0, Math.floor(Number(session.actual) || 0));
  const records = [
    ...session.records,
    {
      exId: q.ex,
      exerciseName: exerciseById[q.ex].name,
      set: q.setIndex + 1,
      target: q.recommendedTarget ?? targetOf(q),
      workingTarget: targetOf(q),
      actual: skipped ? 0 : actual,
      skipped,
      unit: unitOf(q),
      perSide: Boolean(exerciseById[q.ex].perSide),
      done: !skipped && actual >= (q.recommendedTarget ?? targetOf(q)),
    },
  ];
  if (session.pos === session.queue.length - 1)
    return { ...session, records, phase: "complete", timerStartedAt: null };
  const next = session.queue[session.pos + 1];
  const prior = records.filter((s) => s.exId === next.ex).at(-1);
  // A partial set lowers the very next set too, not just tomorrow's workout.
  const last =
    prior && prior.actual < (prior.workingTarget ?? prior.target)
      ? prior.actual
      : lastActualFor(history, next.ex);
  const today = Math.max(
    next.secs == null ? 1 : 5,
    next.customized && !(prior && prior.actual < targetOf(next))
      ? targetOf(next)
      : adjustedTarget(next, last).today,
  );
  return {
    ...session,
    records,
    pos: session.pos + 1,
    today,
    actual: today,
    phase: q.rest > 0 ? "rest" : "work",
    restUntil: q.rest > 0 ? now + q.rest * 1000 : null,
    restDuration: q.rest,
    timerStartedAt: null,
    elapsed: 0,
  };
}

export function sessionEntry(session, now = Date.now()) {
  return {
    id: session.id,
    dateISO: new Date(now).toISOString(),
    planId: session.planId,
    planName: session.planName,
    location: session.location,
    secs: Math.max(0, Math.round((now - session.startedAt) / 1000)),
    completed: session.phase === "complete",
    sets: session.records,
  };
}

export function addSessionSet(session) {
  if (session.phase !== "work") return session;
  const current = session.queue[session.pos];
  if (current.sets >= 10) return session;
  const queue = session.queue.map((step) =>
    step.ex === current.ex ? { ...step, sets: current.sets + 1 } : step,
  );
  const last = queue.findLastIndex((step) => step.ex === current.ex);
  queue.splice(last + 1, 0, {
    ...current,
    sets: current.sets + 1,
    setIndex: current.sets,
  });
  return { ...session, queue };
}
