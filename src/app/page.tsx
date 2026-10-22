import { redirect } from "next/navigation";
import Workspace from "@/components/workspace";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <Workspace initialUser={user} />;
}
