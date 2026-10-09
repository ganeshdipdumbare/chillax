export type ThemePref = "light" | "dark";

const THEME_KEY = "chillax.theme";
const ORDER: ThemePref[] = ["light", "dark"];

function parse(value: unknown): ThemePref {
  return value === "dark" ? "dark" : "light";
}

export function nextThemePref(pref: ThemePref): ThemePref {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
}

export async function saveThemePref(pref: ThemePref): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: pref });
}

/** Calls back with the stored preference and whether dark is in effect, now and on every change. */
export function watchTheme(onChange: (pref: ThemePref, dark: boolean) => void): () => void {
  let pref: ThemePref = "light";
  const emit = () => onChange(pref, pref === "dark");
  const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local" || !(THEME_KEY in changes)) return;
    pref = parse(changes[THEME_KEY].newValue);
    emit();
  };
  emit();
  void chrome.storage.local.get(THEME_KEY).then((stored) => {
    pref = parse(stored[THEME_KEY]);
    emit();
  });
  chrome.storage.onChanged.addListener(onStorage);
  return () => {
    chrome.storage.onChanged.removeListener(onStorage);
  };
}
