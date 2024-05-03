import { computed, MaybeRefOrGetter, Ref, ref, toValue, watchEffect } from 'vue';


const aspectRatio = 1.6;

const viewBox: Ref<[number, number, number, number]> = ref([0, 0, 0, 0]);
const viewBoxStr = computed(() => viewBox.value.join(' '));

const svgRoot: Ref<SVGSVGElement | null> = ref(null);
const svgContentBox = ref({ blockSize: 0, inlineSize: 0 });
function updateSVGContentBox(entries: ResizeObserverEntry[]) {
  svgContentBox.value = entries[0].contentBoxSize[0];
}
const resizeObserver = new ResizeObserver(updateSVGContentBox);
watchEffect((onCleanup) => {
  const svg = svgRoot.value;
  if(svg === null) {
    return;
  }
  resizeObserver.observe(svg);
  onCleanup(() => resizeObserver.unobserve(svg));
});

export function useSVGView(boardH: MaybeRefOrGetter<number>) {
  watchEffect(() => {
    const dV = toValue(boardH) + 2;
    const vMin = -dV / 2;
    viewBox.value = [
      vMin * aspectRatio,
      vMin,
      dV * aspectRatio,
      dV,
    ];
  });

  return { vb: viewBox, vbStr: viewBoxStr, el: svgRoot, cb: svgContentBox };
}
