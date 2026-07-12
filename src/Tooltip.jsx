import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Tooltip partilhado por toda a app — substitui os antigos atributos
// title="..." nativos (lentos a aparecer e sem estilo) por um balão
// consistente com o tema (claro/escuro) da própria aplicação. Uso:
//   <Tooltip label="Texto a mostrar">{children}</Tooltip>
// "children" pode ser qualquer coisa (ícone, texto, botão) — o Tooltip só
// embrulha num <span> posicionado, sem alterar o layout à volta.
//
// O balão é renderizado num portal (document.body) com position:fixed,
// calculado a partir da posição real do gatilho no ecrã (getBoundingClientRect)
// — isto evita um problema comum de z-index: se o Tooltip estivesse dentro
// do <span> local, qualquer contentor antepassado com overflow:auto/hidden
// (como as listas com scroll do Histórico/Estatísticas) cortava ou escondia
// o balão sempre que ele tentasse aparecer perto do topo da área visível,
// mesmo com um z-index altíssimo — o corte acontece antes do z-index sequer
// entrar em jogo. Com o portal, o balão escapa completamente a esse recorte.
//
// Posicionamento em duas passagens: a 1ª renderização usa uma posição
// aproximada (centrada no gatilho) só para conseguir medir o tamanho real do
// balão; assim que soubermos a largura/altura verdadeiras (useLayoutEffect,
// antes do pintar do ecrã), corrigimos para uma posição em pixels absolutos
// que nunca sai da janela — sem isto, textos longos perto de um canto (ex: o
// aviso legal no "ⓘ" do canto superior esquerdo) ficavam cortados fora do
// ecrã, já que a 1ª passagem só centra sem verificar os limites horizontais.
export default function Tooltip({ label, children, position = "top", disabled = false, style }) {
  const [coords, setCoords] = useState(null);
  const [resolvedPosition, setResolvedPosition] = useState(position);
  const [finalStyle, setFinalStyle] = useState(null);
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);

  const show = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Se não houver espaço vertical suficiente para o lado pedido, troca
    // automaticamente para o lado oposto (ex: filtros perto do topo do ecrã
    // pedem "top" mas não há espaço acima — passa a abrir para baixo).
    let finalPosition = position;
    if (position === "top" && rect.top < 60) finalPosition = "bottom";
    else if (position === "bottom" && window.innerHeight - rect.bottom < 60) finalPosition = "top";

    setResolvedPosition(finalPosition);
    setFinalStyle(null);
    setCoords({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  };

  const hide = () => {
    setCoords(null);
    setFinalStyle(null);
  };

  // Mede o balão assim que aparece (ainda invisível) e corrige a posição
  // para pixels absolutos, garantindo uma margem mínima em relação a
  // qualquer borda da janela.
  useLayoutEffect(() => {
    if (!coords || !bubbleRef.current) return;
    const margin = 10;
    const rect = bubbleRef.current.getBoundingClientRect();

    let left = rect.left;
    if (left < margin) left = margin;
    else if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - margin - rect.width;
    }

    let top = rect.top;
    if (top < margin) top = margin;
    else if (top + rect.height > window.innerHeight - margin) {
      top = window.innerHeight - margin - rect.height;
    }

    setFinalStyle({ top, left });
  }, [coords, resolvedPosition]);

  if (!label || disabled) return children;

  return (
    <span
      ref={wrapRef}
      style={style ? { ...styles.wrap, ...style } : styles.wrap}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {coords &&
        createPortal(
          <span
            ref={bubbleRef}
            style={{
              ...styles.bubble,
              ...(finalStyle
                ? { top: finalStyle.top, left: finalStyle.left }
                : positionStyle(resolvedPosition, coords)),
              opacity: finalStyle ? 1 : 0,
            }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}

// Posição aproximada usada só na 1ª passagem (antes de medir o balão) —
// serve para o useLayoutEffect ter algo a partir de onde corrigir.
function positionStyle(position, coords) {
  switch (position) {
    case "bottom":
      return { top: coords.bottom + 7, left: coords.centerX, transform: "translateX(-50%)" };
    case "left":
      return { top: coords.centerY, left: coords.left - 7, transform: "translate(-100%, -50%)" };
    case "right":
      return { top: coords.centerY, left: coords.right + 7, transform: "translateY(-50%)" };
    case "top":
    default:
      return { top: coords.top - 7, left: coords.centerX, transform: "translate(-50%, -100%)" };
  }
}

const styles = {
  wrap: {
    position: "relative",
    display: "inline-flex",
  },

  bubble: {
    position: "fixed",
    zIndex: 999999,
    maxWidth: 280,
    padding: "6px 9px",
    borderRadius: 7,
    background: "rgba(var(--panel-deep-rgb),0.98)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    color: "var(--text-body)",
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.35,
    whiteSpace: "normal",
    wordBreak: "break-word",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
    pointerEvents: "none",
    fontFamily: "system-ui, sans-serif",
    transition: "opacity 0.08s ease",
  },
};
