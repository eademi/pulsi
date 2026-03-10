import { Outlet, redirect } from "react-router";

import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSessionOptional();

  if (session) {
    throw redirect(getDefaultAppPath(session));
  }

  return null;
};

export default function AuthLayoutRoute() {
  return <Outlet />;
}
