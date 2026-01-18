import type { AuthSession } from '~/lib/auth';
import client from './client';

export async function createIdentity() {
  return client.post(`/v1/identity`).then((res) => res.data);
}

export async function getIdentity() {
  return client.get<AuthSession>(`/v1/identity`).then((res) => res.data);
}
