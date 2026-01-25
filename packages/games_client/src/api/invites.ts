import client from './client';

export async function acceptInvite(token: string) {
  return client.post(`/v1/invites/${token}/accept`);
}

export async function fetchInvite(token: string) {
  return client.get(`/v1/invites/${token}`);
}
