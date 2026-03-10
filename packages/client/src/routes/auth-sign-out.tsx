import { redirect } from "react-router";

import { apiClient } from "../lib/api";

export const clientAction = async () => {
  try {
    await apiClient.signOut();
  } finally {
    throw redirect("/auth/sign-in");
  }
};

export default function SignOutRoute() {
  return null;
}
