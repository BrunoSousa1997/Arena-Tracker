// Conteúdo do "Como funciona" (ver components/HowItWorks.jsx).
//
// Vive aqui e não no i18n.js porque são textos longos e em blocos — meter
// trinta chaves de parágrafo no dicionário geral tornava-o ilegível para o
// resto da app, que é quase todo etiquetas de uma linha. Cada secção traz o
// seu próprio par pt/en.
//
// Regra ao escrever isto: descrever o que a app FAZ, não o que seria bom que
// fizesse. Se uma funcionalidade mudar, este ficheiro muda com ela — um
// tutorial errado é pior do que nenhum.

// Descrição de cada tab, numa lista à parte porque tem DOIS consumidores: a
// secção "As tabs" do guia (texto corrido, ver abaixo) e a visita guiada que
// corre depois de ligar a primeira conta (ver components/TabTour.jsx), que vai
// abrindo cada tab enquanto explica. Sendo a mesma fonte, não há hipótese de
// as duas descrições divergirem com o tempo.
//
// "key" tem de bater certo com as chaves das TABS em App.jsx — é por ela que
// a visita guiada mostra a tab certa enquanto fala dela.
export const TAB_GUIDE = [
  {
    key: "overview",
    title: { pt: "Visão Geral", en: "Overview" },
    text: {
      pt: "O resumo de tudo: a tua forma recente, as sessões de jogo agrupadas por sentada, um calendário de atividade, com quem costumas jogar e os teus destaques (melhor campeão, mais kills numa partida, e por aí).",
      en: "The summary of everything: your recent form, play sessions grouped per sitting, an activity calendar, who you usually play with, and your highlights (best champion, most kills in a match, and so on).",
    },
  },
  {
    key: "ingame",
    title: { pt: "Em Jogo", en: "In Game" },
    text: {
      pt: "Esta não vive na barra de tabs: aparece como botão ao lado do Sincronizar e só enquanto estás mesmo numa partida. Mostra o campeão, o KDA, a build que já tens e, se estiveres num desafio, os pontos já feitos. Ao lado, os augments e os itens que costumam correr melhor com esse campeão — e, dos recomendados, quais é que ainda te faltam comprar. Acabada a partida, o botão desaparece e voltas à tab onde estavas.",
      en: "This one does not live in the tab bar: it shows up as a button next to Sync, and only while you are actually in a match. It shows the champion, the KDA, the build you have so far and, if you are in a challenge, the points already scored. Alongside it, the augments and items that tend to do best on that champion — and which of the recommended ones you still have to buy. When the match ends the button disappears and you go back to the tab you were on.",
    },
  },
  {
    key: "wins",
    title: { pt: "Coleção", en: "Collection" },
    text: {
      pt: "Todos os campeões do jogo, com os que já ganhaste marcados. É o progresso do roster — quantos te faltam para ganhar com toda a gente. Dá para filtrar só os que faltam.",
      en: "Every champion in the game, with the ones you have won with marked. Your roster progress — how many are left to win with everyone. You can filter to just the missing ones.",
    },
  },
  {
    key: "history",
    title: { pt: "Histórico", en: "History" },
    text: {
      pt: "Partida a partida, da mais recente para trás: lugar, KDA, build, augments e a lista completa de colegas e adversários com as estatísticas de cada um.",
      en: "Match by match, newest first: placement, KDA, build, augments, and the full list of teammates and opponents with each one's stats.",
    },
  },
  {
    key: "stats",
    title: { pt: "Estatísticas", en: "Stats" },
    text: {
      pt: "Os teus números por campeão, ordenáveis por lugar médio, KDA, dano e mais. O filtro de build é o mais útil: escolhes um augment ou item e tudo passa a ser calculado só sobre as partidas em que o levaste.",
      en: "Your numbers per champion, sortable by average placement, KDA, damage and more. The build filter is the useful part: pick an augment or item and everything is recalculated over just the matches where you had it.",
    },
  },
  {
    key: "augments",
    title: { pt: "Augments", en: "Augments" },
    text: {
      pt: "A taxa de vitória e de pódio de cada augment, comparada com a tua média — a coluna do desvio diz-te quais te correm mesmo bem. Podes ver só as tuas escolhas ou as de todos os jogadores das tuas partidas, que é uma amostra muito maior.",
      en: "Win and podium rate for each augment against your own average — the delta column tells you which ones actually work for you. You can look at just your picks or at everyone's across your matches, a far bigger sample.",
    },
  },
  {
    key: "achievements",
    title: { pt: "Conquistas", en: "Achievements" },
    text: {
      pt: "Objetivos que vão subindo à medida que jogas. Quando um sobe aparece um aviso no canto, e a campainha no cabeçalho guarda o histórico.",
      en: "Goals that climb as you play. When one moves a notice pops up in the corner, and the bell in the header keeps the history.",
    },
  },
  {
    key: "compare",
    title: { pt: "Comparar", en: "Compare" },
    text: {
      pt: "A tua conta lado a lado com a de outro jogador. Se essa pessoa já jogou contigo, a app pode usar os dados que já tem em vez de pedir tudo de novo à Riot.",
      en: "Your account side by side with another player's. If that person has played with you, the app can use the data it already has instead of asking Riot all over again.",
    },
  },
  {
    key: "challenges",
    title: { pt: "Desafios", en: "Challenges" },
    text: {
      pt: "Competições entre amigos ao longo de várias partidas. Crias uma sala, convidas gente, e cada um joga a Arena normalmente — a pontuação vai somando ao vivo, com handicap por classe de campeão.",
      en: "Competitions between friends over several matches. You create a room, invite people, and everyone plays Arena as usual — the score adds up live, with a per-class handicap.",
    },
  },
];

