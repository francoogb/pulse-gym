"use client";

import { useState } from "react";
import { Check, Clock3 } from "lucide-react";
import { horasDormidas, minutosDormidos, esHoraValida } from "@/lib/sueno";

// Formulario de sueño: hora de dormir y hora de despertar; las horas se calculan solas.
// Se monta al abrir el modal, así que siempre arranca con lo guardado para ese día.
export default function SleepForm({ initial, saving, onSubmit, onCancel }) {
  const [horaDormir, setHoraDormir] = useState(initial?.dormir ?? "23:00");
  const [horaDespertar, setHoraDespertar] = useState(initial?.despertar ?? "07:00");

  const horas = horasDormidas(horaDormir, horaDespertar);
  const minutos = esHoraValida(horaDormir) && esHoraValida(horaDespertar) ? minutosDormidos(horaDormir, horaDespertar) : 0;

  const enviar = (event) => {
    event.preventDefault();
    onSubmit({ horaDormir, horaDespertar });
  };

  // Hora actual del dispositivo en formato HH:MM.
  const horaAhora = () => {
    const ahora = new Date();
    return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <form className="meal-form" onSubmit={enviar}>
      <div className="sleep-time-field full-field">
        <label>Hora de dormir
          <input type="time" value={horaDormir} onChange={(event) => setHoraDormir(event.target.value)} required autoFocus />
        </label>
        <button className="sleep-now" type="button" disabled={saving} onClick={() => setHoraDormir(horaAhora())}><Clock3 size={16} /> Ahora</button>
      </div>
      <div className="sleep-time-field full-field">
        <label>Hora de despertar
          <input type="time" value={horaDespertar} onChange={(event) => setHoraDespertar(event.target.value)} required />
        </label>
        <button className="sleep-now" type="button" disabled={saving} onClick={() => setHoraDespertar(horaAhora())}><Clock3 size={16} /> Ahora</button>
      </div>

      <div className="sleep-calc" role="status">
        {horas !== null ? (
          <>
            <span>Dormiste</span>
            <strong>{Math.floor(minutos / 60)} h {minutos % 60} min</strong>
          </>
        ) : (
          <span>Las horas de dormir y despertar deben ser distintas.</span>
        )}
      </div>

      <div className="form-actions">
        <button className="form-cancel" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button className="form-primary" type="submit" disabled={saving || horas === null}><Check size={18} /> {saving ? "Guardando..." : "Guardar descanso"}</button>
      </div>
    </form>
  );
}
