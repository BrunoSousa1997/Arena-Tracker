import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import TitleBar from "./components/TitleBar.jsx";
import GameOverlay from "./components/GameOverlay.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
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
        {/* O TitleBar fica DE FORA do ErrorBoundary de propósito. A janela
            não tem moldura do sistema (frame: false, ver electron/window.js),
            por isso é ele que dá os botões de minimizar/fechar e a zona de
            arrastar — se um erro no App o levasse atrás, a janela ficava
            aberta sem forma de ser fechada ou movida. */}
        <TitleBar />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </LanguageProvider>
    </StrictMode>
  )
);
