import { useEffect, useMemo, useRef, useState } from "react";

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
  const frameRef = useRef(0);

  useEffect(() => {
    if (reduced || durationMs <= 0) return undefined;

    const from = fromRef.current;
    if (from === safeTarget) return undefined;

    const start = performance.now();
    // Desacelera no fim (easeOutCubic): a contagem linear parece um contador
    // de posto de gasolina, esta assenta no valor.
    const ease = (p) => 1 - Math.pow(1 - p, 3);

    const tick = (now) => {
      const p = Math.min(1, (now - start) / durationMs);
      const current = from + (safeTarget - from) * ease(p);
      fromRef.current = current;
      setValue(current);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [safeTarget, durationMs, reduced]);

  return reduced || durationMs <= 0 ? safeTarget : value;
}

// Versão para inteiros, que é o caso da maioria dos números da app
// (distintivos, partidas, percentagens inteiras). Sem o arredondamento, o
// contador mostrava casas decimais a tremer durante a subida.
export function useCountUpInt(target, durationMs = 650) {
  return Math.round(useCountUp(target, durationMs));
}
