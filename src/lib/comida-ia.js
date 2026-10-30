import path from "node:path";
import { esNumeroEnRango } from "@/lib/validacion";

export const MEAL_TYPES = new Set(["Desayuno", "Almuerzo", "Comida", "Cena", "Snack"]);

// Ejecuta Claude Code CLI de la misma PC, igual que el análisis de fotos.
export function getClaudeCommand() {
  const nativePath = process.env.CLAUDE_CLI_PATH;
  if (nativePath && path.extname(nativePath).toLowerCase() === ".exe") {
    return { command: nativePath, prefixArgs: [] };
  }
  if (process.platform !== "win32") {
    return { command: nativePath || "claude", prefixArgs: [] };
  }

  const configuredEntry = process.env.CLAUDE_CLI_ENTRY || nativePath;
  const searchDirs = [
    ...(process.env.PATH || "").split(path.delimiter).filter(Boolean),
    process.env.APPDATA ? path.join(process.env.APPDATA, "npm") : "",
  ].filter(Boolean);
  const candidates = configuredEntry
    ? [configuredEntry]
    : searchDirs.map((directory) => path.join(directory, "node_modules", "@anthropic-ai", "claude-code", "cli.js"));

  for (const candidate of candidates) {
    if (path.extname(candidate).toLowerCase() === ".js") {
      return { command: process.execPath, prefixArgs: [candidate] };
    }
  }
  throw Object.assign(new Error("Claude Code CLI was not found."), { code: "ENOENT" });
}

export function parseClaudeMeal(stdout) {
  let envelope;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error("Claude CLI returned an invalid response.");
  }
  const responseText = typeof envelope.result === "string" ? envelope.result : envelope.response;
  if (typeof responseText !== "string") throw new Error("Claude CLI did not return a meal estimate.");
  const cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let candidate;
  try {
    candidate = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude CLI returned an unexpected format.");
  }

  const meal = {
    name: typeof candidate.name === "string" ? candidate.name.trim() : "",
    type: MEAL_TYPES.has(candidate.type) ? candidate.type : "Comida",
    calories: candidate.calories,
    protein: candidate.protein,
    carbs: candidate.carbs,
    fat: candidate.fat,
  };
  if (
    !meal.name || meal.name.length > 120 ||
    !esNumeroEnRango(meal.calories, 1, 3000) ||
    !esNumeroEnRango(meal.protein, 0, 300) ||
    !esNumeroEnRango(meal.carbs, 0, 500) ||
    !esNumeroEnRango(meal.fat, 0, 300)
  ) throw new Error("Claude CLI returned out-of-range nutrition values.");

  return meal;
}

