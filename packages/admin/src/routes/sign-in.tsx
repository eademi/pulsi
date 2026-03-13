import { redirect, useActionData, useNavigation } from "react-router";

import { apiClient } from "../lib/api";

export const clientLoader = async () => {
  const viewer = await apiClient.getAdminBootstrapOptional();

  if (viewer) {
    throw redirect("/garmin");
  }

  return null;
};

export const clientAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await apiClient.signInEmail({
      email,
      password,
      rememberMe
    });

    const viewer = await apiClient.getAdminBootstrapOptional();

    if (!viewer) {
      await apiClient.signOut();
      return { error: "This account is authenticated, but it is not a Pulsi platform admin." };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to sign in."
    };
  }

  throw redirect("/garmin");
};

export default function AdminSignInRoute() {
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen px-6 py-10 text-zinc-50">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Pulsi Internal</p>
        <h1 className="mt-4 text-3xl font-semibold">Admin sign in</h1>
        <p className="mt-3 text-sm text-zinc-400">
          This is the internal operator surface. Use a Pulsi platform admin account only.
        </p>

        <form className="mt-8 space-y-5" method="post">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-200">Email</span>
            <input
              autoComplete="email"
              className="h-12 rounded-xl border border-white/10 bg-zinc-900 px-4 text-zinc-50 outline-none ring-0 transition focus:border-cyan-400"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-200">Password</span>
            <input
              autoComplete="current-password"
              className="h-12 rounded-xl border border-white/10 bg-zinc-900 px-4 text-zinc-50 outline-none ring-0 transition focus:border-cyan-400"
              name="password"
              required
              type="password"
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-zinc-400">
            <input className="size-4 rounded border border-white/10 bg-zinc-900" name="rememberMe" type="checkbox" />
            <span>Keep me signed in on this device</span>
          </label>

          {actionData?.error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {actionData.error}
            </p>
          ) : null}

          <button
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in to admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
