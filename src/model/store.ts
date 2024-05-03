import { useBackdrop } from 'src/composables/useBackdrop';
import { useGame } from 'src/composables/useGame';
import { usePanZoom } from 'src/composables/usePanZoom';
import { useSVGView } from 'src/composables/useSVGView';
import { ref } from 'vue';


const radius = ref(4);
const game = useGame(radius);

const svg = useSVGView(() => game.struct.value.const.H);
const pz = usePanZoom(radius, svg);
const bd = useBackdrop(radius, svg);

const input = ref({
  vals: new Array(game.struct.value.cells.length),
  ind: 0,
});

export function useStore() {
  return {
    game,
    svg,
    pz,
    bd,
    input,
    models: { R: radius },
  };
}
