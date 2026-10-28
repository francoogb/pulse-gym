import Database from "better-sqlite3";
import path from "node:path";

const databasePath = process.env.PULSE_DB_PATH || path.join(process.cwd(), "gym.db");

// Todas las sentencias son IF NOT EXISTS: se pueden ejecutar en cada carga sin perder datos.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS comidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    cantidad REAL NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    unidad TEXT NOT NULL DEFAULT 'porción',
    calorias REAL NOT NULL CHECK (calorias > 0),
    proteina REAL NOT NULL DEFAULT 0 CHECK (proteina >= 0),
    carbos REAL NOT NULL DEFAULT 0 CHECK (carbos >= 0),
    grasas REAL NOT NULL DEFAULT 0 CHECK (grasas >= 0),
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alimentos_frecuentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
    tipo TEXT NOT NULL,
    cantidad REAL NOT NULL CHECK (cantidad > 0),
    unidad TEXT NOT NULL,
    calorias REAL NOT NULL CHECK (calorias > 0),
    proteina REAL NOT NULL DEFAULT 0 CHECK (proteina >= 0),
    carbos REAL NOT NULL DEFAULT 0 CHECK (carbos >= 0),
    grasas REAL NOT NULL DEFAULT 0 CHECK (grasas >= 0),
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    sesion TEXT NOT NULL,
    ejercicio TEXT NOT NULL,
    series INTEGER NOT NULL CHECK (series > 0),
    repeticiones TEXT NOT NULL,
    peso REAL NOT NULL CHECK (peso >= 0),
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fecha, sesion, ejercicio)
  );

  CREATE TABLE IF NOT EXISTS habitos (
    fecha TEXT PRIMARY KEY,
    vasos INTEGER NOT NULL DEFAULT 0 CHECK (vasos >= 0)
  );

  CREATE TABLE IF NOT EXISTS sueno (
    fecha TEXT PRIMARY KEY,
    horas REAL NOT NULL CHECK (horas >= 0 AND horas <= 24)
  );

  CREATE TABLE IF NOT EXISTS peso_corporal (
    fecha TEXT PRIMARY KEY,
    kg REAL NOT NULL CHECK (kg >= 20 AND kg <= 500)
  );

  CREATE TABLE IF NOT EXISTS perfil (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    estatura_cm REAL NOT NULL CHECK (estatura_cm >= 100 AND estatura_cm <= 250)
  );

  CREATE TABLE IF NOT EXISTS plan_semanal (
    dia INTEGER PRIMARY KEY CHECK (dia >= 0 AND dia <= 6),
    activo INTEGER NOT NULL DEFAULT 0 CHECK (activo IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS rutinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    dias TEXT NOT NULL,
    color TEXT NOT NULL,
    icono TEXT NOT NULL DEFAULT 'dumbbell',
    duracion TEXT NOT NULL,
    activa INTEGER NOT NULL DEFAULT 0 CHECK (activa IN (0, 1)),
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rutina_ejercicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rutina_id INTEGER NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    dia INTEGER CHECK (dia >= 0 AND dia <= 6),
    nombre TEXT NOT NULL,
    grupo TEXT NOT NULL,
    series INTEGER NOT NULL CHECK (series >= 1 AND series <= 20),
    repeticiones TEXT NOT NULL,
    peso REAL NOT NULL DEFAULT 0 CHECK (peso >= 0 AND peso <= 1000),
    descanso INTEGER NOT NULL CHECK (descanso >= 15 AND descanso <= 600),
    UNIQUE (rutina_id, orden)
  );

  CREATE TABLE IF NOT EXISTS push_suscripciones (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS avisos_enviados (
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL,
    PRIMARY KEY (fecha, tipo)
  );

  CREATE INDEX IF NOT EXISTS idx_comidas_fecha ON comidas (fecha);
  CREATE INDEX IF NOT EXISTS idx_series_fecha ON series (fecha);
  CREATE INDEX IF NOT EXISTS idx_series_ejercicio ON series (ejercicio);
  CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_rutina ON rutina_ejercicios (rutina_id, orden);
`;

function createDatabase() {
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.pragma("foreign_keys = ON");
  return database;
}

// Reutiliza la conexión entre recargas del servidor de desarrollo.
const database = globalThis.__pulseDatabase ?? createDatabase();
database.exec(SCHEMA);

const mealColumns = database.prepare("PRAGMA table_info(comidas)").all();
if (!mealColumns.some((column) => column.name === "cantidad")) {
  database.exec("ALTER TABLE comidas ADD COLUMN cantidad REAL NOT NULL DEFAULT 1 CHECK (cantidad > 0)");
}
if (!mealColumns.some((column) => column.name === "unidad")) {
  database.exec("ALTER TABLE comidas ADD COLUMN unidad TEXT NOT NULL DEFAULT 'porción'");
}

// Migración compatible con bases existentes: cada ejercicio puede pertenecer a un día concreto.
const routineExerciseColumns = database.prepare("PRAGMA table_info(rutina_ejercicios)").all();
if (!routineExerciseColumns.some((column) => column.name === "dia")) {
  database.exec("ALTER TABLE rutina_ejercicios ADD COLUMN dia INTEGER CHECK (dia >= 0 AND dia <= 6)");
}
if (!routineExerciseColumns.some((column) => column.name === "peso")) {
  database.exec("ALTER TABLE rutina_ejercicios ADD COLUMN peso REAL NOT NULL DEFAULT 0 CHECK (peso >= 0 AND peso <= 1000)");
}

const insertarDiaPlan = database.prepare("INSERT OR IGNORE INTO plan_semanal (dia, activo) VALUES (?, ?)");
const diasInicialesGym = new Set([1, 3, 5]);
for (let dia = 0; dia < 7; dia += 1) {
  insertarDiaPlan.run(dia, diasInicialesGym.has(dia) ? 1 : 0);
}

if (process.env.NODE_ENV !== "production") {
  globalThis.__pulseDatabase = database;
}

export default database;

