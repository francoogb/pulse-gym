/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["better-sqlite3"],
  // Permite abrir el modo desarrollo desde el celular por Tailscale (solo afecta a `next dev`).
  allowedDevOrigins: ["100.107.81.23"],
};

export default nextConfig;
