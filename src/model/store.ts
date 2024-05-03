import { useBackdrop } from 'src/composables/useBackdrop';
import { usePanZoom } from 'src/composables/usePanZoom';
import { useSVGView } from 'src/composables/useSVGView';
import { GameStruct, initBoard } from 'src/model';
import { computed, ref } from 'vue';


const radius = ref(4);
const board = computed<GameStruct>((oldValue) => {
  if(oldValue?.R === radius.value) {
    return oldValue;
  }
  return initBoard(radius.value);
});

const svg = useSVGView(() => board.value.const.H);
const pz = usePanZoom(radius, svg);
const bd = useBackdrop(radius, svg);

export function useStore() {
  return {
    board,
    svg,
    pz,
    bd,
    models: { R: radius },
  };
}
