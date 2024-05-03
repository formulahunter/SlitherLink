import { computed, ComputedRef, MaybeRef, ref, Ref, toValue, watchEffect } from 'vue';


const deg60 = Math.PI / 3;
const sin60 = Math.sin(deg60);
const cos60 = Math.cos(deg60);

const boardR = ref(0);

//  pan & zoom parameters
const zoomPower: Ref<number> = ref(0);
const zoomBounds = [0, 10];
const zoomBase: number = 1.25;
const zoomScale: ComputedRef<number> = computed(() => Math.pow(zoomBase, zoomPower.value));

function updateZoom(ev: WheelEvent): void {
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

let isPanning = false;
const panOffset: Ref<[number, number]> = ref([0, 0]);
const panBounds = computed(() => {
  const xMax = boardR.value;
  const yMax = xMax * sin60;
  return { xMax, yMax, xMin: -xMax, yMin: -yMax };
});

const vbHeight = ref(0);
const svgHeight = ref(0);
const viewScale: ComputedRef<number> = computed(() => zoomScale.value * svgHeight.value / vbHeight.value);

function startPanning(): void {
  isPanning = true;
}
function stopPanning(): void {
  isPanning = false;
}
function updateOffset(ev: MouseEvent): void {
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

const transformStr: ComputedRef<string> = computed(() => {
  return `scale(${zoomScale.value}) translate(${panOffset.value[0]} ${panOffset.value[1]})`;
});

export function usePanZoom(board: MaybeRef<number>, svg: {
  vb: MaybeRef<[number, number, number, number]>,
  cb: MaybeRef<{ inlineSize: number, blockSize: number }>}) {
  watchEffect(() => {
    boardR.value = toValue(board);
  });
  watchEffect(() => {
    vbHeight.value = toValue(svg.vb)[3];
    svgHeight.value = toValue(svg.cb).blockSize;
  });

  return {
    panOffset,
    panBounds,
    zoomScale,
    transformStr,
    startPanning,
    stopPanning,
    updateOffset,
    updateZoom,
  };
}
