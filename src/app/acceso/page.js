"use client";

import { useState } from "react";

// Solo rutas internas: evita redirigir a otro sitio desde el parámetro "desde".
function destinoSeguro() {
  const desde = new URLSearchParams(window.location.search).get("desde") ?? "/";
  return desde.startsWith("/") && !desde.startsWith("//") && !desde.startsWith("/acceso") ? desde : "/";
}

export default function AccesoPage() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const iniciarSesion = async (event) => {
    event.preventDefault();
    if (enviando) return;

    const form = new FormData(event.currentTarget);
    setEnviando(true);
    setError("");

    try {
      const response = await fetch("/api/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: form.get("usuario"), clave: form.get("clave") }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
      window.location.replace(destinoSeguro());
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f3f4ee", color: "#18322f", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={iniciarSesion} style={{ width: "100%", maxWidth: 360, display: "grid", gap: 14, padding: 28, borderRadius: 22, background: "#fff", boxShadow: "0 12px 35px rgba(30,57,51,.08)" }}>
        <p style={{ margin: 0, color: "#167c6d", fontWeight: 700, letterSpacing: ".08em" }}>PULSE</p>
        <h1 style={{ margin: 0, fontSize: 26 }}>Inicia sesión</h1>

        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
          Usuario
          <input name="usuario" type="text" autoComplete="username" required autoFocus style={{ height: 44, borderRadius: 12, border: "1px solid #e6e9e2", padding: "0 12px", font: "inherit" }} />
        </label>

        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
          Contraseña
          <input name="clave" type="password" autoComplete="current-password" required style={{ height: 44, borderRadius: 12, border: "1px solid #e6e9e2", padding: "0 12px", font: "inherit" }} />
        </label>

        {error && <p role="alert" style={{ margin: 0, color: "#b4442e" }}>{error}</p>}

        <button type="submit" disabled={enviando} style={{ height: 46, border: 0, borderRadius: 14, background: "#167c6d", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer" }}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
