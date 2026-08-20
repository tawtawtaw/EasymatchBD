"use client";

import { useEffect, useState } from "react";
import { getDropdowns, type DropdownMap } from "@/lib/api";

/**
 * getDropdowns revalidates in the background on every call, so a grid of cards
 * calling it one-by-one would fire a request per card. Memoising per locale
 * keeps a whole page down to a single load.
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
export function useDropdowns(locale: string): DropdownMap {
  const [map, setMap] = useState<DropdownMap>(() => loaded.get(locale) ?? {});

  useEffect(() => {
    const cached = loaded.get(locale);
    if (cached) {
      setMap((current) => (current === cached ? current : cached));
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
