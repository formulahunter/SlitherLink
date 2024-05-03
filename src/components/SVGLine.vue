<script setup lang="ts">
import { GameLine } from 'src/model';
import { computed } from 'vue';

defineOptions({
  name: 'SVGLine',
});

const props = defineProps<{
  line: GameLine;
  focused?: boolean;
}>();

const coords = computed(() => {
  return [
    [props.line.v[0].nom[0], props.line.v[0].nom[1]],
    [props.line.v[1].nom[0], props.line.v[1].nom[1]],
  ];
});
</script>

<template>
  <line :x1="coords[0][0]" :y1="coords[0][1]" :x2="coords[1][0]" :y2="coords[1][1]" :stroke="focused? '#333333b0' : '#666666b0'" :data-id="line.id"></line>
</template>

<style scoped lang="sass">

</style>
