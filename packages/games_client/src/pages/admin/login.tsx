import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { adminLogin } from '~/api/admin';
import authStore from '~/lib/auth';
import { LoadingButton } from '~/components/loading_button';
import { TextField, TextFieldRoot } from '~/components/ui/textfield';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tokens: any = await adminLogin(password());
      // The backend returns { jid: string, rid: string }
      if (tokens.jid && tokens.rid) {
        authStore.save(tokens.jid, tokens.rid);
        navigate('/_admin', { replace: true });
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex flex-col items-center justify-center bg-background p-4">
      <div class="w-full max-w-sm space-y-6">
        <div class="text-center">
          <h1 class="text-2xl font-bold tracking-tight">Admin Access</h1>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="space-y-2">
            <TextFieldRoot>
              <TextField
                disabled={loading()}
                placeholder="Enter admin password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class="text-center"
              />
            </TextFieldRoot>
          </div>

          <LoadingButton
            isLoading={loading}
            type="submit"
            class="w-full"
            disabled={!password()}
          >
            Enter
          </LoadingButton>
        </form>

        <Show when={error()}>
          <div class="text-sm font-medium text-destructive text-center">
            {error()}
          </div>
        </Show>
      </div>
    </div>
  );
};

export default AdminLogin;
