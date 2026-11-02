// Verificação das áreas que tocam no comportamento de janelas do Windows.
//
// Existe para as atualizações de Electron. O lint, os testes e o build não
// dizem nada sobre o que mais provavelmente parte num salto de majors: a
// janela sem moldura, o ecrã inteiro, a sobreposição transparente e a
// bandeja. Isso só se sabe pondo o Electron a criar essas janelas de verdade
// e a confirmar o que ele devolve.
//
// Correr com:  npm run verify:platform
//
// O QUE ISTO NÃO FAZ: não olha para pixéis. Confirma que as APIs aceitam as
// opções e reportam o estado certo — não que a sobreposição compõe mesmo
// transparente por cima de um jogo, nem que o ícone da bandeja se vê bem.
// Essa parte continua a precisar de olhos.
//
// Não importa os módulos de electron/ de propósito: todos fazem "new Store()"
// ao nível do módulo, e esta verificação não deve mexer nas definições reais
// de quem a corre. Replica as MESMAS opções, copiadas de electron/window.js e
// electron/overlay.js — se um dia essas opções mudarem lá, mudem também aqui.
//
// Pela mesma razão só LÊ o arranque automático: escrevê-lo mexia no registo
// do Windows de quem corre o script.

const { app, BrowserWindow, Tray, Menu, screen, globalShortcut, nativeImage } = require("electron");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const resultados = [];

function ok(area, detalhe) {
  resultados.push({ area, estado: "OK", detalhe });
}
function falha(area, detalhe) {
  resultados.push({ area, estado: "FALHA", detalhe });
}

