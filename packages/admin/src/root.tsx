import type { PropsWithChildren } from "react";
import stylesheetHref from "./app/styles.css?url";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export const links = () => [{ rel: "stylesheet", href: stylesheetHref }];

const Document = ({ children }: PropsWithChildren) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <Meta />
      <Links />
    </head>
    <body>
      {children}
      <ScrollRestoration />
      <Scripts />
    </body>
  </html>
);

export default function App() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}

export const ErrorBoundary = ({ error }: { error: unknown }) => {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected admin client error occurred.";

  return (
    <Document>
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <section className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-zinc-900 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Pulsi Admin</p>
          <h1 className="mt-4 text-3xl font-semibold">Something broke before the page could load.</h1>
          <p className="mt-4 text-sm text-zinc-300">{message}</p>
        </section>
      </main>
    </Document>
  );
};
