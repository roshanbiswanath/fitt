import assert from "node:assert/strict";
import { test } from "node:test";
import { EQUIPMENT_OPTIONS, exerciseById, planTotals } from "./data/library.js";
import { DURATIONS, FOCUSES, generatePlan } from "./planner.js";

test("generated plans obey selected equipment and muscle focus for all supported options", () => {
  const sets = [
    [],
    ...EQUIPMENT_OPTIONS.map((e) => [e.id]),
    ["dumbbells", "bench"],
    ["barbell", "rack", "bench"],
    EQUIPMENT_OPTIONS.map((e) => e.id),
  ];
  for (const equipment of sets)
    for (const focus of FOCUSES) {
      const plan = generatePlan({
        location: "gym",
        equipment,
        focus: focus.id,
        minutes: 20,
      });
      assert.ok(plan.steps.length > 0 && plan.steps.length <= 8, focus.id);
      assert.equal(
        new Set(plan.steps.map((s) => s.ex)).size,
        plan.steps.length,
      );
      for (const step of plan.steps) {
        const ex = exerciseById[step.ex];
        assert.ok(
          ex.equipment.every((g) => equipment.includes(g)),
          `${ex.name} requires unselected gear`,
        );
        if (!["full-body", "cardio", "mobility"].includes(focus.id))
          assert.ok(
            ex.muscles.includes(focus.id),
            `${ex.name} does not target ${focus.id}`,
          );
        if (["cardio", "mobility"].includes(focus.id))
          assert.equal(ex.pattern, focus.id);
        assert.ok(step.sets >= 1 && step.sets <= 6);
      }
    }
});
test("selecting only dumbbells never assumes a bench or rack and uses them for appropriate strength work", () => {
  const plan = generatePlan({
    location: "home",
    equipment: ["dumbbells"],
    focus: "full-body",
    minutes: 30,
  });
  assert.ok(
    plan.steps.some((s) => exerciseById[s.ex].equipment.includes("dumbbells")),
  );
  assert.ok(
    plan.steps.every(
      (s) =>
        !exerciseById[s.ex].equipment.includes("bench") &&
        !exerciseById[s.ex].equipment.includes("rack"),
    ),
  );
});
test("duration changes real estimated workload rather than just the displayed label", () => {
  for (const focus of ["full-body", "cardio", "arms", "mobility"]) {
    const minutes = DURATIONS.map(
      (duration) =>
        planTotals(
          generatePlan({
            location: "gym",
            equipment: ["dumbbells", "bench", "bike"],
            focus,
            minutes: duration,
          }),
        ).seconds,
    );
    assert.ok(minutes.at(-1) > minutes[0], focus);
    for (let i = 1; i < minutes.length; i++)
      assert.ok(minutes[i] >= minutes[i - 1], focus);
  }
});
test("same saved selection generates an identical plan and unknown gear cannot grant access", () => {
  const config = {
    location: "gym",
    equipment: ["dumbbells"],
    focus: "chest",
    minutes: 15,
  };
  assert.deepEqual(
    generatePlan(config),
    generatePlan({ ...config, equipment: ["dumbbells", "not-a-machine"] }),
  );
});
