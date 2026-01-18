import { useNavigate } from "@solidjs/router";
import { PlusCircle } from "lucide-solid";
import type { ParentComponent } from "solid-js";
import { identity } from "~/state/helpers";
import { useTournamentStore } from "~/state/tournament";

const AppShell: ParentComponent = (props) => {
  const tournamentName = useTournamentStore(identity);
  const navigate = useNavigate();

  const goToNewTournament = () => {
    navigate(`/tournament`, { replace: true });
  };

  return (
    <div class="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      <header class="bg-white shadow">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 class="text-xl font-semibold capitalize">
            {tournamentName().name}
          </h1>

          <button onClick={goToNewTournament}>
            <PlusCircle size={20} />
          </button>
        </div>
      </header>
      <main class="flex-1 container mx-auto p-3">{props.children}</main>
    </div>
  );
};

export default AppShell;
