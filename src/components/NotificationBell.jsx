import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import AchievementIcon from "./AchievementIcon";

const PANEL_WIDTH = 300;
const VIEWPORT_MARGIN = 10;

// Há quanto tempo, em texto curto ("agora", "5m", "3h", "2d") — o painel é
// estreito e uma data completa por item roubava a largura toda ao que
// interessa (o título da conquista).
function shortAgo(timestamp, lang) {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return lang === "en" ? "now" : "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotificationBell({ notifications, unreadCount, markAllRead, clearAll }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  // Posição em pixels do painel no ecrã — ver o portal mais abaixo.
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);

  // Ancora o painel à campainha, sem nunca sair da janela. Alinhado à
  // direita (o cluster de ícones vive no canto superior direito), mas com
  // limites: numa janela estreita, alinhar cegamente punha-o fora do ecrã.
  const place = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.min(
      Math.max(rect.right - PANEL_WIDTH, VIEWPORT_MARGIN),
      window.innerWidth - VIEWPORT_MARGIN - PANEL_WIDTH
    );
    setCoords({ top: rect.bottom + 8, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Fecha ao clicar fora — sem isto o painel ficava aberto por cima do resto
  // da app até se voltar a carregar na campainha. O painel vive num portal
  // (fora de "wrapRef"), por isso tem de ser verificado à parte: sem isto,
  // clicar DENTRO do painel contava como "fora" e fechava-o logo.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    // Redimensionar a janela move a campainha; reposicionar é mais barato do
    // que fechar o painel na cara de quem só ajustou o tamanho.
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const toggle = () => {
    // Abrir já conta como ler: o painel mostra tudo de uma vez, por isso
    // manter o contador aceso depois de o ver seria só ruído.
    setOpen((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  };

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <button onClick={toggle} style={styles.btn} title={t("notif_title")}>
        <Bell size={14} strokeWidth={2.25} />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Portal para o body: o cluster de ícones do cabeçalho tem
          "overflow: hidden" (para arredondar os cantos dos botões), o que
          RECORTAVA este painel a zero — abria, mas não se via nada. O corte
          por overflow acontece antes do z-index sequer entrar em jogo, por
          isso não havia z-index que resolvesse. É o mesmo motivo (e a mesma
          solução) do balão do Tooltip.jsx. */}
      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              style={{ ...styles.panel, top: coords.top, left: coords.left }}
            >
              <div style={styles.panelHeader}>
                <span style={styles.panelTitle}>{t("notif_title")}</span>
                {notifications.length > 0 && (
                  <button onClick={clearAll} style={styles.clearBtn}>
                    {t("notif_clear")}
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={styles.empty}>{t("notif_empty")}</div>
              ) : (
                <div style={styles.list} className="scrollArea">
                  {notifications.map((n) => (
                    <div key={n.id} style={styles.item}>
                      <span style={styles.itemIcon}>
                        <AchievementIcon iconId={n.iconId} color={n.color} size={20} />
                      </span>
                      <div style={styles.itemText}>
                        <div style={styles.itemTitle}>{n.title}</div>
                        <div style={{ ...styles.itemBody, color: n.color }}>{n.body}</div>
                      </div>
                      <span style={styles.itemAgo}>{shortAgo(n.at, lang)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

const styles = {
  // "relative" para o painel (absolute) se ancorar à campainha.
  wrap: {
    position: "relative",
    display: "flex",
  },

  btn: {
    position: "relative",
    padding: "6px 11px",
    display: "flex",
    alignItems: "center",
    border: "none",
    background: "transparent",
    color: "var(--accent-text)",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },

  badge: {
    position: "absolute",
    top: 2,
    right: 3,
    minWidth: 13,
    height: 13,
    padding: "0 3px",
    borderRadius: 7,
    background: "var(--place-low)",
    color: "#fff",
    fontSize: 8.5,
    fontWeight: 800,
    lineHeight: "13px",
    textAlign: "center",
  },

  // "fixed" e não "absolute": o painel vive num portal no <body>, por isso
  // as coordenadas são as do ecrã (ver "place"), não as de um antepassado.
  panel: {
    position: "fixed",
    zIndex: 99997,
    width: PANEL_WIDTH,
    borderRadius: "var(--radius-lg)",
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.99), rgba(var(--panel-deep-rgb),0.99))",
    border: "1px solid rgba(var(--border-rgb),0.6)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    overflow: "hidden",
  },

  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 12px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.45)",
  },

  panelTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "var(--accent-text)",
  },

  clearBtn: {
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 10.5,
  },

  empty: {
    padding: "18px 12px",
    textAlign: "center",
    fontSize: 11.5,
    color: "var(--text-muted)",
  },

  list: {
    maxHeight: 320,
    overflowY: "auto",
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "9px 12px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.25)",
  },

  itemIcon: {
    display: "inline-flex",
    flexShrink: 0,
  },

  itemText: {
    flex: 1,
    minWidth: 0,
  },

  itemTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  itemBody: {
    fontSize: 10.5,
    fontWeight: 600,
    marginTop: 1,
  },

  itemAgo: {
    fontSize: 9.5,
    color: "var(--text-muted)",
    flexShrink: 0,
  },
};
