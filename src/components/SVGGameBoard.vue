<script setup lang="ts">
import { BackdropImageData } from 'components/BackdropImgConfig.vue';
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { GameCell, GameLine, GameVert, initBoard, LineState } from 'src/model';
import { computed, ComputedRef, onMounted, Ref, ref, shallowRef, toRaw } from 'vue';

defineOptions({
  name: 'SVGGameBoard'
});

const props = defineProps<{
  r: number;
  backdrop?: BackdropImageData;
}>();

const deg60 = Math.PI / 3;
const sin60 = Math.sin(deg60);
const cos60 = Math.cos(deg60);

const cellSpacing = 2;
const cellRadius = 0.98;

const dx = cellSpacing;
const dy = dx * sin60;

const viewBox = shallowRef<[number, number, number, number]>([-5, -5, 20, 20]);
const viewBoxStr = computed(() => viewBox.value.join(' '));

const backdropBB: Ref<DOMRect> = ref(DOMRect.fromRect());
const backdropX = ref(0);
const backdropY = ref(0);
const backdropTransformStr: ComputedRef<string> = computed(() => {
  const bd = props.backdrop;
  if(!bd) {
    return '';
  }

  const bb = backdropBB.value;
  window.vb = toRaw(viewBox.value);
  window.bb = toRaw(bb);
  window.bd = toRaw(bd.datums);
  console.log(window.vb);
  console.log(window.bb);
  console.log(window.bd);

  const gridDV = 2 * props.r * cellSpacing * sin60;
  const imgDY = bb.height * (bd.datums.ys - bd.datums.y0);
  const imgYR = -bb.height * (bd.datums.ys + bd.datums.y0 - 1) / 2;
  // const imgXR = -bb.width * (bd.datums.xr)
  return `scale(${ gridDV / imgDY }) translate(${ 0 } ${ imgYR })`;
});

type SVGImageLoadEvent = Event & {
  type: 'load';
  target: SVGImageElement;
}

function assertIsSVGImageLoadEvent(ev: Event): asserts ev is SVGImageLoadEvent {
  if(!(ev.type === 'load' && ev.target instanceof SVGImageElement)) {
    console.warn('expected %o to be a \'load\' event on the SVG <image> element', ev);
    throw new TypeError(`incompatible event type '${ev.type}' with target ${ev.target}`);
  }
}

function centerImage(ev: Event): void {
  assertIsSVGImageLoadEvent(ev);

  backdropBB.value = ev.target.getBBox();
  backdropX.value = -backdropBB.value.width / 2;
  backdropY.value = -backdropBB.value.height / 2;
  // console.log(backdropBB.value);
  // console.log(backdropX.value, backdropY.value);
}

const cells = shallowRef<GameCell[]>([]);
const lines = shallowRef<GameLine[]>([]);
const verts = shallowRef<GameVert[]>([]);

const defCells = computed(() => cells.value.filter(c => c));

//  pan & zoom parameters
let isPanning = false;
const panBounds = { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
const panOffset: Ref<[number, number]> = ref([0, 0]);

const zoomBounds = [0, 10];
const zoomBase: number = 1.25;
const zoomPower: Ref<number> = ref(0);
const viewScale: ComputedRef<number> = computed(() => Math.pow(zoomBase, zoomPower.value));
const screenScale: ComputedRef<number> = computed(() => viewScale.value * viewBox.value[3]);

const transformStr: ComputedRef<string> = computed(() => {
  return `scale(${viewScale.value}) translate(${panOffset.value[0]} ${panOffset.value[1]})`;
});

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

  //  use `panAnchor` as the flag to activate panning
  if(!isPanning) {
    return;
  }

  let newX = panOffset.value[0] + ev.movementX / screenScale.value;
  if(newX > panBounds.xMax) {
    newX = panBounds.xMax;
  }
  else if(newX < panBounds.xMin) {
    newX = panBounds.xMin;
  }

  let newY = panOffset.value[1] + ev.movementY / screenScale.value;
  if(newY > panBounds.yMax) {
    newY = panBounds.yMax;
  }
  else if(newY < panBounds.yMin) {
    newY = panBounds.yMin;
  }

  panOffset.value = [newX, newY];
}

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

onMounted(() => {

  const board = initBoard(props.r, cellSpacing);
  cells.value = board.cells;
  lines.value = board.lines;
  verts.value = board.verts;

  const aspectRatio = 1.6;
  const viewH = (board.const.H + 2) * cellSpacing;
  const viewW = viewH * aspectRatio;
  const vMin = -viewH / 2;
  const uMin = vMin * aspectRatio;

  viewBox.value = [uMin, vMin, viewW, viewH];

  panBounds.xMax = board.R * cellSpacing;
  panBounds.yMax = panBounds.xMax * Math.sin(60 * Math.PI / 180);
  panBounds.xMin = -panBounds.xMax;
  panBounds.yMin = -panBounds.yMax;
});

</script>

<template>
  <div>
    <svg :viewBox="viewBoxStr" xmlns="http://www.w3.org/2000/svg" @mousedown="startPanning" @mouseup="stopPanning" @mousemove="updateOffset" @wheel.prevent="updateZoom">
      <g :transform="transformStr">
        <image v-if="backdrop" :href="backdrop.src" :transform="backdropTransformStr" :x="backdropX" :y="backdropY" height="100%" @load="centerImage" />
        <SVGCell v-for="c of defCells" :cell="c" :r="cellRadius" :key="c.id" />
        <SVGLine v-for="l of lines" :line="l" :state="LineState.DEFAULT" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style scoped>

</style>
