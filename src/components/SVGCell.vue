<script setup lang="ts">

import { useStore } from 'src/model';
import { computed, Ref, ref } from 'vue';

defineOptions({
  name: 'SVGCell',
});

const props = defineProps<{
  id: number;
}>();

const emit = defineEmits<{
  keyboardNav: [ targetId: number ];
}>();

const { data, game } = useStore();
const { nav: { initKeyNav, releaseKey } } = data;

const cell = computed(() => {
  return game.struct.value.cells.rowMajor[props.id];
});
const count = computed(() => {
  return data.vals.value[props.id];
});

const dStr = computed(() => {
  let d = `M ${cell.value.v[0].nom[0]} ${cell.value.v[0].nom[1]}`;
  for(let i = 1; i < 6; i++) {
    d += ` L ${cell.value.v[i].nom[0]} ${cell.value.v[i].nom[1]}`;
  }
  d += ' Z';
  return d;
});

const cellRoot: Ref<SVGGElement | null> = ref(null);
const hasFocus = computed(() => cellRoot.value !== null && document.activeElement === cellRoot.value);
function focus() {
  if(cellRoot.value === null) {
    return;
  }
  cellRoot.value.focus();

  if(data.ind.value !== props.id) {
    data.ind.value = props.id;
  }
  console.log('focused: ' + props.id);
}

function processNavEvent(ev: KeyboardEvent) {
  const targetId = initKeyNav(ev, props.id);
  if(targetId !== undefined) {
    emit('keyboardNav', targetId);
  }
}

defineExpose({ id: props.id, focus, hasFocus });

</script>

<template>
  <g ref="cellRoot" class="cell" :data-id="id" @click="focus" :tabindex="id + 1" @keydown.0.1.2.3.4.5.delete.enter.tab.up.down.left.right.stop.prevent="processNavEvent" @keyup.0.1.2.3.4.5.delete.enter.tab.up.down.left.right.stop.prevent="releaseKey">
    <path :d="dStr" :data-id="id" :data-lines="cell.l.map(l => l.id)"
          :data-verts="cell.v.map(v => v.id)"/>
    <text v-if="count !== undefined" class="count" :x="cell.uv[0]" :y="cell.uv[1]">
      {{ count }}
    </text>
  </g>
</template>

<style scoped lang="sass">
g.cell
  path
    fill: #eeeeeeb0

g.cell:focus, g.cell:focus-visible
  outline: none

  path
    fill: #ccccccb0

text.count
  color: black
  font-family: monospace
  font-size: 0.5pt
  text-anchor: middle
  dominant-baseline: central


</style>
