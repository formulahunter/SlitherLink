import { MaybeRefOrGetter, Ref, ref, toValue, watchEffect } from 'vue';

const inputVals: Ref<number[]> = ref([]);
const inputInd = ref(0);

export function useRawData(C: MaybeRefOrGetter<number>) {
  watchEffect(() => {
    inputVals.value = new Array(toValue(C));
    inputInd.value = 0;
  });

  return {
    input: {
      vals: inputVals,
      ind: inputInd,
    },
  };
}
