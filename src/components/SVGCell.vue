<script setup lang="ts">

import { GameCell } from 'src/model';
import { computed } from 'vue';

defineOptions({
  name: 'SVGCell',
});

const props = defineProps<{
  cell: GameCell,
  r: number,
  state: number,
}>();

const stateColors = [ '#eeeeeeb0', '#af9d76b0', '#5e7da5b0', '#67a15db0' ];

const polyVerts = computed(() => {
  let verts: [number, number][] = [];
  for(let i = 0; i < 6; i++) {
    verts[i] = [
      (props.cell.v[i].pos.rel[0] - props.cell.pos.rel[0]) * props.r + props.cell.pos.rel[0],
      (props.cell.v[i].pos.rel[1] - props.cell.pos.rel[1]) * props.r + props.cell.pos.rel[1],
    ];
  }
  return verts;
});
const dStr = computed(() => {
  let d = `M ${polyVerts.value[0][0]} ${polyVerts.value[0][1]}`;
  for(let i = 1; i < 6; i++) {
    d += ` L ${polyVerts.value[i][0]} ${polyVerts.value[i][1]}`;
  }
  d += ' Z';
  return d;
});

</script>

<template>
<!--  <path :d="dStr" :fill="stateColors[state]" :data-id="cell.id" :data-lines="cell.l.map(l => l.id)" :data-verts="cell.v.map(v => v.id)"/>-->
  <use href="#cellPath" :transform="`translate(${cell.pos.rel[0]} ${cell.pos.rel[1]})`"  :fill="stateColors[state]" :data-id="cell.id" :data-lines="cell.l.map(l => l.id)" :data-verts="cell.v.map(v => v.id)" />
  <g>
    <use v-for="(l, i) of cell.l" href="#cellEdge" :transform="`translate(${cell.pos.rel[0]} ${cell.pos.rel[1]}) rotate(${i * 60})`" :data-id="l.id" stroke="#666666b0" stroke-width="0.1" />
  </g>
</template>

<style scoped lang="sass">
text.cell-id
    font-size: 1px

</style>
