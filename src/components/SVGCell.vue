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
  console.log('focused: ' + props.id);
}

const keyIsDown = {
  '0': false,
  '1': false,
  '2': false,
  '3': false,
  '4': false,
  '5': false,
  'Delete': false,
  'Backspace': false
};
type CellCountKey = keyof typeof keyIsDown;
function isCellCountKey(key: string): key is CellCountKey {
  return key in keyIsDown;
}
function setCellCount(ev: KeyboardEvent) {
  const key = ev.key;
  if(!isCellCountKey(key)) {
    console.warn('cell count setter triggered by unexpected keyboard key: ' + key);
    return;
  }

  if(keyIsDown[key]) {
    return;
  }
  keyIsDown[key] = true;

  const cellG = ev.currentTarget;
  if(!(cellG instanceof SVGGElement)) {
    console.warn('event %o has unexpected `currentTarget` %o', ev, cellG);
    return;
  }

  if(key === 'Backspace' || key === 'Delete') {
    delete input.vals.value[input.ind.value];
  }
  else {
    const newCount = Number(key);
    if(Number.isNaN(newCount) || newCount > 5) {
      return;
    }

    if(cellG.dataset.id === undefined || input.ind.value !== Number.parseInt(cellG.dataset.id)) {
      console.warn('mismatch of focused cell:');
      console.info(`  internal reactive state: ${ input.ind.value }`);
      console.log(`  DOM/SVG element configuration: ${ cellG.dataset.id }`);
    }
    input.vals.value[input.ind.value] = newCount;
  }
  initKeyNav(ev);
}
function releaseKey(ev: KeyboardEvent) {
  const key = ev.key;
  if(!isCellCountKey(key)) {
    console.warn('cell count setter triggered by unexpected keyboard key: ' + key);
    return;
  }
  keyIsDown[key] = false;
}

function initKeyNav(ev: KeyboardEvent) {
  emit('keyboardNav', ev, props.id);
}

defineExpose({ cell, focus, hasFocus });

</script>

<template>
  <g ref="cellRoot" class="cell" :data-id="cell.id" @click="focus" :tabindex="cell.id + 1" @keydown.0.1.2.3.4.5.delete="setCellCount" @keyup.0.1.2.3.4.5="releaseKey" @keydown.enter.tab.delete.up.down.left.right.stop.prevent="initKeyNav">
    <path :d="dStr" :data-id="cell.id" :data-lines="cell.l.map(l => l.id)"
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
