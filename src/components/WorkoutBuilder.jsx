import { useState } from "react";
import { EQUIPMENT_OPTIONS, exerciseById } from "../data/library.js";
import { DURATIONS, FOCUSES } from "../planner.js";
import { Icon } from "./Visuals";
import { ExerciseAnimation } from "./ExerciseAnimation";

function Pages({ page, count, onChange }) {
  if (count <= 1) return null;
  return (
    <div className="picker-pages">
      <button
        className="icon-button"
        disabled={!page}
        aria-label="Previous options"
        onClick={() => onChange(page - 1)}
      >
        <Icon name="back" size={18} />
      </button>
      <span>
        {page + 1}/{count}
      </span>
      <button
        className="icon-button"
        disabled={page >= count - 1}
        aria-label="Next options"
        onClick={() => onChange(page + 1)}
      >
        <Icon name="arrow" size={18} />
      </button>
    </div>
  );
}

export function EquipmentPicker({ profile, onSave }) {
  const [selected, setSelected] = useState(profile.equipment);
  const [group, setGroup] = useState("weights");
  const [page, setPage] = useState(0);
  const labels = {
    basics: "Basics",
    weights: "Weights",
    stations: "Machines",
    cardio: "Cardio",
    recovery: "Recovery",
  };
  const options = EQUIPMENT_OPTIONS.filter((e) => e.group === group);
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  return (
    <div className="equipment-picker">
      <div
        className="equipment-tabs"
        role="group"
        aria-label="Equipment categories"
      >
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={id === group}
            onClick={() => {
              setGroup(id);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="equipment-options">
        {options.slice(page * 8, page * 8 + 8).map((e) => (
          <label
            key={e.id}
            className={selected.includes(e.id) ? "selected" : ""}
          >
            <input
              type="checkbox"
              checked={selected.includes(e.id)}
              onChange={() => toggle(e.id)}
            />
            <span>{e.label}</span>
          </label>
        ))}
      </div>
      <Pages
        page={page}
        count={Math.ceil(options.length / 8)}
        onChange={setPage}
      />
      <div className="equipment-summary">
        <span>
          {selected.length ? `${selected.length} selected` : "Bodyweight only"}
        </span>
        <button className="text-button" onClick={() => setSelected([])}>
          Clear
        </button>
      </div>
      <button className="primary" onClick={() => onSave(selected)}>
        Save equipment
        <Icon name="check" />
      </button>
    </div>
  );
}

export function SessionPicker({ profile, onSave }) {
  const [focus, setFocus] = useState(profile.focus);
  const [minutes, setMinutes] = useState(profile.minutes);
  return (
    <div className="session-picker">
      <div className="focus-options" role="group" aria-label="Workout focus">
        {FOCUSES.map((f) => (
          <button
            key={f.id}
            aria-pressed={focus === f.id}
            onClick={() => setFocus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div
        className="duration-options"
        role="group"
        aria-label="Session length"
      >
        {DURATIONS.map((duration) => (
          <button
            key={duration}
            aria-pressed={minutes === duration}
            onClick={() => setMinutes(duration)}
          >
            {duration}
            <small>min</small>
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => onSave({ focus, minutes })}>
        Build my workout
        <Icon name="arrow" />
      </button>
    </div>
  );
}

export function PlanEditor({ plan, onSave }) {
  const [steps, setSteps] = useState(() => plan.steps.map((s) => ({ ...s })));
  const [page, setPage] = useState(0);
  const step = steps[page];
  const exercise = exerciseById[step.ex];
  const timed = step.secs != null;
  const target = timed ? "secs" : "reps";
  const patch = (key, value) =>
    setSteps((current) =>
      current.map((s, index) => (index === page ? { ...s, [key]: value } : s)),
    );
  const valid = steps.every(
    (s) =>
      Number.isInteger(Number(s.sets)) &&
      Number(s.sets) >= 1 &&
      Number(s.sets) <= 10 &&
      Number.isInteger(Number(s.secs ?? s.reps)) &&
      Number(s.secs ?? s.reps) >= (s.secs != null ? 5 : 1) &&
      Number(s.secs ?? s.reps) <= (s.secs != null ? 600 : 100),
  );
  return (
    <div className="plan-editor">
      <div className="editor-move">
        <h3>{exercise.name}</h3>
        <span>
          {page + 1}/{steps.length}
        </span>
      </div>
      <div className="editor-animation">
        <ExerciseAnimation
          key={step.ex}
          id={step.ex}
          stillFrame={exercise.stillFrame}
          label={exercise.name}
        />
      </div>
      <p className="original-target">
        Recommended {step.recommendedSets} × {step.recommendedTarget}{" "}
        {timed ? "sec" : "reps"}
        {exercise.perSide ? " /side" : ""}
      </p>
      <div className="target-fields">
        <label>Sets</label>
        <div className="edit-set-stepper">
          <button
            type="button"
            aria-label="Reduce recommended set count"
            disabled={Number(step.sets) <= 1}
            onClick={() => patch("sets", Math.max(1, Number(step.sets) - 1))}
          >
            −
          </button>
          <input
            aria-label="Sets to perform"
            type="number"
            inputMode="numeric"
            min="1"
            max="10"
            value={step.sets}
            onChange={(e) => patch("sets", e.target.value)}
          />
          <button
            type="button"
            aria-label="Add recommended set"
            disabled={Number(step.sets) >= 10}
            onClick={() => patch("sets", Math.min(10, Number(step.sets) + 1))}
          >
            +
          </button>
        </div>
        <label>
          {timed ? "Seconds" : "Reps"}
          {exercise.perSide ? " /side" : ""}
          <input
            type="number"
            inputMode="numeric"
            min={timed ? 5 : 1}
            max={timed ? 600 : 100}
            value={step[target]}
            onChange={(e) => patch(target, e.target.value)}
          />
        </label>
      </div>
      <Pages page={page} count={steps.length} onChange={setPage} />
      <div className="editor-actions">
        <button
          className="text-button"
          onClick={() =>
            setSteps((current) =>
              current.map((s) => ({
                ...s,
                sets: s.recommendedSets,
                [s.secs != null ? "secs" : "reps"]: s.recommendedTarget,
              })),
            )
          }
        >
          Reset to recommended
        </button>
        <button
          className="primary"
          disabled={!valid}
          onClick={() =>
            onSave(
              Object.fromEntries(
                steps.map((s) => [
                  s.ex,
                  { sets: Number(s.sets), target: Number(s.secs ?? s.reps) },
                ]),
              ),
            )
          }
        >
          Save targets
          <Icon name="check" />
        </button>
      </div>
    </div>
  );
}
