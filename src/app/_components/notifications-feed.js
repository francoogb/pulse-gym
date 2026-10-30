"use client";

import { useState } from "react";
import { Droplets, Dumbbell, Moon, Scale, Trophy, Utensils } from "lucide-react";

export const CATEGORIAS = [
  { id: "todas", texto: "Todas" },
  { id: "entrenamiento", texto: "Entrenamiento" },
  { id: "nutricion", texto: "Nutrición" },
  { id: "progreso", texto: "Progreso" },
];

// Cada tipo corresponde a un interruptor de preferencias.
const ICONOS = { rutinas: Dumbbell, nutricion: Utensils, logros: Trophy, sueno: Moon, agua: Droplets, peso: Scale };

const PREFERENCIAS = [
  { id: "rutinas", texto: "Rutinas programadas" },
  { id: "nutricion", texto: "Agua y nutrición" },
  { id: "logros", texto: "Logros y progreso" },
  { id: "sueno", texto: "Recordatorios de sueño" },
];

const HORARIO_SILENCIOSO = "22:30 – 07:00";

export default function NotificationsFeed({ avisos, preferencias, silencioso, onCambiarPreferencia, avisosTelefono, onCambiarAvisosTelefono }) {
  const [categoria, setCategoria] = useState("todas");

  const visibles = avisos.filter((aviso) => (categoria === "todas" || aviso.categoria === categoria) && preferencias[aviso.tipo] !== false);

  return (
    <section className="notif-layout" aria-label="Notificaciones">
      <div className="notif-main">
        <div className="notif-tabs" role="tablist">
          {CATEGORIAS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={categoria === item.id} className={categoria === item.id ? "active" : ""} onClick={() => setCategoria(item.id)}>
              {item.texto}
            </button>
          ))}
        </div>

        {silencioso && (
          <p className="notif-quiet-note">Estás en horario silencioso ({HORARIO_SILENCIOSO}). Los avisos del teléfono siguen según tu botón de campana.</p>
        )}

        {visibles.length === 0 ? (
          <div className="notif-empty">
            <strong>Estás al día</strong>
            <span>No tienes nuevos avisos por ahora.</span>
          </div>
        ) : (
          <ul className="notif-list">
            {visibles.map((aviso) => {
              const Icono = ICONOS[aviso.tipo] ?? Trophy;
              return (
                <li key={aviso.id} className="notif-item" style={{ "--notif-color": aviso.color }}>
                  <span className="notif-icon"><Icono size={22} /></span>
                  <div className="notif-body">
                    <div className="notif-title"><strong>{aviso.titulo}</strong><small>{aviso.hora}</small></div>
                    <p>{aviso.texto}</p>
                    {aviso.accion?.href && <a className="notif-action" href={aviso.accion.href}>{aviso.accion.texto}</a>}
                    {aviso.accion?.onClick && <button className="notif-action" type="button" onClick={aviso.accion.onClick}>{aviso.accion.texto}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="notif-prefs" aria-label="Preferencias de notificaciones">
        <h2>Preferencias de notificaciones</h2>
        <div className="notif-pref-row">
          <span>Avisos en este teléfono<small>Recordatorios que llegan aunque la app esté cerrada</small></span>
          <button type="button" role="switch" aria-checked={avisosTelefono} className="notif-switch" onClick={onCambiarAvisosTelefono}>
            <i />
          </button>
        </div>
        <p>Elige qué quieres ver en esta pantalla.</p>
        {PREFERENCIAS.map((item) => (
          <div key={item.id} className="notif-pref-row">
            <span>{item.texto}</span>
            <button type="button" role="switch" aria-checked={preferencias[item.id] !== false} className="notif-switch" onClick={() => onCambiarPreferencia(item.id)}>
              <i />
            </button>
          </div>
        ))}
        <div className="notif-pref-row">
          <span>Horario silencioso<small>{HORARIO_SILENCIOSO}</small></span>
          <button type="button" role="switch" aria-checked={preferencias.silencioso !== false} className="notif-switch" onClick={() => onCambiarPreferencia("silencioso")}>
            <i />
          </button>
        </div>
      </aside>
    </section>
  );
}
