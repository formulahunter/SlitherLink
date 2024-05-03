import { useBackdrop } from 'src/composables/useBackdrop';
import { useGame } from 'src/composables/useGame';
import { useSVGView } from 'src/composables/useSVGView';
import { ref } from 'vue';


const radius = ref(4);
const game = useGame(radius);

const view = useSVGView(radius);
const bd = useBackdrop(radius, view.svg);

const input = ref({
  vals: new Array(game.struct.value.cells.length),
  ind: 0,
});

export function useStore() {
  return {
    game,
    view,
    bd,
    input,
    models: { R: radius },
  };
}
