import type{ ParentComponent } from "solid-js";
import { identity } from "~/state/helpers";
import { useTournamentStore } from "~/state/tournament";
import LogOut  from "lucide-solid/icons/log-out";
import authStore from "~/lib/auth";
import client from "~/api/client";
import { useNavigate } from "@solidjs/router";

const AppShell: ParentComponent = (props) => {
  const tournamentName = useTournamentStore(identity);
  const navigate = useNavigate();

  const handleLeave = async () => {
    try {
      await client.post("/v1/session/leave");
    } catch (e) {
      console.error("Failed to release session", e);
    } finally {
      authStore.clear();
      navigate("/join"); // Or home
    }
  };

  return (
    <>
      <header class="bg-golf-surface border-b border-white/5 sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 class="text-xl font-semibold capitalize">
            {tournamentName().name}
          </h1>
          <button 
            onClick={handleLeave}
            class="text-gray-400 hover:text-white transition-colors"
            title="Leave Session"
          >
            <LogOut class="w-5 h-5" />
          </button>
        </div>
      </header>
      <main class="flex-1 container mx-auto p-3">{props.children}</main>
    </>
  );
};

export default AppShell;
