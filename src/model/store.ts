import { GameStruct, initBoard } from 'src/model';
import { computed, Ref, ref, shallowRef, ShallowRef, watchEffect } from 'vue';


const radius = ref(4);
const board = computed<GameStruct>((oldValue) => {
  if(oldValue?.R === radius.value) {
    return oldValue;
  }
  return initBoard(radius.value);
});

const bdFile: ShallowRef<File | null> = shallowRef(null);
const bdSize: Ref<DOMRect> = ref(new DOMRect());
const bdHref = computed(() => {
  if(bdFile.value === null) {
    return '';
  }
  return URL.createObjectURL(bdFile.value);
});
watchEffect((onCleanup) => {
  const href = bdHref.value;
  if(href === '') {
    bdSize.value = new DOMRect();
    return;
  }
  onCleanup(() => URL.revokeObjectURL(href));

  const img = new Image();
  img.onload = () => {
    console.info(img.width, img.height);
    bdSize.value = DOMRect.fromRect(img);
  };
  img.src = href;
});

const nu0 = ref(Number.NaN);
const nud = ref(Number.NaN);
const mur = ref(Number.NaN);

export function useStore() {
  return {
    board,
    backdrop: {
      file: bdFile,
      size: bdSize,
      href: bdHref,
    },
    models: { R: radius, nu0, nud, mur },
  };
}
