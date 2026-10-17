export function load(storage, key, fallback) {
  try {
    return JSON.parse(storage?.getItem("vector-duel." + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function save(storage, key, value) {
  try {
    storage?.setItem("vector-duel." + key, JSON.stringify(value));
    return Boolean(storage);
  } catch {
    return false;
  }
}
export function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
