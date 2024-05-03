import {
  computed,
  ComputedRef, MaybeRef,
  MaybeRefOrGetter,
  ref,
  Ref,
  shallowRef,
  ShallowRef, toValue,
  watch,
  watchEffect,
} from 'vue';


const deg60 = Math.PI / 3;
const sin60 = Math.sin(deg60);
const cos60 = Math.cos(deg60);

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

const bdDatums: Ref<DatumRecord> = ref({ nu0: Number.NaN, nud: Number.NaN, mur: Number.NaN });

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

const boardR = ref(0);
const viewBox: Ref<[number, number, number, number]> = ref([0, 0, 0, 0]);
const svgCB = ref({ inlineSize: 0, blockSize: 0 });

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
  return getBDOrdinatesFor(boardR.value, viewBox.value, svgCB.value, bdSize.value);
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

export function useBackdrop(board: MaybeRefOrGetter<number>, svg: {
  vb: MaybeRef<[number, number, number, number]>,
  cb: MaybeRef<{ inlineSize: number, blockSize: number }>}) {
  watchEffect(() => {
    boardR.value = toValue(board);
  });
  watchEffect(() => {
    viewBox.value = toValue(svg.vb);
    svgCB.value = toValue(svg.cb);
  });

  return {
    file: bdFile,
    size: bdSize,
    href: bdHref,
    hash: bdHash,
    datums: bdDatums,
    models: {
      nu0,
      nud,
      mur,
    },
    ordinates: bdOrdinates,
    alignStr: bdAlignTransformStr,
    originTransform: bdOriginTransform,
    originStr: bdOriginTransformStr,
  };
}