// A secção "As tabs" do guia é gerada a partir de TAB_GUIDE, para não existir
// uma segunda cópia destas descrições a envelhecer em paralelo.
function tabsSectionBody(lang) {
  return TAB_GUIDE.map((tb) => `${tb.title[lang]} — ${tb.text[lang]}`);
}

export const HOW_IT_WORKS_SECTIONS = [
  {
    id: "start",
    icon: "rocket",
    title: { pt: "Por onde começar", en: "Where to start" },
    body: {
      pt: [
        "Primeiro liga uma conta: Definições → Contas, com o teu Riot ID completo (o nome e a tag, ex: Nome#EUW). Sem a tag a app não consegue encontrar-te na Riot.",
        "Depois carrega em Sincronizar. A primeira vez traz o teu histórico de Arena todo e pode demorar uns minutos — a Riot só deixa pedir uma partida de cada vez, a um ritmo certo. As seguintes são rápidas, porque só vão buscar o que falta.",
        "Podes ter várias contas e trocar entre elas a qualquer momento. Cada uma tem o seu histórico, a sua coleção e as suas conquistas, sem se misturarem.",
      ],
      en: [
        "First connect an account: Settings → Accounts, with your full Riot ID (name and tag, e.g. Name#EUW). Without the tag the app cannot find you on Riot's side.",
        "Then hit Sync. The first run pulls your whole Arena history and can take a few minutes — Riot only allows one match at a time, at a fixed pace. Later runs are quick, because they only fetch what is missing.",
        "You can have several accounts and switch between them at any time. Each keeps its own history, collection and achievements, never mixed together.",
      ],
    },
  },
  {
    id: "sync",
    icon: "sync",
    title: { pt: "Sincronizar", en: "Syncing" },
    body: {
      pt: [
        "Sincronizar vai à Riot buscar as partidas de Arena que ainda não tens e grava-as. Só pede as novas, por isso é barato repetir.",
        "Há um atalho que poupa tempo a toda a gente: uma partida de Arena tem 16 ou 18 jogadores reais, por isso se um amigo que também usa a app já sincronizou uma partida em que jogaram juntos, os dados dele servem para ti e a app reaproveita-os em vez de voltar a pedir à Riot.",
        "Em Definições → Sincronização fica o relatório da última sincronização: quantas partidas a Riot devolveu, quantas já conhecias, quantas entraram. Se alguma vez parecer que faltam jogos, é aí que se vê em que passo é que se perderam.",
      ],
      en: [
        "Sync fetches the Arena matches you do not have yet and saves them. It only asks for new ones, so repeating it is cheap.",
        "There is a shortcut that saves everyone time: an Arena match has 16 or 18 real players, so if a friend who also uses the app already synced a match you played together, their data works for you and the app reuses it instead of asking Riot again.",
        "Settings → Sync holds the last sync report: how many matches Riot returned, how many you already knew, how many were saved. If games ever seem to be missing, that is where you see at which step they were lost.",
      ],
    },
  },
  {
    id: "live",
    icon: "live",
    title: { pt: "Deteção ao vivo", en: "Live detection" },
    body: {
      pt: [
        "Com a app aberta durante uma partida de Arena, aparece um aviso a dizer que campeão estás a jogar e se já tens vitória com ele. O KDA e a build vão-se atualizando de três em três segundos enquanto jogas. Podes arrastar a caixa para onde quiseres.",
        "Quando a partida acaba, a app trata de sincronizar sozinha — tenta primeiro logo a seguir e, se a partida ainda não estiver disponível na Riot, vai tentando durante um bom bocado. Ficares em 3º a 8º lugar significa que a partida ainda está a decorrer para quem sobrou, e por isso demora mais a aparecer.",
        "Isto usa só a API local e oficial da Riot para dados ao vivo (a mesma que qualquer overlay usa). É só leitura, não toca no jogo nem na memória dele.",
        "Ctrl+Shift+A traz a app para a frente já na Coleção com a pesquisa pronta, mesmo com o League em primeiro plano — serve para confirmar depressa, na seleção de campeão, se já tens vitória com algum dos que te calharam.",
      ],
      en: [
        "With the app open during an Arena match, a banner shows which champion you are playing and whether you already have a win with it. KDA and build refresh every three seconds while you play. You can drag the box anywhere.",
        "When the match ends, the app syncs on its own — it tries right away and, if the match is not on Riot's side yet, keeps trying for a good while. Placing 3rd to 8th means the match is still running for whoever is left, which is why it takes longer to show up.",
        "This only uses Riot's official local live-data API (the same one any overlay uses). Read only — it never touches the game or its memory.",
        "Ctrl+Shift+A brings the app to the front on the Collection tab with search ready, even with League in the foreground — handy during champion select to check whether you already have a win with one of your options.",
      ],
    },
  },
  {
    id: "tabs",
    icon: "tabs",
    title: { pt: "As tabs", en: "The tabs" },
    body: { pt: tabsSectionBody("pt"), en: tabsSectionBody("en") },
  },
  {
    id: "challenges",
    icon: "swords",
    title: { pt: "Desafios", en: "Challenges" },
    body: {
      pt: [
        "Um desafio é uma competição entre amigos ao longo de um número de partidas combinado. Crias uma sala, convidas gente (ou partilhas o código) e cada um joga as suas partidas de Arena normalmente.",
        "Quem recebe um convite vê-o aparecer no canto e pode aceitar logo aí, sem ir à tab.",
        "A pontuação corre ao vivo: kills, assists, dano, cura, multikills e sequências sem morrer somam pontos; mortes e sequências de mortes tiram. Há um handicap por classe de campeão, para não ser sempre o mesmo tipo de campeão a ganhar.",
        "O placar mexe-se durante a partida, não só no fim — dá para ver o adversário a pontuar em tempo real.",
      ],
      en: [
        "A challenge is a competition between friends over an agreed number of matches. You create a room, invite people (or share the code), and everyone plays their Arena matches as usual.",
        "Whoever gets an invite sees it pop up in the corner and can accept right there, without opening the tab.",
        "Scoring runs live: kills, assists, damage, healing, multikills and no-death streaks add points; deaths and death streaks take them away. There is a per-class handicap so the same kind of champion does not always win.",
        "The scoreboard moves during the match, not just at the end — you can watch an opponent scoring in real time.",
      ],
    },
  },
  {
    id: "background",
    icon: "background",
    title: { pt: "Deixar a correr em segundo plano", en: "Leaving it running in the background" },
    body: {
      pt: [
        "Em Definições → Geral podes ligar o modo em segundo plano: fechar a janela passa a escondê-la no tabuleiro do sistema em vez de fechar a app. Continua a detetar partidas e a sincronizar, sem ocupar espaço no ecrã. Clicas no ícone junto ao relógio para a trazer de volta.",
        "Com isso ligado podes também pôr a app a arrancar com o Windows, já escondida.",
        "Como o X da janela deixa de fechar, há um botão \"Sair da aplicação\" no fundo das Definições para fechar mesmo (ou pelo menu do ícone no tabuleiro).",
      ],
      en: [
        "In Settings → General you can turn on background mode: closing the window hides it in the system tray instead of quitting. It keeps detecting matches and syncing without taking up screen space. Click the icon near the clock to bring it back.",
        "With that on, you can also have the app start with Windows, already hidden.",
        "Since the window's X no longer quits, there is a \"Quit the app\" button at the bottom of Settings to close it for real (or use the tray icon's menu).",
      ],
    },
  },
  {
    id: "repair",
    icon: "wrench",
    title: { pt: "Quando algo parece errado", en: "When something looks wrong" },
    body: {
      pt: [
        "Em Definições → Sincronização há ferramentas de manutenção, e só vale a pena usá-las quando há mesmo alguma coisa fora do sítio.",
        "Completar dados — partidas antigas importadas antes de a app guardar dano, ouro ou a lista de participantes. Só preenche o que falta.",
        "Reparar vitórias — quando a Coleção não bate certo com o histórico (tens a vitória na lista de partidas mas o campeão não aparece como ganho).",
        "Reparar dados — o mais pesado. Volta a pedir à Riot todas as partidas que já tens, uma a uma, e corrige o que estiver trocado. Num histórico grande demora bastante, por isso é o último recurso, não o primeiro.",
      ],
      en: [
        "Settings → Sync holds the maintenance tools, and they are only worth using when something is genuinely out of place.",
        "Fill in data — old matches imported before the app stored damage, gold or the participant list. It only fills what is missing.",
        "Repair wins — for when the Collection disagrees with the history (the win is in your match list but the champion is not marked as won).",
        "Repair data — the heavy one. It asks Riot again for every match you already have, one by one, and fixes whatever is wrong. On a large history it takes a while, so it is the last resort, not the first.",
      ],
    },
  },
];
