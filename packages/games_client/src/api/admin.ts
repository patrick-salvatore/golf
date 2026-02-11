import client  from './client';
import type { Jwt } from '~/lib/auth';

export const adminLogin = async (password: string): Promise<Jwt> => {
  const response = await client.post<Jwt>('/v1/admin/login', { password });
  return response.data;
};
