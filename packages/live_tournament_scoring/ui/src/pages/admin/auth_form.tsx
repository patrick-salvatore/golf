import { createSignal, type ParentComponent } from "solid-js";
import z from "zod";
import { Form, FormError } from "~/components/form";
import { createForm } from "~/components/form/create_form";
import { LoadingButton } from "~/components/loading_button";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from "~/components/ui/textfield";
// import { pb } from "./pb";
const UserAuthForm: ParentComponent<{ onLogin: () => void }> = (props) => {
  const { form, register, handleSubmit } = createForm({
    schema: z.object({
      email: z.string({}).email(),
      password: z.string({}).min(1),
    }),
  });

  async function onSubmit() {
    try {
      // await pb
      //   .collection("_superusers")
      //   .authWithPassword(data.email, data.password);

      props.onLogin();
    } catch {}
  }

  return (
    <div class="grid gap-6">
      <Form form={form}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div class="grid gap-2">
            <div class="grid gap-1">
              <TextFieldRoot>
                <TextField
                  id="email"
                  {...register("email")}
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autocomplete="email"
                  autocorrect="off"
                  disabled={form.submitting}
                />
              </TextFieldRoot>
              <TextFieldRoot>
                <TextField
                  id="Password"
                  placeholder="password"
                  type="password"
                  autoCapitalize="none"
                  autocorrect="off"
                  disabled={form.submitting}
                  {...register("password")}
                />
              </TextFieldRoot>
            </div>
            <LoadingButton isLoading={() => form.submitting} type="submit">
              Submit
            </LoadingButton>
          </div>
        </form>
        <FormError />
      </Form>
    </div>
  );
};

export default UserAuthForm;
