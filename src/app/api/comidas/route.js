import database from "@/lib/db";
import { esFechaValida, esNumeroEnRango, leerJson } from "@/lib/validacion";

const tiposPermitidos = new Set(["Desayuno", "Almuerzo", "Comida", "Cena", "Snack"]);
const unidadesPermitidas = new Set(["g", "ml", "porción", "unidad"]);

export async function POST(request) {
  const body = await leerJson(request);
  if (!body || !esFechaValida(body.fecha)) {
    return Response.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const nombre = typeof body.name === "string" ? body.name.trim() : "";
  const tipo = body.type;
  const cantidad = body.amount;
  const unidad = body.unit;
  const valoresValidos =
    esNumeroEnRango(cantidad, 0.1, 5000) &&
    unidadesPermitidas.has(unidad) &&
    esNumeroEnRango(body.calories, 1, 3000) &&
    esNumeroEnRango(body.protein, 0, 300) &&
    esNumeroEnRango(body.carbs, 0, 500) &&
    esNumeroEnRango(body.fat, 0, 300);

  if (!nombre || nombre.length > 120 || !tiposPermitidos.has(tipo) || !valoresValidos) {
    return Response.json({ error: "Revisa el nombre, el tipo y los valores nutricionales." }, { status: 400 });
  }

  const result = database.prepare(`
    INSERT INTO comidas (fecha, nombre, tipo, cantidad, unidad, calorias, proteina, carbos, grasas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(body.fecha, nombre, tipo, cantidad, unidad, body.calories, body.protein, body.carbs, body.fat);

  if (body.saveFrequent === true) {
    database.prepare(`
      INSERT INTO alimentos_frecuentes (nombre, tipo, cantidad, unidad, calorias, proteina, carbos, grasas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(nombre) DO UPDATE SET
        tipo = excluded.tipo, cantidad = excluded.cantidad, unidad = excluded.unidad,
        calorias = excluded.calorias, proteina = excluded.proteina,
        carbos = excluded.carbos, grasas = excluded.grasas,
        actualizado_en = CURRENT_TIMESTAMP
    `).run(nombre, tipo, cantidad, unidad, body.calories, body.protein, body.carbs, body.fat);
  }

  return Response.json({ ok: true, id: Number(result.lastInsertRowid) }, { status: 201 });
}

export async function DELETE(request) {
  const body = await leerJson(request);
  if (!body || !Number.isInteger(body.id) || body.id < 1) {
    return Response.json({ error: "La comida indicada no es válida." }, { status: 400 });
  }

  const result = database.prepare("DELETE FROM comidas WHERE id = ?").run(body.id);
  if (!result.changes) {
    return Response.json({ error: "La comida ya no existe." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
