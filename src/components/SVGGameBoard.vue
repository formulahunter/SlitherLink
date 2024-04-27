<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { BackdropData, GameStruct } from 'src/model';
import { computed, ComputedRef, Ref, ref, watchEffect } from 'vue';

defineOptions({
  name: 'SVGGameBoard'
});

const props = defineProps<{
  structure: GameStruct;
  backdrop: BackdropData | null;
}>();

const deg60 = Math.PI / 3;
const sin60 = Math.sin(deg60);
const cos60 = Math.cos(deg60);

const aspectRatio = 1.6;

const cellSpacing = 1;
const cellRadius = 0.98;

const viewBox = computed<[number, number, number, number]>(() => {
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

//  pan & zoom parameters
const panOffset: Ref<[number, number]> = ref([0, 0]);
let isPanning = false;
const panBounds = computed(() => {
  const xMax = props.structure.R * cellSpacing;
  const yMax = xMax * sin60;
  return { xMax, yMax, xMin: -xMax, yMin: -yMax };
});

const zoomPower: Ref<number> = ref(0);
const zoomBounds = [0, 10];
const zoomBase: number = 1.25;
const zoomScale: ComputedRef<number> = computed(() => Math.pow(zoomBase, zoomPower.value));

const transformStr: ComputedRef<string> = computed(() => {
  return `scale(${zoomScale.value}) translate(${panOffset.value[0]} ${panOffset.value[1]})`;
});

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

function getBDOrdinatesFor(vb: [number, number, number, number], cb: { inlineSize: number, blockSize: number }, imageSize: [number, number]) {
  const dv = vb[3];
  const du = vb[2];

  const dp = 1;
  const dq = 1;

  const dy = cb.blockSize;
  const dx = cb.inlineSize;

  const dmu = imageSize[0];
  const dnu = imageSize[1];

  const vmin = vb[1];
  const v0 = -props.structure.R * sin60;
  const vr = 0;
  const vd = -v0;
  const vmax = vmin + dv;
  const umin = vb[0];
  const ur = 0;
  const umax = umin + du;

  const pmin = vmin / dv;
  const p0 = v0 / dv;
  const pr = vr / dv;
  const pd = vd / dv;
  const pmax = vmax / dv;
  const qmin = umin / du;
  const qr = ur / du;
  const qmax = umax / du;

  const ymin = (0.5 + pmin) * dy;
  const y0 = (0.5 + p0) * dy; //  (v0 + vr) * (dy / dv)
  const yr = (0.5 + pr) * dy;
  const yd = (0.5 + pd) * dy;
  const ymax = (0.5 + pmax) * dy;
  const xmin = (0.5 + qmin) * dx;
  const xr = (0.5 + qr) * dx;
  const xmax = (0.5 + qmax) * dx;

  const numin = (0.5 + pmin) * dnu;
  const nu0 = (0.5 + p0) * dnu;
  const nur = (0.5 + pr) * dnu;
  const nud = (0.5 + pd) * dnu;
  const numax = (0.5 + pmax) * dnu;
  const mumin = (0.5 + qmin) * dmu;
  const mur = (0.5 + qr) * dmu;
  const mumax = (0.5 + qmax) * dmu;

  // console.table({
  //   nominal: { vmin,        v0,      vr,      vd,      vmax,        dv,      umin,        ur,      umax,        du, },
  //   ratio:   { vmin: pmin,  v0: p0,  vr: pr,  vd: pd,  vmax: pmax,  dv: dp,  umin: qmin,  ur: qr,  umax: qmax,  du: dq, },
  //   local:   { vmin: ymin,  v0: y0,  vr: yr,  vd: yd,  vmax: ymax,  dv: dy,  umin: xmin,  ur: xr,  umax: xmax,  du: dx, },
  //   image:   { vmin: numin, v0: nu0, vr: nur, vd: nud, vmax: numax, dv: dnu, umin: mumin, ur: mur, umax: mumax, du: dmu, },
  // });

  return {
    vmin, v0, vr, vd, vmax, dv, umin, ur, umax, du,
    pmin, p0, pr, pd, pmax, dp, qmin, qr, qmax, dq,
    ymin, y0, yr, yd, ymax, dy, xmin, xr, xmax, dx,
    numin, nu0, nur, nud, numax, dnu, mumin, mur, mumax, dmu,
  };
}
const bdOrdinates = computed(() => {
  if(props.backdrop === null) {
    return null;
  }
  return getBDOrdinatesFor(viewBox.value, svgContentBox.value, props.backdrop.size);
});

// const bdAlignTransform =
const bdAlignTransformStr: ComputedRef<string> = computed(() => {
  if(props.backdrop === null) {
    return '';
  }

  const ord = bdOrdinates.value;
  if(ord === null) {
    return '';
  }

  const dat = props.backdrop.datums;
  if(Number.isNaN(dat.nu0)) {
    return '';
  }

  let dnu = ord.dnu;
  let s = 1;
  if(Number.isNaN(dat.nud)) {
    dnu -= dat.nu0;
  }
  else {
    dnu = dat.nud - dat.nu0;
  }

  const dv = props.structure.R * Math.sin(Math.PI / 3);
  // const v0 = (viewBox.value[3] - dv) / 2;
  console.debug(dnu, dv);
  s = bdOriginTransform.value.a * (dnu / dv);
  if(Number.isNaN(s) || s === 0) {
    s = 1;
  }
  const ty = dat.nu0;

  let tx = 0;
  if(!Number.isNaN(dat.mur)) {
    tx = dat.mur;
  }
  return `scale(${ s }) translate(${ tx } ${ ty })`;
});

const identityTransform = new DOMMatrix();
// const bdBaseTransform = shallowRef(new DOMMatrix());
// function setBDBaseTransform(ev: Event): void {
//   if(!(ev.target instanceof SVGImageElement)) {
//     console.debug('unexpected target %o of event %o', ev.target, ev);
//     console.warn('invalid \'load\' event target')
//     return;
//   }
//
//   const bb = ev.target.getBBox();
//   const vb = viewBox.value;
//   const scale = vb[3] / props.backdrop.size[1];
//
//   const vmin = vb[1];
//   const ymin = 0;
//   const ymax = svgContentBox.value.blockSize;
//
//   const dy_dv = (ymax - ymin) / vb[3];
//
//   const v0 = -props.structure.R * Math.sin(Math.PI / 3);
//
//   const yr = ymax / 2;
//   const y0 = (v0 - vmin) * dy_dv;
//   const yd = (ymax - ymin) - y0;
//
//   // bdBaseTransform.value = identityTransform.scale(scale).translateSelf(-bb.width / 2, -bb.height / 2);
//   // console.log(bdBaseTransform.value);
//   // triggerRef(bdBaseTransform);
// }
// const bdBaseTransformStr = computed(() => {
//   const mat = bdBaseTransform.value;
//   return `matrix(${mat.a} ${mat.b} ${mat.c} ${mat.d} ${mat.e} ${mat.f})`;
// });

const bdOriginTransform = computed(() => {
  if(props.backdrop === null) {
    return identityTransform;
  }

  const ord = bdOrdinates.value;
  if(ord === null) {
    return identityTransform;
  }

  return identityTransform.scale(ord.dv / ord.dnu).translate(-2 * ord.mur, -ord.dnu / 2 - ord.nur);
});
const bdOriginTransformStr = computed(() => {
  const mat = bdOriginTransform.value;
  return `matrix(${mat.a} ${mat.b} ${mat.c} ${mat.d} ${mat.e} ${mat.f})`;
});

</script>

<template>
  <div>
    <svg ref="svgRoot" :viewBox="viewBoxStr" xmlns="http://www.w3.org/2000/svg" @mousedown="startPanning" @mouseup="stopPanning" @mousemove="updateOffset" @wheel.prevent="updateZoom">
      <g :transform="transformStr">
        <g :transform="bdOriginTransformStr">
          <image v-if="backdrop !== null" :href="backdrop.href" :transform="bdAlignTransformStr"/>
        </g>
        <SVGCell v-for="c of structure.cells" :cell="c" :r="cellRadius" :key="c.id" />
        <SVGLine v-for="l of structure.lines" :line="l" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style scoped>

</style>
