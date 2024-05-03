import { useGame } from 'src/composables/useGame';
import { useRawData } from 'src/composables/useRawData';
import { useSVGView } from 'src/composables/useSVGView';
import { ref } from 'vue';


const radius = ref(4);
const game = useGame(radius);
const view = useSVGView(radius);
const data = useRawData(() => game.struct.value.const.C);

export function useStore() {
  return {
    game,
    view,
    data,
    models: { R: radius },
  };
}
