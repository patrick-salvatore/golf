import { createSignal, onMount, Show, For } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import client from "~/api/client";
import { Button } from "~/components/ui/button";
import authStore from "~/lib/auth";

type Player = {
  id: string;
  name: string;
  handicap: number;
};

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invite, setInvite] = createSignal<any>(null);
  const [availablePlayers, setAvailablePlayers] = createSignal<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = createSignal<string>("");
  
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [step, setStep] = createSignal<"invite" | "select">("invite");
  const [actionLoading, setActionLoading] = createSignal(false);

  onMount(async () => {
    const token = searchParams.token;
    if (!token) {
      setError("No invite token provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await client.get(`/v1/invites/${token}`);
      setInvite(res.data);
    } catch (e) {
      setError("Invalid or expired invite link.");
    } finally {
      setLoading(false);
    }
  });

  const handleAcceptInvite = async () => {
    const token = searchParams.token;
    if (!token) return;

    setActionLoading(true);
    try {
      const res = await client.post(`/v1/invites/${token}/accept`);
      const { token: sessionToken } = res.data;
      
      // Save partial token
      authStore.save(sessionToken);
      
      // Fetch available players
      const playersRes = await client.get<Player[]>("/v1/tournament/players/available");
      setAvailablePlayers(playersRes.data);
      
      setStep("select");
    } catch (e) {
      console.error(e);
      setError("Failed to join tournament. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectPlayer = async () => {
    if (!selectedPlayer()) return;
    
    setActionLoading(true);
    try {
      const res = await client.post("/v1/tournament/players/select", {
        playerId: selectedPlayer()
      });
      
      const { token: fullToken } = res.data;
      authStore.save(fullToken);
      
      navigate("/tournament");
    } catch (e: any) {
        if (e.response?.status === 409) {
            setError("That player has already been selected by someone else.");
            // Refresh list
            const playersRes = await client.get<Player[]>("/v1/tournament/players/available");
            setAvailablePlayers(playersRes.data);
        } else {
            console.error(e);
            setError("Failed to select player.");
        }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div class="bg-gray-100 flex items-center justify-center min-h-screen">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <Show when={!loading()} fallback={<div class="animate-pulse">Loading invite...</div>}>
          <Show when={!error()} fallback={<div class="text-red-500 mb-4">{error()}</div>}>
            
            <h1 class="text-2xl font-bold mb-2">
                {step() === "invite" ? "You're Invited!" : "Who are you?"}
            </h1>
            
            <Show when={step() === "invite"}>
                <p class="text-gray-600 mb-6">
                  You have been invited to join the <strong>{invite()?.tournamentName}</strong> tournament.
                </p>
                
                <div class="bg-blue-50 p-4 rounded mb-6 text-sm text-blue-800">
                  Tournament Date: {new Date().toLocaleDateString()}
                </div>

                <Button class="w-full" onClick={handleAcceptInvite} disabled={actionLoading()}>
                  {actionLoading() ? "Processing..." : "Accept Invite"}
                </Button>
            </Show>

            <Show when={step() === "select"}>
                <p class="text-gray-600 mb-6">
                  Select your name from the list below to activate your scorecard.
                </p>

                <div class="mb-6 max-h-60 overflow-y-auto border rounded divide-y text-left">
                    <For each={availablePlayers()}>
                        {(player) => (
                            <div 
                                class={`p-3 cursor-pointer hover:bg-blue-50 ${selectedPlayer() === player.id ? "bg-blue-100 ring-1 ring-blue-500 inset-0 relative z-10" : ""}`}
                                onClick={() => setSelectedPlayer(player.id)}
                            >
                                <span class="font-medium">{player.name}</span>
                                <span class="text-xs text-gray-500 block">Hcp: {player.handicap}</span>
                            </div>
                        )}
                    </For>
                    <Show when={availablePlayers().length === 0}>
                        <div class="p-4 text-gray-500 text-center italic">
                            No available players found.
                        </div>
                    </Show>
                </div>

                <Button 
                    class="w-full" 
                    onClick={handleSelectPlayer} 
                    disabled={actionLoading() || !selectedPlayer()}
                >
                  {actionLoading() ? "Joining..." : "Confirm Identity"}
                </Button>
            </Show>

          </Show>
        </Show>
      </div>
    </div>
  );
}
