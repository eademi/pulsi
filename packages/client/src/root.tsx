import type { PropsWithChildren } from "react";
import stylesheetHref from "./app/styles.css?url";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";

import { AppProviders } from "./app/providers";

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
      <AppProviders>{children}</AppProviders>
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
      : "An unexpected client error occurred.";

  return (
    <Document>
      <main className="route-error-shell">
        <section className="route-error-card">
          <p className="eyebrow">Client routing error</p>
          <h1>Something broke before the page could load.</h1>
          <p className="muted">{message}</p>
        </section>
      </main>
    </Document>
  );
};
