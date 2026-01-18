import axios, { type CreateAxiosDefaults } from "axios";
import { getJwt } from "~/lib/auth";

const CLIENT_CONFIG: CreateAxiosDefaults = {
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
};

const createClient = () => {
  const instance = axios.create(CLIENT_CONFIG);

  instance.interceptors.request.use(
    async (config) => {
      const token = getJwt();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log(
        "\x1b[33m%s\x1b[0m",
        `Making ${config.method?.toUpperCase()} request to ${config.url}`
      );

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

export const rawClient = axios.create(CLIENT_CONFIG);

export default createClient();
