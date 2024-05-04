import { GameStruct } from 'src/model';
import { MaybeRef, Ref, ref, toValue, watch, watchEffect } from 'vue';

const inputVals: Ref<number[]> = ref([]);
const inputInd = ref(0);

export function useRawData(struct: MaybeRef<GameStruct>) {
  watchEffect(() => {
    //  only overwrite input values if board size changes
    const newVal = toValue(struct).const.C;
    const oldVal = inputVals.value.length;
    if(newVal === oldVal) {
      return;
    }
    inputVals.value = new Array(newVal);
    inputInd.value = 0;
  });

  return {
    input: {
      vals: inputVals,
      ind: inputInd,
    },
  };
}
