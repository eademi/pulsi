import { redirect } from "react-router";

import { apiClient } from "../lib/api";

export const clientAction = async () => {
  await apiClient.signOut();
  throw redirect("/sign-in");
};

export default function AdminSignOutRoute() {
  return null;
}
