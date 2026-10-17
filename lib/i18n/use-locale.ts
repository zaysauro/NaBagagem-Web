"use client";

import { useSyncExternalStore } from "react";
import { browserLocale, type Locale } from "./dictionaries";

function subscribe(onChange: () => void) {
  window.addEventListener("nabagagem-locale", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("nabagagem-locale", onChange);
    window.removeEventListener("focus", onChange);
  };
}
const serverLocale = (): Locale => "pt-BR";

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, browserLocale, serverLocale);
}
