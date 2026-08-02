"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lab-inventario:worker-name";
const CHANGE_EVENT = "lab-inventario:worker-name-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useWorkerName() {
  const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clearName = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { name, saveName, clearName };
}
