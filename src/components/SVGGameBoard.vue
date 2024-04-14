<script setup lang="ts">
import { initBoard } from 'src/model';
import { computed, onMounted, ref } from 'vue';


defineOptions({
  name: 'SVGGameBoard'
});

const props = defineProps<{
  r: number;
}>();

const counts = computed(() => ({
  c: props.r * (3 * props.r + 3) + 1,
  l: props.r * (9 * props.r + 15) + 6,
  v: props.r * (6 * props.r + 12) + 12,
}));

// const cells = ref<CellState[]>([]);
// const lines = ref<LineState[]>([]);
// const verts = ref<VertState[]>([]);

onMounted(() => {

  const board = initBoard(props.r, 2, 0.98);
  console.log(board);

  function createSVG(el: string) {
    return document.createElementNS('http://www.w3.org/2000/svg', el);
  }
  window.createSVG = createSVG;

  const deg60 = Math.PI / 3;
  window.cellSpacing = 2;
  window.cellRadius = 0.98 * window.cellSpacing / (2 * Math.cos(deg60 / 2));
  const vertOffsets: Coord[] = [];
  for(let i = -2.5; i < 3; i++) {
    const radians = i * deg60;
    vertOffsets.push([
      window.cellRadius * Math.cos(radians),
      window.cellRadius * Math.sin(radians),
    ]);
  }
  console.log(vertOffsets);

  function vertsAround(coords: Coord): Coord[] {
    const verts: Coord[] = [];
    for(let i = 0; i < vertOffsets.length; i++) {
      verts.push([
        coords[0] + vertOffsets[i][0],
        coords[1] + vertOffsets[i][1],
      ]);
    }
    return verts;
  }
  window.vertsAround = vertsAround;

  function cellPathAt(u0, v0) {
    const verts = vertsAround([u0, v0]);
    let d = `M ${verts[0][0]} ${verts[0][1]}`;
    for(let i = 1; i < verts.length; i++) {
      d += ` L ${verts[i][0]} ${verts[i][1]}`;
    }
    d += ' Z';

    const path = createSVG('path');
    path.setAttribute('d', d);
    return path;
  }
  window.cellPathAt = cellPathAt;

  const aspectRatio = 1.6;
  const viewH = 20;
  const viewW = viewH * aspectRatio;
  const vMin = -viewH / 2;
  const uMin = vMin * aspectRatio;

  const svg = document.querySelector('svg');
  svg.setAttribute('viewBox', `${uMin} ${vMin} ${viewW} ${viewH}`);

  const i0 = props.r + 1;
  const j0 = props.r;
  const cos60 = Math.cos(deg60);
  const sin60 = Math.sin(deg60);
  function gridToRel(i, j) {
    return [window.cellSpacing * ((i - i0) + (j - j0) * cos60), window.cellSpacing * (j - j0) * sin60];
  }

  const D = props.r * 2;
  const S = D + 1;
  const W = S + 2;
  const H = S + 1;

  function coordsOfId(id: number): Coord {
    return [id % W, id / W | 0];
  }
  function idAtCoords(coords: Coord): number {
    return coords[1] * W + coords[0];
  }

  function coordsAreOnBoard(coords: Coord): boolean {
    if(coords[0] < 1 || coords[1] < 0 || coords[0] > S || coords[1] >= S) {
      return false;
    }
    if(coords[1] < props.r - coords[0] + 1 || coords[1] > 3 * props.r - coords[0] + 1) {
      return false;
    }
    return true;
  }
  function idIsOnBoard(id: number): boolean {
    return coordsAreOnBoard(coordsOfId(id));
  }

  svg.appendChild(cellPathAt(uMin + window.cellRadius, vMin + window.cellRadius));
  for(let j = 0; j < H; j++) {
    for(let i = 0; i < W; i++) {
      const rel = gridToRel(i, j);
      const poly = cellPathAt(rel[0], rel[1]);
      if(!coordsAreOnBoard([i, j])) {
        poly.setAttribute('fill', '#00000020');
      }
      svg.appendChild(poly);
    }
  }
});


</script>

<template>
  <div>
    <svg viewBox="-5 -5 20 20" xmlns="http://www.w3.org/2000/svg">
    </svg>
  </div>
</template>

<style scoped>

</style>
