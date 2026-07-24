"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { getDropdowns, type DropdownMap } from "@/lib/api";

export function useMemberDropdowns() {
  const locale = useLocale();
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});

  useEffect(() => {
    let cancelled = false;
    void getDropdowns(locale).then((data) => {
      if (!cancelled) setDropdowns(data);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return dropdowns;
}
