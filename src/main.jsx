import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import TitleBar from "./components/TitleBar.jsx";
import GameOverlay from "./components/GameOverlay.jsx";
import { LanguageProvider } from "./lib/i18n";

// A janela de sobreposição (ver electron/overlay.js) carrega este mesmo
// ficheiro com "#overlay" no fim do URL — é o único sinal que distingue as
// duas janelas, e evita ter um segundo bundle só para desenhar um cartão.
//
// Sem o LanguageProvider nem o TitleBar de propósito: a sobreposição recebe o
// texto já feito do renderer principal e não tem moldura nenhuma para
// controlar.
const isOverlay = window.location.hash === "#overlay";

createRoot(document.getElementById("root")).render(
  isOverlay ? (
    <GameOverlay />
  ) : (
    <StrictMode>
      <LanguageProvider>
        <TitleBar />
        <App />
      </LanguageProvider>
    </StrictMode>
  )
);
