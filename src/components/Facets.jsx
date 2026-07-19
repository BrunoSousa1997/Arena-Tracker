import { useRef } from "react";

// Grelha base do mosaico — cada célula vira 2 triângulos (ver buildMesh).
// viewBox fixo + preserveAspectRatio="none" no <svg> (mais abaixo) esticam
// isto para preencher qualquer tamanho de janela, por isso não precisa de
// reagir a resize: é só um retângulo 1600x1000 a ser deformado pelo CSS,
// como um "background-size: cover" normal.
const COLS = 10;
const ROWS = 7;
const VIEW_W = 1600;
const VIEW_H = 1000;

// Fração do tamanho da célula que cada vértice interior pode desviar-se da
// grelha regular — é isto que dá o ar "low poly" orgânico em vez de uma
// grelha perfeita e óbvia de triângulos idênticos.
const JITTER = 0.38;

// Pontos da fronteira (primeira/última linha e coluna) ficam sem jitter de
// propósito: o mosaico tem de cobrir o retângulo do ecrã todo sem deixar
// gretas nas bordas, só os vértices interiores é que podem fugir da
// grelha.
function buildPoints() {
  const cellW = VIEW_W / COLS;
  const cellH = VIEW_H / ROWS;
  const points = [];
  for (let r = 0; r <= ROWS; r++) {
    const row = [];
    for (let c = 0; c <= COLS; c++) {
      const onEdge = r === 0 || r === ROWS || c === 0 || c === COLS;
      const jx = onEdge ? 0 : (Math.random() - 0.5) * JITTER * cellW;
      const jy = onEdge ? 0 : (Math.random() - 0.5) * JITTER * cellH;
      row.push({ x: c * cellW + jx, y: r * cellH + jy });
    }
    points.push(row);
  }
  return points;
}

// Cada célula da grelha vira 2 triângulos, divididos por uma diagonal — a
// direção da diagonal alterna aleatoriamente célula a célula (em vez de
// ser sempre a mesma) para o mosaico não ficar com um padrão em "espinha"
// visível de longe.
function buildTriangles(points) {
  const triangles = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p00 = points[r][c];
      const p10 = points[r][c + 1];
      const p01 = points[r + 1][c];
      const p11 = points[r + 1][c + 1];
      if (Math.random() < 0.5) {
        triangles.push([p00, p10, p01]);
        triangles.push([p10, p11, p01]);
      } else {
        triangles.push([p00, p10, p11]);
        triangles.push([p00, p11, p01]);
      }
    }
  }
  return triangles;
}

// Cor de cada faceta: metade índigo, metade ciano — as duas únicas cores
// vivas que a paleta admite fora dos resultados de partida (ver o
// comentário no topo do bloco de tema em index.css). O roxo (easter egg,
// ver --decor-purple em index.css: era o --accent-rgb da v2.0.2) não entra
// aqui — é um sorteio à parte, feito uma vez para o mosaico TODO, não por
// faceta: com ~140 triângulos, um sorteio de 0,1% por faceta dava roxo em
// quase todas as sessões, o que deixava de ser um easter egg raro.
const PURPLE_CHANCE = 0.001;

function pickFacetColors(count) {
  const colors = Array.from({ length: count }, () => (Math.random() < 0.5 ? "indigo" : "cyan"));
  if (Math.random() < PURPLE_CHANCE) {
    colors[Math.floor(Math.random() * count)] = "purple";
  }
  return colors;
}

// Opacidade base de cada faceta, aleatória dentro de uma banda — é o que dá
// a ilusão de luz a bater de forma diferente em cada faceta, sem precisar
// de calcular a "normal" de um triângulo a sério como um motor 3D faria.
// O shimmer (ver @keyframes facetShimmer em index.css) oscila à volta
// desta base, não a substitui.
function buildFacetStyle(color, i) {
  const base = 0.1 + Math.random() * 0.16;
  const duration = 5 + Math.random() * 6;
  const delay = Math.random() * 6;
  return {
    fill: `var(--decor-${color})`,
    opacity: base,
    "--facet-min": (base * 0.55).toFixed(3),
    "--facet-max": Math.min(1, base * 1.6).toFixed(3),
    animation: `facetShimmer ${duration.toFixed(2)}s ease-in-out infinite`,
    animationDelay: `${delay.toFixed(2)}s`,
  };
}

function buildMesh() {
  const points = buildPoints();
  const triangles = buildTriangles(points);
  const colors = pickFacetColors(triangles.length);
  return triangles.map((tri, i) => ({
    points: tri.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    style: buildFacetStyle(colors[i], i),
  }));
}

// Mosaico "low poly" de fundo — malha triangulada a cobrir o ecrã inteiro,
// atrás de tudo (z-index negativo, ver styles.app com isolation:isolate em
// App.jsx para isto ficar mesmo por trás do conteúdo real). Puramente
// decorativo, por isso aria-hidden e sem pointer events.
//
// A geometria é gerada UMA VEZ por sessão (useRef, não useState/useMemo —
// não há nenhuma dependência que a deva recalcular): não há Three.js/WebGL
// nem re-triangulação a cada frame, só um SVG estático cujas facetas
// cintilam via CSS (ver facetShimmer). Um único <Facets /> é usado nos dois
// returns de App.jsx (ecrã de carregamento a frio e a app normal) — por
// estar na mesma posição na árvore nos dois casos, o React não a remonta ao
// trocar de um para o outro, e o mosaico sorteado não muda a meio.
export default function Facets() {
  const mesh = useRef(buildMesh()).current;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        zIndex: -1,
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {mesh.map((facet, i) => (
        <polygon key={i} className="facet" points={facet.points} style={facet.style} />
      ))}
    </svg>
  );
}
