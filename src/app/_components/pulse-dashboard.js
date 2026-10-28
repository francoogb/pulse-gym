"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BicepsFlexed,
  Check,
  Camera,
  ChevronRight,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  LayoutDashboard,
  Moon,
  MoonStar,
  Pencil,
  Sun,
  Plus,
  Sparkles,
  Trophy,
  Trash2,
  Utensils,
  X,
  Zap,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exercises } from "@/lib/plan";
import RoutineBuilder from "@/app/_components/routine-builder";
import MealForm from "@/app/_components/meal-form";

const DIAS_CORTOS = ["D", "L", "M", "X", "J", "V", "S"];
const DIAS_PLAN = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ROUTINE_ICONS = { dumbbell: Dumbbell, strength: BicepsFlexed, legs: Footprints, cardio: Activity, heart: HeartPulse };

function RoutineIcon({ name }) {
  const Icon = ROUTINE_ICONS[name] ?? Dumbbell;
  return <Icon size={22} />;
}

function BulldogMark({ size = 28 }) {
  return <Image src="/bulldog-logo.png" width={size} height={size} alt="" aria-hidden="true" draggable="false" />;
}

function letraDia(fecha) {
  const [year, month, day] = fecha.split("-").map(Number);
  return DIAS_CORTOS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function formatearFecha(fecha) {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day, 12));
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDay(date) {
  if (!date) return new Date().getDay();
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getDay();
}

async function requestJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

