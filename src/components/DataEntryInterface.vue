<script setup lang="ts">
import { computed, ComputedRef, Ref, ref, toRaw } from 'vue';

defineOptions({
  name: 'DataEntryInterface',
});

const imgEl: Ref<SVGImageElement | null> = ref(null);

const imgFile: Ref<File | null> = ref(null);
const imgSrc: ComputedRef<string> = computed(() => {
  if(!imgFile.value) {
    return '';
  }
  return URL.createObjectURL(imgFile.value);
});

const imgX: Ref<number> = ref(0);

/** [y0, y1, ys, xr] */
const datumVals: Ref<number[]> = ref([]);
const datumLines: Ref<number[][]> = ref([]);

/** [h, s, r, dy, dx] */
const params: Ref<{[k: string]: number}> = ref({});

function centerImage(ev: Event): void {
  imgX.value = (Number(window.getComputedStyle(ev.target.parentElement).width.replace('px', '')) - ev.target.getBBox().width) / 2;
}

type MouseEventOnSVGWithLayerXY = MouseEvent & {
  layerX: number;
  layerY: number;
  currentTarget: SVGSVGElement;
}

function setAlignParams(ev: MouseEventOnSVGWithLayerXY): void {
  //  abort if no image yet loaded
  if(!imgSrc.value) {
    return;
  }

  //  abort if all 4 values already defined
  const i = datumVals.value.length;
  if(i > 3) {
    return;
  }

  const my: number = ev.layerY;
  if(i < 3) {
    datumVals.value[i] = my / imgEl.value.getBBox().height;
    if(i === 2) {
      params.value.h = datumVals.value[2] - datumVals.value[0];
      params.value.s = Math.round(params.value.h / (datumVals.value[1] - datumVals.value[0])) + 1;  //  s = round(h / (y1 - y0)) + 1
      params.value.r = (params.value.s - 1) / 2;  //  r = (s - 1) / 2
      params.value.dy = params.value.h / (params.value.s - 1); //  dy = h / (s - 1)
      params.value.dx = params.value.dy / (2 * Math.sin(60 * Math.PI / 180)); //  dx = dy / sin(60deg)
    }
  }
  else if(i === 3) {
    const mx: number = ev.layerX;
    datumVals.value[i] = (mx - (my - datumVals.value[0]) * params.value.dx / params.value.dy)  / imgEl.value.getBBox().width;
    console.debug('datum values: %o', toRaw(datumVals.value));
    console.debug('param values: %o', toRaw(params.value));
  }
}

function updateLine(ev: MouseEventOnSVGWithLayerXY): void {
  //  abort if all 4 values already defined
  if(datumVals.value.length > 3) {
    return;
  }

  //  if values defined for all existing lines, create a new line
  if(datumVals.value.length === datumLines.value.length) {
    datumLines.value[datumLines.value.length] = [0, 0, 0, 0];
  }

  const i = datumLines.value.length - 1;
  const my: number = ev.layerY;
  if(i < 3) {
    datumLines.value[i] = [0, my, ev.currentTarget.width.baseVal.value, my];
  }
  else if(i === 3) {
    const mx: number = ev.layerX;
    datumLines.value[i] = [
      mx - my * params.value.dx / params.value.dy,
      0,
      mx + (ev.currentTarget.height.baseVal.value - my) * params.value.dx / params.value.dy,
      ev.currentTarget.height.baseVal.value,
    ];
  }
}

</script>

<template>
  <div style="position: relative">
    <div class="align">
      <svg @mousemove="updateLine" @click="setAlignParams">
        <image ref="imgEl" v-if="imgSrc !== ''" :href="imgSrc" height="100%" :x="imgX" @load="centerImage" />
        <g v-if="imgFile !== null">
          <line v-for="l of datumLines" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]" />
        </g>
      </svg>
    </div>
    <q-file v-if="imgFile === null" v-model="imgFile" filled name="backdrop" accept="image/*" label="Choose photo" />
  </div>
</template>

<style scoped lang="sass">
.backdrop
  height: 80vh
  position: absolute

.align
  height: 80vh
  position: absolute
  top: 0
  left: 0
  bottom: 0
  right: 0

  svg
    width: 100%
    height: 100%
    display: inline-block
    position: absolute
    top: 0
    left: 0
    bottom: 0
    right: 0

    line
      stroke: white
      stroke-width: 1pt
</style>
