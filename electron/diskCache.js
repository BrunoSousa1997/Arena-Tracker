const { app } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

// ================= O QUE AS CACHES EM DISCO PARTILHAM =================
// Duas caches guardam coisas da Data Dragon em userData: os ícones
// (electron/iconCache.js) e os dados estáticos (electron/staticData.js). O que
// têm em comum é só isto — onde fica a pasta e como se escreve um ficheiro sem
// arriscar deixá-lo a meio.
//
// O app.getPath("userData") não pode ser chamado ao carregar o módulo: no
// arranque o electron.js ainda está a registar esquemas e o caminho só está
// decidido depois. Daí ser uma função.
function cacheDir(...parts) {
  return path.join(app.getPath("userData"), ...parts);
}

// Escrita em dois passos. Um ficheiro truncado por um corte de energia ou por
// um "quit" a meio ficaria em disco para sempre, e a cache nunca mais o ia
// buscar à rede — o ficheiro existe, portanto serve. O rename é atómico, logo
// o que aparece no caminho final é sempre um ficheiro completo.
async function writeFileAtomic(target, data) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, target);
}

module.exports = { cacheDir, writeFileAtomic };
