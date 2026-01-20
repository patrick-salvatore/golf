import { createSignal } from 'solid-js';

export interface ApiError {
  status: number;
  message: string;
}

const [apiError, setApiError] = createSignal<ApiError | null>(null);
const [isGlobalLoading, setGlobalLoadingSpinner] = createSignal(false);

export { apiError, setApiError, isGlobalLoading, setGlobalLoadingSpinner };