// Cópia de applyFullScreen em electron/window.js — ver lá a explicação do
// toque de alwaysOnTop, que é o que levanta a janela acima da barra de
// tarefas numa janela sem moldura.
function applyFullScreen(win, value) {
  if (!win || win.isDestroyed()) return;
  win.setFullScreen(!!value);
  if (value && process.platform === "win32") {
    win.setAlwaysOnTop(true, "screen-saver");
    win.setAlwaysOnTop(false);
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Mostra uma janela e espera que ela esteja pronta, com um tecto de tempo
// para o script não ficar preso se o render falhar.
function esperarPronta(win, ficheiro, limiteMs) {
  return new Promise((resolve) => {
    win.once("ready-to-show", resolve);
    win.loadFile(ficheiro);
    setTimeout(resolve, limiteMs);
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  const indexHtml = path.join(RAIZ, "dist", "index.html");
  const preload = path.join(RAIZ, "preload.js");

  // ================= JANELA SEM MOLDURA + ECRÃ INTEIRO =================
  let win = null;
  try {
    win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      frame: false,
      show: false,
      backgroundColor: "#0b0f1a",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload,
        backgroundThrottling: false,
      },
    });
    ok("janela sem moldura", "criada; frame:false aceite");
  } catch (e) {
    falha("janela sem moldura", e.message);
  }

  if (win) {
    try {
      await esperarPronta(win, indexHtml, 8000);
      win.show();
      ok("render + preload", "dist/index.html carregou e a janela mostrou-se");
    } catch (e) {
      falha("render + preload", e.message);
    }

    // O modo de falha que o comentário em window.js descreve: numa janela sem
    // moldura, o setFullScreen sozinho estica a janela mas deixa a barra de
    // tarefas por cima — o "window mode esticado". Mede-se comparando os
    // limites da janela com os do ECRÃ INTEIRO (display.bounds), e não com a
    // área útil (workArea, que já exclui a barra).
    try {
      const display = screen.getDisplayMatching(win.getBounds());
      applyFullScreen(win, true);
      await espera(1200);

      const b = win.getBounds();
      const d = display.bounds;
      const cobreEcraTodo = b.width >= d.width && b.height >= d.height;

      if (win.isFullScreen() && cobreEcraTodo) {
        ok("ecrã inteiro", `isFullScreen=true e a janela cobre ${b.width}x${b.height} = ecrã ${d.width}x${d.height}`);
      } else if (win.isFullScreen()) {
        falha(
          "ecrã inteiro",
          `isFullScreen=true MAS a janela é ${b.width}x${b.height} contra ecrã ${d.width}x${d.height} — ` +
            "é o sintoma do 'window mode esticado' que o truque do alwaysOnTop existe para evitar"
        );
      } else {
        falha("ecrã inteiro", "isFullScreen devolveu false depois de setFullScreen(true)");
      }

      applyFullScreen(win, false);
      await espera(600);
      if (!win.isFullScreen()) ok("sair de ecrã inteiro", "voltou a janela");
      else falha("sair de ecrã inteiro", "ficou preso em ecrã inteiro");
    } catch (e) {
      falha("ecrã inteiro", e.message);
    }

    // É o que substitui o globalShortcut no F11/Escape (ver window.js).
    try {
      win.webContents.on("before-input-event", () => {});
      ok("before-input-event", "listener aceite no webContents");
    } catch (e) {
      falha("before-input-event", e.message);
    }
  }

  // ================= SOBREPOSIÇÃO TRANSPARENTE =================
  try {
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const ov = new BrowserWindow({
      width: 360,
      height: 112,
      x: Math.round((sw - 360) / 2),
      y: Math.round(sh * 0.045),
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      focusable: false,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload,
        backgroundThrottling: false,
      },
    });
    ok("sobreposição: janela", "transparent + frameless + focusable:false aceites");

    ov.setAlwaysOnTop(true, "screen-saver");
    ok("sobreposição: alwaysOnTop", `nível 'screen-saver' aceite; isAlwaysOnTop=${ov.isAlwaysOnTop()}`);

    ov.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    ok("sobreposição: visibleOnFullScreen", "aceite");

    ov.setIgnoreMouseEvents(true, { forward: true });
    ok("sobreposição: click-through", "setIgnoreMouseEvents(true, { forward: true }) aceite");

    await esperarPronta(ov, indexHtml, 6000);
    ov.showInactive();
    await espera(500);
    ok("sobreposição: showInactive", `visível=${ov.isVisible()} sem roubar foco (focado=${ov.isFocused()})`);

    ov.destroy();
  } catch (e) {
    falha("sobreposição", e.message);
  }

  // ================= BANDEJA =================
  let tray = null;
  try {
    const icone = nativeImage.createFromPath(path.join(RAIZ, "public", "logo.ico"));
    if (icone.isEmpty()) {
      falha("bandeja: ícone", "nativeImage.createFromPath devolveu imagem vazia");
    } else {
      const t = icone.getSize();
      ok("bandeja: ícone", `logo.ico carregado (${t.width}x${t.height})`);
    }

    tray = new Tray(icone);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open Arena Tracker", click: () => {} },
        { type: "separator" },
        { label: "Quit", click: () => {} },
      ])
    );
    tray.setToolTip("Arena Tracker");
    tray.on("click", () => {});
    ok("bandeja", "Tray criada, menu de contexto e tooltip aplicados");
  } catch (e) {
    falha("bandeja", e.message);
  }

  // ================= ARRANQUE AUTOMÁTICO (SÓ LEITURA) =================
  try {
    const s = app.getLoginItemSettings({ args: ["--hidden"] });
    ok(
      "arranque automático (leitura)",
      `openAtLogin=${s.openAtLogin}, wasOpenedAtLogin=${s.wasOpenedAtLogin} | campos: ${Object.keys(s).join(", ")}`
    );

    // O Electron 44 removeu "openAsHidden". Era só macOS, e no Windows quem
    // faz o trabalho é o argumento --hidden (ver startedHidden em
    // electron/background.js) — mas se um dia voltar, convém saber.
    if ("openAsHidden" in s) {
      falha("openAsHidden", "presente outra vez — background.js assume que não existe");
    } else {
      ok("openAsHidden ausente", "como esperado desde o Electron 44");
    }
  } catch (e) {
    falha("arranque automático (leitura)", e.message);
  }

  // ================= ATALHO GLOBAL =================
  // F24 porque não existe em teclados reais: regista e liberta sem roubar
  // uma combinação que alguém possa estar a usar.
  try {
    const r = globalShortcut.register("Control+Shift+F24", () => {});
    ok("atalho global", `register devolveu ${r}; isRegistered=${globalShortcut.isRegistered("Control+Shift+F24")}`);
    globalShortcut.unregisterAll();
  } catch (e) {
    falha("atalho global", e.message);
  }

  // ================= RELATÓRIO =================
  const falhas = resultados.filter((r) => r.estado === "FALHA").length;

  console.log("\n==================== RESULTADO ====================");
  console.log(
    `Electron ${process.versions.electron} | Chromium ${process.versions.chrome} | Node ${process.versions.node}`
  );
  console.log("---------------------------------------------------");
  for (const r of resultados) {
    console.log(`[${r.estado.padEnd(5)}] ${r.area}\n          ${r.detalhe}`);
  }
  console.log("---------------------------------------------------");
  console.log(`${resultados.length - falhas} OK, ${falhas} falha(s)`);
  console.log("===================================================\n");

  if (tray) tray.destroy();

  // Código de saída diferente de zero em caso de falha, para isto poder um
  // dia entrar num workflow (precisaria de ecrã, por isso hoje é local).
  app.exit(falhas > 0 ? 1 : 0);
});
