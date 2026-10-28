import { Suspense } from "react";
import { connection } from "next/server";
import PulseDashboard from "@/app/_components/pulse-dashboard";

// La fecha y los datos se leen en cada visita, no al compilar la app.
async function DashboardRequest({ view }) {
  await connection();
  return <PulseDashboard view={view} />;
}

export default function DashboardPage({ view }) {
  return (
    <Suspense fallback={null}>
      <DashboardRequest view={view} />
    </Suspense>
  );
}
