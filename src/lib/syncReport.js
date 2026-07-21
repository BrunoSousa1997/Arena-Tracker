// Relatório da última sincronização, por conta.
//
// Porque existe: uma sincronização que não traz nada é indistinguível, do
// lado de fora, de uma que não tinha nada para trazer — as duas acabam com
// "já está atualizado". Quando o histórico parece estar a faltar partidas,
// isso não chega para se perceber ONDE se perdeu: a Riot não devolveu os ids?
// Devolveu mas já os conhecíamos? Devolveu novos mas os detalhes falharam? O
// filtro de data cortou-os? Sem estes números a única forma de responder é ir
// ao código e à base de dados — que não é coisa que se peça a quem só está a
// usar a app.
//
// Guardado em localStorage (não na Supabase): descreve o que ESTE computador
// fez, e é para se poder ler já depois de reiniciar a app.
const PREFIX = "sync-report:";

export function loadSyncReport(account) {
  if (!account) return null;
  try {
    const raw = localStorage.getItem(PREFIX + account);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSyncReport(account, report) {
  if (!account) return;
  try {
    localStorage.setItem(PREFIX + account, JSON.stringify(report));
  } catch {
    // Sem espaço em localStorage não vale a pena rebentar uma sincronização
    // que, quanto ao resto, correu bem — o relatório é diagnóstico, não dados.
  }
}

function fmtInstant(ms) {
  if (!ms) return "—";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";
}

// Versão em texto simples, para o botão "copiar" — é isto que se cola numa
// conversa a pedir ajuda, em vez de se descrever de memória o que a app disse.
export function formatSyncReport(report, account) {
  if (!report) return "";

  const lines = [
    `Arena Tracker — relatório de sincronização`,
    `conta:            ${account || "—"}`,
    `quando:           ${fmtInstant(report.at)}`,
    `duração:          ${report.durationMs != null ? `${(report.durationMs / 1000).toFixed(1)}s` : "—"}`,
    `modo:             ${report.mode === "full" ? "histórico completo" : "incremental"}`,
    ``,
    `-- filtro de data --`,
    `partida + recente: ${fmtInstant(report.latestMatchAt)}`,
    `startTime enviado: ${fmtInstant(report.sinceUsed)}`,
    ``,
    `-- o que a Riot devolveu --`,
    `queues pedidas:    ${(report.queueIds || []).join(", ") || "—"}`,
    `ids listados:      ${report.listed ?? "—"}`,
    `já conhecidos:     ${report.alreadyKnown ?? "—"}`,
    `candidatos novos:  ${report.candidates ?? "—"}`,
    ``,
    `-- de onde vieram os detalhes --`,
    `cache partilhada:  ${report.fromCache ?? 0}`,
    `Riot API:          ${report.fromApi ?? 0}`,
    `canário:           ${report.fromCanary ?? 0}${report.canaryRan ? "" : " (não correu)"}`,
    report.canaryUnknownQueueIds?.length
      ? `queueIds novos:    ${report.canaryUnknownQueueIds.join(", ")}`
      : null,
    ``,
    `-- resultado --`,
    `gravadas:          ${report.inserted ?? 0}`,
    report.error ? `ERRO:             ${report.error}` : null,
  ];

  return lines.filter((l) => l !== null).join("\n");
}