function ProgressBar({ value, max, color = "teal", label }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div
      className={`progress-track ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}

// La clave pública VAPID viene en base64 URL; el navegador la necesita como bytes.
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function PulseDashboard({ view = "today" }) {
  const [water, setWater] = useState(0);
  // "cargando" | "no-disponible" | "sin-servicio" | "bloqueado" | "inactivo" | "activo"
  const [pushState, setPushState] = useState("cargando");
  const [theme, setTheme] = useState("light");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [completed, setCompleted] = useState([]);
  const [workoutValues, setWorkoutValues] = useState({});
  const [workoutDone, setWorkoutDone] = useState(false);
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState([]);
  const [mealDraft, setMealDraft] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef(null);
  const [today, setToday] = useState("Tu resumen diario");
  const [dateKey, setDateKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [waterSaving, setWaterSaving] = useState(false);
  const [sleep, setSleep] = useState(null);
  const [bodyWeight, setBodyWeight] = useState(null);
  const [bodyHeight, setBodyHeight] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [semana, setSemana] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineBuilderOpen, setRoutineBuilderOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [deletingRoutineId, setDeletingRoutineId] = useState(null);
  const [streak, setStreak] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState("");
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [fuerza, setFuerza] = useState({});
  const [ejercicioGrafico, setEjercicioGrafico] = useState(exercises[0].name);

  const goals = { calories: 2200, protein: bodyWeight ? Math.round(bodyWeight * 1.8) : 150, carbs: 220, fat: 70 };
  const pageTitles = { today: "Haz que hoy cuente", calendar: "Tu calendario", training: "Entrenamiento", nutrition: "Nutrición", progress: "Tu progreso" };
  const pageDescriptions = { today: "Tu cuerpo agradece cada pequeño esfuerzo.", calendar: "Revisa tu constancia y los registros de cada día.", training: "Organiza tus días de gimnasio y registra cada sesión.", nutrition: "Comidas y macros en un solo lugar.", progress: "Observa cómo cambian tu fuerza, descanso y peso." };
  const scheduledDay = getWeekDay(dateKey);
  const todayRoutine = routines.find((routine) => routine.days.includes(scheduledDay)) ?? null;
  const sessionExercises = todayRoutine?.exercises.filter((exercise) => exercise.day === scheduledDay).map((exercise) => ({
    ...exercise,
    detail: `${exercise.sets} series · ${exercise.reps} reps`,
    weightValue: exercise.weight ?? 0,
  })) ?? [];
  const completedSessionNames = completed.filter((name) => sessionExercises.some((exercise) => exercise.name === name));
  const sessionWasSaved = workoutDone && completedSessionNames.length > 0;
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushState("no-disponible");
        return;
      }
      if (Notification.permission === "denied") {
        setPushState("bloqueado");
        return;
      }
      // getRegistration responde enseguida; "ready" espera para siempre si no hay service worker.
      navigator.serviceWorker.getRegistration()
        .then((registration) => {
          if (!registration) return "sin-servicio";
          return registration.pushManager.getSubscription().then((suscripcion) => (suscripcion ? "activo" : "inactivo"));
        })
        .then((estado) => { if (active) setPushState(estado); })
        .catch(() => { if (active) setPushState("inactivo"); });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const toggleNotifications = async () => {
    if (pushState === "no-disponible") return setToast("Tu navegador no admite notificaciones.");
    if (pushState === "bloqueado") return setToast("Las notificaciones están bloqueadas en el navegador.");
    if (pushState === "cargando") return setToast("Preparando notificaciones…");
    if (pushState === "sin-servicio") {
      return setToast("Los avisos solo funcionan en la versión de producción: ejecuta npm run build y npm start, y recarga la página.");
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      if (pushState === "activo") {
        const suscripcion = await registration.pushManager.getSubscription();
        if (suscripcion) {
          await fetch("/api/push/suscripcion", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: suscripcion.endpoint }),
          });
          await suscripcion.unsubscribe();
        }
        setPushState("inactivo");
        setToast("Avisos desactivados.");
        return;
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setPushState(permiso === "denied" ? "bloqueado" : "inactivo");
        setToast("Necesitas permitir las notificaciones para activar los avisos.");
        return;
      }

      const suscripcion = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_PULSE_VAPID_PUBLIC_KEY),
      });
      const response = await fetch("/api/push/suscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion.toJSON()),
      });
      await requestJson(response);
      setPushState("activo");
      setToast("Avisos activados. Te recordaremos entrenar y registrar tus comidas.");
    } catch (error) {
      setToast(error.message || "No se pudieron activar las notificaciones.");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("pulse-theme", nextTheme);
    setTheme(nextTheme);
  };

  const loadProgreso = useCallback(async (fecha) => {
    const response = await fetch(`/api/progreso?fecha=${fecha}`, { cache: "no-store" });
    const data = await requestJson(response);
    setSemana(data.semana);
    setFuerza(data.fuerza);
    setWeeklyPlan(data.plan ?? []);
    setStreak(data.racha ?? 0);
  }, []);

  const loadRoutines = useCallback(async () => {
    const response = await fetch("/api/rutinas", { cache: "no-store" });
    const data = await requestJson(response);
    setRoutines(data.routines ?? []);
  }, []);

  const deleteRoutine = async (routine) => {
    if (!window.confirm(`¿Eliminar la rutina “${routine.name}”? Esta acción no se puede deshacer.`)) return;
    setDeletingRoutineId(routine.id);
    try {
      const response = await fetch(`/api/rutinas?id=${routine.id}`, { method: "DELETE" });
      await requestJson(response);
      setRoutines((current) => current.filter((item) => item.id !== routine.id));
      if (dateKey) await loadProgreso(dateKey);
      setCalendarVersion((current) => current + 1);
      setToast(`${routine.name} fue eliminada.`);
    } catch (error) {
      setToast(error.message);
    } finally {
      setDeletingRoutineId(null);
    }
  };

  const loadDashboard = useCallback(async (fecha) => {
    const response = await fetch(`/api/resumen?fecha=${fecha}`, { cache: "no-store" });
    const data = await requestJson(response);
    const savedNames = data.entrenamiento.completados;
    setWorkoutValues(data.entrenamiento.detalles ?? {});
    const weightResponse = await fetch(`/api/peso?fecha=${fecha}`, { cache: "no-store" });
    const weightData = await requestJson(weightResponse);
    setBodyWeight(weightData.peso);
    setBodyHeight(weightData.estatura);
    setWeightHistory(weightData.historial);

    setNutrition(data.totales);
    setMeals(data.comidas);
    setWater(data.vasos);
    setSleep(data.sueno);
    setCompleted(savedNames);
    setWorkoutDone(savedNames.length > 0);
    await loadProgreso(fecha);
  }, [loadProgreso]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("pulse-theme");
    const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = initialTheme;
    document.documentElement.style.colorScheme = initialTheme;
    const frame = window.requestAnimationFrame(() => setTheme(initialTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => loadRoutines().catch((error) => setToast(error.message)), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRoutines]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const now = new Date();
      const formattedDate = new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(now);
      setToday(formattedDate);
      const localDate = getLocalDate();
      setDateKey(localDate);
      setCalendarMonth(localDate.slice(0, 7));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!calendarMonth) return undefined;
    let active = true;
    fetch(`/api/calendario?mes=${calendarMonth}`, { cache: "no-store" })
      .then(requestJson)
      .then((data) => { if (active) setCalendarDays(data.dias); })
      .catch((error) => { if (active) setToast(error.message); });
    return () => { active = false; };
  }, [calendarMonth, calendarVersion]);

  useEffect(() => {
    if (!dateKey) return undefined;
    let active = true;
    const timeout = window.setTimeout(() => {
      loadDashboard(dateKey).catch((error) => {
        if (active) setToast(error.message);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [dateKey, loadDashboard]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!modal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) setModal(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, saving]);

  const addWater = async () => {
    if (water >= 8) {
      setToast("¡Meta de hidratación completada!");
      return;
    }
    if (!dateKey || waterSaving) return;

    setWaterSaving(true);
    try {
      const response = await fetch("/api/hidratacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dateKey, vasos: water + 1 }),
      });
      const data = await requestJson(response);
      setWater(data.vasos);
      setCalendarVersion((current) => current + 1);
      setToast("Sumaste un vaso de agua. ¡Bien hecho!");
    } catch (error) {
      setToast(error.message);
    } finally {
      setWaterSaving(false);
    }
  };

  const updateWorkoutValue = (name, field, value) => {
    setWorkoutValues((current) => ({
      ...current,
      [name]: { ...current[name], [field]: value },
    }));
  };

  const toggleExercise = (name) => {
    setCompleted((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const finishWorkout = async () => {
    if (saving || !completedSessionNames.length) return;
    setSaving(true);

    try {
      const selectedExercises = completedSessionNames.map((name) => {
        const exercise = sessionExercises.find((item) => item.name === name);
        if (!exercise) return null;
        const values = workoutValues[exercise.name] ?? {};
        return { name: exercise.name, sets: Number(values.sets ?? exercise.sets), reps: String(values.reps ?? ""), weight: Number(values.weight ?? exercise.weightValue) };
      }).filter(Boolean);
      const response = await fetch("/api/entrenamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dateKey, ejercicios: selectedExercises }),
      });
      await requestJson(response);
      await loadDashboard(dateKey);
      setCalendarVersion((current) => current + 1);
      setModal(null);
      setToast("Entrenamiento guardado. ¡Un día más de constancia!");
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (id, name) => {
    try {
      const response = await fetch("/api/comidas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await requestJson(response);
      await loadDashboard(dateKey);
      setCalendarVersion((current) => current + 1);
      setToast(`${name} se eliminó de tu registro.`);
    } catch (error) {
      setToast(error.message);
    }
  };

  const analyzeMealPhoto = async (event) => {
    const image = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!image) return;
    if (image.size > 8 * 1024 * 1024) {
      setToast("La imagen debe pesar menos de 8 MB.");
      return;
    }

    const form = new FormData();
    form.append("image", image);
    setPhotoBusy(true);
    try {
      const response = await fetch("/api/foto", { method: "POST", body: form });
      const data = await requestJson(response);
      setMealDraft(data.meal);
      setModal("meal");
      setToast("Estimación lista. Revisa los valores antes de guardarlos.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setPhotoBusy(false);
    }
  };
  const addMeal = async (mealValues) => {
    if (saving) return;
    const meal = { fecha: dateKey, ...mealValues };

    setSaving(true);
    try {
      const response = await fetch("/api/comidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meal),
      });
      await requestJson(response);
      await loadDashboard(dateKey);
      setCalendarVersion((current) => current + 1);
      setModal(null);
      setMealDraft(null);
      setToast(`${meal.name} se guardó en tu registro.`);
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addSleep = async (event) => {
    event.preventDefault();
    if (saving) return;

    const horas = Number(new FormData(event.currentTarget).get("horas"));

    setSaving(true);
    try {
      const response = await fetch("/api/sueno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dateKey, horas }),
      });
      await requestJson(response);
      await loadDashboard(dateKey);
      setCalendarVersion((current) => current + 1);
      setModal(null);
      setToast("Descanso registrado. ¡Buen trabajo!");
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addWeight = async (event) => {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const kg = Number(form.get("kg"));
    const estatura = Number(form.get("estatura"));
    setSaving(true);
    try {
      const response = await fetch("/api/peso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dateKey, kg, estatura }),
      });
      await requestJson(response);
      await loadDashboard(dateKey);
      setCalendarVersion((current) => current + 1);
      setModal(null);
      setToast("Peso y estatura guardados en tu progreso.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  const actividadSemanal = semana.filter((dia) => dia.entrenó).length;
  const nextMilestone = Math.max(5, Math.ceil((streak + 1) / 5) * 5);
  const visitsToMilestone = nextMilestone - streak;
  const historialFuerza = fuerza[ejercicioGrafico] ?? [];
  const ejerciciosConDatos = exercises.filter((exercise) => (fuerza[exercise.name] ?? []).length > 0);

  const [calendarYear, calendarMonthNumber] = calendarMonth ? calendarMonth.split("-").map(Number) : [0, 0];
  const calendarFirstOffset = calendarMonth ? (new Date(calendarYear, calendarMonthNumber - 1, 1).getDay() + 6) % 7 : 0;
  const calendarDayCount = calendarMonth ? new Date(calendarYear, calendarMonthNumber, 0).getDate() : 0;
  const calendarMarks = new Map(calendarDays.map((day) => [day.fecha, day]));
  const remainingCalories = Math.max(goals.calories - nutrition.calories, 0);
  const caloriePercentage = Math.min((nutrition.calories / goals.calories) * 100, 100);
  const bmi = bodyWeight && bodyHeight ? Math.round((bodyWeight / ((bodyHeight / 100) ** 2)) * 10) / 10 : null;
  const bmiCategory = bmi === null ? "" : bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Rango saludable" : bmi < 30 ? "Sobrepeso" : "IMC elevado";
  const proteinRange = bodyWeight ? [Math.round(bodyWeight * 1.6), Math.round(bodyWeight * 2)] : null;
  const calorieRange = [Math.round(goals.calories * 1.05), Math.round(goals.calories * 1.1)];
  const weeklyGainRange = bodyWeight ? [Math.round(bodyWeight * 0.0025 * 100) / 100, Math.round(bodyWeight * 0.005 * 100) / 100] : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Pulse, ir al inicio">
          <span className="brand-mark"><BulldogMark size={31} /></span>
          <span>pulse<span className="brand-dot">.</span></span>
        </Link>

        <div className="sidebar-label">MI ESPACIO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          <Link className={`nav-link${view === "today" ? " active" : ""}`} href="/"><LayoutDashboard size={19} /> Hoy</Link>
          <Link className={`nav-link${view === "calendar" ? " active" : ""}`} href="/calendario"><Clock3 size={19} /> Calendario</Link>
          <Link className={`nav-link${view === "training" ? " active" : ""}`} href="/entrenamiento"><Dumbbell size={19} /> Entrenamiento</Link>
          <Link className={`nav-link${view === "nutrition" ? " active" : ""}`} href="/nutricion"><Utensils size={19} /> Nutrición</Link>
          <Link className={`nav-link${view === "progress" ? " active" : ""}`} href="/progreso"><ChartNoAxesColumnIncreasing size={19} /> Progreso</Link>
        </nav>
        <div className="sidebar-spacer" />
        <div className="motivation-card">
          <span className="motivation-icon"><Sparkles size={18} /></span>
          <p>La constancia vale más que la perfección.</p>
          <span>Un día a la vez.</span>
        </div>
        <div className="profile-row">
          <div className="avatar">MG</div>
          <div>
            <strong>Mi perfil</strong>
            <span>Plan personal</span>
          </div>
          <ChevronRight size={17} />
        </div>
      </aside>

      <header className="mobile-header">
        <Link className="brand" href="/" aria-label="Pulse, ir al inicio">
          <span className="brand-mark"><BulldogMark size={28} /></span>
          <span>pulse<span className="brand-dot">.</span></span>
        </Link>
        <div className="mobile-header-actions">
          <button className={`icon-button ${pushState === "activo" ? "bell-active" : ""}`} type="button" aria-label={pushState === "activo" ? "Desactivar avisos" : "Activar avisos"} title={pushState === "activo" ? "Avisos activados" : "Activar avisos"} onClick={toggleNotifications}>
            <Bell size={20} />
          </button>
        </div>
      </header>

      <main className="main-content" id="inicio">
        <div className="content-wrap">
          <section className="welcome-section">
            <div>
              <p className="date-label" suppressHydrationWarning>{today}</p>
              <h1>{pageTitles[view]}<span>.</span></h1>
              <p className="welcome-copy">{pageDescriptions[view]}</p>
            </div>
            <div className="header-actions">
              <div className="streak-pill"><Flame size={18} fill="currentColor" /><strong>{streak}</strong><span>{streak === 1 ? "visita seguida" : "visitas seguidas"}</span></div>
              <button className="theme-header-button" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Activar modo normal" : "Activar modo oscuro"}>
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                <span>{theme === "dark" ? "Modo normal" : "Modo oscuro"}</span>
              </button>
              <button className={`icon-button desktop-bell ${pushState === "activo" ? "bell-active" : ""}`} type="button" aria-label={pushState === "activo" ? "Desactivar avisos" : "Activar avisos"} title={pushState === "activo" ? "Avisos activados" : "Activar avisos"} onClick={toggleNotifications}>
                <Bell size={20} />
              </button>
            </div>
          </section>

          {view === "training" && (<section className="card routines-card" aria-label="Mis rutinas de entrenamiento">
            <div className="card-heading routines-heading">
              <div><p className="section-kicker">ENTRENAMIENTO PERSONAL</p><h2>Mis rutinas</h2><p className="weekly-plan-help">Crea y guarda tus sesiones con ejercicios, series y descansos.</p></div>
              <button className="routine-create-button" type="button" onClick={() => { setEditingRoutine(null); setRoutineBuilderOpen(true); }}><Plus size={17} /> Crear rutina</button>
            </div>
            <div className="routine-card-grid">
              {routines.map((routine) => (
                <article className={`routine-card-item${routine.active ? " active" : ""}`} key={routine.id} style={{ "--routine-color": routine.color }}>
                  <span className="routine-card-icon"><RoutineIcon name={routine.icon} /></span>
                  <div><div className="routine-card-title"><strong>{routine.name}</strong>{routine.active && <small>Rutina actual</small>}</div><p>{routine.exercises.length} ejercicios · {routine.duration}</p><span>{routine.days.map((day) => `${DIAS_PLAN[day].slice(0, 3)} ${routine.exercises.filter((exercise) => exercise.day === day).length}`).join(" · ")}</span></div>
                  <div className="routine-card-actions">
                    <button className="routine-edit-button" type="button" aria-label={`Editar ${routine.name}`} title="Editar rutina" onClick={() => { setEditingRoutine(routine); setRoutineBuilderOpen(true); }}><Pencil size={16} /></button>
                    <button className="routine-delete-button" type="button" aria-label={`Eliminar ${routine.name}`} title="Eliminar rutina" disabled={deletingRoutineId === routine.id} onClick={() => deleteRoutine(routine)}>
                      {deletingRoutineId === routine.id ? <span className="routine-delete-loader" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </article>
              ))}
              {!routines.length && <div className="routines-empty"><Dumbbell size={22} /><strong>Aún no tienes rutinas</strong><span>Crea la primera y organiza tus días de entrenamiento.</span></div>}
            </div>
          </section>)}

          {view === "training" && (<section className="card weekly-plan-card" aria-label="Organización semanal del gimnasio">
            <div className="card-heading">
              <div>
                <p className="section-kicker">MI ORGANIZACIÓN</p>
                <h2>Mi semana de gimnasio</h2>
                <p className="weekly-plan-help">Se actualiza automáticamente con los días configurados en tus rutinas.</p>
              </div>
              <span className="soft-icon"><Dumbbell size={19} /></span>
            </div>
            <div className="weekly-plan-grid">
              {weeklyPlan.map((item) => (
                <div
                  className={`weekly-plan-day${item.active ? " active" : ""}`}
                  key={item.day}
                >
                  <strong>{DIAS_PLAN[item.day]}</strong>
                  <span>{item.active ? <><Dumbbell size={15} /> {routines.filter((routine) => routine.days.includes(item.day)).map((routine) => routine.name).join(" + ")}</> : <><MoonStar size={15} /> Descanso</>}</span>
                </div>
              ))}
            </div>
          </section>)}

          {["today", "training", "progress"].includes(view) && (<section className={`top-grid ${view === "today" ? "" : "single-column"}`} aria-label="Resumen de entrenamiento y actividad">
            {(view === "today" || view === "training") && (<article className="workout-card" id="entrenamiento">
              <div className="workout-content">
                <div className="eyebrow light"><span /> ENTRENAMIENTO DE HOY</div>
                <h2>{todayRoutine?.name ?? "Día de descanso"}</h2>
                <p className="workout-subtitle">{todayRoutine ? (todayRoutine.description || `Rutina programada para ${DIAS_PLAN[scheduledDay].toLowerCase()}.`) : "Hoy no tienes una rutina programada. Recuperar también es progresar."}</p>
                <div className="workout-meta">
                  <span><Dumbbell size={16} /> {sessionExercises.length} {sessionExercises.length === 1 ? "ejercicio" : "ejercicios"}</span>
                  <span><Clock3 size={16} /> {todayRoutine?.duration ?? "Descanso"}</span>
                </div>
                <button className={`primary-button ${sessionWasSaved ? "completed-button" : ""}`} type="button" disabled={!todayRoutine || !sessionExercises.length} onClick={() => setModal("workout")}>
                  {sessionWasSaved ? <Check size={18} /> : <Zap size={18} fill="currentColor" />}
                  {!todayRoutine ? "Sin rutina para hoy" : sessionWasSaved ? "Sesión completada" : completedSessionNames.length ? "Continuar rutina" : "Empezar rutina"}
                  {!sessionWasSaved && <ArrowRight size={18} />}
                </button>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="orbit orbit-outer" />
                <div className="orbit orbit-inner" />
                <div className="hero-dumbbell"><Dumbbell size={62} strokeWidth={1.4} /></div>
                <div className="floating-tag tag-top">FUERZA</div>
                <div className="floating-tag tag-bottom"><ArrowUpRight size={14} /> +12% este mes</div>
              </div>
            </article>)}

            {(view === "today" || view === "progress") && (<article className="card activity-card" id="actividad-semanal">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">TU RITMO</p>
                  <h2>Actividad semanal</h2>
                </div>
                <span className="soft-icon"><Activity size={19} /></span>
              </div>
              <div className="activity-summary">
                <strong>{actividadSemanal}</strong>
                <span>entrenamientos<br /><small>en los últimos 7 días</small></span>
              </div>
              <div className="chart-box" aria-label="Días con entrenamiento en los últimos siete días">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={semana.map((dia) => ({ dia: letraDia(dia.fecha), entrenó: dia.entrenó ? 1 : 0 }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis hide domain={[0, 1]} />
                    <Bar dataKey="entrenó" fill="var(--teal)" radius={[6, 6, 6, 6]} maxBarSize={26} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="activity-footer"><Trophy size={16} /> {actividadSemanal ? `${actividadSemanal} de 7 días con sesión` : "Aún no hay sesiones esta semana"}</div>
            </article>)}
          </section>)}

          {view === "today" && (<section className="metrics-grid" aria-label="Objetivos diarios">
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon coral"><Flame size={20} /></span>
                <span className="metric-label">Calorías</span>
                <span className="metric-percent">{Math.round((nutrition.calories / goals.calories) * 100)}%</span>
              </div>
              <div className="metric-value">{nutrition.calories.toLocaleString("es-ES")} <small>/ {goals.calories.toLocaleString("es-ES")} kcal</small></div>
              <ProgressBar value={nutrition.calories} max={goals.calories} color="coral" label="Progreso de calorías" />
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon teal"><Zap size={20} /></span>
                <span className="metric-label">Proteína</span>
                <span className="metric-percent">{Math.round((nutrition.protein / goals.protein) * 100)}%</span>
              </div>
              <div className="metric-value">{nutrition.protein} <small>/ {goals.protein} g</small></div>
              <ProgressBar value={nutrition.protein} max={goals.protein} label="Progreso de proteína" />
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon blue"><Droplets size={20} /></span>
                <span className="metric-label">Agua</span>
                <button className="mini-add" type="button" onClick={addWater} disabled={waterSaving} aria-label="Añadir un vaso de agua"><Plus size={17} /></button>
              </div>
              <div className="metric-value">{water} <small>/ 8 vasos</small></div>
              <ProgressBar value={water} max={8} color="blue" label="Progreso de hidratación" />
            </article>
          </section>)}

          {(view === "today" || view === "nutrition") && (<section className={`bottom-grid ${view === "nutrition" ? "single-column" : ""}`}>
            {(view === "today" || view === "nutrition") && (<article className="card nutrition-card" id="nutricion">
              <div className="card-heading nutrition-heading">
                <div>
                  <p className="section-kicker">ALIMENTA TU PROGRESO</p>
                  <h2>Nutrición de hoy</h2>
                </div>
                <div className="nutrition-actions">
                  <button className="secondary-button" type="button" onClick={() => { setMealDraft(null); setModal("meal"); }}><Plus size={17} /> Añadir comida</button>
                </div>
              </div>

              <div className="nutrition-overview">
                <div className="calorie-ring" style={{ background: `conic-gradient(var(--teal) ${caloriePercentage}%, var(--line) 0)` }}>
                  <div className="calorie-ring-inner">
                    <strong>{remainingCalories.toLocaleString("es-ES")}</strong>
                    <span>kcal restantes</span>
                  </div>
                </div>
                <div className="macro-list">
                  <div className="macro-row">
                    <div className="macro-label"><span><i className="macro-dot protein" />Proteína</span><strong>{nutrition.protein} <small>/ {goals.protein} g</small></strong></div>
                    <ProgressBar value={nutrition.protein} max={goals.protein} label="Proteína consumida" />
                  </div>
                  <div className="macro-row">
                    <div className="macro-label"><span><i className="macro-dot carbs" />Carbohidratos</span><strong>{nutrition.carbs} <small>/ {goals.carbs} g</small></strong></div>
                    <ProgressBar value={nutrition.carbs} max={goals.carbs} color="gold" label="Carbohidratos consumidos" />
                  </div>
                  <div className="macro-row">
                    <div className="macro-label"><span><i className="macro-dot fats" />Grasas</span><strong>{nutrition.fat} <small>/ {goals.fat} g</small></strong></div>
                    <ProgressBar value={nutrition.fat} max={goals.fat} color="coral" label="Grasas consumidas" />
                  </div>
                </div>
              </div>
              <div className="meal-history" aria-label="Comidas registradas">
                <h3>Comidas del día <span>{meals.length}</span></h3>
                {meals.length ? meals.map((meal) => (
                  <div className="meal-history-row" key={meal.id}>
                    <span className="meal-icon"><Utensils size={17} /></span>
                    <div className="meal-history-info">
                      <strong>{meal.name}</strong>
                      <small>{meal.type} · {meal.amount} {meal.unit} · {meal.calories} kcal · {meal.protein} g proteína</small>
                    </div>
                    <button className="meal-delete-button" type="button" aria-label={`Eliminar ${meal.name}`} onClick={() => deleteMeal(meal.id, meal.name)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )) : <p className="chart-empty">Aún no registraste comidas para este día.</p>}
              </div>
            </article>)}

            {view === "today" && (<div className="insights-column">
              <article className="card sleep-card">
                <div className="sleep-top">
                  <span className="metric-icon lavender"><MoonStar size={20} /></span>
                  {sleep !== null && <span className="quality-pill">{sleep >= 7 ? "Buena calidad" : "Poco descanso"}</span>}
                </div>
                <p className="section-kicker">DESCANSO</p>
                {sleep !== null ? (
                  <>
                    <h2>{Math.floor(sleep)} h {Math.round((sleep % 1) * 60)} min</h2>
                    <p>Dormir bien también es entrenar.</p>
                  </>
                ) : (
                  <>
                    <h2>Sin registrar</h2>
                    <p>¿Cuántas horas dormiste anoche?</p>
                  </>
                )}
                <button className="secondary-button" type="button" onClick={() => setModal("sleep")}><Plus size={17} /> {sleep !== null ? "Editar horas" : "Registrar sueño"}</button>
              </article>

              <article className="goal-card">
                <span className="goal-icon"><Trophy size={23} /></span>
                <div>
                  <p className="section-kicker">PRÓXIMO LOGRO</p>
                  <h3>{nextMilestone} visitas seguidas</h3>
                  <p>Te {visitsToMilestone === 1 ? "falta" : "faltan"} {visitsToMilestone} {visitsToMilestone === 1 ? "visita" : "visitas"}. ¡Sigamos!</p>
                </div>
                <div className="goal-progress"><span style={{ width: `${Math.min((streak / nextMilestone) * 100, 100)}%` }} /></div>
              </article>
            </div>)}
          </section>)}

          {view === "calendar" && (<section className="calendar-section card" id="calendario" aria-label="Calendario de actividad">
            <div className="card-heading">
              <div><p className="section-kicker">TU HISTORIAL</p><h2>Calendario</h2></div>
              <span className="soft-icon"><Clock3 size={19} /></span>
            </div>
            <div className="calendar-month-heading">
              <button className="calendar-month-button" type="button" aria-label="Mes anterior" onClick={() => setCalendarMonth((current) => {
                if (!current) return current;
                const [year, month] = current.split("-").map(Number);
                return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
              })}>‹</button>
              <strong>{calendarMonth ? new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(calendarYear, calendarMonthNumber - 1, 1, 12)) : "Cargando…"}</strong>
              <button className="calendar-month-button" type="button" aria-label="Mes siguiente" onClick={() => setCalendarMonth((current) => {
                if (!current) return current;
                const [year, month] = current.split("-").map(Number);
                return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
              })}>›</button>
            </div>
            <div className="calendar-grid" role="grid" aria-label="Días del mes">
              {[["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)]}
              {Array.from({ length: calendarFirstOffset }, (_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}
              {Array.from({ length: calendarDayCount }, (_, index) => {
                const dayNumber = index + 1;
                const date = `${calendarMonth}-${String(dayNumber).padStart(2, "0")}`;
                const mark = calendarMarks.get(date);
                const selected = dateKey === date;
                const hasRecord = Boolean(mark?.entreno || mark?.comida || mark?.sueno || mark?.peso);
                return <button key={date} className={`calendar-day${selected ? " selected" : ""}${mark?.planificado ? " has-planned-workout" : ""}${mark?.entreno ? " has-workout" : ""}`} type="button" aria-pressed={selected} aria-label={`${formatearFecha(date)}${mark?.planificado ? ", entrenamiento planificado" : ""}${mark?.entreno ? ", entrenamiento completado" : ""}`} onClick={() => { setDateKey(date); setToday(formatearFecha(date)); }}>
                  {dayNumber}{hasRecord && <span className="calendar-dot" aria-hidden="true" />}
                </button>;
              })}
            </div>
            <div className="calendar-legend"><span><i className="calendar-legend-dot planned" /> Planificado</span><span><i className="calendar-legend-dot completed" /> Completado</span><span><i className="calendar-legend-dot record" /> Otro registro</span></div>
            <div className="calendar-selected-day">
              <p className="section-kicker">DÍA SELECCIONADO</p>
              <strong>{dateKey ? formatearFecha(dateKey) : "—"}</strong>
              <span>{calendarMarks.get(dateKey)?.entreno ? "Entrenamiento completado" : calendarMarks.get(dateKey)?.planificado ? `Planificado: ${calendarMarks.get(dateKey).rutinas.join(" + ")}` : "Día de descanso"} · {calendarMarks.get(dateKey)?.comida ? "comidas" : "sin comidas"} · {calendarMarks.get(dateKey)?.sueno ? "sueño registrado" : "sin sueño"} · {calendarMarks.get(dateKey)?.peso ? "peso anotado" : "sin peso"}</span>
            </div>
          </section>)}

          {view === "progress" && (<section className="progress-grid" id="progreso" aria-label="Gráficos de progreso">
            <article className="card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">NUTRICIÓN</p>
                  <h2>Proteína de la semana</h2>
                </div>
                <span className="soft-icon"><Zap size={19} /></span>
              </div>
              <div className="chart-box" aria-label="Proteína de los últimos siete días">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={semana.map((dia) => ({ dia: letraDia(dia.fecha), proteina: dia.proteina }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis domain={[0, (dataMax) => Math.max(dataMax, goals.protein)]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "var(--mint)" }} formatter={(valor) => [`${valor} g`, "Proteína"]} />
                    <ReferenceLine y={goals.protein} stroke="var(--coral)" strokeDasharray="4 4" label={{ value: "Meta", fill: "var(--coral)", fontSize: 12, position: "insideTopRight" }} />
                    <Bar dataKey="proteina" fill="var(--teal)" radius={[6, 6, 0, 0]} maxBarSize={34} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">FUERZA</p>
                  <h2>1RM estimado</h2>
                </div>
                <span className="soft-icon"><Dumbbell size={19} /></span>
              </div>
              {ejerciciosConDatos.length ? (
                <>
                  <label className="chart-select">
                    Ejercicio
                    <select value={ejercicioGrafico} onChange={(event) => setEjercicioGrafico(event.target.value)}>
                      {ejerciciosConDatos.map((exercise) => <option key={exercise.name}>{exercise.name}</option>)}
                    </select>
                  </label>
                  <div className="chart-box" aria-label="Evolución del 1RM estimado">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={historialFuerza.map((punto) => ({ fecha: punto.fecha.slice(5), rm: punto.rm }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--line)" />
                        <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                        <YAxis domain={["dataMin - 5", "dataMax + 5"]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                        <Tooltip formatter={(valor) => [`${valor} kg`, "1RM"]} />
                        <Line type="monotone" dataKey="rm" stroke="var(--coral)" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="chart-empty">Completa una sesión de entrenamiento para ver tu progreso de fuerza.</p>
              )}
            </article>
            <article className="card weight-card">
              <div className="card-heading">
                <div><p className="section-kicker">COMPOSICIÓN CORPORAL</p><h2>Peso, estatura e IMC</h2></div>
                <button className="secondary-button" type="button" onClick={() => setModal("weight")}>
                  <Plus size={17} /> {bodyWeight !== null ? "Actualizar" : "Registrar"}
                </button>
              </div>
              <div className="body-composition-grid">
                <div><span>Peso actual</span><strong>{bodyWeight !== null ? `${bodyWeight} kg` : "—"}</strong></div>
                <div><span>Estatura</span><strong>{bodyHeight !== null ? `${bodyHeight} cm` : "—"}</strong></div>
                <div><span>IMC orientativo</span><strong>{bmi ?? "—"}</strong><small>{bmiCategory || "Completa tus medidas"}</small></div>
              </div>
              {bodyWeight !== null && bodyHeight !== null && (
                <div className="muscle-gain-guide">
                  <div className="muscle-gain-heading"><Zap size={17} /><div><strong>Guía aproximada para ganar masa</strong><span>Basada en tu peso actual</span></div></div>
                  <div className="muscle-gain-values">
                    <div><span>Proteína diaria</span><strong>{proteinRange[0]}–{proteinRange[1]} g</strong></div>
                    <div><span>Calorías objetivo*</span><strong>{calorieRange[0]}–{calorieRange[1]} kcal</strong></div>
                    <div><span>Subida semanal</span><strong>{weeklyGainRange[0]}–{weeklyGainRange[1]} kg</strong></div>
                  </div>
                  <p>*Rango calculado suponiendo que {goals.calories} kcal sea tu mantenimiento. El IMC es una referencia general y no distingue músculo de grasa.</p>
                </div>
              )}
              {weightHistory.length > 1 ? (
                <div className="chart-box" aria-label="Evolución del peso corporal en los últimos seis meses">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={weightHistory.map((point) => ({ fecha: point.fecha.slice(5), kg: point.kg }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${value} kg`, "Peso"]} />
                      <Line type="monotone" dataKey="kg" stroke="var(--teal)" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="chart-empty">Registra el peso en distintos días para ver la tendencia.</p>}
            </article>
            <article className="card sleep-progress-card">
              <div className="card-heading">
                <div><p className="section-kicker">DESCANSO</p><h2>Sueño de la semana</h2></div>
                <span className="soft-icon"><MoonStar size={19} /></span>
              </div>
              <div className="chart-box" aria-label="Horas de sueño de los últimos siete días">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={semana.map((dia) => ({ dia: letraDia(dia.fecha), horas: dia.sueno }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis domain={[0, 12]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value} h`, "Sueño"]} />
                    <Line type="monotone" dataKey="horas" stroke="var(--teal)" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>)}

          <footer className="dashboard-footer">Pequeños pasos. Resultados reales. <span>Hecho para tu bienestar.</span></footer>
        </div>
      </main>

      <input ref={photoInputRef} className="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={analyzeMealPhoto} aria-label="Selecciona una foto de comida" />
      <nav className="bottom-nav" aria-label="Navegación móvil">
        <Link className={view === "calendar" ? "active" : ""} href="/calendario"><Clock3 size={19} /><span>Calendario</span></Link>
        <Link className={view === "training" ? "active" : ""} href="/entrenamiento"><Dumbbell size={19} /><span>Entrenar</span></Link>
        <button className="bottom-camera" type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()} aria-label={photoBusy ? "Analizando fotografía" : "Fotografiar una comida"} title="Fotografiar comida"><Camera size={24} strokeWidth={2.2} /></button>
        <Link className={view === "nutrition" ? "active" : ""} href="/nutricion"><Utensils size={19} /><span>Nutrición</span></Link>
        <Link className={view === "progress" ? "active" : ""} href="/progreso"><ChartNoAxesColumnIncreasing size={19} /><span>Progreso</span></Link>
      </nav>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(null); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" type="button" aria-label="Cerrar" disabled={saving} onClick={() => setModal(null)}><X size={21} /></button>

            {modal === "workout" ? (
              <>
                <p className="section-kicker">SESIÓN DE HOY</p>
                <h2 id="modal-title">{todayRoutine?.name}</h2>
                <p className="modal-intro">Marca cada ejercicio al completarlo. Tú marcas el ritmo.</p>
                <div className="session-progress">
                  <span>{completedSessionNames.length} de {sessionExercises.length} completados</span>
                  <strong>{sessionExercises.length ? Math.round((completedSessionNames.length / sessionExercises.length) * 100) : 0}%</strong>
                </div>
                <ProgressBar value={completedSessionNames.length} max={sessionExercises.length || 1} label="Ejercicios completados" />
                <div className="exercise-list">
                  {sessionExercises.map((exercise) => {
                    const isDone = completed.includes(exercise.name);
                    const values = workoutValues[exercise.name] ?? {};
                    return (
                      <div className={`exercise-log-card ${isDone ? "done" : ""}`} key={exercise.name}>
                        <button className="exercise-toggle" type="button" disabled={saving} aria-pressed={isDone} onClick={() => toggleExercise(exercise.name)}>
                          <span className="exercise-check">{isDone && <Check size={16} />}</span>
                          <span className="exercise-info"><strong>{exercise.name}</strong><small>Objetivo: {exercise.detail}</small></span>
                        </button>
                        <div className="exercise-log-inputs">
                          <label>Series
                            <input type="number" min="1" max="20" value={values.sets ?? exercise.sets} onChange={(event) => updateWorkoutValue(exercise.name, "sets", event.target.value)} disabled={saving} />
                          </label>
                          <label>Reps por serie
                            <input type="text" inputMode="numeric" placeholder="8/9/8/8" aria-label={`Repeticiones realizadas en cada serie de ${exercise.name}`} value={values.reps ?? ""} onChange={(event) => updateWorkoutValue(exercise.name, "reps", event.target.value)} disabled={saving} />
                          </label>
                          <label>Peso (kg)
                            <input type="number" min="0" max="500" step="0.5" value={values.weight ?? exercise.weightValue} onChange={(event) => updateWorkoutValue(exercise.name, "weight", event.target.value)} disabled={saving} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="form-primary" type="button" disabled={saving || !completedSessionNames.length} onClick={finishWorkout}>
                  <Check size={18} /> {saving ? "Guardando sesión..." : "Finalizar sesión"}
                </button>
              </>
            ) : modal === "sleep" ? (
              <>
                <p className="section-kicker">DESCANSO</p>
                <h2 id="modal-title">¿Cuánto dormiste?</h2>
                <p className="modal-intro">Registra las horas de anoche. Dormir bien también es entrenar.</p>
                <form className="meal-form" onSubmit={addSleep}>
                  <label className="full-field">Horas dormidas
                    <input name="horas" type="number" min="0" max="24" step="0.5" defaultValue={sleep ?? 7.5} required autoFocus />
                  </label>
                  <div className="form-actions">
                    <button className="form-cancel" type="button" disabled={saving} onClick={() => setModal(null)}>Cancelar</button>
                    <button className="form-primary" type="submit" disabled={saving}><Check size={18} /> {saving ? "Guardando..." : "Guardar descanso"}</button>
                  </div>
                </form>
              </>
            ) : modal === "weight" ? (
              <>
                <p className="section-kicker">PROGRESO PERSONAL</p>
                <h2 id="modal-title">Peso y estatura</h2>
                <p className="modal-intro">Estas medidas permiten calcular tu IMC y una guía nutricional aproximada para ganar masa muscular.</p>
                <form className="meal-form" onSubmit={addWeight}>
                  <label>Peso corporal (kg)
                    <input name="kg" type="number" min="20" max="500" step="0.1" defaultValue={bodyWeight ?? ""} placeholder="Ej. 72,5" required autoFocus />
                  </label>
                  <label>Estatura (cm)
                    <input name="estatura" type="number" min="100" max="250" step="0.1" defaultValue={bodyHeight ?? ""} placeholder="Ej. 175" required />
                  </label>
                  <div className="form-actions">
                    <button className="form-cancel" type="button" disabled={saving} onClick={() => setModal(null)}>Cancelar</button>
                    <button className="form-primary" type="submit" disabled={saving}><Check size={18} /> {saving ? "Guardando..." : "Guardar medidas"}</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="section-kicker">REGISTRO NUTRICIONAL</p>
                <h2 id="modal-title">Añadir una comida</h2>
                <p className="modal-intro">Registra lo esencial para seguir tu progreso de hoy.</p>
                <MealForm initialDraft={mealDraft} saving={saving} onCancel={() => { setModal(null); setMealDraft(null); }} onSubmit={addMeal} />
              </>
            )}
          </section>
        </div>
      )}

      {photoBusy && (
        <div className="photo-loading" role="status" aria-live="polite">
          <span className="photo-spinner" aria-hidden="true" />
          <strong>Analizando tu comida…</strong>
          <small>Puede tardar hasta un minuto. No cierres la app.</small>
        </div>
      )}
      {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}</div>}
      {routineBuilderOpen && <RoutineBuilder key={editingRoutine?.id ?? "new"} initialRoutine={editingRoutine} onClose={() => { setRoutineBuilderOpen(false); setEditingRoutine(null); }} onSaved={(routine) => {
        setRoutines((current) => editingRoutine ? current.map((item) => item.id === routine.id ? routine : item) : [routine, ...current]);
        if (dateKey) loadProgreso(dateKey).catch((error) => setToast(error.message));
        setCalendarVersion((current) => current + 1);
        setRoutineBuilderOpen(false);
        setEditingRoutine(null);
        setToast(editingRoutine ? `${routine.name} se actualizó correctamente.` : `${routine.name} se guardó en tus rutinas.`);
      }} />}
    </div>
  );
}












