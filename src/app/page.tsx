import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentAdmin, hasAnyAdmin } from "@/lib/auth/admin";

export default async function Home() {
  await connection();
  if (!(await hasAnyAdmin())) redirect("/setup");
  redirect((await getCurrentAdmin()) ? "/dashboard" : "/login");
}
