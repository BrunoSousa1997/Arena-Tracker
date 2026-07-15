import Trophy from "../assets/achievements/trophy.svg?react";
import Arena from "../assets/achievements/arena.svg?react";
import Globe from "../assets/achievements/globe.svg?react";
import Flame from "../assets/achievements/flame.svg?react";
import Medal from "../assets/achievements/medal.svg?react";
import Swords from "../assets/achievements/swords.svg?react";
import Bolt from "../assets/achievements/bolt.svg?react";
import Heal from "../assets/achievements/heal.svg?react";
import Star from "../assets/achievements/star.svg?react";
import Masks from "../assets/achievements/masks.svg?react";
import Hourglass from "../assets/achievements/hourglass.svg?react";
import Bond from "../assets/achievements/bond.svg?react";
import Crown from "../assets/achievements/crown.svg?react";
import Coin from "../assets/achievements/coin.svg?react";
import Moon from "../assets/achievements/moon.svg?react";
import Target from "../assets/achievements/target.svg?react";
import Crest from "../assets/achievements/crest.svg?react";
import Locked from "../assets/achievements/locked.svg?react";
// Classes de campeão (ver as "tags" do Data Dragon, em useStaticData.js).
import Dagger from "../assets/achievements/dagger.svg?react";
import Axe from "../assets/achievements/axe.svg?react";
import Orb from "../assets/achievements/orb.svg?react";
import Bow from "../assets/achievements/bow.svg?react";
import Aid from "../assets/achievements/aid.svg?react";
import Shield from "../assets/achievements/shield.svg?react";
import Rune from "../assets/achievements/rune.svg?react";
import Podium from "../assets/achievements/podium.svg?react";
import Skull from "../assets/achievements/skull.svg?react";
import Calendar from "../assets/achievements/calendar.svg?react";

// Emblemas das conquistas — desenhados de raiz e guardados como ficheiros
// .svg em src/assets/achievements/ (um por emblema, editáveis em qualquer
// ferramenta de vetores). O estilo segue o resto da app (ar heráldico/
// fantasia, ver a Cinzel da marca e os dourados/indigo do tema): cada
// símbolo tem um corpo preenchido translúcido por baixo e um contorno por
// cima, o que lhes dá peso de emblema em vez de traço solto.
//
// "?react" (ver vite-plugin-svgr em vite.config.js) importa cada ficheiro
// como COMPONENTE React em vez de como URL — é isso que preserva o
// "currentColor" lá dentro e deixa o escalão (bronze -> diamante, ver
// ACHIEVEMENT_RANKS em lib/achievementStats.js) tingir o emblema todo. Com
// um <img src="..."> normal a cor ficaria congelada no ficheiro e seria
// preciso uma cópia do desenho por cada escalão.
//
// Este mapa vive aqui (e não em lib/achievementStats.js) porque esse
// ficheiro é lógica pura sem JSX, partilhada com a tab Comparar — guarda só
// o "iconId" e deixa o desenho para quem renderiza.
const ICONS = {
  trophy: Trophy,
  arena: Arena,
  globe: Globe,
  flame: Flame,
  medal: Medal,
  swords: Swords,
  bolt: Bolt,
  heal: Heal,
  star: Star,
  masks: Masks,
  hourglass: Hourglass,
  bond: Bond,
  crown: Crown,
  coin: Coin,
  moon: Moon,
  target: Target,
  crest: Crest,
  dagger: Dagger,
  axe: Axe,
  orb: Orb,
  bow: Bow,
  aid: Aid,
  shield: Shield,
  rune: Rune,
  podium: Podium,
  skull: Skull,
  calendar: Calendar,
};

export default function AchievementIcon({ iconId, locked = false, color, size = 18 }) {
  const Icon = locked ? Locked : ICONS[iconId];
  if (!Icon) return null;

  return (
    <Icon
      width={size}
      height={size}
      // "color" (e não "stroke"/"fill") porque todo o desenho usa
      // currentColor — assim uma única propriedade tinge corpo e contorno.
      style={{
        display: "block",
        flexShrink: 0,
        color: locked ? "var(--text-muted)" : color || "var(--text-secondary)",
      }}
      aria-hidden="true"
    />
  );
}
