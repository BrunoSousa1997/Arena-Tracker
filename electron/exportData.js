const { app, ipcMain, dialog, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { getWindow } = require("./windowState");

// ================= EXPORTAR OS DADOS =================
// Guardar o histórico da conta ativa num ficheiro à escolha do utilizador.
//
// Porquê isto existir: parte do que a app guarda NÃO se recupera. A
// sincronização vai buscar à Riot o que a match-v5 devolve, mas as sequências
// sem morrer, o "HP máximo" e o histórico de desafios são medidos ao vivo
// durante a partida (ver electron/liveGame.js) e não existem em mais lado
// nenhum. Se a linha desaparecer da base de dados, desaparece de vez.
//
// A escrita acontece no processo principal, e não no renderer, por duas
// razões: o <a download> do Chromium dentro do Electron guarda em silêncio
// para a pasta de transferências (o utilizador não escolhe onde nem sabe onde
// ficou), e é aqui que existe o dialog nativo de "guardar como", que é o que
// se espera de uma app de desktop.

// Nome sugerido com a data no formato ISO curto (2026-08-29) — ordena
// alfabeticamente por ordem cronológica, que é o que interessa a quem
// acumula várias cópias na mesma pasta.
function defaultFileName(label) {
  const today = new Date();
  const stamp = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  // O nome da conta entra no ficheiro (quem tem várias contas exporta várias
  // vezes), mas passa por um filtro: um Riot ID pode ter espaços e caracteres
  // que o Windows recusa num nome de ficheiro, e nesse caso o dialog abria
  // com um nome inválido que o utilizador tinha de corrigir à mão.
  const safeLabel = String(label || "conta")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .trim()
    .slice(0, 40) || "conta";

  return `arena-tracker-${safeLabel}-${stamp}.json`;
}

function registerExportHandlers() {
  ipcMain.handle("export:save", async (_event, { label, payload } = {}) => {
    const win = getWindow();

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Exportar dados do Arena Tracker",
      defaultPath: path.join(
        app.getPath("documents"),
        defaultFileName(label)
      ),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    // Cancelar não é um erro — o renderer distingue os dois para não mostrar
    // "exportado!" a quem carregou em cancelar, nem um erro a quem só mudou
    // de ideias.
    if (canceled || !filePath) return { saved: false, canceled: true };

    try {
      // Indentado a 2 espaços de propósito: o ficheiro serve tanto para
      // reimportar como para alguém abrir e ler/levar para uma folha de
      // cálculo, e o ganho em tamanho de o minificar não compensa deixá-lo
      // ilegível.
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
      return { saved: true, filePath };
    } catch (err) {
      console.error("[export] falhou a escrita:", err);
      return { saved: false, error: err.message };
    }
  });

  // Abrir a pasta com o ficheiro selecionado, a seguir a exportar — poupa a
  // quem exportou ter de se lembrar do caminho que escolheu.
  ipcMain.handle("export:reveal", (_event, filePath) => {
    if (filePath) shell.showItemInFolder(filePath);
  });
}

module.exports = { registerExportHandlers };
