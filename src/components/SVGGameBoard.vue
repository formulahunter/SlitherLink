<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { useStore } from 'src/model';

defineOptions({
  name: 'SVGGameBoard'
});

const cellRadius = 0.98;

const { bd, board, pz, svg } = useStore();

</script>

<template>
  <div>
    <svg ref="svgRoot" :viewBox="svg.vbStr.value" xmlns="http://www.w3.org/2000/svg" @mousedown="() => pz.startPanning()" @mouseup="() => pz.stopPanning()" @mousemove="(ev) => pz.updateOffset(ev)" @wheel.prevent="(ev) => pz.updateZoom(ev)">
      <g :transform="pz.transformStr.value">
        <g :transform="bd.originStr.value">
          <image v-if="bd.href.value !== ''" :href="bd.href.value" :transform="bd.alignStr.value"/>
        </g>
        <SVGCell v-for="c of board.cells" :cell="c" :r="cellRadius" :key="c.id" />
        <SVGLine v-for="l of board.lines" :line="l" :key="l.id" />
      </g>
    </svg>
  </div>
</template>

<style scoped>

</style>
