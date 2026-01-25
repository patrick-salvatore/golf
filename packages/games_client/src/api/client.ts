import axios, { type CreateAxiosDefaults } from 'axios';
import authStore from '~/lib/auth';
import { setApiError } from '~/state/ui';

const CLIENT_CONFIG: CreateAxiosDefaults = {
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
};

let abortController = new AbortController();

export const cancelRoutes = () => {
  if (abortController) {
    abortController.abort();
    abortController = new AbortController();
  }
};

export async function refreshAccessToken() {
  console.log(
    '\x1b[33m%s\x1b[0m',
    `Making request POST request to /session/refresh`,
  );

  const refreshToken = authStore.refreshToken;
  const response = await axios.post(
    `/v1/session/refresh`,
    {},
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );

  const tokens = response.data;
  if (!tokens.jid || !tokens.rid) {
    throw new Error('No tokens');
  }

  authStore.save(tokens.jid, tokens.rid);
  return tokens;
}

const createClient = () => {
  const instance = axios.create(CLIENT_CONFIG);

  instance.interceptors.request.use(
    async (config) => {
      config.signal = abortController.signal;
      const token = authStore.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log(
        '\x1b[33m%s\x1b[0m',
        `Making ${config.method?.toUpperCase()} request to ${config.url}`,
      );

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          await refreshAccessToken();
          return instance(originalRequest);
        } catch (refreshError) {
          authStore.clear();
          console.log({refreshError})
          console.log('\x1b[31m%s\x1b[0m', 'Refresh Token Error');
        }
      } else {
        console.log(
          '\x1b[31m%s\x1b[0m',
          `Error: Making request ${originalRequest.method?.toUpperCase()} request to ${originalRequest.url}`,
        );
      }

      if (error.response) {
        setApiError({
          status: error.response.status,
          message: error.response.statusText,
        });
      } else {
        // Network error or other issues without response
        setApiError({
          status: 500,
          message: error.message || 'Network Error',
        });
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

export const rawClient = axios.create(CLIENT_CONFIG);

export default createClient();
