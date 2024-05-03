<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { useStore } from 'src/model';

defineOptions({
  name: 'SVGGameBoard'
});

const cellRadius = 0.98;

const { bd, game, input, view } = useStore();

let keyLock: string | false = false;

function setCount(ev: KeyboardEvent) {
  if(keyLock) {
    return false;
  }
  keyLock = ev.key;

  const val = Number(ev.key);
  if(!Number.isNaN(val) && val < 6) {
    input.value.vals[input.value.ind] = val;
  }
  else if(ev.key === 'Backspace' || ev.key === 'Delete') {
    delete input.value.vals[input.value.ind];
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
    const c = game.struct.value.cells[input.value.ind];
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
      input.value.ind = n.id;
    }
  }
  else if(ev.key === 'Backspace' || ev.shiftKey) {
    input.value.ind--;
    if(input.value.ind < 0) {
      input.value.ind = input.value.vals.length - 1;
    }
  }
  else {
    input.value.ind++;
    if(input.value.ind >= input.value.vals.length) {
      input.value.ind = 0;
    }
  }
}

</script>

<template>
  <div>
    <svg :viewBox="view.svg.vbStr.value" xmlns="http://www.w3.org/2000/svg" :tabindex="0" @keydown.0.1.2.3.4.5.delete="setCount" @keyup.0.1.2.3.4.5.enter.tab.delete.up.down.left.right="advanceCell" @mousedown="() => view.pan.start()" @mouseup="() => view.pan.stop()" @mousemove="(ev) => view.pan.update(ev)" @wheel.prevent="(ev) => view.zoom.update(ev)">
      <g :transform="view.globalTransformStr.value">
        <g :transform="bd.originStr.value">
          <image v-if="bd.href.value !== ''" :href="bd.href.value" :transform="bd.alignStr.value"/>
        </g>
        <SVGCell v-for="c of game.struct.value.cells" :cell="c" :r="cellRadius" :count="input.vals[c.id]" :focused="c.id === input.ind" :key="c.id" />
        <SVGLine v-for="l of game.struct.value.lines" :line="l" :focused="l.c.map(c => c?.id).includes(input.ind)" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style lang="sass">
svg *
  vector-effect: non-scaling-stroke

</style>
