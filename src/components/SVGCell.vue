<script setup lang="ts">

import { GameCell } from 'src/model';
import { computed } from 'vue';

defineOptions({
  name: 'SVGCell',
});

const props = defineProps<{
  cell: GameCell,
  r: number,
}>();

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
  <path :d="dStr" fill="#eeeeeeb0" :data-id="cell.id" :data-lines="cell.l.map(l => l.id)" :data-verts="cell.v.map(v => v.id)"/>
</template>

<style scoped lang="sass">
text.cell-id
    font-size: 1px

</style>
