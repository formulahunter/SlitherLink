<script setup lang="ts">
import { BackdropImageData } from 'components/BackdropImgConfig.vue';
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { GameStruct } from 'src/model';
import { computed, ComputedRef, Ref, ref, watchEffect } from 'vue';

defineOptions({
  name: 'SVGGameBoard'
});

const props = defineProps<{
  structure: GameStruct;
  backdrop?: BackdropImageData;
}>();

const deg60 = Math.PI / 3;
const sin60 = Math.sin(deg60);
const cos60 = Math.cos(deg60);

const aspectRatio = 1.6;

const cellSpacing = 1;
const cellRadius = 0.98;

const backdropBB: Ref<DOMRect> = ref(DOMRect.fromRect());
const backdropX = ref(0);
const backdropY = ref(0);
const backdropTransformStr: ComputedRef<string> = computed(() => {
  const bd = props.backdrop;
  if(!bd) {
    return '';
  }

  const bb = backdropBB.value;

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

//  pan & zoom parameters
let isPanning = false;
const panBounds = computed(() => {
  const xMax = props.structure.R * cellSpacing;
  const yMax = xMax * sin60;
  return { xMax, yMax, xMin: -xMax, yMin: -yMax };
});
const panOffset: Ref<[number, number]> = ref([0, 0]);

const zoomBounds = [0, 10];
const zoomBase: number = 1.25;
const zoomPower: Ref<number> = ref(0);
const zoomScale: ComputedRef<number> = computed(() => Math.pow(zoomBase, zoomPower.value));

const transformStr: ComputedRef<string> = computed(() => {
  return `scale(${zoomScale.value}) translate(${panOffset.value[0]} ${panOffset.value[1]})`;
});

const viewBox = computed(() => {
  const dV = (props.structure.const.H + 2) * cellSpacing
  const vMin = -dV / 2;
  return [
    vMin * aspectRatio,
    vMin,
    dV * aspectRatio,
    dV,
  ];
});
const viewBoxStr = computed(() => viewBox.value.join(' '));

const svgRoot: Ref<SVGSVGElement | null> = ref(null);
const svgContentBox = ref({ blockSize: 0, inlineSize: 0 });
function updateViewBB(entries: ResizeObserverEntry[]) {
  svgContentBox.value = entries[0].contentBoxSize[0];
}
const resizeObserver = new ResizeObserver(updateViewBB);
watchEffect((onCleanup) => {
  const svg = svgRoot.value;
  if(svg === null) {
    return;
  }
  resizeObserver.observe(svg);
  onCleanup(() => resizeObserver.unobserve(svg));
});
const viewScale: ComputedRef<number> = computed(() => zoomScale.value * svgContentBox.value.blockSize / viewBox.value[3]);

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

</script>

<template>
  <div>
    <svg ref="svgRoot" :viewBox="viewBoxStr" xmlns="http://www.w3.org/2000/svg" @mousedown="startPanning" @mouseup="stopPanning" @mousemove="updateOffset" @wheel.prevent="updateZoom">
      <g :transform="transformStr">
        <image v-if="backdrop" :href="backdrop.src" :transform="backdropTransformStr" :x="backdropX" :y="backdropY" height="100%" @load="centerImage" />
        <SVGCell v-for="c of structure.cells" :cell="c" :r="cellRadius" :key="c.id" />
        <SVGLine v-for="l of structure.lines" :line="l" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style scoped>

</style>
