import { createSignal, createEffect, For, Show, Switch, Match, batch, createMemo } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useQuery } from '@tanstack/solid-query';
import { useNavigate } from '@solidjs/router';

import {
  setupTournament,
  fetchTournamentFormats,
  type SetupTournamentRequest,
} from '~/api/tournaments';
import { fetchCourses } from '~/api/course';
import {
  COURSE_QUERY_KEY,
  FORMATS_QUERY_KEY,
} from '~/api/query_keys';

import { Button } from '~/components/ui/button';
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from '~/components/ui/textfield';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Check, Pencil, Trash2, Plus, Minus, ChevronLeft, ChevronRight } from '~/components/ui/icons';
import { cn } from '~/lib/cn';
import { LoadingButton } from '~/components/loading_button';

// --- Step 1: Basics ---
const Step1Basics = (props: {
  data: SetupTournamentRequest;
  setData: (field: keyof SetupTournamentRequest, value: any) => void;
  addGroup: (name: string) => void;
  removeGroup: (index: number) => void;
}) => {
  const [newGroup, setNewGroup] = createSignal('');

  const handleAddGroup = () => {
    if (newGroup().trim()) {
      props.addGroup(newGroup().trim());
      setNewGroup('');
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <h2 class="text-xl font-semibold">Tournament Basics</h2>
      <TextFieldRoot>
        <TextFieldLabel>Tournament Name</TextFieldLabel>
        <TextField
          value={props.data.name}
          onInput={(e) => props.setData('name', e.currentTarget.value)}
          placeholder="e.g. Summer Cup 2024"
        />
      </TextFieldRoot>

      <div class="flex gap-4">
        <TextFieldRoot class="w-1/2">
          <TextFieldLabel>Team Count</TextFieldLabel>
          <TextField
            type="number"
            min="1"
            value={props.data.teamCount}
            onInput={(e) => props.setData('teamCount', parseInt(e.currentTarget.value) || 0)}
          />
        </TextFieldRoot>

        <TextFieldRoot class="w-1/2">
          <TextFieldLabel>Awarded Handicap</TextFieldLabel>
          <TextField
            type="number"
            step="0.1"
            value={props.data.awardedHandicap}
            onInput={(e) => props.setData('awardedHandicap', parseFloat(e.currentTarget.value) || 0)}
          />
        </TextFieldRoot>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-700">Groups (Optional)</label>
        <div class="flex gap-2">
          <TextField
            value={newGroup()}
            onInput={(e) => setNewGroup(e.currentTarget.value)}
            placeholder="Group Name (e.g. Red)"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())}
          />
          <Button onClick={handleAddGroup} type="button" variant="outline">
            <Plus size={16} /> Add
          </Button>
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <For each={props.data.groups}>
            {(group, i) => (
              <div class="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                <span>{group}</span>
                <button
                  type="button"
                  onClick={() => props.removeGroup(i())}
                  class="text-gray-500 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

// --- Step 2: Rounds ---
const Step2Rounds = (props: {
  data: SetupTournamentRequest;
  addRound: () => void;
  removeRound: (index: number) => void;
  updateRound: (index: number, field: string, value: any) => void;
  courses: any[];
  formats: any[];
}) => {
  return (
    <div class="flex flex-col gap-6">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">Rounds</h2>
        <Button onClick={props.addRound} variant="outline" size="sm">
          <Plus size={16} class="mr-2" /> Add Round
        </Button>
      </div>

      <div class="space-y-4">
        <For each={props.data.rounds}>
          {(round, i) => (
            <div class="border rounded-md p-4 flex flex-col gap-4 relative bg-gray-50">
              <button
                type="button"
                onClick={() => props.removeRound(i())}
                class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                title="Remove Round"
              >
                <Trash2 size={18} />
              </button>
              
              <div class="flex gap-4">
                 <div class="w-12 pt-8 font-bold text-gray-500">#{round.roundNumber}</div>
                 <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextFieldRoot>
                        <TextFieldLabel>Round Name</TextFieldLabel>
                        <TextField
                          value={round.name}
                          onInput={(e) => props.updateRound(i(), 'name', e.currentTarget.value)}
                          placeholder="e.g. Day 1"
                        />
                    </TextFieldRoot>
                    <TextFieldRoot>
                        <TextFieldLabel>Date</TextFieldLabel>
                        <TextField
                          type="datetime-local"
                          value={round.date}
                          onInput={(e) => props.updateRound(i(), 'date', e.currentTarget.value)}
                        />
                    </TextFieldRoot>
                    
                    <div>
                        <label class="text-xs font-medium text-gray-700 mb-1 block">Course</label>
                        <Select
                            value={round.courseId}
                            onChange={(val) => props.updateRound(i(), 'courseId', val)}
                            options={props.courses.map(c => c.id)}
                            placeholder="Select Course"
                        itemComponent={(itemProps) => (
                            <SelectItem item={itemProps.item}>
                                {props.courses.find(c => c.id === itemProps.item.rawValue)?.name}
                            </SelectItem>
                        )}
                        >
                            <SelectTrigger>
                                <SelectValue<string>>
                                    {state => props.courses.find(c => c.id === state.selectedOption())?.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent />
                        </Select>
                    </div>

                    <div>
                        <label class="text-xs font-medium text-gray-700 mb-1 block">Format</label>
                        <Select
                            value={round.formatId}
                            onChange={(val) => props.updateRound(i(), 'formatId', val)}
                            options={props.formats.map(f => f.id)}
                            placeholder="Select Format"
                            itemComponent={(itemProps) => (
                                <SelectItem item={itemProps.item}>
                                    {props.formats.find(f => f.id === itemProps.item.rawValue)?.name}
                                </SelectItem>
                            )}
                        >
                            <SelectTrigger>
                                <SelectValue<string>>
                                    {state => props.formats.find(f => f.id === state.selectedOption())?.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent />
                        </Select>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </For>
        {props.data.rounds.length === 0 && (
            <div class="text-center py-8 text-gray-500 border border-dashed rounded-md">
                No rounds added. Please add at least one round.
            </div>
        )}
      </div>
    </div>
  );
};

// --- Step 3: Teams ---
const Step3Teams = (props: {
  data: SetupTournamentRequest;
  updateTeam: (index: number, field: string, value: any) => void;
}) => {
    
  return (
    <div class="flex flex-col gap-6">
      <h2 class="text-xl font-semibold">Teams</h2>
      <p class="text-sm text-gray-500">Edit team names and assign groups.</p>

      <div class="space-y-2">
        <For each={props.data.teams}>
            {(team, i) => (
                <div class="flex gap-4 items-center border-b pb-2">
                    <div class="w-8 text-sm text-gray-400 text-center">{i() + 1}</div>
                    <TextFieldRoot class="flex-1">
                        <TextField 
                            value={team.name}
                            onInput={(e) => props.updateTeam(i(), 'name', e.currentTarget.value)}
                            placeholder="Team Name"
                        />
                    </TextFieldRoot>
                    <Show when={props.data.groups.length > 0}>
                        <div class="w-1/3">
                            <Select
                                value={team.groupName}
                                onChange={(val) => props.updateTeam(i(), 'groupName', val)}
                                options={props.data.groups}
                                placeholder="Select Group"
                                itemComponent={(props) => (
                                    <SelectItem item={props.item}>
                                        {props.item.rawValue}
                                    </SelectItem>
                                )}
                            >
                                <SelectTrigger>
                                    <SelectValue<string>>
                                        {state => state.selectedOption() || 'No Group'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent />
                            </Select>
                        </div>
                    </Show>
                </div>
            )}
        </For>
      </div>
    </div>
  );
};

// --- Step 4: Review ---
const Step4Review = (props: {
    data: SetupTournamentRequest;
    onSubmit: () => void;
    isSubmitting: boolean;
    courses: any[];
    formats: any[];
}) => {
    
    // Helper to get names
    const getCourseName = (id: string) => props.courses.find(c => c.id === id)?.name || id;
    const getFormatName = (id: string) => props.formats.find(f => f.id === id)?.name || id;

    // Group teams for display
    const teamsByGroup = createMemo(() => {
        const groups: Record<string, typeof props.data.teams> = {};
        
        // Initialize with defined groups
        props.data.groups.forEach(g => {
            groups[g] = [];
        });
        groups['Unassigned'] = [];

        props.data.teams.forEach(team => {
            if (team.groupName && groups[team.groupName]) {
                groups[team.groupName].push(team);
            } else {
                groups['Unassigned'].push(team);
            }
        });

        // Filter out Unassigned if empty and we have other groups, unless everything is unassigned (no groups defined)
        if (props.data.groups.length > 0 && groups['Unassigned'].length === 0) {
            delete groups['Unassigned'];
        }

        return groups;
    });

    return (
        <div class="flex flex-col gap-6">
            <h2 class="text-xl font-semibold">Review & Create</h2>

            <div class="bg-gray-50 p-4 rounded-md border">
                <h3 class="font-bold text-lg mb-2">{props.data.name}</h3>
                <div class="text-sm text-gray-600 grid grid-cols-2 gap-2">
                    <div><span class="font-medium">Teams:</span> {props.data.teamCount}</div>
                    <div><span class="font-medium">Handicap:</span> {props.data.awardedHandicap}</div>
                    <div><span class="font-medium">Rounds:</span> {props.data.rounds.length}</div>
                </div>
            </div>

            <div>
                <h3 class="font-bold mb-2">Rounds</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <For each={props.data.rounds}>
                        {round => (
                            <div class="border p-3 rounded shadow-sm">
                                <div class="font-semibold">#{round.roundNumber} {round.name}</div>
                                <div class="text-sm text-gray-600 mt-1">
                                    <div>{new Date(round.date).toLocaleDateString()} {new Date(round.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    <div>{getCourseName(round.courseId)}</div>
                                    <div>{getFormatName(round.formatId)}</div>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>

            <div>
                <h3 class="font-bold mb-2">Teams Structure</h3>
                <div class="flex flex-wrap gap-4">
                    <For each={Object.entries(teamsByGroup())}>
                        {([groupName, teams]) => (
                            <div class="border rounded p-3 min-w-[200px] flex-1">
                                <div class="font-semibold border-b pb-1 mb-2 text-center bg-gray-100 -mx-3 -mt-3 pt-3 px-3">{groupName}</div>
                                <ul class="text-sm space-y-1">
                                    <For each={teams}>
                                        {team => <li>{team.name}</li>}
                                    </For>
                                    {teams.length === 0 && <li class="text-gray-400 italic">No teams</li>}
                                </ul>
                            </div>
                        )}
                    </For>
                </div>
            </div>

            <div class="flex justify-end pt-4">
                <LoadingButton 
                    isLoading={() => props.isSubmitting} 
                    onClick={props.onSubmit}
                    class="bg-green-600 hover:bg-green-700"
                >
                    Create Tournament
                </LoadingButton>
            </div>
        </div>
    );
};

// --- Main Component ---
const CreateTournament = (props: { onCreate: () => void }) => {
  const [step, setStep] = createSignal(1);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const navigate = useNavigate();

  const [store, setStore] = createStore<SetupTournamentRequest>({
    name: '',
    teamCount: 1,
    awardedHandicap: 1.0,
    groups: [],
    rounds: [],
    teams: [],
  });

  // Actions
  const updateData = (field: keyof SetupTournamentRequest, value: any) => {
    setStore(field, value);
  };

  const addGroup = (name: string) => {
    if (!store.groups.includes(name)) {
      setStore('groups', (g) => [...g, name]);
    }
  };

  const removeGroup = (index: number) => {
    setStore('groups', (g) => g.filter((_, i) => i !== index));
    // Also clear assignments for this group
    const groupName = store.groups[index];
    setStore('teams', produce((teams: any[]) => {
        teams.forEach(t => {
            if (t.groupName === groupName) t.groupName = undefined;
        });
    }));
  };

  const addRound = () => {
    setStore('rounds', (r) => [
      ...r,
      {
        roundNumber: r.length + 1,
        name: `Round ${r.length + 1}`,
        date: '',
        formatId: '',
        courseId: '',
        status: 'pending',
      },
    ]);
  };

  const removeRound = (index: number) => {
    setStore('rounds', (r) => {
        const newRounds = r.filter((_, i) => i !== index);
        // Re-index round numbers
        return newRounds.map((round, i) => ({...round, roundNumber: i + 1}));
    });
  };

  const updateRound = (index: number, field: string, value: any) => {
    setStore('rounds', index, field as any, value);
  };

  const updateTeam = (index: number, field: string, value: any) => {
    setStore('teams', index, field as any, value);
  };

  // Team generation logic
  createEffect(() => {
    const count = store.teamCount;
    // We only want to run this when entering step 3, but managing that side-effect might be cleaner here
    // or inside Step3 component. However, the store is here.
    // Let's react to teamCount changes but try to preserve data.
    
    // Actually, prompt says: "When entering this step... if... empty or length doesn't match"
    // So let's do it in a `createEffect` that watches `step`.
    if (step() === 3) {
        batch(() => {
            const currentTeams = store.teams;
            if (currentTeams.length !== count) {
                const newTeams = Array.from({ length: count }, (_, i) => {
                    if (i < currentTeams.length) return currentTeams[i];
                    return { name: `Team ${i + 1}`, groupName: undefined };
                });
                // If count decreased, we sliced it effectively.
                setStore('teams', newTeams);
            }
        });
    }
  });

  const nextStep = () => {
    if (step() === 1) {
        if (!store.name) return alert("Please enter a tournament name");
    }
    if (step() === 2) {
        if (store.rounds.length === 0) return alert("Please add at least one round");
        // Validate rounds
        for (const r of store.rounds) {
            if (!r.date || !r.courseId || !r.formatId) return alert(`Please complete all fields for Round ${r.roundNumber}`);
        }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
        setIsSubmitting(true);
        await setupTournament(store);
        props.onCreate();
    } catch (e) {
        console.error(e);
        alert("Failed to create tournament");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Data for Review step
  const coursesQuery = useQuery(() => ({
    queryKey: COURSE_QUERY_KEY,
    queryFn: fetchCourses,
  }));
  const formatsQuery = useQuery(() => ({
    queryKey: FORMATS_QUERY_KEY,
    queryFn: fetchTournamentFormats,
  }));

  return (
    <div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg min-h-[600px] flex flex-col">
      {/* Stepper Header */}
      <div class="flex justify-between items-center mb-8 px-4">
        <For each={['Basics', 'Rounds', 'Teams', 'Review']}>
            {(label, i) => (
                <div class={cn("flex flex-col items-center gap-1", step() === i() + 1 ? "text-blue-600 font-bold" : "text-gray-400")}>
                    <div class={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm border-2", 
                        step() === i() + 1 ? "border-blue-600 bg-blue-50" : 
                        step() > i() + 1 ? "border-green-500 bg-green-50 text-green-600" : "border-gray-300"
                    )}>
                        {step() > i() + 1 ? <Check size={16} /> : i() + 1}
                    </div>
                    <span class="text-xs">{label}</span>
                </div>
            )}
        </For>
      </div>

      <div class="flex-grow">
        <Switch>
            <Match when={step() === 1}>
                <Step1Basics 
                    data={store} 
                    setData={updateData} 
                    addGroup={addGroup} 
                    removeGroup={removeGroup} 
                />
            </Match>
            <Match when={step() === 2}>
                <Step2Rounds 
                    data={store} 
                    addRound={addRound} 
                    removeRound={removeRound} 
                    updateRound={updateRound}
                    courses={coursesQuery.data || []}
                    formats={formatsQuery.data || []}
                />
            </Match>
            <Match when={step() === 3}>
                <Step3Teams 
                    data={store} 
                    updateTeam={updateTeam}
                />
            </Match>
            <Match when={step() === 4}>
                <Step4Review 
                    data={store}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting()}
                    courses={coursesQuery.data || []}
                    formats={formatsQuery.data || []}
                />
            </Match>
        </Switch>
      </div>

      <div class="flex justify-between mt-8 pt-4 border-t">
        <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={step() === 1}
            class={cn(step() === 1 && "invisible")}
        >
            <ChevronLeft size={16} class="mr-2" /> Back
        </Button>
        
        <Show when={step() < 4}>
            <Button onClick={nextStep}>
                Next <ChevronRight size={16} class="ml-2" />
            </Button>
        </Show>
      </div>
    </div>
  );
};

export default CreateTournament;
