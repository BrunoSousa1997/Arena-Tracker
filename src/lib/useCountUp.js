import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// Números que sobem até ao valor em vez de aparecerem feitos. Serve os
// números grandes da Visão Geral (cobertura do roster, distintivos), onde o
// valor é o conteúdo do ecrã e vê-lo chegar dá a sensação de progresso que um
// número estático não dá.
//
// Porquê um hook e não uma animação do framer-motion, que a app já usa: o
// framer anima ESTILO (largura, opacidade, posição), não o texto de um nó.
// Para contar é preciso mesmo ir buscar o valor a cada frame e voltar a
// desenhá-lo.
//
// O "prefers-reduced-motion" é respeitado aqui dentro e não no sítio de uso,
// senão cada chamada teria de se lembrar disso — e é precisamente o tipo de
// coisa de que uma pessoa se esquece. Com movimento reduzido o hook devolve
// o valor final e nunca chega a agendar frame nenhum: contar é movimento que
// ninguém pediu, e quem liga essa definição não o quer.
// ===== RELÓGIO PARTILHADO =====
// Um único requestAnimationFrame para TODOS os contadores da página, em vez
// de um por número. Não é otimização preventiva: a grelha de Destaques tem 28
// cartões, e com um loop próprio cada um o p90 do frame durante a entrada da
// vista passava de 17ms para 50ms (medido, com e sem contadores). Eram 28
// setState soltos por frame, cada um a provocar o seu próprio render.
//
// Com todos a correr dentro da MESMA callback, o React junta-os num render só
// — que é o ponto, mais do que poupar os rAF em si.
const subscribers = new Set();
let rafId = 0;

function tick(now) {
  // Cópia da lista antes de percorrer: um contador que acaba cancela a sua
  // própria subscrição aqui dentro, e mexer no Set enquanto se itera sobre
  // ele é a receita para saltar o vizinho.
  [...subscribers].forEach((fn) => fn(now));
  rafId = subscribers.size ? requestAnimationFrame(tick) : 0;
}

function subscribe(fn) {
  subscribers.add(fn);
  if (!rafId) rafId = requestAnimationFrame(tick);
  return () => subscribers.delete(fn);
}

export function useCountUp(target, durationMs = 650) {
  const safeTarget = Number.isFinite(target) ? target : 0;

  // Lido uma vez, no primeiro render. Não é reativo de propósito: quem muda
  // esta definição do sistema a meio de uma contagem é caso tão raro que não
  // justifica um listener de media query vivo em cada número da página.
  const reduced = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    []
  );

  // Arranca em zero e não no alvo: começar no valor final era o mesmo que
  // não haver contagem nenhuma — o efeito via "já estou lá" e não fazia
  // nada.
  const [value, setValue] = useState(0);
  // De onde a próxima contagem arranca. Acompanha o que está desenhado, e
  // não o último alvo: se o valor mudar a meio (uma sincronização a chegar),
  // parte-se do que se vê em vez de saltar para trás para voltar a subir.
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduced || durationMs <= 0) return undefined;

    const from = fromRef.current;
    if (from === safeTarget) return undefined;

    let start = null;
    // Desacelera no fim (easeOutCubic): a contagem linear parece um contador
    // de posto de gasolina, esta assenta no valor.
    const ease = (p) => 1 - Math.pow(1 - p, 3);

    let unsubscribe = () => {};
    const step = (now) => {
      // O relógio é partilhado, por isso o primeiro "now" que chega aqui pode
      // já vir a meio de um frame começado por outro contador — a origem é o
      // primeiro tique que ESTE contador vê, não o instante da subscrição.
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / durationMs);
      const current = from + (safeTarget - from) * ease(p);
      fromRef.current = current;
      setValue(current);
      if (p >= 1) unsubscribe();
    };

    unsubscribe = subscribe(step);
    return () => unsubscribe();
  }, [safeTarget, durationMs, reduced]);

  return reduced || durationMs <= 0 ? safeTarget : value;
}

// Versão para inteiros, que é o caso da maioria dos números da app
// (distintivos, partidas, percentagens inteiras). Sem o arredondamento, o
// contador mostrava casas decimais a tremer durante a subida.
export function useCountUpInt(target, durationMs = 650) {
  return Math.round(useCountUp(target, durationMs));
}

// Versão para MUITOS números ao mesmo tempo: escreve o texto direto no nó,
// sem passar por estado do React. Devolve uma ref para pôr no elemento.
//
// Existe por medição, não por gosto. A grelha de Destaques tem 28 cartões, e
// com a versão por estado — mesmo já com o relógio partilhado a juntar os
// setState num render só — o p90 do frame durante a entrada da vista ficava
// nos 36ms contra 17ms sem contadores: 28 componentes a reexecutar e a
// reconciliar a cada frame. A contagem é texto a mudar numa folha da árvore,
// e isso não precisa do React pelo meio.
//
// O React continua dono do valor: o JSX renderiza o número final (é o que
// fica se não houver animação, e é o que volta a valer em cada render), e
// esta ref só lhe mexe no texto durante a subida.
export function useCountUpNode(
  target,
  { decimals = 0, durationMs = 700, enabled = true, format } = {}
) {
  const ref = useRef(null);
  const safeTarget = Number.isFinite(target) ? target : 0;

  // O formatador vai por ref e NÃO nas dependências do efeito: quem chama
  // passa quase sempre uma função nova a cada render, e nas dependências isso
  // reiniciava a contagem a cada render — ou seja, um número preso no início
  // para sempre.
  const formatRef = useRef(format);
  formatRef.current = format;
  const reduced = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    []
  );

  // "useLayoutEffect" e não "useEffect": o arranque tem de ir para o nó ANTES
  // de o browser pintar, senão via-se o valor final num frame e só depois a
  // contagem a começar do zero — um piscar que se lê como bug.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !enabled || reduced || durationMs <= 0) return undefined;

    const from = 0;
    if (from === safeTarget) return undefined;

    let start = null;
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const show = (v) => (formatRef.current ? formatRef.current(v) : v.toFixed(decimals));

    node.textContent = show(from);

    let unsubscribe = () => {};
    const step = (now) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / durationMs);
      node.textContent = show(from + (safeTarget - from) * ease(p));
      if (p >= 1) unsubscribe();
    };

    unsubscribe = subscribe(step);
    return () => unsubscribe();
  }, [safeTarget, decimals, durationMs, enabled, reduced]);

  return ref;
}
