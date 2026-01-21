import type { AuthSession } from '~/lib/auth';
import client from './client';

export async function getSession() {
  return client.get<AuthSession>(`/v1/session`).then((res) => res.data);
}

export async function leaveSession() {
  return client.post('/v1/session/leave');
}
