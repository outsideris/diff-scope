import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@git-diff-view/react/styles/diff-view-pure.css";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
