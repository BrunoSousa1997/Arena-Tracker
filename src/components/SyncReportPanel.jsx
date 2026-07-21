import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { formatSyncReport } from "../lib/syncReport";

// Resultado da última sincronização, em números (ver lib/syncReport.js para o
// porquê de isto existir). A leitura é de cima para baixo e conta a história
// toda de uma passagem: que intervalo de datas foi pedido -> o que a Riot
// devolveu -> de onde vieram os detalhes -> o que ficou gravado. Uma
// sincronização que "não trouxe nada" deixa de ser um mistério: vê-se logo se
// a Riot não devolveu ids nenhuns, se devolveu mas já eram todos conhecidos,
// ou se trouxe candidatos que depois se perderam a caminho da base de dados.

function fmtDateTime(ms, lang) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(lang === "en" ? "en-US" : "pt-PT");
}

export default function SyncReportPanel({ report, account }) {
  const { t, lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!report) {
    return <div style={styles.empty}>{t("sync_report_empty")}</div>;
  }

  // O navigator.clipboard pode rejeitar (contexto sem permissão) — sem
  // apanhar isso, o clique não fazia nada E deixava uma rejeição por tratar.
  // A alternativa com textarea + execCommand é antiga mas funciona onde a
  // API moderna não está disponível, e é o suficiente para copiar texto.
  const copy = async () => {
    const text = formatSyncReport(report, account);
    let ok = false;

    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }

    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(false), 2000);
  };

  // "candidatos" é o número que mais vezes explica um sync silencioso: se a
  // Riot devolveu ids mas nenhum era novo, não havia nada para trazer — e
  // isso é uma resposta, não uma falha.
  const groups = [
    {
      title: t("sync_report_window"),
      rows: [
        [t("sync_report_mode"), report.mode === "full" ? t("sync_report_mode_full") : t("sync_report_mode_incremental")],
        [t("sync_report_latest"), fmtDateTime(report.latestMatchAt, lang)],
        [t("sync_report_since"), fmtDateTime(report.sinceUsed, lang)],
      ],
    },
    {
      title: t("sync_report_riot"),
      rows: [
        [t("sync_report_listed"), report.listed ?? "—"],
        [t("sync_report_known"), report.alreadyKnown ?? "—"],
        [t("sync_report_candidates"), report.candidates ?? "—", true],
      ],
    },
    {
      title: t("sync_report_sources"),
      rows: [
        [t("sync_report_cache"), report.fromCache ?? 0],
        [t("sync_report_api"), report.fromApi ?? 0],
        [
          t("sync_report_canary"),
          report.canaryRan ? report.fromCanary ?? 0 : t("sync_report_canary_skipped"),
        ],
      ],
    },
    {
      title: t("sync_report_result"),
      rows: [
        [t("sync_report_inserted"), report.inserted ?? 0, true],
        [t("sync_report_duration"), report.durationMs != null ? `${(report.durationMs / 1000).toFixed(1)}s` : "—"],
      ],
    },
  ];

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div style={styles.when}>
          {t("sync_report_when")}: {fmtDateTime(report.at, lang)}
        </div>
        <button onClick={copy} style={styles.copyBtn}>
          {copied === "ok" ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2.25} />}
          {copied === "ok"
            ? t("sync_report_copied")
            : copied === "fail"
            ? t("sync_report_copy_failed")
            : t("sync_report_copy")}
        </button>
      </div>

      {report.error && <div style={styles.error}>{report.error}</div>}

      {report.canaryUnknownQueueIds?.length > 0 && (
        <div style={styles.notice}>
          {t("sync_report_new_queues")}: {report.canaryUnknownQueueIds.join(", ")}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.title} style={styles.group}>
          <div style={styles.groupTitle}>{g.title}</div>
          {g.rows.map(([label, value, strong]) => (
            <div key={label} style={styles.row}>
              <span style={styles.label}>{label}</span>
              <span style={{ ...styles.value, ...(strong ? styles.valueStrong : null) }}>{value}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={styles.hint}>{t("sync_report_hint")}</div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 10 },

  empty: {
    padding: "18px 14px",
    textAlign: "center",
    fontSize: 12,
    color: "var(--text-muted)",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  when: { fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" },

  copyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 11px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.12)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  error: {
    padding: "9px 12px",
    borderRadius: "var(--radius-md)",
    background: "color-mix(in srgb, var(--place-low) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--place-low) 45%, transparent)",
    color: "var(--place-low)",
    fontSize: 11.5,
    fontWeight: 600,
    wordBreak: "break-word",
  },

  notice: {
    padding: "9px 12px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.12)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    color: "var(--accent-text)",
    fontSize: 11.5,
    fontWeight: 600,
  },

  group: {
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  groupTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 2,
  },

  row: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 },

  label: { fontSize: 11.5, color: "var(--text-secondary)" },

  // Tabular para os números alinharem à direita entre linhas, em vez de
  // dançarem conforme os dígitos.
  value: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    fontVariantNumeric: "tabular-nums",
  },

  valueStrong: { color: "var(--accent-text)" },

  hint: { fontSize: 10.5, lineHeight: 1.45, color: "var(--text-muted)" },
};
