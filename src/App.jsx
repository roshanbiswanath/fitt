import { useEffect, useMemo, useRef, useState } from "react";
import { exerciseById, planTotals } from "./data/library";
import { FOCUSES, LOCATIONS, generatePlan } from "./planner";
import { applyAdjustments, useWorkoutProfiles } from "./profiles";
import {
  EquipmentPicker,
  SessionPicker,
  PlanEditor,
} from "./components/WorkoutBuilder";
import { useTrainingLog } from "./store";
import {
  clock,
  elapsedWork,
  localDay,
  recordSet,
  sessionEntry,
  addSessionSet,
  startSession,
  targetOf,
  unitOf,
} from "./training";
import { Icon } from "./components/Visuals";
import { ExerciseAnimation } from "./components/ExerciseAnimation";
import "./App.css";

const SHORT_NAMES = {
  "jumping-jacks": "Jumping jacks",
  "bw-squat": "Squats",
  "push-up": "Push-ups",
  "rev-lunge-bw": "Reverse lunges",
  plank: "Plank",
  "mountain-climbers": "Mountain climbers",
  "sl-bridge": "Single-leg bridge",
  burpee: "Burpees",
  "db-rdl": "Romanian deadlift",
  "db-squat": "Dumbbell squats",
  "db-press": "Shoulder press",
  "db-bent-row": "Dumbbell rows",
  "bb-rev-lunge": "Barbell lunges",
  facepulls: "Face pulls",
};
const nameOf = (id) =>
  SHORT_NAMES[id] ??
  exerciseById[id]?.shortName ??
  exerciseById[id]?.name ??
  id;
const prescription = (step) =>
  `${step.sets} × ${targetOf(step)}${step.secs == null ? "" : "s"}${exerciseById[step.ex].perSide ? " /side" : ""}`;

