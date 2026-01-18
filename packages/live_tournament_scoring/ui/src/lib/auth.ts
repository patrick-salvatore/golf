import { tryCatch } from "./utils";
import { query, redirect } from "@solidjs/router";

import { getIdentity } from "~/api/auth";

import { useSessionStore } from "~/state/session";

export type Session = {
  teamId: string;
  tournamentId: string;
};

export type Jwt = {
  token: string;
};

export type TeamAssignment = Session & Jwt;

export type OnStoreChangeFunc = (token: string) => void;

const StorageKeys = {
  jwtKey: "jid",
};

export const authCheck = query(async () => {
  try {
    const session = await getIdentity();

    const { set: setSessionStore } = useSessionStore();

    if (!session.tournamentId || !session.teamId) {
      throw redirect("/tournament");
    }

    setSessionStore({
      tournamentId: session.tournamentId,
      teamId: session.teamId,
    });
  } catch {
    throw redirect("/tournament");
  }
}, "auth_check");

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

  constructor() {
    this.storageKey = StorageKeys.jwtKey;

    this._bindStorageEvent();
  }

  get token(): string {
    const data = this._storageGet(this.storageKey) || {};

    return data.token || "";
  }

  clear() {
    this._storageRemove(this.storageKey);

    this.baseToken = "";
    this.triggerChange();
  }

  save(token: string) {
    this._storageSet(this.storageKey, {
      token: token,
    });

    this.baseToken = token || "";

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

  protected baseToken: string = "";

  protected triggerChange(): void {
    for (const callback of this._onChangeCallbacks) {
      callback && callback(this.token);
    }
  }

  private _storageGet(key: string): any {
    if (typeof window !== "undefined" && window?.localStorage) {
      const rawValue = window.localStorage.getItem(key) || "";
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
    if (typeof window !== "undefined" && window?.localStorage) {
      // store in local storage
      let normalizedVal = value;
      if (typeof value !== "string") {
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
    if (typeof window !== "undefined" && window?.localStorage) {
      window.localStorage?.removeItem(key);
    }

    // delete from fallback
    delete this.storageFallback[key];
  }

  private _bindStorageEvent() {
    if (
      typeof window === "undefined" ||
      !window?.localStorage ||
      !window.addEventListener
    ) {
      return;
    }

    window.addEventListener("storage", (e) => {
      if (e.key != this.storageKey) {
        return;
      }

      const data = this._storageGet(this.storageKey) || {};

      this.save(data.token || "");
    });
  }
}
const authStore = new AuthStore();

authStore.onChange(async () => {
  const store = useSessionStore();
  const session = await getIdentity();
  store.set(session);
});

export default authStore;
