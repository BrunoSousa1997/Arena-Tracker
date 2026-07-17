import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import WhatsNewModal from "./WhatsNewModal";

const isDev = import.meta.env.DEV;

export default function UpdateNotifier() {
  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    if (!window.electron?.onUpdaterStatus) return;

    const unsubscribe = window.electron.onUpdaterStatus((payload) => {
      setStatus(payload?.status || null);
      setData(payload?.data || null);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  // Atalho só em dev (Ctrl+Shift+U): simula um "update-downloaded" com notas
  // de exemplo, para dar para testar o banner/modal sem depender de uma
  // release real do GitHub nem da app empacotada no Electron.
  useEffect(() => {
    if (!isDev) return;

    const onKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "u") {
        setStatus("downloaded");
        setData({
          version: "9.9.9-dev",
          releaseNotes:
            "<ul><li>Exemplo de nota de patch</li><li>Outra novidade fictícia para testar o layout</li></ul>",
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!window.electron?.onUpdaterStatus && !isDev) return null;

  const visible = status === "available" || status === "downloading" || status === "downloaded";
  if (!visible) return null;

  const label =
    status === "available"
      ? `Nova versão encontrada${data?.version ? ` (${data.version})` : ""}. A descarregar...`
      : status === "downloading"
      ? `A descarregar atualização... ${Math.round(data?.percent || 0)}%`
      : `Atualização pronta${data?.version ? ` (${data.version})` : ""}. Reinicia para aplicar.`;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={styles.banner}
        >
          <span style={styles.text}>{label}</span>

          {status === "downloaded" && (
            <>
              <button onClick={() => setShowWhatsNew(true)} style={styles.linkBtn}>
                Ver novidades
              </button>
              <button
                onClick={() => window.electron?.installUpdate?.()}
                style={styles.btn}
              >
                Reiniciar agora
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {showWhatsNew && (
        <WhatsNewModal
          version={data?.version}
          notesHtml={data?.releaseNotes}
          onClose={() => setShowWhatsNew(false)}
        />
      )}
    </>
  );
}

const styles = {
  // A moldura e o texto de estado do banner são --info (ciano): isto está a
  // relatar o que a app anda a fazer, não a pedir um clique. Os botões abaixo
  // é que são ações, e esses ficam no acento — ver a regra no index.css.
  banner: {
    position: "fixed",
    top: 38,
    right: 14,
    zIndex: 99998,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: "var(--radius-lg)",
    background: "var(--surface-float)",
    border: "1px solid var(--info-border)",
    color: "var(--info)",
    fontFamily: "Cinzel, serif",
    fontSize: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
  },

  text: {
    whiteSpace: "nowrap",
  },

  btn: {
    padding: "5px 10px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  linkBtn: {
    padding: "5px 8px",
    border: "none",
    background: "transparent",
    color: "var(--accent-text)",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Cinzel, serif",
  },
};
