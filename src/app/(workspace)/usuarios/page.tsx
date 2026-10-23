import { redirect } from "next/navigation";
import { ADMIN_ROLE, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.accessRole !== ADMIN_ROLE) redirect("/dashboard");
  return null;
}
