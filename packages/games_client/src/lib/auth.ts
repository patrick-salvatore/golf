import axios from 'axios';
import { tryCatch } from './utils';
import { query, redirect } from '@solidjs/router';

import { getSession } from '~/api/auth';
import { getActivePlayers } from '~/api/player';

import { useSessionStore } from '~/state/session';

export type AuthSession = {
  teamId?: number;
  tournamentId?: number;
  playerId?: number;
  isAdmin?: boolean;
};

export type Jwt = {
  token: string;
};

export type TokenData = {
  jid: string;
  rid: string
}

const StorageKeys = {
  jwtKey: 'jid',
  refreshTokenKey: 'rid',
};

export type TeamAssignment = AuthSession & Jwt;

export type OnStoreChangeFunc = (token: string) => void;

export const authenticateSession = async (): Promise<AuthSession | null> => {
  try {
    const session = await getSession();
    const { set: setSessionStore } = useSessionStore();

    if (session) {
      setSessionStore({
        tournamentId: session.tournamentId,
        teamId: session.teamId,
        isAdmin: session.isAdmin,
        playerId: session.playerId,
      });
      return session;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export const authCheck = query(async () => {
  const session = await authenticateSession();

  if (!session) {
    throw redirect('/join');
  }
}, 'auth_check');

export const jwtCheck = query(async () => {
  if (authStore.token) {
    throw redirect('/tournament');
  }
}, 'guest_check');

export const adminAuthCheck = query(async () => {
  try {
    const session = await getSession();
    if (!session.isAdmin) {
      throw redirect('/');
    }
  } catch {
    throw redirect('/');
  }
}, 'admin_auth_check');

export const getJwt = () => {
  const storedJwt = localStorage.getItem(StorageKeys.jwtKey);

  if (storedJwt) {
    return tryCatch(() => JSON.parse(storedJwt).token);
  }

  return null;
};

export class AuthStore {
  private storageFallback: { [key: string]: any } = {};
  private storageKey: string;
  private refreshTokenKey: string;

  constructor() {
    this.storageKey = StorageKeys.jwtKey;
    this.refreshTokenKey = StorageKeys.refreshTokenKey;

    this._bindStorageEvent();
  }

  get token(): string {
    const data = this._storageGet(this.storageKey) || {};

    return data.token || '';
  }

  get refreshToken(): string {
    const data = this._storageGet(this.refreshTokenKey) || {};

    return data.token || '';
  }

  clear() {
    this._storageRemove(this.storageKey);
    this.baseToken = '';
    this.triggerChange();
  }

  save(token: string, refreshToken: string) {
    this._storageSet(this.storageKey, {
      token: token,
    });
    this._storageSet(this.refreshTokenKey, {
      refreshToken: refreshToken,
    });

    this.baseToken = token || '';

    this.triggerChange();
  }

  onChange(callback: OnStoreChangeFunc): () => void {
    this._onChangeCallbacks.push(callback);

    return () => {
      for (let i = this._onChangeCallbacks.length - 1; i >= 0; i--) {
        if (this._onChangeCallbacks[i] == callback) {
          delete this._onChangeCallbacks[i]; // removes the function reference
          this._onChangeCallbacks.splice(i, 1); // reindex the array
          return;
        }
      }
    };
  }

  protected baseToken: string = '';

  protected triggerChange(): void {
    for (const callback of this._onChangeCallbacks) {
      callback && callback(this.token);
    }
  }

  private _storageGet(key: string): any {
    if (typeof window !== 'undefined' && window?.localStorage) {
      const rawValue = window.localStorage.getItem(key) || '';
      try {
        return JSON.parse(rawValue);
      } catch (e) {
        // not a json
        return rawValue;
      }
    }

    // fallback
    return this.storageFallback[key];
  }

  private _onChangeCallbacks: Array<OnStoreChangeFunc> = [];

  private _storageSet(key: string, value: any) {
    if (typeof window !== 'undefined' && window?.localStorage) {
      // store in local storage
      let normalizedVal = value;
      if (typeof value !== 'string') {
        normalizedVal = tryCatch(() => JSON.stringify(value));
      }

      window.localStorage.setItem(key, normalizedVal);
    } else {
      // store in fallback
      this.storageFallback[key] = value;
    }
  }

  private _storageRemove(key: string) {
    // delete from local storage
    if (typeof window !== 'undefined' && window?.localStorage) {
      window.localStorage?.removeItem(key);
    }

    // delete from fallback
    delete this.storageFallback[key];
  }

  private _bindStorageEvent() {
    if (
      typeof window === 'undefined' ||
      !window?.localStorage ||
      !window.addEventListener
    ) {
      return;
    }

    window.addEventListener('storage', (e) => {
      if (e.key != this.storageKey) {
        return;
      }

      const tokenData = this._storageGet(this.storageKey) || {};
      const resfreshTokenData = this._storageGet(this.refreshToken) || {};

      this.save(tokenData.token || '', resfreshTokenData.data || '');
    });
  }
}
const authStore = new AuthStore();

authStore.onChange(async () => {
  const store = useSessionStore();
  const session = await getSession();
  store.set(session);
});

export default authStore;
