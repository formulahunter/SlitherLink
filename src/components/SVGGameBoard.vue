<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { GameCell, GameLine, GameVert, initBoard, LineState } from 'src/model';
import { computed, onMounted, shallowRef } from 'vue';


defineOptions({
  name: 'SVGGameBoard'
});

const props = defineProps<{
  r: number;
}>();

const viewBox = shallowRef<[number, number, number, number]>([-5, -5, 20, 20]);
const viewBoxStr = computed(() => viewBox.value.join(' '));

const cells = shallowRef<GameCell[]>([]);
const lines = shallowRef<GameLine[]>([]);
const verts = shallowRef<GameVert[]>([]);

const cellSpacing = 2;
const cellRadius = 0.98;

onMounted(() => {

  const board = initBoard(props.r, cellSpacing);
  cells.value = board.cells.filter(c => c);
  lines.value = board.lines;
  verts.value = board.verts;

  const aspectRatio = 1.6;
  const viewH = (board.const.H + 2) * cellSpacing;
  const viewW = viewH * aspectRatio;
  const vMin = -viewH / 2;
  const uMin = vMin * aspectRatio;

  viewBox.value = [uMin, vMin, viewW, viewH];
});


</script>

<template>
  <div>
    <svg :viewBox="viewBoxStr" xmlns="http://www.w3.org/2000/svg">
      <SVGCell v-for="c of cells" :cell="c" :r="cellRadius" :key="c.id" />
      <SVGLine v-for="l of lines" :line="l" :state="LineState.DEFAULT" :key="l.id" />
    </svg>
  </div>
</template>

<style scoped>

</style>
