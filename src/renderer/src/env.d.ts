/// <reference types="vite/client" />
import type { DiffScopeApi } from "../../preload/index";

declare global {
  interface Window {
    diffScope: DiffScopeApi;
  }
}

export {};
