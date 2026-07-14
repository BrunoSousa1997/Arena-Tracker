import { useEffect, useState } from "react";

// Tema (claro/escuro) e modo compacto do cabeçalho — dois interruptores de
// UI persistidos em localStorage, sem nenhuma dependência de contas, sync ou
// partidas. Extraído de App.jsx por serem completamente independentes do
// resto do estado.
export function useTheme() {
  // Tema claro/escuro — persistido e aplicado via atributo data-theme na
  // tag <html> (ver index.css), para todos os componentes lerem as mesmas
  // variáveis CSS sem precisar de prop-drilling.
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Cabeçalho (marca/conta/sync + tabs + filtro + resumo) comprimido ou não —
  // um único interruptor para o bloco todo (persistido, tal como o tema),
  // em vez de cada secção ter o seu próprio botão de colapsar. Comprimir
  // nunca esconde dados: só reduz o espaçamento e passa o resumo para a
  // versão numa única linha (ver StatsBar).
  const [headerCompact, setHeaderCompact] = useState(
    () => localStorage.getItem("header-compact") === "1"
  );

  useEffect(() => {
    localStorage.setItem("header-compact", headerCompact ? "1" : "0");
  }, [headerCompact]);

  return { theme, setTheme, headerCompact, setHeaderCompact };
}