function Ring({ value, max, size = 64, children, className = "" }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  return (
    <div className={`ring ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="ring-fill"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

function Demo({ exercise }) {
  return (
    <div className="demo demo-vector">
      <ExerciseAnimation
        key={exercise.id}
        id={exercise.id}
        stillFrame={exercise.stillFrame}
        label={exercise.name}
      />
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body">
        <header className="sheet-header">
          <h2 id="sheet-title">{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export default function App() {
  const { history, logWorkout, clearAll } = useTrainingLog();
  const [view, setView] = useState("home");
  const { location, profile, selectLocation, update } = useWorkoutProfiles();
  const [session, setSession] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [now, setNow] = useState(Date.now());
  const plan = useMemo(
    () => applyAdjustments(generatePlan(profile), profile.adjustments),
    [profile],
  );

  const ticking = session?.phase === "rest" || session?.timerStartedAt != null;
  useEffect(() => {
    if (!ticking) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setSession((current) => {
        if (!current) return current;
        if (current.phase === "rest" && current.restUntil <= time)
          return { ...current, phase: "work", restUntil: null };
        if (
          current.timerStartedAt != null &&
          elapsedWork(current, time) >= current.today
        ) {
          return {
            ...current,
            elapsed: current.today,
            actual: current.today,
            timerStartedAt: null,
          };
        }
        return current;
      });
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [ticking]);

  function begin() {
    if (!session) {
      setSession(startSession(plan, history));
      setNow(Date.now());
    }
    setView("player");
  }
  function save(current) {
    const entry = sessionEntry(current);
    logWorkout(entry);
    setCompletion(entry);
    setSession(null);
    setOverlay(null);
    setView("complete");
  }
  function finishSet() {
    const next = recordSet(session, history);
    if (next.phase === "complete") save(next);
    else {
      setSession(next);
      setNow(Date.now());
    }
  }
  function toggleTimer() {
    const time = Date.now();
    setNow(time);
    setSession((current) => {
      if (current.timerStartedAt != null) {
        const elapsed = elapsedWork(current, time);
        return { ...current, elapsed, actual: elapsed, timerStartedAt: null };
      }
      const restart = current.elapsed >= current.today;
      return {
        ...current,
        elapsed: restart ? 0 : current.elapsed,
        actual: restart ? 0 : current.elapsed,
        timerStartedAt: time,
      };
    });
  }

  return (
    <main
      className={`app ${view === "player" || view === "complete" ? "app-focus" : ""}`}
    >
      {view === "home" && (
        <Home
          plan={plan}
          profile={profile}
          location={location}
          onLocation={selectLocation}
          onEquipment={() => setOverlay({ type: "equipment" })}
          onSetup={() => setOverlay({ type: "setup" })}
          onEdit={() => setOverlay({ type: "targets" })}
          active={session}
          onStart={begin}
          onPreview={(id) => setOverlay({ type: "exercise", id })}
        />
      )}
      {view === "journal" && (
        <Journal
          history={history}
          onSelect={(entry) => setOverlay({ type: "history", entry })}
          onDelete={() => setOverlay({ type: "delete" })}
          onStart={() => setView("home")}
        />
      )}
      {view === "player" && session && (
        <Player
          session={session}
          now={now}
          onExit={() => setOverlay({ type: "exit" })}
          onChange={(actual) => setSession((s) => ({ ...s, actual }))}
          onTimer={toggleTimer}
          onAddSet={() => setSession((current) => addSessionSet(current))}
          onFinish={finishSet}
          onSkipSet={() => {
            const next = recordSet({ ...session, actual: 0 }, history, Date.now(), true);
            if (next.phase === "complete") save(next);
            else setSession(next);
          }}
          onSkip={() =>
            setSession((s) => ({ ...s, phase: "work", restUntil: null }))
          }
          onInfo={() =>
            setOverlay({ type: "exercise", id: session.queue[session.pos].ex })
          }
        />
      )}
      {view === "complete" && completion && (
        <Complete
          entry={completion}
          onHome={() => setView("home")}
          onJournal={() => setView("journal")}
        />
      )}

      {(view === "home" || view === "journal") && (
        <nav className="bottom-nav" aria-label="Main navigation">
          <button
            aria-current={view === "home" ? "page" : undefined}
            onClick={() => setView("home")}
          >
            <Icon name="home" />
            <span>Train</span>
          </button>
          <button
            aria-current={view === "journal" ? "page" : undefined}
            onClick={() => setView("journal")}
          >
            <Icon name="journal" />
            <span>Journal</span>
          </button>
        </nav>
      )}

      {overlay?.type === "equipment" && (
        <Sheet
          title={`${LOCATIONS.find((l) => l.id === location).label} equipment`}
          onClose={() => setOverlay(null)}
        >
          <EquipmentPicker
            profile={profile}
            onSave={(equipment) => {
              update({ equipment });
              setOverlay(null);
            }}
          />
        </Sheet>
      )}
      {overlay?.type === "setup" && (
        <Sheet title="Your workout" onClose={() => setOverlay(null)}>
          <SessionPicker
            profile={profile}
            onSave={(settings) => {
              update(settings);
              setOverlay(null);
            }}
          />
        </Sheet>
      )}
      {overlay?.type === "targets" && (
        <Sheet title="Make it yours" onClose={() => setOverlay(null)}>
          <PlanEditor
            plan={plan}
            onSave={(adjustments) => {
              update({
                adjustments: { ...profile.adjustments, ...adjustments },
              });
              setOverlay(null);
            }}
          />
        </Sheet>
      )}
      {overlay?.type === "exercise" && (
        <Sheet title={nameOf(overlay.id)} onClose={() => setOverlay(null)}>
          <Demo exercise={exerciseById[overlay.id]} />
          <ol className="form-cues">
            {exerciseById[overlay.id].how.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ol>
          {exerciseById[overlay.id].perSide && (
            <p className="sheet-note">Reps are for each side</p>
          )}
        </Sheet>
      )}
      {overlay?.type === "exit" && (
        <Sheet title="Take a breather?" onClose={() => setOverlay(null)}>
          <div className="sheet-actions">
            <button className="primary" onClick={() => setOverlay(null)}>
              Keep training
              <Icon name="arrow" />
            </button>
            <button
              className="secondary"
              onClick={() => {
                setOverlay(null);
                setView("home");
              }}
            >
              Back to today
            </button>
            {session.records.length > 0 && (
              <button className="text-button" onClick={() => save(session)}>
                Save {session.records.length} completed sets & end
              </button>
            )}
            <button
              className="text-button destructive"
              onClick={() => {
                setSession(null);
                setOverlay(null);
                setView("home");
              }}
            >
              Discard workout
            </button>
          </div>
        </Sheet>
      )}
      {overlay?.type === "delete" && (
        <Sheet title="Delete your journal?" onClose={() => setOverlay(null)}>
          <p className="sheet-note">
            All saved workouts on this device will be removed. This cannot be
            undone.
          </p>
          <div className="sheet-actions">
            <button className="secondary" onClick={() => setOverlay(null)}>
              Keep my workouts
            </button>
            <button
              className="primary delete-button"
              onClick={() => {
                clearAll();
                setOverlay(null);
              }}
            >
              Delete workouts
            </button>
          </div>
        </Sheet>
      )}
      {overlay?.type === "history" && (
        <HistoryDetail entry={overlay.entry} onClose={() => setOverlay(null)} />
      )}
    </main>
  );
}

function Home({
  plan,
  profile,
  location,
  onLocation,
  active,
  onStart,
  onPreview,
  onEquipment,
  onSetup,
  onEdit,
}) {
  const totals = planTotals(plan);
  const focus = FOCUSES.find((f) => f.id === profile.focus);
  const first = plan.steps[0]?.ex;
  return (
    <section className="screen home-screen">
      <header className="app-header">
        <span className="wordmark">
          fitt<span>.</span>
        </span>
        <span className="date">
          {new Date().toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </header>
      <div className="location-switch" aria-label="Workout location">
        {LOCATIONS.map((place) => (
          <button
            key={place.id}
            aria-pressed={place.id === location}
            onClick={() => onLocation(place.id)}
          >
            <Icon name={place.icon} size={18} />
            {place.label}
          </button>
        ))}
      </div>
      <div className="home-hero">
        <div className="hero-copy">
          <h1>
            {focus.label}.<br />
            Made for today.
          </h1>
          <div className="hero-meta">
            <span>
              <Icon name="time" size={17} />~{totals.mins} min
            </span>
            <span>{totals.sets} sets</span>
          </div>
        </div>
        {first && (
          <ExerciseAnimation
            key={first}
            id={first}
            stillFrame={exerciseById[first].stillFrame}
            decorative
          />
        )}
      </div>
      <div className="workout-settings">
        <button onClick={onEquipment} aria-label="Edit saved equipment">
          <Icon name="gym" size={17} />
          <span>
            {profile.equipment.length
              ? `${profile.equipment.length} equipment`
              : "Bodyweight"}
          </span>
          <Icon name="plus" size={15} />
        </button>
        <button
          onClick={onSetup}
          aria-label="Change workout focus and duration"
        >
          <span>
            {focus.label} · {profile.minutes} min
          </span>
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="lineup">
        <div className="section-heading">
          <h2>Your lineup</h2>
          <button
            className="edit-targets"
            onClick={onEdit}
            disabled={!plan.steps.length}
          >
            Edit sets & reps
          </button>
        </div>
        {plan.steps.length ? (
          <ol className="exercise-grid">
            {plan.steps.map((step, index) => (
              <li key={step.ex}>
                <button
                  className="exercise-item"
                  onClick={() => onPreview(step.ex)}
                  aria-label={`${exerciseById[step.ex].name}, ${prescription(step)}`}
                >
                  <span className="exercise-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="exercise-copy">
                    <strong>{nameOf(step.ex)}</strong>
                    <span>{prescription(step)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="plan-note">{plan.note}</p>
        )}
      </div>
      <footer className="home-action">
        {plan.note && plan.steps.length > 0 && (
          <span className="equipment-note">{plan.note}</span>
        )}
        <button
          className="primary"
          disabled={!active && !plan.steps.length}
          onClick={onStart}
        >
          {active ? "Resume workout" : "Start workout"}
          <Icon name="arrow" />
        </button>
      </footer>
    </section>
  );
}

function Player({
  session,
  now,
  onExit,
  onChange,
  onTimer,
  onAddSet,
  onFinish,
  onSkip,
  onInfo,
  onSkipSet,
}) {
  const q = session.queue[session.pos];
  const exercise = exerciseById[q.ex];
  const resting = session.phase === "rest";
  const running = session.timerStartedAt != null;
  const seconds = Math.max(
    0,
    Math.ceil(((session.restUntil ?? now) - now) / 1000),
  );
  const elapsed = elapsedWork(session, now);
  const completed = session.records.length;
  const valid =
    session.actual !== "" &&
    Number.isInteger(Number(session.actual)) &&
    Number(session.actual) >= 0;
  const target = q.recommendedTarget ?? targetOf(q);
  return (
    <section className={`screen player-screen ${resting ? "rest-screen" : ""}`}>
      <header className="player-header">
        <button
          className="icon-button"
          aria-label="Leave workout"
          onClick={onExit}
        >
          <Icon name="close" />
        </button>
        <div
          className="progress-rail"
          role="progressbar"
          aria-label="Completed sets"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={session.queue.length}
        >
          <span
            style={{ transform: `scaleX(${completed / session.queue.length})` }}
          />
        </div>
        <span className="session-counter">
          {resting ? completed : session.pos + 1}
          <span>/{session.queue.length}</span>
        </span>
      </header>
      {resting ? (
        <>
          <div className="rest-title">
            <span>Rest</span>
            <h1>Catch your breath.</h1>
          </div>
          <div className="rest-dial">
            <Ring value={seconds} max={session.restDuration || 1} size={240}>
              <span className="rest-time">{clock(seconds)}</span>
            </Ring>
          </div>
          <div className="up-next">
            <span>Up next</span>
            <h2>{nameOf(q.ex)}</h2>
            <p>
              {target} {unitOf(q)}
              {exercise.perSide ? " each side" : ""}
            </p>
          </div>
          <button className="primary" onClick={onSkip}>
            Ready when you are
            <Icon name="arrow" />
          </button>
        </>
      ) : (
        <>
          <div className="exercise-title">
            <h1>{nameOf(q.ex)}</h1>
            <button
              className="icon-button"
              aria-label="Exercise form"
              onClick={onInfo}
            >
              <Icon name="info" />
            </button>
          </div>
          <Demo exercise={exercise} />
          <div className="prescription-row">
            <Ring value={q.setIndex + 1} max={q.sets} size={60}>
              <span
                className="set-count"
                aria-label={`Set ${q.setIndex + 1} of ${q.sets}`}
              >
                {q.setIndex + 1}
                <small>/{q.sets}</small>
              </span>
            </Ring>
            <button
              className="extra-set"
              onClick={onAddSet}
              disabled={q.sets >= 10}
            >
              + Set
            </button>
            <div className="plan-target">
              <span>Plan</span>
              <strong>
                {target}{" "}
                <small>
                  {unitOf(q)}
                  {exercise.perSide ? " /side" : ""}
                </small>
              </strong>
            </div>
          </div>
          <div className="logging-control">
            <span className="input-label">
              {running
                ? "Remaining"
                : q.secs == null
                  ? "Reps completed"
                  : "Seconds completed"}
            </span>
            <div className="count-stepper">
              <button
                className="step-button"
                aria-label="Decrease completed amount"
                disabled={running}
                onClick={() =>
                  onChange(
                    Math.max(
                      0,
                      (Number(session.actual) || 0) - (q.secs == null ? 1 : 5),
                    ),
                  )
                }
              >
                <Icon name="minus" />
              </button>
              {running ? (
                <span className="live-count" role="timer">
                  {session.today - elapsed}
                </span>
              ) : (
                <input
                  aria-label="Completed amount"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={session.actual}
                  onChange={(e) => onChange(e.target.value)}
                />
              )}
              <button
                className="step-button"
                aria-label="Increase completed amount"
                disabled={running}
                onClick={() =>
                  onChange(
                    (Number(session.actual) || 0) + (q.secs == null ? 1 : 5),
                  )
                }
              >
                <Icon name="plus" />
              </button>
            </div>
            {q.secs != null ? (
              <button
                className="timer-toggle"
                onClick={onTimer}
                disabled={session.today === 0}
              >
                <Icon name={running ? "pause" : "play"} size={17} />
                {running
                  ? "Pause timer"
                  : elapsed >= session.today && session.today > 0
                    ? "Restart timer"
                    : elapsed > 0
                      ? "Resume timer"
                      : "Start timer"}
              </button>
            ) : (
              <span className="adaptive-hint">
                {session.today !== target
                  ? `Adjusted to you · ${session.today} reps`
                  : exercise.perSide
                    ? "Each side"
                    : ""}
              </span>
            )}
          </div>
          <button
            className="primary"
            disabled={!valid || running}
            onClick={onFinish}
          >
            {session.pos === session.queue.length - 1
              ? "Finish workout"
              : "Complete set"}
            <Icon name="check" />
          </button>
          <button className="skip-set" onClick={onSkipSet} disabled={running}>
            Skip set
          </button>
        </>
      )}
    </section>
  );
}
function Complete({ entry, onHome, onJournal }) {
  return (
    <section className="screen complete-screen">
      <header className="app-header">
        <span className="wordmark">
          fitt<span>.</span>
        </span>
      </header>
      <div className="completion-center">
        <div className="completion-mark">
          <Icon name="check" size={52} />
        </div>
        <h1>
          {entry.completed ? (
            <>
              Workout,
              <br />
              done.
            </>
          ) : (
            <>
              You showed up.
              <br />
              That counts.
            </>
          )}
        </h1>
        <p>{entry.planName}</p>
        <div className="completion-stats">
          <span>
            <strong>{entry.sets.length}</strong>sets logged
          </span>
          <span>
            <strong>{clock(entry.secs)}</strong>time moving
          </span>
        </div>
      </div>
      <div className="complete-actions">
        <button className="primary" onClick={onHome}>
          Back to today
          <Icon name="arrow" />
        </button>
        <button className="text-button" onClick={onJournal}>
          View workout
        </button>
      </div>
    </section>
  );
}

function Journal({ history, onSelect, onDelete, onStart }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(history.length / 3));
  const currentPage = Math.min(page, pageCount - 1);
  const entries = [...history]
    .reverse()
    .slice(currentPage * 3, currentPage * 3 + 3);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d;
  });
  const trained = new Set(history.map((h) => localDay(h.dateISO)));
  const minutes = Math.round(history.reduce((sum, h) => sum + h.secs, 0) / 60);
  return (
    <section className="screen journal-screen">
      <header className="app-header">
        <h1>Journal</h1>
        {history.length > 0 && (
          <button
            className="icon-button"
            aria-label="Delete workouts"
            onClick={onDelete}
          >
            <Icon name="trash" size={20} />
          </button>
        )}
      </header>
      <div className="week-strip">
        {days.map((d, i) => (
          <div key={localDay(d)} className={i === 6 ? "current-day" : ""}>
            <span>
              {d.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
            <span
              className={`day-mark ${trained.has(localDay(d)) ? "trained" : ""}`}
            >
              {trained.has(localDay(d)) ? (
                <Icon name="check" size={19} />
              ) : (
                d.getDate()
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="journal-totals">
        <div>
          <strong>{history.length}</strong>
          <span>workouts</span>
        </div>
        <div>
          <strong>{minutes}</strong>
          <span>minutes</span>
        </div>
        <div>
          <strong>{history.reduce((n, h) => n + h.sets.length, 0)}</strong>
          <span>sets logged</span>
        </div>
      </div>
      {history.length === 0 ? (
        <div className="journal-empty">
          <Icon name="journal" size={40} />
          <h2>
            Your first page
            <br />
            starts with a workout.
          </h2>
          <button className="secondary" onClick={onStart}>
            Find your workout
            <Icon name="arrow" size={18} />
          </button>
        </div>
      ) : (
        <div className="journal-entries">
          <div className="section-heading">
            <h2>Recent sessions</h2>
            <span>{history.length}</span>
          </div>
          <ul>
            {entries.map((h) => (
              <li key={h.id}>
                <button className="journal-entry" onClick={() => onSelect(h)}>
                  <span className="entry-icon">
                    <Icon
                      name={
                        LOCATIONS.find((place) => place.id === h.location)
                          ?.icon ??
                        (h.planId?.includes("home")
                          ? "home"
                          : h.planId?.includes("quick")
                            ? "bolt"
                            : "gym")
                      }
                    />
                  </span>
                  <span>
                    <strong>{h.planName}</strong>
                    <small>
                      {new Date(h.dateISO).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {h.sets.length} sets · {clock(h.secs)}
                    </small>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={currentPage} pages={pageCount} onChange={setPage} />
        </div>
      )}
    </section>
  );
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="icon-button"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <Icon name="back" size={18} />
      </button>
      <span>
        {page + 1}/{pages}
      </span>
      <button
        className="icon-button"
        aria-label="Next page"
        disabled={page === pages - 1}
        onClick={() => onChange(page + 1)}
      >
        <Icon name="arrow" size={18} />
      </button>
    </div>
  );
}

function HistoryDetail({ entry, onClose }) {
  const [page, setPage] = useState(0);
  const ids = [...new Set(entry.sets.map((s) => s.exId))];
  const current = ids.slice(page * 3, page * 3 + 3);
  return (
    <Sheet title="Workout log" onClose={onClose}>
      <p className="history-plan">{entry.planName}</p>
      <div className="history-groups">
        {current.map((id) => (
          <div key={id} className="history-group">
            <h3>
              {entry.sets.find((s) => s.exId === id)?.exerciseName ??
                nameOf(id)}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Plan</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {entry.sets
                  .filter((s) => s.exId === id)
                  .map((s) => (
                    <tr key={s.set}>
                      <td>{s.set}</td>
                      <td>{s.target}</td>
                      <td className={s.done ? "target-met" : "target-partial"}>
                        {s.actual}
                        <span>
                          {s.unit ??
                            (exerciseById[id]?.kind === "TIME"
                              ? "sec"
                              : "reps")}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <Pagination
        page={page}
        pages={Math.ceil(ids.length / 3)}
        onChange={setPage}
      />
    </Sheet>
  );
}
