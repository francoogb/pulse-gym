import { Geist, Geist_Mono } from "next/font/google";
import { SerwistProvider } from "@serwist/next/react";
import "./globals.css";

const themeInitScript = `
  (() => {
    try {
      const saved = window.localStorage.getItem("pulse-theme");
      const theme = saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Pulse — Tu espacio fitness",
  description: "Entrenamiento, nutrición y bienestar en un solo lugar.",
  applicationName: "Pulse",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/bulldog-192.png", shortcut: "/bulldog-192.png", apple: "/bulldog-apple.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Pulse" },
};

export const viewport = { themeColor: "#167c6d" };

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script id="pulse-theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === "development"}>{children}</SerwistProvider>
      </body>
    </html>
  );
}

