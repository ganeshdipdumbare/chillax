type KeyHandler = (event: KeyboardEvent) => void;
type KeyShield = { handler: KeyHandler | null };
type ShieldWindow = Window & { __chillaxKeyShield?: KeyShield };

/**
 * Players like Prime Video add capture listeners on `window` early, and same-target listeners
 * run in registration order, so this has to be registered at document_start to beat them.
 * State lives on `window` because each content script bundles its own copy of this module.
 */
export function installKeyShield(): KeyShield {
  const w = window as ShieldWindow;
  if (w.__chillaxKeyShield) return w.__chillaxKeyShield;
  const shield: KeyShield = { handler: null };
  w.__chillaxKeyShield = shield;
  const onKey = (event: KeyboardEvent) => shield.handler?.(event);
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    window.addEventListener(type, onKey, true);
  }
  return shield;
}

installKeyShield();
