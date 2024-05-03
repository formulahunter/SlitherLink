import {
  computed,
  ComputedRef,
  MaybeRefOrGetter,
  Ref,
  ref,
  shallowRef,
  ShallowRef,
  toValue,
  watch,
  watchEffect,
} from 'vue';


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

const bdHash = computed(async () => {
  if(bdFile.value === null) {
    return null;
  }

  const buf = await bdFile.value?.arrayBuffer();
  if(buf === undefined) {
    throw new Error('cannot compute hash digest of selected image');
  }

  const byteArray = Array.from(new Uint8Array(await crypto.subtle.digest('sha-1', buf)));
  return byteArray.map((b) => b.toString(16).padStart(2, '0')).join('');
});

export type DatumRecord = {
  nu0: number;
  nud: number;
  mur: number;
};
function isDatumRecord(val: any): val is DatumRecord {
  return typeof val === 'object'
    && typeof val.nu0 === 'number'
    && typeof val.nud === 'number'
    && typeof val.mur === 'number';
}

const bdDatums: Ref<DatumRecord> = ref({ nu0: Number.NaN, nud: Number.NaN, mur: Number.NaN });

async function readDatums(): Promise<DatumRecord | null> {
  const hash = await bdHash.value;
  if(hash === null) {
    return null;
  }

  const jStr = localStorage.getItem(hash);
  if(jStr === null) {
    return null;
  }

  const jObj = JSON.parse(jStr);
  if(!isDatumRecord(jObj)) {
    return null;
  }

  return jObj;
}
async function writeDatums(): Promise<void> {
  const hash = await bdHash.value;
  if(hash === null) {
    return;
  }
  localStorage.setItem(hash, JSON.stringify(bdDatums.value));
}

const nu0 = computed({
  get() {
    return bdDatums.value.nu0;
  },
  set(val: number) {
    bdDatums.value.nu0 = val;
    writeDatums();
  }
});
const nud = computed({
  get() {
    return bdDatums.value.nud;
  },
  set(val: number) {
    bdDatums.value.nud = val;
    writeDatums();
  }
});
const mur = computed({
  get() {
    return bdDatums.value.mur;
  },
  set(val: number) {
    bdDatums.value.mur = val;
    writeDatums();
  }
});

function getBDOrdinatesFor(R: number, vb: [number, number, number, number], cb: { inlineSize: number, blockSize: number }, imageSize: DOMRect) {
  const dv = vb[3];
  const du = vb[2];

  const dp = 1;
  const dq = 1;

  const dy = cb.blockSize;
  const dx = cb.inlineSize;

  const dmu = imageSize.width;
  const dnu = imageSize.height;

  const vmin = vb[1];
  const v0 = -R * sin60;
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
  if(bdFile.value === null) {
    return null;
  }
  return getBDOrdinatesFor(boardR.value, viewBox.value, svgContentBox.value, bdSize.value);
});

function getDefaultDatums(): DatumRecord {
  const ord = bdOrdinates.value;
  if(ord === null) {
    throw new Error('cannot calculate default datums: no backdrop image selected');
  }
  return {
    nu0: Math.round(ord.nu0),
    nud: Math.round(ord.nud),
    mur: Math.round(ord.mur),
  };
}
watch(async () => await bdHash.value, async (newVal, oldVal) => {
  const [newHash, oldHash] = await Promise.all([newVal, oldVal]);
  if(newHash === oldHash) {
    console.info(`new file hash ${ newHash?.substring(0, 7) } is unchanged from previous hash ${ oldHash?.substring(0, 7) }`);
    return;
  }
  if(newHash === null) {
    return;
  }
  const rec = await readDatums();
  if(rec === null) {
    bdDatums.value = getDefaultDatums();
    await writeDatums();
    return;
  }
  bdDatums.value = rec;
});

const identityTransform = new DOMMatrix();

const bdAlignTransformStr: ComputedRef<string> = computed(() => {
  if(bdFile.value === null) {
    return '';
  }

  const ord = bdOrdinates.value;
  if(ord === null) {
    return '';
  }

  const s = (ord.nud - ord.nu0) / (nud.value - nu0.value);
  return `translate(${ ord.mur } ${ ord.nu0 }) scale(${ s }) translate(${ (-mur.value) } ${ (-nu0.value) })`;
});

const bdOriginTransform = computed(() => {
  if(bdFile.value === null) {
    return identityTransform;
  }

  const ord = bdOrdinates.value;
  if(ord === null) {
    return identityTransform;
  }

  return identityTransform.scale(ord.dv / ord.dnu).translate(-ord.dmu / 2, -ord.dnu / 2);
});
const bdOriginTransformStr = computed(() => {
  const mat = bdOriginTransform.value;
  return `matrix(${mat.a} ${mat.b} ${mat.c} ${mat.d} ${mat.e} ${mat.f})`;
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
    global: {
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
      transformStr: panZoomTransformStr,
    },
    backdrop: {
      file: bdFile,
      size: bdSize,
      href: bdHref,
      hash: bdHash,
      datums: bdDatums,
      models: { nu0, nud, mur },
      ordinates: bdOrdinates,
      alignStr: bdAlignTransformStr,
      originTransform: bdOriginTransform,
      originStr: bdOriginTransformStr,
    },
  };
}
