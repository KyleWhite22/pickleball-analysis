import "./amplify"; // configure FIRST
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SelectedLeagueProvider } from "./state/SelectedLeagueProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SelectedLeagueProvider>
      <App />
    </SelectedLeagueProvider>
  </StrictMode>
);