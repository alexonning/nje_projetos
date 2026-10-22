import WorkspaceApp from "./workspace-app";
import type { User } from "@/lib/workspace-types";

export default function Workspace({ initialUser }: { initialUser: User }) {
  return <WorkspaceApp initialUser={initialUser} />;
}
