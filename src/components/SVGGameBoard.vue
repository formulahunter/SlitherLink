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

function walkBoard(targetId: number) {
  //  SVGCell handles KB event, sets own count/value, provides a NAV_KEY
  //  and NAV_DIR
  //  useRawData attempts to identify a nav target (cell)
  //  SVGGameBoard focuses designated cell, if any
  //  that's the idea, anyway...

  const newComp = cells.value.find(inst => inst !== null && inst.id === targetId);
  if(!newComp) {
    console.warn('native HTML focus not applied -- new cell index has been set in internal reactive state, but unable to identify the corresponding component ref');
    return;
  }
  newComp.focus();

  //  goal is to factor out this internal state & let the browser manage
  //  focus natively/organically
  data.ind.value = targetId;
}

</script>

<template>
  <div>
    <svg :viewBox="svg.vbStr.value" xmlns="http://www.w3.org/2000/svg" :tabindex="0" @mousedown="() => global.pan.start()" @mouseup="() => global.pan.stop()" @mousemove="(ev) => global.pan.update(ev)" @wheel.prevent="(ev) => global.zoom.update(ev)">
      <g :transform="global.transformStr.value">
        <g :transform="bd.originStr.value">
          <image v-if="bd.href.value !== ''" :href="bd.href.value" :transform="bd.alignStr.value"/>
        </g>
        <SVGCell v-for="c of game.struct.value.cells.rowMajor" :key="c.id" ref="cells" :id="c.id" @keyboardNav="walkBoard" />
        <SVGLine v-for="l of game.struct.value.lines" :line="l" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style lang="sass">
svg *
  vector-effect: non-scaling-stroke

</style>
