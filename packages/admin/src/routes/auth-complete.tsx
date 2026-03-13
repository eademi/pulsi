import { redirect } from "react-router";

import { apiClient } from "../lib/api";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const clientLoader = async () => {
  const retrySchedule = [100, 250, 500, 800, 1200];

  for (const delay of retrySchedule) {
    const viewer = await apiClient.getAdminBootstrapOptional();

    if (viewer) {
      throw redirect("/garmin");
    }

    await sleep(delay);
  }

  throw redirect("/sign-in?error=access");
};

export default function AdminAuthCompleteRoute() {
  return (
    <main className="min-h-screen px-6 py-10 text-zinc-50">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Pulsi Internal
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Finalizing admin session</h1>
        <p className="mt-3 text-sm text-zinc-400">
          We&apos;re confirming your isolated admin session and platform access.
        </p>
      </section>
    </main>
  );
}
