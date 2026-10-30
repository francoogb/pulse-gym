import { esNumeroEnRango } from "@/lib/validacion";

// Busca un producto por su código de barras en Open Food Facts y devuelve sus valores por 100 g.
export async function GET(request) {
  const codigo = new URL(request.url).searchParams.get("codigo") ?? "";
  if (!/^\d{8,14}$/.test(codigo)) {
    return Response.json({ error: "El código de barras debe tener entre 8 y 14 números." }, { status: 400 });
  }

  let product;
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,brands,nutriments`, {
      headers: { "User-Agent": "Pulse/1.0 (app personal de seguimiento)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return Response.json({ error: "No encontré ese producto. Prueba escribiendo la comida a mano." }, { status: 404 });
    }
    product = data.product;
  } catch {
    return Response.json({ error: "No pude consultar el producto. Revisa tu conexión e inténtalo de nuevo." }, { status: 502 });
  }

  const nutrientes = product.nutriments ?? {};
  const meal = {
    name: `${[product.brands, product.product_name].filter(Boolean).join(" ").trim() || "Producto escaneado"} (por 100 g)`.slice(0, 120),
    type: "Snack",
    calories: Math.round(Number(nutrientes["energy-kcal_100g"])),
    protein: Math.round(Number(nutrientes["proteins_100g"]) * 10) / 10,
    carbs: Math.round(Number(nutrientes["carbohydrates_100g"]) * 10) / 10,
    fat: Math.round(Number(nutrientes["fat_100g"]) * 10) / 10,
  };
  if (!esNumeroEnRango(meal.calories, 1, 3000) || !esNumeroEnRango(meal.protein, 0, 300) || !esNumeroEnRango(meal.carbs, 0, 500) || !esNumeroEnRango(meal.fat, 0, 300)) {
    return Response.json({ error: "El producto no tiene datos nutricionales completos." }, { status: 422 });
  }

  return Response.json({ meal });
}
