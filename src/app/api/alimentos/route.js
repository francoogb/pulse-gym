import database from "@/lib/db";

export async function GET() {
  const foods = database.prepare(`
    SELECT id, nombre AS name, tipo AS type, cantidad AS amount, unidad AS unit,
      calorias AS calories, proteina AS protein, carbos AS carbs, grasas AS fat
    FROM alimentos_frecuentes ORDER BY actualizado_en DESC, nombre
  `).all();
  return Response.json({ foods });
}
