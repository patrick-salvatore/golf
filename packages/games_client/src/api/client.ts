import axios, { type CreateAxiosDefaults } from 'axios';
import { getJwt } from '~/lib/auth';
import { setApiError } from '~/state/ui';

const CLIENT_CONFIG: CreateAxiosDefaults = {
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const cancelRoutes = () => {
  if (abortController) {
    abortController.abort();
    abortController = new AbortController();
  }
};

let abortController = new AbortController();

const createClient = () => {
  const instance = axios.create(CLIENT_CONFIG);

  instance.interceptors.request.use(
    async (config) => {
      config.signal = abortController.signal;
      const token = getJwt();
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
      if (axios.isCancel(error)) {
        return Promise.reject(error);
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
