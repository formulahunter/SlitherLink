<script setup lang="ts">

import { GameLine, LineState } from 'src/model';
import { computed } from 'vue';

defineOptions({
  name: 'SVGLine',
});

const props = defineProps<{
  line: GameLine,
  state: LineState,
}>();

const coords = computed(() => {
  return [
    [props.line.v[0].pos.rel[0], props.line.v[0].pos.rel[1]],
    [props.line.v[1].pos.rel[0], props.line.v[1].pos.rel[1]],
  ];
});
</script>

<template>
  <line :x1="coords[0][0]" :y1="coords[0][1]" :x2="coords[1][0]" :y2="coords[1][1]" stroke="#666666" stroke-width="0.1"></line>
</template>

<style scoped lang="sass">

</style>
