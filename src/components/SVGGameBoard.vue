<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { useStore } from 'src/model';
import { Ref, ref } from 'vue';

defineOptions({
  name: 'SVGGameBoard'
});

const { game, data, view } = useStore();
const { backdrop: bd, global, svg } = view;

const cells: Ref<(InstanceType<typeof SVGCell> | null)[]> = ref([]);

function advanceCell(ev: KeyboardEvent, currentId: number) {
  //  enter ==> next
  //    +shift ==> prev
  //  delete ==> clear & next
  //  backspace ==> clear & prev
  const key = ev.key;
  if(key.startsWith('Arrow')) {
    const c = game.struct.value.cells[currentId]
    let n;
    if(key === 'ArrowDown') {
      n = c.n[4] || c.n[5];
    }
    else if(key === 'ArrowUp') {
      n = c.n[1] || c.n[2];
    }
    else if(key === 'ArrowRight') {
      n = c.n[3] || c.n[4] || c.n[2];
    }
    else if(key === 'ArrowLeft') {
      n = c.n[0] || c.n[1] || c.n[5];
    }

    if(n !== undefined) {
      data.input.ind.value = n.id;
    }
  }
  else if(key === 'Backspace' || ev.shiftKey) {
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

  const newComp = cells.value.find(inst => inst !== null && inst.cell.id === data.input.ind.value);
  if(!newComp) {
    console.warn('native HTML focus not applied -- new cell index has been set in internal reactive state, but unable to identify the corresponding component ref');
    return;
  }
  newComp.focus();
}

</script>

<template>
  <div>
<!--    <svg :viewBox="svg.vbStr.value" xmlns="http://www.w3.org/2000/svg" :tabindex="0" @keydown.0.1.2.3.4.5.delete="setCellCount" @keyup.0.1.2.3.4.5.enter.tab.delete.up.down.left.right="advanceCell" @mousedown="() => global.pan.start()" @mouseup="() => global.pan.stop()" @mousemove="(ev) => global.pan.update(ev)" @wheel.prevent="(ev) => global.zoom.update(ev)">-->
    <svg :viewBox="svg.vbStr.value" xmlns="http://www.w3.org/2000/svg" :tabindex="0" @mousedown="() => global.pan.start()" @mouseup="() => global.pan.stop()" @mousemove="(ev) => global.pan.update(ev)" @wheel.prevent="(ev) => global.zoom.update(ev)">
      <g :transform="global.transformStr.value">
        <g :transform="bd.originStr.value">
          <image v-if="bd.href.value !== ''" :href="bd.href.value" :transform="bd.alignStr.value"/>
        </g>
        <SVGCell v-for="c of game.struct.value.cells" :key="c.id" ref="cells" :id="c.id" @keyboardNav="advanceCell" />
        <SVGLine v-for="l of game.struct.value.lines" :line="l" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style lang="sass">
svg *
  vector-effect: non-scaling-stroke

</style>
