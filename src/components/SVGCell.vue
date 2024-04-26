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

const dStr = computed(() => {
  let d = `M ${props.cell.v[0].nom[0]} ${props.cell.v[0].nom[1]}`;
  for(let i = 1; i < 6; i++) {
    d += ` L ${props.cell.v[i].nom[0]} ${props.cell.v[i].nom[1]}`;
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
