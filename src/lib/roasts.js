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
//
// ================= SITUAÇÕES ESPECIAIS =================
// Além dos três níveis por vitórias, uma partida pode disparar uma SITUAÇÃO
// (maré de derrotas, estreia com o campeão, 0 vitórias em muitas partidas,
// madrugada, etc. — ver detectRoastSituation no fim do ficheiro). Quando há
// uma situação ativa, ela tem prioridade sobre o nível normal, e a frase sai:
//   1) da chave dessa situação no próprio campeão (ROASTS[champ][situação]),
//      se existir — é a personalização por campeão, ao lado de zero/few/many;
//   2) senão, do banco GENÉRICO por situação (SITUATIONS abaixo), que cobre
//      qualquer campeão.
// Cada campeão vive num só sítio — o mesmo objeto tem os níveis por vitórias
// (zero/few/many) e as situações personalizadas. Uma situação que o campeão
// não tenha (ex: winStreak, marathon, lateNight, que ninguém personaliza)
// cai sempre no genérico da situação.
//
// Regra ao escrever frases de situação: NÃO cravar números exatos ("4 derrotas
// seguidas") — a deteção garante o padrão (ex: "as últimas foram todas
// derrotas"), não uma contagem específica, por isso um número fixo mentiria
// em metade dos casos.
import { normalizeChampionId } from "./champions";

