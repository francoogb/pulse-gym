"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, BicepsFlexed, Check, Clock3, Dumbbell, Footprints, HeartPulse, Plus, Search, Trash2, X } from "lucide-react";
import { exerciseGroups, exerciseLibrary } from "@/lib/exercise-library";

const DAYS = [
  { value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mié" },
  { value: 4, label: "Jue" }, { value: 5, label: "Vie" }, { value: 6, label: "Sáb" }, { value: 0, label: "Dom" },
];
const DAY_NAMES = Object.fromEntries(DAYS.map((day) => [day.value, day.label]));
const COLORS = ["#26d6c1", "#8b6ee8", "#ff9f43", "#ff715f", "#4b9cff", "#57cc72", "#f06f9d"];
const DURATIONS = ["30-45 min", "45-60 min", "60-75 min", "75-90 min"];
const CUSTOM_GROUPS = [...exerciseGroups.filter((item) => item !== "Todos"), "Otro"];
const ICONS = [
  { value: "dumbbell", label: "Mancuerna", Icon: Dumbbell },
  { value: "strength", label: "Fuerza", Icon: BicepsFlexed },
  { value: "legs", label: "Piernas", Icon: Footprints },
  { value: "cardio", label: "Cardio", Icon: Activity },
  { value: "heart", label: "Condición", Icon: HeartPulse },
];

function restLabel(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const extra = seconds % 60;
  return extra ? `${minutes}:${String(extra).padStart(2, "0")} min` : `${minutes} min`;
}

export default function RoutineBuilder({ onClose, onSaved, initialRoutine = null }) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("Todos");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeDay, setActiveDay] = useState(initialRoutine?.days?.[0] ?? 1);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({ name: "", group: "Pecho", sets: 3, reps: "8-12", weight: 0, rest: 90 });
  const [draft, setDraft] = useState(() => initialRoutine ? {
    name: initialRoutine.name,
    description: initialRoutine.description ?? "",
    days: [...initialRoutine.days],
    color: initialRoutine.color,
    icon: initialRoutine.icon,
    duration: initialRoutine.duration,
    exercises: initialRoutine.exercises.map((exercise) => ({
      day: exercise.day ?? initialRoutine.days[0], name: exercise.name, group: exercise.group, custom: exercise.custom, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight ?? 0, rest: exercise.rest,
    })),
  } : {
    name: "", description: "", days: [1], color: COLORS[0], icon: "dumbbell", duration: DURATIONS[1], exercises: [],
  });

  const filteredExercises = useMemo(() => exerciseLibrary.filter((exercise) => {
    const matchesGroup = group === "Todos" || exercise.group === group;
    const matchesSearch = exercise.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesGroup && matchesSearch;
  }), [group, search]);

  const selectedNames = new Set(draft.exercises.filter((exercise) => exercise.day === activeDay).map((exercise) => exercise.name));
  const totalSets = draft.exercises.reduce((total, exercise) => total + Number(exercise.sets || 0), 0);
  const PreviewIcon = ICONS.find((item) => item.value === draft.icon)?.Icon ?? Dumbbell;
  const orderedDays = DAYS.filter((day) => draft.days.includes(day.value));

  const toggleDay = (day) => {
    const removing = draft.days.includes(day);
    const days = removing ? draft.days.filter((item) => item !== day) : [...draft.days, day];
    setDraft((current) => ({ ...current, days, exercises: removing ? current.exercises.filter((exercise) => exercise.day !== day) : current.exercises }));
    if (removing && activeDay === day) setActiveDay(days[0] ?? 1);
  };

  const toggleExercise = (exercise) => setDraft((current) => ({
    ...current,
    exercises: current.exercises.some((item) => item.day === activeDay && item.name === exercise.name)
      ? current.exercises.filter((item) => !(item.day === activeDay && item.name === exercise.name))
      : [...current.exercises, { ...exercise, day: activeDay, weight: 0 }],
  }));

  const removeExercise = (index) => setDraft((current) => ({ ...current, exercises: current.exercises.filter((_, itemIndex) => itemIndex !== index) }));

  const addCustomExercise = () => {
    const name = customDraft.name.trim();
    if (name.length < 2) {
      setMessage("Escribe el nombre del ejercicio personalizado.");
      return;
    }
    if (draft.exercises.some((exercise) => exercise.day === activeDay && exercise.name.toLowerCase() === name.toLowerCase())) {
      setMessage(`${name} ya está añadido en ${DAY_NAMES[activeDay]}.`);
      return;
    }
    setDraft((current) => ({ ...current, exercises: [...current.exercises, { ...customDraft, name, day: activeDay, custom: true }] }));
    setCustomDraft({ name: "", group: "Pecho", sets: 3, reps: "8-12", weight: 0, rest: 90 });
    setCustomOpen(false);
    setMessage("");
  };

  const updateExercise = (index, field, value) => setDraft((current) => ({
    ...current,
    exercises: current.exercises.map((exercise, itemIndex) => itemIndex === index ? { ...exercise, [field]: value } : exercise),
  }));

  const next = () => {
    setMessage("");
    if (step === 1 && (draft.name.trim().length < 2 || !draft.days.length)) {
      setMessage("Escribe un nombre y selecciona al menos un día.");
      return;
    }
    if (step === 1) setActiveDay(orderedDays[0]?.value ?? draft.days[0]);
    const emptyDay = orderedDays.find((day) => !draft.exercises.some((exercise) => exercise.day === day.value));
    if (step === 2 && emptyDay) {
      setActiveDay(emptyDay.value);
      setMessage(`Añade al menos un ejercicio para ${emptyDay.label}.`);
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(initialRoutine ? `/api/rutinas?id=${initialRoutine.id}` : "/api/rutinas", {
        method: initialRoutine ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          exercises: draft.exercises.map((exercise) => ({
            name: exercise.name,
            day: exercise.day,
            group: exercise.group,
            sets: Number(exercise.sets),
            reps: String(exercise.reps),
            weight: Number(exercise.weight),
            rest: Number(exercise.rest),
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la rutina.");
      onSaved(data.routine);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="routine-builder-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="routine-builder" role="dialog" aria-modal="true" aria-labelledby="routine-builder-title">
        <header className="routine-builder-header">
          <div>
            <p>{initialRoutine ? "EDITAR RUTINA" : `PASO ${step} DE 4`}</p>
            <h2 id="routine-builder-title">{step === 1 ? "Información básica" : step === 2 ? "Seleccionar ejercicios" : step === 3 ? "Configurar series" : "Vista previa"}</h2>
          </div>
          <button type="button" className="routine-close" onClick={onClose} disabled={saving} aria-label="Cerrar creador de rutina"><X size={21} /></button>
        </header>

        <div className="routine-steps" aria-label="Progreso de creación">
          {[1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? "active" : ""} />)}
        </div>

        <div className="routine-builder-body">
          {step === 1 && (
            <div className="routine-basic-form">
              <label>Nombre de la rutina<input value={draft.name} maxLength={60} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Push (Pecho - Hombro - Tríceps)" autoFocus /></label>
              <label>Descripción <small>opcional</small><textarea value={draft.description} maxLength={240} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Objetivo y enfoque de esta rutina…" /></label>
              <fieldset><legend>Días que tendrá esta rutina</legend><p className="routine-field-help">Después configurarás ejercicios diferentes para cada día.</p><div className="routine-day-picker">{DAYS.map((day) => <button type="button" key={day.value} className={draft.days.includes(day.value) ? "active" : ""} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div></fieldset>
              <fieldset><legend>Color</legend><div className="routine-color-picker">{COLORS.map((color) => <button type="button" key={color} style={{ background: color }} className={draft.color === color ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, color }))} aria-label={`Usar color ${color}`} />)}</div></fieldset>
              <fieldset><legend>Icono</legend><div className="routine-icon-picker">{ICONS.map(({ value, label, Icon }) => <button type="button" key={value} className={draft.icon === value ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, icon: value }))} aria-label={label}><Icon size={21} /></button>)}</div></fieldset>
              <label>Duración estimada<select value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))}>{DURATIONS.map((duration) => <option key={duration}>{duration}</option>)}</select></label>
            </div>
          )}

          {step === 2 && (
            <div className="routine-exercise-step">
              <div className="routine-day-tabs" aria-label="Día que estás configurando">{orderedDays.map((day) => <button type="button" key={day.value} className={activeDay === day.value ? "active" : ""} onClick={() => { setActiveDay(day.value); setMessage(""); }}><span>{day.label}</span><small>{draft.exercises.filter((exercise) => exercise.day === day.value).length} ejercicios</small></button>)}</div>
              <p className="routine-day-instruction">Elige los ejercicios para <strong>{DAY_NAMES[activeDay]}</strong>. Luego cambia de día arriba.</p>
              <label className="routine-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ejercicio…" autoFocus /></label>
              <div className="routine-group-filter">{exerciseGroups.map((item) => <button type="button" key={item} className={group === item ? "active" : ""} onClick={() => setGroup(item)}>{item}</button>)}</div>
              <button type="button" className="custom-exercise-toggle" onClick={() => { setCustomOpen((current) => !current); setMessage(""); }}><Plus size={18} /> Ejercicio personalizado</button>
              {customOpen && <div className="custom-exercise-form">
                <label className="custom-name">Nombre<input value={customDraft.name} maxLength={60} onChange={(event) => setCustomDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Dominadas asistidas" autoFocus /></label>
                <label>Grupo<select value={customDraft.group} onChange={(event) => setCustomDraft((current) => ({ ...current, group: event.target.value }))}>{CUSTOM_GROUPS.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Series<input type="number" min="1" max="20" value={customDraft.sets} onChange={(event) => setCustomDraft((current) => ({ ...current, sets: Number(event.target.value) }))} /></label>
                <label>Repeticiones<input value={customDraft.reps} maxLength={20} onChange={(event) => setCustomDraft((current) => ({ ...current, reps: event.target.value }))} /></label>
                <label>Peso (kg)<input type="number" min="0" max="1000" step="0.5" value={customDraft.weight} onChange={(event) => setCustomDraft((current) => ({ ...current, weight: Number(event.target.value) }))} /></label>
                <button type="button" onClick={addCustomExercise}><Plus size={17} /> Añadir a {DAY_NAMES[activeDay]}</button>
              </div>}
              <div className="exercise-library-list">
                {filteredExercises.map((exercise) => {
                  const selected = selectedNames.has(exercise.name);
                  return <button type="button" className={`exercise-library-item${selected ? " selected" : ""}`} key={exercise.name} onClick={() => toggleExercise(exercise)}>
                    <span className="exercise-library-icon"><Dumbbell size={20} /></span>
                    <span><strong>{exercise.name}</strong><small>{exercise.group} · {exercise.sets} × {exercise.reps}</small></span>
                    <i>{selected ? <Check size={18} /> : <Plus size={18} />}</i>
                  </button>;
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="routine-config-list">
              {orderedDays.map((day) => <section className="routine-config-day" key={day.value}><h3>{day.label} <span>{draft.exercises.filter((exercise) => exercise.day === day.value).length} ejercicios</span></h3>{draft.exercises.map((exercise, index) => exercise.day === day.value && (
                <article className="routine-config-item" key={`${exercise.day}-${exercise.name}`}>
                  <span className="routine-order">{draft.exercises.filter((item) => item.day === day.value).findIndex((item) => item.name === exercise.name) + 1}</span>
                  <div className="routine-config-name"><strong>{exercise.name}</strong><small>{exercise.group}</small></div>
                  <div className="routine-config-fields">
                    <label>Series<input type="number" min="1" max="20" value={exercise.sets} onChange={(event) => updateExercise(index, "sets", event.target.value)} /></label>
                    <label>Repeticiones<input value={exercise.reps} maxLength={20} onChange={(event) => updateExercise(index, "reps", event.target.value)} /></label>
                    <label>Peso (kg)<input type="number" min="0" max="1000" step="0.5" value={exercise.weight ?? 0} onChange={(event) => updateExercise(index, "weight", event.target.value)} /></label>
                    <label>Descanso<select value={exercise.rest} onChange={(event) => updateExercise(index, "rest", event.target.value)}><option value="45">45 s</option><option value="60">1 min</option><option value="75">1:15 min</option><option value="90">1:30 min</option><option value="120">2 min</option><option value="150">2:30 min</option><option value="180">3 min</option></select></label>
                  </div>
                  <button type="button" className="routine-remove-exercise" onClick={() => removeExercise(index)} aria-label={`Quitar ${exercise.name}`}><Trash2 size={17} /></button>
                </article>
              ))}</section>)}
            </div>
          )}

          {step === 4 && (
            <div className="routine-preview">
              <section className="routine-preview-hero" style={{ "--routine-color": draft.color }}>
                <span><PreviewIcon size={25} /></span><div><h3>{draft.name}</h3><p>{draft.exercises.length} ejercicios · {draft.duration}</p></div>
              </section>
              <div className="routine-preview-list">{orderedDays.map((day) => <section className="routine-preview-day" key={day.value}><h3>{day.label}</h3>{draft.exercises.filter((exercise) => exercise.day === day.value).map((exercise, index) => <article key={`${exercise.day}-${exercise.name}`}><span>{index + 1}</span><div><strong>{exercise.name}</strong><small>{exercise.sets} × {exercise.reps}{Number(exercise.weight) > 0 ? ` · ${exercise.weight} kg` : " · Peso corporal"}</small></div><em><Clock3 size={14} /> {restLabel(Number(exercise.rest))}</em></article>)}</section>)}</div>
              <div className="routine-preview-summary"><div><strong>{draft.exercises.length}</strong><span>Ejercicios</span></div><div><strong>{totalSets}</strong><span>Series</span></div><div><strong>{draft.duration}</strong><span>Duración</span></div></div>
            </div>
          )}
        </div>

        {message && <p className="routine-message" role="alert">{message}</p>}
        <footer className="routine-builder-footer">
          {step > 1 ? <button type="button" className="routine-back" onClick={() => { setMessage(""); setStep((current) => current - 1); }} disabled={saving}><ArrowLeft size={17} /> Atrás</button> : <span />}
          {step < 4
            ? <button type="button" className="routine-next" onClick={next}>Siguiente <ArrowRight size={17} /></button>
            : <button type="button" className="routine-next" onClick={save} disabled={saving}><Check size={17} /> {saving ? "Guardando…" : initialRoutine ? "Guardar cambios" : "Guardar rutina"}</button>}
        </footer>
      </section>
    </div>
  );
}
