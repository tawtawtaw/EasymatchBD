"use client";

import { useEffect, useState } from "react";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-session";

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    function readToken() {
      setToken(localStorage.getItem(AUTH_TOKEN_KEY));
    }

    readToken();
    window.addEventListener(AUTH_CHANGED_EVENT, readToken);
    window.addEventListener("storage", readToken);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, readToken);
      window.removeEventListener("storage", readToken);
    };
  }, []);

  return token;
}
