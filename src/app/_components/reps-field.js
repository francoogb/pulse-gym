"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

const separarReps = (texto) => String(texto ?? "").split(/[\s,/]+/).filter(Boolean);

// Campo "Reps por serie": al tocarlo se abre un modal con un número por cada serie.
export default function RepsField({ exerciseName, sets, value, onChange, disabled }) {
  const total = Math.max(1, Number(sets) || 1);
  const [abierto, setAbierto] = useState(false);
  const [valores, setValores] = useState([]);
  const [error, setError] = useState("");
  const resumen = separarReps(value).join("/");

  const abrir = () => {
    const actuales = separarReps(value);
    const ultimo = actuales[actuales.length - 1] ?? "";
    setValores(Array.from({ length: total }, (_, indice) => actuales[indice] ?? ultimo));
    setError("");
    setAbierto(true);
  };

  const cambiar = (indice, texto) => {
    setValores((actual) => actual.map((valor, posicion) => (posicion === indice ? texto : valor)));
  };

  const igualEnTodas = () => {
    setValores((actual) => actual.map(() => actual[0] ?? ""));
  };

  const guardar = () => {
    const numeros = valores.map((valor) => Number(valor));
    const valido = valores.every((valor, indice) => String(valor).trim() !== "" && Number.isInteger(numeros[indice]) && numeros[indice] >= 1 && numeros[indice] <= 100);
    if (!valido) {
      setError("Escribe un número entre 1 y 100 en cada serie.");
      return;
    }
    onChange(numeros.join("/"));
    setAbierto(false);
  };

  return (
    <>
      <div className="reps-field">
        <span className="reps-field-label">Reps por serie</span>
        <button className="reps-trigger" type="button" disabled={disabled} onClick={abrir} aria-label={`Repeticiones de ${exerciseName}`}>
          {resumen || "Toca para añadir"}
        </button>
      </div>

      {abierto && createPortal(
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAbierto(false); }}>
          <section className="modal reps-modal" role="dialog" aria-modal="true" aria-labelledby="reps-modal-title">
            <button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setAbierto(false)}><X size={21} /></button>
            <p className="section-kicker">REPETICIONES</p>
            <h2 id="reps-modal-title">{exerciseName}</h2>
            <p className="modal-intro">Escribe las repeticiones que hiciste en cada serie.</p>

            <div className="reps-grid">
              {valores.map((valor, indice) => (
                <label key={indice}>
                  Serie {indice + 1}
                  <input type="number" inputMode="numeric" min="1" max="100" value={valor} onChange={(event) => cambiar(indice, event.target.value)} onFocus={(event) => event.target.select()} />
                </label>
              ))}
            </div>

            {valores.length > 1 && <button className="form-cancel reps-same" type="button" onClick={igualEnTodas}>Igual en todas las series</button>}
            {error && <p role="alert" className="reps-error">{error}</p>}

            <div className="guided-actions">
              <button className="form-cancel" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
              <button className="form-primary" type="button" onClick={guardar}><Check size={18} /> Guardar reps</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
