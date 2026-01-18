import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createEffect, createSignal, For } from "solid-js";
import {
  getTournaments,
  updateTournament,
  getTournamentFormats,
} from "~/api/tournaments";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "~/components/ui/table";
import type { Tournament } from "~/lib/tournaments";

const TOURNAMENTS_QUERY_KEY = ["tournaments"];

import { createMemo, Match, Show, Switch } from "solid-js";
import { z } from "zod";
import { Pencil, Trash2, Check, X } from "lucide-solid";
import { unwrap } from "solid-js/store";

import { getCourses } from "~/api/course";
import { getPlayers, getPlayersByTournament } from "~/api/player";

import { LoadingButton } from "~/components/loading_button";
import { Form, FormError } from "~/components/form";
import { createForm } from "~/components/form/create_form";
import {
  Select,
  SelectContent,
  SelectDescription,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from "~/components/ui/textfield";

import type { CourseResponse } from "~/lib/course";
import { reduceToByIdMap } from "~/lib/utils";
import type { Player } from "~/lib/team";
import { cn } from "~/lib/cn";
import type { TournamentFormat } from "~/lib/tournaments";
import { Checkbox } from "~/components/ui/checkbox";

const COURSE_QUERY_KEY = ["courses"];
const FORMATS_QUERY_KEY = ["tournament_formats"];
const PLAYERS_QUERY_KEY = ["players"];
const TOURNAMENT_PLAYERS_QUERY_KEY = ["tournament_player"];

const UpdateTournamentStep1 = (props) => {
  const coursesQuery = useQuery<CourseResponse[]>(() => ({
    queryKey: COURSE_QUERY_KEY,
    queryFn: getCourses,
    initialData: [],
  }));

  const formatsQuery = useQuery<TournamentFormat[]>(() => ({
    queryKey: FORMATS_QUERY_KEY,
    queryFn: getTournamentFormats,
    initialData: [],
  }));

  const formatsMap = createMemo(() => {
    return reduceToByIdMap(unwrap(formatsQuery.data), "id");
  });

  const coursesMap = createMemo(() => {
    return reduceToByIdMap(unwrap(coursesQuery.data), "id");
  });

  const selectCourse = (id: keyof ReturnType<typeof coursesMap>) => {
    const selected = coursesMap()[id];
    if (selected) {
      props.form.fields.courseId._value.set(selected.id);
    }
  };

  const selectFormat = (id: keyof ReturnType<typeof coursesMap>) => {
    const selected = formatsMap()[id];
    if (selected) {
      props.form.fields.formatId._value.set(selected.id);
    }
  };

  const setChecked = (val) => {
    props.form.fields.isMatchPlay._value.set(val);
  };

  return (
    <Form form={props.form}>
      <form
        onSubmit={props.handleSubmit}
        class="min-h-[550px] flex flex-col justify-between"
      >
        <div class="flex flex-col gap-4">
          <TextFieldRoot>
            <TextFieldLabel>Tournament Name</TextFieldLabel>
            <TextField
              {...props.register("name")}
              class={cn(props.form.fieldErrors.name && "border-red-500")}
              placeholder="Tournament Name"
            />
          </TextFieldRoot>

          <section>
            <Select
              placeholder="Select Course"
              options={coursesQuery.data.map((v) => v.id)}
              itemComponent={(_props) => (
                <SelectItem item={_props.item}>
                  {coursesMap()[_props.item.rawValue as any].name}
                </SelectItem>
              )}
              {...props.register("courseId", {
                revalidateOn: "change",
                onChange: selectCourse,
              })}
            >
              <Select.Description class="text-sm font-medium">
                Course
              </Select.Description>
              <SelectTrigger
                class={cn(props.form.fieldErrors.courseId && "border-red-500")}
              >
                <SelectValue<string>>
                  {(state) => coursesMap()[state.selectedOption()].name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </section>

          <section>
            <Select
              placeholder="Select Format"
              options={formatsQuery.data.map((v) => v.id)}
              itemComponent={(_props) => (
                <SelectItem item={_props.item}>
                  {formatsMap()[_props.item.rawValue as any].name}
                </SelectItem>
              )}
              {...props.register("formatId", {
                revalidateOn: "change",
                onChange: selectFormat,
              })}
            >
              <Select.Description class="text-sm font-medium">
                Format
              </Select.Description>
              <SelectTrigger
                class={cn(props.form.fieldErrors.formatId && "border-red-500")}
              >
                <SelectValue<string>>
                  {(state) => formatsMap()[state.selectedOption()].name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </section>

          <section class="flex gap-2">
            <TextFieldRoot class="w-40">
              <TextFieldLabel>Team Count</TextFieldLabel>
              <TextField
                {...props.register("teamCount")}
                type="number"
                class={cn(props.form.fieldErrors.teamCount && "border-red-500")}
                placeholder="Team Count"
              />
            </TextFieldRoot>
            <TextFieldRoot class="w-40">
              <TextFieldLabel> Awarded Handicap</TextFieldLabel>
              <TextField
                {...props.register("awardedHandicap")}
                type="number"
                step="0.1"
                class={cn(
                  props.form.fieldErrors.awardedHandicap && "border-red-500"
                )}
                placeholder="Awarded Handicap"
              />
            </TextFieldRoot>
          </section>

          <section>
            <Checkbox
              label="Is Match Play?"
              class={cn(
                "flex items-center space-x-2",
                props.form.fieldErrors.isMatchPlay && "border-red-500"
              )}
              {...props.register("isMatchPlay", {
                onChange: setChecked,
                revalidateOn: "change",
              })}
            ></Checkbox>
          </section>
        </div>
        <Button type="submit">Submit</Button>
      </form>
      <FormError />
    </Form>
  );
};

const UpdateTournamentStep2 = (props) => {
  const [editingPlayer, setEditingPlayer] = createSignal<Player>(null);
  const queryClient = useQueryClient();

  const playersQuery = useQuery<Player[]>(() => ({
    queryKey: PLAYERS_QUERY_KEY,
    queryFn: getPlayers,
    initialData: [],
  }));

  const tournamentPlayerQuery = useQuery<Player[]>(() => ({
    queryKey: TOURNAMENT_PLAYERS_QUERY_KEY,
    queryFn: () => getPlayersByTournament(props.tournamentData.id),
    initialData: [],
  }));

  const form = props.form;

  createEffect(() => {
    if (tournamentPlayerQuery.data) {
      console.log(tournamentPlayerQuery.data);
      form.fields.players?._value.set(unwrap(tournamentPlayerQuery.data));
    }
  });

  const course = createMemo(() => {
    const selectCourseId = props.tournamentData.courseId;
    const course = queryClient.getQueryData(COURSE_QUERY_KEY) as any;

    return reduceToByIdMap(course, "id")[selectCourseId];
  });

  const playerMap = createMemo(() => {
    return reduceToByIdMap(unwrap(playersQuery.data), "name");
  });

  const selectedPlayers = createMemo(() => {
    return form.fields.players?.value ?? [];
  });

  const unselectedPlayers = createMemo(() => {
    return playersQuery.data.filter(
      (p) => !form.fields.players?.value.find((_p) => _p.id == p.id)
    );
  });

  const isAllSelected = createMemo(() => {
    return selectedPlayers().length === playersQuery.data.length;
  });

  const addItem = (playerName) => {
    if (!playerName) return;

    const player = playerMap()[playerName];

    if (!player) return;

    const exists = selectedPlayers().some((item) => item.id === player.id);

    if (!exists) {
      form.fields.players._value.set((prev) => [
        ...prev,
        { ...player, tee: course().meta.tees[0] },
      ]);
    }
  };

  const removeSelected = (id) => {
    console.log(id);
    form.fields.players._value.set((prev) => {
      return prev.filter((player) => player.id !== id);
    });
  };

  const startEdit = (item) => {
    if (!editingPlayer()) {
      setEditingPlayer(item);
    }
  };

  const saveEdit = () => {
    if (editingPlayer().name.trim()) {
      form.fields.players._value.set((prev) => {
        return prev.map((player) =>
          player.id === editingPlayer().id
            ? { ...player, ...editingPlayer() }
            : player
        );
      });
    }
    setEditingPlayer(undefined);
  };

  const cancelEdit = () => {
    setEditingPlayer(undefined);
  };

  const selectAll = () => {
    form.fields.players._value.set(
      unwrap(playersQuery.data).map((player) => ({
        ...player,
        tee: course().meta.tees[0],
      }))
    );
  };

  const deselectAll = () => {
    form.fields.players._value.set([]);
  };

  const onSubmit = async (playersData) => {
    const data = {
      ...playersData,
      ...props.tournamentData,
    };

    console.log(data);
    await updateTournament(props.tournamentData.id, {
      ...data,
      teamCount: parseInt(data.teamCount),
      awardedHandicap: parseFloat(data.awardedHandicap),
    });

    props.onEdit();
  };

  return (
    <Form form={form}>
      <form
        onSubmit={props.handleSubmit(onSubmit)}
        class="min-h-[550px] flex flex-col justify-between"
      >
        <section class="flex flex-col gap-2">
          <Select
            {...props.register("players", { onChange: addItem })}
            options={unselectedPlayers().map((v) => v.name)}
            placeholder="Select Player"
            itemComponent={(_props) => (
              <SelectItem item={_props.item}>
                {_props.item.rawValue as any}
              </SelectItem>
            )}
          >
            <SelectDescription class="text-sm font-medium">
              Players
            </SelectDescription>
            <SelectTrigger
              class={cn(form.fieldErrors.players && "border-red-500")}
            >
              <SelectValue<string>>
                {(state) => state.selectedOption()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>

          <div class="flex gap-2">
            <Button
              onClick={selectAll}
              disabled={isAllSelected()}
              class="px-3 py-1 bg-blue-500 text-white text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Select All
            </Button>
            <Button
              onClick={deselectAll}
              disabled={selectedPlayers()?.length === 0}
              class="px-3 py-1 bg-gray-500 text-white text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Deselect All
            </Button>
          </div>

          <div>
            <div class="grid grid-cols-[1fr_1fr_68px] border-b">
              <span class="flex-grow h-10 px-2 text-left align-middle font-medium text-muted-foreground text-sm flex items-center">
                Name
              </span>
              <span class="flex-grow h-10 px-2 text-left align-middle font-medium text-muted-foreground text-sm flex items-center">
                Tees
              </span>
              <span class="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-sm flex items-center"></span>
            </div>
            <div class="min-h-[250px] max-h-[250px] overflow-scroll">
              <For each={selectedPlayers()}>
                {(player) => (
                  <section class="grid grid-cols-[1fr_1fr_auto] gap-2 px-2">
                    <div class="flex-grow font-medium text-gray-700 py-2 text-sm flex items-center">
                      <Show
                        when={editingPlayer()?.id === player.id}
                        fallback={
                          <span class="text-gray-700">{player.name}</span>
                        }
                      >
                        <TextFieldRoot>
                          <TextField
                            value={editingPlayer()?.name}
                            onInput={() => setEditingPlayer(player)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </TextFieldRoot>
                      </Show>
                    </div>

                    <div class="flex-grow font-medium text-gray-700 py-2 text-sm flex items-center">
                      <Show
                        when={editingPlayer()?.id === player.id}
                        fallback={
                          <span class="text-gray-700">{player.tee}</span>
                        }
                      >
                        <Select
                          class="w-full"
                          options={Object.keys(course().meta.tees)}
                          itemComponent={(props) => (
                            <SelectItem item={props.item}>
                              {props.item.rawValue}
                            </SelectItem>
                          )}
                          value={editingPlayer().tee}
                          onChange={(val) =>
                            setEditingPlayer((prev) => ({ ...prev, tee: val }))
                          }
                        >
                          <SelectTrigger class="">
                            <SelectValue<string>>
                              {(state) => state.selectedOption()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent />
                        </Select>
                      </Show>
                    </div>

                    <div class=" font-medium py-2 text-sm flex items-center">
                      <Show
                        when={
                          !!selectedPlayers().find((p) => player.id == p.id)
                        }
                      >
                        <div class="flex items-center space-x-1">
                          <Switch>
                            <Match when={editingPlayer()?.id === player.id}>
                              <Button
                                onClick={() => saveEdit()}
                                variant="ghost"
                                class="p-1 text-green-600 hover:bg-green-100"
                                title="Save"
                              >
                                <Check size={16} />
                              </Button>
                              <Button
                                onClick={cancelEdit}
                                variant="ghost"
                                class="p-1 text-gray-600 hover:bg-gray-100"
                                title="Cancel"
                              >
                                <X size={16} />
                              </Button>
                            </Match>
                            <Match when={true}>
                              <Button
                                onClick={() => startEdit(player)}
                                variant="ghost"
                                class="p-1 text-blue-600 hover:bg-blue-100"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => removeSelected(player.id)}
                                class="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Remove from selection"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </Match>
                          </Switch>
                        </div>
                      </Show>
                    </div>
                  </section>
                )}
              </For>
            </div>
          </div>
        </section>
        <FormError />
        <div class="flex pt-4 gap-2">
          <Button
            type="button"
            onClick={props.goBack}
            class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back
          </Button>
          <LoadingButton isLoading={() => form.submitting} type="submit">
            Submit
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
};

const UpdateTournamentForm = (props) => {
  const [currentStep, setCurrentStep] = createSignal(1);

  const form1 = createForm({
    schema: z.object({
      name: z.string({}).min(1),
      courseId: z.string({}).min(1),
      teamCount: z
        .number()
        .or(z.string({}).regex(/^[+-]?(\d+(\.\d*)?|\.\d+)$/)),
      awardedHandicap: z
        .number()
        .or(z.string({}).regex(/^[+-]?(\d+(\.\d*)?|\.\d+)$/)),
      formatId: z.string({}).min(1),
      isMatchPlay: z.boolean(),
    }),
    initialValues: props.editingTournament(),
  });

  const form2 = createForm({
    schema: z.object({
      players: z
        .array(
          z.object({
            id: z.string(),
            tee: z.string(),
          })
        )
        .min(1),
    }),
    initialValues: {
      players: [],
    },
  });

  const goBack = () => {
    setCurrentStep(1);
  };

  const goToNext = () => {
    setCurrentStep(2);
  };

  return (
    <>
      <div class="mb-6">
        <span class="text-sm font-medium text-gray-700">
          Step {currentStep()} of 2
        </span>
      </div>

      <Switch>
        <Match when={currentStep() === 1}>
          <UpdateTournamentStep1
            handleSubmit={form1.handleSubmit(goToNext)}
            register={form1.register}
            form={form1.form}
          />
        </Match>

        <Match when={currentStep() === 2}>
          <UpdateTournamentStep2
            goBack={goBack}
            onEdit={props.onEdit}
            handleSubmit={form2.handleSubmit}
            register={form2.register}
            form={form2.form}
            tournamentData={props.editingTournament()}
          />
        </Match>
      </Switch>
    </>
  );
};

const UpdateTournaments = () => {
  const [editingTournament, setEditingTournament] = createSignal();

  const tournamentsQuery = useQuery<Tournament[]>(() => ({
    queryKey: TOURNAMENTS_QUERY_KEY,
    queryFn: getTournaments,
    initialData: [],
  }));

  return (
    <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <Switch>
        <Match when={editingTournament()}>
          <UpdateTournamentForm
            editingTournament={editingTournament}
            onEdit={() => setEditingTournament(undefined)}
          />
        </Match>

        <Match when={true}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={tournamentsQuery.data}>
                {(tournament) => {
                  return (
                    <TableRow>
                      <TableCell class="font-medium">
                        {tournament.name}
                      </TableCell>
                      <TableCell class="font-medium">
                        <Button
                          variant="ghost"
                          onClick={() => setEditingTournament(tournament)}
                          class="p-1 text-blue-600 hover:bg-red-100 rounded"
                          title="Remove from selection"
                        >
                          <Pencil size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </For>
            </TableBody>
          </Table>
        </Match>
      </Switch>
    </div>
  );
};

export default UpdateTournaments;
