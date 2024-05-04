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
  keyboardNav: [ ev: KeyboardEvent, currentId: number ];
}>();

const { data: { input }, game } = useStore();

const cell = computed(() => {
  return game.struct.value.cells[props.id];
});
const count = computed(() => {
  return input.vals.value[props.id];
});

const dStr = computed(() => {
  let d = `M ${cell.value.v[0].nom[0]} ${cell.value.v[0].nom[1]}`;
  for(let i = 1; i < 6; i++) {
    d += ` L ${cell.value.v[i].nom[0]} ${cell.value.v[i].nom[1]}`;
  }
  d += ' Z';
  return d;
});

const hasFocus = computed(() => cellRoot.value !== null && document.activeElement === cellRoot.value);

const cellRoot: Ref<SVGGElement | null> = ref(null);
function focus() {
  if(cellRoot.value === null) {
    return;
  }
  cellRoot.value.focus();

  if(input.ind.value !== props.id) {
    input.ind.value = props.id;
  }
}

function setCellCount(ev: KeyboardEvent) {
  if(ev.repeat) {
    return;
  }

  if(!(ev.currentTarget instanceof SVGGElement)) {
    console.warn('event %o has unexpected `currentTarget` %o', ev, ev.currentTarget);
    return;
  }

  const val = Number(ev.key);
  if(!Number.isNaN(val) && val < 6) {
    input.vals.value[input.ind.value] = val;
  }
  else if(ev.key === 'Backspace' || ev.key === 'Delete') {
    delete input.vals.value[input.ind.value];
  }

  emit('keyboardNav', ev, props.id);
}

defineExpose({ cell, focus, hasFocus });

</script>

<template>
  <g ref="cellRoot" :class="cell" :data-id="cell.id" @click="focus" :tabindex="cell.id + 1" @keydown.0.1.2.3.4.5.enter.tab.delete.up.down.left.right="setCellCount">
    <path :d="dStr" :data-id="cell.id" :data-lines="cell.l.map(l => l.id)"
          :data-verts="cell.v.map(v => v.id)"/>
    <text v-if="count !== undefined" class="count" :x="cell.uv[0]" :y="cell.uv[1]" fill="black">
      {{ count }}
    </text>
  </g>
</template>

<style scoped lang="sass">
g
  path
    fill: #eeeeeeb0

g:focus-visible
  outline: none

g:focus
  outline: none

  path
    fill: #ccccccb0

text.count
  font-family: monospace
  font-size: 0.5pt
  text-anchor: middle
  dominant-baseline: central


</style>
