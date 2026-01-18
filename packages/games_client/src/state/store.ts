// Re-export initSync as initStore to maintain compatibility
export { initSync as initStore } from "~/lib/sync/engine";

// Deprecated getters handled by direct imports now
export const getStore = () => {
    throw new Error("getStore is deprecated. Use useEntity/useEntities or import entityStore directly.");
};
