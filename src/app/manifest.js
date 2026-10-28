export default function manifest() {
  return {
    id: "/",
    name: "Pulse — tu espacio fitness",
    short_name: "Pulse",
    description: "Entrenamiento, nutrición y bienestar en un solo lugar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f7f2",
    theme_color: "#167c6d",
    icons: [
      { src: "/bulldog-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/bulldog-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/bulldog-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
