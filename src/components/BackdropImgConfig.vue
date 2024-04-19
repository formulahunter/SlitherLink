<script setup lang="ts">
import { computed, ComputedRef, Ref, ref, toRaw } from 'vue';

export interface BackdropImageData {
  file: File;
  src: string;
  datums: {
    y0: number;
    y1: number;
    ys: number;
    xr: number;
  };
  params: {
    r: number;
    dy: number;
    dx: number;
  };
}

const props = defineProps<{
  r: number;
}>();

defineOptions({
  name: 'BackdropImgConfig',
});

const emit = defineEmits<{
  setBackdrop: [data: BackdropImageData];
}>();


const imgFile: Ref<File | null> = ref(null);
const imgSrc: ComputedRef<string> = computed(() => {
  if(!imgFile.value) {
    return '';
  }
  return URL.createObjectURL(imgFile.value);
});
const imgX: Ref<number> = ref(0);

/** [y0, y1, ys, xr] */
const datums: Ref<number[]> = ref([]);
const lines: Ref<number[][]> = ref([]);

/** [h, s, r, dy, dx] */
const params: {[k: string]: number} = {};

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
  const i = datums.value.length;
  if(i > 3) {
    return;
  }

  const my: number = ev.layerY;
  if(i < 3) {
    datums.value[i] = my / ev.target.getBBox().height;
    if(i === 2) {
      params.h = datums.value[2] - datums.value[0];
      params.s = Math.round(params.h / (datums.value[1] - datums.value[0])) + 1;  //  s = round(h / (y1 - y0)) + 1
      params.r = (params.s - 1) / 2;  //  r = (s - 1) / 2
      params.dy = params.h / (params.s - 1); //  dy = h / (s - 1)
      params.dx = params.dy / (2 * Math.sin(60 * Math.PI / 180)); //  dx = dy / sin(60deg)
    }
  }
  else if(i === 3) {
    const mx: number = ev.layerX;
    datums.value[i] = (mx - (my - datums.value[0]) * params.dx / params.dy)  / ev.target.getBBox().width;
    console.debug('datum values: %o', toRaw(datums.value));
    console.debug('param values: %o', params);

    const data = {
      file: toRaw(imgFile.value) as File,
      src: toRaw(imgSrc.value),
      datums: {
        y0: datums.value[0],
        y1: datums.value[1],
        ys: datums.value[2],
        xr: datums.value[3],
      },
      params: {
        r: params.r,
        dx: params.dx,
        dy: params.dy,
      },
    };
    emit('setBackdrop', data);
  }
}

function updateLine(ev: MouseEventOnSVGWithLayerXY): void {
  //  abort if all 4 values already defined
  if(datums.value.length > 3) {
    return;
  }

  //  if values defined for all existing lines, create a new line
  if(datums.value.length === lines.value.length) {
    lines.value[lines.value.length] = [0, 0, 0, 0];
  }

  const i = lines.value.length - 1;
  const my: number = ev.layerY;
  if(i < 3) {
    lines.value[i] = [0, my, ev.currentTarget.width.baseVal.value, my];
  }
  else if(i === 3) {
    const mx: number = ev.layerX;
    lines.value[i] = [
      mx - my * params.dx / params.dy,
      0,
      mx + (ev.currentTarget.height.baseVal.value - my) * params.dx / params.dy,
      ev.currentTarget.height.baseVal.value,
    ];
  }
}

</script>

<template>
  <div style="position: relative">
    <div class="align">
      <svg @mousemove="updateLine" @click="setAlignParams">
        <image v-if="imgSrc !== ''" :href="imgSrc" height="100%" :x="imgX" />
        <g v-if="imgFile !== null">
          <line v-for="l of lines" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]" />
        </g>
        <g>

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
