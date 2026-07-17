// As notas de cada release no GitHub são escritas em duas secções de idioma,
// cada uma iniciada por um cabeçalho de nível 2:
//
//   ## Português
//   ### Novidades
//   - ...
//   ## English
//   ### What's New
//   - ...
//
// O GitHub converte isto em HTML (<h2>Português</h2> … <h2>English</h2> …),
// que é o que chega à app via feed atom (ver electron/updater.js) e via
// electron-updater. Esta função devolve só o bloco do idioma pedido, já sem o
// próprio cabeçalho de idioma. Releases antigas (sem estes marcadores) são
// devolvidas tal como estão, para nunca ficarem em branco.
export function pickLanguageSection(html, lang) {
  if (!html || typeof DOMParser === "undefined") return html;

  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    if (!root) return html;

    const nodes = Array.from(root.childNodes);

    // Localiza os cabeçalhos <h2> que marcam cada idioma.
    const markers = [];
    nodes.forEach((node, index) => {
      if (node.nodeType === 1 && node.tagName === "H2") {
        const text = node.textContent.trim().toLowerCase();
        if (text.includes("portugu")) markers.push({ lang: "pt", index });
        else if (text.includes("english")) markers.push({ lang: "en", index });
      }
    });

    if (markers.length === 0) return html; // formato antigo, um só idioma

    const chosen =
      markers.find((m) => m.lang === lang) ||
      markers.find((m) => m.lang === "pt") ||
      markers[0];

    const nextIndex = markers
      .map((m) => m.index)
      .filter((i) => i > chosen.index)
      .sort((a, b) => a - b)[0];
    const end = nextIndex == null ? nodes.length : nextIndex;

    // Exclui o próprio cabeçalho de idioma (chosen.index), fica só o conteúdo.
    const slice = nodes.slice(chosen.index + 1, end);
    const container = doc.createElement("div");
    slice.forEach((node) => container.appendChild(node.cloneNode(true)));

    const inner = container.innerHTML.trim();
    return inner || html;
  } catch {
    return html;
  }
}
