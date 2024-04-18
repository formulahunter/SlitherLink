<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import {
  GameCell,
  GameLine,
  GameVert,
  generateRandomSolution,
  initBoard,
  initState,
  randomIterator,
  LineState, UpdateIterator
} from 'src/model';
import { computed, onMounted, Ref, ref, shallowRef } from 'vue';

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

const defCells = computed(() => cells.value.filter(c => c));

const pool: Ref<number[]> = ref([]);
const path: Ref<number[]> = ref([]);
const bank: Ref<number[]> = ref([]);
const excl: Ref<number[]> = ref([]);

const cellSpacing = 2;
const cellRadius = 0.98;

let step: (() => void) | null = null;

function getCellState(cid: number): number {
  if(pool.value[cid]) {
    return 3;
  }
  if(excl.value[cid]) {
    return 2;
  }
  if(bank.value[cid]) {
    return 1;
  }
  return 0;
}

onMounted(() => {

  const board = initBoard(props.r, cellSpacing);
  cells.value = board.cells;
  lines.value = board.lines;
  verts.value = board.verts;

  pool.value = new Array(board.cells.length).fill(0);
  path.value = new Array(board.lines.length).fill(0);
  bank.value = new Array(board.cells.length).fill(0);
  excl.value = new Array(board.cells.length).fill(0);

  const aspectRatio = 1.6;
  const viewH = (board.const.H + 2) * cellSpacing;
  const viewW = viewH * aspectRatio;
  const vMin = -viewH / 2;
  const uMin = vMin * aspectRatio;

  viewBox.value = [uMin, vMin, viewW, viewH];

  const state = initState(board);
  // step = generateRandomSolution(board, state, 'seed');

  // const nums = iterateRand<number>([0, 1, 2, 3, 4, 5, 6, 7]);
  // let result = nums.next();
  // while(!result.done) {
  //   console.log(result.value);
  //   if(result.value === 2) {
  //     result = nums.next([8, 9, 10, 11])
  //   }
  //   else {
  //     result = nums.next();
  //   }
  // }

  const cellIds = board.cells.filter(c => c).map(c => c.id);
  // const centerId = cellIds[cellIds.length / 2 | 0];
  const startId = cellIds[Math.random() * cellIds.length | 0];
  const startBank: number[] = [];
  for(let i = 0; i < 6; i++) {
    const n = board.cells[startId].n[i];
    if(n) {
      bank.value[n.id]++;
      startBank.push(n.id);
    }
  }
  pool.value[startId] = 1;

  const randomCells = randomIterator(startBank);
  let update: UpdateIterator<number> = {add: [], rem: []};
  step = function() {
    const result = randomCells.next(update);
    if(result.done) {
      console.log(`added cells: [${result.value.join(', ')}]`);
      step = null;
      return;
    }
    update = addToPool(result.value);
  }
  // while(step) {
  //   step();
  // }
});

function stepSolution() {
  if(!step) {
    return;
  }
  step();
}

function addToPool(cid: number): UpdateIterator<number> {
  //  ignore:
  //  - cells already in the pool
  //  - cells not in the bank
  //  - excluded cells
  if(pool.value[cid] || excl.value[cid] || !bank.value[cid]) {
    return {add: [], rem: []};
  }

  const c = cells.value[cid];

  const iterUpdate: UpdateIterator<number> = {add: [], rem: []};
  for(let i = 0; i < 6; i++) {
    if(c.n[i] === undefined) {
      continue;
    }

    const nid = c.n[i].id;
    bank.value[nid]++;
    if(bank.value[nid] === 1) {
      iterUpdate.add.push(nid);
    }
    else if(bank.value[nid] > 2) {
      excl.value[nid] = 1;
      iterUpdate.rem.push(nid);
    }
  }
  pool.value[cid] = 1;
  return iterUpdate;
}

</script>

<template>
  <div>
    <svg :viewBox="viewBoxStr" xmlns="http://www.w3.org/2000/svg" @click="stepSolution">
      <SVGCell v-for="c of defCells" :cell="c" :r="cellRadius" :state="getCellState(c.id)" :key="c.id" @click.stop="() => addToPool(c.id)" />
      <SVGLine v-for="l of lines" :line="l" :state="LineState.DEFAULT" :onPath="l.c.filter(c => c && pool[c.id]).length === 1" :key="l.id" />
    </svg>
  </div>
</template>

<style scoped>

</style>
