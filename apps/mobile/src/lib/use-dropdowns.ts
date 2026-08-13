import { useEffect, useState } from "react";
import { getDropdowns } from "../services/dropdowns";
import type { DropdownMap } from "../types/dropdowns";
import type { AppLocale } from "./locale";

/**
 * Lets list rows resolve dropdown labels without every screen that renders them
 * having to load and thread the map down. One load per locale covers the app.
 */
const loaded = new Map<string, DropdownMap>();
const pending = new Map<string, Promise<DropdownMap>>();

function load(locale: string): Promise<DropdownMap> {
  const existing = pending.get(locale);
  if (existing) return existing;

  const request = getDropdowns(locale)
    .then((map) => {
      loaded.set(locale, map);
      return map;
    })
    .finally(() => {
      pending.delete(locale);
    });

  pending.set(locale, request);
  return request;
}

/**
 * Returns an empty map until the labels land, so callers should treat a missing
 * label as "not ready yet" rather than "no such option".
 */
export function useDropdowns(locale: AppLocale): DropdownMap {
  const [map, setMap] = useState<DropdownMap>(() => loaded.get(locale) ?? {});

  useEffect(() => {
    const cached = loaded.get(locale);
    if (cached) {
      setMap(cached);
      return;
    }

    let active = true;
    void load(locale)
      .then((next) => {
        if (active) setMap(next);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [locale]);

  return map;
}
