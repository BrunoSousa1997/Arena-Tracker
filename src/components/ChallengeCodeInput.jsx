import { useRef, useState } from "react";

// Entrada do código da sala, casa a casa (como um código de jogo), em vez de
// uma caixa de texto com "letter-spacing". Cinco quadrados dizem quantos
// caracteres o código tem ANTES de se escrever o primeiro — com um campo
// normal só se descobria ao chegar ao limite.
//
// Não são cinco <input>: é um só, transparente e esticado por cima dos
// quadrados, que são puro desenho. Fazer isto com cinco campos obriga a
// reimplementar à mão o que o browser já faz bem (colar um código inteiro,
// apagar para trás, o cursor a saltar de casa) — e é precisamente aí que
// estas caixas costumam correr mal. Assim o teclado e a colagem são nativos,
// e os quadrados só espelham o valor.
export default function ChallengeCodeInput({
  value,
  onChange,
  onSubmit,
  length = 5,
  invalid = false,
  // Muda a cada erro NOVO (um instante serve). Sem isto, o mesmo erro duas
  // vezes seguidas não mudava nada em "invalid" e a segunda tentativa ficava
  // sem resposta nenhuma — parecia que o botão não tinha feito nada.
  shakeOn = 0,
  autoFocus = false,
  label,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const chars = Array.from({ length }, (_, i) => value[i] || "");
  // A casa "ativa" é a primeira vazia; com o código completo é a última, para
  // o realce não desaparecer quando já não há onde escrever.
  const activeIdx = Math.min(value.length, length - 1);

  return (
    <div>
      {label && <div style={styles.label}>{label}</div>}
      {/* "key" no instante do erro: trocar a chave remonta a fileira, e é
          isso que faz o CSS correr a animação outra vez. Sem isto, dois
          erros iguais seguidos só abanavam uma vez — a classe já estava
          aplicada e o browser não reinicia uma animação que não mudou. */}
      <div
        key={shakeOn}
        className={invalid ? "at-chal-code at-chal-shake" : "at-chal-code"}
        style={styles.wrap}
        onClick={() => inputRef.current?.focus()}
      >
        {chars.map((ch, i) => {
          const isActive = focused && i === activeIdx;
          return (
            <div
              key={i}
              className={ch ? "at-chal-slot at-chal-slot-filled" : "at-chal-slot"}
              style={{
                ...styles.slot,
                ...(ch ? styles.slotFilled : null),
                ...(isActive ? styles.slotActive : null),
                ...(invalid ? styles.slotInvalid : null),
              }}
            >
              {ch || (isActive ? <span style={styles.caret} /> : "")}
            </div>
          );
        })}

        <input
          ref={inputRef}
          value={value}
          onChange={(e) =>
            // Só letras e dígitos: um código colado de uma mensagem vem com
            // espaços ou pontuação à mistura, e isso enchia casas com lixo.
            onChange(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, length)
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit?.();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          style={styles.hiddenInput}
        />
      </div>
    </div>
  );
}

const styles = {
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: 6,
  },

  wrap: {
    position: "relative",
    display: "flex",
    gap: 6,
    cursor: "text",
  },

  slot: {
    flex: 1,
    minWidth: 0,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1.5px solid rgba(var(--border-rgb),0.5)",
    color: "var(--accent-text)",
    fontFamily: "Cinzel, serif",
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 1,
    transition: "border-color 0.15s ease, background-color 0.15s ease, transform 0.12s ease",
  },

  slotFilled: {
    borderColor: "rgba(var(--accent-rgb),0.6)",
    background: "rgba(var(--accent-rgb),0.12)",
  },

  slotActive: {
    borderColor: "rgba(var(--accent-rgb),0.9)",
    boxShadow: "0 0 0 3px rgba(var(--accent-rgb),0.16)",
  },

  slotInvalid: {
    borderColor: "rgba(226,85,95,0.7)",
    color: "#e2555f",
  },

  caret: {
    display: "inline-block",
    width: 2,
    height: 22,
    background: "var(--accent-text)",
    animation: "chalCaret 1s step-end infinite",
  },

  // O campo real: por cima dos quadrados, invisível, e a receber tudo (clique,
  // teclado, colagem). "color: transparent" além da opacidade porque alguns
  // temas do sistema desenham a seleção mesmo com opacidade 0.
  hiddenInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    color: "transparent",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "text",
  },

};
