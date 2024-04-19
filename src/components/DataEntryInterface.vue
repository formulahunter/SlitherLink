<script setup lang="ts">
import { computed, ComputedRef, Ref, ref } from 'vue';

defineOptions({
  name: 'DataEntryInterface',
});

const imgFile: Ref<File | null> = ref(null);
const imgSrc: ComputedRef<string> = computed(() => {
  if(!imgFile.value) {
    return '';
  }
  return URL.createObjectURL(imgFile.value);
});

/** [y0, y1, ys, xr] */
const datum: Ref<{[k: string]: number}> = ref({});

/** [h, s, r, dy, dx] */
const params: Ref<{[k: string]: number}> = ref({});

const line0 = ref([[0, 0], [0, 0]]);
const line1 = ref([[0, 0], [0, 0]]);
const line2 = ref([[0, 0], [0, 0]]);
const line3 = ref([[0, 0], [0, 0]]);

type MouseEventOnSVGWithLayerXY = MouseEvent & {
  layerX: number;
  layerY: number;
  currentTarget: SVGSVGElement;
}

function setAlignParams(ev: MouseEventOnSVGWithLayerXY): void {
  const my: number = ev.layerY;
  if(datum.value.y0 === undefined) {
    datum.value.y0 = my;
  }
  else if(datum.value.y1 === undefined) {
    datum.value.y1 = my;
  }
  else if(datum.value.ys === undefined) {
    datum.value.ys = my;

    params.value.h = datum.value.ys - datum.value.y0;
    params.value.s = Math.round(params.value.h / (datum.value.y1 - datum.value.y0)) + 1;  //  s = round(h / (y1 - y0)) + 1
    params.value.r = (params.value.s - 1) / 2;  //  r = (s - 1) / 2
    params.value.dy = params.value.h / (params.value.s - 1); //  dy = h / (s - 1)
    params.value.dx = params.value.dy / (2 * Math.sin(60 * Math.PI / 180)); //  dx = dy / sin(60deg)
  }
  else if(datum.value.xr === undefined) {
    const mx: number = ev.layerX;
    datum.value.xr = mx - (my - datum.value.y0) * params.value.dx / params.value.dy;
  }
}

function updateLine(ev: MouseEventOnSVGWithLayerXY): void {
  const my: number = ev.layerY;
  if(datum.value.y0 === undefined) {
    line0.value = [[0, my], [ev.currentTarget.width.baseVal.value, my]];
  }
  else if(datum.value.y1 === undefined) {
    line1.value = [[0, my], [ev.currentTarget.width.baseVal.value, my]];
  }
  else if(datum.value.ys === undefined) {
    line2.value = [[0, my], [ev.currentTarget.width.baseVal.value, my]];
  }
  else if(datum.value.xr === undefined) {
    const mx: number = ev.layerX;
    line3.value = [
      [mx - my * params.value.dx / params.value.dy, 0],
      [mx + (ev.currentTarget.height.baseVal.value - my) * params.value.dx / params.value.dy, ev.currentTarget.height.baseVal.value],
    ];
  }
}

</script>

<template>
  <div style="position: relative">
    <q-img v-if="imgFile !== null" :src="imgSrc" class="backdrop" fit="scale-down" />
    <q-file v-if="imgFile === null" v-model="imgFile" filled name="backdrop" accept="image/*" label="Choose photo" />
    <div v-if="imgFile !== null" class="align">
      <svg @mousemove="updateLine" @click="setAlignParams">
<!--        <image v-if="imgSrc !== ''" :href="imgSrc" height="100%"/>-->
        <line :x1="line0[0][0]" :y1="line0[0][1]" :x2="line0[1][0]" :y2="line0[1][1]" />
        <line v-if="datum.y0 !== undefined" :x1="line1[0][0]" :y1="line1[0][1]" :x2="line1[1][0]" :y2="line1[1][1]" />
        <line v-if="datum.y1 !== undefined" :x1="line2[0][0]" :y1="line2[0][1]" :x2="line2[1][0]" :y2="line2[1][1]" />
        <line v-if="datum.ys !== undefined" :x1="line3[0][0]" :y1="line3[0][1]" :x2="line3[1][0]" :y2="line3[1][1]" />
      </svg>
    </div>
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
