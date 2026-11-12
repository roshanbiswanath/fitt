import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addSessionSet,
  recordSet,
  sessionEntry,
  startSession,
  targetOf,
} from "./training.js";
import { lastActualFor, loadStore } from "./store.js";
import { applyAdjustments } from "./profiles.js";
const fixture = {
  id: "regression",
  name: "Regression workout",
  steps: [
    { ex: "jumping-jacks", sets: 1, secs: 45, rest: 15 },
    { ex: "bw-squat", sets: 3, reps: 12, rest: 40 },
    { ex: "plank", sets: 1, secs: 30, rest: 0 },
  ],
};

test("partial set reduces the next set without changing recommendation or logged actual", () => {
  let run = recordSet(startSession(fixture, []), []);
  run = recordSet({ ...run, actual: 5 }, []);
  assert.equal(run.today, 5);
  assert.equal(run.actual, 5);
  assert.equal(targetOf(run.queue[run.pos]), 12);
  assert.equal(run.records.at(-1).actual, 5);
  assert.equal(run.records.at(-1).done, false);
});
test("final partial set is saved and unfinished sessions never invent performed sets", () => {
  let run = recordSet({ ...startSession(fixture, []), actual: 0 }, []);
  assert.equal(sessionEntry(run).sets.length, 1);
  assert.equal(sessionEntry(run).completed, false);
  while (run.pos < run.queue.length - 1) run = recordSet(run, []);
  run = recordSet({ ...run, actual: 3 }, []);
  assert.equal(sessionEntry(run).sets.at(-1).actual, 3);
  assert.equal(sessionEntry(run).sets.at(-1).done, false);
  assert.equal(sessionEntry(run).completed, true);
});
test("zero-result workouts still offer a usable timer", () => {
  const run = startSession(fixture, [
    { sets: [{ exId: "jumping-jacks", actual: 0, target: 45 }] },
  ]);
  assert.equal(run.today, 5);
  assert.equal(targetOf(run.queue[0]), 45);
});
test("custom reps and an extra set preserve original recommendations and set ordering", () => {
  const plan = applyAdjustments(
    { ...fixture, steps: [fixture.steps[1], fixture.steps[2]] },
    { "bw-squat": { sets: 3, target: 15 } },
  );
  let run = startSession(plan, []);
  assert.equal(run.actual, 15);
  run = addSessionSet(run);
  assert.equal(run.queue.filter((s) => s.ex === "bw-squat").length, 4);
  assert.deepEqual(run.queue.filter((s) => s.ex === "bw-squat").map((s) => s.setIndex), [0, 1, 2, 3]);
  run = recordSet({ ...run, actual: 13 }, []);
  assert.equal(run.records[0].target, 12);
  assert.equal(run.records[0].actual, 13);
  assert.equal(run.records[0].workingTarget, 15);
  assert.equal(run.actual, 13);
  assert.equal(run.queue.at(-1).ex, "plank");
});

test("skipping a set records zero without crediting it or losing the next set", () => {
  let run = startSession({ ...fixture, steps: [fixture.steps[1]] }, []);
  run = recordSet(run, [], Date.now(), true);
  assert.equal(run.records[0].skipped, true);
  assert.equal(run.records[0].actual, 0);
  assert.equal(run.records[0].done, false);
  assert.equal(run.phase, "rest");
  assert.equal(run.pos, 1);
});

test("reduced target-set count is used in the workout queue", () => {
  const reduced = applyAdjustments(
    { ...fixture, steps: [fixture.steps[1]] },
    { "bw-squat": { sets: 1, target: 12 } },
  );
  const run = startSession(reduced, []);
  assert.equal(run.queue.length, 1);
  assert.equal(run.queue[0].sets, 1);
});
test("retired exercise history is not reinterpreted or used for new exercise targets", (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  });
  const sets = [
    { exId: "bench-hops", set: 1, target: 30, actual: 18 },
    { exId: "goblet-squat", set: 1, target: 10, actual: 6 },
  ];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => JSON.stringify({ history: [{ sets }] }) },
  });
  const { history } = loadStore();
  assert.equal(history[0].sets[0].exerciseName, "Bench Hops");
  assert.equal(history[0].sets[0].unit, "sec");
  assert.equal(history[0].sets[1].exerciseName, "Dumbbell Goblet Squat");
  assert.equal(lastActualFor(history, "db-rdl"), null);
  assert.equal(lastActualFor(history, "db-squat"), null);
});
