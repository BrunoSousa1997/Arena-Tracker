import { Component } from "react";
import { translate } from "../lib/i18n";

// Rede de segurança para um erro de render em qualquer vista. Sem isto, uma
// exceção durante o render desmonta a árvore toda e deixa a janela EM BRANCO
// — e numa app empacotada não há DevTools para ver o que aconteceu, nem
// consola nenhuma à vista: do lado de quem usa, a app "morreu" sem dizer
// nada. Por isso o que importa aqui não é só não ficar em branco, é mostrar
// a mensagem do erro de forma copiável, que é a única pista que chega a
// existir para diagnosticar um relatório de um amigo.
//
// Classe (e não um componente de função) porque componentDidCatch/
// getDerivedStateFromError só existem na API de classes — o React não tem
// hook equivalente. Por isso também não pode usar o useLanguage: o idioma
// vem do localStorage pelo translate() direto, a mesma chave que o
// LanguageProvider grava (ver i18n.js).
//
// NOTA sobre o alcance: isto apanha erros de RENDER (e dos efeitos/ciclo de
// vida), não erros dentro de handlers de eventos — um throw num onClick não
// desmonta nada e por isso nunca chega aqui.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Em desenvolvimento isto é o que aparece no terminal do Vite; em
    // produção fica no log do Chromium. Barato, e é o registo que existe.
    console.error("[ErrorBoundary] erro não tratado no render:", error, info);
    this.setState({ info });
  }

  // Texto único com tudo o que serve para diagnosticar — mensagem, stack do
  // erro e a árvore de componentes onde estourou. É isto que o botão copia,
  // para poder ser colado num relatório tal e qual.
  details() {
    const { error, info } = this.state;
    const head = `${error?.name || "Error"}: ${error?.message || String(error)}`;
    const stack = error?.stack || "";

    // O stack do V8 já começa pela linha "Error: mensagem", por isso
    // juntá-la à cabeça mostrava a mesma frase duas vezes seguidas.
    const body = stack.startsWith(head) ? stack : [head, stack].filter(Boolean).join("\n");

    return [body, info?.componentStack ? `\nComponentes:${info.componentStack}` : ""]
      .filter(Boolean)
      .join("\n");
  }

  copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(this.details());
      this.setState({ copied: true });
    } catch {
      // Sem clipboard (permissão negada, contexto inseguro) não há nada a
      // fazer nem a avisar — o texto continua visível e selecionável à mão,
      // que é o que o botão era para poupar.
    }
  };

  render() {
    const { error, copied } = this.state;
    if (!error) return this.props.children;

    const t = (key) => translate(localStorage.getItem("language") || "pt", key);

    return (
      <div style={styles.wrap}>
        <div style={styles.panel}>
          <h1 style={styles.title}>{t("error_title")}</h1>
          <p style={styles.message}>{t("error_message")}</p>
          <p style={styles.reassure}>{t("error_data_safe")}</p>

          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={() => window.location.reload()}>
              {t("error_reload")}
            </button>
            <button style={styles.ghostBtn} onClick={this.copyDetails}>
              {copied ? t("error_copied") : t("error_copy")}
            </button>
          </div>

          {/* Fechado por defeito: a mensagem acima é para quem só quer a app
              de volta, e o stack só interessa a quem o vai reportar. */}
          <details style={styles.details}>
            <summary style={styles.summary}>{t("error_details")}</summary>
            <pre style={styles.pre}>{this.details()}</pre>
          </details>
        </div>
      </div>
    );
  }
}

const styles = {
  // Sem position:fixed nem inset:0 de propósito — este ecrã vive DENTRO do
  // espaço do App, por baixo do TitleBar, que fica de pé. Numa janela sem
  // moldura do sistema (frame: false, ver electron/window.js) o TitleBar é a
  // única forma de minimizar, mover ou FECHAR a app: tapá-lo com o erro
  // prendia a janela aberta sem saída, que é pior do que o próprio erro.
  wrap: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  panel: {
    width: "100%",
    maxWidth: 560,
    padding: 26,
    borderRadius: "var(--radius-2xl)",
    background: "var(--surface-float)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "Cinzel, serif",
  },

  title: {
    margin: 0,
    fontSize: 20,
    color: "var(--accent-text)",
  },

  message: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color: "var(--text-body)",
  },

  reassure: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.6,
    color: "var(--text-secondary)",
  },

  actions: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },

  primaryBtn: {
    padding: "9px 16px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  ghostBtn: {
    padding: "9px 16px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Cinzel, serif",
  },

  details: {
    marginTop: 4,
  },

  summary: {
    cursor: "pointer",
    fontSize: 12,
    color: "var(--text-muted)",
  },

  pre: {
    marginTop: 10,
    marginBottom: 0,
    padding: 12,
    maxHeight: 220,
    overflow: "auto",
    borderRadius: "var(--radius-md)",
    background: "var(--code-bg)",
    border: "1px solid rgba(var(--soft-rgb),0.08)",
    color: "var(--text-secondary)",
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    // O texto é a única pista de diagnóstico que existe numa app
    // empacotada; garantir que se seleciona à mão se o clipboard falhar.
    userSelect: "text",
  },
};
