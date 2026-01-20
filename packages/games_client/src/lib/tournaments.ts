import type { TournamentState } from '~/state/schema';

export type TournamentFormat = {
  id: number;
  name: string;
  description?: string;
};

export type Tournament = TournamentState;
