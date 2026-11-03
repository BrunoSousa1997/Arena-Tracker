import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import Tooltip from "./Tooltip";
import { championMatchesTerm, parseSearchTerms, SEARCH_SEPARATORS } from "../lib/champions";
import { useLanguage } from "../lib/i18n";
import { canShowIcons, championIcon } from "../lib/icons";

// ================= CONSULTA RÁPIDA =================
// O ecrã que responde a "destes campeões, em quais é que ainda me falta
// vitória?" — a pergunta do champion select, onde aparecem vários campeões ao
// mesmo tempo e há segundos para decidir. Abre-se com Ctrl+Shift+A mesmo com o
// League à frente (ver window.js).
//
// O campo é de FICHAS, não de texto corrido: cada campeão que se confirma
// (Enter, ou clique na sugestão) fica uma ficha com o estado à vista, e o que
// se está a escrever agora vive à parte, em sugestões. A versão anterior era
// uma caixa de texto onde se separavam os nomes por vírgulas à mão — funcionava,
// mas obrigava a saber da convenção das vírgulas, a escrever o nome todo e a
// ler o estado numa lista de cartões grandes. Aqui escrevem-se três letras,
// carrega-se Enter, e repete-se.
//
// A pesquisa continua a ser UMA string (a mesma que filtra a grelha da Coleção
// por baixo) — as fichas são só a leitura dessa string, não um estado paralelo.
// Isso mantém o Ctrl+Shift+A, a escrita manual com vírgulas e a grelha a
// funcionar exatamente como antes, sem dois sítios a guardar a mesma coisa.

const MAX_SUGGESTIONS = 6;

// Sugestões: primeiro os campeões cujo nome COMEÇA pelo que se escreveu
// ("ann" → Annie antes de Shyvana), depois alfabeticamente. Sem isto, escrever
// as primeiras letras do nome punha à frente qualquer campeão que tivesse
// essas letras no meio, que é precisamente o que não se procura.
function byRelevance(term) {
  return (a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(term);
    const bStarts = b.name.toLowerCase().startsWith(term);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.name.localeCompare(b.name);
  };
}

