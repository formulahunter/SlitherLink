<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { useStore } from 'src/model';

defineOptions({
  name: 'SVGGameBoard'
});

const cellRadius = 0.98;

const { game, data, view } = useStore();
const { backdrop: bd, global, svg } = view;

let keyLock: string | false = false;

function setCellCount(ev: KeyboardEvent) {
  if(keyLock) {
    return false;
  }
  keyLock = ev.key;

  const val = Number(ev.key);
  if(!Number.isNaN(val) && val < 6) {
    data.input.vals.value[data.input.ind.value] = val;
  }
  else if(ev.key === 'Backspace' || ev.key === 'Delete') {
    delete data.input.vals.value[data.input.ind.value];
  }
}
function advanceCell(ev: KeyboardEvent) {
  if(keyLock && ev.key !== keyLock) {
    return false;
  }
  keyLock = false;

  //  enter/tab ==> next
  //    +shift ==> prev
  //  delete ==> clear & next
  //  backspace ==> clear & prev
  if(ev.key.startsWith('Arrow')) {
    const c = game.struct.value.cells[data.input.ind.value];
    let n;
    if(ev.key === 'ArrowDown') {
      n = c.n[4] || c.n[5];
    }
    else if(ev.key === 'ArrowUp') {
      n = c.n[1] || c.n[2];
    }
    else if(ev.key === 'ArrowRight') {
      n = c.n[3] || c.n[4] || c.n[2];
    }
    else if(ev.key === 'ArrowLeft') {
      n = c.n[0] || c.n[1] || c.n[5];
    }

    if(n !== undefined) {
      data.input.ind.value = n.id;
    }
  }
  else if(ev.key === 'Backspace' || ev.shiftKey) {
    data.input.ind.value--;
    if(data.input.ind.value < 0) {
      data.input.ind.value = data.input.vals.value.length - 1;
    }
  }
  else {
    data.input.ind.value++;
    if(data.input.ind.value >= data.input.vals.value.length) {
      data.input.ind.value = 0;
    }
  }
}

</script>

<template>
  <div>
    <svg :viewBox="svg.vbStr.value" xmlns="http://www.w3.org/2000/svg" :tabindex="0" @keydown.0.1.2.3.4.5.delete="setCellCount" @keyup.0.1.2.3.4.5.enter.tab.delete.up.down.left.right="advanceCell" @mousedown="() => global.pan.start()" @mouseup="() => global.pan.stop()" @mousemove="(ev) => global.pan.update(ev)" @wheel.prevent="(ev) => global.zoom.update(ev)">
      <g :transform="global.transformStr.value">
        <g :transform="bd.originStr.value">
          <image v-if="bd.href.value !== ''" :href="bd.href.value" :transform="bd.alignStr.value"/>
        </g>
        <SVGCell v-for="c of game.struct.value.cells" :cell="c" :r="cellRadius" :count="data.input.vals.value[c.id]" :focused="c.id === data.input.ind.value" :key="c.id" />
        <SVGLine v-for="l of game.struct.value.lines" :line="l" :focused="l.c.map(c => c?.id).includes(data.input.ind.value)" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style lang="sass">
svg *
  vector-effect: non-scaling-stroke

</style>
