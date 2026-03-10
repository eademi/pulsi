import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { DashboardPage } from "../features/dashboard/dashboard-page";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/demo-club/dashboard" />
  },
  {
    path: "/:tenantSlug/dashboard",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      }
    ]
  }
]);

export const AppRouter = () => <RouterProvider router={router} />;
