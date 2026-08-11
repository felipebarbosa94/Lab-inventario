"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lab-inventario:simple-mode";
const CHANGE_EVENT = "lab-inventario:simple-mode-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

export function useSimpleMode() {
  const simpleMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSimpleMode = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { simpleMode, setSimpleMode };
}