export default function QuickCheck({ search, setSearch, champions, owned, dragon, inputRef }) {
  const { t } = useLanguage();
  // Qual das sugestões o Enter confirma. Volta a 0 a cada tecla (ver
  // onChange) para o Enter ser sempre previsível: confirma a primeira, que é
  // a que está destacada, a não ser que se tenha descido com as setas.
  const [highlight, setHighlight] = useState(0);

  // O termo a ser escrito NESTE momento: o que vem depois do último separador.
  // É o que gera sugestões; os anteriores já são fichas.
  const activeTerm = useMemo(() => {
    const parts = search.split(SEARCH_SEPARATORS);
    return parts[parts.length - 1].trim().toLowerCase();
  }, [search]);

  // Os campeões que a pesquisa já contém, lidos do valor AO VIVO e não do
  // debounce de 300ms que alimenta a grelha da Coleção: é a partir desta
  // lista que o Enter reescreve a pesquisa, e com o valor atrasado escrever
  // depressa (três letras, Enter, três letras, Enter) reescrevia por cima de
  // uma lista desatualizada e perdia os campeões anteriores.
  const terms = useMemo(() => parseSearchTerms(search), [search]);

  // Os termos já fechados — todos menos o que está a ser escrito. Um termo só
  // deixa de ser "o que está a ser escrito" quando lhe segue um separador, que
  // é o que o Enter e o clique na sugestão acrescentam.
  const lockedTerms = useMemo(
    () => (activeTerm ? terms.slice(0, -1) : terms),
    [terms, activeTerm]
  );

  // Uma ficha por campeão, pela ordem em que os termos foram escritos (e
  // alfabética dentro do mesmo termo) — lê-se na ordem em que eles estão no
  // ecrã do jogo, não alfabética no conjunto. Guarda-se o termo que deu
  // origem a cada ficha para o × saber o que tirar da pesquisa.
  const chips = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const term of lockedTerms) {
      champions
        .filter((c) => championMatchesTerm(c, term))
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((champ) => {
          if (seen.has(champ.id)) return;
          seen.add(champ.id);
          out.push({ term, champ, hasWin: owned.has(champ.id) });
        });
    }
    return out;
  }, [lockedTerms, champions, owned]);

  // Termos fechados que não encontraram campeão nenhum. Vão à vista de
  // propósito: um nome mal escrito desaparecia em silêncio e o resumo lia-se
  // como "já tens vitória em todos", que é o erro mais caro que isto pode
  // cometer.
  const unmatched = useMemo(
    () => lockedTerms.filter((term) => !champions.some((c) => championMatchesTerm(c, term))),
    [lockedTerms, champions]
  );

  const suggestions = useMemo(() => {
    if (!activeTerm) return [];
    const taken = new Set(chips.map((chip) => chip.champ.id));
    return champions
      .filter((c) => !taken.has(c.id) && championMatchesTerm(c, activeTerm))
      .sort(byRelevance(activeTerm))
      .slice(0, MAX_SUGGESTIONS);
  }, [activeTerm, chips, champions]);

  const missing = chips.filter((chip) => !chip.hasWin);

  // Fechar um campeão = reescrever a pesquisa com ele já por extenso e um
  // separador à frente, pronto para o seguinte. O nome vai completo (não as
  // três letras escritas) para a ficha não ficar a depender de uma abreviatura
  // ambígua — "vi" apanha Vi, Viktor e Viego, "Vi" por extenso só apanha Vi.
  function addChampion(champ) {
    const next = [...lockedTerms.filter((term) => term.toLowerCase() !== champ.name.toLowerCase()), champ.name];
    setSearch(`${next.join(", ")}, `);
    setHighlight(0);
    inputRef?.current?.focus();
  }

  function removeTerm(term) {
    const next = terms.filter((other) => other !== term);
    setSearch(next.length ? `${next.join(", ")}, ` : "");
    inputRef?.current?.focus();
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && suggestions.length) {
      event.preventDefault();
      addChampion(suggestions[Math.min(highlight, suggestions.length - 1)]);
      return;
    }
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    // Backspace com o campo de escrita vazio tira a última ficha — o gesto
    // normal de qualquer campo de fichas, e a forma mais rápida de desfazer
    // um Enter dado a mais.
    if (event.key === "Backspace" && !activeTerm && lockedTerms.length) {
      event.preventDefault();
      removeTerm(lockedTerms[lockedTerms.length - 1]);
      return;
    }
    if (event.key === "Escape" && search) {
      event.preventDefault();
      setSearch("");
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.searchRow}>
        <span style={styles.searchIcon}>
          <Search size={14} strokeWidth={2.25} />
        </span>
        <input
          ref={inputRef}
          placeholder={t("search_placeholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          style={styles.input}
        />
        {search && (
          <Tooltip label={t("quick_check_clear")}>
            <button type="button" onClick={() => setSearch("")} style={styles.clearBtn}>
              <X size={13} strokeWidth={2.5} />
            </button>
          </Tooltip>
        )}
        <Tooltip label={t("shortcut_tooltip")}>
          <span style={styles.shortcutHint}>Ctrl+Shift+A</span>
        </Tooltip>
      </div>

      {/* As sugestões já trazem o estado (vitória ou não) — a resposta aparece
          mal se escrevem as primeiras letras, antes mesmo de confirmar. O Enter
          só serve para a guardar e passar ao campeão seguinte. */}
      {suggestions.length > 0 && (
        <div style={styles.suggestRow}>
          {suggestions.map((champ, index) => (
            <button
              key={champ.id}
              type="button"
              onMouseEnter={() => setHighlight(index)}
              onClick={() => addChampion(champ)}
              style={{
                ...styles.suggest,
                ...(index === Math.min(highlight, suggestions.length - 1)
                  ? styles.suggestActive
                  : null),
              }}
            >
              {canShowIcons(dragon) && (
                <img src={championIcon(champ.id, dragon)} alt="" style={styles.suggestIcon} />
              )}
              <span>{champ.name}</span>
              <span
                style={{
                  ...styles.suggestState,
                  color: owned.has(champ.id) ? "var(--place-good)" : "var(--accent-text)",
                }}
              >
                {owned.has(champ.id) ? t("quick_check_short_won") : t("quick_check_short_missing")}
              </span>
            </button>
          ))}
          <span style={styles.enterHint}>↵</span>
        </div>
      )}

      {chips.length > 0 && (
        <div style={styles.chipRow}>
          {chips.map(({ term, champ, hasWin }) => (
            <div
              key={champ.id}
              style={{ ...styles.chip, ...(hasWin ? styles.chipWon : styles.chipMissing) }}
            >
              {canShowIcons(dragon) && (
                <img src={championIcon(champ.id, dragon)} alt="" style={styles.chipIcon} />
              )}
              <div style={styles.chipInfo}>
                <div style={styles.chipName}>{champ.name}</div>
                <div
                  style={{
                    ...styles.chipState,
                    color: hasWin ? "var(--place-good)" : "var(--accent-text)",
                  }}
                >
                  {hasWin ? t("already_have_win") : t("no_win_yet")}
                </div>
              </div>
              <Tooltip label={t("quick_check_remove")}>
                <button type="button" onClick={() => removeTerm(term)} style={styles.chipRemove}>
                  <X size={12} strokeWidth={2.5} />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {/* O veredicto só faz sentido a partir de dois campeões: com um só, a
          própria ficha já o diz, e repeti-lo era ruído. */}
      {chips.length > 1 && (
        <div style={styles.verdict}>
          {missing.length > 0 ? (
            <>
              <span style={styles.verdictCount}>
                {missing.length} / {chips.length}
              </span>
              <span style={{ color: "var(--accent-text)" }}>
                {t("quick_check_missing")} {missing.map(({ champ }) => champ.name).join(", ")}
              </span>
            </>
          ) : (
            <span style={{ color: "var(--place-good)" }}>{t("quick_check_all_done")}</span>
          )}
        </div>
      )}

      {unmatched.length > 0 && (
        <div style={styles.unmatched}>
          {t("quick_check_unmatched")} {unmatched.join(", ")}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    marginTop: 12,
    marginBottom: 16,
  },

  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
  },

  input: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-body)",
  },

  searchIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: "var(--text-muted)",
  },

  clearBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    background: "rgba(var(--border-rgb),0.35)",
    color: "var(--text-muted)",
  },

  shortcutHint: {
    fontSize: 10,
    color: "var(--text-muted)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    borderRadius: "var(--radius-sm)",
    padding: "2px 6px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  suggestRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },

  suggest: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px 4px 4px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-body)",
    background: "rgba(var(--panel-deep-rgb),0.6)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  suggestActive: {
    background: "rgba(var(--accent-rgb),0.18)",
    border: "1px solid rgba(var(--accent-rgb),0.55)",
  },

  suggestIcon: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    pointerEvents: "none",
  },

  suggestState: {
    fontSize: 11,
    fontWeight: 700,
  },

  enterHint: {
    fontSize: 11,
    color: "var(--text-muted)",
  },

  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  chip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px 6px 6px",
    borderRadius: 12,
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
  },

  chipWon: {
    border: "1px solid color-mix(in srgb, var(--place-good) 45%, transparent)",
  },

  chipMissing: {
    border: "1px solid rgba(var(--accent-rgb),0.45)",
  },

  chipIcon: {
    width: 34,
    height: 34,
    borderRadius: "var(--radius-md)",
    pointerEvents: "none",
  },

  chipInfo: {
    minWidth: 96,
  },

  chipName: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  chipState: {
    fontSize: 11,
    fontWeight: 600,
  },

  chipRemove: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: "var(--text-muted)",
  },

  verdict: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    fontSize: 13,
    fontWeight: 700,
  },

  verdictCount: {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    color: "var(--accent-text)",
    background: "rgba(var(--accent-rgb),0.15)",
    border: "1px solid rgba(var(--accent-rgb),0.4)",
  },

  unmatched: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
  },
};
