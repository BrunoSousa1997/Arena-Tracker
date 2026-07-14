// ================= ROASTS (banner "a jogar agora") =================
// Frase "agressiva mas com humor" mostrada no banner que aparece quando se
// deteta um campeão em jogo (ver onActiveChampion em App.jsx). Cada campeão
// tem 3 níveis consoante o nº de vitórias já registadas com ele (contadas a
// partir do histórico de partidas, não da lista "wins" — ver App.jsx):
//   - zero: 0 vitórias
//   - few:  1-2 vitórias
//   - many: 3+ vitórias
// Cada nível tem 2 variantes, escolhidas ao calhas em cada partida para não
// repetir sempre a mesma piada. Cada frase existe em pt e en (ver
// LanguageProvider em i18n.js) — getRoast recebe o idioma atual e devolve
// já a versão certa, com fallback para pt se faltar a tradução.
//
// Campeões lançados depois de este ficheiro ter sido escrito ainda não têm
// entrada própria — usam automaticamente o fallback GENERIC (ver
// getRoast), por isso a app nunca fica sem frase nenhuma.

const GENERIC = {
  zero: [
    {
      pt: "0 vitórias com este campeão. Talvez o problema não seja a build.",
      en: "0 wins with this champion. Maybe the build isn't the problem.",
    },
    {
      pt: "Ainda a 0 aqui — a Arena não se ganha sozinha, por muito que tentes.",
      en: "Still at 0 here — the Arena doesn't win itself, no matter how hard you try.",
    },
  ],
  few: [
    {
      pt: "Uma vitória ou duas no bolso — não te armes já em profissional.",
      en: "A win or two in the bag — don't go acting like a pro just yet.",
    },
    {
      pt: "Algum progresso, sim, mas ainda longe de dominar isto.",
      en: "Some progress, sure, but still far from mastering this.",
    },
  ],
  many: [
    {
      pt: "3 ou mais vitórias — ok, desta vez o mérito pode mesmo ser teu.",
      en: "3 or more wins — okay, this time the credit might actually be yours.",
    },
    {
      pt: "Já é fluência a sério com este campeão. Nem tudo foi sorte, aparentemente.",
      en: "That's real fluency with this champion. Not all luck, apparently.",
    },
  ],
};

