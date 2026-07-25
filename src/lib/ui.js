// Constantes de UI partilhadas — o sítio único para valores visuais que se
// repetiam à mão por dezenas de componentes e divergiam entre si.

// Espessura de traço dos ícones (lucide-react). A app tinha uma mistura de
// 2.25 e 2.5 (e um 2 perdido) espalhada por ~80 chamadas, muitas vezes no
// mesmo ficheiro — o suficiente para alguns ícones lerem como "de outro
// conjunto". 2.25 é o valor de plurality, limpo a tamanhos pequenos sobre
// fundo escuro. Componentes novos devem importar isto em vez de cravar o
// número; ver ICON_STROKE nos usos.
export const ICON_STROKE = 2.25;
