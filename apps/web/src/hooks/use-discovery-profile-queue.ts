import { useCallback, useRef, useState } from "react";
import type { DiscoveryFilters, DiscoveryListItem } from "@/lib/discovery";
import { listDiscoveryProfiles } from "@/lib/discovery";
import { runDiscoveryGridTransition } from "@/lib/discovery-grid-transition";

function takeFromReserve(
  reserve: DiscoveryListItem[],
  needed: number,
  blocked: Set<string>,
) {
  const taken: DiscoveryListItem[] = [];
  const leftover: DiscoveryListItem[] = [];
  for (const item of reserve) {
    if (
      taken.length < needed &&
      !blocked.has(item.profileCode) &&
      !taken.some((row) => row.profileCode === item.profileCode)
    ) {
      taken.push(item);
    } else {
      leftover.push(item);
    }
  }
  return { taken, leftover };
}

export function useDiscoveryProfileQueue() {
  const [items, setItems] = useState<DiscoveryListItem[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const reserveRef = useRef<DiscoveryListItem[]>([]);
  const nextPageRef = useRef(2);
  const hasMoreRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const refillInflight = useRef<Promise<void> | null>(null);

  const resetQueue = useCallback((
    nextItems: DiscoveryListItem[],
    total: number,
    hasMore: boolean,
  ) => {
    setItems(nextItems);
    setMatchTotal(total);
    reserveRef.current = [];
    nextPageRef.current = 2;
    hasMoreRef.current = hasMore;
    seenRef.current = new Set(nextItems.map((item) => item.profileCode));
  }, []);

  const refillReserve = useCallback(
    async (
      token: string,
      limit: number,
      filters: DiscoveryFilters,
    ) => {
      if (refillInflight.current) {
        await refillInflight.current;
        return;
      }
      if (!hasMoreRef.current) return;
      if (reserveRef.current.length >= limit) return;

      const request = (async () => {
        try {
          const page = nextPageRef.current;
          const list = await listDiscoveryProfiles(token, page, limit, filters);
          nextPageRef.current = page + 1;
          hasMoreRef.current = list.hasMore ?? list.items.length >= limit;
          const extras = list.items.filter((item) => {
            if (seenRef.current.has(item.profileCode)) return false;
            seenRef.current.add(item.profileCode);
            return true;
          });
          reserveRef.current = [...reserveRef.current, ...extras];
          if (extras.length === 0 && list.items.length > 0 && list.hasMore) {
            hasMoreRef.current = true;
          }
        } catch {
          hasMoreRef.current = false;
        }
      })().finally(() => {
        refillInflight.current = null;
      });

      refillInflight.current = request;
      await request;
    },
    [],
  );

  const fillVisibleFromReserve = useCallback((displayLimit: number) => {
    setItems((current) => {
      const needed = Math.max(0, displayLimit - current.length);
      if (needed === 0) return current;
      const visibleCodes = new Set(current.map((item) => item.profileCode));
      const { taken, leftover } = takeFromReserve(
        reserveRef.current,
        needed,
        visibleCodes,
      );
      reserveRef.current = leftover;
      return taken.length === 0 ? current : [...current, ...taken];
    });
  }, []);

  const leaveProfiles = useCallback(
    (
      profileCodes: string[],
      displayLimit: number,
      options?: {
        decrementTotal?: boolean;
        refill?: {
          token: string;
          filters: DiscoveryFilters;
        };
      },
    ) => {
      if (profileCodes.length === 0) return;

      const leave = new Set(profileCodes);
      for (const code of leave) {
        seenRef.current.add(code);
      }

      runDiscoveryGridTransition(() => {
        let removedCount = 0;
        setItems((current) => {
          const kept = current.filter((item) => !leave.has(item.profileCode));
          removedCount = current.length - kept.length;
          if (removedCount === 0) {
            return current;
          }
          const needed = Math.max(0, displayLimit - kept.length);
          const visibleCodes = new Set(kept.map((item) => item.profileCode));
          const { taken, leftover } = takeFromReserve(
            reserveRef.current,
            needed,
            new Set([...leave, ...visibleCodes]),
          );
          reserveRef.current = leftover;
          return [...kept, ...taken];
        });
        if (options?.decrementTotal && removedCount > 0) {
          setMatchTotal((total) => Math.max(0, total - removedCount));
        }
      });

      if (!options?.refill) {
        return;
      }

      void refillReserve(
        options.refill.token,
        displayLimit,
        options.refill.filters,
      ).then(() => fillVisibleFromReserve(displayLimit));
    },
    [fillVisibleFromReserve, refillReserve],
  );

  return {
    items,
    matchTotal,
    resetQueue,
    refillReserve,
    leaveProfiles,
  };
}