export const ROASTS = {
  Aatrox: {
    zero: [
      { pt: "0 vitórias com o Aatrox? Nem a Darkin Blade te quer mais.", en: "0 wins with Aatrox? Even the Darkin Blade doesn't want you anymore." },
      { pt: "O World Ender devia era acabar contigo primeiro.", en: "The World Ender should really be ending you first." },
    ],
    few: [
      { pt: "Já ressuscitaste uma vez ou duas — a cinemática ainda não te reconhece.", en: "You've resurrected once or twice — the cinematic still doesn't recognize you." },
      { pt: "Algumas vitórias, mas o exílio ainda não acabou de todo.", en: "A few wins, but the exile isn't quite over yet." },
    ],
    many: [
      { pt: "Multi-vencedor de Aatrox — a espada finalmente escolheu bem.", en: "Multi-time Aatrox winner — the sword finally chose well." },
      { pt: "Já mereces quase tanto hype como a cinemática dele.", en: "You almost deserve as much hype as his cinematic now." },
    ],
  },
  Ahri: {
    zero: [
      { pt: "0 vitórias com a Ahri — nem o charm te safa desta.", en: "0 wins with Ahri — not even Charm can save you from this." },
      { pt: "9 caudas e nenhuma delas trouxe uma vitória.", en: "9 tails and not one of them brought a win." },
    ],
    few: [
      { pt: "Charme suficiente para uma vitória ou duas, pelo menos.", en: "Enough charm for a win or two, at least." },
      { pt: "Já dominas o Spirit Rush, falta dominar o resto.", en: "You've got Spirit Rush down, just need the rest now." },
    ],
    many: [
      { pt: "Multi-vencedor — essa raposa está mesmo bem treinada.", en: "Multi-time winner — that fox is really well trained." },
      { pt: "Charm perfeito e resultados a condizer. Respeito.", en: "Perfect charm and results to match. Respect." },
    ],
  },
  Akali: {
    zero: [
      { pt: "0 vitórias e ainda assim continuas a fugir para dentro do próprio fumo.", en: "0 wins and you're still hiding inside your own smoke." },
      { pt: "Nem a Kinkou te aceitava com este histórico.", en: "Even the Kinkou wouldn't accept you with this record." },
    ],
    few: [
      { pt: "Uma ou duas vitórias escondida no fumo — mais falta.", en: "A win or two hidden in the smoke — you'll need more." },
      { pt: "Já sabes desaparecer, falta saber ganhar.", en: "You know how to vanish, now learn how to win." },
    ],
    many: [
      { pt: "Rogue assassin a sério — várias vitórias já no currículo.", en: "A real rogue assassin — several wins on the résumé already." },
      { pt: "O fumo já não esconde a qualidade, só os inimigos.", en: "The smoke no longer hides the skill, just the enemies." },
    ],
  },
  Akshan: {
    zero: [
      { pt: "0 vitórias — nem a câmara de vigilância te safa desta.", en: "0 wins — not even the hidden camera can save you from this." },
      { pt: "Devias era ressuscitar os teus aliados antes de te preocupares contigo.", en: "Maybe revive your allies before worrying about yourself." },
    ],
    few: [
      { pt: "Já resgataste uma vitória ou duas do esquecimento.", en: "You've rescued a win or two from the void." },
      { pt: "O sentinela anda a aprender, aos poucos.", en: "The sentinel is learning, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — o justiceiro finalmente faz justiça a sério.", en: "Multi-time winner — the vigilante is finally serving real justice." },
      { pt: "Já és o herói que a Arena não sabia que precisava.", en: "You're the hero the Arena didn't know it needed." },
    ],
  },
  Alistar: {
    zero: [
      { pt: "0 vitórias e o headbutt só te atira mais para longe da vitória.", en: "0 wins and Headbutt just knocks you further from victory." },
      { pt: "Nem o Pulverize consegue esmagar essa série de derrotas.", en: "Not even Pulverize can smash through that losing streak." },
    ],
    few: [
      { pt: "Já combinaste o headbutt-pulverize uma vitória ou duas.", en: "You've landed the headbutt-pulverize combo for a win or two." },
      { pt: "O minotauro está a aprender a dança, devagarinho.", en: "The minotaur is learning the dance, slowly but surely." },
    ],
    many: [
      { pt: "Multi-vencedor — esse combo já devia ser proibido.", en: "Multi-time winner — that combo should be banned by now." },
      { pt: "Tanque, iniciação e vitórias a mais. Respeito ao minotauro.", en: "Tank, engage, and plenty of wins. Respect the minotaur." },
    ],
  },
  Ambessa: {
    zero: [
      { pt: "0 vitórias — nem o exército de Noxus te safa desta derrota.", en: "0 wins — not even the Noxian army can save you from this defeat." },
      { pt: "A general devia era rever a estratégia toda.", en: "The general should really rethink the whole strategy." },
    ],
    few: [
      { pt: "Já conquistaste uma vitória ou duas para Noxus.", en: "You've conquered a win or two for Noxus." },
      { pt: "O chicote está a acertar mais vezes, aos poucos.", en: "The whip is landing more often now, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa general realmente comanda o campo.", en: "Multi-time winner — that general truly commands the field." },
      { pt: "Noxus orgulha-se, finalmente, do teu histórico.", en: "Noxus is finally proud of your record." },
    ],
  },
  Amumu: {
    zero: [
      { pt: "0 vitórias — nem o mais triste dos múmias está tão em baixo como tu.", en: "0 wins — not even the saddest mummy is as down as you." },
      { pt: "A maldição do múmia triste é mesmo real contigo.", en: "The curse of the sad mummy is very real with you." },
    ],
    few: [
      { pt: "Uma vitória ou duas — já não estás tão sozinho.", en: "A win or two — you're not so lonely anymore." },
      { pt: "O bandage toss começa a acertar, devagarinho.", en: "Bandage Toss is starting to land, slowly but surely." },
    ],
    many: [
      { pt: "Multi-vencedor com o Amumu — ele já não é assim tão triste.", en: "Multi-time winner with Amumu — he's not so sad anymore." },
      { pt: "A múmia mais amaldiçoada do jogo, mas contigo a sorte virou.", en: "The most cursed mummy in the game, but with you the luck turned around." },
    ],
  },
  Anivia: {
    zero: [
      { pt: "0 vitórias e o ovo nunca mais choca numa vitória.", en: "0 wins and the egg never hatches into a victory." },
      { pt: "Nem renascer das cinzas te safa desta série de derrotas.", en: "Not even rising from the ashes saves you from this losing streak." },
    ],
    few: [
      { pt: "Já renasceste do ovo para uma vitória ou duas.", en: "You've hatched back from the egg for a win or two." },
      { pt: "O gelo está a começar a pegar, devagarinho.", en: "The ice is starting to stick, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fénix já não precisa de reviver tantas vezes.", en: "Multi-time winner — that phoenix doesn't need to revive so much anymore." },
      { pt: "Frostbite a sério, com vitórias a condizer.", en: "Real Frostbite, with wins to match." },
    ],
  },
  Annie: {
    zero: [
      { pt: "0 vitórias e nem o Tibbers te safa desta.", en: "0 wins and not even Tibbers can save you from this." },
      { pt: "A criança mais assustadora do jogo, mas sem vitória nenhuma.", en: "The scariest kid in the game, yet without a single win." },
    ],
    few: [
      { pt: "O Tibbers já ajudou numa vitória ou duas.", en: "Tibbers has helped out with a win or two." },
      { pt: "Já começas a acumular stun, falta acumular vitórias.", en: "You're stacking stuns now, just need to stack wins too." },
    ],
    many: [
      { pt: "Multi-vencedor — o ursinho de peluche está feliz contigo.", en: "Multi-time winner — the teddy bear is happy with you." },
      { pt: "Tibbers em chamas e o teu histórico também.", en: "Tibbers is on fire, and so is your record." },
    ],
  },
  Aphelios: {
    zero: [
      { pt: "0 vitórias e nem as 5 armas da lua te safam.", en: "0 wins and not even the 5 moon weapons can save you." },
      { pt: "Nem falas e ainda por cima não ganhas — dupla desilusão.", en: "You don't even speak, and on top of that you don't win — double disappointment." },
    ],
    few: [
      { pt: "Já trocaste de arma bem o suficiente para uma vitória ou duas.", en: "You've swapped weapons well enough for a win or two." },
      { pt: "O arsenal lunar está a começar a fazer sentido.", en: "The lunar arsenal is starting to make sense." },
    ],
    many: [
      { pt: "Multi-vencedor sem dizer uma palavra — respeito silencioso.", en: "Multi-time winner without saying a word — silent respect." },
      { pt: "Já dominas as 5 armas e as vitórias a condizer.", en: "You've mastered all 5 weapons and the wins to match." },
    ],
  },
  Ashe: {
    zero: [
      { pt: "0 vitórias — nem a flecha de gelo (ult) te safa a mira.", en: "0 wins — not even the ice arrow (ult) can save your aim." },
      { pt: "A rainha do Freljord está envergonhada contigo.", en: "The Queen of the Freljord is embarrassed by you." },
    ],
    few: [
      { pt: "Já acertaste uma flecha de crítico a mais — uma vitória ou duas.", en: "You've landed one extra crit arrow — a win or two." },
      { pt: "O Freljord começa a reconhecer-te, aos poucos.", en: "The Freljord is starting to recognize you, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — essa flecha nunca mais falha.", en: "Multi-time winner — that arrow never misses anymore." },
      { pt: "Já unificaste as tribos e as vitórias.", en: "You've united the tribes and the wins." },
    ],
  },
  AurelionSol: {
    zero: [
      { pt: "0 vitórias — nem um deus estelar te safa desta.", en: "0 wins — not even a star god can save you from this." },
      { pt: "Forjaste estrelas e nenhuma vitória.", en: "You've forged stars and not a single victory." },
    ],
    few: [
      { pt: "Já forjaste uma vitória ou duas entre as estrelas.", en: "You've forged a win or two among the stars." },
      { pt: "O cometa começa a acertar, devagarinho.", en: "The comet is starting to land, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse deus voltou à glória de vez.", en: "Multi-time winner — that god has returned to glory for good." },
      { pt: "As estrelas alinharam-se mesmo a teu favor.", en: "The stars have truly aligned in your favor." },
    ],
  },
  Aurora: {
    zero: [
      { pt: "0 vitórias — nem os espíritos da natureza te safam.", en: "0 wins — not even the nature spirits can save you." },
      { pt: "A raposa dos espíritos está desiludida contigo.", en: "The witch of the wilds is disappointed in you." },
    ],
    few: [
      { pt: "Já convocaste uma vitória ou duas dos espíritos.", en: "You've summoned a win or two from the spirits." },
      { pt: "A comunhão com a natureza está a resultar, aos poucos.", en: "The bond with nature is starting to pay off, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — a natureza está mesmo do teu lado.", en: "Multi-time winner — nature is truly on your side." },
      { pt: "Já és uma com os espíritos, e com as vitórias.", en: "You've become one with the spirits, and with the wins." },
    ],
  },
  Azir: {
    zero: [
      { pt: "0 vitórias — nem um exército de soldados de areia te safa.", en: "0 wins — not even an army of sand soldiers can save you." },
      { pt: "O imperador de Shurima está envergonhado do próprio trono.", en: "The Emperor of Shurima is embarrassed by his own throne." },
    ],
    few: [
      { pt: "Já ergueste uma vitória ou duas com os soldados de areia.", en: "You've raised a win or two with the sand soldiers." },
      { pt: "Shurima começa a lembrar-se do teu nome, aos poucos.", en: "Shurima is starting to remember your name, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — esse império ressurgiu mesmo das cinzas.", en: "Multi-time winner — that empire truly rose from the ashes." },
      { pt: "Já comandas a areia toda e as vitórias também.", en: "You command all the sand now, and the wins too." },
    ],
  },
  Bard: {
    zero: [
      { pt: "0 vitórias — nem os teus meeps conseguem juntar moedas suficientes para uma vitória.", en: "0 wins — not even your meeps can collect enough chimes for a win." },
      { pt: "O andarilho cósmico anda perdido, tal como o teu histórico.", en: "The cosmic wanderer is lost, just like your record." },
    ],
    few: [
      { pt: "Já apanhaste chimes suficientes para uma vitória ou duas.", en: "You've collected enough chimes for a win or two." },
      { pt: "O portal começa a levar-te a sítios melhores, aos poucos.", en: "The portal is starting to take you to better places, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — o cosmos está mesmo alinhado contigo.", en: "Multi-time winner — the cosmos is truly aligned with you." },
      { pt: "Já és uma lenda cósmica, chimes e vitórias incluídos.", en: "You're a cosmic legend now, chimes and wins included." },
    ],
  },
  Belveth: {
    zero: [
      { pt: "0 vitórias — nem a imperatriz do Vazio consegue devorar uma vitória.", en: "0 wins — not even the Void Empress can devour a single win." },
      { pt: "As tentáculos falharam em tudo, incluindo em ganhar.", en: "The tentacles failed at everything, including winning." },
    ],
    few: [
      { pt: "Já devoraste uma vitória ou duas do Vazio.", en: "You've devoured a win or two from the Void." },
      { pt: "O enxame começa a crescer, devagarinho.", en: "The swarm is starting to grow, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa imperatriz devora tudo, vitórias incluídas.", en: "Multi-time winner — that empress devours everything, wins included." },
      { pt: "O Vazio nunca esteve tão bem representado.", en: "The Void has never been better represented." },
    ],
  },
  Blitzcrank: {
    zero: [
      { pt: "0 vitórias — nem o rocket grab agarra uma vitória sequer.", en: "0 wins — not even Rocket Grab can grab a single victory." },
      { pt: "Perdeste a mão E o jogo. Duplo prejuízo.", en: "You lost the hand AND the game. Double loss." },
    ],
    few: [
      { pt: "Já acertaste um grab decente o suficiente para uma vitória ou duas.", en: "You've landed a decent grab for a win or two." },
      { pt: "O robô começa a aprender a puxar as pessoas certas.", en: "The robot is learning to grab the right people." },
    ],
    many: [
      { pt: "Multi-vencedor — esse grab está afinadíssimo.", en: "Multi-time winner — that grab is dialed in perfectly." },
      { pt: "Já és o robô mais temido da Arena, com vitórias a condizer.", en: "You're the most feared robot in the Arena, wins to match." },
    ],
  },
  Brand: {
    zero: [
      { pt: "0 vitórias — nem estás em chamas, estás só a arder à toa.", en: "0 wins — you're not on fire, you're just burning for nothing." },
      { pt: "O elemental de fogo apagou-se antes de qualquer vitória.", en: "The fire elemental burned out before any win." },
    ],
    few: [
      { pt: "Já incendiaste uma vitória ou duas com o teu combo.", en: "You've torched a win or two with your combo." },
      { pt: "O fogo começa a espalhar-se a sério, devagarinho.", en: "The fire is starting to spread for real, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — esse incêndio está bem fora de controlo (a teu favor).", en: "Multi-time winner — that fire is well out of control (in your favor)." },
      { pt: "Já queimas tudo à tua frente, vitórias incluídas.", en: "You're burning everything in your path now, wins included." },
    ],
  },
  Braum: {
    zero: [
      { pt: "0 vitórias — nem o escudo mais forte do Freljord te protege desta.", en: "0 wins — not even the Freljord's strongest shield can protect you from this." },
      { pt: "O coração do Freljord está partido contigo.", en: "The Heart of the Freljord is broken because of you." },
    ],
    few: [
      { pt: "Já protegeste uma vitória ou duas com o escudo.", en: "You've shielded a win or two." },
      { pt: "O barril de hooch está a ajudar, aos poucos.", en: "The barrel of hooch is helping out, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — esse escudo já é lendário.", en: "Multi-time winner — that shield is legendary by now." },
      { pt: "Já és o herói do Freljord de corpo inteiro, vitórias incluídas.", en: "You're the full-body hero of the Freljord, wins included." },
    ],
  },
  Briar: {
    zero: [
      { pt: "0 vitórias — nem a fome de sangue consegue saborear uma vitória.", en: "0 wins — not even the blood hunger can taste a single victory." },
      { pt: "As correntes soltaram-se e ainda assim não ganhaste nada.", en: "The chains came off and you still didn't win anything." },
    ],
    few: [
      { pt: "Já saboreaste uma vitória ou duas com a fome desenfreada.", en: "You've tasted a win or two with that unleashed hunger." },
      { pt: "A vampira feral começa a controlar-se (um bocadinho).", en: "The feral vampire is starting to control herself (a little)." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fome de sangue está bem satisfeita.", en: "Multi-time winner — that blood hunger is well satisfied." },
      { pt: "Já és puro instinto, e os resultados mostram isso.", en: "You're pure instinct now, and the results show it." },
    ],
  },
  Caitlyn: {
    zero: [
      { pt: "0 vitórias — nem o headshot mais preciso de Piltover te safa.", en: "0 wins — not even Piltover's most precise headshot can save you." },
      { pt: "A xerife devia era prender-te por incompetência.", en: "The sheriff should really arrest you for incompetence." },
    ],
    few: [
      { pt: "Já acertaste um headshot certeiro o suficiente para uma vitória ou duas.", en: "You've landed a clean headshot for a win or two." },
      { pt: "As armadilhas começam a apanhar os alvos certos.", en: "The traps are starting to catch the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — essa mira já é lendária em Piltover.", en: "Multi-time winner — that aim is legendary in Piltover by now." },
      { pt: "Já és a lei em pessoa, vitórias incluídas.", en: "You're the law in person now, wins included." },
    ],
  },
  Camille: {
    zero: [
      { pt: "0 vitórias — nem as lâminas hextech cortam essa série de derrotas.", en: "0 wins — not even the hextech blades can cut through this losing streak." },
      { pt: "A executora de Piltover falhou na execução mais básica: ganhar.", en: "Piltover's enforcer failed at the most basic execution: winning." },
    ],
    few: [
      { pt: "Já executaste uma vitória ou duas com precisão.", en: "You've executed a win or two with precision." },
      { pt: "As pernas hextech começam a acertar no sítio certo.", en: "The hextech legs are starting to land in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — essa execução já é impecável.", en: "Multi-time winner — that execution is flawless by now." },
      { pt: "Já és a perfeição de Piltover, vitórias incluídas.", en: "You're Piltover's perfection now, wins included." },
    ],
  },
  Cassiopeia: {
    zero: [
      { pt: "0 vitórias — nem o olhar petrificante paralisa uma vitória sequer.", en: "0 wins — not even the petrifying gaze can freeze a single win in place." },
      { pt: "A cobra mudou de pele e continua sem ganhar nada.", en: "The snake shed its skin and still isn't winning anything." },
    ],
    few: [
      { pt: "Já envenenaste uma vitória ou duas com o teu veneno.", en: "You've poisoned a win or two with your venom." },
      { pt: "A transformação começa a compensar, aos poucos.", en: "The transformation is starting to pay off, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — esse veneno já é letal a sério.", en: "Multi-time winner — that venom is truly lethal now." },
      { pt: "Já não há quem escape ao teu olhar (ou às tuas vitórias).", en: "No one escapes your gaze anymore (or your wins)." },
    ],
  },
  Chogath: {
    zero: [
      { pt: "0 vitórias — nem o Feast (ult) consegue engolir uma vitória.", en: "0 wins — not even Feast (ult) can swallow a single victory." },
      { pt: "O terror do Vazio devia era ter medo de ti, pelo desempenho.", en: "The Terror of the Void should honestly be afraid of you, given this performance." },
    ],
    few: [
      { pt: "Já engoliste uma vitória ou duas para crescer.", en: "You've swallowed a win or two to grow." },
      { pt: "O silêncio começa a calar os adversários certos.", en: "The silence is starting to shut up the right opponents." },
    ],
    many: [
      { pt: "Multi-vencedor — esse terror já cresceu ao máximo.", en: "Multi-time winner — that terror has grown to max size now." },
      { pt: "Já devoraste tudo à frente, vitórias incluídas.", en: "You've devoured everything in your path, wins included." },
    ],
  },
  Corki: {
    zero: [
      { pt: "0 vitórias — nem o pacote especial (mini-gun) salva este voo.", en: "0 wins — not even the Special Delivery (mini-gun) can save this flight." },
      { pt: "O piloto yordle está mesmo a cair a pique.", en: "The yordle pilot is really going down in flames." },
    ],
    few: [
      { pt: "Já lançaste um míssil certeiro o suficiente para uma vitória ou duas.", en: "You've landed a solid missile for a win or two." },
      { pt: "O voo começa a estabilizar, devagarinho.", en: "The flight is starting to stabilize, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse piloto voa mesmo bem.", en: "Multi-time winner — that pilot really flies well." },
      { pt: "Já és um ás da aviação yordle, vitórias incluídas.", en: "You're a yordle aviation ace now, wins included." },
    ],
  },
  Darius: {
    zero: [
      { pt: "0 vitórias — nem o machado noxiano decapita essa série de derrotas.", en: "0 wins — not even the Noxian axe can decapitate this losing streak." },
      { pt: "A hemorragia (bleed) é a única coisa que sangras bem.", en: "Hemorrhage is the only thing you're bleeding well." },
    ],
    few: [
      { pt: "Já decapitaste uma vitória ou duas com o ult certo.", en: "You've beheaded a win or two with the right ult." },
      { pt: "A hemorragia começa a fazer efeito nos sítios certos.", en: "The bleed is starting to work on the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — essa decapitação é quase uma arte.", en: "Multi-time winner — that decapitation is practically an art form." },
      { pt: "Noxus orgulha-se de ti, finalmente.", en: "Noxus is finally proud of you." },
    ],
  },
  Diana: {
    zero: [
      { pt: "0 vitórias — nem a lua cheia ilumina esta série de derrotas.", en: "0 wins — not even the full moon can light up this losing streak." },
      { pt: "A Lunari devia era escolher outro campeão para representar.", en: "The Lunari should really pick another champion to represent them." },
    ],
    few: [
      { pt: "Já cortaste uma vitória ou duas com a foice.", en: "You've cut down a win or two with the scythe." },
      { pt: "A lua começa a brilhar mais forte, aos poucos.", en: "The moon is starting to shine brighter, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lua está em fase cheia permanente.", en: "Multi-time winner — that moon is permanently full now." },
      { pt: "Já eclipsas qualquer adversário, vitórias incluídas.", en: "You eclipse any opponent now, wins included." },
    ],
  },
  Draven: {
    zero: [
      { pt: "0 vitórias — nem os machados giratórios voltam para ti.", en: "0 wins — not even the spinning axes come back to you." },
      { pt: "A plateia (League) não está a aplaudir nada disto.", en: "The crowd (League) isn't applauding any of this." },
    ],
    few: [
      { pt: "Já apanhaste um machado giratório o suficiente para uma vitória ou duas.", en: "You've caught a spinning axe well enough for a win or two." },
      { pt: "A plateia começa a gostar do espetáculo, devagarinho.", en: "The crowd is starting to enjoy the show, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse espetáculo já é digno de aplausos.", en: "Multi-time winner — that show is worthy of applause now." },
      { pt: "Já és a maior estrela da Liga, vitórias incluídas.", en: "You're the biggest star in the League now, wins included." },
    ],
  },
  DrMundo: {
    zero: [
      { pt: "0 vitórias — Mundo vai onde lhe apetece, menos à vitória.", en: "0 wins — Mundo goes wherever he pleases, except to victory." },
      { pt: "Nem os químicos de Zaun curam essa série de derrotas.", en: "Not even Zaun's chemicals can cure that losing streak." },
    ],
    few: [
      { pt: "Já atiraste um cutelo certeiro o suficiente para uma vitória ou duas.", en: "You've thrown a solid cleaver for a win or two." },
      { pt: "Os químicos começam a fazer efeito, devagarinho.", en: "The chemicals are starting to kick in, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — Mundo agora vai sempre onde quer, e ganha.", en: "Multi-time winner — Mundo now goes wherever he wants, and wins." },
      { pt: "Já és imparável (e quase indestrutível), vitórias incluídas.", en: "You're unstoppable now (and nearly indestructible), wins included." },
    ],
  },
  Ekko: {
    zero: [
      { pt: "0 vitórias — nem rebobinar o tempo (ult) apaga essa derrota.", en: "0 wins — not even rewinding time (ult) erases this defeat." },
      { pt: "O z-drive devia era rebobinar-te para antes de teres escolhido este campeão.", en: "The Z-Drive should really rewind you to before you picked this champion." },
    ],
    few: [
      { pt: "Já reescreveste uma vitória ou duas no tempo.", en: "You've rewritten a win or two in time." },
      { pt: "O timer começa a marcar os momentos certos.", en: "The timer is starting to mark the right moments." },
    ],
    many: [
      { pt: "Multi-vencedor — já dominas o tempo e as vitórias.", en: "Multi-time winner — you've mastered time and the wins." },
      { pt: "Zaun orgulha-se do génio que te tornaste.", en: "Zaun is proud of the genius you've become." },
    ],
  },
  Elise: {
    zero: [
      { pt: "0 vitórias — nem a rainha aranha te safa desta teia de derrotas.", en: "0 wins — not even the Spider Queen can save you from this web of losses." },
      { pt: "Nem em forma humana nem em forma de aranha há vitória à vista.", en: "Neither human form nor spider form has a win in sight." },
    ],
    few: [
      { pt: "Já tecidas uma vitória ou duas na tua teia.", en: "You've woven a win or two into your web." },
      { pt: "A transformação começa a acertar no timing certo.", en: "The transformation is starting to land at the right time." },
    ],
    many: [
      { pt: "Multi-vencedor — essa teia já apanha tudo.", en: "Multi-time winner — that web catches everything now." },
      { pt: "Já és o pesadelo de oito patas da Arena, vitórias incluídas.", en: "You're the Arena's eight-legged nightmare now, wins included." },
    ],
  },
  Evelynn: {
    zero: [
      { pt: "0 vitórias — nem o disfarce (stealth) esconde essa vergonha.", en: "0 wins — not even stealth can hide this embarrassment." },
      { pt: "'Hate is good' mas as tuas vitórias não são nenhumas.", en: "'Hate is good' but your wins are nonexistent." },
    ],
    few: [
      { pt: "Já seduziste uma vitória ou duas na sombra.", en: "You've seduced a win or two from the shadows." },
      { pt: "O disfarce começa a esconder os erros certos.", en: "The disguise is starting to hide the right mistakes." },
    ],
    many: [
      { pt: "Multi-vencedor — essa sedução já é letal.", en: "Multi-time winner — that seduction is lethal now." },
      { pt: "Já dominas as sombras e as vitórias, demónio.", en: "You've mastered the shadows and the wins, demon." },
    ],
  },
  Ezreal: {
    zero: [
      { pt: "0 vitórias — nem o arcane shift (blink) te tira desta série de derrotas.", en: "0 wins — not even Arcane Shift can blink you out of this losing streak." },
      { pt: "O explorador só explorou o caminho para a derrota.", en: "The explorer only explored the road to defeat." },
    ],
    few: [
      { pt: "Já acertaste um mystic shot certeiro o suficiente para uma vitória ou duas.", en: "You've landed a solid Mystic Shot for a win or two." },
      { pt: "A luva hextech começa a apontar bem, devagarinho.", en: "The hextech gauntlet is starting to aim well, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse explorador já encontrou o tesouro certo.", en: "Multi-time winner — that explorer finally found the right treasure." },
      { pt: "Já és a lenda que Piltover sempre falou, vitórias incluídas.", en: "You're the legend Piltover always talked about, wins included." },
    ],
  },
  Fiddlesticks: {
    zero: [
      { pt: "0 vitórias — nem o medo (fear) assusta ninguém com esse histórico.", en: "0 wins — not even Fear scares anyone with this record." },
      { pt: "O espantalho está mais assustado contigo do que tu com ele.", en: "The scarecrow is more scared of you than you are of him." },
    ],
    few: [
      { pt: "Já assustaste uma vitória ou duas com o crowstorm.", en: "You've spooked a win or two with Crowstorm." },
      { pt: "O terror começa a espalhar-se pela lane certa.", en: "The terror is starting to spread to the right lane." },
    ],
    many: [
      { pt: "Multi-vencedor — esse pesadelo já é lendário.", en: "Multi-time winner — that nightmare is legendary now." },
      { pt: "Já és o medo em pessoa, vitórias incluídas.", en: "You're fear itself now, wins included." },
    ],
  },
  Fiora: {
    zero: [
      { pt: "0 vitórias — nem acertaste um vital sequer, quanto mais uma vitória.", en: "0 wins — you haven't even hit a vital, let alone won a game." },
      { pt: "A duelista mais elegante do jogo, mas sem elegância nenhuma nos resultados.", en: "The most elegant duelist in the game, yet zero elegance in the results." },
    ],
    few: [
      { pt: "Já acertaste um vital certeiro o suficiente para uma vitória ou duas.", en: "You've hit a clean vital for a win or two." },
      { pt: "A lâmina começa a encontrar os pontos certos.", en: "The blade is starting to find the right spots." },
    ],
    many: [
      { pt: "Multi-vencedor — essa esgrima já é perfeita.", en: "Multi-time winner — that fencing is flawless now." },
      { pt: "Já és a maior duelista da Arena, vitórias incluídas.", en: "You're the Arena's greatest duelist now, wins included." },
    ],
  },
  Fizz: {
    zero: [
      { pt: "0 vitórias — nem o tridente mágico pesca uma vitória sequer.", en: "0 wins — not even the magic trident can fish out a single win." },
      { pt: "O peixe-yordle mais escorregadio, mas escorregou é da vitória.", en: "The slipperiest yordle-fish around, but it slipped right past victory." },
    ],
    few: [
      { pt: "Já saltaste para uma vitória ou duas com o teu truque.", en: "You've hopped your way to a win or two with your trick." },
      { pt: "O salto mágico começa a acertar no timing certo.", en: "The magic jump is starting to land at the right timing." },
    ],
    many: [
      { pt: "Multi-vencedor — esse truque já é imparável.", en: "Multi-time winner — that trick is unstoppable now." },
      { pt: "Já dominas o mar e as vitórias, pequeno trapaceiro.", en: "You rule the sea and the wins now, little trickster." },
    ],
  },
  Galio: {
    zero: [
      { pt: "0 vitórias — nem soar o alarme (ult) chama alguém para te salvar.", en: "0 wins — not even Hero's Entrance (ult) calls anyone to save you." },
      { pt: "A gárgula de pedra está mais dura contigo do que consigo.", en: "The stone gargoyle is harder on you than on himself." },
    ],
    few: [
      { pt: "Já protegeste uma vitória ou duas com o teu escudo mágico.", en: "You've shielded a win or two with your magic barrier." },
      { pt: "O alarme começa a soar nos momentos certos.", en: "The alarm is starting to ring at the right moments." },
    ],
    many: [
      { pt: "Multi-vencedor — esse guardião já protege bem a sério.", en: "Multi-time winner — that guardian really protects well now." },
      { pt: "Demacia orgulha-se do teu histórico, finalmente.", en: "Demacia is finally proud of your record." },
    ],
  },
  Gangplank: {
    zero: [
      { pt: "0 vitórias — nem a laranja cura essa série de derrotas.", en: "0 wins — not even the orange cures this losing streak." },
      { pt: "Os barris explodiram tudo, menos as tuas derrotas.", en: "The barrels blew up everything except your losses." },
    ],
    few: [
      { pt: "Já detonaste uma vitória ou duas com os teus barris.", en: "You've detonated a win or two with your barrels." },
      { pt: "A pistola começa a acertar nos alvos certos.", en: "The pistol is starting to hit the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — esse capitão já domina os mares (e a Arena).", en: "Multi-time winner — that captain rules the seas now (and the Arena)." },
      { pt: "Já és o rei pirata de Bilgewater, vitórias incluídas.", en: "You're the Pirate King of Bilgewater now, wins included." },
    ],
  },
  Garen: {
    zero: [
      { pt: "0 vitórias — nem o silêncio (Q) te cala essa vergonha.", en: "0 wins — not even Silence (Q) can shut up this embarrassment." },
      { pt: "O Judgment (spin) rodou tudo menos vitórias.", en: "Judgment (the spin) span through everything except victories." },
    ],
    few: [
      { pt: "Já giraste até a uma vitória ou duas.", en: "You've spun your way to a win or two." },
      { pt: "A Demacia começa a acreditar mais em ti, devagarinho.", en: "Demacia is starting to believe in you more, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse spin já é imparável.", en: "Multi-time winner — that spin is unstoppable now." },
      { pt: "Já és o orgulho de Demacia, sem mana e sem medo.", en: "You're the pride of Demacia now, no mana and no fear." },
    ],
  },
  Gnar: {
    zero: [
      { pt: "0 vitórias — nem transformar em Mega Gnar resolve essa série de derrotas.", en: "0 wins — not even turning into Mega Gnar fixes this losing streak." },
      { pt: "O boomerang voltou sempre vazio de vitórias.", en: "The boomerang always came back empty-handed of wins." },
    ],
    few: [
      { pt: "Já atiraste um boomerang certeiro o suficiente para uma vitória ou duas.", en: "You've thrown a clean boomerang for a win or two." },
      { pt: "A transformação começa a acontecer na hora certa.", en: "The transformation is starting to happen at the right time." },
    ],
    many: [
      { pt: "Multi-vencedor — esse yordle já domina as duas formas.", en: "Multi-time winner — that yordle has mastered both forms now." },
      { pt: "Já és mega em tudo, vitórias incluídas.", en: "You're mega at everything now, wins included." },
    ],
  },
  Gragas: {
    zero: [
      { pt: "0 vitórias — nem o barril rolante (ult) empurra essa série de derrotas.", en: "0 wins — not even Explosive Cask (ult) can push through this losing streak." },
      { pt: "Bêbado a mais para acertar sequer numa vitória.", en: "Too drunk to land even a single win." },
    ],
    few: [
      { pt: "Já rebentaste uma vitória ou duas com o body slam.", en: "You've body-slammed your way to a win or two." },
      { pt: "O barril começa a acertar no ângulo certo.", en: "The barrel is starting to land at the right angle." },
    ],
    many: [
      { pt: "Multi-vencedor — esse bêbado sabe mesmo o que faz.", en: "Multi-time winner — that drunk really knows what he's doing." },
      { pt: "Já dominas a festa toda, vitórias incluídas.", en: "You own the whole party now, wins included." },
    ],
  },
  Graves: {
    zero: [
      { pt: "0 vitórias — nem a caçadeira (buckshot) acerta uma vitória sequer.", en: "0 wins — not even Buckshot can hit a single win." },
      { pt: "O charuto está mais aceso que o teu desempenho.", en: "The cigar is more lit than your performance." },
    ],
    few: [
      { pt: "Já acertaste um buckshot certeiro o suficiente para uma vitória ou duas.", en: "You've landed a clean Buckshot for a win or two." },
      { pt: "A pontaria começa a melhorar, aos poucos.", en: "The aim is starting to improve, bit by bit." },
    ],
    many: [
      { pt: "Multi-vencedor — essa caçadeira já não falha nada.", en: "Multi-time winner — that shotgun doesn't miss anymore." },
      { pt: "Já és o fora da lei mais temido, vitórias incluídas.", en: "You're the most feared outlaw now, wins included." },
    ],
  },
  Gwen: {
    zero: [
      { pt: "0 vitórias — nem a tesoura sagrada corta essa série de derrotas.", en: "0 wins — not even the sacred scissors can cut through this losing streak." },
      { pt: "A boneca sencinte devia era cortar-te da equipa.", en: "The sentient doll should really cut you from the team." },
    ],
    few: [
      { pt: "Já cortaste uma vitória ou duas com a bruma sagrada.", en: "You've snipped a win or two with the hallowed mist." },
      { pt: "A tesoura começa a acertar nos sítios certos.", en: "The scissors are starting to land in the right spots." },
    ],
    many: [
      { pt: "Multi-vencedor — essa boneca já corta tudo à frente.", en: "Multi-time winner — that doll cuts through everything now." },
      { pt: "Já és abençoada de vez, vitórias incluídas.", en: "You're truly blessed now, wins included." },
    ],
  },
  Hecarim: {
    zero: [
      { pt: "0 vitórias — nem o cavalo espectral galopa para uma vitória.", en: "0 wins — not even the spectral horse gallops toward a win." },
      { pt: "O trample (pisar) só pisou o teu próprio orgulho.", en: "Rampage only trampled your own pride." },
    ],
    few: [
      { pt: "Já galopaste até uma vitória ou duas.", en: "You've galloped your way to a win or two." },
      { pt: "O espectro começa a assombrar os adversários certos.", en: "The specter is starting to haunt the right opponents." },
    ],
    many: [
      { pt: "Multi-vencedor — esse cavalo já não para de ganhar.", en: "Multi-time winner — that horse doesn't stop winning now." },
      { pt: "Já és o terror da guerra em pessoa, vitórias incluídas.", en: "You're the terror of war in person now, wins included." },
    ],
  },
  Heimerdinger: {
    zero: [
      { pt: "0 vitórias — nem as torretas defendem essa série de derrotas.", en: "0 wins — not even the turrets can defend against this losing streak." },
      { pt: "O génio de Piltover devia era inventar uma máquina de ganhar.", en: "Piltover's genius should really invent a winning machine." },
    ],
    few: [
      { pt: "Já construíste uma vitória ou duas com as tuas torretas.", en: "You've built a win or two with your turrets." },
      { pt: "As invenções começam a funcionar, devagarinho.", en: "The inventions are starting to work, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse génio já domina a engenharia toda.", en: "Multi-time winner — that genius has mastered all the engineering now." },
      { pt: "Já és o Yordle mais brilhante da Arena, vitórias incluídas.", en: "You're the Arena's brightest yordle now, wins included." },
    ],
  },
  Hwei: {
    zero: [
      { pt: "0 vitórias — nem os teus pincéis pintam uma vitória sequer.", en: "0 wins — not even your brushes can paint a single victory." },
      { pt: "A tua arte é só uma obra-prima de derrotas.", en: "Your art is just a masterpiece of losses." },
    ],
    few: [
      { pt: "Já pintaste uma vitória ou duas com o pincel certo.", en: "You've painted a win or two with the right brush." },
      { pt: "As emoções começam a acertar na tela certa.", en: "The emotions are starting to land on the right canvas." },
    ],
    many: [
      { pt: "Multi-vencedor — essa arte já é digna de museu.", en: "Multi-time winner — that art is museum-worthy now." },
      { pt: "Já pintas vitórias como quem pinta obras-primas.", en: "You paint wins now like you paint masterpieces." },
    ],
  },
  Illaoi: {
    zero: [
      { pt: "0 vitórias — nem os tentáculos do Nagakabouros te salvam desta.", en: "0 wins — not even Nagakabouros' tentacles can save you from this." },
      { pt: "O teste de espírito devia era testar a tua vontade de continuar.", en: "The Test of Spirit should really test your will to continue." },
    ],
    few: [
      { pt: "Já testaste o espírito de uma vitória ou duas.", en: "You've tested the spirit of a win or two." },
      { pt: "Os tentáculos começam a acertar no alvo certo.", en: "The tentacles are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa sacerdotisa já domina os tentáculos todos.", en: "Multi-time winner — that priestess has mastered all the tentacles now." },
      { pt: "Já és a fé em pessoa, vitórias incluídas.", en: "You're faith in person now, wins included." },
    ],
  },
  Irelia: {
    zero: [
      { pt: "0 vitórias — nem as lâminas flutuantes cortam essa série de derrotas.", en: "0 wins — not even the floating blades can cut through this losing streak." },
      { pt: "Ionia devia era pedir desculpa por te representar.", en: "Ionia should really apologize for being represented by you." },
    ],
    few: [
      { pt: "Já cortaste uma vitória ou duas com as lâminas.", en: "You've cut a win or two with the blades." },
      { pt: "As lâminas começam a dançar no ritmo certo.", en: "The blades are starting to dance to the right rhythm." },
    ],
    many: [
      { pt: "Multi-vencedor — essa dançarina de lâminas já é lendária.", en: "Multi-time winner — that blade dancer is legendary now." },
      { pt: "Já dominas Ionia inteira, vitórias incluídas.", en: "You rule all of Ionia now, wins included." },
    ],
  },
  Ivern: {
    zero: [
      { pt: "Com 0 vitórias não há Daisy que te salve.", en: "With 0 wins, no Daisy can save you." },
      { pt: "Amigo de todos os monstros, menos da vitória.", en: "Friend to every monster, except victory." },
    ],
    few: [
      { pt: "A Daisy já ajudou numa vitória ou duas.", en: "Daisy has helped out with a win or two." },
      { pt: "O brushmaker começa a plantar as sementes certas.", en: "The brushmaker is starting to plant the right seeds." },
    ],
    many: [
      { pt: "Multi-vencedor — o Daisy já não larga esse combo.", en: "Multi-time winner — Daisy won't let go of that combo now." },
      { pt: "Já és o melhor amigo da selva, vitórias incluídas.", en: "You're the jungle's best friend now, wins included." },
    ],
  },
  Janna: {
    zero: [
      { pt: "0 vitórias — nem a tempestade (ult) varre essa série de derrotas.", en: "0 wins — not even the storm (ult) can sweep away this losing streak." },
      { pt: "O vento só soprou para o lado errado.", en: "The wind only blew in the wrong direction." },
    ],
    few: [
      { pt: "Já soprou uma vitória ou duas na direção certa.", en: "It's blown a win or two in the right direction." },
      { pt: "A tempestade começa a formar-se, devagarinho.", en: "The storm is starting to form, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse vento já sopra sempre a teu favor.", en: "Multi-time winner — that wind always blows in your favor now." },
      { pt: "Já controlas a tempestade toda, vitórias incluídas.", en: "You control the whole storm now, wins included." },
    ],
  },
  JarvanIV: {
    zero: [
      { pt: "0 vitórias — nem a bandeira + arremesso prende essa série de derrotas.", en: "0 wins — not even flag + drag can trap this losing streak." },
      { pt: "O príncipe de Demacia devia era abdicar do trono.", en: "The Prince of Demacia should really abdicate the throne." },
    ],
    few: [
      { pt: "Já prendeste uma vitória ou duas com o combo certo.", en: "You've trapped a win or two with the right combo." },
      { pt: "A bandeira começa a cair no sítio certo.", en: "The flag is starting to land in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — esse combo já é perfeito.", en: "Multi-time winner — that combo is flawless now." },
      { pt: "Já és o exemplo de Demacia, vitórias incluídas.", en: "You're the Exemplar of Demacia now, wins included." },
    ],
  },
  Jax: {
    zero: [
      { pt: "0 vitórias — nem o poste de iluminação te ilumina o caminho.", en: "0 wins — not even the lamppost lights the way for you." },
      { pt: "Grandmaster at Arms, mas sem grandes resultados.", en: "Grandmaster at Arms, but with no grand results." },
    ],
    few: [
      { pt: "Já riste (taunt) até uma vitória ou duas.", en: "You've laughed (taunt) your way to a win or two." },
      { pt: "O poste começa a acertar nos sítios certos.", en: "The lamppost is starting to land in the right spots." },
    ],
    many: [
      { pt: "Multi-vencedor — esse mestre das armas já domina tudo.", en: "Multi-time winner — that weapons master has mastered everything now." },
      { pt: "Já és lendário com qualquer arma, vitórias incluídas.", en: "You're legendary with any weapon now, wins included." },
    ],
  },
  Jayce: {
    zero: [
      { pt: "0 vitórias — nem o martelo transformável constrói essa vitória.", en: "0 wins — not even the transforming hammer can build this win." },
      { pt: "O defensor do amanhã só defendeu a derrota de hoje.", en: "The Defender of Tomorrow only defended today's defeat." },
    ],
    few: [
      { pt: "Já transformaste uma vitória ou duas com o teu martelo-canhão.", en: "You've transformed your way to a win or two with your hammer-cannon." },
      { pt: "Piltover começa a confiar mais em ti, devagarinho.", en: "Piltover is starting to trust you more, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse defensor já domina as duas formas.", en: "Multi-time winner — that defender has mastered both forms now." },
      { pt: "Já és o herói de Piltover, vitórias incluídas.", en: "You're Piltover's hero now, wins included." },
    ],
  },
  Jhin: {
    zero: [
      { pt: "0 vitórias — nem 4 tiros certeiros fazem uma vitória.", en: "0 wins — not even 4 clean shots make a victory." },
      { pt: "A arte da morte devia era ter mais arte e menos derrota.", en: "The art of death should have more art and fewer defeats." },
    ],
    few: [
      { pt: "Já disparaste um 4º tiro certeiro o suficiente para uma vitória ou duas.", en: "You've fired a clean 4th shot for a win or two." },
      { pt: "A obra de arte começa a tomar forma, devagarinho.", en: "The work of art is starting to take shape, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa obra de arte já é uma obra-prima.", en: "Multi-time winner — that work of art is a masterpiece now." },
      { pt: "Já és o virtuoso que a Arena precisava, vitórias incluídas.", en: "You're the virtuoso the Arena needed, wins included." },
    ],
  },
  Jinx: {
    zero: [
      { pt: "0 vitórias — nem o canhão de foguetes acerta uma vitória sequer.", en: "0 wins — not even the rocket launcher can hit a single win." },
      { pt: "Caos a mais e vitórias a menos, típico.", en: "Too much chaos and too few wins, typical." },
    ],
    few: [
      { pt: "Já causaste caos suficiente para uma vitória ou duas.", en: "You've caused enough chaos for a win or two." },
      { pt: "A troca de armas começa a acertar no momento certo.", en: "The weapon swap is starting to land at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse caos já é organizado (a teu favor).", en: "Multi-time winner — that chaos is organized now (in your favor)." },
      { pt: "Já és a loose cannon mais perigosa da Arena.", en: "You're the most dangerous loose cannon in the Arena now." },
    ],
  },
  Kaisa: {
    zero: [
      { pt: "0 vitórias — nem as armas evoluídas do Vazio evoluem essa série de derrotas.", en: "0 wins — not even the Void's evolved weapons can evolve this losing streak." },
      { pt: "Escapaste ao Vazio, mas não escapaste às derrotas.", en: "You escaped the Void, but you didn't escape the losses." },
    ],
    few: [
      { pt: "Já evoluíste uma arma o suficiente para uma vitória ou duas.", en: "You've evolved a weapon well enough for a win or two." },
      { pt: "O Vazio começa a compensar, devagarinho.", en: "The Void is starting to pay off, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa evolução já está completa.", en: "Multi-time winner — that evolution is complete now." },
      { pt: "Já dominas o Vazio e as vitórias, filha dele.", en: "You rule the Void and the wins now, daughter of it." },
    ],
  },
  Kalista: {
    zero: [
      { pt: "0 vitórias — nem o juramento espectral cumpre essa promessa de vitória.", en: "0 wins — not even the spectral oath fulfills that promise of victory." },
      { pt: "A vingança devia era ser mais eficaz do que isto.", en: "Vengeance should really be more effective than this." },
    ],
    few: [
      { pt: "Já cumpriste um juramento ou dois rumo à vitória.", en: "You've fulfilled an oath or two on the way to victory." },
      { pt: "As lanças começam a acertar no alvo certo.", en: "The spears are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa vingança já está bem servida.", en: "Multi-time winner — that vengeance is well served now." },
      { pt: "Já és a vingança em pessoa, vitórias incluídas.", en: "You're vengeance in person now, wins included." },
    ],
  },
  Karma: {
    zero: [
      { pt: "0 vitórias — nem o vínculo espiritual (ult) ilumina essa série de derrotas.", en: "0 wins — not even Mantra (ult) can light up this losing streak." },
      { pt: "A iluminada devia era iluminar melhor as próprias decisões.", en: "The Enlightened One should really enlighten her own decisions better." },
    ],
    few: [
      { pt: "Já iluminaste uma vitória ou duas com o mantra certo.", en: "You've lit up a win or two with the right mantra." },
      { pt: "O vínculo espiritual começa a fazer sentido.", en: "The spirit bond is starting to make sense." },
    ],
    many: [
      { pt: "Multi-vencedor — essa iluminação já é completa.", en: "Multi-time winner — that enlightenment is complete now." },
      { pt: "Já és sabedoria pura, vitórias incluídas.", en: "You're pure wisdom now, wins included." },
    ],
  },
  Karthus: {
    zero: [
      { pt: "0 vitórias — nem o requiem (ult) atravessa paredes para te safar.", en: "0 wins — not even Requiem (ult) goes through walls to save you." },
      { pt: "Nem estar morto te safa desta série de derrotas.", en: "Not even being dead saves you from this losing streak." },
    ],
    few: [
      { pt: "Já cantaste um requiem certeiro o suficiente para uma vitória ou duas.", en: "You've sung a clean Requiem for a win or two." },
      { pt: "A imortalidade começa a compensar, devagarinho.", en: "Immortality is starting to pay off, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse cântico já ecoa vitórias.", en: "Multi-time winner — that hymn echoes wins now." },
      { pt: "Já és eterno, e as vitórias também.", en: "You're eternal now, and so are the wins." },
    ],
  },
  Kassadin: {
    zero: [
      { pt: "0 vitórias — nem o riftwalk (blink) te teleporta para longe desta derrota.", en: "0 wins — not even Riftwalk can teleport you away from this defeat." },
      { pt: "O andarilho do vazio só andou de derrota em derrota.", en: "The Void Walker only walked from defeat to defeat." },
    ],
    few: [
      { pt: "Já teletransportaste até uma vitória ou duas.", en: "You've teleported your way to a win or two." },
      { pt: "Os blinks começam a acertar no timing certo.", en: "The blinks are starting to land at the right timing." },
    ],
    many: [
      { pt: "Multi-vencedor — esse riftwalk já é imparável.", en: "Multi-time winner — that Riftwalk is unstoppable now." },
      { pt: "Já dominas o Vazio de ponta a ponta, vitórias incluídas.", en: "You rule the Void end to end now, wins included." },
    ],
  },
  Katarina: {
    zero: [
      { pt: "0 vitórias — nem o reset de kills reseta essa série de derrotas.", en: "0 wins — not even the kill reset resets this losing streak." },
      { pt: "As adagas voaram todas, e nenhuma trouxe vitória.", en: "The daggers all flew, and not one brought a win." },
    ],
    few: [
      { pt: "Já resetaste até uma vitória ou duas.", en: "You've reset your way to a win or two." },
      { pt: "As adagas começam a acertar no combo certo.", en: "The daggers are starting to land in the right combo." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lâmina sinistra já não para de matar (e ganhar).", en: "Multi-time winner — that sinister blade doesn't stop killing (or winning) now." },
      { pt: "Já és puro reset, vitórias incluídas.", en: "You're pure reset now, wins included." },
    ],
  },
  Kayle: {
    zero: [
      { pt: "0 vitórias — nem as asas de fogo (ult) elevam essa série de derrotas.", en: "0 wins — not even the fiery wings (ult) can lift this losing streak." },
      { pt: "A juíza devia era julgar melhor as próprias escolhas.", en: "The judge should really judge her own choices better." },
    ],
    few: [
      { pt: "Já julgaste uma vitória ou duas com justiça.", en: "You've judged a win or two with justice." },
      { pt: "As asas começam a abrir-se no momento certo.", en: "The wings are starting to unfold at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse julgamento já é divino.", en: "Multi-time winner — that judgment is divine now." },
      { pt: "Já és fogo sagrado em pessoa, vitórias incluídas.", en: "You're holy fire in person now, wins included." },
    ],
  },
  Kayn: {
    zero: [
      { pt: "0 vitórias — nem o Rhaast te convence a lutar melhor.", en: "0 wins — not even Rhaast can convince you to fight better." },
      { pt: "A escolha entre sombra e Darkin, e nenhuma trouxe vitória.", en: "The choice between shadow and Darkin, and neither brought a win." },
    ],
    few: [
      { pt: "Já escolheste bem a forma o suficiente para uma vitória ou duas.", en: "You've picked the right form well enough for a win or two." },
      { pt: "A lâmina começa a decidir do lado certo.", en: "The blade is starting to decide on the right side." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lâmina já escolheu bem quem empunha.", en: "Multi-time winner — that blade chose its wielder well now." },
      { pt: "Já domina qualquer forma, vitórias incluídas.", en: "You master any form now, wins included." },
    ],
  },
  Kennen: {
    zero: [
      { pt: "0 vitórias — nem o raio (ult) ilumina essa série de derrotas.", en: "0 wins — not even the lightning (ult) can light up this losing streak." },
      { pt: "O ninja do trovão só trovejou em falso.", en: "The Heart of the Tempest only thundered in vain." },
    ],
    few: [
      { pt: "Já atordoaste uma vitória ou duas com shurikens elétricos.", en: "You've stunned your way to a win or two with electric shurikens." },
      { pt: "A tempestade começa a formar-se no momento certo.", en: "The storm is starting to form at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse trovão já não para de cair.", en: "Multi-time winner — that thunder doesn't stop striking now." },
      { pt: "Já dominas a tempestade toda, vitórias incluídas.", en: "You rule the whole storm now, wins included." },
    ],
  },
  Khazix: {
    zero: [
      { pt: "0 vitórias — nem evoluir (isolamento) te safa desta série de derrotas.", en: "0 wins — not even evolving (isolation) saves you from this losing streak." },
      { pt: "O caçador do Vazio devia era caçar melhores resultados.", en: "The Void's hunter should really hunt for better results." },
    ],
    few: [
      { pt: "Já evoluíste uma habilidade certa o suficiente para uma vitória ou duas.", en: "You've evolved the right ability well enough for a win or two." },
      { pt: "O isolamento começa a compensar, devagarinho.", en: "Isolation is starting to pay off, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa evolução já está completa.", en: "Multi-time winner — that evolution is complete now." },
      { pt: "Já és o predador perfeito, vitórias incluídas.", en: "You're the perfect predator now, wins included." },
    ],
  },
  Kindred: {
    zero: [
      { pt: "0 vitórias — nem a Cordeira e o Lobo aceitam essa marca de derrota.", en: "0 wins — not even the Lamb and the Wolf accept this mark of defeat." },
      { pt: "A morte em pessoa, mas sem levar ninguém à vitória.", en: "Death in person, yet leading no one to victory." },
    ],
    few: [
      { pt: "Já marcaste uma vitória ou duas com a Marca do Kindred.", en: "You've marked a win or two with the Mark of the Kindred." },
      { pt: "A caçada começa a correr melhor, devagarinho.", en: "The hunt is starting to go better, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa dupla já não falha uma caçada.", en: "Multi-time winner — that duo doesn't miss a hunt now." },
      { pt: "Já és a morte e a vida em equilíbrio, vitórias incluídas.", en: "You're death and life in balance now, wins included." },
    ],
  },
  Kled: {
    zero: [
      { pt: "0 vitórias — nem o Skaarl aguenta essa série de derrotas.", en: "0 wins — not even Skaarl can stomach this losing streak." },
      { pt: "A coragem devia era vir acompanhada de resultados.", en: "Courage should really come with results attached." },
    ],
    few: [
      { pt: "Já cavalgaste até uma vitória ou duas.", en: "You've ridden your way to a win or two." },
      { pt: "O Skaarl começa a aguentar mais tempo, devagarinho.", en: "Skaarl is starting to hold on longer, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa cavalaria já não para.", en: "Multi-time winner — that cavalry doesn't stop now." },
      { pt: "Já és puro destemor, vitórias incluídas.", en: "You're pure fearlessness now, wins included." },
    ],
  },
  KogMaw: {
    zero: [
      { pt: "0 vitórias — nem o ácido corrói essa série de derrotas.", en: "0 wins — not even the acid corrodes this losing streak." },
      { pt: "O cachorro do Vazio só ladrou para o lado errado.", en: "The Void's puppy only barked in the wrong direction." },
    ],
    few: [
      { pt: "Já derreteste uma vitória ou duas com ácido.", en: "You've melted a win or two with acid." },
      { pt: "A artilharia viva começa a acertar no alvo certo.", en: "The living artillery is starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse cachorrinho já é uma arma de destruição.", en: "Multi-time winner — that puppy is a weapon of destruction now." },
      { pt: "Já derretes tudo à frente, vitórias incluídas.", en: "You melt everything in your path now, wins included." },
    ],
  },
  KSante: {
    zero: [
      { pt: "0 vitórias — nem o All Out (ult) te safa desta derrota total.", en: "0 wins — not even All Out (ult) saves you from this total defeat." },
      { pt: "O guardião ancestral devia era guardar melhor a própria dignidade.", en: "The ancestral guardian should really guard his own dignity better." },
    ],
    few: [
      { pt: "Já protegeste uma vitória ou duas com o teu escudo.", en: "You've shielded a win or two with your barrier." },
      { pt: "A transformação começa a acontecer no momento certo.", en: "The transformation is starting to happen at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse guardião já é imparável.", en: "Multi-time winner — that guardian is unstoppable now." },
      { pt: "Já és a muralha de Nazumah, vitórias incluídas.", en: "You're the Wall of Nazumah now, wins included." },
    ],
  },
  Leblanc: {
    zero: [
      { pt: "0 vitórias — nem os espelhos (ilusões) escondem essa série de derrotas.", en: "0 wins — not even the mirror images can hide this losing streak." },
      { pt: "A enganadora só se enganou a si própria com esse histórico.", en: "The Deceiver only deceived herself with this record." },
    ],
    few: [
      { pt: "Já enganaste os inimigos o suficiente para uma vitória ou duas.", en: "You've deceived the enemy well enough for a win or two." },
      { pt: "As ilusões começam a confundir os adversários certos.", en: "The illusions are starting to confuse the right opponents." },
    ],
    many: [
      { pt: "Multi-vencedor — essa mestre do engano já não erra.", en: "Multi-time winner — that master of deception doesn't miss now." },
      { pt: "Já dominas as sombras e os disfarces, vitórias incluídas.", en: "You've mastered the shadows and the disguises, wins included." },
    ],
  },
  LeeSin: {
    zero: [
      { pt: "0 vitórias — nem o monge cego enxerga esse resultado.", en: "0 wins — not even the Blind Monk can see this result coming." },
      { pt: "O ward-kick devia era chutar-te para longe da derrota.", en: "The ward-kick should really kick you away from defeat." },
    ],
    few: [
      { pt: "Já acertaste um ward-kick certeiro o suficiente para uma vitória ou duas.", en: "You've landed a clean ward-kick for a win or two." },
      { pt: "O ki começa a fluir na direção certa.", en: "The ki is starting to flow in the right direction." },
    ],
    many: [
      { pt: "Multi-vencedor — esse monge já vê tudo (sem ver).", en: "Multi-time winner — that monk sees everything now (without seeing)." },
      { pt: "Já dominas o combo insano, vitórias incluídas.", en: "You've mastered the insane combo now, wins included." },
    ],
  },
  Leona: {
    zero: [
      { pt: "0 vitórias — nem o disco solar (ult) ilumina essa série de derrotas.", en: "0 wins — not even the solar disc (ult) can light up this losing streak." },
      { pt: "O amanhecer radiante ainda não chegou a este histórico.", en: "The radiant dawn still hasn't reached this record." },
    ],
    few: [
      { pt: "Já iniciaste uma vitória ou duas com o teu escudo solar.", en: "You've engaged your way to a win or two with your sunlight shield." },
      { pt: "O sol começa a brilhar no momento certo.", en: "The sun is starting to shine at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse sol já não se põe nunca.", en: "Multi-time winner — that sun never sets now." },
      { pt: "Já és o amanhecer em pessoa, vitórias incluídas.", en: "You're the dawn in person now, wins included." },
    ],
  },
  Lillia: {
    zero: [
      { pt: "0 vitórias — nem o pincel dos sonhos pinta essa série de derrotas.", en: "0 wins — not even the dream paintbrush can paint over this losing streak." },
      { pt: "A cerva tímida devia era ganhar mais confiança (e jogos).", en: "The shy little deer should really gain more confidence (and games)." },
    ],
    few: [
      { pt: "Já sonhaste uma vitória ou duas com o teu pincel.", en: "You've dreamed up a win or two with your brush." },
      { pt: "Os sonhos começam a tornar-se realidade, devagarinho.", en: "The dreams are starting to come true, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse sonho já é recorrente.", en: "Multi-time winner — that dream is recurring now." },
      { pt: "Já não és tão tímida assim, vitórias incluídas.", en: "You're not so shy anymore, wins included." },
    ],
  },
  Lissandra: {
    zero: [
      { pt: "0 vitórias — nem o auto-congelamento (claws) te protege desta série de derrotas.", en: "0 wins — not even self-freezing (Claws) protects you from this losing streak." },
      { pt: "A bruxa de gelo devia era congelar as próprias derrotas.", en: "The Ice Witch should really freeze her own losses." },
    ],
    few: [
      { pt: "Já congelaste uma vitória ou duas com as tuas garras.", en: "You've frozen a win or two with your claws." },
      { pt: "O gelo começa a formar-se no momento certo.", en: "The ice is starting to form at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse gelo já é eterno.", en: "Multi-time winner — that ice is eternal now." },
      { pt: "Já dominas o inverno todo, vitórias incluídas.", en: "You rule the whole winter now, wins included." },
    ],
  },
  Lucian: {
    zero: [
      { pt: "0 vitórias — nem as duas pistolas acertam uma vitória sequer.", en: "0 wins — not even the two pistols can hit a single win." },
      { pt: "O purificador devia era purificar primeiro o próprio histórico.", en: "The Purifier should really purify his own record first." },
    ],
    few: [
      { pt: "Já disparaste as duas pistolas o suficiente para uma vitória ou duas.", en: "You've fired both pistols well enough for a win or two." },
      { pt: "A precisão começa a melhorar, devagarinho.", en: "The precision is starting to improve, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa dupla pistola já não falha.", en: "Multi-time winner — that dual pistol doesn't miss now." },
      { pt: "Já és o sentinela mais letal, vitórias incluídas.", en: "You're the deadliest Sentinel now, wins included." },
    ],
  },
  Lulu: {
    zero: [
      { pt: "0 vitórias — nem o Pix te ajuda a escapar desta série de derrotas.", en: "0 wins — not even Pix can help you escape this losing streak." },
      { pt: "Transformaste tudo em esquilo, menos a derrota em vitória.", en: "You've turned everything into a squirrel, except the loss into a win." },
    ],
    few: [
      { pt: "Já polimorfizaste (transformaste) uma vitória ou duas.", en: "You've polymorphed your way to a win or two." },
      { pt: "O Pix começa a acertar os feitiços certos.", en: "Pix is starting to land the right spells." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fada já não erra nenhum polimorfo.", en: "Multi-time winner — that fairy doesn't miss a single polymorph now." },
      { pt: "Já és puro caos fofinho, vitórias incluídas.", en: "You're pure adorable chaos now, wins included." },
    ],
  },
  Lux: {
    zero: [
      { pt: "0 vitórias — nem o prisma final (ult) ilumina essa série de derrotas.", en: "0 wins — not even Final Spark (ult) can light up this losing streak." },
      { pt: "A luz de Demacia apagou-se antes da vitória.", en: "The Light of Demacia went out before the victory." },
    ],
    few: [
      { pt: "Já prendeste uma vitória ou duas com o teu bind.", en: "You've trapped a win or two with your bind." },
      { pt: "A luz começa a brilhar no momento certo.", en: "The light is starting to shine at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa luz já não se apaga nunca.", en: "Multi-time winner — that light never goes out now." },
      { pt: "Já és a luz que guia Demacia, vitórias incluídas.", en: "You're the light that guides Demacia now, wins included." },
    ],
  },
  Malphite: {
    zero: [
      { pt: "0 vitórias — nem o Unstoppable Force (ult) esmaga essa série de derrotas.", en: "0 wins — not even Unstoppable Force (ult) can smash through this losing streak." },
      { pt: "A montanha de pedra devia era desmoronar essa derrota toda.", en: "The mountain of rock should really crumble this whole defeat away." },
    ],
    few: [
      { pt: "Já esmagaste uma vitória ou duas com o teu ult.", en: "You've smashed a win or two with your ult." },
      { pt: "A pedra começa a acertar no ângulo certo.", en: "The rock is starting to land at the right angle." },
    ],
    many: [
      { pt: "Multi-vencedor — essa montanha já não para de esmagar.", en: "Multi-time winner — that mountain doesn't stop crushing now." },
      { pt: "Já és puro granito, vitórias incluídas.", en: "You're pure granite now, wins included." },
    ],
  },
  Malzahar: {
    zero: [
      { pt: "0 vitórias — nem o suppress (ult) te safa desta série de derrotas.", en: "0 wins — not even the suppress (ult) saves you from this losing streak." },
      { pt: "O profeta do Vazio devia era profetizar melhor os próprios resultados.", en: "The Prophet of the Void should really prophesy his own results better." },
    ],
    few: [
      { pt: "Já suprimiste uma vitória ou duas com o teu ult.", en: "You've suppressed your way to a win or two with your ult." },
      { pt: "Os voidlings começam a acertar nos alvos certos.", en: "The voidlings are starting to hit the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — essa profecia já se cumpriu totalmente.", en: "Multi-time winner — that prophecy has fully come true now." },
      { pt: "Já és o arauto do Vazio, vitórias incluídas.", en: "You're the Void's herald now, wins included." },
    ],
  },
  Maokai: {
    zero: [
      { pt: "0 vitórias — nem os sapling toss (arremessos) atingem uma vitória.", en: "0 wins — not even Sapling Toss can hit a single win." },
      { pt: "O treant torto devia era enraizar melhor as próprias jogadas.", en: "The twisted treant should really root his own plays better." },
    ],
    few: [
      { pt: "Já arremessaste uma vitória ou duas com sementes.", en: "You've tossed a win or two with saplings." },
      { pt: "As raízes começam a prender os alvos certos.", en: "The roots are starting to snare the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — essa árvore já não para de crescer (e ganhar).", en: "Multi-time winner — that tree doesn't stop growing (or winning) now." },
      { pt: "Já és a floresta em pessoa, vitórias incluídas.", en: "You're the forest in person now, wins included." },
    ],
  },
  MasterYi: {
    zero: [
      { pt: "0 vitórias — nem o Wuju Style acelera essa série de derrotas.", en: "0 wins — not even Wuju Style can speed through this losing streak." },
      { pt: "O double strike só duplicou é as tuas derrotas.", en: "Double Strike only doubled your losses." },
    ],
    few: [
      { pt: "Já acertaste um double strike o suficiente para uma vitória ou duas.", en: "You've landed a Double Strike well enough for a win or two." },
      { pt: "O estilo Wuju começa a compensar, devagarinho.", en: "Wuju Style is starting to pay off, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — esse estilo já é lendário.", en: "Multi-time winner — that style is legendary now." },
      { pt: "Já dominas a espada e as vitórias, mestre.", en: "You've mastered the sword and the wins, master." },
    ],
  },
  Milio: {
    zero: [
      { pt: "0 vitórias — nem o calor (warmth) aquece essa série de derrotas.", en: "0 wins — not even the warmth can heat up this losing streak." },
      { pt: "A criança do fogo devia era acender mais confiança na equipa.", en: "The fire child should really spark more confidence in the team." },
    ],
    few: [
      { pt: "Já aqueceste uma vitória ou duas com o teu calor.", en: "You've warmed up a win or two with your warmth." },
      { pt: "O fogo começa a espalhar-se no momento certo.", en: "The fire is starting to spread at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse calorzinho já derrete tudo.", en: "Multi-time winner — that little warmth melts everything now." },
      { pt: "Já és o suporte mais quentinho, vitórias incluídas.", en: "You're the coziest support now, wins included." },
    ],
  },
  MissFortune: {
    zero: [
      { pt: "0 vitórias — nem o Bullet Time (ult) acerta essa série de derrotas.", en: "0 wins — not even Bullet Time (ult) can hit this losing streak." },
      { pt: "A caçadora de recompensas devia era caçar melhores resultados.", en: "The Bounty Hunter should really hunt for better results." },
    ],
    few: [
      { pt: "Já acertaste um Bullet Time o suficiente para uma vitória ou duas.", en: "You've landed a Bullet Time well enough for a win or two." },
      { pt: "As balas começam a acertar no alvo certo.", en: "The bullets are starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa chuva de balas já não falha.", en: "Multi-time winner — that bullet rain doesn't miss now." },
      { pt: "Já és a fortuna em pessoa, vitórias incluídas.", en: "You're fortune in person now, wins included." },
    ],
  },
  MonkeyKing: {
    zero: [
      { pt: "0 vitórias — nem o clone (decoy) engana essa série de derrotas.", en: "0 wins — not even the Decoy can trick this losing streak." },
      { pt: "O rei macaco devia era pedir dicas ao próprio cajado.", en: "The Monkey King should really ask his own staff for tips." },
    ],
    few: [
      { pt: "Já enganaste os inimigos o suficiente para uma vitória ou duas.", en: "You've tricked the enemy well enough for a win or two." },
      { pt: "O cajado começa a crescer no momento certo.", en: "The staff is starting to grow at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse truque já não engana só os inimigos, ganha jogos.", en: "Multi-time winner — that trick doesn't just fool enemies now, it wins games." },
      { pt: "Já és o lendário rei macaco, vitórias incluídas.", en: "You're the legendary Monkey King now, wins included." },
    ],
  },
  Mordekaiser: {
    zero: [
      { pt: "0 vitórias — nem o Reino da Morte (ult) te salva desta série de derrotas.", en: "0 wins — not even the Realm of Death (ult) saves you from this losing streak." },
      { pt: "O revenant de ferro devia era enferrujar as próprias derrotas.", en: "The iron revenant should really rust away his own losses." },
    ],
    few: [
      { pt: "Já arrastaste uma vitória ou duas para o teu reino.", en: "You've dragged a win or two into your realm." },
      { pt: "O ferro começa a acertar nos ângulos certos.", en: "The iron is starting to land at the right angles." },
    ],
    many: [
      { pt: "Multi-vencedor — esse reino já é só teu.", en: "Multi-time winner — that realm is all yours now." },
      { pt: "Já és o senhor da morte em pessoa, vitórias incluídas.", en: "You're the lord of death in person now, wins included." },
    ],
  },
  Morgana: {
    zero: [
      { pt: "0 vitórias — nem as correntes (bind) prendem essa série de derrotas.", en: "0 wins — not even the chains (bind) can trap this losing streak." },
      { pt: "O escudo negro devia era proteger-te da vergonha, não do dano.", en: "The Black Shield should really protect you from embarrassment, not damage." },
    ],
    few: [
      { pt: "Já prendeste uma vitória ou duas com as tuas correntes.", en: "You've bound a win or two with your chains." },
      { pt: "O escudo negro começa a bloquear as coisas certas.", en: "The Black Shield is starting to block the right things." },
    ],
    many: [
      { pt: "Multi-vencedor — esse escudo já é impenetrável.", en: "Multi-time winner — that shield is impenetrable now." },
      { pt: "Já és o anjo caído mais temido, vitórias incluídas.", en: "You're the most feared fallen angel now, wins included." },
    ],
  },
  Naafiri: {
    zero: [
      { pt: "0 vitórias — nem a matilha inteira consegue caçar uma vitória.", en: "0 wins — not even the whole pack can hunt down a single win." },
      { pt: "Muitos cães, zero mordidas que valessem a pena.", en: "So many hounds, zero bites that actually mattered." },
    ],
    few: [
      { pt: "Já caçaste uma vitória ou duas com a matilha.", en: "You've hunted down a win or two with the pack." },
      { pt: "Os cães começam a morder no sítio certo.", en: "The hounds are starting to bite in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — essa matilha já não falha a presa.", en: "Multi-time winner — that pack doesn't miss the prey now." },
      { pt: "Já lideras a matilha toda, vitórias incluídas.", en: "You lead the whole pack now, wins included." },
    ],
  },
  Nami: {
    zero: [
      { pt: "0 vitórias — nem o tsunami (ult) varre essa série de derrotas.", en: "0 wins — not even the tsunami (ult) can sweep away this losing streak." },
      { pt: "A curandeira das marés só trouxe maré vazia de vitórias.", en: "The Tidecaller only brought an empty tide of wins." },
    ],
    few: [
      { pt: "Já curaste uma vitória ou duas com as marés certas.", en: "You've healed your way to a win or two with the right tides." },
      { pt: "A onda começa a acertar no momento certo.", en: "The wave is starting to land at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa maré já não para de subir.", en: "Multi-time winner — that tide doesn't stop rising now." },
      { pt: "Já dominas o oceano todo, vitórias incluídas.", en: "You rule the whole ocean now, wins included." },
    ],
  },
  Nasus: {
    zero: [
      { pt: "0 vitórias — nem o wither (murchar) faz murchar essa série de derrotas.", en: "0 wins — not even Wither can wilt this losing streak." },
      { pt: "O curador das areias devia era curar primeiro o próprio histórico.", en: "The Curator of the Sands should really cure his own record first." },
    ],
    few: [
      { pt: "Já acumulaste stacks suficientes para uma vitória ou duas.", en: "You've stacked up enough for a win or two." },
      { pt: "O siphoning strike começa a acertar em cheio.", en: "Siphoning Strike is starting to land clean." },
    ],
    many: [
      { pt: "Multi-vencedor — esse Q já está gigante.", en: "Multi-time winner — that Q is massive now." },
      { pt: "Já és o cão mais forte da Arena, vitórias incluídas.", en: "You're the strongest dog in the Arena now, wins included." },
    ],
  },
  Nautilus: {
    zero: [
      { pt: "0 vitórias — nem a âncora (gancho) puxa essa vitória para perto.", en: "0 wins — not even the anchor (hook) can pull this win close." },
      { pt: "O titã das profundezas devia era afundar melhor os adversários.", en: "The Titan of the Depths should really sink the enemies better." },
    ],
    few: [
      { pt: "Já puxaste uma vitória ou duas com a âncora.", en: "You've hooked a win or two with the anchor." },
      { pt: "O gancho começa a acertar no alvo certo.", en: "The hook is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa âncora já não larga ninguém.", en: "Multi-time winner — that anchor doesn't let go of anyone now." },
      { pt: "Já és o titã dos mares, vitórias incluídas.", en: "You're the titan of the seas now, wins included." },
    ],
  },
  Neeko: {
    zero: [
      { pt: "0 vitórias — nem disfarçar-te de aliado te safa desta série de derrotas.", en: "0 wins — not even disguising as an ally saves you from this losing streak." },
      { pt: "O camaleão mudou tudo, menos o resultado.", en: "The chameleon changed everything, except the result." },
    ],
    few: [
      { pt: "Já enganaste os inimigos o suficiente para uma vitória ou duas.", en: "You've fooled the enemy well enough for a win or two." },
      { pt: "O disfarce começa a enganar quem interessa.", en: "The disguise is starting to fool the right people." },
    ],
    many: [
      { pt: "Multi-vencedor — esse disfarce já não falha nunca.", en: "Multi-time winner — that disguise never fails now." },
      { pt: "Já dominas a arte da ilusão, vitórias incluídas.", en: "You've mastered the art of illusion now, wins included." },
    ],
  },
  Nidalee: {
    zero: [
      { pt: "0 vitórias — nem a forma de puma caça essa série de derrotas.", en: "0 wins — not even cougar form can hunt down this losing streak." },
      { pt: "A caçadora selvagem devia era caçar melhores resultados.", en: "The Bestial Huntress should really hunt for better results." },
    ],
    few: [
      { pt: "Já acertaste uma lança certeira o suficiente para uma vitória ou duas.", en: "You've landed a clean spear for a win or two." },
      { pt: "A transformação começa a acontecer no momento certo.", en: "The transformation is starting to happen at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa caçadora já não falha uma presa.", en: "Multi-time winner — that huntress doesn't miss a prey now." },
      { pt: "Já dominas a selva toda, vitórias incluídas.", en: "You rule the whole jungle now, wins included." },
    ],
  },
  Nilah: {
    zero: [
      { pt: "0 vitórias — nem a alegria desmedida (joy unbound) alegra essa série de derrotas.", en: "0 wins — not even joy unbound can brighten up this losing streak." },
      { pt: "O chicote só chicoteou o teu próprio orgulho.", en: "The whip only whipped your own pride." },
    ],
    few: [
      { pt: "Já partilhaste uma vitória ou duas com o teu lifesteal.", en: "You've shared a win or two with your lifesteal." },
      { pt: "O chicote começa a acertar no alvo certo.", en: "The whip is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa alegria já é contagiante.", en: "Multi-time winner — that joy is contagious now." },
      { pt: "Já és pura felicidade e vitórias, finalmente livre.", en: "You're pure joy and wins now, finally free." },
    ],
  },
  Nocturne: {
    zero: [
      { pt: "0 vitórias — nem o pesadelo eterno (ult) assusta essa série de derrotas.", en: "0 wins — not even the eternal nightmare (ult) scares away this losing streak." },
      { pt: "A escuridão só escondeu é a tua falta de resultados.", en: "The darkness only hid your lack of results." },
    ],
    few: [
      { pt: "Já assombraste uma vitória ou duas na escuridão.", en: "You've haunted a win or two in the darkness." },
      { pt: "O terror começa a espalhar-se no momento certo.", en: "The terror is starting to spread at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse pesadelo já não tem fim.", en: "Multi-time winner — that nightmare has no end now." },
      { pt: "Já és o medo em pessoa, vitórias incluídas.", en: "You're fear in person now, wins included." },
    ],
  },
  Nunu: {
    zero: [
      { pt: "0 vitórias — nem a bola de neve gigante (ult) esmaga essa série de derrotas.", en: "0 wins — not even the giant snowball (ult) can crush this losing streak." },
      { pt: "O rapaz e o Yeti só devoraram (consume) as próprias esperanças.", en: "The boy and the Yeti only devoured (Consume) their own hopes." },
    ],
    few: [
      { pt: "Já esmagaste uma vitória ou duas com a bola de neve.", en: "You've crushed a win or two with the snowball." },
      { pt: "A amizade com o Willump começa a compensar.", en: "The friendship with Willump is starting to pay off." },
    ],
    many: [
      { pt: "Multi-vencedor — essa bola de neve já não para de crescer.", en: "Multi-time winner — that snowball doesn't stop growing now." },
      { pt: "Já são a melhor dupla da Arena, vitórias incluídas.", en: "You're the Arena's best duo now, wins included." },
    ],
  },
  Olaf: {
    zero: [
      { pt: "0 vitórias — nem a fúria imortal (ult) te safa desta série de derrotas.", en: "0 wins — not even Ragnarok (ult) saves you from this losing streak." },
      { pt: "O berserker devia era enfurecer-se com o próprio histórico.", en: "The berserker should really rage at his own record." },
    ],
    few: [
      { pt: "Já enlouqueceste até uma vitória ou duas.", en: "You've raged your way to a win or two." },
      { pt: "Os machados começam a acertar em cheio.", en: "The axes are starting to land clean." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fúria já não para nunca.", en: "Multi-time winner — that rage never stops now." },
      { pt: "Já és imparável e imortal, vitórias incluídas.", en: "You're unstoppable and immortal now, wins included." },
    ],
  },
  Orianna: {
    zero: [
      { pt: "0 vitórias — nem a bola de comando controla essa série de derrotas.", en: "0 wins — not even the Ball can command this losing streak." },
      { pt: "A garota mecânica só engripou nas vitórias.", en: "The Lady of Clockwork only jammed up on the wins." },
    ],
    few: [
      { pt: "Já comandaste uma vitória ou duas com a bola.", en: "You've commanded a win or two with the Ball." },
      { pt: "As engrenagens começam a girar no sentido certo.", en: "The gears are starting to turn the right way." },
    ],
    many: [
      { pt: "Multi-vencedor — essa bola já não erra o alvo.", en: "Multi-time winner — that Ball doesn't miss the target now." },
      { pt: "Já és a maestrina da Arena, vitórias incluídas.", en: "You're the Arena's maestro now, wins included." },
    ],
  },
  Ornn: {
    zero: [
      { pt: "0 vitórias — nem a forja da montanha aquece essa série de derrotas.", en: "0 wins — not even the mountain's forge can heat up this losing streak." },
      { pt: "O deus do fogo devia era forjar melhores resultados.", en: "The god of fire should really forge better results." },
    ],
    few: [
      { pt: "Já forjaste uma vitória ou duas com a bigorna.", en: "You've forged a win or two with the anvil." },
      { pt: "O fogo começa a arder no sítio certo.", en: "The fire is starting to burn in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — essa forja já não para de produzir vitórias.", en: "Multi-time winner — that forge doesn't stop producing wins now." },
      { pt: "Já és o deus da montanha, com resultados a condizer.", en: "You're the god below the mountain now, results to match." },
    ],
  },
  Pantheon: {
    zero: [
      { pt: "0 vitórias — nem a lança inquebrável quebra essa série de derrotas.", en: "0 wins — not even the unbreakable spear can break this losing streak." },
      { pt: "O guerreiro imortal devia era rever a própria imortalidade.", en: "The unbreakable warrior should really reconsider his own immortality." },
    ],
    few: [
      { pt: "Já saltaste (ult) para uma vitória ou duas.", en: "You've leaped (ult) your way to a win or two." },
      { pt: "A lança começa a acertar no ângulo certo.", en: "The spear is starting to land at the right angle." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lança já não erra o alvo.", en: "Multi-time winner — that spear doesn't miss the target now." },
      { pt: "Já és o guerreiro perfeito, vitórias incluídas.", en: "You're the perfect warrior now, wins included." },
    ],
  },
  Poppy: {
    zero: [
      { pt: "0 vitórias — nem o martelo (heroic charge) bate essa série de derrotas.", en: "0 wins — not even the hammer (Heroic Charge) can break this losing streak." },
      { pt: "A guardiã do martelo devia era guardar melhor os próprios resultados.", en: "The Keeper of the Hammer should really keep her own results better." },
    ],
    few: [
      { pt: "Já bloqueaste uma investida o suficiente para uma vitória ou duas.", en: "You've blocked a charge well enough for a win or two." },
      { pt: "A parede mágica começa a parar os dashes certos.", en: "The magic wall is starting to stop the right dashes." },
    ],
    many: [
      { pt: "Multi-vencedor — essa parede já não deixa passar nada.", en: "Multi-time winner — that wall doesn't let anything through now." },
      { pt: "Já és a guardiã perfeita, vitórias incluídas.", en: "You're the perfect keeper now, wins included." },
    ],
  },
  Pyke: {
    zero: [
      { pt: "0 vitórias — nem o execute (ult) finaliza essa série de derrotas.", en: "0 wins — not even the execute (ult) can finish off this losing streak." },
      { pt: "O carniceiro do porto sangriento devia era carniçar melhores resultados.", en: "The Bloodharbor Ripper should really rip apart better results." },
    ],
    few: [
      { pt: "Já executaste uma vitória ou duas com o gancho.", en: "You've executed a win or two with the hook." },
      { pt: "As sombras começam a acertar no alvo certo.", en: "The shadows are starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse gancho já não falha a execução.", en: "Multi-time winner — that hook doesn't miss the execution now." },
      { pt: "Já és o pesadelo do porto, vitórias incluídas.", en: "You're the nightmare of the harbor now, wins included." },
    ],
  },
  Qiyana: {
    zero: [
      { pt: "0 vitórias — nem controlar os elementos controla essa série de derrotas.", en: "0 wins — not even controlling the elements can control this losing streak." },
      { pt: "A imperatriz dos elementos devia era imperar melhor sobre o próprio jogo.", en: "The Empress of the Elements should really reign better over her own game." },
    ],
    few: [
      { pt: "Já combinaste os elementos o suficiente para uma vitória ou duas.", en: "You've combined the elements well enough for a win or two." },
      { pt: "O terreno começa a jogar a teu favor.", en: "The terrain is starting to play in your favor." },
    ],
    many: [
      { pt: "Multi-vencedor — esse combo elemental já não falha.", en: "Multi-time winner — that elemental combo doesn't miss now." },
      { pt: "Já dominas terra, água e fogo, vitórias incluídas.", en: "You rule earth, water, and fire now, wins included." },
    ],
  },
  Quinn: {
    zero: [
      { pt: "0 vitórias — nem o Valor (águia) voa por cima dessa série de derrotas.", en: "0 wins — not even Valor (the hawk) can fly over this losing streak." },
      { pt: "A batedora de Demacia devia era explorar melhores estratégias.", en: "Demacia's scout should really explore better strategies." },
    ],
    few: [
      { pt: "Já voastes (tu e o Valor) até uma vitória ou duas.", en: "You and Valor have flown your way to a win or two." },
      { pt: "A vigilância começa a compensar, devagarinho.", en: "The vigilance is starting to pay off, little by little." },
    ],
    many: [
      { pt: "Multi-vencedor — essa dupla já não larga a presa.", en: "Multi-time winner — that duo doesn't let go of the prey now." },
      { pt: "Já dominas os céus e as vitórias, batedora.", en: "You rule the skies and the wins now, scout." },
    ],
  },
  Rakan: {
    zero: [
      { pt: "0 vitórias — nem a dança (charme) encanta essa série de derrotas.", en: "0 wins — not even the dance (charm) can enchant this losing streak." },
      { pt: "O sedutor devia era seduzir melhor os resultados.", en: "The charmer should really charm the results better." },
    ],
    few: [
      { pt: "Já encantaste uma vitória ou duas com a tua dança.", en: "You've charmed a win or two with your dance." },
      { pt: "O vento começa a soprar no ritmo certo.", en: "The wind is starting to blow to the right rhythm." },
    ],
    many: [
      { pt: "Multi-vencedor — essa dança já é perfeita.", en: "Multi-time winner — that dance is flawless now." },
      { pt: "Já és o par perfeito (e vencedor), charmoso.", en: "You're the perfect (and winning) partner now, charmer." },
    ],
  },
  Rammus: {
    zero: [
      { pt: "0 vitórias — nem enrolar em bola (powerball) rola até uma vitória.", en: "0 wins — not even curling into a ball (Powerball) rolls into a win." },
      { pt: "'Ok' é a única coisa que dizes, porque as vitórias não aparecem.", en: "'Ok' is the only thing you say, because the wins never show up." },
    ],
    few: [
      { pt: "Já rolaste até uma vitória ou duas.", en: "You've rolled your way to a win or two." },
      { pt: "A armadura começa a bloquear os golpes certos.", en: "The armor is starting to block the right hits." },
    ],
    many: [
      { pt: "Multi-vencedor — esse tatu já não para de rolar (para a vitória).", en: "Multi-time winner — that armadillo doesn't stop rolling now (toward victory)." },
      { pt: "Já és a bola de destruição perfeita, vitórias incluídas.", en: "You're the perfect wrecking ball now, wins included." },
    ],
  },
  RekSai: {
    zero: [
      { pt: "0 vitórias — nem os túneis escondem essa série de derrotas.", en: "0 wins — not even the tunnels can hide this losing streak." },
      { pt: "A devoradora do Vazio devia era devorar melhores resultados.", en: "The Void Burrower should really devour better results." },
    ],
    few: [
      { pt: "Já emboscaste uma vitória ou duas pelos túneis.", en: "You've ambushed a win or two through the tunnels." },
      { pt: "As tocas começam a aparecer no sítio certo.", en: "The burrows are starting to pop up in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — essa devoradora já não falha uma emboscada.", en: "Multi-time winner — that burrower doesn't miss an ambush now." },
      { pt: "Já dominas o subsolo todo, vitórias incluídas.", en: "You rule the whole underground now, wins included." },
    ],
  },
  Rell: {
    zero: [
      { pt: "0 vitórias — nem a armadura viva (ferromante) blinda essa série de derrotas.", en: "0 wins — not even the living armor (ferromancer) can armor this losing streak." },
      { pt: "A donzela de ferro devia era blindar melhor os próprios resultados.", en: "The Iron Maiden should really armor her own results better." },
    ],
    few: [
      { pt: "Já protegeste uma vitória ou duas com a tua armadura.", en: "You've armored a win or two with your gear." },
      { pt: "A transformação começa a acontecer no momento certo.", en: "The transformation is starting to happen at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa armadura já é impenetrável.", en: "Multi-time winner — that armor is impenetrable now." },
      { pt: "Já és a ferromante perfeita, vitórias incluídas.", en: "You're the perfect ferromancer now, wins included." },
    ],
  },
  Renata: {
    zero: [
      { pt: "0 vitórias — nem controlar a mente do inimigo (ult) controla essa derrota.", en: "0 wins — not even mind-controlling the enemy (ult) controls this defeat." },
      { pt: "A baronesa química devia era rever a própria fórmula de vitória.", en: "The Chembaroness should really revise her own formula for victory." },
    ],
    few: [
      { pt: "Já controlaste uma vitória ou duas com o teu ult.", en: "You've controlled a win or two with your ult." },
      { pt: "Os fios começam a puxar os aliados certos.", en: "The strings are starting to pull the right allies." },
    ],
    many: [
      { pt: "Multi-vencedor — essa baronesa já controla tudo.", en: "Multi-time winner — that baroness controls everything now." },
      { pt: "Já dominas Zaun (e as vitórias) por completo.", en: "You rule Zaun (and the wins) completely now." },
    ],
  },
  Renekton: {
    zero: [
      { pt: "0 vitórias — nem a fúria do deserto (dash) te leva a uma vitória.", en: "0 wins — not even the desert's fury (dash) can carry you to a win." },
      { pt: "O açougueiro das areias devia era açoitar melhores resultados.", en: "The Butcher of the Sands should really carve out better results." },
    ],
    few: [
      { pt: "Já cortaste uma vitória ou duas com a fúria certa.", en: "You've carved a win or two with the right fury." },
      { pt: "A fúria começa a acumular no momento certo.", en: "The fury is starting to stack at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fúria já não para de cortar.", en: "Multi-time winner — that fury doesn't stop carving now." },
      { pt: "Já és o terror do deserto, vitórias incluídas.", en: "You're the terror of the sands now, wins included." },
    ],
  },
  Rengar: {
    zero: [
      { pt: "0 vitórias — nem o colar de dentes (bonetooth) intimida essa série de derrotas.", en: "0 wins — not even the bonetooth necklace intimidates this losing streak." },
      { pt: "O caçador de troféus devia era caçar troféus a sério.", en: "The trophy hunter should really hunt for actual trophies." },
    ],
    few: [
      { pt: "Já emboscaste uma vitória ou duas do arbusto.", en: "You've ambushed a win or two from the bush." },
      { pt: "O salto começa a acertar no alvo certo.", en: "The pounce is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse caçador já não falha uma emboscada.", en: "Multi-time winner — that hunter doesn't miss an ambush now." },
      { pt: "Já és o predador perfeito, vitórias incluídas.", en: "You're the perfect predator now, wins included." },
    ],
  },
  Riven: {
    zero: [
      { pt: "0 vitórias — nem a lâmina quebrada corta essa série de derrotas.", en: "0 wins — not even the broken blade can cut through this losing streak." },
      { pt: "A exilada devia era exilar as próprias derrotas.", en: "The exile should really exile her own losses." },
    ],
    few: [
      { pt: "Já dashaste até uma vitória ou duas.", en: "You've dashed your way to a win or two." },
      { pt: "A lâmina quebrada começa a acertar mesmo assim.", en: "The broken blade is starting to land anyway." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lâmina quebrada já não precisa de estar inteira.", en: "Multi-time winner — that broken blade doesn't need to be whole now." },
      { pt: "Já dominas o combo todo, vitórias incluídas.", en: "You've mastered the whole combo now, wins included." },
    ],
  },
  Rumble: {
    zero: [
      { pt: "0 vitórias — nem a danger zone (sobreaquecer) aquece essa série de derrotas.", en: "0 wins — not even the danger zone (overheating) can heat up this losing streak." },
      { pt: "O yordle mecanizado devia era mecanizar melhores resultados.", en: "The Mechanized Menace should really engineer better results." },
    ],
    few: [
      { pt: "Já sobreaqueceste até uma vitória ou duas.", en: "You've overheated your way to a win or two." },
      { pt: "O lança-chamas começa a acertar no alvo certo.", en: "The flamethrower is starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa máquina já não para de queimar.", en: "Multi-time winner — that machine doesn't stop burning now." },
      { pt: "Já és puro perigo mecânico, vitórias incluídas.", en: "You're pure mechanical danger now, wins included." },
    ],
  },
  Ryze: {
    zero: [
      { pt: "0 vitórias — nem as runas antigas conjuram essa vitória.", en: "0 wins — not even the ancient runes can conjure this win." },
      { pt: "O mago rúnico devia era estudar melhor os próprios feitiços.", en: "The Rune Mage should really study his own spells better." },
    ],
    few: [
      { pt: "Já conjuraste uma vitória ou duas com o combo certo.", en: "You've conjured a win or two with the right combo." },
      { pt: "As runas começam a alinhar-se a teu favor.", en: "The runes are starting to align in your favor." },
    ],
    many: [
      { pt: "Multi-vencedor — esse mago já domina a magia toda.", en: "Multi-time winner — that mage has mastered all the magic now." },
      { pt: "Já és eterno e vencedor, feiticeiro.", en: "You're eternal and victorious now, spellslinger." },
    ],
  },
  Samira: {
    zero: [
      { pt: "0 vitórias — nem os pontos de estilo (ult) dão estilo a essa série de derrotas.", en: "0 wins — not even style points (ult) can add style to this losing streak." },
      { pt: "A rosa do deserto devia era florescer com mais vitórias.", en: "The Desert Rose should really bloom with more wins." },
    ],
    few: [
      { pt: "Já combinaste um estilo o suficiente para uma vitória ou duas.", en: "You've combined enough style for a win or two." },
      { pt: "O combo começa a fluir no ritmo certo.", en: "The combo is starting to flow at the right rhythm." },
    ],
    many: [
      { pt: "Multi-vencedor — esse estilo já é impecável.", en: "Multi-time winner — that style is flawless now." },
      { pt: "Já és pura elegância letal, vitórias incluídas.", en: "You're pure lethal elegance now, wins included." },
    ],
  },
  Sejuani: {
    zero: [
      { pt: "0 vitórias — nem a fúria do inverno (ult) congela essa série de derrotas.", en: "0 wins — not even Winter's Wrath (ult) can freeze this losing streak." },
      { pt: "A guerreira do Freljord devia era conquistar mais do que gelo.", en: "The Freljord's warrior should really conquer more than just ice." },
    ],
    few: [
      { pt: "Já congelaste uma vitória ou duas com o teu javali.", en: "You've frozen a win or two with your boar." },
      { pt: "O permafrost começa a prender os alvos certos.", en: "The permafrost is starting to trap the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fúria já não descongela nunca.", en: "Multi-time winner — that fury never thaws now." },
      { pt: "Já dominas o inverno todo, vitórias incluídas.", en: "You rule the whole winter now, wins included." },
    ],
  },
  Senna: {
    zero: [
      { pt: "0 vitórias — nem as almas colhidas (last hits) colhem uma vitória.", en: "0 wins — not even harvesting souls (last hits) can reap a single win." },
      { pt: "A redentora devia era redimir primeiro o próprio histórico.", en: "The Redeemer should really redeem her own record first." },
    ],
    few: [
      { pt: "Já colheste uma alma o suficiente para uma vitória ou duas.", en: "You've harvested enough souls for a win or two." },
      { pt: "A névoa começa a revelar os caminhos certos.", en: "The mist is starting to reveal the right paths." },
    ],
    many: [
      { pt: "Multi-vencedor — essa colheita de almas já rendeu bem.", en: "Multi-time winner — that soul harvest has paid off well now." },
      { pt: "Já és a redenção em pessoa, vitórias incluídas.", en: "You're redemption in person now, wins included." },
    ],
  },
  Seraphine: {
    zero: [
      { pt: "0 vitórias — nem o palco (ult) aplaude essa série de derrotas.", en: "0 wins — not even the stage (ult) applauds this losing streak." },
      { pt: "A cantora de olhar estrelado devia era cantar melhores resultados.", en: "The starry-eyed songstress should really sing up better results." },
    ],
    few: [
      { pt: "Já encantaste uma vitória ou duas com a tua música.", en: "You've charmed a win or two with your music." },
      { pt: "A plateia começa a gostar do espetáculo.", en: "The crowd is starting to enjoy the show." },
    ],
    many: [
      { pt: "Multi-vencedor — esse espetáculo já é um sucesso.", en: "Multi-time winner — that show is a hit now." },
      { pt: "Já és a estrela principal, vitórias incluídas.", en: "You're the headline act now, wins included." },
    ],
  },
  Sett: {
    zero: [
      { pt: "0 vitórias — nem os punhos (ult) esmagam essa série de derrotas.", en: "0 wins — not even the fists (ult) can smash this losing streak." },
      { pt: "O chefão devia era mandar mais nas próprias vitórias.", en: "The boss should really take more charge of his own wins." },
    ],
    few: [
      { pt: "Já esmagaste uma vitória ou duas com os punhos.", en: "You've smashed a win or two with your fists." },
      { pt: "A grip (agarrar e atirar) começa a acertar no alvo certo.", en: "The grip (grab and throw) is starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse chefão já domina o território todo.", en: "Multi-time winner — that boss rules the whole turf now." },
      { pt: "Já és o boss da Arena, vitórias incluídas.", en: "You're the boss of the Arena now, wins included." },
    ],
  },
  Shaco: {
    zero: [
      { pt: "0 vitórias — nem as caixas-surpresa (jack in the box) surpreendem essa série de derrotas.", en: "0 wins — not even the jack-in-the-box can surprise this losing streak." },
      { pt: "O bobo demoníaco devia era rir menos e ganhar mais.", en: "The Demon Jester should really laugh less and win more." },
    ],
    few: [
      { pt: "Já enganaste os inimigos o suficiente para uma vitória ou duas.", en: "You've fooled the enemy well enough for a win or two." },
      { pt: "O clone começa a confundir quem interessa.", en: "The clone is starting to confuse the right people." },
    ],
    many: [
      { pt: "Multi-vencedor — esse bobo já não erra uma emboscada.", en: "Multi-time winner — that jester doesn't miss an ambush now." },
      { pt: "Já és o pesadelo de todos, vitórias incluídas.", en: "You're everyone's nightmare now, wins included." },
    ],
  },
  Shen: {
    zero: [
      { pt: "0 vitórias — nem o escudo global (ult) protege essa série de derrotas.", en: "0 wins — not even the global shield (ult) protects against this losing streak." },
      { pt: "O olho do crepúsculo devia era vigiar melhor o próprio desempenho.", en: "The Eye of Twilight should really watch over his own performance better." },
    ],
    few: [
      { pt: "Já protegeste um aliado o suficiente para uma vitória ou duas.", en: "You've shielded an ally well enough for a win or two." },
      { pt: "As sombras começam a acertar no momento certo.", en: "The shadows are starting to land at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse ninja já não falha uma proteção.", en: "Multi-time winner — that ninja doesn't miss a shield now." },
      { pt: "Já és o guardião perfeito, vitórias incluídas.", en: "You're the perfect guardian now, wins included." },
    ],
  },
  Shyvana: {
    zero: [
      { pt: "0 vitórias — nem a forma de dragão (ult) queima essa série de derrotas.", en: "0 wins — not even dragon form (ult) can burn away this losing streak." },
      { pt: "A meio-dragão devia era mostrar mais garras nas vitórias.", en: "The Half-Dragon should really show more claws in her wins." },
    ],
    few: [
      { pt: "Já incineraste uma vitória ou duas em forma de dragão.", en: "You've torched a win or two in dragon form." },
      { pt: "As chamas começam a arder no sítio certo.", en: "The flames are starting to burn in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — esse dragão já não para de queimar tudo.", en: "Multi-time winner — that dragon doesn't stop torching everything now." },
      { pt: "Já és puro fogo dracónico, vitórias incluídas.", en: "You're pure draconic fire now, wins included." },
    ],
  },
  Singed: {
    zero: [
      { pt: "0 vitórias — nem o rasto de veneno envenena essa série de derrotas.", en: "0 wins — not even the poison trail can poison this losing streak." },
      { pt: "O químico louco devia era misturar melhores fórmulas.", en: "The Mad Chemist should really mix better formulas." },
    ],
    few: [
      { pt: "Já atiraste (fling) uma vitória ou duas para o sítio certo.", en: "You've flung a win or two to the right spot." },
      { pt: "O rasto tóxico começa a fazer efeito.", en: "The toxic trail is starting to take effect." },
    ],
    many: [
      { pt: "Multi-vencedor — esse rasto já não deixa ninguém escapar.", en: "Multi-time winner — that trail doesn't let anyone escape now." },
      { pt: "Já és o químico mais perigoso, vitórias incluídas.", en: "You're the most dangerous chemist now, wins included." },
    ],
  },
  Sion: {
    zero: [
      { pt: "0 vitórias — nem estar morto te safa desta série de derrotas.", en: "0 wins — not even being dead saves you from this losing streak." },
      { pt: "A carga sem cabeça (ult) só carregou para a derrota.", en: "The headless charge (ult) only charged straight into defeat." },
    ],
    few: [
      { pt: "Já carregaste uma vitória ou duas mesmo sem cabeça.", en: "You've charged your way to a win or two, even without a head." },
      { pt: "O escudo começa a explodir no momento certo.", en: "The shield is starting to explode at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse morto-vivo já não para de ganhar.", en: "Multi-time winner — that undead doesn't stop winning now." },
      { pt: "Já és imparável mesmo sem cabeça, vitórias incluídas.", en: "You're unstoppable even without a head now, wins included." },
    ],
  },
  Sivir: {
    zero: [
      { pt: "0 vitórias — nem o bumerangue (ricochet) volta com uma vitória.", en: "0 wins — not even the boomerang (ricochet) comes back with a win." },
      { pt: "A senhora da batalha devia era batalhar melhor pelas vitórias.", en: "The Battle Mistress should really battle harder for wins." },
    ],
    few: [
      { pt: "Já ricocheteaste até uma vitória ou duas.", en: "You've ricocheted your way to a win or two." },
      { pt: "O escudo mágico começa a bloquear as coisas certas.", en: "The spell shield is starting to block the right things." },
    ],
    many: [
      { pt: "Multi-vencedor — esse bumerangue já não falha nada.", en: "Multi-time winner — that boomerang doesn't miss anything now." },
      { pt: "Já dominas o wave clear e as vitórias, senhora da guerra.", en: "You've mastered wave clear and the wins now, battle mistress." },
    ],
  },
  Skarner: {
    zero: [
      { pt: "0 vitórias — nem os cristais do vanguarda protegem essa série de derrotas.", en: "0 wins — not even the vanguard's crystals can protect against this losing streak." },
      { pt: "O guardião de cristal devia era guardar melhores resultados.", en: "The crystal guardian should really guard better results." },
    ],
    few: [
      { pt: "Já picaste (sting) uma vitória ou duas com a cauda.", en: "You've stung a win or two with the tail." },
      { pt: "Os cristais começam a ressoar no momento certo.", en: "The crystals are starting to resonate at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse guardião já domina os cristais todos.", en: "Multi-time winner — that guardian has mastered all the crystals now." },
      { pt: "Já és a força da terra, vitórias incluídas.", en: "You're the strength of the earth now, wins included." },
    ],
  },
  Smolder: {
    zero: [
      { pt: "0 vitórias — nem as bolas de fogo acumuladas acendem essa série de derrotas.", en: "0 wins — not even stacked fireballs can spark this losing streak alight." },
      { pt: "O pequeno dragão devia era crescer mais depressa (em vitórias).", en: "The little dragon should really grow up faster (in wins)." },
    ],
    few: [
      { pt: "Já acumulaste stacks o suficiente para uma vitória ou duas.", en: "You've stacked up enough for a win or two." },
      { pt: "As chamas começam a crescer no ritmo certo.", en: "The flames are starting to grow at the right pace." },
    ],
    many: [
      { pt: "Multi-vencedor — esse dragãozinho já não é tão pequeno assim.", en: "Multi-time winner — that little dragon isn't so little anymore." },
      { pt: "Já és o príncipe dragão em pleno voo, vitórias incluídas.", en: "You're the dragon prince in full flight now, wins included." },
    ],
  },
  Sona: {
    zero: [
      { pt: "0 vitórias — nem os power chords (acordes) tocam essa série de derrotas.", en: "0 wins — not even power chords can play through this losing streak." },
      { pt: "A musa das cordas devia era afinar melhor o próprio jogo.", en: "The Maven of the Strings should really tune her own game better." },
    ],
    few: [
      { pt: "Já tocaste um acorde o suficiente para uma vitória ou duas.", en: "You've played a chord well enough for a win or two." },
      { pt: "A música começa a acertar no ritmo certo.", en: "The music is starting to hit the right rhythm." },
    ],
    many: [
      { pt: "Multi-vencedor — essa música já é uma sinfonia de vitórias.", en: "Multi-time winner — that music is a symphony of wins now." },
      { pt: "Já és a melodia perfeita, mesmo sem falar.", en: "You're the perfect melody now, even without a word." },
    ],
  },
  Soraka: {
    zero: [
      { pt: "0 vitórias — nem o desejo (wish, cura global) cura essa série de derrotas.", en: "0 wins — not even Wish (the global heal) can heal this losing streak." },
      { pt: "A criança das estrelas devia era desejar melhores resultados.", en: "The Starchild should really wish for better results." },
    ],
    few: [
      { pt: "Já curaste uma vitória ou duas à distância.", en: "You've healed a win or two from a distance." },
      { pt: "As estrelas começam a alinhar-se a teu favor.", en: "The stars are starting to align in your favor." },
    ],
    many: [
      { pt: "Multi-vencedor — esse desejo já se realizou por completo.", en: "Multi-time winner — that wish has fully come true now." },
      { pt: "Já és a cura perfeita, vitórias incluídas.", en: "You're the perfect cure now, wins included." },
    ],
  },
  Swain: {
    zero: [
      { pt: "0 vitórias — nem o corvo demoníaco (ult) devora essa série de derrotas.", en: "0 wins — not even the demonic raven (ult) can devour this losing streak." },
      { pt: "O grande general devia era comandar melhores estratégias.", en: "The Grand General should really command better strategies." },
    ],
    few: [
      { pt: "Já drenaste uma vitória ou duas com o teu corvo.", en: "You've drained a win or two with your raven." },
      { pt: "A transformação demoníaca começa a compensar.", en: "The demonic transformation is starting to pay off." },
    ],
    many: [
      { pt: "Multi-vencedor — esse general já não perde uma batalha.", en: "Multi-time winner — that general doesn't lose a battle now." },
      { pt: "Já comandas Noxus e as vitórias, general.", en: "You command Noxus and the wins now, general." },
    ],
  },
  Sylas: {
    zero: [
      { pt: "0 vitórias — nem roubar ultimates (ult) rouba essa série de derrotas.", en: "0 wins — not even stealing ultimates (ult) can steal you out of this losing streak." },
      { pt: "O desacorrentado devia era acorrentar melhores resultados.", en: "The Unshackled should really chain up better results." },
    ],
    few: [
      { pt: "Já roubaste um ultimate o suficiente para uma vitória ou duas.", en: "You've stolen an ultimate well enough for a win or two." },
      { pt: "As correntes começam a acertar no alvo certo.", en: "The chains are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse ladrão de feitiços já não falha um roubo.", en: "Multi-time winner — that spell thief doesn't miss a steal now." },
      { pt: "Já dominas qualquer ultimate, vitórias incluídas.", en: "You master any ultimate now, wins included." },
    ],
  },
  Syndra: {
    zero: [
      { pt: "0 vitórias — nem as esferas negras (força de vontade) esmagam essa série de derrotas.", en: "0 wins — not even the dark spheres (Force of Will) can crush this losing streak." },
      { pt: "A soberana das trevas devia era reinar melhor sobre as vitórias.", en: "The Dark Sovereign should really rule over her wins better." },
    ],
    few: [
      { pt: "Já lançaste uma esfera certeira o suficiente para uma vitória ou duas.", en: "You've thrown a clean sphere for a win or two." },
      { pt: "A força de vontade começa a acertar no alvo certo.", en: "Force of Will is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essas esferas já não erram nenhum combo.", en: "Multi-time winner — those spheres don't miss a combo now." },
      { pt: "Já és a soberana absoluta, vitórias incluídas.", en: "You're the absolute sovereign now, wins included." },
    ],
  },
  TahmKench: {
    zero: [
      { pt: "0 vitórias — nem engolir o aliado (devour) safa essa série de derrotas.", en: "0 wins — not even devouring an ally (Devour) saves this losing streak." },
      { pt: "O rei do rio devia era engolir também as próprias derrotas.", en: "The River King should really swallow his own losses too." },
    ],
    few: [
      { pt: "Já engoliste uma vitória ou duas para salvar alguém.", en: "You've swallowed a win or two to save someone." },
      { pt: "A língua começa a acertar no alvo certo.", en: "The tongue is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse rei já não larga o trono.", en: "Multi-time winner — that king doesn't let go of the throne now." },
      { pt: "Já dominas o rio todo, vitórias incluídas.", en: "You rule the whole river now, wins included." },
    ],
  },
  Taliyah: {
    zero: [
      { pt: "0 vitórias — nem surfar na pedra (ult) leva a essa vitória.", en: "0 wins — not even rock surfing (ult) can ride you to this win." },
      { pt: "A tecelã de pedra devia era tecer melhores resultados.", en: "The Stoneweaver should really weave better results." },
    ],
    few: [
      { pt: "Já tecesses uma vitória ou duas com as tuas pedras.", en: "You've woven a win or two with your stones." },
      { pt: "As rochas começam a acertar no alvo certo.", en: "The rocks are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa tecelã já domina a pedra toda.", en: "Multi-time winner — that weaver has mastered all the stone now." },
      { pt: "Já és a força da terra em movimento, vitórias incluídas.", en: "You're the earth's strength in motion now, wins included." },
    ],
  },
  Talon: {
    zero: [
      { pt: "0 vitórias — nem a lâmina das sombras corta essa série de derrotas.", en: "0 wins — not even the blade of the shadows can cut this losing streak." },
      { pt: "O assassino das sombras devia era assassinar as próprias derrotas.", en: "The Blade's Shadow should really assassinate his own losses." },
    ],
    few: [
      { pt: "Já saltaste um muro o suficiente para uma vitória ou duas.", en: "You've hopped a wall well enough for a win or two." },
      { pt: "A lâmina começa a acertar nas costas certas.", en: "The blade is starting to land on the right backs." },
    ],
    many: [
      { pt: "Multi-vencedor — esse assassino já não falha um alvo.", en: "Multi-time winner — that assassin doesn't miss a target now." },
      { pt: "Já és o terror das sombras, vitórias incluídas.", en: "You're the terror of the shadows now, wins included." },
    ],
  },
  Taric: {
    zero: [
      { pt: "0 vitórias — nem o brilho do gemstone ilumina essa série de derrotas.", en: "0 wins — not even the gemstone's shine can light up this losing streak." },
      { pt: "O escudo da tradição antiga devia era escudar melhores resultados.", en: "The Shield of the Ancient Order should really shield better results." },
    ],
    few: [
      { pt: "Já protegeste uma vitória ou duas com o teu escudo.", en: "You've shielded a win or two." },
      { pt: "O brilho começa a ofuscar os inimigos certos.", en: "The shine is starting to dazzle the right enemies." },
    ],
    many: [
      { pt: "Multi-vencedor — esse escudo já não deixa passar nada.", en: "Multi-time winner — that shield doesn't let anything through now." },
      { pt: "Já és puro esplendor, vitórias incluídas.", en: "You're pure splendor now, wins included." },
    ],
  },
  Teemo: {
    zero: [
      { pt: "0 vitórias — nem os cogumelos (traps) plantam essa vitória.", en: "0 wins — not even the mushrooms (traps) can plant this win." },
      { pt: "O yordle mais odiado do jogo, e ainda por cima sem ganhar nada.", en: "The most hated yordle in the game, and on top of that, no wins to show for it." },
    ],
    few: [
      { pt: "Já cegaste uma vitória ou duas com o dardo tóxico.", en: "You've blinded a win or two with the blinding dart." },
      { pt: "Os cogumelos começam a explodir no sítio certo.", en: "The mushrooms are starting to pop in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — esses cogumelos já não param de explodir.", en: "Multi-time winner — those mushrooms don't stop popping now." },
      { pt: "Já és o pesadelo oficial da Arena, vitórias incluídas.", en: "You're the Arena's official nightmare now, wins included." },
    ],
  },
  Thresh: {
    zero: [
      { pt: "0 vitórias — nem a lanterna (ult) resgata essa série de derrotas.", en: "0 wins — not even the lantern (ult) can rescue this losing streak." },
      { pt: "O carcereiro das correntes devia era prender melhores resultados.", en: "The Chain Warden should really lock down better results." },
    ],
    few: [
      { pt: "Já ganchaste uma vitória ou duas com a foice.", en: "You've hooked a win or two with the scythe." },
      { pt: "A lanterna começa a resgatar as pessoas certas.", en: "The lantern is starting to rescue the right people." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lanterna já não falha um resgate.", en: "Multi-time winner — that lantern doesn't miss a rescue now." },
      { pt: "Já és o carcereiro perfeito, vitórias incluídas.", en: "You're the perfect warden now, wins included." },
    ],
  },
  Tristana: {
    zero: [
      { pt: "0 vitórias — nem o rocket jump salta para essa vitória.", en: "0 wins — not even Rocket Jump can hop into this win." },
      { pt: "A artilheira megling devia era mirar melhor as próprias jogadas.", en: "The Megling Gunner should really aim her own plays better." },
    ],
    few: [
      { pt: "Já explodiste uma vitória ou duas com o buster shot.", en: "You've blown up a win or two with Buster Shot." },
      { pt: "Os saltos começam a acertar no sítio certo.", en: "The jumps are starting to land in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — esse canhão já não falha um alvo.", en: "Multi-time winner — that cannon doesn't miss a target now." },
      { pt: "Já és pura explosão de talento, vitórias incluídas.", en: "You're a pure explosion of talent now, wins included." },
    ],
  },
  Trundle: {
    zero: [
      { pt: "0 vitórias — nem roubar stats (subjugate) rouba essa vitória.", en: "0 wins — not even stealing stats (Subjugate) can steal this win." },
      { pt: "O rei dos trolls devia era reinar melhor sobre os próprios resultados.", en: "The Troll King should really reign better over his own results." },
    ],
    few: [
      { pt: "Já subjugaste uma vitória ou duas ao teu favor.", en: "You've subjugated a win or two in your favor." },
      { pt: "O pilar de gelo começa a bloquear os caminhos certos.", en: "The ice pillar is starting to block the right paths." },
    ],
    many: [
      { pt: "Multi-vencedor — esse rei já não larga o trono.", en: "Multi-time winner — that king doesn't let go of the throne now." },
      { pt: "Já dominas a ponte toda, vitórias incluídas.", en: "You rule the whole bridge now, wins included." },
    ],
  },
  Tryndamere: {
    zero: [
      { pt: "0 vitórias — nem a fúria imparável (undying rage) te salva desta série de derrotas.", en: "0 wins — not even Undying Rage saves you from this losing streak." },
      { pt: "O rei bárbaro devia era rugir menos e ganhar mais.", en: "The Barbarian King should really roar less and win more." },
    ],
    few: [
      { pt: "Já sobreviveste com 1 HP o suficiente para uma vitória ou duas.", en: "You've survived on 1 HP well enough for a win or two." },
      { pt: "A fúria começa a acumular no momento certo.", en: "The fury is starting to stack at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa fúria já é literalmente imortal.", en: "Multi-time winner — that fury is literally immortal now." },
      { pt: "Já és o bárbaro mais temido, vitórias incluídas.", en: "You're the most feared barbarian now, wins included." },
    ],
  },
  TwistedFate: {
    zero: [
      { pt: "0 vitórias — nem escolher a carta certa (pick a card) escolhe essa vitória.", en: "0 wins — not even Pick a Card can pick out this win." },
      { pt: "O mestre das cartas devia era baralhar melhor a própria sorte.", en: "The Card Master should really shuffle his own luck better." },
    ],
    few: [
      { pt: "Já acertaste a carta dourada o suficiente para uma vitória ou duas.", en: "You've drawn the gold card well enough for a win or two." },
      { pt: "O baralho começa a dar as cartas certas.", en: "The deck is starting to deal the right cards." },
    ],
    many: [
      { pt: "Multi-vencedor — esse baralho já não falha uma jogada.", en: "Multi-time winner — that deck doesn't miss a play now." },
      { pt: "Já és o cartomante mais sortudo, vitórias incluídas.", en: "You're the luckiest card reader now, wins included." },
    ],
  },
  Twitch: {
    zero: [
      { pt: "0 vitórias — nem o stealth esconde essa série de derrotas.", en: "0 wins — not even stealth can hide this losing streak." },
      { pt: "O rato da praga devia era espalhar mais vitórias que doença.", en: "The Plague Rat should really spread more wins than disease." },
    ],
    few: [
      { pt: "Já espalhaste contágio o suficiente para uma vitória ou duas.", en: "You've spread contagion well enough for a win or two." },
      { pt: "O spray and pray começa a acertar no alvo certo.", en: "Spray and Pray is starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa praga já não para de se espalhar.", en: "Multi-time winner — that plague doesn't stop spreading now." },
      { pt: "Já és puro veneno letal, vitórias incluídas.", en: "You're pure lethal venom now, wins included." },
    ],
  },
  Udyr: {
    zero: [
      { pt: "0 vitórias — nem trocar de postura muda essa série de derrotas.", en: "0 wins — not even switching stances changes this losing streak." },
      { pt: "O andarilho espiritual devia era andar mais depressa para a vitória.", en: "The Spirit Walker should really walk faster toward victory." },
    ],
    few: [
      { pt: "Já trocaste de postura o suficiente para uma vitória ou duas.", en: "You've switched stances well enough for a win or two." },
      { pt: "Os espíritos começam a alinhar-se a teu favor.", en: "The spirits are starting to align in your favor." },
    ],
    many: [
      { pt: "Multi-vencedor — esse andarilho já domina todos os espíritos.", en: "Multi-time winner — that walker has mastered all the spirits now." },
      { pt: "Já és puro instinto animal, vitórias incluídas.", en: "You're pure animal instinct now, wins included." },
    ],
  },
  Urgot: {
    zero: [
      { pt: "0 vitórias — nem a execução (ult) finaliza essa série de derrotas.", en: "0 wins — not even the execution (ult) finishes off this losing streak." },
      { pt: "O dreadnought devia era navegar rumo a melhores resultados.", en: "The dreadnought should really sail toward better results." },
    ],
    few: [
      { pt: "Já executaste uma vitória ou duas com o teu ult.", en: "You've executed a win or two with your ult." },
      { pt: "As pernas mecânicas começam a acertar no ritmo certo.", en: "The mechanical legs are starting to land at the right pace." },
    ],
    many: [
      { pt: "Multi-vencedor — essa execução já não falha ninguém.", en: "Multi-time winner — that execution doesn't miss anyone now." },
      { pt: "Já és o terror das profundezas, vitórias incluídas.", en: "You're the terror of the depths now, wins included." },
    ],
  },
  Varus: {
    zero: [
      { pt: "0 vitórias — nem a corrupção do Darkin acerta essa série de derrotas.", en: "0 wins — not even the Darkin's corruption can land on this losing streak." },
      { pt: "A flecha da vingança devia era vingar-se das próprias derrotas.", en: "The Arrow of Retribution should really avenge his own losses." },
    ],
    few: [
      { pt: "Já corrompeste uma vitória ou duas com o teu veneno.", en: "You've corrupted a win or two with your venom." },
      { pt: "As flechas começam a acertar no alvo certo.", en: "The arrows are starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa corrupção já não para de se espalhar.", en: "Multi-time winner — that corruption doesn't stop spreading now." },
      { pt: "Já dominas o arco e as vitórias, Darkin.", en: "You've mastered the bow and the wins now, Darkin." },
    ],
  },
  Vayne: {
    zero: [
      { pt: "0 vitórias — nem os pregos de prata (true damage) perfuram essa série de derrotas.", en: "0 wins — not even the silver bolts (true damage) can pierce this losing streak." },
      { pt: "A caçadora da noite devia era caçar melhores resultados.", en: "The Night Hunter should really hunt for better results." },
    ],
    few: [
      { pt: "Já acumulaste stacks o suficiente para uma vitória ou duas.", en: "You've stacked up enough for a win or two." },
      { pt: "O condemn começa a acertar na parede certa.", en: "Condemn is starting to land against the right wall." },
    ],
    many: [
      { pt: "Multi-vencedor — essa caçadora já não falha um alvo.", en: "Multi-time winner — that huntress doesn't miss a target now." },
      { pt: "Já és o pesadelo dos tanques, vitórias incluídas.", en: "You're the nightmare of tanks now, wins included." },
    ],
  },
  Veigar: {
    zero: [
      { pt: "0 vitórias — nem o Event Horizon (jaula) prende essa série de derrotas.", en: "0 wins — not even Event Horizon (the cage) can trap this losing streak." },
      { pt: "O pequeno mestre do mal devia era ser um pouco maior nas vitórias.", en: "The Tiny Master of Evil should really be a bit bigger in the wins department." },
    ],
    few: [
      { pt: "Já acumulaste AP o suficiente para uma vitória ou duas.", en: "You've stacked up enough AP for a win or two." },
      { pt: "A jaula começa a prender os alvos certos.", en: "The cage is starting to trap the right targets." },
    ],
    many: [
      { pt: "Multi-vencedor — esse dano mágico já não tem limite.", en: "Multi-time winner — that magic damage has no limit now." },
      { pt: "Já és o mal em miniatura mais poderoso, vitórias incluídas.", en: "You're the most powerful tiny evil now, wins included." },
    ],
  },
  Velkoz: {
    zero: [
      { pt: "0 vitórias — nem a desconstrução (ult) analisa essa série de derrotas.", en: "0 wins — not even the deconstruction (ult) can analyze this losing streak." },
      { pt: "O olho do vazio devia era observar melhor os próprios erros.", en: "The Eye of the Void should really observe his own mistakes better." },
    ],
    few: [
      { pt: "Já desconstruíste uma vitória ou duas com os teus raios.", en: "You've deconstructed a win or two with your beams." },
      { pt: "Os feixes começam a acertar no alvo certo.", en: "The beams are starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa análise já não erra nada.", en: "Multi-time winner — that analysis doesn't miss anything now." },
      { pt: "Já dominas o conhecimento do Vazio, vitórias incluídas.", en: "You've mastered the Void's knowledge now, wins included." },
    ],
  },
  Vex: {
    zero: [
      { pt: "0 vitórias — nem o doom (perdição) condena essa série de derrotas.", en: "0 wins — not even Doom can condemn this losing streak." },
      { pt: "A yordle sombria devia era sombrear melhores resultados.", en: "The gloomy yordle should really shadow better results." },
    ],
    few: [
      { pt: "Já condenaste um dash inimigo o suficiente para uma vitória ou duas.", en: "You've doomed an enemy dash well enough for a win or two." },
      { pt: "A escuridão começa a acertar no momento certo.", en: "The gloom is starting to land at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — essa melancolia já não impede as vitórias.", en: "Multi-time winner — that gloom doesn't stop the wins now." },
      { pt: "Já dominas a perdição toda, sombria.", en: "You've mastered all the doom now, gloomy one." },
    ],
  },
  Vi: {
    zero: [
      { pt: "0 vitórias — nem o soco através de paredes (ult) atinge essa série de derrotas.", en: "0 wins — not even the wall-punch (ult) can hit through this losing streak." },
      { pt: "A executora de Piltover devia era executar melhores planos.", en: "Piltover's enforcer should really execute better plans." },
    ],
    few: [
      { pt: "Já socaste uma vitória ou duas através da parede.", en: "You've punched a win or two through the wall." },
      { pt: "Os punhos hextech começam a acertar no alvo certo.", en: "The hextech fists are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esses punhos já não erram nenhuma parede.", en: "Multi-time winner — those fists don't miss a wall now." },
      { pt: "Já és a força bruta de Piltover, vitórias incluídas.", en: "You're Piltover's brute force now, wins included." },
    ],
  },
  Viego: {
    zero: [
      { pt: "0 vitórias — nem possuir corpos (ult) possui essa série de derrotas.", en: "0 wins — not even possessing bodies (ult) can possess this losing streak." },
      { pt: "O rei arruinado devia era arruinar-se menos e ganhar mais.", en: "The Ruined King should really ruin himself less and win more." },
    ],
    few: [
      { pt: "Já possuíste um corpo o suficiente para uma vitória ou duas.", en: "You've possessed a body well enough for a win or two." },
      { pt: "A possessão começa a acertar no alvo certo.", en: "The possession is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse rei já não larga nenhum corpo (nem vitória).", en: "Multi-time winner — that king doesn't let go of a body (or a win) now." },
      { pt: "Já és a ruína em pessoa, vitórias incluídas.", en: "You're ruin in person now, wins included." },
    ],
  },
  Viktor: {
    zero: [
      { pt: "0 vitórias — nem a evolução hextech (upgrades) evolui essa série de derrotas.", en: "0 wins — not even the hextech evolution (upgrades) can evolve this losing streak." },
      { pt: "O arauto do arcano devia era anunciar melhores resultados.", en: "The Herald of the Arcane should really herald better results." },
    ],
    few: [
      { pt: "Já evoluíste uma peça o suficiente para uma vitória ou duas.", en: "You've upgraded a piece well enough for a win or two." },
      { pt: "A tempestade de caos começa a acertar no alvo certo.", en: "Chaos Storm is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa evolução já está completa.", en: "Multi-time winner — that evolution is complete now." },
      { pt: "Já és a perfeição hextech, vitórias incluídas.", en: "You're hextech perfection now, wins included." },
    ],
  },
  Vladimir: {
    zero: [
      { pt: "0 vitórias — nem a poça de sangue (pool) esconde essa série de derrotas.", en: "0 wins — not even the pool of blood can hide this losing streak." },
      { pt: "O ceifeiro carmesim devia era ceifar melhores resultados.", en: "The Crimson Reaper should really reap better results." },
    ],
    few: [
      { pt: "Já drenaste uma vitória ou duas com o teu sangue.", en: "You've drained a win or two with your blood." },
      { pt: "A hemoplague começa a espalhar-se no alvo certo.", en: "Hemoplague is starting to spread on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse sangue já não para de render vitórias.", en: "Multi-time winner — that blood doesn't stop yielding wins now." },
      { pt: "Já dominas a magia de sangue, vitórias incluídas.", en: "You've mastered blood magic now, wins included." },
    ],
  },
  Volibear: {
    zero: [
      { pt: "0 vitórias — nem a tempestade implacável (ult) troveja essa série de derrotas.", en: "0 wins — not even the relentless storm (ult) thunders through this losing streak." },
      { pt: "O urso relâmpago devia era trovejar melhores resultados.", en: "The Thunder Bear should really thunder up better results." },
    ],
    few: [
      { pt: "Já mordeste uma vitória ou duas com relâmpagos.", en: "You've bitten a win or two with lightning." },
      { pt: "A tempestade começa a formar-se no momento certo.", en: "The storm is starting to form at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse trovão já não para de cair.", en: "Multi-time winner — that thunder doesn't stop striking now." },
      { pt: "Já és a fúria da tempestade, vitórias incluídas.", en: "You're the storm's fury now, wins included." },
    ],
  },
  Warwick: {
    zero: [
      { pt: "0 vitórias — nem o cheiro a sangue (scent of blood) fareja essa série de derrotas.", en: "0 wins — not even the scent of blood can sniff out this losing streak." },
      { pt: "O caçador enjaulado devia era caçar melhores resultados.", en: "The caged hunter should really hunt for better results." },
    ],
    few: [
      { pt: "Já caçaste uma vitória ou duas com o teu uivo.", en: "You've hunted down a win or two with your howl." },
      { pt: "O faro começa a acertar no alvo certo.", en: "The scent is starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse caçador já não larga a presa.", en: "Multi-time winner — that hunter doesn't let go of the prey now." },
      { pt: "Já és a fera desenjaulada, vitórias incluídas.", en: "You're the uncaged beast now, wins included." },
    ],
  },
  Xayah: {
    zero: [
      { pt: "0 vitórias — nem recolher as penas (recall) recolhe essa série de derrotas.", en: "0 wins — not even recalling the feathers can recall this losing streak." },
      { pt: "A rebelde devia era rebelar-se contra as próprias derrotas.", en: "The rebel should really rebel against her own losses." },
    ],
    few: [
      { pt: "Já lançaste uma pena certeira o suficiente para uma vitória ou duas.", en: "You've thrown a clean feather for a win or two." },
      { pt: "As penas começam a acertar no alvo certo.", en: "The feathers are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essas penas já não erram nada.", en: "Multi-time winner — those feathers don't miss anything now." },
      { pt: "Já és a rebelião em pessoa, vitórias incluídas.", en: "You're rebellion in person now, wins included." },
    ],
  },
  Xerath: {
    zero: [
      { pt: "0 vitórias — nem a chuva de flechas (ult) acerta essa série de derrotas.", en: "0 wins — not even the rain of arrows (ult) can hit this losing streak." },
      { pt: "O mago ascendente devia era ascender a melhores resultados.", en: "The Magus Ascendant should really ascend to better results." },
    ],
    few: [
      { pt: "Já acertaste um arcanopulse o suficiente para uma vitória ou duas.", en: "You've landed an Arcanopulse well enough for a win or two." },
      { pt: "Os feitiços começam a acertar no alvo certo.", en: "The spells are starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa chuva de arcano já não erra nada.", en: "Multi-time winner — that rain of arcane power doesn't miss anything now." },
      { pt: "Já és o poder ascendido, vitórias incluídas.", en: "You're the ascended power now, wins included." },
    ],
  },
  XinZhao: {
    zero: [
      { pt: "0 vitórias — nem o desafio (ult) desafia essa série de derrotas.", en: "0 wins — not even the challenge (ult) can challenge this losing streak." },
      { pt: "O senescal de Demacia devia era servir melhores resultados.", en: "Demacia's seneschal should really serve better results." },
    ],
    few: [
      { pt: "Já desafiaste uma vitória ou duas com a tua lança.", en: "You've challenged your way to a win or two with your spear." },
      { pt: "As três estocadas começam a acertar no alvo certo.", en: "The three-hit strikes are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse senescal já não perde um duelo.", en: "Multi-time winner — that seneschal doesn't lose a duel now." },
      { pt: "Já serves Demacia com honra e vitórias.", en: "You serve Demacia with honor and wins now." },
    ],
  },
  Yasuo: {
    zero: [
      { pt: "0 vitórias — nem a parede de vento bloqueia essa série de derrotas.", en: "0 wins — not even the wind wall blocks this losing streak." },
      { pt: "O imperdoável devia era perdoar-se menos e ganhar mais.", en: "The Unforgiven should really forgive himself less and win more." },
    ],
    few: [
      { pt: "Já combinaste um knock-up o suficiente para uma vitória ou duas.", en: "You've landed a knock-up well enough for a win or two." },
      { pt: "A tempestade começa a formar-se no momento certo.", en: "The storm is starting to form at the right moment." },
    ],
    many: [
      { pt: "Multi-vencedor — esse vento já não erra um combo.", en: "Multi-time winner — that wind doesn't miss a combo now." },
      { pt: "Já és a lenda que a lane sempre temeu, vitórias incluídas.", en: "You're the legend the lane always feared now, wins included." },
    ],
  },
  Yone: {
    zero: [
      { pt: "0 vitórias — nem a segunda vida (soul) revive essa série de derrotas.", en: "0 wins — not even the second life (soul) can revive this losing streak." },
      { pt: "O esquecido devia era ser esquecido também pelas derrotas.", en: "The Unforgotten should really be forgotten by his losses too." },
    ],
    few: [
      { pt: "Já cortaste uma vitória ou duas com a lâmina espiritual.", en: "You've cut a win or two with the spirit blade." },
      { pt: "A segunda vida começa a fazer a diferença certa.", en: "The second life is starting to make the right difference." },
    ],
    many: [
      { pt: "Multi-vencedor — essa lâmina já não erra um combo.", en: "Multi-time winner — that blade doesn't miss a combo now." },
      { pt: "Já és o espírito imparável, vitórias incluídas.", en: "You're the unstoppable spirit now, wins included." },
    ],
  },
  Yorick: {
    zero: [
      { pt: "0 vitórias — nem os ghouls (mortos-vivos) trazem essa vitória à vida.", en: "0 wins — not even the ghouls can bring this win to life." },
      { pt: "O pastor de almas devia era pastorear melhores resultados.", en: "The Shepherd of Souls should really shepherd better results." },
    ],
    few: [
      { pt: "Já invocaste uma vitória ou duas com os teus mortos-vivos.", en: "You've summoned a win or two with your undead." },
      { pt: "A donzela da névoa começa a assombrar o alvo certo.", en: "The Maiden of the Mist is starting to haunt the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esses mortos já não param de lutar por ti.", en: "Multi-time winner — those undead don't stop fighting for you now." },
      { pt: "Já lideras um exército de vitórias, pastor.", en: "You lead an army of wins now, shepherd." },
    ],
  },
  Yuumi: {
    zero: [
      { pt: "0 vitórias — nem estar colada a um aliado (attach) cola essa vitória.", en: "0 wins — not even attaching to an ally can stick this win in place." },
      { pt: "O livro mágico devia era ler melhores estratégias.", en: "The magical book should really read better strategies." },
    ],
    few: [
      { pt: "Já ajudaste uma vitória ou duas coladinha a alguém.", en: "You've helped out a win or two while attached to someone." },
      { pt: "O livro começa a acertar nos feitiços certos.", en: "The book is starting to land the right spells." },
    ],
    many: [
      { pt: "Multi-vencedor — essa gatinha já não larga a vitória.", en: "Multi-time winner — that kitty doesn't let go of victory now." },
      { pt: "Já és o companheiro perfeito, vitórias incluídas.", en: "You're the perfect companion now, wins included." },
    ],
  },
  Zac: {
    zero: [
      { pt: "0 vitórias — nem dividir-te em blobs (ao morrer) divide essa série de derrotas.", en: "0 wins — not even splitting into blobs (on death) divides this losing streak." },
      { pt: "A arma secreta devia era ser um pouco mais secreta sobre isto.", en: "The secret weapon should really keep this a bit more secret." },
    ],
    few: [
      { pt: "Já saltaste até uma vitória ou duas.", en: "You've bounced your way to a win or two." },
      { pt: "A gosma começa a esticar-se no sítio certo.", en: "The goo is starting to stretch in the right spot." },
    ],
    many: [
      { pt: "Multi-vencedor — essa gosma já não para de saltar para a vitória.", en: "Multi-time winner — that goo doesn't stop bouncing toward victory now." },
      { pt: "Já és indestrutível (e vencedor), arma secreta.", en: "You're indestructible (and victorious) now, secret weapon." },
    ],
  },
  Zed: {
    zero: [
      { pt: "0 vitórias — nem a marca da morte (ult) marca essa série de derrotas.", en: "0 wins — not even Death Mark (ult) can mark this losing streak." },
      { pt: "O mestre das sombras devia era dominar melhores resultados.", en: "The Master of Shadows should really master better results." },
    ],
    few: [
      { pt: "Já marcaste uma vitória ou duas com o teu clone.", en: "You've marked a win or two with your clone." },
      { pt: "As sombras começam a acertar no alvo certo.", en: "The shadows are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essas sombras já não falham uma marca.", en: "Multi-time winner — those shadows don't miss a mark now." },
      { pt: "Já és o terror silencioso da Arena, vitórias incluídas.", en: "You're the Arena's silent terror now, wins included." },
    ],
  },
  Zeri: {
    zero: [
      { pt: "0 vitórias — nem as zoomies (dash na parede) escapam dessa série de derrotas.", en: "0 wins — not even the zoomies (wall dash) can escape this losing streak." },
      { pt: "A faísca de Zaun devia era faiscar melhores resultados.", en: "Zaun's spark should really spark up better results." },
    ],
    few: [
      { pt: "Já saltaste um muro o suficiente para uma vitória ou duas.", en: "You've hopped a wall well enough for a win or two." },
      { pt: "A eletricidade começa a acertar no alvo certo.", en: "The electricity is starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essa faísca já não para de choque em choque.", en: "Multi-time winner — that spark doesn't stop shocking now." },
      { pt: "Já és pura energia elétrica, vitórias incluídas.", en: "You're pure electric energy now, wins included." },
    ],
  },
  Ziggs: {
    zero: [
      { pt: "0 vitórias — nem a satchel charge (bomba) explode essa série de derrotas.", en: "0 wins — not even the satchel charge can blow up this losing streak." },
      { pt: "O especialista em hexplosivos devia era explodir melhores resultados.", en: "The Hexplosives Expert should really blow up better results." },
    ],
    few: [
      { pt: "Já detonaste uma vitória ou duas com as tuas bombas.", en: "You've detonated a win or two with your bombs." },
      { pt: "As explosões começam a acertar no alvo certo.", en: "The explosions are starting to land on the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — essas bombas já não erram nenhum alvo.", en: "Multi-time winner — those bombs don't miss a target now." },
      { pt: "Já és o mestre da destruição, vitórias incluídas.", en: "You're the master of destruction now, wins included." },
    ],
  },
  Zilean: {
    zero: [
      { pt: "0 vitórias — nem voltar atrás no tempo (revive) apaga essa série de derrotas.", en: "0 wins — not even turning back time (revive) erases this losing streak." },
      { pt: "O guardião do tempo devia era acelerar rumo a melhores resultados.", en: "The Chronokeeper should really speed up toward better results." },
    ],
    few: [
      { pt: "Já reviveste uma vitória ou duas com as tuas bombas de tempo.", en: "You've revived a win or two with your time bombs." },
      { pt: "O tempo começa a acertar a teu favor.", en: "Time is starting to line up in your favor." },
    ],
    many: [
      { pt: "Multi-vencedor — esse tempo já não para de correr a teu favor.", en: "Multi-time winner — that time doesn't stop running in your favor now." },
      { pt: "Já dominas o passado, presente e futuro, vitórias incluídas.", en: "You rule past, present, and future now, wins included." },
    ],
  },
  Zoe: {
    zero: [
      { pt: "0 vitórias — nem a bolha do sono (sleepy trouble bubble) adormece essa série de derrotas.", en: "0 wins — not even the Sleepy Trouble Bubble can put this losing streak to sleep." },
      { pt: "O aspeto do crepúsculo devia era brincar menos e ganhar mais.", en: "The Aspect of Twilight should really play around less and win more." },
    ],
    few: [
      { pt: "Já adormeceste uma vitória ou duas com a tua bolha.", en: "You've put a win or two to sleep with your bubble." },
      { pt: "O portal começa a levar-te aos sítios certos.", en: "The portal is starting to take you to the right places." },
    ],
    many: [
      { pt: "Multi-vencedor — essa bolha já não falha um sono.", en: "Multi-time winner — that bubble doesn't miss a nap now." },
      { pt: "Já és puro caos cósmico, vitórias incluídas.", en: "You're pure cosmic chaos now, wins included." },
    ],
  },
  Zyra: {
    zero: [
      { pt: "0 vitórias — nem as sementes (plantas) florescem numa vitória.", en: "0 wins — not even the seeds (plants) bloom into a win." },
      { pt: "A ascensão dos espinhos devia era ascender a melhores resultados.", en: "The Rise of the Thorns should really rise to better results." },
    ],
    few: [
      { pt: "Já floresceste uma vitória ou duas com as tuas plantas.", en: "You've bloomed a win or two with your plants." },
      { pt: "Os espinhos começam a acertar no alvo certo.", en: "The thorns are starting to hit the right target." },
    ],
    many: [
      { pt: "Multi-vencedor — esse jardim já não para de crescer (e ganhar).", en: "Multi-time winner — that garden doesn't stop growing (or winning) now." },
      { pt: "Já és a natureza mais letal, vitórias incluídas.", en: "You're the deadliest nature now, wins included." },
    ],
  },
};

// Escolhe um nível (0 / 1-2 / 3+ vitórias) e devolve uma frase ao calhas
// desse nível, já no idioma pedido — usa o banco específico do campeão se
// existir, ou o fallback genérico (ver GENERIC acima) caso contrário.
export function getRoast(championId, winCount, lang = "pt") {
  const tier = winCount === 0 ? "zero" : winCount <= 2 ? "few" : "many";
  const bank = ROASTS[championId]?.[tier] || GENERIC[tier];
  const entry = bank[Math.floor(Math.random() * bank.length)];
  return entry[lang] ?? entry.pt;
}
