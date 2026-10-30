import Link from "next/link";

export default function OfflinePage() {
  return (
    <main style={{ maxWidth: 520, margin: "12vh auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#17352f" }}>
      <p style={{ color: "#167c6d", fontWeight: 700, letterSpacing: ".08em" }}>BULLTRACK</p>
      <h1>Estás sin conexión</h1>
      <p>Vuelve a conectarte para cargar tus registros de entrenamiento, comidas y bienestar.</p>
      <Link href="/" style={{ color: "#167c6d", fontWeight: 650 }}>Intentar de nuevo</Link>
    </main>
  );
}