export const GENERIC = {
  zero: [
    {
      pt: "0 vitórias com este campeão. Talvez o problema não seja a build.",
      en: "0 wins with this champion. Maybe the build isn't the problem.",
    },
    {
      pt: "Ainda a 0 aqui — a Arena não se ganha sozinha, por muito que tentes.",
      en: "Still at 0 here — the Arena doesn't win itself, no matter how hard you try.",
    },
    { pt: "A procurar a tua primeira vitória... 0 resultados. Talvez amplia a pesquisa.", en: "Searching for your first win... 0 results. Maybe broaden the search." },
    { pt: "🏆 Conquista desbloqueada: 'Ainda Não'. Progresso: 0%.", en: "🏆 Achievement unlocked: 'Not Yet'. Progress: 0%." },
    { pt: "Dica de profissional: para ganhar, tenta não perder. Revolucionário, eu sei.", en: "Pro tip: to win, try not losing. Revolutionary, I know." },
    { pt: "O placar, a olhar fixamente para ti: 'a sério?'", en: "The scoreboard, staring right at you: 'seriously?'" },
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
    { pt: "Relatório oficial: uma vitória ou duas detetadas. A investigar se foi sorte.", en: "Official report: a win or two detected. Investigating whether it was luck." },
    { pt: "Já ganhaste. Uma vez. Ou duas. Não faças disto uma personalidade.", en: "You've won. Once. Or twice. Don't make it a personality." },
    { pt: "Olha para ti, já sabes onde é o botão de atacar. Comovente.", en: "Look at you, you already know where the attack button is. Touching." },
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
    { pt: "Certificado oficial: já não és um perigo público. Emoldura.", en: "Official certificate: you're no longer a public hazard. Frame it." },
    { pt: "Está bem, sabes jogar. Não precisas de dizer a toda a gente. (Podes dizer.)", en: "Okay, you can play. No need to tell everyone. (You can tell them.)" },
    { pt: "Última hora: jogador competente avistado. Fonte: este placar.", en: "Breaking news: competent player spotted. Source: this scoreboard." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — o World Ender está é a acabar contigo.", en: "Loss after loss — the World Ender is ending you, not the world." },
      { pt: "Nem a revivência da ult te tira desta espiral de derrotas.", en: "Not even the ult's revive pulls you out of this downward spiral." },
      { pt: "🏆 Conquista: 'O Fim do Mundo (o teu)'.", en: "🏆 Achievement: 'World Ender (your world)'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e a espada continua a recusar-te uma vitória.", en: "So many games and the blade still refuses you a single win." },
      { pt: "O Darkin já se arrepende de te ter escolhido, e ainda insistes.", en: "The Darkin already regrets choosing you, and still you insist." },
      { pt: "ERRO: a espada tentou devolver-te. Sem sucesso.", en: "ERROR: the blade tried to return you. Unsuccessful." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez com o Aatrox? A espada vai testar se és digno — spoiler: ainda não.", en: "First time with Aatrox? The blade will test if you're worthy — spoiler: not yet." },
      { pt: "Estreia no Darkin. Prepara-te para carregar a barra da ult e perder na mesma.", en: "Darkin debut. Get ready to charge the ult bar and lose anyway." },
      { pt: "A carregar a barra da ult... a carregar expectativas... falha.", en: "Charging the ult bar... loading expectations... failed." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o charm encanta esta maré.", en: "Losses in a row — not even Charm can charm this streak." },
      { pt: "Nove caudas e nenhuma te safa desta espiral.", en: "Nine tails and not one saves you from this spiral." },
      { pt: "Última hora: raposa de nove caudas foge de nove derrotas.", en: "Breaking news: nine-tailed fox flees nine losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e a raposa continua sem provar uma vitória.", en: "So many games and the fox still hasn't tasted a win." },
      { pt: "0 vitórias — o charm funciona em toda a gente menos no placar.", en: "0 wins — Charm works on everyone except the scoreboard." },
      { pt: "Horóscopo: o teu charm atrai tudo menos vitórias.", en: "Horoscope: your charm attracts everything but wins." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais atirar o orbe, falhar o regresso, e morrer.", en: "First time? You'll throw the orb, miss the return, and die." },
      { pt: "Estreia na Ahri. O spirit rush é para fugir, não para entrar a 100.", en: "Ahri debut. Spirit Rush is for escaping, not diving in headfirst." },
      { pt: "⚠️ Ahri detetada. Aviso: o orbe volta, tu não.", en: "⚠️ Ahri detected. Warning: the orb comes back, you don't." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o fumo esconde este histórico.", en: "Loss after loss — not even the smoke hides this record." },
      { pt: "O shroud dá para desaparecer, pena não dar para desaparecer com as derrotas.", en: "The shroud lets you vanish; too bad it can't vanish the losses." },
      { pt: "O fumo sussurra: 'nem eu te consigo esconder isto'.", en: "The smoke whispers: 'even I can't hide this'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas escondida no fumo e nem uma vitória lá dentro.", en: "So many games hidden in the smoke and not one win inside it." },
      { pt: "0 vitórias — sabes desaparecer, falta mesmo é ganhar.", en: "0 wins — you know how to vanish, you just need to win." },
      { pt: "Relatório: muitos desaparecimentos, nenhuma vitória reaparecida.", en: "Report: many vanishings, no win reappeared." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Entras no fumo confiante e sais morta na mesma.", en: "First time? You dive into the smoke confident and die anyway." },
      { pt: "Estreia na Akali. O combo é lindo no treino e desastroso em jogo.", en: "Akali debut. The combo's gorgeous in practice and a disaster in game." },
      { pt: "Tutorial da Akali, passo 1: entrar no fumo. Passo 2: morrer na mesma.", en: "Akali tutorial, step 1: enter the smoke. Step 2: die anyway." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — devias era ressuscitar-te a ti dessa maré.", en: "Losses in a row — you should revive yourself out of this streak." },
      { pt: "Nem baloiçar por meio mapa te tira desta queda.", en: "Not even swinging across half the map pulls you out of this fall." },
      { pt: "Última hora: sentinela baloiça direto para a derrota.", en: "Breaking news: sentinel swings straight into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o sentinela ainda sem uma justiça feita.", en: "So many games and the sentinel still hasn't served any justice." },
      { pt: "0 vitórias — ressuscitas aliados mas não a tua winrate.", en: "0 wins — you revive allies but never your win rate." },
      { pt: "Aliados ressuscitados: vários. Vitórias próprias: zero.", en: "Allies revived: several. Own wins: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? O baloiço parece fixe até bateres numa parede.", en: "First time? The swing looks cool until you smack into a wall." },
      { pt: "Estreia no Akshan. Vais tentar o resgate épico e morrer no processo.", en: "Akshan debut. You'll try the epic revive and die in the process." },
      { pt: "⚠️ Akshan novo. Aviso: o baloiço acaba sempre numa parede.", en: "⚠️ New Akshan. Warning: the swing always ends in a wall." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — o headbutt está a atirar-te é para longe da vitória.", en: "Loss after loss — Headbutt is knocking you away from victory." },
      { pt: "Nem o minotauro aguenta esta enxurrada de derrotas.", en: "Not even the minotaur can tank this flood of losses." },
      { pt: "ERRO: headbutt mandou a vitória para longe. Outra vez.", en: "ERROR: headbutt knocked the win away. Again." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o combo headbutt-pulverize ainda sem render vitória.", en: "So many games and the headbutt-pulverize combo still hasn't paid off." },
      { pt: "0 vitórias — muita força, pouco resultado.", en: "0 wins — lots of muscle, little to show for it." },
      { pt: "🏆 Conquista: 'Muito Músculo, Zero Troféus'.", en: "🏆 Achievement: 'All Muscle, No Trophies'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer W-Q ao contrário e mandar o inimigo para casa a salvo.", en: "First time? You'll do W-Q backwards and send the enemy safely home." },
      { pt: "Estreia no minotauro. Aprende a ordem do combo antes que seja tarde.", en: "Minotaur debut. Learn the combo order before it's too late." },
      { pt: "Tutorial do Alistar, passo 1: W-Q, não Q-W. Já erraste.", en: "Alistar tutorial, step 1: W-Q, not Q-W. You already got it wrong." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o exército de Noxus segura esta maré.", en: "Losses in a row — not even Noxus's army holds this streak." },
      { pt: "A general devia era rever a estratégia toda depois disto.", en: "The general should really rethink the whole strategy after this." },
      { pt: "Última hora: general de Noxus recua em todas as frentes.", en: "Breaking news: Noxus general retreats on all fronts." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e Noxus ainda envergonhado do teu comando.", en: "So many games and Noxus is still ashamed of your command." },
      { pt: "0 vitórias — muita conquista prometida, nenhuma entregue.", en: "0 wins — plenty of conquest promised, none delivered." },
      { pt: "Relatório de guerra: muitas campanhas, zero conquistas.", en: "War report: many campaigns, zero conquests." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? O chicote tem mais alcance do que a tua noção do combo.", en: "First time? The whip has more range than your grasp of the combo." },
      { pt: "Estreia na Ambessa. Muitos dashes, pouca ideia de para onde.", en: "Ambessa debut. Lots of dashes, little idea where to." },
      { pt: "A carregar combos da Ambessa... erro: demasiados dashes.", en: "Loading Ambessa combos... error: too many dashes." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o múmia mais triste está tão em baixo como tu agora.", en: "Losses in a row — not even the saddest mummy is as down as you right now." },
      { pt: "A verdadeira maldição do Amumu és tu a insistir depois de tantas derrotas.", en: "Amumu's real curse is you insisting after this many losses." },
      { pt: "Horóscopo: hoje até o múmia mais triste te tem pena.", en: "Horoscope: today even the saddest mummy pities you." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantos abraços do bandage toss e nenhuma vitória para retribuir.", en: "So many Bandage Toss hugs and not one win to hug back." },
      { pt: "0 vitórias e o Amumu continua sozinho — combinam bem os dois.", en: "0 wins and Amumu is still all alone — you two make a great pair." },
      { pt: "O placar sussurra: 'estás tão sozinho como ele'.", en: "The scoreboard whispers: 'you're as alone as he is'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez com o múmia? Vais chorar, mas por outros motivos.", en: "First time with the mummy? You'll cry, just for other reasons." },
      { pt: "Estreia no Amumu. A tristeza vem incluída de fábrica.", en: "Amumu debut. The sadness comes factory-installed." },
      { pt: "🏆 Conquista: 'Tristeza de Fábrica'. Desbloqueada.", en: "🏆 Achievement: 'Factory-Installed Sadness'. Unlocked." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem renascer do ovo trava esta maré.", en: "Loss after loss — not even hatching from the egg stops this streak." },
      { pt: "O muro de gelo bloqueou tudo menos as tuas derrotas.", en: "The ice wall blocked everything except your losses." },
      { pt: "ERRO: ovo não chocou. A reiniciar... a reiniciar...", en: "ERROR: egg didn't hatch. Restarting... restarting..." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o ovo nunca chocou numa vitória.", en: "So many games and the egg never hatched into a win." },
      { pt: "0 vitórias — muito frio, nenhum resultado quente.", en: "0 wins — lots of frost, nothing warm to show." },
      { pt: "Muros no sítio errado: muitos. Vitórias: zero graus.", en: "Walls in the wrong spot: many. Wins: zero degrees." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pôr o muro no sítio errado e prender-te a ti.", en: "First time? You'll drop the wall in the wrong spot and trap yourself." },
      { pt: "Estreia na Anivia. O combo Q-E parece fácil até falhares o stun.", en: "Anivia debut. The Q-E combo looks easy until you whiff the stun." },
      { pt: "⚠️ Anivia nova. Aviso: vais prender a tua equipa com o muro.", en: "⚠️ New Anivia. Warning: you'll wall off your own team." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o Tibbers te aquece nesta maré.", en: "Losses in a row — not even Tibbers warms you up in this streak." },
      { pt: "Muito stun acumulado, zero vitórias acumuladas.", en: "Lots of stun stacked, zero wins stacked." },
      { pt: "Última hora: menina perde jogo, Tibbers pede transferência.", en: "Breaking news: girl loses game, Tibbers requests a transfer." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e a miúda mais assustadora ainda sem uma vitória.", en: "So many games and the scariest kid still without a win." },
      { pt: "0 vitórias — o Tibbers já está farto de te carregar.", en: "0 wins — Tibbers is tired of carrying you." },
      { pt: "A ciência: gastar o stun sem querer não é estratégia.", en: "The science: wasting the stun by accident isn't a strategy." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o stun sem querer e morrer sem ele.", en: "First time? You'll waste the stun by accident and die without it." },
      { pt: "Estreia na Annie. Conta os stacks ou entrega o combo à toa.", en: "Annie debut. Count the stacks or throw the combo away." },
      { pt: "Tutorial da Annie, passo 1: conta os stacks. Já perdeste a conta.", en: "Annie tutorial, step 1: count the stacks. You already lost count." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as cinco armas da lua invertem isto.", en: "Loss after loss — not even the five moon weapons turn this around." },
      { pt: "Não falas e não ganhas: dupla desilusão em série.", en: "You don't speak and you don't win: double disappointment on repeat." },
      { pt: "O placar diz o que tu não dizes: nada, e a perder.", en: "The scoreboard says what you won't: nothing, and losing." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a trocar de arma e nenhuma acertou numa vitória.", en: "So many games swapping weapons and none hit a win." },
      { pt: "0 vitórias — o arsenal lunar todo e nada para mostrar.", en: "0 wins — the whole lunar arsenal and nothing to show." },
      { pt: "ERRO: arma trocada. Arma errada. Sempre.", en: "ERROR: weapon swapped. Wrong weapon. Every time." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Nem vais saber qual arma tens na mão, quanto mais ganhar.", en: "First time? You won't even know which gun you're holding, let alone win." },
      { pt: "Estreia no Aphelios. São cinco armas para decorar e zero desculpas que colam.", en: "Aphelios debut. Five weapons to memorize and zero excuses that stick." },
      { pt: "⚠️ Aphelios novo. Aviso: são cinco armas para confundires.", en: "⚠️ New Aphelios. Warning: that's five weapons to confuse." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem a flecha de gelo acerta na vitória.", en: "Losses in a row — not even the ice arrow lands on victory." },
      { pt: "A rainha do Freljord está envergonhada com esta maré.", en: "The Queen of the Freljord is embarrassed by this streak." },
      { pt: "Horóscopo: a tua flecha vai a meio mapa. A vitória não.", en: "Horoscope: your arrow travels the whole map. The win doesn't." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e ainda não uniste as tribos nem uma vitória.", en: "So many games and you still haven't united the tribes or a single win." },
      { pt: "0 vitórias — muitas flechas, nenhuma no alvo certo.", en: "0 wins — plenty of arrows, none on the right target." },
      { pt: "Relatório real: rainha do Freljord ainda sem coroar uma vitória.", en: "Royal report: Queen of the Freljord still hasn't crowned a win." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar a ult a meio mapa e culpar o lag.", en: "First time? You'll miss the ult across the map and blame lag." },
      { pt: "Estreia na Ashe. Sem dash, se erras a flecha, estás por tua conta.", en: "Ashe debut. No dash — miss the arrow and you're on your own." },
      { pt: "A carregar a ult da Ashe... alcance infinito, pontaria zero.", en: "Charging Ashe's ult... infinite range, zero aim." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem um deus estelar trava esta queda.", en: "Loss after loss — not even a star god stops this fall." },
      { pt: "Forjaste estrelas e uma coleção de derrotas.", en: "You forged stars and a collection of losses." },
      { pt: "🏆 Conquista: 'Forjou Estrelas, Colecionou Derrotas'.", en: "🏆 Achievement: 'Forged Stars, Collected Losses'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a acumular stacks e nem uma vitória no universo.", en: "So many games stacking and not one win in the universe." },
      { pt: "0 vitórias — muito poder cósmico, resultado nenhum.", en: "0 wins — lots of cosmic power, no results." },
      { pt: "Stacks acumulados: muitos. Vitórias no universo: nenhuma.", en: "Stacks gathered: many. Wins in the universe: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais precisar de duzentos stacks só para perceber o campeão.", en: "First time? You'll need two hundred stacks just to understand the champion." },
      { pt: "Estreia no ASol. O early é doloroso e tu ainda o tornas pior.", en: "ASol debut. The early game hurts, and you make it hurt more." },
      { pt: "⚠️ ASol novo. Aviso: precisas de 200 stacks só para perceber isto.", en: "⚠️ New ASol. Warning: you need 200 stacks just to get it." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem os espíritos da natureza te safam desta.", en: "Losses in a row — not even the nature spirits save you here." },
      { pt: "A comunhão com a natureza rendeu foi uma maré de derrotas.", en: "The bond with nature yielded nothing but a losing streak." },
      { pt: "Última hora: bruxa dos espíritos perde-se no mundo errado.", en: "Breaking news: witch of the wilds lost in the wrong realm." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e os espíritos ainda não convocaram uma vitória.", en: "So many games and the spirits still haven't summoned a win." },
      { pt: "0 vitórias — muita magia dos espíritos, nenhum resultado terreno.", en: "0 wins — plenty of spirit magic, no earthly results." },
      { pt: "A ciência: muita magia, nenhum resultado terreno.", en: "The science: lots of magic, no earthly result." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais entrar no mundo dos espíritos e não achar a saída.", en: "First time? You'll step into the spirit realm and not find the exit." },
      { pt: "Estreia na Aurora. Muitos passos, poucos que levem à vitória.", en: "Aurora debut. Lots of steps, few that lead to a win." },
      { pt: "Tutorial da Aurora, passo 1: entrar no mundo dos espíritos. Passo 2: não achar a saída.", en: "Aurora tutorial, step 1: enter the spirit realm. Step 2: never find the exit." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem um exército de soldados de areia segura isto.", en: "Loss after loss — not even an army of sand soldiers holds this." },
      { pt: "O imperador de Shurima está envergonhado do próprio trono.", en: "The Emperor of Shurima is embarrassed by his own throne." },
      { pt: "ERRO: soldados posicionados. Sítio errado. Imperador caído.", en: "ERROR: soldiers positioned. Wrong spot. Emperor fallen." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e Shurima ainda sem uma vitória para celebrar.", en: "So many games and Shurima still without a win to celebrate." },
      { pt: "0 vitórias — o campeão mais difícil do jogo a provar-te isso.", en: "0 wins — the hardest champion in the game proving it to you." },
      { pt: "Relatório de Shurima: império por ressurgir, vitória por chegar.", en: "Shurima report: empire yet to rise, win yet to arrive." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Os soldados vão ficar onde não devem e tu morres onde não querias.", en: "First time? The soldiers will sit where they shouldn't and you'll die where you didn't want to." },
      { pt: "Estreia no Azir. Boa sorte com o campeão que veteranos ainda erram.", en: "Azir debut. Good luck with the champion veterans still misplay." },
      { pt: "⚠️ Azir novo. Aviso: até veteranos erram este. Tu então...", en: "⚠️ New Azir. Warning: even veterans misplay this one. You though..." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem os meeps juntam chimes que cheguem para virar isto.", en: "Losses in a row — not even the meeps gather enough chimes to turn this around." },
      { pt: "O andarilho cósmico anda perdido, tal como o teu histórico.", en: "The cosmic wanderer is lost, just like your record." },
      { pt: "🏆 Conquista: 'Andarilho Cósmico Perdido'.", en: "🏆 Achievement: 'Lost Cosmic Wanderer'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a apanhar chimes e nem uma vitória no cofre.", en: "So many games collecting chimes and not one win in the vault." },
      { pt: "0 vitórias — muito passeio cósmico, nenhum destino chamado vitória.", en: "0 wins — lots of cosmic strolling, no destination called victory." },
      { pt: "Chimes apanhados: muitos. Vitórias no cofre: zero.", en: "Chimes collected: many. Wins in the vault: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mandar o ult para cima da tua própria equipa.", en: "First time? You'll drop the ult right on your own team." },
      { pt: "Estreia no Bard. O túnel leva-te a todo o lado menos à vitória.", en: "Bard debut. The tunnel takes you everywhere except to victory." },
      { pt: "⚠️ Bard novo. Aviso: o ult também acerta na tua equipa.", en: "⚠️ New Bard. Warning: the ult hits your team too." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a imperatriz do Vazio devora esta maré.", en: "Loss after loss — not even the Void Empress devours this streak." },
      { pt: "Os tentáculos falharam em tudo, incluindo em travar as derrotas.", en: "The tentacles failed at everything, including stopping the losses." },
      { pt: "ERRO: imperatriz do Vazio devorou tudo menos a vitória.", en: "ERROR: Void Empress devoured everything but the win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o enxame ainda sem uma vitória para crescer.", en: "So many games and the swarm still has no win to grow on." },
      { pt: "0 vitórias — muito dash, pouca direção.", en: "0 wins — lots of dashing, little direction." },
      { pt: "Relatório do Vazio: enxame por crescer, vitória por nascer.", en: "Void report: swarm yet to grow, win yet to be born." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar dash para dentro de tudo e sair morta na mesma.", en: "First time? You'll dash into everything and come out dead anyway." },
      { pt: "Estreia na Belveth. O early do Vazio é cruel e tu ainda o pioras.", en: "Belveth debut. The Void's early game is cruel and you make it worse." },
      { pt: "Tutorial da Belveth, passo 1: dash para dentro. Passo 2: morrer lá dentro.", en: "Belveth tutorial, step 1: dash in. Step 2: die in there." },
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
    lossStreak: [
      { pt: "Tantas derrotas seguidas que nem o grab as consegue puxar de volta.", en: "So many losses in a row that not even the grab can pull them back." },
      { pt: "O robô processou os dados: estás em queda livre.", en: "The robot processed the data: you're in free fall." },
      { pt: "ERRO: grab falhado. A processar humilhação...", en: "ERROR: grab missed. Processing humiliation..." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantos grabs e nenhuma vitória agarrada. Erro de sistema.", en: "So many grabs and not a single win grabbed. System error." },
      { pt: "0 vitórias — o Blitzcrank puxa toda a gente menos o sucesso.", en: "0 wins — Blitzcrank pulls in everyone except success." },
      { pt: "🏆 Conquista: 'Puxa Toda a Gente Menos o Sucesso'.", en: "🏆 Achievement: 'Pulls In Everyone But Success'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar grabs que juras que estavam lá.", en: "First time? You'll miss grabs you swear were right there." },
      { pt: "Estreia no robô. O primeiro grab decide se hoje há humilhação.", en: "Robot debut. The first grab decides if today brings humiliation." },
      { pt: "⚠️ Blitzcrank novo. Aviso: vais falhar grabs que juras que estavam lá.", en: "⚠️ New Blitzcrank. Warning: you'll miss grabs you swear were there." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — não estás em chamas, estás só a arder à toa.", en: "Loss after loss — you're not on fire, you're just burning for nothing." },
      { pt: "O elemental de fogo apagou-se a meio desta maré.", en: "The fire elemental burned out in the middle of this streak." },
      { pt: "Última hora: elemental de fogo apaga-se a meio da maré.", en: "Breaking news: fire elemental burns out mid-streak." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a incendiar tudo e nem uma vitória nas cinzas.", en: "So many games torching everything and not one win in the ashes." },
      { pt: "0 vitórias — muito combo, pouco resultado.", en: "0 wins — lots of combo, little result." },
      { pt: "Coisas incendiadas: tudo. Vitórias: nenhuma nas cinzas.", en: "Things set ablaze: everything. Wins: none in the ashes." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o stun no alvo errado todas as vezes.", en: "First time? You'll waste the stun on the wrong target every time." },
      { pt: "Estreia no Brand. Sem escapatória, se falhas o combo, ardes tu.", en: "Brand debut. No escape — miss the combo and you're the one who burns." },
      { pt: "A carregar o combo do Brand... erro: stun no alvo errado.", en: "Loading Brand's combo... error: stun on the wrong target." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o escudo mais forte do Freljord aguenta isto.", en: "Losses in a row — not even the Freljord's strongest shield holds this." },
      { pt: "O coração do Freljord está partido com esta maré.", en: "The Heart of the Freljord is broken by this streak." },
      { pt: "O escudo do Freljord sussurra: 'nem eu aguento isto'.", en: "The Freljord's shield whispers: 'even I can't hold this'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a proteger toda a gente e nem uma vitória protegida.", en: "So many games shielding everyone and not one win shielded." },
      { pt: "0 vitórias — muito escudo, nenhum troféu.", en: "0 wins — lots of shield, no trophy." },
      { pt: "Relatório: muitos escudos, nenhum troféu protegido.", en: "Report: many shields, no trophy protected." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? O ult é lindo até o pores atrás do inimigo em vez de à frente.", en: "First time? The ult is gorgeous until you drop it behind the enemy instead of in front." },
      { pt: "Estreia no Braum. Sem os stacks do passivo, o teu stun é só uma promessa.", en: "Braum debut. Without the passive stacks, your stun is just a promise." },
      { pt: "Tutorial do Braum, passo 1: acumula o passivo. Sem isso, o stun é uma promessa.", en: "Braum tutorial, step 1: stack the passive. Without it, the stun's just a promise." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a fome de sangue saboreia uma vitória.", en: "Loss after loss — not even the blood hunger tastes a win." },
      { pt: "As correntes soltaram-se e mesmo assim só há derrotas.", en: "The chains came off and still there are only losses." },
      { pt: "Horóscopo: muita fome de sangue, nenhuma refeição chamada vitória.", en: "Horoscope: lots of blood hunger, no meal called victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas em frenesim e nem uma vitória mordida.", en: "So many games in a frenzy and not one win to bite into." },
      { pt: "0 vitórias — muita fome, nenhuma refeição.", en: "0 wins — lots of hunger, no meal." },
      { pt: "🏆 Conquista: 'Frenesim Sem Resultados'.", en: "🏆 Achievement: 'Frenzy Without Results'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais entrar em frenesim e perder o controlo — literalmente.", en: "First time? You'll frenzy and lose control — literally." },
      { pt: "Estreia na Briar. Ou te curas a morder, ou morres a tentar.", en: "Briar debut. Either you heal by biting, or you die trying." },
      { pt: "⚠️ Briar nova. Aviso: vais entrar em frenesim e perder o controlo. Literalmente.", en: "⚠️ New Briar. Warning: you'll frenzy and lose control. Literally." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o headshot mais preciso de Piltover te safa.", en: "Losses in a row — not even Piltover's most precise headshot saves you." },
      { pt: "A xerife devia era prender-te por esta maré.", en: "The sheriff should arrest you for this streak." },
      { pt: "Última hora: xerife de Piltover prende-se a si própria numa armadilha.", en: "Breaking news: Piltover sheriff caught in her own trap." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a montar armadilhas e nem uma vitória apanhada.", en: "So many games setting traps and not one win caught." },
      { pt: "0 vitórias — muita mira, nenhum alvo que conte.", en: "0 wins — lots of aim, no target that counts." },
      { pt: "ERRO: armadilha colocada onde ninguém passa.", en: "ERROR: trap placed where no one walks." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pôr armadilhas onde ninguém passa e culpar a sorte.", en: "First time? You'll place traps where no one walks and blame luck." },
      { pt: "Estreia na Caitlyn. O alcance é enorme, a tua noção de posicionamento nem por isso.", en: "Caitlyn debut. The range is huge, your sense of positioning less so." },
      { pt: "⚠️ Caitlyn nova. Aviso: alcance enorme, posicionamento nem por isso.", en: "⚠️ New Caitlyn. Warning: huge range, positioning not so much." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as lâminas hextech cortam esta maré.", en: "Loss after loss — not even the hextech blades cut this streak." },
      { pt: "A executora de Piltover falhou na execução mais básica: ganhar.", en: "Piltover's enforcer failed the most basic execution: winning." },
      { pt: "ERRO: execução falhada na tarefa mais básica: ganhar.", en: "ERROR: execution failed at the most basic task: winning." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e a execução ainda sem uma vitória perfeita.", en: "So many games and the execution still without one clean win." },
      { pt: "0 vitórias — muita precisão, nenhum resultado.", en: "0 wins — lots of precision, no results." },
      { pt: "Relatório de Piltover: muita precisão, nenhum resultado.", en: "Piltover report: lots of precision, no result." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? O hookshot vai pregar-te à parede errada.", en: "First time? The hookshot will pin you to the wrong wall." },
      { pt: "Estreia na Camille. O ult prende o alvo — pena não prender a vitória.", en: "Camille debut. The ult traps the target — too bad it doesn't trap the win." },
      { pt: "Tutorial da Camille, passo 1: hookshot. Passo 2: pregar-te na parede errada.", en: "Camille tutorial, step 1: hookshot. Step 2: pin yourself to the wrong wall." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o olhar petrificante paralisa esta maré.", en: "Losses in a row — not even the petrifying gaze freezes this streak." },
      { pt: "A cobra mudou de pele e continua a perder na mesma.", en: "The snake shed its skin and keeps losing anyway." },
      { pt: "Horóscopo: mudaste de pele, não de resultados.", en: "Horoscope: you shed your skin, not your results." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a envenenar tudo e nem uma vitória no veneno.", en: "So many games poisoning everything and not one win in the venom." },
      { pt: "0 vitórias — muita toxina, nenhum antídoto para a derrota.", en: "0 wins — lots of toxin, no antidote for defeat." },
      { pt: "Veneno espalhado: muito. Antídoto para a derrota: nenhum.", en: "Poison spread: lots. Antidote for defeat: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais lançar o ult de costas e petrificar o ar.", en: "First time? You'll cast the ult backwards and petrify thin air." },
      { pt: "Estreia na Cassiopeia. Sem botas, se te apanham fora de posição, acabou.", en: "Cassiopeia debut. No boots — get caught out of position and it's over." },
      { pt: "⚠️ Cassiopeia nova. Aviso: sem botas, fora de posição é morte certa.", en: "⚠️ New Cassiopeia. Warning: no boots, out of position means certain death." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Feast engole esta maré.", en: "Loss after loss — not even Feast swallows this streak." },
      { pt: "O terror do Vazio devia era ter medo de ti, pelo desempenho.", en: "The Terror of the Void should be scared of you, given this performance." },
      { pt: "🏆 Conquista: 'Cresceu, Perdeu na Mesma'.", en: "🏆 Achievement: 'Grew Big, Lost Anyway'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a crescer e nem uma vitória no menu.", en: "So many games growing and not one win on the menu." },
      { pt: "0 vitórias — muitos stacks de Feast, nenhum de vitórias.", en: "0 wins — plenty of Feast stacks, none of wins." },
      { pt: "Stacks de Feast: muitos. Stacks de vitórias: zero.", en: "Feast stacks: many. Win stacks: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o Rupture e ficar do tamanho de um minion.", en: "First time? You'll miss Rupture and stay minion-sized." },
      { pt: "Estreia no Chogath. Acerta o knockup ou fica só a ser grande e inútil.", en: "Chogath debut. Land the knockup or just be big and useless." },
      { pt: "Tutorial do Chogath, passo 1: acertar o Rupture. Falhaste. Ficas do tamanho de um minion.", en: "Chogath tutorial, step 1: land Rupture. You missed. Now you're minion-sized." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Pacote (mini-gun) salva este voo.", en: "Loss after loss — not even the Package (mini-gun) saves this flight." },
      { pt: "O piloto yordle está mesmo a cair a pique.", en: "The yordle pilot is really going down in flames." },
      { pt: "Última hora: piloto yordle cai a pique pela enésima vez.", en: "Breaking news: yordle pilot goes down in flames yet again." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a disparar mísseis e nem um acertou numa vitória.", en: "So many games firing missiles and none hit a win." },
      { pt: "0 vitórias — muito voo, nenhuma aterragem em vitória.", en: "0 wins — lots of flying, no landing on victory." },
      { pt: "Relatório de voo: muitos mísseis, nenhuma aterragem em vitória.", en: "Flight report: many missiles, no landing on victory." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o Pacote a fugir em vez de a entrar.", en: "First time? You'll burn the Package running away instead of diving in." },
      { pt: "Estreia no Corki. Os mísseis parecem fáceis até teres de os mirar.", en: "Corki debut. The missiles look easy until you actually have to aim them." },
      { pt: "A carregar o Pacote do Corki... gasto a fugir em vez de a entrar.", en: "Loading Corki's Package... spent running away instead of diving in." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o machado noxiano decapita esta maré.", en: "Loss after loss — not even the Noxian axe decapitates this streak." },
      { pt: "A hemorragia é a única coisa que sangras bem ultimamente.", en: "Hemorrhage is the only thing you're bleeding well lately." },
      { pt: "ERRO: machado acertou pelo cabo. Dano: zero.", en: "ERROR: axe hit with the handle. Damage: zero." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e Noxus ainda à espera da tua primeira vitória.", en: "So many games and Noxus is still waiting for your first win." },
      { pt: "0 vitórias — muitos stacks de sangramento, nenhum de vitórias.", en: "0 wins — plenty of bleed stacks, none of wins." },
      { pt: "Relatório de Noxus: muito sangramento, nenhuma vitória.", en: "Noxus report: lots of bleed, no win." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais acertar o machado pelo cabo e fazer zero dano.", en: "First time? You'll hit the axe with the handle and deal zero damage." },
      { pt: "Estreia no Darius. O ult reseta — pena que a tua sorte não.", en: "Darius debut. The ult resets — too bad your luck doesn't." },
      { pt: "🏆 Conquista de estreia: 'Segurou o Machado ao Contrário'.", en: "🏆 Debut achievement: 'Held the Axe Backwards'." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem a lua cheia ilumina esta maré.", en: "Losses in a row — not even the full moon lights up this streak." },
      { pt: "A Lunari devia era escolher outro campeão para representar.", en: "The Lunari should pick another champion to represent them." },
      { pt: "Horóscopo: lua cheia, azar cheio.", en: "Horoscope: full moon, full misfortune." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a girar a foice e nem uma vitória cortada.", en: "So many games swinging the scythe and not one win cut down." },
      { pt: "0 vitórias — muita lua, nenhuma fase cheia de vitórias.", en: "0 wins — lots of moon, never a full phase of victories." },
      { pt: "Foices giradas: muitas. Vitórias cortadas: nenhuma.", en: "Scythes swung: many. Wins cut down: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o R para dentro de cinco pessoas e explodir.", en: "First time? You'll R into five people and pop." },
      { pt: "Estreia na Diana. Acerta o Q ou o combo todo desaba.", en: "Diana debut. Land the Q or the whole combo falls apart." },
      { pt: "Tutorial da Diana, passo 1: R para dentro de cinco. Passo 2: explodir.", en: "Diana tutorial, step 1: R into five. Step 2: pop." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os machados giratórios voltam para ti.", en: "Loss after loss — not even the spinning axes come back to you." },
      { pt: "A plateia (League) não está a aplaudir nada disto.", en: "The crowd (League) isn't applauding any of this." },
      { pt: "Última hora: espetáculo cancelado, plateia pede reembolso.", en: "Breaking news: show cancelled, crowd demands refund." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a girar machados e nem uma vitória apanhada no ar.", en: "So many games spinning axes and not one win caught midair." },
      { pt: "0 vitórias — muito espetáculo, plateia nenhuma.", en: "0 wins — lots of showmanship, no crowd." },
      { pt: "A plateia sussurra: 'devolve o League'.", en: "The crowd whispers: 'give back the League'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais correr atrás dos machados e esquecer-te de jogar.", en: "First time? You'll chase the axes and forget to actually play." },
      { pt: "Estreia no Draven. Apanhar dois machados é fácil, ganhar é que não.", en: "Draven debut. Catching two axes is easy, winning isn't." },
      { pt: "⚠️ Draven novo. Aviso: apanhar os machados é fácil, ganhar é que não.", en: "⚠️ New Draven. Warning: catching the axes is easy, winning isn't." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — Mundo vai onde lhe apetece, menos à vitória.", en: "Loss after loss — Mundo goes wherever he pleases, except to victory." },
      { pt: "Nem os químicos de Zaun curam esta maré.", en: "Not even Zaun's chemicals cure this streak." },
      { pt: "Mundo vai onde lhe apetece. Hoje, direto à derrota.", en: "Mundo goes where he pleases. Today, straight to defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o Mundo ainda sem provar uma vitória.", en: "So many games and Mundo still hasn't tasted a win." },
      { pt: "0 vitórias — muita vida, nenhuma valeu de nada.", en: "0 wins — lots of health, none of it mattered." },
      { pt: "Vida acumulada: muita. Vitórias: nenhuma valeu de nada.", en: "Health stacked: lots. Wins: none of it mattered." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais atirar cutelos ao vento e ficar sem vida.", en: "First time? You'll throw cleavers into the wind and run out of health." },
      { pt: "Estreia no Mundo. Ser difícil de matar não chega para ganhar.", en: "Mundo debut. Being hard to kill isn't enough to win." },
      { pt: "A carregar cutelos... a atirar ao vento... ficaste sem vida.", en: "Loading cleavers... throwing into the wind... you're out of health." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem rebobinar o tempo apaga esta maré.", en: "Loss after loss — not even rewinding time erases this streak." },
      { pt: "O Z-Drive devia era rebobinar-te para antes destas escolhas.", en: "The Z-Drive should rewind you to before these choices." },
      { pt: "ERRO: tempo rebobinado. Mesmo resultado. A rebobinar...", en: "ERROR: time rewound. Same result. Rewinding..." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e nem no passado houve uma vitória.", en: "So many games and not even the past held a win." },
      { pt: "0 vitórias — muito timing, nenhum momento certo.", en: "0 wins — lots of timing, never the right moment." },
      { pt: "A ciência: nem no passado houve uma vitória.", en: "The science: not even the past held a win." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais usar o R para atacar e voltar para o meio deles.", en: "First time? You'll use the R to attack and rewind right back into them." },
      { pt: "Estreia no Ekko. Errar o timing do W é morrer sem stun.", en: "Ekko debut. Miss the W timing and you die without the stun." },
      { pt: "⚠️ Ekko novo. Aviso: o R devolve-te para o meio deles.", en: "⚠️ New Ekko. Warning: the R sends you back into them." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem a rainha aranha te tira desta teia de derrotas.", en: "Losses in a row — not even the Spider Queen frees you from this web of losses." },
      { pt: "Nem em forma humana nem de aranha há vitória à vista.", en: "Neither human form nor spider form has a win in sight." },
      { pt: "Última hora: rainha aranha presa na própria teia de derrotas.", en: "Breaking news: Spider Queen caught in her own web of losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a tecer teias e nem uma vitória apanhada.", en: "So many games weaving webs and not one win caught." },
      { pt: "0 vitórias — muitas transformações, nenhuma em vencedora.", en: "0 wins — lots of transformations, none into a winner." },
      { pt: "Relatório: muitas teias tecidas, nenhuma vitória apanhada.", en: "Report: many webs woven, no win caught." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o cocoon e ficar aranha no meio deles.", en: "First time? You'll miss the cocoon and be a spider stuck among them." },
      { pt: "Estreia na Elise. Duas formas para gerir e tu ainda não geres uma.", en: "Elise debut. Two forms to manage and you can't handle one yet." },
      { pt: "Tutorial da Elise, passo 1: acertar o cocoon. Falhaste. Ficas aranha no meio deles.", en: "Elise tutorial, step 1: land the cocoon. You missed. Now you're a spider in their midst." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o disfarce esconde esta vergonha.", en: "Loss after loss — not even stealth hides this embarrassment." },
      { pt: "'Hate is good', mas as tuas vitórias não são nenhumas.", en: "'Hate is good,' but your wins are nonexistent." },
      { pt: "O disfarce sussurra: 'nem eu escondo esta vergonha'.", en: "The disguise whispers: 'even I can't hide this shame'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas na sombra e nem uma vitória seduzida.", en: "So many games in the shadows and not one win seduced." },
      { pt: "0 vitórias — muito charme, nenhum resultado.", en: "0 wins — lots of charm, no results." },
      { pt: "'Hate is good', vitórias são nenhumas.", en: "'Hate is good,' wins are nonexistent." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais sair do stealth cedo demais e apanhar porrada.", en: "First time? You'll drop stealth too early and get punished." },
      { pt: "Estreia na Evelynn. Antes dos seis níveis, és só um alvo fácil.", en: "Evelynn debut. Before level six, you're just an easy target." },
      { pt: "⚠️ Evelynn nova. Aviso: antes do nível 6, és só um alvo fácil.", en: "⚠️ New Evelynn. Warning: before level 6, you're just an easy target." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Arcane Shift te tira desta maré.", en: "Loss after loss — not even Arcane Shift blinks you out of this streak." },
      { pt: "O explorador só explorou o caminho para a derrota.", en: "The explorer only explored the road to defeat." },
      { pt: "Horóscopo: o explorador só explora o caminho para a derrota.", en: "Horoscope: the explorer only explores the road to defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar skillshots e nem uma vitória acertada.", en: "So many games throwing skillshots and not one win landed." },
      { pt: "0 vitórias — muito Mystic Shot, nenhum no alvo certo.", en: "0 wins — lots of Mystic Shot, none on the right target." },
      { pt: "Mystic Shots atirados: muitos. No alvo certo: nenhum.", en: "Mystic Shots fired: many. On the right target: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar todos os Q e culpar a hitbox.", en: "First time? You'll miss every Q and blame the hitbox." },
      { pt: "Estreia no Ezreal. Se não acertas skillshots, não fazes nada.", en: "Ezreal debut. If you don't land skillshots, you do nothing." },
      { pt: "⚠️ Ezreal novo. Aviso: se não acertas skillshots, não fazes nada.", en: "⚠️ New Ezreal. Warning: if you don't land skillshots, you do nothing." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem o medo assusta ninguém com este histórico.", en: "Losses in a row — not even Fear scares anyone with this record." },
      { pt: "O espantalho está mais assustado contigo do que tu com ele.", en: "The scarecrow is more scared of you than you are of him." },
      { pt: "O espantalho sussurra: 'tu assustas-me mais a mim'.", en: "The scarecrow whispers: 'you scare me more'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a espalhar terror e nem uma vitória assombrada.", en: "So many games spreading terror and not one win to haunt." },
      { pt: "0 vitórias — muito Crowstorm, nenhum susto que rendesse.", en: "0 wins — lots of Crowstorm, no scare that paid off." },
      { pt: "Relatório: muito terror espalhado, nenhuma vitória assombrada.", en: "Report: lots of terror spread, no win haunted." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer o ult à vista de todos e assustar ninguém.", en: "First time? You'll ult in plain sight and scare no one." },
      { pt: "Estreia no Fiddlesticks. Sem a emboscada, és só um espantalho lento.", en: "Fiddlesticks debut. Without the ambush, you're just a slow scarecrow." },
      { pt: "Tutorial do Fiddlesticks, passo 1: emboscar. Fizeste o ult à vista de todos.", en: "Fiddlesticks tutorial, step 1: ambush. You ulted in plain sight." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem acertaste um vital, quanto mais uma vitória.", en: "Loss after loss — you haven't even hit a vital, let alone a win." },
      { pt: "A duelista mais elegante do jogo, sem elegância nenhuma nos resultados.", en: "The most elegant duelist in the game, with zero elegance in the results." },
      { pt: "ERRO: vital não encontrado. Elegância: zero.", en: "ERROR: vital not found. Elegance: zero." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a caçar vitais e nem uma vitória apunhalada.", en: "So many games hunting vitals and not one win stabbed." },
      { pt: "0 vitórias — muita lâmina, nenhum ponto certo.", en: "0 wins — lots of blade, never the right spot." },
      { pt: "🏆 Conquista: 'Duelista Elegante, Resultados Nem Por Isso'.", en: "🏆 Achievement: 'Elegant Duelist, Results Not So Much'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais usar o Riposte tarde demais e comer o stun.", en: "First time? You'll Riposte too late and eat the stun." },
      { pt: "Estreia na Fiora. Se não lês os vitais, és só uma espada a passear.", en: "Fiora debut. If you can't read the vitals, you're just a wandering sword." },
      { pt: "⚠️ Fiora nova. Aviso: Riposte tarde demais e comes o stun.", en: "⚠️ New Fiora. Warning: Riposte too late and you eat the stun." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o tridente pesca uma vitória desta maré.", en: "Loss after loss — not even the trident fishes a win out of this streak." },
      { pt: "O peixe-yordle mais escorregadio, mas escorregou é da vitória.", en: "The slipperiest yordle-fish around, but it slipped right past victory." },
      { pt: "Última hora: peixe-yordle escorrega da vitória outra vez.", en: "Breaking news: yordle-fish slips off victory again." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar por cima de tudo e nem uma vitória.", en: "So many games vaulting over everything and not one win." },
      { pt: "0 vitórias — muito truque, nenhum coelho na cartola.", en: "0 wins — lots of tricks, no rabbit in the hat." },
      { pt: "Truques feitos: muitos. Coelhos na cartola: zero.", en: "Tricks pulled: many. Rabbits in the hat: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o E na direção errada e morrer no ar.", en: "First time? You'll E in the wrong direction and die midair." },
      { pt: "Estreia no Fizz. Se falhas o tubarão, o combo não mata ninguém.", en: "Fizz debut. Miss the shark and the combo kills no one." },
      { pt: "A carregar o tubarão do Fizz... falhado... o combo não mata ninguém.", en: "Loading Fizz's shark... missed... the combo kills no one." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a entrada heroica chama alguém para te salvar.", en: "Loss after loss — not even Hero's Entrance calls anyone to save you." },
      { pt: "A gárgula de pedra está mais dura contigo do que consigo.", en: "The stone gargoyle is harder on you than on himself." },
      { pt: "ERRO: entrada heroica chegou tarde. Todos mortos.", en: "ERROR: hero's entrance arrived late. Everyone dead." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a proteger de magia e nem uma vitória blindada.", en: "So many games shielding against magic and not one win armored." },
      { pt: "0 vitórias — muito escudo mágico, nenhum troféu.", en: "0 wins — lots of magic shield, no trophy." },
      { pt: "Relatório: muito escudo mágico, nenhum troféu.", en: "Report: lots of magic shield, no trophy." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer o ult para o outro lado do mapa e chegar tarde.", en: "First time? You'll ult to the wrong side of the map and arrive late." },
      { pt: "Estreia no Galio. Sem alvo de magia à frente, o teu W é meio inútil.", en: "Galio debut. With no magic to face, your W is half useless." },
      { pt: "⚠️ Galio novo. Aviso: sem magia à frente, o teu W é meio inútil.", en: "⚠️ New Galio. Warning: with no magic to face, your W is half useless." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a laranja cura esta maré.", en: "Loss after loss — not even the orange cures this streak." },
      { pt: "Os barris explodiram tudo, menos as tuas derrotas.", en: "The barrels blew up everything except your losses." },
      { pt: "Os barris explodiram tudo. Menos as tuas derrotas.", en: "The barrels blew up everything. Except your losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a rebentar barris e nem uma vitória na explosão.", en: "So many games popping barrels and not one win in the blast." },
      { pt: "0 vitórias — muita pólvora, nenhum tesouro.", en: "0 wins — lots of gunpowder, no treasure." },
      { pt: "Barris rebentados: muitos. Tesouros: nenhum.", en: "Barrels popped: many. Treasures: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais bater nos teus próprios barris e não encadear nenhum.", en: "First time? You'll hit your own barrels and chain none of them." },
      { pt: "Estreia no Gangplank. Sem a corrente de barris, és só um pirata com pistola.", en: "Gangplank debut. Without the barrel chain, you're just a pirate with a pistol." },
      { pt: "Tutorial do Gangplank, passo 1: encadear barris. Bateste nos teus próprios.", en: "Gangplank tutorial, step 1: chain the barrels. You hit your own." },
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
    lossStreak: [
      { pt: "Rodaste, rodaste, e as derrotas continuam a acumular.", en: "You spun and spun, and the losses just keep stacking." },
      { pt: "Nem o Judgment gira depressa que chegue para fugir desta maré.", en: "Not even Judgment spins fast enough to escape this streak." },
      { pt: "Última hora: spin-to-win vira spin-to-lose oficialmente.", en: "Breaking news: spin-to-win officially becomes spin-to-lose." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a girar e Demacia ainda envergonhada de ti.", en: "So many games spinning and Demacia is still embarrassed by you." },
      { pt: "0 vitórias — o spin-to-win virou spin-to-lose contigo.", en: "0 wins — spin-to-win became spin-to-lose with you." },
      { pt: "🏆 Conquista: 'Rodou Tudo Menos Vitórias'.", en: "🏆 Achievement: 'Spun Everything But Wins'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Carrega Q, gira, e reza. É basicamente isso.", en: "First time? Press Q, spin, and pray. That's basically it." },
      { pt: "Estreia no Garen. Se isto correr mal, nem o silêncio te cala a vergonha.", en: "Garen debut. If this goes badly, not even Silence can quiet the shame." },
      { pt: "A carregar Garen... Q, girar, rezar. É basicamente isso.", en: "Loading Garen... Q, spin, pray. That's basically it." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem virar Mega Gnar resolve esta maré.", en: "Loss after loss — not even turning into Mega Gnar fixes this streak." },
      { pt: "O boomerang voltou sempre vazio de vitórias.", en: "The boomerang always came back empty of wins." },
      { pt: "ERRO: virou Mega na hora errada. Sem escapatória.", en: "ERROR: went Mega at the wrong time. No escape." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar entre formas e nem uma vitória apanhada.", en: "So many games hopping between forms and not one win caught." },
      { pt: "0 vitórias — muita raiva acumulada, nenhum resultado.", en: "0 wins — lots of rage stacked, no results." },
      { pt: "Boomerangs atirados: muitos. Vitórias de volta: nenhuma.", en: "Boomerangs thrown: many. Wins coming back: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais virar Mega na altura errada e sem escapatória.", en: "First time? You'll go Mega at the wrong time with no escape." },
      { pt: "Estreia no Gnar. Se não controlas a barra de raiva, ela controla-te a ti.", en: "Gnar debut. If you don't control the rage bar, it controls you." },
      { pt: "⚠️ Gnar novo. Aviso: ou controlas a barra de raiva, ou ela controla-te.", en: "⚠️ New Gnar. Warning: control the rage bar, or it controls you." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o barril rolante empurra esta maré.", en: "Loss after loss — not even Explosive Cask pushes this streak away." },
      { pt: "Bêbado a mais para acertar sequer numa vitória.", en: "Too drunk to land even a single win." },
      { pt: "Horóscopo: bêbado a mais para acertar numa vitória.", en: "Horoscope: too drunk to land a single win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a rebolar barris e nem uma vitória na festa.", en: "So many games rolling barrels and not one win at the party." },
      { pt: "0 vitórias — muita bebida, nenhuma razão para brindar.", en: "0 wins — lots of drink, no reason to toast." },
      { pt: "Relatório da festa: muita bebida, nenhuma razão para brindar.", en: "Party report: lots of drink, no reason to toast." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mandar o ult a afastar o inimigo em vez de o juntar.", en: "First time? You'll cask the enemy away instead of pulling them in." },
      { pt: "Estreia no Gragas. Acerta o barril ou fica só a ser o bêbado do lobby.", en: "Gragas debut. Land the barrel or just be the lobby drunk." },
      { pt: "Tutorial do Gragas, passo 1: cask para juntar. Empurraste-os para longe.", en: "Gragas tutorial, step 1: cask to group. You knocked them away." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a caçadeira acerta uma vitória.", en: "Loss after loss — not even the shotgun hits a win." },
      { pt: "O charuto está mais aceso que o teu desempenho.", en: "The cigar is more lit than your performance." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a disparar buckshots e nem uma vitória à queima-roupa.", en: "So many games firing buckshots and not one point-blank win." },
      { pt: "0 vitórias — muita pólvora, nenhum alvo abatido que contasse.", en: "0 wins — lots of gunpowder, no kill that counted." },
      { pt: "Buckshots à queima-roupa: muitos. Vitórias: nenhuma.", en: "Point-blank buckshots: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais disparar longe e queixar-te que não fazes dano.", en: "First time? You'll shoot from range and complain you deal no damage." },
      { pt: "Estreia no Graves. Ele bate perto — se ficas longe, és inútil.", en: "Graves debut. He hits up close — stay far and you're useless." },
      { pt: "⚠️ Graves novo. Aviso: ele bate perto. Fica longe e és inútil.", en: "⚠️ New Graves. Warning: he hits up close. Stay far and you're useless." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a tesoura sagrada corta esta maré.", en: "Loss after loss — not even the sacred scissors cut this streak." },
      { pt: "A boneca senciente devia era cortar-te da equipa.", en: "The sentient doll should cut you from the team." },
      { pt: "Última hora: boneca senciente considera cortar-se da equipa.", en: "Breaking news: sentient doll considers cutting herself from the team." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas na bruma e nem uma vitória costurada.", en: "So many games in the mist and not one win stitched." },
      { pt: "0 vitórias — muitos snips, nenhum no alvo certo.", en: "0 wins — lots of snips, none on the right target." },
      { pt: "Snips dados: muitos. No alvo certo: nenhum.", en: "Snips made: many. On the right target: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais sair da bruma e apanhar tudo o que ela bloqueava.", en: "First time? You'll step out of the mist and eat everything it was blocking." },
      { pt: "Estreia na Gwen. Fora do W, és um alvo de pano.", en: "Gwen debut. Outside the W, you're a cloth target." },
      { pt: "⚠️ Gwen nova. Aviso: fora da bruma, és um alvo de pano.", en: "⚠️ New Gwen. Warning: outside the mist, you're a cloth target." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o cavalo espectral galopa para fora desta.", en: "Loss after loss — not even the spectral horse gallops out of this." },
      { pt: "O Rampage pisou tudo menos o teu próprio orgulho.", en: "Rampage trampled everything except your own pride." },
      { pt: "Última hora: cavalo espectral galopa direto para a derrota.", en: "Breaking news: spectral horse gallops straight into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a galopar e nem uma vitória alcançada.", en: "So many games galloping and not one win reached." },
      { pt: "0 vitórias — muita carga, nenhum embate ganho.", en: "0 wins — lots of charging, no clash won." },
      { pt: "Cargas dadas: muitas. Embates ganhos: nenhum.", en: "Charges made: many. Clashes won: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar charge sem distância suficiente e bater de raspão.", en: "First time? You'll charge without enough runway and clip them weakly." },
      { pt: "Estreia no Hecarim. Sem a distância certa, o teu E não empurra ninguém.", en: "Hecarim debut. Without the right distance, your E knocks no one back." },
      { pt: "⚠️ Hecarim novo. Aviso: sem distância, o E não empurra ninguém.", en: "⚠️ New Hecarim. Warning: without distance, the E knocks no one back." },
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
    lossStreak: [
      { pt: "Derrotas seguidas — nem as torretas defendem esta maré.", en: "Losses in a row — not even the turrets defend against this streak." },
      { pt: "O génio de Piltover devia era inventar uma máquina de ganhar.", en: "Piltover's genius should invent a winning machine." },
      { pt: "ERRO: torretas colocadas onde ninguém luta.", en: "ERROR: turrets placed where no one fights." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a montar torretas e nem uma vitória construída.", en: "So many games building turrets and not one win engineered." },
      { pt: "0 vitórias — muita engenhoca, nenhum resultado.", en: "0 wins — lots of gadgets, no results." },
      { pt: "O génio de Piltover ainda não inventou a máquina de ganhar.", en: "Piltover's genius still hasn't invented a winning machine." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pôr as torretas onde ninguém luta e ficar sem elas.", en: "First time? You'll place turrets where no one fights and lose them for nothing." },
      { pt: "Estreia no Heimer. Sem gerir os cooldowns das torretas, és inofensivo.", en: "Heimer debut. Without managing the turret cooldowns, you're harmless." },
      { pt: "Tutorial do Heimer, passo 1: gerir cooldowns das torretas. Passo 2: não.", en: "Heimer tutorial, step 1: manage turret cooldowns. Step 2: nope." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os teus pincéis pintam uma saída.", en: "Loss after loss — not even your brushes paint a way out." },
      { pt: "A tua arte é só uma obra-prima de derrotas.", en: "Your art is just a masterpiece of losses." },
      { pt: "A tua arte, resumida: uma obra-prima de derrotas.", en: "Your art, in short: a masterpiece of losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a pintar e nem uma tela acabou em vitória.", en: "So many games painting and not one canvas ended in a win." },
      { pt: "0 vitórias — muitas combinações, nenhuma acertou.", en: "0 wins — lots of combinations, none landed." },
      { pt: "Relatório de galeria: muitas telas, nenhuma em vitória.", en: "Gallery report: many canvases, none in victory." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais perder-te na grelha de habilidades e lançar a errada.", en: "First time? You'll get lost in the ability grid and cast the wrong one." },
      { pt: "Estreia no Hwei. São dezenas de combinações — vais decorar zero a tempo.", en: "Hwei debut. Dozens of combos — you'll memorize none of them in time." },
      { pt: "⚠️ Hwei novo. Aviso: são dezenas de combinações. Vais lançar a errada.", en: "⚠️ New Hwei. Warning: dozens of combos. You'll cast the wrong one." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os tentáculos do Nagakabouros te salvam.", en: "Loss after loss — not even Nagakabouros's tentacles save you." },
      { pt: "O teste de espírito devia era testar a tua vontade de continuar.", en: "The Test of Spirit should test your will to keep going." },
      { pt: "ERRO: tentáculos desalinhados. A bater no ar.", en: "ERROR: tentacles misaligned. Slapping air." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a bater com tentáculos e nem uma vitória testada.", en: "So many games slamming tentacles and not one win tested." },
      { pt: "0 vitórias — muita fé, nenhum milagre.", en: "0 wins — lots of faith, no miracle." },
      { pt: "Fé: muita. Milagres: nenhum.", en: "Faith: lots. Miracles: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais bater no ar porque não alinhaste os tentáculos.", en: "First time? You'll slap air because you never lined up the tentacles." },
      { pt: "Estreia na Illaoi. Sem tentáculos posicionados, és só uma senhora com um remo.", en: "Illaoi debut. Without tentacles placed, you're just a lady with an oar." },
      { pt: "Tutorial da Illaoi, passo 1: posicionar tentáculos. Sem eles, és uma senhora com um remo.", en: "Illaoi tutorial, step 1: position tentacles. Without them, you're a lady with an oar." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as lâminas flutuantes cortam esta maré.", en: "Loss after loss — not even the floating blades cut this streak." },
      { pt: "Ionia devia era pedir desculpa por te representar.", en: "Ionia should apologize for being represented by you." },
      { pt: "Última hora: Ionia pede desculpa por ser representada assim.", en: "Breaking news: Ionia apologizes for being represented this way." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a dançar com lâminas e nem uma vitória cortada.", en: "So many games dancing with blades and not one win cut." },
      { pt: "0 vitórias — muito dash, nenhum reset em vencedora.", en: "0 wins — lots of dashing, never a reset into a winner." },
      { pt: "Dashes dados: muitos. Resets em vencedora: zero.", en: "Dashes made: many. Resets into a winner: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar dash para o meio deles sem marcas para voltar.", en: "First time? You'll dash into them with no marks to escape on." },
      { pt: "Estreia na Irelia. Sem as marcas do Q, ficas preso no meio a apanhar.", en: "Irelia debut. Without Q marks, you're stuck in the middle taking hits." },
      { pt: "⚠️ Irelia nova. Aviso: sem marcas do Q, ficas presa no meio a apanhar.", en: "⚠️ New Irelia. Warning: no Q marks, you're stuck in the middle taking hits." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a Daisy te salva desta.", en: "Loss after loss — not even Daisy can save you here." },
      { pt: "Amigo de todos os monstros, menos da vitória.", en: "Friend to every monster, except victory." },
      { pt: "A Daisy sussurra: 'nem eu te safo desta'.", en: "Daisy whispers: 'even I can't save you here'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a plantar sementes e nem uma vitória a florescer.", en: "So many games planting seeds and not one win blooming." },
      { pt: "0 vitórias — muito carinho pela selva, nenhum resultado.", en: "0 wins — lots of love for the jungle, no results." },
      { pt: "Relatório da selva: muito carinho, nenhum resultado.", en: "Jungle report: lots of love, no result." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais tratar a selva com amor e esquecer-te de lutar.", en: "First time? You'll treat the jungle with love and forget to fight." },
      { pt: "Estreia no Ivern. Sem a Daisy bem usada, és só um jardineiro sem dano.", en: "Ivern debut. Without Daisy used well, you're just a gardener with no damage." },
      { pt: "Tutorial do Ivern, passo 1: usar a Daisy. Sem ela, és um jardineiro sem dano.", en: "Ivern tutorial, step 1: use Daisy. Without her, you're a gardener with no damage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a tempestade varre esta maré.", en: "Loss after loss — not even the storm sweeps away this streak." },
      { pt: "O vento só soprou para o lado errado.", en: "The wind only blew in the wrong direction." },
      { pt: "Horóscopo: o vento sopra. Sempre para o lado errado.", en: "Horoscope: the wind blows. Always in the wrong direction." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a soprar aliados e nem uma vitória levada pelo vento.", en: "So many games shielding allies and not one win carried on the wind." },
      { pt: "0 vitórias — muito escudo, nenhum troféu.", en: "0 wins — lots of shield, no trophy." },
      { pt: "Escudos dados: muitos. Troféus: nenhum.", en: "Shields given: many. Trophies: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mandar o inimigo para longe mesmo quando o queres perto.", en: "First time? You'll blow the enemy away exactly when you needed them close." },
      { pt: "Estreia na Janna. O ult empurra — usa-o para salvar, não para estragar.", en: "Janna debut. The ult pushes — use it to save, not to ruin." },
      { pt: "⚠️ Janna nova. Aviso: o ult empurra. Vais mandar o inimigo para longe quando o queres perto.", en: "⚠️ New Janna. Warning: the ult pushes. You'll blow the enemy away when you needed them close." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a bandeira + arremesso prende esta maré.", en: "Loss after loss — not even flag + drag pins this streak down." },
      { pt: "O príncipe de Demacia devia era abdicar do trono.", en: "The Prince of Demacia should abdicate the throne." },
      { pt: "ERRO: EQ ao contrário. Foste tu para o meio deles.", en: "ERROR: EQ backwards. You flung yourself into them." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a fazer o combo e nem uma vitória prendida.", en: "So many games landing the combo and not one win trapped." },
      { pt: "0 vitórias — muita bandeira, nenhum território ganho.", en: "0 wins — lots of flags, no ground gained." },
      { pt: "Relatório: muita bandeira, nenhum território ganho.", en: "Report: lots of flags, no ground gained." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer a arena com o ult e prender a tua própria equipa.", en: "First time? You'll cage your own team with the ult." },
      { pt: "Estreia no Jarvan. EQ ao contrário e mandas-te para o meio deles sem nada.", en: "Jarvan debut. EQ backwards and you fling yourself into them with nothing." },
      { pt: "⚠️ Jarvan novo. Aviso: vais fazer a arena à volta da tua própria equipa.", en: "⚠️ New Jarvan. Warning: you'll cage your own team with the ult." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o poste de iluminação te ilumina o caminho.", en: "Loss after loss — not even the lamppost lights your way." },
      { pt: "Grandmaster at Arms, mas sem grandes resultados.", en: "Grandmaster at Arms, but with no grand results." },
      { pt: "Última hora: Grandmaster at Arms sem grandes resultados.", en: "Breaking news: Grandmaster at Arms with no grand results." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar para cima de tudo e nem uma vitória.", en: "So many games leaping onto everything and not one win." },
      { pt: "0 vitórias — muita arma, nenhuma valeu.", en: "0 wins — lots of weapons, none worked." },
      { pt: "Armas empunhadas: muitas. Que valeram: nenhuma.", en: "Weapons wielded: many. That worked: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o timing do E e comer o combo todo.", en: "First time? You'll mistime the E and eat the whole combo." },
      { pt: "Estreia no Jax. Sem o stun do Counter Strike na hora certa, morres à frente deles.", en: "Jax debut. Without the Counter Strike stun on time, you die right in front of them." },
      { pt: "⚠️ Jax novo. Aviso: erra o timing do E e comes o combo todo.", en: "⚠️ New Jax. Warning: mistime the E and you eat the whole combo." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o martelo transformável constrói uma saída.", en: "Loss after loss — not even the transforming hammer builds a way out." },
      { pt: "O defensor do amanhã só defendeu a derrota de hoje.", en: "The Defender of Tomorrow only defended today's defeat." },
      { pt: "ERRO: forma trocada. Botões trocados. Combo desfeito.", en: "ERROR: form swapped. Buttons fumbled. Combo undone." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a trocar de forma e nem uma vitória martelada.", en: "So many games switching forms and not one win hammered out." },
      { pt: "0 vitórias — muito combo martelo-canhão, nenhum resultado.", en: "0 wins — lots of hammer-cannon combo, no results." },
      { pt: "Relatório: dois kits num, zero dominados.", en: "Report: two kits in one, zero mastered." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais confundir os botões das duas formas a meio do combo.", en: "First time? You'll fumble the two forms' buttons mid-combo." },
      { pt: "Estreia no Jayce. São dois kits num — vais dominar zero deles hoje.", en: "Jayce debut. It's two kits in one — you'll master zero of them today." },
      { pt: "Tutorial do Jayce, passo 1: aprender as duas formas. Vais dominar zero hoje.", en: "Jayce tutorial, step 1: learn both forms. You'll master zero today." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem quatro tiros certeiros fazem uma vitória.", en: "Loss after loss — not even four clean shots make a win." },
      { pt: "A arte da morte devia era ter mais arte e menos derrota.", en: "The art of death should have more art and fewer defeats." },
      { pt: "A arte da morte, hoje: mais arte de perder.", en: "The art of death, today: more the art of losing." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e a obra-prima ainda sem uma vitória assinada.", en: "So many games and the masterpiece still without a signed win." },
      { pt: "0 vitórias — muitos quartos tiros, nenhum na tela certa.", en: "0 wins — lots of fourth shots, none on the right canvas." },
      { pt: "Quartos tiros: muitos. Na tela certa: nenhum.", en: "Fourth shots: many. On the right canvas: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais ficar a recarregar no pior momento possível.", en: "First time? You'll be reloading at the worst possible moment." },
      { pt: "Estreia no Jhin. Quatro balas e depois estás indefeso — escolhe bem.", en: "Jhin debut. Four bullets and then you're defenseless — choose wisely." },
      { pt: "⚠️ Jhin novo. Aviso: quatro balas e depois estás indefeso. Escolhe bem.", en: "⚠️ New Jhin. Warning: four bullets, then you're defenseless. Choose wisely." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o canhão de foguetes acerta uma vitória.", en: "Loss after loss — not even the rocket launcher hits a win." },
      { pt: "Caos a mais e vitórias a menos, típico.", en: "Too much chaos and too few wins, typical." },
      { pt: "Última hora: caos a mais, vitórias a menos. Típico.", en: "Breaking news: too much chaos, too few wins. Typical." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a causar caos e nem uma vitória no meio da confusão.", en: "So many games causing chaos and not one win in the mess." },
      { pt: "0 vitórias — muita explosão, nenhum troféu.", en: "0 wins — lots of explosions, no trophy." },
      { pt: "🏆 Conquista: 'Muita Explosão, Nenhum Troféu'.", en: "🏆 Achievement: 'Lots of Explosions, No Trophy'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais trocar de arma na hora errada e ficar sem dano.", en: "First time? You'll swap weapons at the wrong time and lose your damage." },
      { pt: "Estreia na Jinx. Sem um abate para o passivo, és lenta e frágil.", en: "Jinx debut. Without a takedown for the passive, you're slow and fragile." },
      { pt: "⚠️ Jinx nova. Aviso: sem um abate para o passivo, és lenta e frágil.", en: "⚠️ New Jinx. Warning: without a takedown for the passive, you're slow and fragile." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as armas evoluídas do Vazio evoluem esta maré.", en: "Loss after loss — not even the Void's evolved weapons evolve this streak." },
      { pt: "Escapaste ao Vazio, mas não escapaste às derrotas.", en: "You escaped the Void, but you didn't escape the losses." },
      { pt: "ERRO: escapaste ao Vazio, não às derrotas.", en: "ERROR: escaped the Void, not the losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a evoluir armas e nem uma vitória isolada.", en: "So many games evolving weapons and not one isolated win." },
      { pt: "0 vitórias — muito plasma, nenhum alvo abatido a tempo.", en: "0 wins — lots of plasma, no target finished in time." },
      { pt: "Armas evoluídas: muitas. Vitórias isoladas: zero.", en: "Weapons evolved: many. Isolated wins: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar dash para o meio deles sem escudo para voltar.", en: "First time? You'll dash into them with no shield to get back." },
      { pt: "Estreia na Kaisa. Sem evoluções, és só uma marksman frágil sem alcance.", en: "Kaisa debut. Without evolutions, you're just a fragile marksman with no range." },
      { pt: "⚠️ Kaisa nova. Aviso: sem evoluções, és uma marksman frágil sem alcance.", en: "⚠️ New Kaisa. Warning: without evolutions, you're a fragile marksman with no range." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os teus juramentos de vingança viram isto.", en: "Loss after loss — not even your oaths of vengeance turn this around." },
      { pt: "A lança da vingança não vingou nem uma derrota.", en: "The spear of vengeance hasn't avenged a single loss." },
      { pt: "Horóscopo: a lança da vingança não vingou nem uma derrota.", en: "Horoscope: the spear of vengeance hasn't avenged a single loss." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a acumular lanças e nem uma vitória arrancada.", en: "So many games stacking spears and not one win ripped out." },
      { pt: "0 vitórias — muito rend, nenhum resultado.", en: "0 wins — lots of Rend, no results." },
      { pt: "Lanças acumuladas: muitas. Vitórias arrancadas: nenhuma.", en: "Spears stacked: many. Wins ripped out: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais tropeçar no salto a cada ataque e morrer parada.", en: "First time? You'll trip over the hop on every attack and die standing still." },
      { pt: "Estreia na Kalista. Sem um aliado para o ult, metade do kit é inútil.", en: "Kalista debut. Without an ally for the ult, half the kit is useless." },
      { pt: "Tutorial da Kalista, passo 1: saltar a cada ataque. Já tropeçaste.", en: "Kalista tutorial, step 1: hop on every attack. You already tripped." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o mantra ilumina esta maré.", en: "Loss after loss — not even Mantra enlightens this streak." },
      { pt: "A iluminação de Ionia não chegou a este histórico.", en: "Ionia's enlightenment never reached this record." },
      { pt: "A iluminação de Ionia não chegou a este placar.", en: "Ionia's enlightenment never reached this scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a empoderar tudo e nem uma vitória empoderada.", en: "So many games empowering everything and not one win empowered." },
      { pt: "0 vitórias — muito mantra, nenhum resultado esclarecido.", en: "0 wins — lots of Mantra, no enlightened result." },
      { pt: "Relatório: muito mantra, nenhum resultado esclarecido.", en: "Report: lots of Mantra, no enlightened result." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o mantra na habilidade errada todas as vezes.", en: "First time? You'll spend Mantra on the wrong ability every time." },
      { pt: "Estreia na Karma. Sem ult de raiz, é o mantra que decide tudo — e tu vais gastá-lo mal.", en: "Karma debut. She has no real ult — Mantra decides everything, and you'll waste it." },
      { pt: "⚠️ Karma nova. Aviso: o mantra decide tudo, e vais gastá-lo mal.", en: "⚠️ New Karma. Warning: Mantra decides everything, and you'll waste it." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Requiem global alcança a vitória.", en: "Loss after loss — not even the global Requiem reaches a win." },
      { pt: "Fazes dano até morto, mas vencer é que não.", en: "You deal damage even while dead, but winning is another matter." },
      { pt: "ERRO: Requiem global lançado cedo demais. Zero abates.", en: "ERROR: global Requiem cast too early. Zero kills." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a lançar o Requiem e nem uma vitória executada.", en: "So many games casting Requiem and not one win executed." },
      { pt: "0 vitórias — muita morte útil, nenhuma que rendesse.", en: "0 wins — lots of useful deaths, none that paid off." },
      { pt: "🏆 Conquista: 'Faz Dano Até Morto, Vencer é Que Não'.", en: "🏆 Achievement: 'Deals Damage While Dead, Winning Not So Much'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais lançar o R cedo demais e não matar ninguém.", en: "First time? You'll cast the R too early and kill no one." },
      { pt: "Estreia no Karthus. O truque é jogar morto — e tu ainda não sabes jogar vivo.", en: "Karthus debut. The trick is playing while dead — and you can't even play alive yet." },
      { pt: "Tutorial do Karthus, passo 1: jogar morto. Ainda não sabes jogar vivo.", en: "Karthus tutorial, step 1: play while dead. You can't even play alive yet." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Riftwalk te teleporta para fora desta.", en: "Loss after loss — not even Riftwalk teleports you out of this." },
      { pt: "O caminhante do Vazio anda é perdido no placar.", en: "The Void Walker is just lost on the scoreboard." },
      { pt: "Última hora: caminhante do Vazio anda perdido no placar.", en: "Breaking news: Void Walker lost on the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar com o R e nem uma vitória alcançada.", en: "So many games blinking with the R and not one win reached." },
      { pt: "0 vitórias — muito blink, nenhum destino em vencedor.", en: "0 wins — lots of blink, no destination as a winner." },
      { pt: "Blinks dados: muitos. Destinos em vencedor: nenhum.", en: "Blinks made: many. Destinations as a winner: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais sofrer o early inteiro e morrer antes do power spike.", en: "First time? You'll suffer the whole early game and die before the power spike." },
      { pt: "Estreia no Kassadin. Antes do nível 16, és só um alvo que salta.", en: "Kassadin debut. Before level 16, you're just a target that blinks." },
      { pt: "⚠️ Kassadin novo. Aviso: antes do nível 16, és só um alvo que salta.", en: "⚠️ New Kassadin. Warning: before level 16, you're just a target that blinks." },
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
    lossStreak: [
      { pt: "Sem resets à vista — só derrotas encadeadas.", en: "No resets in sight — just losses chained together." },
      { pt: "As adagas caem todas, tal como tu no placar.", en: "The daggers all drop, and so do you on the scoreboard." },
      { pt: "ERRO: reset não encontrado. Só derrotas encadeadas.", en: "ERROR: reset not found. Just chained losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e nem um único reset em vitória.", en: "So many games and not a single reset into a win." },
      { pt: "0 vitórias — ou apanhas o primeiro abate ou explodes, e tem sido o segundo.", en: "0 wins — either you snowball or you pop, and it's been the popping." },
      { pt: "Adagas atiradas: muitas. Resets em vitória: zero.", en: "Daggers thrown: many. Resets into a win: zero." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Ou fazes 20 abates ou 0/10, não há meio-termo.", en: "First time? It's either 20 kills or 0/10, no middle ground." },
      { pt: "Estreia na Katarina. O combo é lindo no papel.", en: "Katarina debut. The combo looks gorgeous on paper." },
      { pt: "⚠️ Katarina nova. Aviso: ou fazes 20 abates ou 0/10. Não há meio-termo.", en: "⚠️ New Katarina. Warning: it's either 20 kills or 0/10. No middle ground." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as asas de fogo elevam esta maré.", en: "Loss after loss — not even the fiery wings lift this streak." },
      { pt: "A juíza devia era julgar melhor as próprias escolhas.", en: "The judge should judge her own choices better." },
      { pt: "Horóscopo: prometeram-te um late game. Ele nunca chega.", en: "Horoscope: they promised you a late game. It never comes." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a escalar e nem uma vitória no fim do jogo.", en: "So many games scaling and not one win at the end." },
      { pt: "0 vitórias — muita promessa de late game, nenhum late game.", en: "0 wins — lots of late-game promise, never a late game." },
      { pt: "Relatório: muita escala prometida, nenhum resultado no fim.", en: "Report: lots of scaling promised, no result in the end." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais tentar lutar cedo e morrer sem asas nenhumas.", en: "First time? You'll try to fight early and die with no wings at all." },
      { pt: "Estreia na Kayle. Antes de escalar, és a personagem mais fraca do lobby.", en: "Kayle debut. Before she scales, you're the weakest thing in the lobby." },
      { pt: "⚠️ Kayle nova. Aviso: antes de escalar, és a personagem mais fraca do lobby.", en: "⚠️ New Kayle. Warning: before she scales, you're the weakest thing in the lobby." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a forma sombria nem o Rhaast te safam.", en: "Loss after loss — neither the shadow form nor Rhaast saves you." },
      { pt: "Atravessas paredes mas não atravessas esta maré.", en: "You phase through walls but not through this streak." },
      { pt: "Atravessas paredes, não atravessas esta maré.", en: "You phase through walls, not through this streak." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o orbe ainda sem decidir uma vitória.", en: "So many games and the orb still hasn't decided a win." },
      { pt: "0 vitórias — muita transformação, nenhuma em vencedor.", en: "0 wins — lots of transformation, none into a winner." },
      { pt: "Transformações: muitas. Em vencedor: nenhuma.", en: "Transformations: many. Into a winner: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais atravessar a parede para o sítio errado e morrer lá.", en: "First time? You'll phase through the wall to the wrong spot and die there." },
      { pt: "Estreia no Kayn. Antes da forma, és só um assassino a meio-gás.", en: "Kayn debut. Before the form, you're just a half-powered assassin." },
      { pt: "Tutorial do Kayn, passo 1: atravessar a parede. Foste para o sítio errado.", en: "Kayn tutorial, step 1: phase through the wall. You went to the wrong spot." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Slicing Maelstrom eletrocuta esta maré.", en: "Loss after loss — not even Slicing Maelstrom electrocutes this streak." },
      { pt: "O ninja yordle está a levar choques é do próprio desempenho.", en: "The yordle ninja is getting shocked by his own performance." },
      { pt: "ERRO: entrou sem energia para o combo. A eletrocutar-se a si próprio.", en: "ERROR: dove in with no energy for the combo. Electrocuting himself." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a marcar stuns e nem uma vitória eletrizada.", en: "So many games marking stuns and not one electrifying win." },
      { pt: "0 vitórias — muito raio, nenhum alvo que ficasse.", en: "0 wins — lots of lightning, no target that stuck." },
      { pt: "Raios lançados: muitos. Alvos que ficaram: nenhum.", en: "Bolts thrown: many. Targets that stuck: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais entrar com o ult sem energia para o resto do combo.", en: "First time? You'll ult in with no energy left for the rest of the combo." },
      { pt: "Estreia no Kennen. Gere a energia ou ficas a olhar para os inimigos sem stun.", en: "Kennen debut. Manage the energy or stare at enemies with no stun." },
      { pt: "⚠️ Kennen novo. Aviso: gere a energia ou ficas a olhar sem stun.", en: "⚠️ New Kennen. Warning: manage the energy or stare with no stun." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem isolado consegues abater uma vitória.", en: "Loss after loss — not even isolated can you take down a win." },
      { pt: "Evoluíste tudo menos a capacidade de ganhar.", en: "You evolved everything except the ability to win." },
      { pt: "🏆 Conquista: 'Evoluiu Tudo Menos a Capacidade de Ganhar'.", en: "🏆 Achievement: 'Evolved Everything But the Ability to Win'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar em alvos isolados e nem uma vitória.", en: "So many games leaping on isolated targets and not one win." },
      { pt: "0 vitórias — muitas evoluções, nenhuma útil.", en: "0 wins — lots of evolutions, none of them useful." },
      { pt: "Evoluções: muitas. Úteis: nenhuma.", en: "Evolutions: many. Useful ones: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais saltar para o meio de três e morrer sem o reset.", en: "First time? You'll leap into three of them and die without the reset." },
      { pt: "Estreia no Khazix. Fora de um alvo isolado, o teu dano é medíocre.", en: "Khazix debut. Away from an isolated target, your damage is mediocre." },
      { pt: "⚠️ Khazix novo. Aviso: fora de um alvo isolado, o teu dano é medíocre.", en: "⚠️ New Khazix. Warning: away from an isolated target, your damage is mediocre." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Lamb's Respite adia esta queda.", en: "Loss after loss — not even Lamb's Respite delays this fall." },
      { pt: "O Lobo e a Cordeira concordam: isto vai mal.", en: "Wolf and Lamb agree: this is going badly." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a acumular marcas e nem uma vitória caçada.", en: "So many games stacking marks and not one win hunted down." },
      { pt: "0 vitórias — muitas marcas, nenhum troféu.", en: "0 wins — lots of marks, no trophy." },
      { pt: "Marcas acumuladas: muitas. Troféus: nenhum.", en: "Marks stacked: many. Trophies: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar as marcas todas e ficar sem alcance nem dano.", en: "First time? You'll miss all the marks and end up with no range and no damage." },
      { pt: "Estreia na Kindred. Sem marcas, és uma marksman fraca com um lobo chateado.", en: "Kindred debut. Without marks, you're a weak marksman with an annoyed wolf." },
      { pt: "⚠️ Kindred nova. Aviso: sem marcas, és uma marksman fraca com um lobo chateado.", en: "⚠️ New Kindred. Warning: without marks, you're a weak marksman with an annoyed wolf." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Skaarl volta para te salvar desta.", en: "Loss after loss — not even Skaarl comes back to save you here." },
      { pt: "Perdeste a montada E a coragem E o jogo.", en: "You lost the mount AND the courage AND the game." },
      { pt: "Última hora: velho furioso desmontado no meio deles.", en: "Breaking news: furious old man dismounted in their midst." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a montar e desmontar e nem uma vitória.", en: "So many games mounting and dismounting and not one win." },
      { pt: "0 vitórias — muita coragem gritada, nenhum resultado.", en: "0 wins — lots of shouted courage, no results." },
      { pt: "Coragem gritada: muita. Resultados: nenhum.", en: "Courage shouted: lots. Results: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais ficar desmontado no meio deles a fazer zero dano.", en: "First time? You'll get dismounted among them dealing zero damage." },
      { pt: "Estreia no Kled. Sem o Skaarl, és um velho pequeno e furioso sem nada.", en: "Kled debut. Without Skaarl, you're a tiny furious old man with nothing." },
      { pt: "Tutorial do Kled, passo 1: não perder o Skaarl. Perdeste. Zero dano.", en: "Kled tutorial, step 1: don't lose Skaarl. You lost him. Zero damage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a Living Artillery alcança esta vitória.", en: "Loss after loss — not even Living Artillery reaches this win." },
      { pt: "Cospes ácido em tudo, menos nas derrotas.", en: "You spit acid on everything except the losses." },
      { pt: "ERRO: torreta com pernas de vidro apanhada fora de posição.", en: "ERROR: turret on glass legs caught out of position." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a cuspir à distância e nem uma vitória derretida.", en: "So many games spitting from range and not one win melted." },
      { pt: "0 vitórias — muito alcance, nenhum resultado.", en: "0 wins — lots of range, no results." },
      { pt: "Cuspidelas à distância: muitas. Vitórias derretidas: nenhuma.", en: "Ranged spits: many. Wins melted: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais ser apanhado fora de posição e explodir antes de fazer dano.", en: "First time? You'll get caught out of position and pop before dealing damage." },
      { pt: "Estreia no KogMaw. És uma torreta com pernas de vidro — posiciona-te ou morre.", en: "KogMaw debut. You're a turret on glass legs — position well or die." },
      { pt: "⚠️ KogMaw novo. Aviso: posiciona-te ou explodes antes de fazer dano.", en: "⚠️ New KogMaw. Warning: position well or pop before dealing damage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem partir os Ntofo em dois trava esta maré.", en: "Loss after loss — not even splitting the Ntofo blocks stops this streak." },
      { pt: "Toda a defesa do mundo e ainda a perder seguidas.", en: "All the defense in the world and still losing in a row." },
      { pt: "🏆 Conquista: 'Toda a Defesa do Mundo, A Perder Seguidas'.", en: "🏆 Achievement: 'All the Defense in the World, Still Losing'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar inimigos contra paredes e nem uma vitória.", en: "So many games slamming enemies into walls and not one win." },
      { pt: "0 vitórias — muito All Out, nenhum resultado.", en: "0 wins — lots of All Out, no results." },
      { pt: "Relatório: muitos All Out, nenhum resultado.", en: "Report: lots of All Out, no result." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais entrar em All Out e morrer sem a defesa que largaste.", en: "First time? You'll go All Out and die without the defense you dropped." },
      { pt: "Estreia no KSante. O kit é complicado — vais errar metade dos combos.", en: "KSante debut. The kit's complex — you'll fumble half the combos." },
      { pt: "⚠️ KSante novo. Aviso: o kit é complicado. Vais errar metade dos combos.", en: "⚠️ New KSante. Warning: the kit's complex. You'll fumble half the combos." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o clone engana esta maré.", en: "Loss after loss — not even the clone fools this streak." },
      { pt: "Muita ilusão, a derrota é que é bem real.", en: "Lots of illusion, but the defeat is very real." },
      { pt: "Muita ilusão. A derrota é que é bem real.", en: "Lots of illusion. The defeat is very real." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a enganar toda a gente e nem uma vitória verdadeira.", en: "So many games deceiving everyone and not one real win." },
      { pt: "0 vitórias — muito truque, nenhum resultado.", en: "0 wins — lots of tricks, no results." },
      { pt: "Clones criados: muitos. Vitórias verdadeiras: nenhuma.", en: "Clones made: many. Real wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer o combo pela ordem errada e mostrar-te sem dano.", en: "First time? You'll do the combo in the wrong order and reveal yourself with no damage." },
      { pt: "Estreia na Leblanc. Sem o encadeamento QW-R certinho, não matas nada.", en: "Leblanc debut. Without the exact QW-R chain, you kill nothing." },
      { pt: "Tutorial da Leblanc, passo 1: QW-R na ordem certa. Erraste. Zero dano.", en: "Leblanc tutorial, step 1: QW-R in the right order. You got it wrong. Zero damage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o segundo Q alcança a vitória.", en: "Loss after loss — not even the second Q reaches victory." },
      { pt: "O monge cego vê melhor do que tu vês esta maré.", en: "The blind monk sees this streak better than you do." },
      { pt: "O monge cego vê esta maré melhor do que tu.", en: "The blind monk sees this streak better than you do." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a fazer plays e nem uma vitória chutada para dentro.", en: "So many games making plays and not one win kicked in." },
      { pt: "0 vitórias — muito insec, nenhum resultado.", en: "0 wins — lots of insec, no results." },
      { pt: "Plays tentadas: muitas. Chutadas para dentro: nenhuma.", en: "Plays attempted: many. Kicked in: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o ward jump e cair no meio deles sozinho.", en: "First time? You'll miss the ward jump and land alone among them." },
      { pt: "Estreia no LeeSin. O campeão mais mecânico do jogo — boa sorte com isso.", en: "LeeSin debut. The most mechanical champion in the game — good luck with that." },
      { pt: "⚠️ LeeSin novo. Aviso: o campeão mais mecânico do jogo. Boa sorte.", en: "⚠️ New LeeSin. Warning: the most mechanical champion in the game. Good luck." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a luz do sol ilumina esta maré.", en: "Loss after loss — not even the sunlight lights up this streak." },
      { pt: "O escudo do amanhecer não bloqueou nem uma derrota.", en: "The Shield of Daybreak didn't block a single loss." },
      { pt: "ERRO: iniciou 1v5. Ninguém atrás. A reiniciar coragem...", en: "ERROR: engaged 1v5. No one behind. Rebooting courage..." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a iniciar e nem uma vitória prendida ao sol.", en: "So many games engaging and not one win pinned in the sun." },
      { pt: "0 vitórias — muito engage, nenhum resultado.", en: "0 wins — lots of engage, no results." },
      { pt: "Relatório: muito engage, nenhuma vitória prendida ao sol.", en: "Report: lots of engage, no win pinned in the sun." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais iniciar a 1v5 sem ninguém atrás de ti.", en: "First time? You'll engage 1v5 with no one behind you." },
      { pt: "Estreia na Leona. Iniciar é fácil, iniciar na hora certa é que não.", en: "Leona debut. Engaging is easy, engaging at the right time isn't." },
      { pt: "⚠️ Leona nova. Aviso: iniciar é fácil, iniciar na hora certa é que não.", en: "⚠️ New Leona. Warning: engaging is easy, engaging at the right time isn't." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o sono do ult adormece esta maré.", en: "Loss after loss — not even the ult's sleep puts this streak to rest." },
      { pt: "Muito sonho, e a derrota é o pesadelo que fica.", en: "Lots of dreaming, and the loss is the nightmare that stays." },
      { pt: "Horóscopo: muito sonho, e a derrota é o pesadelo que fica.", en: "Horoscope: lots of dreaming, and the loss is the nightmare that stays." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a passear e nem uma vitória adormecida.", en: "So many games drifting and not one win put to sleep." },
      { pt: "0 vitórias — muitas sementes, nenhuma floresceu.", en: "0 wins — lots of seeds, none bloomed." },
      { pt: "Sementes plantadas: muitas. Que floresceram: nenhuma.", en: "Seeds planted: many. That bloomed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais adormecer inimigos e não ter dano para os acordar mal.", en: "First time? You'll put enemies to sleep with no damage to punish them." },
      { pt: "Estreia na Lillia. Sem acumular passivo, é tudo picadas de mosquito.", en: "Lillia debut. Without passive stacks, it's all mosquito bites." },
      { pt: "⚠️ Lillia nova. Aviso: sem acumular passivo, é tudo picadas de mosquito.", en: "⚠️ New Lillia. Warning: without passive stacks, it's all mosquito bites." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem congelar-te a ti trava esta maré.", en: "Loss after loss — not even freezing yourself stops this streak." },
      { pt: "A bruxa do gelo está congelada é no fundo do placar.", en: "The Ice Witch is frozen at the bottom of the scoreboard." },
      { pt: "Última hora: bruxa do gelo congelada no fundo do placar.", en: "Breaking news: Ice Witch frozen at the bottom of the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a gelar tudo e nem uma vitória congelada.", en: "So many games freezing everything and not one win locked in." },
      { pt: "0 vitórias — muito gelo, nenhum resultado quente.", en: "0 wins — lots of ice, nothing warm to show." },
      { pt: "Gelo espalhado: muito. Resultado quente: nenhum.", en: "Ice spread: lots. Warm result: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais usar o ult em ti no momento errado e morrer na mesma.", en: "First time? You'll self-ult at the wrong moment and die anyway." },
      { pt: "Estreia na Lissandra. Acerta o combo ou és só uma miúda com gelo.", en: "Lissandra debut. Land the combo or you're just a kid with ice." },
      { pt: "Tutorial da Lissandra, passo 1: R em ti no momento certo. Erraste. Morreste na mesma.", en: "Lissandra tutorial, step 1: self-R at the right moment. You mistimed it. Died anyway." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os dois tiros de uma vez acertam na vitória.", en: "Loss after loss — not even the double shot lands on victory." },
      { pt: "Muito dash, e mesmo assim só correste para a derrota.", en: "Lots of dashing, and still you only ran into defeat." },
      { pt: "Muito dash. Só correste para a derrota.", en: "Lots of dashing. You only ran into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a disparar em dobro e nem uma vitória alvejada.", en: "So many games shooting double and not one win taken down." },
      { pt: "0 vitórias — muito Culling, nenhum resultado.", en: "0 wins — lots of Culling, no results." },
      { pt: "Tiros duplos: muitos. Vitórias alvejadas: nenhuma.", en: "Double shots: many. Wins taken down: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar dash para dentro e ficar sem escapatória.", en: "First time? You'll dash in and be left with no escape." },
      { pt: "Estreia no Lucian. O ritmo dash-atacar leva tempo — hoje vais só tropeçar.", en: "Lucian debut. The dash-attack rhythm takes practice — today you'll just fumble." },
      { pt: "⚠️ Lucian novo. Aviso: o ritmo dash-atacar leva tempo. Hoje só vais tropeçar.", en: "⚠️ New Lucian. Warning: the dash-attack rhythm takes practice. Today you'll just fumble." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem transformar o inimigo em esquilo trava isto.", en: "Loss after loss — not even polymorphing the enemy into a squirrel stops this." },
      { pt: "Muita magia fofinha, e a derrota nem por isso.", en: "Lots of whimsical magic, and the loss doesn't care." },
      { pt: "Horóscopo: muita magia fofinha, e a derrota nem por isso.", en: "Horoscope: lots of whimsical magic, and the loss doesn't care." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a aumentar aliados e nem uma vitória agigantada.", en: "So many games embiggening allies and not one win grown." },
      { pt: "0 vitórias — muito Pix, nenhum resultado.", en: "0 wins — lots of Pix, no results." },
      { pt: "Aliados aumentados: muitos. Vitórias agigantadas: nenhuma.", en: "Allies embiggened: many. Wins grown: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult ao aliado errado no momento errado.", en: "First time? You'll ult the wrong ally at the wrong time." },
      { pt: "Estreia na Lulu. Sem saber quem proteger, és só brilhinhos inúteis.", en: "Lulu debut. Not knowing who to protect, you're just useless sparkles." },
      { pt: "⚠️ Lulu nova. Aviso: sem saber quem proteger, és só brilhinhos inúteis.", en: "⚠️ New Lulu. Warning: not knowing who to protect, you're just useless sparkles." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Final Spark ilumina esta maré.", en: "Loss after loss — not even the Final Spark lights up this streak." },
      { pt: "Muita luz, e a derrota continua às escuras contigo.", en: "Lots of light, and the loss stays in the dark with you." },
      { pt: "Muita luz. A derrota continua às escuras contigo.", en: "Lots of light. The loss stays in the dark with you." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar bindings e nem uma vitória amarrada.", en: "So many games throwing bindings and not one win tied down." },
      { pt: "0 vitórias — muito laser, nenhum alvo aceso que contasse.", en: "0 wins — lots of laser, no lit target that counted." },
      { pt: "Bindings atirados: muitos. Vitórias amarradas: nenhuma.", en: "Bindings thrown: many. Wins tied down: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o Q e ficar sem combo nem escapatória.", en: "First time? You'll miss the Q and be left with no combo and no escape." },
      { pt: "Estreia na Lux. Se erras a binding, és uma mage sem defesa nenhuma.", en: "Lux debut. Miss the binding and you're a mage with no defense at all." },
      { pt: "⚠️ Lux nova. Aviso: se erras a binding, ficas sem combo nem escapatória.", en: "⚠️ New Lux. Warning: miss the binding and you have no combo and no escape." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a Unstoppable Force empurra esta maré.", en: "Loss after loss — not even Unstoppable Force pushes this streak away." },
      { pt: "Uma pedra a rolar e mesmo assim só rolaste para a derrota.", en: "A rolling rock, and still you only rolled into defeat." },
      { pt: "ERRO: pedra a rolar. Rolou direto para a derrota.", en: "ERROR: rolling rock. Rolled straight into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a carregar contra tudo e nem uma vitória esmagada.", en: "So many games charging into everything and not one win crushed." },
      { pt: "0 vitórias — muita armadura, nenhum troféu.", en: "0 wins — lots of armor, no trophy." },
      { pt: "Armadura acumulada: muita. Troféus: nenhum.", en: "Armor stacked: lots. Trophies: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult a um alvo só e desperdiçar tudo.", en: "First time? You'll ult a single target and waste the whole thing." },
      { pt: "Estreia no Malphite. Um R bem dado ganha teamfights — um mal dado é comédia.", en: "Malphite debut. A good R wins teamfights — a bad one is comedy." },
      { pt: "Tutorial do Malphite, passo 1: R em vários. Deste-o a um só. Desperdiçado.", en: "Malphite tutorial, step 1: R multiple people. You ulted a single one. Wasted." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os voidlings devoram esta maré.", en: "Loss after loss — not even the voidlings devour this streak." },
      { pt: "Prendeste toda a gente menos a vitória.", en: "You suppressed everyone except the win." },
      { pt: "Prendeste toda a gente. Menos a vitória.", en: "You suppressed everyone. Except the win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a suprimir alvos e nem uma vitória capturada.", en: "So many games suppressing targets and not one win captured." },
      { pt: "0 vitórias — muito Vazio, nenhum resultado.", en: "0 wins — lots of Void, no results." },
      { pt: "Alvos suprimidos: muitos. Vitórias capturadas: nenhuma.", en: "Targets suppressed: many. Wins captured: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult e ser interrompido a meio na mesma.", en: "First time? You'll ult and get interrupted halfway anyway." },
      { pt: "Estreia no Malzahar. Sem alcançar o alvo certo, o R é só um abraço apertado.", en: "Malzahar debut. Without reaching the right target, the R is just a tight hug." },
      { pt: "⚠️ Malzahar novo. Aviso: dás o ult e és interrompido a meio na mesma.", en: "⚠️ New Malzahar. Warning: you ult and get interrupted halfway anyway." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as sementes travam esta maré.", en: "Loss after loss — not even the saplings stop this streak." },
      { pt: "O treant devia era plantar melhores resultados.", en: "The treant should plant better results." },
      { pt: "Última hora: treant planta sementes, colhe derrotas.", en: "Breaking news: treant plants seeds, harvests losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar sementes e nem uma vitória enraizada.", en: "So many games tossing saplings and not one win rooted." },
      { pt: "0 vitórias — muita raiz, nenhum troféu.", en: "0 wins — lots of roots, no trophy." },
      { pt: "Sementes atiradas: muitas. Vitórias enraizadas: nenhuma.", en: "Saplings tossed: many. Wins rooted: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o W e ficar sem o único engage do kit.", en: "First time? You'll miss the W and lose the only engage in the kit." },
      { pt: "Estreia no Maokai. Sem acertar as raízes, és só uma árvore a passear.", en: "Maokai debut. Without landing the roots, you're just a walking tree." },
      { pt: "⚠️ Maokai novo. Aviso: sem acertar as raízes, és só uma árvore a passear.", en: "⚠️ New Maokai. Warning: without landing the roots, you're just a walking tree." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Alpha Strike escapa desta maré.", en: "Loss after loss — not even Alpha Strike escapes this streak." },
      { pt: "Meditaste sobre tudo menos sobre como parar de perder.", en: "You meditated on everything except how to stop losing." },
      { pt: "Meditaste sobre tudo. Menos sobre como parar de perder.", en: "You meditated on everything. Except how to stop losing." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a resetar o Highlander e nem uma vitória no fio.", en: "So many games resetting Highlander and not one win on the blade." },
      { pt: "0 vitórias — muita espada, nenhum wuju que valesse.", en: "0 wins — lots of sword, no wuju that mattered." },
      { pt: "Highlander resetado: muitas vezes. Vitórias no fio: nenhuma.", en: "Highlander reset: many times. Wins on the blade: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais entrar a bater e comer todo o CC que existe.", en: "First time? You'll dive in swinging and eat every bit of CC there is." },
      { pt: "Estreia no MasterYi. Contra qualquer stun, és só um alvo a piscar.", en: "MasterYi debut. Against any stun, you're just a blinking target." },
      { pt: "⚠️ MasterYi novo. Aviso: contra qualquer stun, és só um alvo a piscar.", en: "⚠️ New MasterYi. Warning: against any stun, you're just a blinking target." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o calorzinho fofinho aquece esta maré.", en: "Loss after loss — not even the cozy warmth heats up this streak." },
      { pt: "Muito aconchego, e a derrota continua fria.", en: "Lots of coziness, and the loss stays cold." },
      { pt: "Horóscopo: muito aconchego, e a derrota continua fria.", en: "Horoscope: lots of coziness, and the loss stays cold." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a dar alcance e cura e nem uma vitória aconchegada.", en: "So many games handing out range and heals and not one cozy win." },
      { pt: "0 vitórias — muito escudo quentinho, nenhum troféu.", en: "0 wins — lots of warm shields, no trophy." },
      { pt: "Escudos quentinhos: muitos. Troféus: nenhum.", en: "Warm shields: many. Trophies: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais guardar o cleanse do ult e usá-lo tarde demais.", en: "First time? You'll hold the ult cleanse and use it too late." },
      { pt: "Estreia no Milio. És puro suporte — sem os aliados a jogar, não fazes nada.", en: "Milio debut. You're pure support — without allies playing, you do nothing." },
      { pt: "⚠️ Milio novo. Aviso: és puro suporte. Sem aliados a jogar, não fazes nada.", en: "⚠️ New Milio. Warning: you're pure support. Without allies playing, you do nothing." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Bullet Time varre esta maré.", en: "Loss after loss — not even Bullet Time sweeps this streak." },
      { pt: "Muita chuva de balas e nem uma acertou na vitória.", en: "Lots of bullet rain and not one hit victory." },
      { pt: "ERRO: Bullet Time canalizado. Interrompido. Zero dano.", en: "ERROR: Bullet Time channeled. Interrupted. Zero damage." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a canalizar o ult e nem uma vitória no cone.", en: "So many games channeling the ult and not one win in the cone." },
      { pt: "0 vitórias — muito Double Up, nenhum resultado.", en: "0 wins — lots of Double Up, no results." },
      { pt: "Chuva de balas: muita. No cone certo: nenhuma.", en: "Bullet rain: lots. In the right cone: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais canalizar o ult à vista de todos e ser interrompida.", en: "First time? You'll channel the ult in the open and get interrupted." },
      { pt: "Estreia na MissFortune. O ult só rende se ninguém te tocar — boa sorte.", en: "MissFortune debut. The ult only works if no one touches you — good luck." },
      { pt: "⚠️ MissFortune nova. Aviso: o ult só rende se ninguém te tocar. Boa sorte.", en: "⚠️ New MissFortune. Warning: the ult only works if no one touches you. Good luck." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o clone engana esta maré.", en: "Loss after loss — not even the clone fools this streak." },
      { pt: "Muito rodopio, e mesmo assim só giraste para a derrota.", en: "Lots of spinning, and still you only span into defeat." },
      { pt: "Muito rodopio. Só giraste para a derrota.", en: "Lots of spinning. You only span into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a enganar com o clone e nem uma vitória.", en: "So many games faking with the clone and not one win." },
      { pt: "0 vitórias — muito bastão, nenhum resultado.", en: "0 wins — lots of staff, no results." },
      { pt: "Clones enganadores: muitos. Vitórias: nenhuma.", en: "Decoy clones: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais deixar o clone a andar para o sítio errado.", en: "First time? You'll send the clone walking the wrong way." },
      { pt: "Estreia no Wukong. Sem enganar com o clone, o combo é lido de longe.", en: "Wukong debut. Without faking with the clone, the combo is read a mile off." },
      { pt: "Tutorial do Wukong, passo 1: enganar com o clone. Mandaste-o para o sítio errado.", en: "Wukong tutorial, step 1: fake with the clone. You sent it the wrong way." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Reino da Morte te dá uma vitória 1v1.", en: "Loss after loss — not even the Death Realm gives you a 1v1 win." },
      { pt: "Arrastas gente para a tua dimensão e perdes lá também.", en: "You drag people into your realm and lose there too." },
      { pt: "ERRO: arrastou o alvo errado para o Reino da Morte. Perdeu o 1v1.", en: "ERROR: dragged the wrong target into the Death Realm. Lost the 1v1." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a arrastar alvos para o Reino da Morte e nem uma vitória.", en: "So many games dragging targets into the Death Realm and not one win." },
      { pt: "0 vitórias — muita maça, nenhum resultado.", en: "0 wins — lots of mace, no results." },
      { pt: "🏆 Conquista: 'Perde Até na Própria Dimensão'.", en: "🏆 Achievement: 'Loses Even in His Own Realm'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o R ao alvo errado e perder o 1v1 que escolheste.", en: "First time? You'll R the wrong target and lose the 1v1 you picked." },
      { pt: "Estreia no Mordekaiser. Escolhe bem quem levas — se perdes, ficas mais fraco.", en: "Mordekaiser debut. Choose who you take carefully — lose it and you get weaker." },
      { pt: "⚠️ Mordekaiser novo. Aviso: escolhe bem quem levas. Se perdes, ficas mais fraco.", en: "⚠️ New Mordekaiser. Warning: choose who you take. Lose it and you get weaker." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o escudo negro bloqueia esta maré.", en: "Loss after loss — not even the Black Shield blocks this streak." },
      { pt: "Prendeste toda a gente com o Q menos a vitória.", en: "You bound everyone with the Q except victory." },
      { pt: "Prendeste toda a gente com o Q. Menos a vitória.", en: "You bound everyone with the Q. Except victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a acorrentar alvos e nem uma vitória presa.", en: "So many games shackling targets and not one win chained." },
      { pt: "0 vitórias — muita poça de sombras, nenhum resultado.", en: "0 wins — lots of shadow pool, no results." },
      { pt: "Alvos acorrentados: muitos. Vitórias presas: nenhuma.", en: "Targets shackled: many. Wins chained: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar a binding e ficar sem o único CC do kit.", en: "First time? You'll miss the binding and lose the only CC in the kit." },
      { pt: "Estreia na Morgana. Se erras o Q, és só uma mage lenta com um escudo.", en: "Morgana debut. Miss the Q and you're just a slow mage with a shield." },
      { pt: "⚠️ Morgana nova. Aviso: erra o Q e ficas sem o único CC do kit.", en: "⚠️ New Morgana. Warning: miss the Q and you lose the only CC in the kit." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a matilha caça esta maré.", en: "Loss after loss — not even the pack hunts down this streak." },
      { pt: "Muitos cães, e mesmo assim nenhuma vitória mordida.", en: "Lots of dogs, and still not one win bitten." },
      { pt: "Cães na matilha: muitos. Vitórias mordidas: nenhuma.", en: "Dogs in the pack: many. Wins bitten: none." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas com a matilha inteira e nem uma vitória.", en: "So many games with the whole pack and not one win." },
      { pt: "0 vitórias — muitos dashes, nenhum alvo apanhado.", en: "0 wins — lots of dashes, no target caught." },
      { pt: "Última hora: matilha inteira, zero caçadas bem-sucedidas.", en: "Breaking news: whole pack, zero successful hunts." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais perder os cães antes da luta e entrar sozinho.", en: "First time? You'll lose the dogs before the fight and dive in alone." },
      { pt: "Estreia na Naafiri. Sem os packmates vivos, o teu dano desaparece.", en: "Naafiri debut. Without the packmates alive, your damage vanishes." },
      { pt: "⚠️ Naafiri nova. Aviso: sem os packmates vivos, o teu dano desaparece.", en: "⚠️ New Naafiri. Warning: without the packmates alive, your damage vanishes." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a bolha prende esta maré.", en: "Loss after loss — not even the bubble traps this streak." },
      { pt: "Muita onda, e mesmo assim afundaste.", en: "Lots of waves, and still you sank." },
      { pt: "ERRO: bolha falhada. Único CC desperdiçado.", en: "ERROR: bubble missed. Only CC wasted." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a curar e a atirar bolhas e nem uma vitória.", en: "So many games healing and bubbling and not one win." },
      { pt: "0 vitórias — muito Tidal Wave, nenhum resultado.", en: "0 wins — lots of Tidal Wave, no results." },
      { pt: "Ondas invocadas: muitas. Vitórias: nenhuma.", en: "Waves summoned: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar a bolha e ficar sem o único CC que tens.", en: "First time? You'll miss the bubble and be left with no CC at all." },
      { pt: "Estreia na Nami. Sem acertar a Aqua Prison, és só um peixe fora de água.", en: "Nami debut. Without landing Aqua Prison, you're just a fish out of water." },
      { pt: "⚠️ Nami nova. Aviso: sem acertar a Aqua Prison, és um peixe fora de água.", en: "⚠️ New Nami. Warning: without landing Aqua Prison, you're a fish out of water." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os stacks de Q travam esta maré.", en: "Loss after loss — not even the Q stacks stop this streak." },
      { pt: "O cão antigo empilhou tudo menos vitórias.", en: "The old dog stacked everything except wins." },
      { pt: "O cão antigo empilhou tudo. Menos vitórias.", en: "The old dog stacked everything. Except wins." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a empilhar o Q e nem uma vitória para mostrar.", en: "So many games stacking the Q and not one win to show." },
      { pt: "0 vitórias — muitos stacks, nenhum troféu.", en: "0 wins — lots of stacks, no trophy." },
      { pt: "Stacks de Q: muitos. Troféus: nenhum.", en: "Q stacks: many. Trophies: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o jogo a empilhar e morrer antes de valer.", en: "First time? You'll spend the game stacking and die before it matters." },
      { pt: "Estreia no Nasus. Sem stacks, o teu Q faz cócegas.", en: "Nasus debut. Without stacks, your Q tickles." },
      { pt: "⚠️ Nasus novo. Aviso: sem stacks, o teu Q faz cócegas.", en: "⚠️ New Nasus. Warning: without stacks, your Q tickles." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a âncora puxa esta maré de volta.", en: "Loss after loss — not even the anchor drags this streak back." },
      { pt: "Afundaste com o próprio peso da armadura.", en: "You sank under the weight of your own armor." },
      { pt: "ERRO: âncora falhada. Preso ao chão sem chegar a eles.", en: "ERROR: anchor missed. Stuck to the ground, never reached them." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar a âncora e nem uma vitória fisgada.", en: "So many games throwing the anchor and not one win hooked." },
      { pt: "0 vitórias — muito hook, nenhum resultado.", en: "0 wins — lots of hook, no results." },
      { pt: "Âncoras atiradas: muitas. Vitórias fisgadas: nenhuma.", en: "Anchors thrown: many. Wins hooked: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar a âncora e ficar preso ao chão sem chegar a eles.", en: "First time? You'll miss the anchor and get yanked into nothing." },
      { pt: "Estreia no Nautilus. Se erras o Q, és só um mergulhador lento.", en: "Nautilus debut. Miss the Q and you're just a slow diver." },
      { pt: "⚠️ Nautilus novo. Aviso: erra o Q e és só um mergulhador lento.", en: "⚠️ New Nautilus. Warning: miss the Q and you're just a slow diver." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem disfarçada de aliado escapas desta.", en: "Loss after loss — not even disguised as an ally do you escape this." },
      { pt: "Muito disfarce, e a derrota reconheceu-te à primeira.", en: "Lots of disguise, and the loss recognized you instantly." },
      { pt: "Muito disfarce. A derrota reconheceu-te à primeira.", en: "Lots of disguise. The loss recognized you instantly." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a fingir ser outro e nem uma vitória própria.", en: "So many games pretending to be someone else and not one win of your own." },
      { pt: "0 vitórias — muitos clones, nenhum resultado.", en: "0 wins — lots of clones, no results." },
      { pt: "Disfarces feitos: muitos. Vitórias próprias: nenhuma.", en: "Disguises made: many. Wins of your own: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult à vista e ser interrompida antes do stun.", en: "First time? You'll ult in the open and get interrupted before the stun." },
      { pt: "Estreia na Neeko. Sem esconder o passivo, o disfarce engana ninguém.", en: "Neeko debut. Without hiding the passive, the disguise fools no one." },
      { pt: "⚠️ Neeko nova. Aviso: sem esconder o passivo, o disfarce engana ninguém.", en: "⚠️ New Neeko. Warning: without hiding the passive, the disguise fools no one." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a lança certeira acerta na vitória.", en: "Loss after loss — not even the perfect spear lands on victory." },
      { pt: "Muita caçada, e a presa foste tu.", en: "Lots of hunting, and the prey was you." },
      { pt: "Horóscopo: muita caçada, e a presa foste tu.", en: "Horoscope: lots of hunting, and the prey was you." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar lanças e nem uma acertou numa vitória.", en: "So many games throwing spears and none hit a win." },
      { pt: "0 vitórias — muita forma de puma, nenhum resultado.", en: "0 wins — lots of cougar form, no results." },
      { pt: "Lanças atiradas: muitas. Que acertaram: nenhuma.", en: "Spears thrown: many. That landed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar todas as lanças e ficar sem dano nenhum.", en: "First time? You'll miss every spear and end up with no damage at all." },
      { pt: "Estreia na Nidalee. Se não acertas a javelin, és só um gato sem garras.", en: "Nidalee debut. Miss the javelin and you're just a clawless cat." },
      { pt: "⚠️ Nidalee nova. Aviso: sem acertar a javelin, és um gato sem garras.", en: "⚠️ New Nidalee. Warning: miss the javelin and you're a clawless cat." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem toda a tua alegria trava esta maré.", en: "Loss after loss — not even all your joy stops this streak." },
      { pt: "Muita água, e mesmo assim escorregaste para a derrota.", en: "Lots of water, and still you slipped into defeat." },
      { pt: "Horóscopo: muita água, e mesmo assim escorregaste para a derrota.", en: "Horoscope: lots of water, and still you slipped into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a puxar inimigos com o ult e nem uma vitória.", en: "So many games pulling enemies with the ult and not one win." },
      { pt: "0 vitórias — muito chicote, nenhum resultado.", en: "0 wins — lots of whip, no results." },
      { pt: "Inimigos puxados com o ult: muitos. Vitórias: nenhuma.", en: "Enemies pulled with the ult: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais colar-te a um aliado que não sabe o que fazer.", en: "First time? You'll latch onto an ally who has no idea what to do." },
      { pt: "Estreia na Nilah. É uma ADC de corpo a corpo — vais morrer perto demais.", en: "Nilah debut. She's a melee ADC — you'll die getting too close." },
      { pt: "⚠️ Nilah nova. Aviso: é uma ADC de corpo a corpo. Vais morrer perto demais.", en: "⚠️ New Nilah. Warning: she's a melee ADC. You'll die getting too close." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a escuridão do ult esconde esta maré.", en: "Loss after loss — not even the ult's darkness hides this streak." },
      { pt: "O pesadelo assombrou tudo menos a vitória.", en: "The nightmare haunted everything except victory." },
      { pt: "Última hora: pesadelo assombra tudo menos a vitória.", en: "Breaking news: nightmare haunts everything but the win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a mergulhar no escuro e nem uma vitória caçada.", en: "So many games diving in the dark and not one win hunted." },
      { pt: "0 vitórias — muito medo, nenhum resultado.", en: "0 wins — lots of fear, no results." },
      { pt: "Mergulhos no escuro: muitos. Vitórias caçadas: nenhuma.", en: "Dives in the dark: many. Wins hunted: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult e falhar o dash para o alvo.", en: "First time? You'll ult and whiff the dash to the target." },
      { pt: "Estreia no Nocturne. Sem o spell shield na hora certa, comes o combo todo.", en: "Nocturne debut. Without the spell shield on time, you eat the whole combo." },
      { pt: "⚠️ Nocturne novo. Aviso: sem o spell shield na hora certa, comes o combo todo.", en: "⚠️ New Nocturne. Warning: without the spell shield on time, you eat the whole combo." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a maior bola de neve rola para a vitória.", en: "Loss after loss — not even the biggest snowball rolls to victory." },
      { pt: "Muito frio, e a derrota gelou-te de vez.", en: "Lots of cold, and the loss froze you solid." },
      { pt: "ERRO: bola de neve gigante interrompida. Zero dano.", en: "ERROR: giant snowball interrupted. Zero damage." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a rolar bolas de neve e nem uma vitória.", en: "So many games rolling snowballs and not one win." },
      { pt: "0 vitórias — muito Willump, nenhum resultado.", en: "0 wins — lots of Willump, no results." },
      { pt: "Bolas de neve roladas: muitas. Vitórias: nenhuma.", en: "Snowballs rolled: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais canalizar o ult à vista e ser interrompido logo.", en: "First time? You'll channel the ult in the open and get interrupted instantly." },
      { pt: "Estreia no Nunu. O R gigante rende zero se te tocarem a meio.", en: "Nunu debut. The giant R does nothing if they touch you mid-channel." },
      { pt: "⚠️ Nunu novo. Aviso: o R gigante rende zero se te tocarem a meio.", en: "⚠️ New Nunu. Warning: the giant R does nothing if they touch you mid-channel." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os machados travam esta maré.", en: "Loss after loss — not even the axes stop this streak." },
      { pt: "Ficaste imune a CC mas não à derrota.", en: "You became immune to CC but not to defeat." },
      { pt: "Ficaste imune a CC. Não à derrota.", en: "You became immune to CC. Not to defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar machados e nem uma vitória apanhada.", en: "So many games throwing axes and not one win picked up." },
      { pt: "0 vitórias — muito Reckless Swing, pouco cuidado.", en: "0 wins — lots of Reckless Swing, little care." },
      { pt: "Machados atirados: muitos. Vitórias apanhadas: nenhuma.", en: "Axes thrown: many. Wins picked up: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar os machados e não os apanhar do chão.", en: "First time? You'll miss the axes and not pick them up off the ground." },
      { pt: "Estreia no Olaf. Sem apanhar os machados, ficas lento e sem dano.", en: "Olaf debut. Without picking the axes back up, you're slow and toothless." },
      { pt: "Tutorial do Olaf, passo 1: apanhar os machados do chão. Não apanhaste. Ficaste lento.", en: "Olaf tutorial, step 1: pick the axes off the ground. You didn't. Now you're slow." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Shockwave puxa esta maré.", en: "Loss after loss — not even Shockwave pulls this streak in." },
      { pt: "A bola andou por todo o lado menos rumo à vitória.", en: "The ball went everywhere except toward victory." },
      { pt: "ERRO: bola no sítio errado. Ult no vazio.", en: "ERROR: ball in the wrong spot. Ult into the void." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a comandar a bola e nem uma vitória em cima dela.", en: "So many games commanding the ball and not one win on it." },
      { pt: "0 vitórias — muito ult perfeito, nenhum resultado.", en: "0 wins — lots of perfect ults, no results." },
      { pt: "Ults perfeitos: muitos. Vitórias em cima da bola: nenhuma.", en: "Perfect ults: many. Wins on the ball: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais esquecer-te onde está a bola e dar o ult no vazio.", en: "First time? You'll forget where the ball is and ult into nothing." },
      { pt: "Estreia na Orianna. Se não segues a bola, o ult acerta no ar.", en: "Orianna debut. Lose track of the ball and the ult hits thin air." },
      { pt: "⚠️ Orianna nova. Aviso: perde a bola de vista e o ult acerta no ar.", en: "⚠️ New Orianna. Warning: lose track of the ball and the ult hits thin air." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a forja arranja esta maré.", en: "Loss after loss — not even the forge fixes this streak." },
      { pt: "Melhoraste os itens de todos menos os teus resultados.", en: "You upgraded everyone's items except your results." },
      { pt: "Melhoraste os itens de todos. Menos os teus resultados.", en: "You upgraded everyone's items. Except your results." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a forjar e a carregar contra tudo e nem uma vitória.", en: "So many games forging and ramming into everything and not one win." },
      { pt: "0 vitórias — muito Brittle, nenhum resultado.", en: "0 wins — lots of Brittle, no results." },
      { pt: "Relatório da forja: muitos itens melhorados, nenhuma vitória forjada.", en: "Forge report: many items upgraded, no win forged." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult e falhar o segundo toque que faz o knockup.", en: "First time? You'll ult and miss the second hit that knocks up." },
      { pt: "Estreia no Ornn. Sem o combo do R completo, é só um carneiro a passar.", en: "Ornn debut. Without the full R combo, it's just a ram walking by." },
      { pt: "⚠️ Ornn novo. Aviso: sem o combo do R completo, é só um carneiro a passar.", en: "⚠️ New Ornn. Warning: without the full R combo, it's just a ram walking by." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o escudo espartano bloqueia esta maré.", en: "Loss after loss — not even the Spartan shield blocks this streak." },
      { pt: "Muita lança, e mesmo assim caíste do céu direto à derrota.", en: "Lots of spear, and still you fell from the sky straight into defeat." },
      { pt: "ERRO: caiu do céu no lado errado. Chegou depois da luta.", en: "ERROR: fell from the sky on the wrong side. Arrived after the fight." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar do céu e nem uma vitória aterrada.", en: "So many games leaping from the sky and not one win landed." },
      { pt: "0 vitórias — muito stun, nenhum resultado.", en: "0 wins — lots of stun, no results." },
      { pt: "Saltos do céu: muitos. Vitórias aterradas: nenhuma.", en: "Sky leaps: many. Wins landed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult para o outro lado e chegar depois da luta.", en: "First time? You'll ult to the wrong side and arrive after the fight." },
      { pt: "Estreia no Pantheon. Forte cedo — se não fazes nada já, quando fazes?", en: "Pantheon debut. Strong early — if you can't do anything now, when?" },
      { pt: "⚠️ Pantheon novo. Aviso: forte cedo. Se não fazes nada já, quando fazes?", en: "⚠️ New Pantheon. Warning: strong early. If you can't do anything now, when?" },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem parar os dashes com o W trava esta maré.", en: "Loss after loss — not even stopping dashes with the W stops this streak." },
      { pt: "Muito martelo, e mesmo assim só martelaste derrotas.", en: "Lots of hammer, and still you only hammered out losses." },
      { pt: "Muito martelo. Só martelaste derrotas.", en: "Lots of hammer. You only hammered out losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar gente contra paredes e nem uma vitória.", en: "So many games slamming people into walls and not one win." },
      { pt: "0 vitórias — muito Keeper's Verdict, nenhum resultado.", en: "0 wins — lots of Keeper's Verdict, no results." },
      { pt: "Inimigos atirados contra paredes: muitos. Vitórias: nenhuma.", en: "Enemies slammed into walls: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais carregar o ult e mandar o inimigo para longe sem parede.", en: "First time? You'll charge the ult and fling the enemy away with no wall." },
      { pt: "Estreia na Poppy. Sem uma parede atrás do alvo, o teu E não faz nada.", en: "Poppy debut. Without a wall behind the target, your E does nothing." },
      { pt: "⚠️ Poppy nova. Aviso: sem uma parede atrás do alvo, o teu E não faz nada.", en: "⚠️ New Poppy. Warning: without a wall behind the target, your E does nothing." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o gancho arrasta esta maré para o fundo.", en: "Loss after loss — not even the hook drags this streak under." },
      { pt: "Muito nevoeiro, e mesmo assim ninguém te teve medo.", en: "Lots of fog, and still no one feared you." },
      { pt: "Última hora: muito nevoeiro, e ninguém teve medo.", en: "Breaking news: lots of fog, and no one was scared." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a executar com o R e nem uma vitória colhida.", en: "So many games executing with the R and not one win reaped." },
      { pt: "0 vitórias — muito gancho, nenhum resultado.", en: "0 wins — lots of hook, no results." },
      { pt: "Ganchos lançados: muitos. Vitórias colhidas: nenhuma.", en: "Hooks thrown: many. Wins reaped: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o gancho e ficar sem vida bónus para aguentar.", en: "First time? You'll miss the hook and have no bonus health to survive." },
      { pt: "Estreia no Pyke. Não ganha vida — se erras, morres num piscar de olhos.", en: "Pyke debut. He gains no health — miss and you die in a blink." },
      { pt: "⚠️ Pyke novo. Aviso: não ganha vida. Erra e morres num piscar de olhos.", en: "⚠️ New Pyke. Warning: he gains no health. Miss and you die in a blink." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o elemento certo trava esta maré.", en: "Loss after loss — not even the right element stops this streak." },
      { pt: "A imperatriz devia era conquistar uma vitória primeiro.", en: "The empress should conquer a win first." },
      { pt: "ERRO: elemento errado. Ult sem terreno. Metade do dano.", en: "ERROR: wrong element. Ult with no terrain. Half the damage." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a apanhar elementos e nem uma vitória detonada.", en: "So many games grabbing elements and not one win detonated." },
      { pt: "0 vitórias — muito ult na parede, nenhum resultado.", en: "0 wins — lots of ult into the wall, no results." },
      { pt: "Relatório da imperatriz: muitos elementos, nenhuma conquista.", en: "Empress report: lots of elements, no conquest." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult sem terreno atrás e fazer metade do dano.", en: "First time? You'll ult with no terrain behind and do half the damage." },
      { pt: "Estreia na Qiyana. Sem gerir os elementos, o combo desmonta-se.", en: "Qiyana debut. Without managing the elements, the combo falls apart." },
      { pt: "⚠️ Qiyana nova. Aviso: sem gerir os elementos, o combo desmonta-se.", en: "⚠️ New Qiyana. Warning: without managing the elements, the combo falls apart." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Valor vê uma vitória no horizonte.", en: "Loss after loss — not even Valor spots a win on the horizon." },
      { pt: "Muito voo com o pássaro, e mesmo assim só aterraste na derrota.", en: "Lots of flying with the bird, and still you only landed on defeat." },
      { pt: "Horóscopo: muito voo com o pássaro, e só aterraste na derrota.", en: "Horoscope: lots of flying with the bird, and you only landed on defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a cegar alvos e nem uma vitória à vista.", en: "So many games blinding targets and not one win in sight." },
      { pt: "0 vitórias — muita marca do Valor, nenhum resultado.", en: "0 wins — lots of Valor marks, no results." },
      { pt: "Alvos cegados: muitos. Vitórias à vista: nenhuma.", en: "Targets blinded: many. Wins in sight: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o vault e ficar sem o único disengage.", en: "First time? You'll miss the vault and lose your only disengage." },
      { pt: "Estreia na Quinn. Sem acertar o E, é uma marksman sem escapatória.", en: "Quinn debut. Without landing the E, she's a marksman with no escape." },
      { pt: "⚠️ Quinn nova. Aviso: erra o vault e ficas sem o único disengage.", en: "⚠️ New Quinn. Warning: miss the vault and you lose your only disengage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o dançarino de batalha dança para fora desta.", en: "Loss after loss — not even the battle dancer dances out of this." },
      { pt: "Muito estilo, e mesmo assim só dançaste rumo à derrota.", en: "Lots of style, and still you only danced into defeat." },
      { pt: "Muito estilo. Só dançaste rumo à derrota.", en: "Lots of style. You only danced into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a iniciar com charme e nem uma vitória.", en: "So many games engaging with flair and not one win." },
      { pt: "0 vitórias — muito dash, nenhum resultado.", en: "0 wins — lots of dashing, no results." },
      { pt: "Iniciações com charme: muitas. Vitórias: nenhuma.", en: "Flashy engages: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar dash para o meio deles e não ter como voltar.", en: "First time? You'll dash into them with no way back." },
      { pt: "Estreia no Rakan. Sem um aliado para o E, ficas preso onde saltaste.", en: "Rakan debut. Without an ally for the E, you're stuck where you leapt." },
      { pt: "⚠️ Rakan novo. Aviso: sem um aliado para o E, ficas preso onde saltaste.", en: "⚠️ New Rakan. Warning: without an ally for the E, you're stuck where you leapt." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — 'OK.' Nem a bola trava esta maré.", en: "Loss after loss — 'OK.' Not even the ball stops this streak." },
      { pt: "Rolaste por todo o lado menos para a vitória.", en: "You rolled everywhere except into victory." },
      { pt: "'OK.' Rolaste por todo o lado menos para a vitória.", en: "'OK.' You rolled everywhere except into victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a rolar e a provocar e nem uma vitória.", en: "So many games rolling and taunting and not one win." },
      { pt: "0 vitórias — muita armadura refletida, nenhum resultado.", en: "0 wins — lots of reflected armor, no results." },
      { pt: "Provocações e rolagens: muitas. Vitórias: nenhuma.", en: "Taunts and rolls: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer powerball para o sítio errado e passar a correr por eles.", en: "First time? You'll powerball the wrong way and roll right past them." },
      { pt: "Estreia no Rammus. 'OK' não chega para acertar o taunt no alvo certo.", en: "Rammus debut. 'OK' isn't enough to land the taunt on the right target." },
      { pt: "Tutorial do Rammus, passo 1: powerball no alvo. Passaste a correr por eles.", en: "Rammus tutorial, step 1: powerball the target. You rolled right past them." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem cavar túneis te tira desta maré.", en: "Loss after loss — not even digging tunnels frees you from this streak." },
      { pt: "Sentiste os inimigos todos menos a derrota a chegar.", en: "You sensed every enemy except the loss coming." },
      { pt: "ERRO: sentiste os inimigos todos. Menos a derrota a chegar.", en: "ERROR: sensed every enemy. Except the loss coming." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a cavar e nem uma vitória desenterrada.", en: "So many games digging and not one win unearthed." },
      { pt: "0 vitórias — muito Vazio, nenhum resultado.", en: "0 wins — lots of Void, no results." },
      { pt: "Túneis cavados: muitos. Vitórias desenterradas: nenhuma.", en: "Tunnels dug: many. Wins unearthed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o knockup ao sair da terra e comer o combo.", en: "First time? You'll miss the unburrow knockup and eat the combo." },
      { pt: "Estreia na RekSai. Sem gerir a fúria, o teu sustain desaparece.", en: "RekSai debut. Without managing fury, your sustain vanishes." },
      { pt: "⚠️ RekSai nova. Aviso: sem gerir a fúria, o teu sustain desaparece.", en: "⚠️ New RekSai. Warning: without managing fury, your sustain vanishes." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o ferro todo do teu kit trava esta maré.", en: "Loss after loss — not even all the iron in your kit stops this streak." },
      { pt: "Muita armadura magnetizada, e mesmo assim só atraíste derrotas.", en: "Lots of magnetized armor, and still you only attracted losses." },
      { pt: "Horóscopo: muita armadura magnetizada, e só atraíste derrotas.", en: "Horoscope: lots of magnetized armor, and you only attracted losses." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a magnetizar inimigos e nem uma vitória.", en: "So many games magnetizing enemies and not one win." },
      { pt: "0 vitórias — muito engage, nenhum resultado.", en: "0 wins — lots of engage, no results." },
      { pt: "Inimigos magnetizados: muitos. Vitórias: nenhuma.", en: "Enemies magnetized: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais desmontar no momento errado e ficar sem burst nem defesa.", en: "First time? You'll dismount at the wrong time and lose both burst and defense." },
      { pt: "Estreia na Rell. O timing de montar e desmontar é tudo — e tu não o tens.", en: "Rell debut. The mount-dismount timing is everything — and you don't have it." },
      { pt: "⚠️ Rell nova. Aviso: o timing de montar e desmontar é tudo, e tu não o tens.", en: "⚠️ New Rell. Warning: the mount-dismount timing is everything, and you don't have it." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem virar inimigos uns contra os outros trava isto.", en: "Loss after loss — not even turning enemies on each other stops this." },
      { pt: "A baronesa negociou tudo menos uma vitória.", en: "The baroness negotiated everything except a win." },
      { pt: "A baronesa negociou tudo. Menos uma vitória.", en: "The baroness negotiated everything. Except a win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar aliados para a frente e nem uma vitória.", en: "So many games flinging allies forward and not one win." },
      { pt: "0 vitórias — muito Handshake, nenhum resultado.", en: "0 wins — lots of Handshake, no results." },
      { pt: "Aliados atirados para a frente: muitos. Vitórias: nenhuma.", en: "Allies flung forward: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o W e ver o inimigo enlouquecido não fazer nada útil.", en: "First time? You'll W and watch the maddened enemy do nothing useful." },
      { pt: "Estreia na Renata. Sem aliados para lançar, metade do kit é decoração.", en: "Renata debut. Without allies to fling, half the kit is decoration." },
      { pt: "⚠️ Renata nova. Aviso: sem aliados para lançar, metade do kit é decoração.", en: "⚠️ New Renata. Warning: without allies to fling, half the kit is decoration." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o crocodilo devora esta maré.", en: "Loss after loss — not even the crocodile devours this streak." },
      { pt: "Muita fúria acumulada, e mesmo assim só perdeste.", en: "Lots of fury stacked, and still you only lost." },
      { pt: "ERRO: mergulhou sem fúria. Sem stun. Sem vitória.", en: "ERROR: dove in with no fury. No stun. No win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a mergulhar com o dash e nem uma vitória mordida.", en: "So many games diving with the dash and not one win bitten." },
      { pt: "0 vitórias — muita fúria, nenhum resultado.", en: "0 wins — lots of fury, no results." },
      { pt: "Fúria acumulada: muita. Vitórias mordidas: nenhuma.", en: "Fury stacked: lots. Wins bitten: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar dash para dentro sem fúria e ficar sem stun.", en: "First time? You'll dash in with no fury and no stun." },
      { pt: "Estreia no Renekton. Sem fúria, o combo faz metade do que devia.", en: "Renekton debut. Without fury, the combo does half of what it should." },
      { pt: "⚠️ Renekton novo. Aviso: sem fúria, o combo faz metade do que devia.", en: "⚠️ New Renekton. Warning: without fury, the combo does half of what it should." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem saltar do mato caça esta maré.", en: "Loss after loss — not even leaping from the brush hunts this streak." },
      { pt: "Muitos troféus prometidos, nenhuma vitória para a coleção.", en: "Lots of trophies promised, not one win for the collection." },
      { pt: "🏆 Conquista: 'Muitos Troféus Prometidos, Nenhuma Vitória'.", en: "🏆 Achievement: 'Many Trophies Promised, No Wins'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar de emboscada e nem uma vitória caçada.", en: "So many games ambushing and not one win hunted down." },
      { pt: "0 vitórias — muita ferocidade, nenhum resultado.", en: "0 wins — lots of ferocity, no results." },
      { pt: "Emboscadas: muitas. Vitórias caçadas: nenhuma.", en: "Ambushes: many. Wins hunted: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais saltar sem ferocidade e ficar sem o empowered.", en: "First time? You'll leap with no ferocity and no empowered ability." },
      { pt: "Estreia no Rengar. Sem mato por perto, é só um gato a andar a pé.", en: "Rengar debut. With no brush nearby, he's just a cat walking on foot." },
      { pt: "⚠️ Rengar novo. Aviso: sem mato por perto, é só um gato a andar a pé.", en: "⚠️ New Rengar. Warning: with no brush nearby, he's just a cat walking on foot." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as três lâminas cortam esta maré.", en: "Loss after loss — not even the three blades cut this streak." },
      { pt: "O exílio ainda não acabou, a avaliar por este histórico.", en: "The exile isn't over yet, judging by this record." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a encadear dashes e nem uma vitória cortada.", en: "So many games chaining dashes and not one win cut." },
      { pt: "0 vitórias — muito combo, nenhum resultado.", en: "0 wins — lots of combo, no results." },
      { pt: "Combos encadeados: muitos. Vitórias cortadas: nenhuma.", en: "Chained combos: many. Wins cut: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar os três Q na direção errada e ficar sem mobilidade.", en: "First time? You'll waste all three Q dashes the wrong way and lose your mobility." },
      { pt: "Estreia na Riven. É pura mecânica — hoje vais só cancelar mal os teus ataques.", en: "Riven debut. It's pure mechanics — today you'll just botch your own animation cancels." },
      { pt: "⚠️ Riven nova. Aviso: é pura mecânica. Hoje só vais cancelar mal os teus ataques.", en: "⚠️ New Riven. Warning: it's pure mechanics. Today you'll just botch your animation cancels." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o lança-chamas queima esta maré.", en: "Loss after loss — not even the flamethrower burns this streak." },
      { pt: "Sobreaqueceste e mesmo assim não fizeste dano nenhum.", en: "You overheated and still dealt no damage." },
      { pt: "ERRO: sobreaqueceu no pior momento. Silenciado a si próprio.", en: "ERROR: overheated at the worst moment. Silenced himself." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a gerir calor e nem uma vitória incinerada.", en: "So many games managing heat and not one win incinerated." },
      { pt: "0 vitórias — muito Equalizer, nenhum resultado.", en: "0 wins — lots of Equalizer, no results." },
      { pt: "Calor gerido: mal. Vitórias incineradas: nenhuma.", en: "Heat managed: poorly. Wins incinerated: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais sobreaquecer no pior momento e silenciar-te a ti próprio.", en: "First time? You'll overheat at the worst moment and silence yourself." },
      { pt: "Estreia no Rumble. Sem gerir a barra de calor, ele estraga-se sozinho.", en: "Rumble debut. Without managing the heat bar, he sabotages himself." },
      { pt: "⚠️ Rumble novo. Aviso: sem gerir a barra de calor, ele estraga-se sozinho.", en: "⚠️ New Rumble. Warning: without managing the heat bar, he sabotages himself." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o encadeamento de feitiços trava esta maré.", en: "Loss after loss — not even the spell chain stops this streak." },
      { pt: "O mago mais poderoso de Runeterra, e mesmo assim só perdes.", en: "The most powerful mage in Runeterra, and still you only lose." },
      { pt: "O mago mais poderoso de Runeterra. E mesmo assim só perdes.", en: "The most powerful mage in Runeterra. And still you only lose." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a encadear feitiços e nem uma vitória rúnica.", en: "So many games chaining spells and not one runic win." },
      { pt: "0 vitórias — muito flux, nenhum resultado.", en: "0 wins — lots of flux, no results." },
      { pt: "Feitiços encadeados: muitos. Vitórias rúnicas: nenhuma.", en: "Spells chained: many. Runic wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais atrapalhar-te na ordem dos feitiços e fazer metade do dano.", en: "First time? You'll fumble the spell order and do half the damage." },
      { pt: "Estreia no Ryze. É clicar botões na ordem certa depressa — e tu não vais.", en: "Ryze debut. It's clicking buttons in the right order fast — and you won't." },
      { pt: "⚠️ Ryze novo. Aviso: é clicar botões na ordem certa depressa, e tu não vais.", en: "⚠️ New Ryze. Warning: it's clicking buttons in the right order fast, and you won't." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o estilo S salva esta maré.", en: "Loss after loss — not even S-rank style saves this streak." },
      { pt: "Muito espetáculo, e a nota final foi mesmo F.", en: "Lots of flair, and the final grade was a straight F." },
      { pt: "🏆 Conquista: 'Muito Espetáculo, Nota Final F'.", en: "🏆 Achievement: 'Lots of Flair, Final Grade F'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a encher a barra de estilo e nem uma vitória.", en: "So many games filling the style meter and not one win." },
      { pt: "0 vitórias — muito Inferno Trigger, nenhum resultado.", en: "0 wins — lots of Inferno Trigger, no results." },
      { pt: "Barra de estilo enchida: muitas vezes. Vitórias: nenhuma.", en: "Style meter filled: many times. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult sem chegar ao grau S e fazer nada.", en: "First time? You'll ult before reaching S rank and do nothing." },
      { pt: "Estreia na Samira. Sem encadear o combo até S, o ult é inútil.", en: "Samira debut. Without chaining the combo to S, the ult is useless." },
      { pt: "⚠️ Samira nova. Aviso: sem encadear o combo até S, o ult é inútil.", en: "⚠️ New Samira. Warning: without chaining the combo to S, the ult is useless." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a prisão glacial congela esta maré.", en: "Loss after loss — not even Glacial Prison freezes this streak." },
      { pt: "Muito gelo, e a derrota nem sequer arrefeceu.", en: "Lots of ice, and the loss didn't even cool down." },
      { pt: "Horóscopo: muito gelo, e a derrota nem sequer arrefeceu.", en: "Horoscope: lots of ice, and the loss didn't even cool down." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar a bola de gelo e nem uma vitória presa.", en: "So many games throwing the ice bola and not one win locked." },
      { pt: "0 vitórias — muito permafrost, nenhum resultado.", en: "0 wins — lots of permafrost, no results." },
      { pt: "Bolas de gelo atiradas: muitas. Vitórias presas: nenhuma.", en: "Ice bolas thrown: many. Wins locked: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o R a meio mapa e culpar a hitbox.", en: "First time? You'll miss the R across the map and blame the hitbox." },
      { pt: "Estreia na Sejuani. Sem stacks de permafrost, o teu CC é curto e fraco.", en: "Sejuani debut. Without permafrost stacks, your CC is short and weak." },
      { pt: "⚠️ Sejuani nova. Aviso: sem stacks de permafrost, o teu CC é curto e fraco.", en: "⚠️ New Sejuani. Warning: without permafrost stacks, your CC is short and weak." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem recolher almas ilumina esta maré.", en: "Loss after loss — not even collecting souls lights up this streak." },
      { pt: "Muita alma coletada, e mesmo assim ficaste sem vitória.", en: "Lots of souls collected, and still no win." },
      { pt: "Muita alma coletada. E mesmo assim, sem vitória.", en: "Lots of souls collected. And still, no win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a juntar almas e nem uma vitória iluminada.", en: "So many games gathering souls and not one lit-up win." },
      { pt: "0 vitórias — muito global, nenhum resultado.", en: "0 wins — lots of global, no results." },
      { pt: "Almas juntadas: muitas. Vitórias iluminadas: nenhuma.", en: "Souls gathered: many. Lit-up wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar as almas e nunca escalar nada.", en: "First time? You'll miss the souls and never scale at all." },
      { pt: "Estreia na Senna. Sem almas, ficas sem alcance e sem dano o jogo todo.", en: "Senna debut. Without souls, you stay range-less and damage-less all game." },
      { pt: "⚠️ Senna nova. Aviso: sem almas, ficas sem alcance e sem dano o jogo todo.", en: "⚠️ New Senna. Warning: without souls, you stay range-less and damage-less all game." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o eco repete uma vitória.", en: "Loss after loss — not even the echo repeats a win." },
      { pt: "Muita nota tocada, e mesmo assim desafinaste no placar.", en: "Lots of notes played, and still you're off-key on the scoreboard." },
      { pt: "Muita nota tocada. E mesmo assim desafinaste no placar.", en: "Lots of notes played. And still you're off-key on the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a encantar em cadeia e nem uma vitória.", en: "So many games charming in a chain and not one win." },
      { pt: "0 vitórias — muito eco, nenhum resultado.", en: "0 wins — lots of echo, no results." },
      { pt: "Encantamentos em cadeia: muitos. Vitórias: nenhuma.", en: "Chain charms: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult sem aliados por perto e encantar meia gente.", en: "First time? You'll ult with no allies nearby and charm half of them." },
      { pt: "Estreia na Seraphine. O ult ganha alcance com aliados — sozinha, é fraquinho.", en: "Seraphine debut. The ult grows through allies — alone, it's weak." },
      { pt: "⚠️ Seraphine nova. Aviso: o ult ganha alcance com aliados. Sozinha, é fraquinho.", en: "⚠️ New Seraphine. Warning: the ult grows through allies. Alone, it's weak." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os murros do Chefe travam esta maré.", en: "Loss after loss — not even the Boss's punches stop this streak." },
      { pt: "O Chefe levou porrada é do próprio placar.", en: "The Boss got beaten up by his own scoreboard." },
      { pt: "Última hora: o Chefe leva porrada do próprio placar.", en: "Breaking news: the Boss gets beaten up by his own scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a dar murros e nem uma vitória no queixo.", en: "So many games throwing punches and not one win on the chin." },
      { pt: "0 vitórias — muito grit, nenhum resultado.", en: "0 wins — lots of grit, no results." },
      { pt: "Murros dados: muitos. Vitórias no queixo: nenhuma.", en: "Punches thrown: many. Wins on the chin: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o W sem grit acumulado e fazer dano de festa.", en: "First time? You'll W with no grit stored and deal party-favor damage." },
      { pt: "Estreia no Sett. Sem gerir o grit, o teu murro grande é só um empurrão.", en: "Sett debut. Without managing grit, your big punch is just a shove." },
      { pt: "⚠️ Sett novo. Aviso: sem gerir o grit, o teu murro grande é só um empurrão.", en: "⚠️ New Sett. Warning: without managing grit, your big punch is just a shove." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as caixas assustam esta maré.", en: "Loss after loss — not even the boxes scare this streak." },
      { pt: "Muito truque, e a piada final foi mesmo a tua derrota.", en: "Lots of tricks, and the final joke was your defeat." },
      { pt: "Muito truque. A piada final foi a tua derrota.", en: "Lots of tricks. The final joke was your defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a apunhalar pelas costas e nem uma vitória.", en: "So many games backstabbing and not one win." },
      { pt: "0 vitórias — muitos clones, nenhum resultado.", en: "0 wins — lots of clones, no results." },
      { pt: "Apunhaladas pelas costas: muitas. Vitórias: nenhuma.", en: "Backstabs: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o Deceive para fugir e ficar sem burst.", en: "First time? You'll waste Deceive escaping and lose your burst." },
      { pt: "Estreia no Shaco. Sem as caixas bem postas, o palhaço não assusta ninguém.", en: "Shaco debut. Without the boxes well placed, the clown scares no one." },
      { pt: "⚠️ Shaco novo. Aviso: sem as caixas bem postas, o palhaço não assusta ninguém.", en: "⚠️ New Shaco. Warning: without the boxes well placed, the clown scares no one." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o escudo global salva esta maré.", en: "Loss after loss — not even the global shield saves this streak." },
      { pt: "Muito equilíbrio, e mesmo assim só te desequilibraste para a derrota.", en: "Lots of balance, and still you only tipped into defeat." },
      { pt: "ERRO: escudo global chegou tarde. Aliado morto.", en: "ERROR: global shield arrived late. Ally dead." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a bloquear ataques e nem uma vitória protegida.", en: "So many games blocking attacks and not one win shielded." },
      { pt: "0 vitórias — muita lâmina espiritual, nenhum resultado.", en: "0 wins — lots of spirit blade, no results." },
      { pt: "Ataques bloqueados: muitos. Vitórias protegidas: nenhuma.", en: "Attacks blocked: many. Wins shielded: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult tarde demais e chegar depois de o aliado morrer.", en: "First time? You'll ult too late and arrive after the ally dies." },
      { pt: "Estreia no Shen. Sem timing na lâmina e no taunt, és só um ninja lento.", en: "Shen debut. Without timing on the blade and taunt, you're just a slow ninja." },
      { pt: "⚠️ Shen novo. Aviso: sem timing na lâmina e no taunt, és só um ninja lento.", en: "⚠️ New Shen. Warning: without timing on the blade and taunt, you're just a slow ninja." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem em forma de dragão cospes uma vitória.", en: "Loss after loss — not even in dragon form do you breathe out a win." },
      { pt: "Muita fúria, e mesmo assim só ardeste na derrota.", en: "Lots of fury, and still you only burned in defeat." },
      { pt: "Muita fúria. E mesmo assim só ardeste na derrota.", en: "Lots of fury. And still you only burned in defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a transformar-te em dragão e nem uma vitória.", en: "So many games turning into a dragon and not one win." },
      { pt: "0 vitórias — muita fúria, nenhum resultado.", en: "0 wins — lots of fury, no results." },
      { pt: "Transformações em dragão: muitas. Vitórias: nenhuma.", en: "Dragon transformations: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mergulhar de dragão para o meio deles e morrer lá.", en: "First time? You'll dragon-dive into them and die there." },
      { pt: "Estreia na Shyvana. Sem fúria para a forma, ficas presa em humana fraca.", en: "Shyvana debut. Without fury for the form, you're stuck as weak human." },
      { pt: "⚠️ Shyvana nova. Aviso: sem fúria para a forma, ficas presa em humana fraca.", en: "⚠️ New Shyvana. Warning: without fury for the form, you're stuck as weak human." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o rasto de veneno envenena esta maré.", en: "Loss after loss — not even the poison trail poisons this streak." },
      { pt: "Corre atrás de mim... direto para a derrota.", en: "Chase me... right into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar inimigos para trás e nem uma vitória.", en: "So many games flinging enemies backward and not one win." },
      { pt: "0 vitórias — muito veneno, nenhum resultado.", en: "0 wins — lots of poison, no results." },
      { pt: "Inimigos atirados para trás: muitos. Vitórias: nenhuma.", en: "Enemies flung backward: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais atirar o inimigo para longe da tua equipa em vez de para dentro.", en: "First time? You'll fling the enemy away from your team instead of into it." },
      { pt: "Estreia no Singed. O fling é uma arte — hoje vais mandar toda a gente para o sítio errado.", en: "Singed debut. The fling is an art — today you'll send everyone the wrong way." },
      { pt: "Tutorial do Singed, passo 1: fling para dentro. Mandaste-os para o sítio errado.", en: "Singed tutorial, step 1: fling them in. You sent them the wrong way." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem carregar contra tudo trava esta maré.", en: "Loss after loss — not even charging into everything stops this streak." },
      { pt: "Voltaste dos mortos só para perder outra vez.", en: "You came back from the dead just to lose again." },
      { pt: "Última hora: voltou dos mortos só para perder outra vez.", en: "Breaking news: came back from the dead just to lose again." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a carregar com o R e nem uma vitória esmagada.", en: "So many games charging with the R and not one win crushed." },
      { pt: "0 vitórias — muito knockup, nenhum resultado.", en: "0 wins — lots of knockup, no results." },
      { pt: "Cargas do R: muitas. Vitórias esmagadas: nenhuma.", en: "R charges: many. Wins crushed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais carregar o R e bater numa parede a dois metros deles.", en: "First time? You'll charge the R and hit a wall two feet from them." },
      { pt: "Estreia no Sion. Controlar a carga do ult é difícil — vais bater em tudo menos neles.", en: "Sion debut. Steering the ult charge is hard — you'll hit everything but them." },
      { pt: "Tutorial do Sion, passo 1: guiar a carga do R. Bateste numa parede a dois metros deles.", en: "Sion tutorial, step 1: steer the R charge. You hit a wall two feet from them." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o spell shield bloqueia esta maré.", en: "Loss after loss — not even the spell shield blocks this streak." },
      { pt: "Muito boomerang, e mesmo assim voltou tudo menos a vitória.", en: "Lots of boomerang, and everything came back except victory." },
      { pt: "Muito boomerang. Voltou tudo menos a vitória.", en: "Lots of boomerang. Everything came back except victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar o boomerang e nem uma vitória de volta.", en: "So many games throwing the boomerang and not one win coming back." },
      { pt: "0 vitórias — muito ricochet, nenhum resultado.", en: "0 wins — lots of ricochet, no results." },
      { pt: "Boomerangs atirados: muitos. Vitórias de volta: nenhuma.", en: "Boomerangs thrown: many. Wins coming back: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais desperdiçar o spell shield e comer o CC todo.", en: "First time? You'll waste the spell shield and eat all the CC." },
      { pt: "Estreia na Sivir. Sem ler o momento do escudo, é só uma marksman comum.", en: "Sivir debut. Without reading the shield timing, she's just an ordinary marksman." },
      { pt: "⚠️ Sivir nova. Aviso: sem ler o momento do escudo, é só uma marksman comum.", en: "⚠️ New Sivir. Warning: without reading the shield timing, she's just an ordinary marksman." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem arrastar alvos com o ult trava esta maré.", en: "Loss after loss — not even dragging targets with the ult stops this streak." },
      { pt: "Muito cristal, e mesmo assim só te partiste na derrota.", en: "Lots of crystal, and still you only shattered in defeat." },
      { pt: "Muito cristal. E mesmo assim só te partiste na derrota.", en: "Lots of crystal. And still you only shattered in defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a suprimir alvos e nem uma vitória arrastada.", en: "So many games suppressing targets and not one win dragged in." },
      { pt: "0 vitórias — muito quake, nenhum resultado.", en: "0 wins — lots of quake, no results." },
      { pt: "Alvos suprimidos: muitos. Vitórias arrastadas: nenhuma.", en: "Targets suppressed: many. Wins dragged in: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais arrastar o inimigo para longe da tua equipa com o R.", en: "First time? You'll drag the enemy away from your team with the R." },
      { pt: "Estreia no Skarner. O ult é forte — se o usas para o lado errado, é só um abraço.", en: "Skarner debut. The ult is strong — aimed the wrong way, it's just a hug." },
      { pt: "Tutorial do Skarner, passo 1: arrastar o alvo para a tua equipa. Levaste-o para longe.", en: "Skarner tutorial, step 1: drag the target to your team. You took him away." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem crescer a barra de Q incendeia esta maré.", en: "Loss after loss — not even growing the Q stacks ignites this streak." },
      { pt: "Muitos stacks prometidos, nenhuma vitória para o bebé dragão.", en: "Lots of stacks promised, not one win for the baby dragon." },
      { pt: "Muitos stacks prometidos. Nenhuma vitória para o bebé dragão.", en: "Lots of stacks promised. Not one win for the baby dragon." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a empilhar o Q e nem uma vitória para mostrar à mamã.", en: "So many games stacking the Q and not one win to show mom." },
      { pt: "0 vitórias — muitas escamas, nenhum resultado.", en: "0 wins — lots of scales, no results." },
      { pt: "Stacks de Q: muitos. Vitórias para mostrar à mamã: nenhuma.", en: "Q stacks: many. Wins to show mom: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o jogo a empilhar e morrer antes de escalar.", en: "First time? You'll spend the game stacking and die before you scale." },
      { pt: "Estreia no Smolder. Sem stacks, o teu dano é o de um lagarto pequenino.", en: "Smolder debut. Without stacks, your damage is that of a tiny lizard." },
      { pt: "⚠️ Smolder novo. Aviso: sem stacks, o teu dano é o de um lagarto pequenino.", en: "⚠️ New Smolder. Warning: without stacks, your damage is that of a tiny lizard." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Crescendo prende esta maré.", en: "Loss after loss — not even Crescendo locks down this streak." },
      { pt: "Muita melodia, e mesmo assim tocaste é a marcha da derrota.", en: "Lots of melody, and still you played the march of defeat." },
      { pt: "Horóscopo: muita melodia, e tocaste é a marcha da derrota.", en: "Horoscope: lots of melody, and you played the march of defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a tocar auras e nem uma vitória em harmonia.", en: "So many games playing auras and not one win in harmony." },
      { pt: "0 vitórias — muito Power Chord, nenhum resultado.", en: "0 wins — lots of Power Chord, no results." },
      { pt: "Auras tocadas: muitas. Vitórias em harmonia: nenhuma.", en: "Auras played: many. Wins in harmony: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o Crescendo a meio mapa e não prender ninguém.", en: "First time? You'll miss the Crescendo across the map and stun no one." },
      { pt: "Estreia na Sona. Sem gerir as auras, és só uma pianista sem defesa.", en: "Sona debut. Without managing the auras, she's just a defenseless pianist." },
      { pt: "⚠️ Sona nova. Aviso: sem gerir as auras, és só uma pianista sem defesa.", en: "⚠️ New Sona. Warning: without managing the auras, she's just a defenseless pianist." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem trocar a tua vida por curas trava esta maré.", en: "Loss after loss — not even trading your health for heals stops this streak." },
      { pt: "Muita cura, e mesmo assim ninguém sobreviveu à derrota.", en: "Lots of healing, and still no one survived the defeat." },
      { pt: "Muita cura. E mesmo assim ninguém sobreviveu à derrota.", en: "Lots of healing. And still no one survived the defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a curar toda a gente e nem uma vitória curada.", en: "So many games healing everyone and not one win healed." },
      { pt: "0 vitórias — muito Wish, nenhum desejo realizado.", en: "0 wins — lots of Wish, no wish granted." },
      { pt: "Aliados curados: muitos. Vitórias curadas: nenhuma.", en: "Allies healed: many. Wins healed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais curar-te a ti até quase morrer e ainda assim perder.", en: "First time? You'll heal yourself nearly to death and lose anyway." },
      { pt: "Estreia na Soraka. Sem acertar o Q, ficas sem cura e sem sustain.", en: "Soraka debut. Without landing the Q, you have no heal and no sustain." },
      { pt: "⚠️ Soraka nova. Aviso: sem acertar o Q, ficas sem cura e sem sustain.", en: "⚠️ New Soraka. Warning: without landing the Q, you have no heal and no sustain." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os fragmentos de alma dão vida a esta maré.", en: "Loss after loss — not even the soul fragments give this streak life." },
      { pt: "Muito dreno, e mesmo assim secaste no placar.", en: "Lots of drain, and still you dried up on the scoreboard." },
      { pt: "Horóscopo: muito dreno, e mesmo assim secaste no placar.", en: "Horoscope: lots of drain, and still you dried up on the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a colher almas e nem uma vitória drenada.", en: "So many games harvesting souls and not one win drained." },
      { pt: "0 vitórias — muito Nevermove, nenhum resultado.", en: "0 wins — lots of Nevermove, no results." },
      { pt: "Almas colhidas: muitas. Vitórias drenadas: nenhuma.", en: "Souls harvested: many. Wins drained: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o W e ficar sem o único root para o combo.", en: "First time? You'll miss the W and lose the only root for the combo." },
      { pt: "Estreia no Swain. Sem fragmentos de alma, o teu ult acaba num instante.", en: "Swain debut. Without soul fragments, your ult fizzles in an instant." },
      { pt: "⚠️ Swain novo. Aviso: sem fragmentos de alma, o teu ult acaba num instante.", en: "⚠️ New Swain. Warning: without soul fragments, your ult fizzles in an instant." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem roubar o ult dos outros trava esta maré.", en: "Loss after loss — not even stealing others' ults stops this streak." },
      { pt: "Muito ult emprestado, nenhuma vitória tua.", en: "Lots of borrowed ults, not one win of your own." },
      { pt: "Muito ult emprestado. Nenhuma vitória tua.", en: "Lots of borrowed ults. Not one win of your own." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a roubar ultimates e nem uma vitória roubada.", en: "So many games stealing ultimates and not one stolen win." },
      { pt: "0 vitórias — muitas correntes, nenhum resultado.", en: "0 wins — lots of chains, no results." },
      { pt: "Ultimates roubados: muitos. Vitórias roubadas: nenhuma.", en: "Ultimates stolen: many. Stolen wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais roubar o ult errado e usá-lo sem saber como.", en: "First time? You'll steal the wrong ult and use it with no idea how." },
      { pt: "Estreia no Sylas. Se não sabes o ult de quem roubas, entregas o combo à toa.", en: "Sylas debut. If you don't know the ult you steal, you throw the combo away." },
      { pt: "⚠️ Sylas novo. Aviso: se não sabes o ult de quem roubas, entregas o combo à toa.", en: "⚠️ New Sylas. Warning: if you don't know the ult you steal, you throw the combo away." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o Unleashed Power detona esta maré.", en: "Loss after loss — not even Unleashed Power detonates this streak." },
      { pt: "Muitas esferas, e mesmo assim nenhuma acertou na vitória.", en: "Lots of spheres, and still not one hit victory." },
      { pt: "ERRO: esferas empurradas na direção errada. Stun falhado.", en: "ERROR: spheres pushed the wrong way. Stun missed." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a espalhar esferas e nem uma vitória escondida entre elas.", en: "So many games scattering spheres and not one win hidden among them." },
      { pt: "0 vitórias — muito Scatter, nenhum resultado.", en: "0 wins — lots of Scatter, no results." },
      { pt: "Esferas espalhadas: muitas. Vitórias entre elas: nenhuma.", en: "Spheres scattered: many. Wins among them: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais empurrar as esferas na direção errada e falhar o stun.", en: "First time? You'll push the spheres the wrong way and miss the stun." },
      { pt: "Estreia na Syndra. Sem gerir as esferas, o burst do R é metade.", en: "Syndra debut. Without managing the spheres, the R burst is halved." },
      { pt: "⚠️ Syndra nova. Aviso: sem gerir as esferas, o burst do R é metade.", en: "⚠️ New Syndra. Warning: without managing the spheres, the R burst is halved." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem engolir aliados salva esta maré.", en: "Loss after loss — not even swallowing allies saves this streak." },
      { pt: "O rei do rio engoliu tudo menos uma vitória.", en: "The River King swallowed everything except a win." },
      { pt: "O rei do rio engoliu tudo. Menos uma vitória.", en: "The River King swallowed everything. Except a win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a engolir gente e nem uma vitória digerida.", en: "So many games swallowing people and not one win digested." },
      { pt: "0 vitórias — muita língua, nenhum resultado.", en: "0 wins — lots of tongue, no results." },
      { pt: "Pessoas engolidas: muitas. Vitórias digeridas: nenhuma.", en: "People swallowed: many. Wins digested: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais engolir o aliado errado no momento errado.", en: "First time? You'll swallow the wrong ally at the wrong time." },
      { pt: "Estreia no TahmKench. Sem acertar a língua, ficas sem stun e sem engage.", en: "TahmKench debut. Without landing the tongue, you have no stun and no engage." },
      { pt: "⚠️ TahmKench novo. Aviso: sem acertar a língua, ficas sem stun e sem engage.", en: "⚠️ New TahmKench. Warning: without landing the tongue, you have no stun and no engage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a pedra trava esta maré.", en: "Loss after loss — not even the stone stops this streak." },
      { pt: "Muito chão trabalhado, e mesmo assim só cavaste a tua derrota.", en: "Lots of worked ground, and still you only dug your own defeat." },
      { pt: "Muito chão trabalhado. Só cavaste a tua derrota.", en: "Lots of worked ground. You only dug your own defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar pedras e nem uma vitória empurrada.", en: "So many games throwing rocks and not one win shoved." },
      { pt: "0 vitórias — muito worked ground, nenhum resultado.", en: "0 wins — lots of worked ground, no results." },
      { pt: "Pedras atiradas: muitas. Vitórias empurradas: nenhuma.", en: "Rocks thrown: many. Wins shoved: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o W e não empurrar ninguém para lado nenhum.", en: "First time? You'll miss the W and shove no one anywhere." },
      { pt: "Estreia na Taliyah. Sem worked ground, o Q faz metade do dano.", en: "Taliyah debut. Without worked ground, the Q does half the damage." },
      { pt: "⚠️ Taliyah nova. Aviso: sem worked ground, o Q faz metade do dano.", en: "⚠️ New Taliyah. Warning: without worked ground, the Q does half the damage." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem saltar paredes escapa desta maré.", en: "Loss after loss — not even hopping walls escapes this streak." },
      { pt: "Muito assassinato prometido, nenhuma vitória executada.", en: "Lots of assassination promised, not one win executed." },
      { pt: "Muito assassinato prometido. Nenhuma vitória executada.", en: "Lots of assassination promised. Not one win executed." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar muros e nem uma vitória apunhalada.", en: "So many games hopping walls and not one win stabbed." },
      { pt: "0 vitórias — muito sangramento, nenhum resultado.", en: "0 wins — lots of bleed, no results." },
      { pt: "Muros saltados: muitos. Vitórias apunhaladas: nenhuma.", en: "Walls hopped: many. Wins stabbed: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mergulhar com o Q e ficar sem escapatória do outro lado.", en: "First time? You'll dive with the Q and have no escape on the other side." },
      { pt: "Estreia no Talon. Sem o combo de sangramento completo, não matas nada.", en: "Talon debut. Without the full bleed combo, you kill nothing." },
      { pt: "⚠️ Talon novo. Aviso: sem o combo de sangramento completo, não matas nada.", en: "⚠️ New Talon. Warning: without the full bleed combo, you kill nothing." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a invulnerabilidade do ult trava esta maré.", en: "Loss after loss — not even the ult's invulnerability stops this streak." },
      { pt: "Muito brilho, e mesmo assim só brilhaste na derrota.", en: "Lots of sparkle, and still you only shone in defeat." },
      { pt: "Muito brilho. Só brilhaste na derrota.", en: "Lots of sparkle. You only shone in defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atordoar com o E e nem uma vitória gemada.", en: "So many games stunning with the E and not one gem-hard win." },
      { pt: "0 vitórias — muita Bravado, nenhum resultado.", en: "0 wins — lots of Bravado, no results." },
      { pt: "Stuns dados: muitos. Vitórias gemadas: nenhuma.", en: "Stuns landed: many. Gem-hard wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar a invulnerabilidade tarde demais e ver todos morrer antes.", en: "First time? You'll pop the invuln too late and watch everyone die first." },
      { pt: "Estreia no Taric. Sem timing no ult, o dourado chega sempre atrasado.", en: "Taric debut. Without timing on the ult, the gold always arrives late." },
      { pt: "⚠️ Taric novo. Aviso: sem timing no ult, o dourado chega sempre atrasado.", en: "⚠️ New Taric. Warning: without timing on the ult, the gold always arrives late." },
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
    lossStreak: [
      { pt: "Nem o yordle mais odiado merecia esta série de derrotas — mas cá estamos.", en: "Not even the most hated yordle deserved this losing streak — yet here we are." },
      { pt: "Plantaste cogumelos por todo o lado, menos no caminho da vitória.", en: "You planted mushrooms everywhere except on the road to victory." },
      { pt: "Última hora: yordle mais odiado do jogo perde outra vez.", en: "Breaking news: most hated yordle in the game loses again." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas e o Capitão Teemo continua sem uma missão cumprida.", en: "So many games and Captain Teemo still hasn't completed a single mission." },
      { pt: "0 vitórias e já toda a gente te odeia. Eficiência, ao menos.", en: "0 wins and everyone already hates you. Efficient, at least." },
      { pt: "🏆 Conquista: 'Toda a Gente te Odeia, Zero Vitórias'.", en: "🏆 Achievement: 'Everyone Hates You, Zero Wins'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez com o Teemo? Já toda a gente te odeia, e ainda nem começaste.", en: "First time with Teemo? Everyone already hates you, and you haven't even started." },
      { pt: "Estreia no diabinho. Os cogumelos são fáceis, ganhar é que não.", en: "Little devil debut. The mushrooms are easy, the winning isn't." },
      { pt: "⚠️ Teemo novo. Aviso: já toda a gente te odeia, e ainda nem começaste.", en: "⚠️ New Teemo. Warning: everyone already hates you, and you haven't even started." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a lanterna resgata esta maré.", en: "Loss after loss — not even the lantern rescues this streak." },
      { pt: "O carcereiro prendeu tudo menos uma vitória.", en: "The Chain Warden locked down everything except a win." },
      { pt: "O carcereiro prendeu tudo. Menos uma vitória.", en: "The Chain Warden locked down everything. Except a win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a lançar o gancho e nem uma vitória apanhada.", en: "So many games throwing the hook and not one win caught." },
      { pt: "0 vitórias — muitas almas, nenhum resultado.", en: "0 wins — lots of souls, no results." },
      { pt: "Ganchos lançados: muitos. Vitórias apanhadas: nenhuma.", en: "Hooks thrown: many. Wins caught: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o gancho e atirar a lanterna para longe de todos.", en: "First time? You'll miss the hook and toss the lantern away from everyone." },
      { pt: "Estreia no Thresh. Sem acertar o Q, metade do teu kit fica em casa.", en: "Thresh debut. Without landing the Q, half your kit stays home." },
      { pt: "⚠️ Thresh novo. Aviso: sem acertar o Q, metade do teu kit fica em casa.", en: "⚠️ New Thresh. Warning: without landing the Q, half your kit stays home." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o rocket jump salta para fora desta maré.", en: "Loss after loss — not even the rocket jump leaps out of this streak." },
      { pt: "Muito salto, e mesmo assim aterraste sempre na derrota.", en: "Lots of jumping, and still you always landed on defeat." },
      { pt: "Muito salto. Aterraste sempre na derrota.", en: "Lots of jumping. You always landed on defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a acumular a carga explosiva e nem uma vitória detonada.", en: "So many games stacking the explosive charge and not one detonated win." },
      { pt: "0 vitórias — muito Buster Shot, nenhum resultado.", en: "0 wins — lots of Buster Shot, no results." },
      { pt: "Cargas explosivas: muitas. Vitórias detonadas: nenhuma.", en: "Explosive charges: many. Wins detonated: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o E e depois empurrar o alvo para longe antes de explodir.", en: "First time? You'll E and then knock the target away before it pops." },
      { pt: "Estreia na Tristana. Sem o reset do salto num abate, ficas presa no meio deles.", en: "Tristana debut. Without the jump reset on a takedown, you're stuck among them." },
      { pt: "⚠️ Tristana nova. Aviso: sem o reset do salto num abate, ficas presa no meio deles.", en: "⚠️ New Tristana. Warning: without the jump reset on a takedown, you're stuck among them." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem roubar as resistências do inimigo trava isto.", en: "Loss after loss — not even stealing the enemy's resistances stops this." },
      { pt: "Roubaste tudo do adversário menos a capacidade de ganhar.", en: "You stole everything from your opponent except the ability to win." },
      { pt: "Roubaste tudo do adversário. Menos a capacidade de ganhar.", en: "You stole everything from your opponent. Except the ability to win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a morder e a roubar e nem uma vitória.", en: "So many games biting and stealing and not one win." },
      { pt: "0 vitórias — muito pilar de gelo, nenhum resultado.", en: "0 wins — lots of ice pillar, no results." },
      { pt: "Resistências roubadas: muitas. Vitórias: nenhuma.", en: "Resistances stolen: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pôr o pilar a bloquear a tua própria equipa.", en: "First time? You'll drop the pillar blocking your own team." },
      { pt: "Estreia no Trundle. Sem o ult no alvo certo, é só um troll a morder.", en: "Trundle debut. Without the ult on the right target, he's just a biting troll." },
      { pt: "Tutorial do Trundle, passo 1: pilar para os prender. Bloqueaste a tua própria equipa.", en: "Trundle tutorial, step 1: pillar to trap them. You blocked your own team." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem ser imortal cinco segundos trava esta maré.", en: "Loss after loss — not even being unkillable for five seconds stops this streak." },
      { pt: "Muita fúria, e mesmo assim só cortaste a tua própria derrota.", en: "Lots of fury, and still you only cut your own defeat." },
      { pt: "Nem ser imortal cinco segundos trava esta maré.", en: "Not even being unkillable for five seconds stops this streak." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a girar e a ganhar fúria e nem uma vitória.", en: "So many games spinning and raging and not one win." },
      { pt: "0 vitórias — muito crit, nenhum resultado.", en: "0 wins — lots of crit, no results." },
      { pt: "Fúria acumulada: muita. Vitórias: nenhuma.", en: "Fury stacked: lots. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais usar o ult tarde demais e morrer antes de ficar imortal.", en: "First time? You'll pop the ult too late and die before you go immortal." },
      { pt: "Estreia no Tryndamere. Sem fúria acumulada, os teus crits são sorte pura.", en: "Tryndamere debut. Without stacked fury, your crits are pure luck." },
      { pt: "⚠️ Tryndamere novo. Aviso: sem fúria acumulada, os teus crits são sorte pura.", en: "⚠️ New Tryndamere. Warning: without stacked fury, your crits are pure luck." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a carta dourada te safa desta maré.", en: "Loss after loss — not even the gold card saves this streak." },
      { pt: "Muita sorte de cartas, e a mão foi sempre a de perder.", en: "Lots of card luck, and the hand was always the losing one." },
      { pt: "Horóscopo: muita sorte de cartas, e a mão foi sempre a de perder.", en: "Horoscope: lots of card luck, and the hand was always the losing one." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a escolher cartas e nem uma vitória na manga.", en: "So many games picking cards and not one win up the sleeve." },
      { pt: "0 vitórias — muito Destiny, nenhum resultado.", en: "0 wins — lots of Destiny, no results." },
      { pt: "Cartas escolhidas: muitas. Vitórias na manga: nenhuma.", en: "Cards picked: many. Wins up the sleeve: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais escolher a carta azul quando querias a dourada.", en: "First time? You'll lock the blue card when you wanted gold." },
      { pt: "Estreia no TwistedFate. Sem controlar o baralho, o stun sai quando não deve.", en: "TwistedFate debut. Without controlling the deck, the stun comes out when it shouldn't." },
      { pt: "Tutorial do TwistedFate, passo 1: escolher a carta dourada. Saiu a azul.", en: "TwistedFate tutorial, step 1: pick the gold card. Blue came out." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem sair da stealth vira esta maré.", en: "Loss after loss — not even leaving stealth turns this streak around." },
      { pt: "Muito veneno acumulado, e mesmo assim ninguém morreu por ele.", en: "Lots of stacked poison, and still no one died from it." },
      { pt: "Muito veneno acumulado. E ninguém morreu por ele.", en: "Lots of stacked poison. And no one died from it." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a espreitar do stealth e nem uma vitória emboscada.", en: "So many games lurking from stealth and not one ambushed win." },
      { pt: "0 vitórias — muito Spray and Pray, nenhum resultado.", en: "0 wins — lots of Spray and Pray, no results." },
      { pt: "Emboscadas do stealth: muitas. Vitórias: nenhuma.", en: "Stealth ambushes: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais sair da stealth cedo demais e apanhar tudo antes de disparar.", en: "First time? You'll leave stealth too early and get hit before you shoot." },
      { pt: "Estreia no Twitch. Sem posicionar o ult, o teu dano é o de um rato comum.", en: "Twitch debut. Without positioning the ult, your damage is that of an ordinary rat." },
      { pt: "⚠️ Twitch novo. Aviso: sem posicionar o ult, o teu dano é o de um rato comum.", en: "⚠️ New Twitch. Warning: without positioning the ult, your damage is that of an ordinary rat." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem trocar de postura trava esta maré.", en: "Loss after loss — not even switching stances stops this streak." },
      { pt: "Quatro posturas e nenhuma delas ganha.", en: "Four stances and not one of them wins." },
      { pt: "Quatro posturas. Nenhuma delas ganha.", en: "Four stances. Not one of them wins." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a alternar posturas e nem uma vitória.", en: "So many games cycling stances and not one win." },
      { pt: "0 vitórias — muito espírito, nenhum resultado.", en: "0 wins — lots of spirit, no results." },
      { pt: "Posturas alternadas: muitas. Vitórias: nenhuma.", en: "Stances cycled: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais entrar na postura errada em cada luta.", en: "First time? You'll enter the wrong stance in every fight." },
      { pt: "Estreia no Udyr. Sem alternar as posturas bem, és só um urso confuso.", en: "Udyr debut. Without cycling stances well, you're just a confused bear." },
      { pt: "Tutorial do Udyr, passo 1: postura certa em cada luta. Entraste sempre na errada.", en: "Udyr tutorial, step 1: right stance every fight. You always picked the wrong one." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o teu execute arrasta esta maré.", en: "Loss after loss — not even your execute drags this streak in." },
      { pt: "Muita perna metálica, e mesmo assim andaste é para trás.", en: "Lots of metal legs, and still you only walked backwards." },
      { pt: "Muita perna metálica. E andaste é para trás.", en: "Lots of metal legs. And you only walked backwards." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a virar inimigos ao contrário e nem uma vitória.", en: "So many games flipping enemies over and not one win." },
      { pt: "0 vitórias — muito Purge, nenhum resultado.", en: "0 wins — lots of Purge, no results." },
      { pt: "Inimigos virados ao contrário: muitos. Vitórias: nenhuma.", en: "Enemies flipped over: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult sem o inimigo abaixo do limiar e não executar nada.", en: "First time? You'll ult with the enemy above the threshold and execute nothing." },
      { pt: "Estreia no Urgot. Sem posicionar as pernas, o teu dano dispersa-se todo.", en: "Urgot debut. Without positioning the legs, all your damage scatters." },
      { pt: "⚠️ Urgot novo. Aviso: sem posicionar as pernas, o teu dano dispersa-se todo.", en: "⚠️ New Urgot. Warning: without positioning the legs, all your damage scatters." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a flecha carregada perfura esta maré.", en: "Loss after loss — not even the charged arrow pierces this streak." },
      { pt: "Muito blight acumulado, e mesmo assim nada explodiu a teu favor.", en: "Lots of Blight stacked, and still nothing popped in your favor." },
      { pt: "Muito blight acumulado. E nada explodiu a teu favor.", en: "Lots of Blight stacked. And nothing popped in your favor." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a carregar o Q e nem uma vitória perfurada.", en: "So many games charging the Q and not one pierced win." },
      { pt: "0 vitórias — muitas correntes, nenhum resultado.", en: "0 wins — lots of chains, no results." },
      { pt: "Q's carregados: muitos. Vitórias perfuradas: nenhuma.", en: "Charged Q's: many. Pierced wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o ult a meio mapa e ficar sem o único CC.", en: "First time? You'll miss the ult across the map and lose your only CC." },
      { pt: "Estreia no Varus. Sem stacks de blight, o combo faz cócegas.", en: "Varus debut. Without Blight stacks, the combo tickles." },
      { pt: "⚠️ Varus novo. Aviso: sem stacks de blight, o combo faz cócegas.", en: "⚠️ New Varus. Warning: without Blight stacks, the combo tickles." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os silver bolts furam esta maré.", en: "Loss after loss — not even the silver bolts pierce this streak." },
      { pt: "Muita caçada noturna, e a presa continuas a ser tu.", en: "Lots of night hunting, and the prey is still you." },
      { pt: "Horóscopo: muita caçada noturna, e a presa continuas a ser tu.", en: "Horoscope: lots of night hunting, and the prey is still you." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a pregar gente às paredes e nem uma vitória.", en: "So many games pinning people to walls and not one win." },
      { pt: "0 vitórias — muito true damage, nenhum resultado.", en: "0 wins — lots of true damage, no results." },
      { pt: "Pessoas pregadas às paredes: muitas. Vitórias: nenhuma.", en: "People pinned to walls: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pregar o condemn ao ar e ficar sem defesa nenhuma.", en: "First time? You'll condemn into thin air and be left with no defense." },
      { pt: "Estreia na Vayne. É a ADC mais difícil — hoje vais só morrer em melee range.", en: "Vayne debut. She's the hardest ADC — today you'll just die in melee range." },
      { pt: "⚠️ Vayne nova. Aviso: é a ADC mais difícil. Hoje só vais morrer em melee range.", en: "⚠️ New Vayne. Warning: she's the hardest ADC. Today you'll just die in melee range." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem empilhar AP para o infinito trava isto.", en: "Loss after loss — not even stacking AP to infinity stops this." },
      { pt: "Muito poder acumulado, e mesmo assim continuas pequeno no placar.", en: "Lots of stacked power, and still you're tiny on the scoreboard." },
      { pt: "Muito poder acumulado. E continuas pequeno no placar.", en: "Lots of stacked power. And you're still tiny on the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a empilhar poder e nem uma vitória detonada.", en: "So many games stacking power and not one detonated win." },
      { pt: "0 vitórias — muita gaiola, nenhum resultado.", en: "0 wins — lots of cage, no results." },
      { pt: "Poder empilhado: muito. Vitórias detonadas: nenhuma.", en: "Power stacked: lots. Wins detonated: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pôr a gaiola à volta de ti em vez do inimigo.", en: "First time? You'll cage yourself instead of the enemy." },
      { pt: "Estreia no Veigar. Sem stacks, o pequeno mestre do mal é só pequeno.", en: "Veigar debut. Without stacks, the tiny master of evil is just tiny." },
      { pt: "Tutorial do Veigar, passo 1: gaiola no inimigo. Puseste-a à volta de ti.", en: "Veigar tutorial, step 1: cage the enemy. You caged yourself." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o laser de conhecimento ilumina esta maré.", en: "Loss after loss — not even the knowledge laser lights up this streak." },
      { pt: "Muita pesquisa, e mesmo assim não aprendeste a ganhar.", en: "Lots of research, and still you didn't learn to win." },
      { pt: "Muita pesquisa. E não aprendeste a ganhar.", en: "Lots of research. And you didn't learn to win." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a canalizar o laser e nem uma vitória desintegrada.", en: "So many games channeling the laser and not one disintegrated win." },
      { pt: "0 vitórias — muito true damage, nenhum resultado.", en: "0 wins — lots of true damage, no results." },
      { pt: "Lasers canalizados: muitos. Vitórias desintegradas: nenhuma.", en: "Lasers channeled: many. Disintegrated wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais canalizar o ult à vista e ser interrompido a meio.", en: "First time? You'll channel the ult in the open and get interrupted halfway." },
      { pt: "Estreia no Velkoz. Sem acertar os skillshots, o olho do Vazio vê só derrotas.", en: "Velkoz debut. Without landing the skillshots, the Void's eye sees only losses." },
      { pt: "⚠️ Velkoz novo. Aviso: sem acertar os skillshots, o olho do Vazio vê só derrotas.", en: "⚠️ New Velkoz. Warning: without landing the skillshots, the Void's eye sees only losses." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — até a Vex acha isto deprimente.", en: "Loss after loss — even Vex finds this depressing." },
      { pt: "Muito 'ugh', e a derrota continua a marcar-te.", en: "Lots of 'ugh,' and the loss keeps marking you." },
      { pt: "Até a Vex acha isto deprimente.", en: "Even Vex finds this depressing." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a marcar alvos com gloom e nem uma vitória.", en: "So many games marking targets with gloom and not one win." },
      { pt: "0 vitórias — muito medo, nenhum resultado.", en: "0 wins — lots of fear, no results." },
      { pt: "Alvos marcados com gloom: muitos. Vitórias: nenhuma.", en: "Targets marked with gloom: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult e falhar o dash de regresso ao alvo.", en: "First time? You'll ult and miss the reset dash back to the target." },
      { pt: "Estreia na Vex. Sem gerir o passivo de gloom, o teu burst desaparece.", en: "Vex debut. Without managing the gloom passive, your burst vanishes." },
      { pt: "⚠️ Vex nova. Aviso: sem gerir o passivo de gloom, o teu burst desaparece.", en: "⚠️ New Vex. Warning: without managing the gloom passive, your burst vanishes." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o murro carregado esmurra esta maré.", en: "Loss after loss — not even the charged punch smashes this streak." },
      { pt: "Muita porrada, e mesmo assim só te esmurraste a ti.", en: "Lots of punching, and still you only punched yourself." },
      { pt: "Muita porrada. Só te esmurraste a ti.", en: "Lots of punching. You only punched yourself." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a fixar alvos com o R e nem uma vitória.", en: "So many games locking onto targets with the R and not one win." },
      { pt: "0 vitórias — muito Vault Breaker, nenhum resultado.", en: "0 wins — lots of Vault Breaker, no results." },
      { pt: "Alvos fixados com o R: muitos. Vitórias: nenhuma.", en: "Targets locked with the R: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais carregar o Q e bater numa parede antes de chegar a eles.", en: "First time? You'll charge the Q and smack a wall before reaching them." },
      { pt: "Estreia na Vi. O ult é lock-on — mas escolher o alvo certo é contigo.", en: "Vi debut. The ult is lock-on — but picking the right target is on you." },
      { pt: "⚠️ Vi nova. Aviso: o ult é lock-on, mas escolher o alvo certo é contigo.", en: "⚠️ New Vi. Warning: the ult is lock-on, but picking the right target is on you." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem possuir o corpo do inimigo trava esta maré.", en: "Loss after loss — not even possessing the enemy's body stops this streak." },
      { pt: "Muitas possessões, e mesmo assim perdeste em todos os corpos.", en: "Lots of possessions, and still you lost in every body." },
      { pt: "Muitas possessões. E perdeste em todos os corpos.", en: "Lots of possessions. And you lost in every body." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a possuir cadáveres e nem uma vitória tomada.", en: "So many games possessing corpses and not one win taken." },
      { pt: "0 vitórias — muita lâmina, nenhum resultado.", en: "0 wins — lots of blade, no results." },
      { pt: "Cadáveres possuídos: muitos. Vitórias tomadas: nenhuma.", en: "Corpses possessed: many. Wins taken: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais possuir o campeão morto e não saber jogar com ele.", en: "First time? You'll possess the dead champion and have no idea how to play it." },
      { pt: "Estreia no Viego. Sem um abate para possuir, o combo fica pela metade.", en: "Viego debut. Without a takedown to possess, the combo falls short." },
      { pt: "⚠️ Viego novo. Aviso: sem um abate para possuir, o combo fica pela metade.", en: "⚠️ New Viego. Warning: without a takedown to possess, the combo falls short." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem evoluir o hex core evolui esta maré.", en: "Loss after loss — not even evolving the hex core evolves this streak." },
      { pt: "Muita 'evolução gloriosa', e mesmo assim só regrediste no placar.", en: "Lots of 'glorious evolution,' and still you only regressed on the scoreboard." },
      { pt: "Muita 'evolução gloriosa'. E só regrediste no placar.", en: "Lots of 'glorious evolution.' And you only regressed on the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a evoluir habilidades e nem uma vitória evoluída.", en: "So many games evolving abilities and not one evolved win." },
      { pt: "0 vitórias — muito Death Ray, nenhum resultado.", en: "0 wins — lots of Death Ray, no results." },
      { pt: "Habilidades evoluídas: muitas. Vitórias evoluídas: nenhuma.", en: "Abilities evolved: many. Evolved wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar o campo de gravidade e o laser todo a seguir.", en: "First time? You'll miss the gravity field and the whole laser after it." },
      { pt: "Estreia no Viktor. Sem acertar o combo Q-E, a evolução gloriosa é uma piada.", en: "Viktor debut. Without landing the Q-E combo, the glorious evolution is a joke." },
      { pt: "Tutorial do Viktor, passo 1: combo Q-E. Sem ele, a evolução gloriosa é uma piada.", en: "Viktor tutorial, step 1: the Q-E combo. Without it, the glorious evolution is a joke." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a poça de sangue te tira desta maré.", en: "Loss after loss — not even the sanguine pool frees you from this streak." },
      { pt: "Muito sangue drenado, e mesmo assim secaste no placar.", en: "Lots of blood drained, and still you dried up on the scoreboard." },
      { pt: "Muito sangue drenado. E mesmo assim secaste no placar.", en: "Lots of blood drained. And still you dried up on the scoreboard." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a drenar vida e nem uma vitória sangrada.", en: "So many games draining health and not one bled-out win." },
      { pt: "0 vitórias — muito Hemoplague, nenhum resultado.", en: "0 wins — lots of Hemoplague, no results." },
      { pt: "Vida drenada: muita. Vitórias sangradas: nenhuma.", en: "Health drained: lots. Bled-out wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mergulhar na poça no momento errado e sair sem nada feito.", en: "First time? You'll pool at the wrong moment and come out having done nothing." },
      { pt: "Estreia no Vladimir. O early sem sustain é doloroso — vais sofrer.", en: "Vladimir debut. The early game with no sustain hurts — you'll suffer." },
      { pt: "⚠️ Vladimir novo. Aviso: o early sem sustain é doloroso. Vais sofrer.", en: "⚠️ New Vladimir. Warning: the early game with no sustain hurts. You'll suffer." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o deus do trovão troveja esta maré.", en: "Loss after loss — not even the thunder god thunders through this streak." },
      { pt: "Muito relâmpago, e mesmo assim só te fulminaste a ti.", en: "Lots of lightning, and still you only zapped yourself." },
      { pt: "Muito relâmpago. E só te fulminaste a ti.", en: "Lots of lightning. And you only zapped yourself." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar torres e a morder e nem uma vitória.", en: "So many games leaping towers and biting and not one win." },
      { pt: "0 vitórias — muito trovão, nenhum resultado.", en: "0 wins — lots of thunder, no results." },
      { pt: "Torres saltadas: muitas. Vitórias: nenhuma.", en: "Towers leapt: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult a saltar para longe de onde era preciso.", en: "First time? You'll ult-leap far from where it mattered." },
      { pt: "Estreia no Volibear. Sem o E imparável na hora certa, comes o CC todo.", en: "Volibear debut. Without the unstoppable E on time, you eat all the CC." },
      { pt: "⚠️ Volibear novo. Aviso: sem o E imparável na hora certa, comes o CC todo.", en: "⚠️ New Volibear. Warning: without the unstoppable E on time, you eat all the CC." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem farejar sangue caça esta maré.", en: "Loss after loss — not even sensing blood hunts this streak." },
      { pt: "Muito faro, e a única presa fraca foste tu.", en: "Lots of scenting, and the only weak prey was you." },
      { pt: "Horóscopo: muito faro, e a única presa fraca foste tu.", en: "Horoscope: lots of scenting, and the only weak prey was you." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a caçar feridos e nem uma vitória abatida.", en: "So many games hunting the wounded and not one takedown win." },
      { pt: "0 vitórias — muito Infinite Duress, nenhum resultado.", en: "0 wins — lots of Infinite Duress, no results." },
      { pt: "Feridos caçados: muitos. Vitórias abatidas: nenhuma.", en: "Wounded hunted: many. Takedown wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult e ser interrompido a meio do salto.", en: "First time? You'll ult and get interrupted mid-leap." },
      { pt: "Estreia no Warwick. Sem alvos com pouca vida, o teu faro não vale nada.", en: "Warwick debut. Without low-health targets, your scent is worthless." },
      { pt: "⚠️ Warwick novo. Aviso: sem alvos com pouca vida, o teu faro não vale nada.", en: "⚠️ New Warwick. Warning: without low-health targets, your scent is worthless." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem chamar as penas de volta prende esta maré.", en: "Loss after loss — not even recalling the feathers roots this streak." },
      { pt: "Muitas penas espalhadas, e nenhuma amarrou a vitória.", en: "Lots of feathers scattered, and not one tied down victory." },
      { pt: "Muitas penas espalhadas. E nenhuma amarrou a vitória.", en: "Lots of feathers scattered. And not one tied down victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a espalhar penas e nem uma vitória enraizada.", en: "So many games scattering feathers and not one rooted win." },
      { pt: "0 vitórias — muito Bladecaller, nenhum resultado.", en: "0 wins — lots of Bladecaller, no results." },
      { pt: "Penas espalhadas: muitas. Vitórias enraizadas: nenhuma.", en: "Feathers scattered: many. Rooted wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais chamar as penas sem alinhar nenhuma e não prender ninguém.", en: "First time? You'll recall the feathers with none aligned and root no one." },
      { pt: "Estreia na Xayah. Sem preparar as penas, o E não faz root nem dano.", en: "Xayah debut. Without setting up feathers, the E roots nothing and does nothing." },
      { pt: "⚠️ Xayah nova. Aviso: sem preparar as penas, o E não faz root nem dano.", en: "⚠️ New Xayah. Warning: without setting up feathers, the E roots nothing and does nothing." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o alcance infinito alcança a vitória.", en: "Loss after loss — not even infinite range reaches victory." },
      { pt: "Muito bombardeamento, e mesmo assim nenhum acertou na derrota.", en: "Lots of bombardment, and still none of it hit the loss." },
      { pt: "Muito bombardeamento. E nenhum acertou na derrota.", en: "Lots of bombardment. And none of it hit the loss." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a bombardear de longe e nem uma vitória.", en: "So many games bombarding from afar and not one win." },
      { pt: "0 vitórias — muito Rite of the Arcane, nenhum resultado.", en: "0 wins — lots of Rite of the Arcane, no results." },
      { pt: "Bombardeamentos: muitos. Vitórias: nenhuma.", en: "Bombardments: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar todos os skillshots e ficar sem defesa nenhuma.", en: "First time? You'll miss every skillshot and be left with no defense." },
      { pt: "Estreia no Xerath. Muito alcance, zero mobilidade — se te alcançam, morres.", en: "Xerath debut. Lots of range, zero mobility — get reached and you die." },
      { pt: "⚠️ Xerath novo. Aviso: muito alcance, zero mobilidade. Se te alcançam, morres.", en: "⚠️ New Xerath. Warning: lots of range, zero mobility. Get reached and you die." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem os três golpes empurram esta maré.", en: "Loss after loss — not even the three-talon strike shoves this streak." },
      { pt: "Muita carga audaz, e mesmo assim só carregaste para a derrota.", en: "Lots of audacious charging, and still you only charged into defeat." },
      { pt: "Muita carga audaz. E só carregaste para a derrota.", en: "Lots of audacious charging. And you only charged into defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a marcar alvos e a empurrar e nem uma vitória.", en: "So many games marking targets and knocking up and not one win." },
      { pt: "0 vitórias — muito challenge, nenhum resultado.", en: "0 wins — lots of challenge, no results." },
      { pt: "Alvos marcados e empurrados: muitos. Vitórias: nenhuma.", en: "Targets marked and knocked up: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais dar o ult a empurrar toda a gente para longe de ti.", en: "First time? You'll ult and knock everyone away from you." },
      { pt: "Estreia no XinZhao. Sem os três toques do passivo, o teu knockup nunca sai.", en: "XinZhao debut. Without the three-hit passive, your knockup never comes out." },
      { pt: "⚠️ XinZhao novo. Aviso: sem os três toques do passivo, o teu knockup nunca sai.", en: "⚠️ New XinZhao. Warning: without the three-hit passive, your knockup never comes out." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — o clássico 0/10 powerspike a caminho.", en: "Loss after loss — the classic 0/10 power spike incoming." },
      { pt: "Nem a windwall bloqueia esta enxurrada de derrotas.", en: "Not even the windwall blocks this flood of losses." },
      { pt: "Última hora: o clássico 0/10 powerspike a caminho.", en: "Breaking news: the classic 0/10 power spike incoming." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas, 0 vitórias — o verdadeiro imperdoável és tu com este histórico.", en: "So many games, 0 wins — the real Unforgiven is you with this record." },
      { pt: "0/x outra vez? O Yasuo agradece a companhia na tabela.", en: "0/x again? Yasuo appreciates the company at the bottom of the scoreboard." },
      { pt: "🏆 Conquista: 'O Verdadeiro Imperdoável És Tu'.", en: "🏆 Achievement: 'The Real Unforgiven Is You'." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais fazer 0/10 e culpar os colegas. Tradição.", en: "First time? You'll go 0/10 and blame your teammates. Tradition." },
      { pt: "Estreia no Yasuo. A hasagi é linda até morreres a meio dela.", en: "Yasuo debut. The hasagi looks great until you die halfway through it." },
      { pt: "⚠️ Yasuo novo. Aviso: vais fazer 0/10 e culpar os colegas. Tradição.", en: "⚠️ New Yasuo. Warning: you'll go 0/10 and blame your teammates. Tradition." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a forma espiritual regressa a uma vitória.", en: "Loss after loss — not even the spirit form returns to a win." },
      { pt: "Duas lâminas e mesmo assim não cortaste uma única derrota.", en: "Two blades and still you didn't cut a single loss." },
      { pt: "Duas lâminas. E não cortaste uma única derrota.", en: "Two blades. And you didn't cut a single loss." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a alternar entre as duas lâminas e nem uma vitória.", en: "So many games swapping between the two blades and not one win." },
      { pt: "0 vitórias — muito combo, nenhum resultado.", en: "0 wins — lots of combo, no results." },
      { pt: "Alternâncias entre lâminas: muitas. Vitórias: nenhuma.", en: "Blade swaps: many. Wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais mandar a forma espiritual para longe e regressar ao meio deles.", en: "First time? You'll send the spirit form too far and snap back into them." },
      { pt: "Estreia no Yone. Sem timing no E, voltas sempre para o pior sítio.", en: "Yone debut. Without timing on the E, you always return to the worst spot." },
      { pt: "⚠️ Yone novo. Aviso: sem timing no E, voltas sempre para o pior sítio.", en: "⚠️ New Yone. Warning: without timing on the E, you always return to the worst spot." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem o exército de mortos-vivos revive esta maré.", en: "Loss after loss — not even the undead army revives this streak." },
      { pt: "Muito ghoul, e mesmo assim nem eles quiseram lutar por isto.", en: "Lots of ghouls, and even they didn't want to fight for this." },
      { pt: "Última hora: exército de mortos-vivos recusa lutar por isto.", en: "Breaking news: undead army refuses to fight for this." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a invocar ghouls e nem uma vitória pastoreada.", en: "So many games summoning ghouls and not one shepherded win." },
      { pt: "0 vitórias — muita Maiden, nenhum resultado.", en: "0 wins — lots of Maiden, no results." },
      { pt: "Ghouls invocados: muitos. Vitórias pastoreadas: nenhuma.", en: "Ghouls summoned: many. Shepherded wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais prender-te a ti dentro da própria parede.", en: "First time? You'll cage yourself inside your own wall." },
      { pt: "Estreia no Yorick. Sem gerir os ghouls e a Maiden, és só um coveiro triste.", en: "Yorick debut. Without managing the ghouls and Maiden, you're just a sad gravedigger." },
      { pt: "Tutorial do Yorick, passo 1: prender o inimigo na parede. Prendeste-te a ti.", en: "Yorick tutorial, step 1: wall in the enemy. You walled in yourself." },
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
    lossStreak: [
      { pt: "Colada a alguém e mesmo assim a perder tudo — impressionante.", en: "Attached to someone and still losing everything — impressive." },
      { pt: "Nem sequer jogas a sério e ainda arranjas maneira de perder seguidas.", en: "You don't even fully play and you still manage to lose over and over." },
      { pt: "Colada a alguém e mesmo assim a perder tudo. Impressionante.", en: "Attached to someone and still losing everything. Impressive." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas agarrada a aliados e nem uma vitória de borla.", en: "So many games clinging to allies and not one free win." },
      { pt: "0 vitórias mesmo sem precisares de mira. Como?", en: "0 wins even without needing to aim. How?" },
      { pt: "Aliados agarrados: muitos. Vitórias de borla: nenhuma.", en: "Allies clung to: many. Free wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Colas-te, largas o rato, e vês a derrota em direto.", en: "First time? Attach, drop the mouse, and watch the loss live." },
      { pt: "Estreia na gata. O jogo quase se joga sozinho — quase.", en: "Kitty debut. The game almost plays itself — almost." },
      { pt: "Tutorial da Yuumi, passo 1: colar-te. Passo 2: largar o rato. Passo 3: ver a derrota.", en: "Yuumi tutorial, step 1: attach. Step 2: drop the mouse. Step 3: watch the loss." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem dividir-te em blobs junta uma vitória.", en: "Loss after loss — not even splitting into blobs adds up to a win." },
      { pt: "Esticaste-te para todo o lado menos para a vitória.", en: "You stretched everywhere except toward victory." },
      { pt: "Esticaste-te para todo o lado. Menos para a vitória.", en: "You stretched everywhere. Except toward victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar com a fisga e nem uma vitória colada.", en: "So many games slingshotting in and not one win stuck together." },
      { pt: "0 vitórias — muito blob, nenhum resultado.", en: "0 wins — lots of blob, no results." },
      { pt: "Fisgadas para dentro: muitas. Vitórias coladas: nenhuma.", en: "Slingshots in: many. Wins stuck together: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar a fisga e cair no meio deles sem escapatória.", en: "First time? You'll miss the slingshot and land among them with no escape." },
      { pt: "Estreia no Zac. Sem apanhar os blobs de volta, não te curas de nada.", en: "Zac debut. Without picking the blobs back up, you heal from nothing." },
      { pt: "⚠️ Zac novo. Aviso: sem apanhar os blobs de volta, não te curas de nada.", en: "⚠️ New Zac. Warning: without picking the blobs back up, you heal from nothing." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as sombras escondem esta maré.", en: "Loss after loss — not even the shadows hide this streak." },
      { pt: "Muito desprezo pelos fracos, e o mais fraco no placar és tu.", en: "Lots of contempt for the weak, and the weakest on the scoreboard is you." },
      { pt: "Muito desprezo pelos fracos. E o mais fraco no placar és tu.", en: "Lots of contempt for the weak. And the weakest on the scoreboard is you." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a marcar com a morte e nem uma vitória executada.", en: "So many games marking death and not one executed win." },
      { pt: "0 vitórias — muita sombra, nenhum resultado.", en: "0 wins — lots of shadow, no results." },
      { pt: "Marcas de morte: muitas. Vitórias executadas: nenhuma.", en: "Death marks: many. Executed wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais trocar de sombra para o sítio errado e morrer no meio.", en: "First time? You'll swap to the wrong shadow and die in the middle." },
      { pt: "Estreia no Zed. Sem gerir as sombras e a energia, o combo desmonta-se.", en: "Zed debut. Without managing the shadows and energy, the combo falls apart." },
      { pt: "⚠️ Zed novo. Aviso: sem gerir as sombras e a energia, o combo desmonta-se.", en: "⚠️ New Zed. Warning: without managing the shadows and energy, the combo falls apart." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as zoomies pela parede fogem desta maré.", en: "Loss after loss — not even the wall zoomies escape this streak." },
      { pt: "Muita eletricidade, e mesmo assim o curto-circuito foi teu.", en: "Lots of electricity, and the short circuit was still yours." },
      { pt: "Muita eletricidade. E o curto-circuito foi teu.", en: "Lots of electricity. And the short circuit was yours." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a saltar muros e nem uma vitória eletrizada.", en: "So many games hopping walls and not one electrified win." },
      { pt: "0 vitórias — muito overcharge, nenhum resultado.", en: "0 wins — lots of overcharge, no results." },
      { pt: "Muros saltados: muitos. Vitórias eletrizadas: nenhuma.", en: "Walls hopped: many. Electrified wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais gastar o Q a esmo e ficar sem dano nem escala.", en: "First time? You'll spray the Q randomly and end up with no damage and no scaling." },
      { pt: "Estreia na Zeri. É um kit estranho — hoje vais só andar às voltas sem acertar nada.", en: "Zeri debut. It's a weird kit — today you'll just zip around hitting nothing." },
      { pt: "⚠️ Zeri nova. Aviso: é um kit estranho. Hoje só vais andar às voltas sem acertar nada.", en: "⚠️ New Zeri. Warning: it's a weird kit. Today you'll just zip around hitting nothing." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a satchel charge explode esta maré.", en: "Loss after loss — not even the satchel charge blows up this streak." },
      { pt: "Muita bomba, e a única coisa que rebentaste foi o teu placar.", en: "Lots of bombs, and the only thing you blew up was your scoreboard." },
      { pt: "🏆 Conquista: 'A Única Coisa Que Rebentaste Foi o Placar'.", en: "🏆 Achievement: 'The Only Thing You Blew Up Was the Scoreboard'." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a atirar bombas e nem uma vitória detonada.", en: "So many games throwing bombs and not one detonated win." },
      { pt: "0 vitórias — muito Mega Inferno Bomb, nenhum resultado.", en: "0 wins — lots of Mega Inferno Bomb, no results." },
      { pt: "Bombas atiradas: muitas. Vitórias detonadas: nenhuma.", en: "Bombs thrown: many. Detonated wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais saltar com a satchel para o meio deles em vez de para longe.", en: "First time? You'll satchel-jump into them instead of away." },
      { pt: "Estreia no Ziggs. Sem acertar as bombas, o especialista em hexplosivos é só barulho.", en: "Ziggs debut. Without landing the bombs, the Hexplosives Expert is just noise." },
      { pt: "⚠️ Ziggs novo. Aviso: sem acertar as bombas, o especialista em hexplosivos é só barulho.", en: "⚠️ New Ziggs. Warning: without landing the bombs, the Hexplosives Expert is just noise." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem voltar atrás no tempo apaga esta maré.", en: "Loss after loss — not even turning back time erases this streak." },
      { pt: "Muito tempo controlado, e mesmo assim chegaste sempre atrasado à vitória.", en: "Lots of time controlled, and still you always arrived late to victory." },
      { pt: "Muito tempo controlado. E chegaste sempre atrasado à vitória.", en: "Lots of time controlled. And you always arrived late to victory." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a ressuscitar aliados e nem uma vitória para reviver.", en: "So many games reviving allies and not one win to bring back." },
      { pt: "0 vitórias — muitas bombas de tempo, nenhum resultado.", en: "0 wins — lots of time bombs, no results." },
      { pt: "Aliados ressuscitados: muitos. Vitórias para reviver: nenhuma.", en: "Allies revived: many. Wins to bring back: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais pôr o Chronoshift no aliado errado no momento errado.", en: "First time? You'll put Chronoshift on the wrong ally at the wrong time." },
      { pt: "Estreia no Zilean. Sem a dupla bomba, o teu stun nunca sai.", en: "Zilean debut. Without the double bomb, your stun never comes out." },
      { pt: "⚠️ Zilean novo. Aviso: sem a dupla bomba, o teu stun nunca sai.", en: "⚠️ New Zilean. Warning: without the double bomb, your stun never comes out." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem a bolha do sono adormece esta maré.", en: "Loss after loss — not even the Sleepy Trouble Bubble puts this streak to sleep." },
      { pt: "Muita brincadeira cósmica, e a piada foi a tua derrota.", en: "Lots of cosmic play, and the joke was your defeat." },
      { pt: "Horóscopo: muita brincadeira cósmica, e a piada foi a tua derrota.", en: "Horoscope: lots of cosmic play, and the joke was your defeat." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a roubar feitiços e nem uma vitória adormecida.", en: "So many games stealing spells and not one win put to sleep." },
      { pt: "0 vitórias — muitos sparkles, nenhum resultado.", en: "0 wins — lots of sparkles, no results." },
      { pt: "Feitiços roubados: muitos. Vitórias adormecidas: nenhuma.", en: "Spells stolen: many. Wins put to sleep: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais falhar a bolha do sono e ficar sem o único setup.", en: "First time? You'll miss the sleep bubble and lose your only setup." },
      { pt: "Estreia na Zoe. Sem acertar o E de longe, o burst gigante nunca acontece.", en: "Zoe debut. Without landing the E from range, the giant burst never happens." },
      { pt: "⚠️ Zoe nova. Aviso: sem acertar o E de longe, o burst gigante nunca acontece.", en: "⚠️ New Zoe. Warning: without landing the E from range, the giant burst never happens." },
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
    lossStreak: [
      { pt: "Derrota atrás de derrota — nem as plantas florescem numa vitória.", en: "Loss after loss — not even the plants bloom into a win." },
      { pt: "Muita semente plantada, e só cresceram derrotas.", en: "Lots of seeds planted, and only losses grew." },
      { pt: "Horóscopo: muita semente plantada, e só cresceram derrotas.", en: "Horoscope: lots of seeds planted, and only losses grew." },
    ],
    zeroWinsManyGames: [
      { pt: "Tantas partidas a plantar e a prender e nem uma vitória florida.", en: "So many games planting and snaring and not one blossomed win." },
      { pt: "0 vitórias — muitos espinhos, nenhum resultado.", en: "0 wins — lots of thorns, no results." },
      { pt: "Plantas ativadas: muitas. Vitórias floridas: nenhuma.", en: "Plants activated: many. Blossomed wins: none." },
    ],
    firstEverPlay: [
      { pt: "Primeira vez? Vais plantar sementes onde nenhuma habilidade as ativa.", en: "First time? You'll plant seeds where no ability activates them." },
      { pt: "Estreia na Zyra. Sem plantas ativadas, o teu dano é o de um arbusto.", en: "Zyra debut. Without activated plants, your damage is that of a shrub." },
      { pt: "⚠️ Zyra nova. Aviso: sem plantas ativadas, o teu dano é o de um arbusto.", en: "⚠️ New Zyra. Warning: without activated plants, your damage is that of a shrub." },
    ],
  },
};

// ================= BANCO GENÉRICO POR SITUAÇÃO =================
// Frases transversais (servem qualquer campeão) para cada situação especial
// detetada por detectRoastSituation. São o fallback quando o campeão não tem
// a chave dessa situação (ver ROASTS[champ][situação] e getRoast).
// Cada situação tem várias variantes, escolhidas ao calhas. Ver a regra sobre
// não cravar números no comentário do topo do ficheiro.
export const SITUATIONS = {
  // Perdeu as últimas partidas seguidas (maré global, não deste campeão só).
  lossStreak: [
    { pt: "As últimas partidas foram todas derrotas. A esta altura já é uma tradição.", en: "Your last few games were all losses. At this point it's a tradition." },
    { pt: "Em queda livre. Este campeão é a boia de salvação ou mais um afogado?", en: "In free fall. Is this champion the lifeboat, or just another one drowning?" },
    { pt: "Maré de derrotas a sério. Talvez o problema não sejam os campeões.", en: "A real losing streak. Maybe the champions aren't the problem." },
    { pt: "ERRO: vitória não encontrada. A tentar de novo... a tentar de novo... a tentar de novo.", en: "ERROR: win not found. Retrying... retrying... retrying." },
    { pt: "Horóscopo de hoje: as estrelas alinharam-se. Contra ti.", en: "Today's horoscope: the stars have aligned. Against you." },
    { pt: "Serviço público: podes desligar a qualquer momento. Ninguém te obriga a este sofrimento.", en: "Public service announcement: you can log off anytime. Nobody's forcing this suffering on you." },
    { pt: "O teu histórico recente, resumido: derrota, derrota e — surpresa — derrota.", en: "Your recent history, in short: loss, loss and — surprise — loss." },
  ],
  // Ganhou as últimas partidas seguidas — aviso simpático para não estragar.
  winStreak: [
    { pt: "Em maré de vitórias. Só falta não estragares tudo agora.", en: "On a win streak. Just don't ruin it now." },
    { pt: "Estás quente. A Arena adora ver esse momento antes da queda.", en: "You're on fire. The Arena loves watching that moment right before the fall." },
    { pt: "Várias vitórias seguidas — cuidado que a confiança é o primeiro passo para a derrota.", en: "Several wins in a row — careful, confidence is the first step toward a loss." },
    { pt: "⚠️ AVISO: confiança a subir. Perigo iminente.", en: "⚠️ WARNING: confidence rising. Danger imminent." },
    { pt: "Estás a ganhar. Guarda este momento. Emoldura-o. Não vai durar.", en: "You're winning. Save this moment. Frame it. It won't last." },
    { pt: "Análise: em forma. Recomendação: desiste enquanto estás à frente.", en: "Analysis: in form. Recommendation: quit while you're ahead." },
  ],
  // Muitas partidas com este campeão e ainda 0 vitórias — teimosia premiada com nada.
  zeroWinsManyGames: [
    { pt: "Tantas partidas com este campeão e ainda 0 vitórias. A persistência é admirável, os resultados nem por isso.", en: "So many games with this champion and still 0 wins. The persistence is admirable, the results less so." },
    { pt: "Insistir no mesmo campeão sem uma única vitória é quase arte performativa.", en: "Insisting on the same champion without a single win is almost performance art." },
    { pt: "0 vitórias depois de tantas tentativas. Já pensaste que talvez não seja bem o campeão?", en: "0 wins after this many tries. Ever considered it might not be the champion?" },
    { pt: "A ciência é clara: repetir o mesmo à espera de resultados diferentes tem um nome.", en: "The science is clear: repeating the same thing expecting different results has a name." },
    { pt: "Erro recorrente detetado. Sugestão do sistema: talvez sejas tu.", en: "Recurring error detected. System suggestion: it might be you." },
    { pt: "🏆 Conquista rara: tanta dedicação, tão pouca recompensa.", en: "🏆 Rare achievement: so much dedication, so little reward." },
  ],
  // Nunca jogou este campeão — tom diferente, quase encorajador (com espinho).
  firstEverPlay: [
    { pt: "Primeira vez com este campeão. Toda a gente começa mal, tu só tens mais desculpa.", en: "First time with this champion. Everyone starts badly, you just have more of an excuse." },
    { pt: "Estreia! Não sabes os combos, não sabes os limites — a Arena vai ensinar-te à força.", en: "Debut! You don't know the combos, you don't know the limits — the Arena will teach you the hard way." },
    { pt: "Campeão novo em folha. Vamos ver se é amor à primeira ronda ou desastre anunciado.", en: "A brand-new champion. Let's see if it's love at first round or a disaster in the making." },
    { pt: "A carregar tutorial... a carregar desculpas... pronto, já podes perder.", en: "Loading tutorial... loading excuses... done, you may now lose." },
    { pt: "Todos os grandes começaram por aqui. Tu também começas. O 'grande' logo se vê.", en: "Every legend started here. You're starting too. The 'legend' part remains to be seen." },
    { pt: "⚠️ Campeão novo detetado. Expectativas: baixas. Muito baixas.", en: "⚠️ New champion detected. Expectations: low. Very low." },
  ],
  // Já vai em muitas partidas hoje — hora de respirar.
  marathon: [
    { pt: "Já vais em muitas partidas hoje. A Arena não foge, mas o teu pulso talvez.", en: "That's a lot of games today. The Arena isn't going anywhere, but your wrist might." },
    { pt: "Maratona de Arena. Isto já não é diversão, é compromisso.", en: "Arena marathon. This isn't fun anymore, it's a commitment." },
    { pt: "Mais uma? A sério? Bebe água e considera o mundo lá fora.", en: "Another one? Really? Drink some water and consider the world outside." },
    { pt: "Lembrete de saúde: as tuas mãos acabaram de redigir uma carta de demissão.", en: "Health reminder: your hands just drafted a resignation letter." },
    { pt: "Partidas hoje: demasiadas. Vitórias hoje: deixa lá.", en: "Games today: too many. Wins today: let's not go there." },
    { pt: "A cadeira já ganhou a forma do teu desespero.", en: "The chair has taken the shape of your despair." },
  ],
  // A jogar de madrugada.
  lateNight: [
    { pt: "Arena a esta hora da madrugada. Amanhã há coisas para fazer, mas isso é problema do teu 'eu' de amanhã.", en: "Arena at this hour of the night. There's stuff to do tomorrow, but that's future-you's problem." },
    { pt: "De madrugada, os reflexos são piores e as decisões também. Boa sorte.", en: "Late at night, the reflexes are worse and so are the decisions. Good luck." },
    { pt: "A esta hora só há corujas e jogadores em negação. Bem-vindo ao clube.", en: "At this hour it's just night owls and players in denial. Welcome to the club." },
    { pt: "São horas de dormir. Tu sabes disso. E mesmo assim, aqui estamos.", en: "It's bedtime. You know it. And yet, here we are." },
    { pt: "Uma partida à uma da manhã transforma-se sempre em 'só mais uma'. Sempre.", en: "One game at 1am always turns into 'just one more.' Always." },
    { pt: "Só corujas e maus perdedores a esta hora. E tu não tens penas.", en: "Only owls and sore losers at this hour. And you have no feathers." },
  ],
};

// Escolhe uma frase ao calhas de um banco de variantes, já no idioma pedido
// (fallback para pt se faltar a tradução).
function pickFrom(bank, lang) {
  const entry = bank[Math.floor(Math.random() * bank.length)];
  return entry[lang] ?? entry.pt;
}

// De vez em quando, mesmo que o campeão tenha frase própria, usa antes a
// genérica (GENERIC / SITUATIONS) — quebra a monotonia de ouvir sempre as
// mesmas piadas específicas e mantém as gerais em rotação. Probabilidade de
// escolher a genérica quando ambos os bancos existem.
export const GENERIC_ROAST_CHANCE = 0.2;

// Escolhe entre o banco específico do campeão e o genérico: por norma o
// específico, mas com probabilidade GENERIC_ROAST_CHANCE o genérico — e isto só
// quando ambos existem. Se só um existir, é esse (ex: winStreak/marathon/
// lateNight, que nenhum campeão personaliza, saem sempre do genérico; um
// campeão sem esse nível/situação também cai no genérico).
function chooseBank(specific, generic) {
  const hasSpecific = specific?.length > 0;
  const hasGeneric = generic?.length > 0;
  if (hasSpecific && hasGeneric) {
    return Math.random() < GENERIC_ROAST_CHANCE ? generic : specific;
  }
  return hasSpecific ? specific : generic;
}

// Escolhe a frase do banner. Se houver uma "situation" ativa (ver
// detectRoastSituation), ela manda: banco do campeão para essa situação ou o
// genérico SITUATIONS. Sem situação, cai no nível por nº de vitórias (0 / 1-2 /
// 3+), banco do campeão ou GENERIC. Em qualquer dos casos, de vez em quando sai
// a genérica mesmo tendo o campeão a sua (ver chooseBank / GENERIC_ROAST_CHANCE).
export function getRoast(championId, winCount, lang = "pt", situation = null) {
  if (situation) {
    const bank = chooseBank(ROASTS[championId]?.[situation], SITUATIONS[situation]);
    if (bank?.length) return pickFrom(bank, lang);
  }

  const tier = winCount === 0 ? "zero" : winCount <= 2 ? "few" : "many";
  const bank = chooseBank(ROASTS[championId]?.[tier], GENERIC[tier]);
  return pickFrom(bank, lang);
}

// ================= DETEÇÃO DA SITUAÇÃO =================
// A partir do histórico de partidas (o mesmo array "matches" que o hook já
// tem em memória — ver useLiveGame.js), decide se esta partida cai numa
// situação especial. Devolve a chave da situação (ver SITUATIONS) ou null.
//
// A ordem importa: só se devolve UMA situação, por isso as mais específicas do
// campeão (estreia, teimosia sem vitórias) vêm antes das de forma global
// (marés) e das de contexto (maratona, madrugada). "matches" chega ordenado do
// mais recente para o mais antigo (ver getMatches em db/matches.js).
export function detectRoastSituation(championId, { matches = [], champions = [], now = new Date() } = {}) {
  const norm = (m) => normalizeChampionId(m.champion, champions);
  const champGames = matches.filter((m) => norm(m) === championId);
  const champWins = champGames.filter((m) => m.win).length;

  // 1. Estreia absoluta — nunca jogou este campeão.
  if (champGames.length === 0) return "firstEverPlay";

  // 2. Muitas partidas com o campeão e ainda 0 vitórias.
  if (champWins === 0 && champGames.length >= 6) return "zeroWinsManyGames";

  // 3/4. Maré global (últimas partidas seguidas), precisa de pelo menos 3 para
  // não chamar "maré" a uma amostra minúscula.
  const recent = matches.slice(0, 3);
  if (recent.length >= 3) {
    if (recent.every((m) => !m.win)) return "lossStreak";
    if (recent.every((m) => m.win)) return "winStreak";
  }

  // 5. Maratona — muitas partidas já hoje (a atual ainda não está em matches).
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayCount = matches.filter((m) => m.created_at && new Date(m.created_at) >= startOfDay).length;
  if (todayCount >= 6) return "marathon";

  // 6. Madrugada (02h–05h locais).
  const hour = now.getHours();
  if (hour >= 2 && hour < 5) return "lateNight";

  return null;
}
