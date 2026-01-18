import { useNavigate } from "@solidjs/router";
import { createMemo } from "solid-js";
import { z } from "zod";

import { assignTeam } from "~/api/teams";

import { LoadingButton } from "~/components/loading_button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Form, FormError } from "~/components/form";
import { createForm } from "~/components/form/create_form";
import { TextField, TextFieldRoot } from "~/components/ui/textfield";
import authStore from "~/lib/auth";
import { cn } from "~/lib/cn";

const TeamForm = () => {
  const navigate = useNavigate();

  const { form, register, handleSubmit } = createForm({
    schema: z.object({
      teamId: z.string({}).min(1),
    }),
  });

  const onSubmit = async (data) => {
    const res = await assignTeam(data.teamId.toLowerCase());

    authStore.save(res.token);
    navigate(`/tournament/start`, { replace: true });
  };

  return (
    <Card class="pt-4">
      <Form form={form}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent class="p-4 space-y-2">
            <TextFieldRoot
              class={cn(
                "text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 h-[50px]"
              )}
            >
              <TextField
                class={cn(form.fieldErrors.teamId && "border-red-500 ")}
                {...register("teamId")}
                placeholder="Team Code"
              />
            </TextFieldRoot>
          </CardContent>
          <CardFooter>
            <LoadingButton isLoading={() => form.submitting} type="submit">
              Submit
            </LoadingButton>
          </CardFooter>
        </form>
        <FormError />
      </Form>
    </Card>
  );
};

export default TeamForm;
