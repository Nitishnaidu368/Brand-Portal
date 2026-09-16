import { redirect } from "next/navigation";
import { getCurrentAdmin, hasAnyAdmin } from "@/lib/auth/admin";

export default async function Home() {
  if (!(await hasAnyAdmin())) redirect("/setup");
  redirect((await getCurrentAdmin()) ? "/dashboard" : "/login");
}
