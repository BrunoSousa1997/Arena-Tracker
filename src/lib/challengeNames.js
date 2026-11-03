// Sugestões de nome para uma sala de desafio ("Última Ronda", "Torneio da
// Areia"...). Existe porque o campo do nome era o primeiro obstáculo da
// criação: é obrigatório, está vazio, e ninguém quer inventar um nome antes
// de poder sequer ver as outras opções. Um dado a rolar resolve isso num
// clique e dá o tom de jogo à aba.
//
// As duas listas vêm do dicionário (chal_name_words_a / _b, separadas por
// "|") e não daqui: um nome tem de soar bem no idioma da interface, e o
// dicionário é o único sítio onde texto traduzido vive.

function pick(list, avoid) {
  const pool = list.length > 1 && avoid ? list.filter((w) => w !== avoid) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

// "avoid" é o nome que está no campo agora: rolar o dado e sair o mesmo nome
// lê-se como um botão que não funciona, por isso a sugestão nunca repete a
// anterior (desde que haja mais do que uma combinação possível).
export function randomRoomName(t, { avoid = "" } = {}) {
  const first = t("chal_name_words_a").split("|").map((w) => w.trim()).filter(Boolean);
  const second = t("chal_name_words_b").split("|").map((w) => w.trim()).filter(Boolean);
  if (!first.length || !second.length) return avoid;

  for (let attempt = 0; attempt < 8; attempt++) {
    const name = `${pick(first)} ${pick(second)}`;
    if (name !== avoid) return name;
  }
  return `${pick(first, "")} ${pick(second, "")}`;
}
