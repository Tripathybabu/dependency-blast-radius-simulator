"use client";

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToasterToast[] };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(toast: ToasterToast) {
  memoryState = {
    toasts: [toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
  };
  listeners.forEach((l) => l(memoryState));

  setTimeout(() => {
    memoryState = {
      toasts: memoryState.toasts.filter((t) => t.id !== toast.id),
    };
    listeners.forEach((l) => l(memoryState));
  }, TOAST_REMOVE_DELAY);
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
  dispatch({ ...props, id: genId() });
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return { ...state, toast };
}

export { useToast, toast };
