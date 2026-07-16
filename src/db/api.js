// Barrel: mantém "./db/api" como ponto de import único para o resto da app
// (App.jsx, etc.), mesmo com a lógica dividida por domínio em ficheiros mais
// pequenos — ver wins.js, matches.js, matchCache.js, rooms.js.
export * from "./wins";
export * from "./matches";
export * from "./matchCache";
export * from "./rooms";
