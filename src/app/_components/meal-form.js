"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronDown, Plus, Star } from "lucide-react";

const EMPTY = { name: "", type: "Comida", amount: 1, unit: "porción", calories: "", protein: "", carbs: "", fat: "" };
const round = (value) => Math.round(value * 10) / 10;

export default function MealForm({ initialDraft, saving, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => ({ ...EMPTY, ...initialDraft }));
  const [mode, setMode] = useState("portion");
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initialDraft?.carbs || initialDraft?.fat));
  const [saveFrequent, setSaveFrequent] = useState(false);
  const [frequentFoods, setFrequentFoods] = useState([]);

  useEffect(() => {
    fetch("/api/alimentos", { cache: "no-store" }).then((response) => response.ok ? response.json() : { foods: [] }).then((data) => setFrequentFoods(data.foods ?? [])).catch(() => {});
  }, []);

  const factor = mode === "per100" ? Number(values.amount || 0) / 100 : 1;
  const totals = useMemo(() => ({
    calories: round(Number(values.calories || 0) * factor),
    protein: round(Number(values.protein || 0) * factor),
    carbs: round(Number(values.carbs || 0) * factor),
    fat: round(Number(values.fat || 0) * factor),
  }), [factor, values.calories, values.protein, values.carbs, values.fat]);

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));
  const chooseFrequent = (id) => {
    const food = frequentFoods.find((item) => item.id === Number(id));
    if (!food) return;
    setMode("portion");
    setValues({ ...food });
    setDetailsOpen(Boolean(food.carbs || food.fat));
  };
  const calculateCalories = () => update("calories", round(Number(values.protein || 0) * 4 + Number(values.carbs || 0) * 4 + Number(values.fat || 0) * 9));

  return <form className="meal-form meal-smart-form" onSubmit={(event) => {
    event.preventDefault();
    onSubmit({ ...totals, name: values.name.trim(), type: values.type, amount: Number(values.amount), unit: values.unit, saveFrequent });
  }}>
    {frequentFoods.length > 0 && <label className="full-field frequent-food-select"><Star size={15} /> Alimentos frecuentes<select defaultValue="" onChange={(event) => chooseFrequent(event.target.value)}><option value="" disabled>Seleccionar un alimento guardado…</option>{frequentFoods.map((food) => <option key={food.id} value={food.id}>{food.name} · {food.amount} {food.unit}</option>)}</select></label>}
    <div className="meal-mode-switch full-field"><button type="button" className={mode === "portion" ? "active" : ""} onClick={() => setMode("portion")}>Por porción</button><button type="button" className={mode === "per100" ? "active" : ""} onClick={() => { setMode("per100"); update("unit", "g"); if (Number(values.amount) === 1) update("amount", 100); }}>Valores por 100 g</button></div>
    <label className="full-field">Nombre del alimento<input value={values.name} maxLength={120} onChange={(event) => update("name", event.target.value)} placeholder="Ej. Yogur griego" required autoFocus /></label>
    <label>Tipo<select value={values.type} onChange={(event) => update("type", event.target.value)}><option>Desayuno</option><option>Almuerzo</option><option>Comida</option><option>Cena</option><option>Snack</option></select></label>
    <div className="meal-amount-fields"><label>Cantidad<input type="number" min="0.1" max="5000" step="any" value={values.amount} onChange={(event) => update("amount", event.target.value)} required /></label><label>Unidad<select value={values.unit} onChange={(event) => update("unit", event.target.value)} disabled={mode === "per100"}><option>g</option><option>ml</option><option>porción</option><option>unidad</option></select></label></div>
    <label>{mode === "per100" ? "Calorías por 100 g" : "Calorías consumidas"}<input type="number" min="1" max="3000" step="any" value={values.calories} onChange={(event) => update("calories", event.target.value)} placeholder="99" required /></label>
    <label>{mode === "per100" ? "Proteína por 100 g" : "Proteína consumida (g)"}<input type="number" min="0" max="300" step="any" value={values.protein} onChange={(event) => update("protein", event.target.value)} placeholder="10" required /></label>
    <button className="meal-details-toggle full-field" type="button" onClick={() => setDetailsOpen((current) => !current)}>Más nutrientes <ChevronDown size={16} className={detailsOpen ? "open" : ""} /></button>
    {detailsOpen && <div className="meal-details-fields full-field"><label>Carbohidratos (g)<input type="number" min="0" max="500" step="any" value={values.carbs} onChange={(event) => update("carbs", event.target.value)} placeholder="8" /></label><label>Grasas (g)<input type="number" min="0" max="300" step="any" value={values.fat} onChange={(event) => update("fat", event.target.value)} placeholder="3" /></label><button type="button" onClick={calculateCalories}><Calculator size={16} /> Calcular calorías</button></div>}
    {mode === "per100" && <div className="meal-calculated full-field"><span>Para {values.amount || 0} g</span><strong>{totals.calories} kcal · {totals.protein} g proteína · {totals.carbs} g carbos · {totals.fat} g grasas</strong></div>}
    <label className="meal-frequent-check full-field"><input type="checkbox" checked={saveFrequent} onChange={(event) => setSaveFrequent(event.target.checked)} /><Star size={16} /> Guardar como alimento frecuente</label>
    <div className="form-actions"><button className="form-cancel" type="button" disabled={saving} onClick={onCancel}>Cancelar</button><button className="form-primary" type="submit" disabled={saving}><Plus size={18} /> {saving ? "Guardando..." : "Guardar comida"}</button></div>
  </form>;
}
