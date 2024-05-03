import { computed, ComputedRef, MaybeRefOrGetter, Ref, ref, shallowRef, ShallowRef, toValue, watchEffect } from 'vue';


const deg60 = Math.PI / 3;
const sin60 = Math.sin(deg60);
const cos60 = Math.cos(deg60);

const aspectRatio = 1.6;

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

const boardR = ref(0);

const viewBox: ComputedRef<[number, number, number, number]> = computed(() => {
  const dV = boardR.value * 2 + 3;
  const vMin = -dV / 2;
  return [
    vMin * aspectRatio,
    vMin,
    dV * aspectRatio,
    dV,
  ];
});
const viewBoxStr = computed(() => viewBox.value.join(' '));

//  pan & zoom parameters
const zoomPower: Ref<number> = ref(0);
const zoomBounds = [0, 10];
const zoomBase: number = 1.25;
const zoomScale: ComputedRef<number> = computed(() => Math.pow(zoomBase, zoomPower.value));

function updateZoom(ev: WheelEvent): void {
  if(svgRoot.value === null && ev.currentTarget instanceof SVGSVGElement) {
    svgRoot.value = ev.currentTarget;
  }

  //  disable zooming in/out while panning
  if(isPanning) {
    return;
  }

  let newPower = zoomPower.value - Math.sign(ev.deltaY);
  if(newPower < zoomBounds[0]) {
    newPower = zoomBounds[0];
  }
  else if(newPower > zoomBounds[1]) {
    newPower = zoomBounds[1];
  }

  zoomPower.value = newPower;
}

const viewScale: ComputedRef<number> = computed(() => zoomScale.value * svgContentBox.value.blockSize / viewBox.value[3]);

let isPanning = false;
const panOffset: Ref<[number, number]> = ref([0, 0]);
const panBounds = computed(() => {
  const xMax = boardR.value;
  const yMax = xMax * sin60;
  return { xMax, yMax, xMin: -xMax, yMin: -yMax };
});

function startPanning(): void {
  isPanning = true;
}
function stopPanning(): void {
  isPanning = false;
}
function updateOffset(ev: MouseEvent): void {
  if(svgRoot.value === null && ev.currentTarget instanceof SVGSVGElement) {
    svgRoot.value = ev.currentTarget;
  }

  //  stop panning if left mouse button not pressed (i.e. if the 'mouseup'
  //  event happens off of the <svg> element where the listener is defined)
  if(!(ev.buttons & 0x01)) {
    stopPanning();
  }
  if(!isPanning) {
    return;
  }

  let newX = panOffset.value[0] + ev.movementX / viewScale.value;
  if(newX > panBounds.value.xMax) {
    newX = panBounds.value.xMax;
  }
  else if(newX < panBounds.value.xMin) {
    newX = panBounds.value.xMin;
  }

  let newY = panOffset.value[1] + ev.movementY / viewScale.value;
  if(newY > panBounds.value.yMax) {
    newY = panBounds.value.yMax;
  }
  else if(newY < panBounds.value.yMin) {
    newY = panBounds.value.yMin;
  }

  panOffset.value = [newX, newY];
}

const panZoomTransformStr: ComputedRef<string> = computed(() => {
  return `scale(${zoomScale.value}) translate(${panOffset.value[0]} ${panOffset.value[1]})`;
});


export function useSVGView(R: MaybeRefOrGetter<number>) {
  watchEffect(() => {
    boardR.value = toValue(R);
  });

  return {
    svg: {
      vb: viewBox,
      vbStr: viewBoxStr,
      el: svgRoot,
      cb: svgContentBox,
    },
    pan: {
      offset: panOffset,
      bounds: panBounds,
      start: startPanning,
      stop: stopPanning,
      update: updateOffset,
    },
    zoom: {
      scale: zoomScale,
      update: updateZoom,
    },
    globalTransformStr: panZoomTransformStr,
  };
}
