import { GameStruct, initBoard, initState } from 'src/model';
import { computed, MaybeRef, ref, toValue, watchEffect } from 'vue';

const boardR = ref(0);
const struct = computed<GameStruct>((oldValue) => {
  if(oldValue?.R === boardR.value) {
    return oldValue;
  }
  return initBoard(boardR.value);
});
const state = computed(() => {
  return initState(struct.value);
});

export function useGame(R: MaybeRef<number>) {
  watchEffect(() => {
    boardR.value = toValue(R);
  });

  return {
    struct,
    state,
  };
}
