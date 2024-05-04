<script setup lang="ts">
import SVGCell from 'components/SVGCell.vue';
import SVGLine from 'components/SVGLine.vue';
import { useStore } from 'src/model';
import { Ref, ref } from 'vue';

defineOptions({
  name: 'SVGGameBoard'
});

const { game, view } = useStore();
const { backdrop: bd, global, svg } = view;

const cells: Ref<(InstanceType<typeof SVGCell> | null)[]> = ref([]);

/** `NAV_DIR` is defined such that the first (smallest) bit gives the axis
 * (horizontal is 0, vertical is 1) and 2nd bit direction on that axis
 * (0 => negative, 1 => positive)
 *
 * with this definition, horizontal directions are even (% 2 === 0) and
 * vertical directions are odd (% 2 === 1); the opposite of `NAV_DIR[n]`
 * is given by `NAV_DIR[(n + 2) % 4]`.
 *
 * no evidence yet, but this may also be useful/convenient w.r.t. indexing
 * a cell's vertices, lines, and neighboring cells -- those references are
 * incidentally also ordered clockwise from the left...
 *
 * values can be mapped to indexes in `c.n`; for direction `NAV_DIR[n]`,
 * the principle (i- and j-aligned) neighbor indices can be found as:
 *
 *     axis := n & 0b01;    //  bitwise `AND` operator (&)
 *     parity := n & 0b10;  //
 *     i_n = axis + 1.5 * parity;
 *
 * tested for:
 * - NAV_DIR.Left = 0 ==> c.n[0]
 * - NAV_DIR.Up = 1 ==> c.n[1]
 * - NAV_DIR.Right = 2 ==> c.n[3]
 * - NAV_DIR.Down = 3 ==> c.n[4]
 */
enum NAV_DIR {
  Left = 0b00,  // = 0
  Up = 0b01,    // = 1
  Right = 0b10, // = 2
  Down = 0b11,  // = 3
}
enum NAV_KEY {
  ArrowLeft,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Delete,
  Backspace,
  Tab,    //  these two keys can be modified with 'shift'
  Enter,  //  see note on finding opposite directions in `NAV_DIR`
}
function isNavKey(key: string): key is keyof typeof NAV_KEY {
    return key in NAV_KEY;
}

const keyDirMap = new Map<NAV_KEY, NAV_DIR>([
  [ NAV_KEY.ArrowUp, NAV_DIR.Up ],
  [ NAV_KEY.ArrowDown, NAV_DIR.Down ],
  [ NAV_KEY.ArrowLeft, NAV_DIR.Left ],
  [ NAV_KEY.ArrowRight, NAV_DIR.Right ],
  [ NAV_KEY.Delete, NAV_DIR.Right ],
  [ NAV_KEY.Backspace, NAV_DIR.Left ],
  [ NAV_KEY.Tab, NAV_DIR.Right ],
  [ NAV_KEY.Enter, NAV_DIR.Down ],
]);
const keyDirMapShiftRev = new Map<NAV_KEY, NAV_DIR>([
  [ NAV_KEY.ArrowUp, NAV_DIR.Up ],
  [ NAV_KEY.ArrowDown, NAV_DIR.Down ],
  [ NAV_KEY.ArrowLeft, NAV_DIR.Left ],
  [ NAV_KEY.ArrowRight, NAV_DIR.Right ],
  [ NAV_KEY.Delete, NAV_DIR.Right ],
  [ NAV_KEY.Backspace, NAV_DIR.Left ],
  [ NAV_KEY.Tab, NAV_DIR.Left ],
  [ NAV_KEY.Enter, NAV_DIR.Up ],
]);


function walkBoard(ev: KeyboardEvent, currentId: number) {
  //  arrow keys ==> up/down/right/left (no wrapping)
  //  enter +/-shift ==> up/down (with wrapping)
  //  tab +/-shift ==> right/left (with wrapping)
  //  delete ==> clear & right (with wrapping)
  //  backspace ==> clear & left (with wrapping)
  //
  //  "next"  (+i): right + tab + delete
  //  "prev"  (-i): left, shift+tab, backspace
  //  "below" (+j): down + enter
  //  "above" (-j): up, shift+enter

  //  initially assume far from borders, so wrapping is irrelevant
  //  use grid coordinates and/or neighbor references to identify next focus target
  //  if coords out of bounds/neighbor refs undefined:
  //  - if wrapping, use row/col major cell arrays
  //  - else check grid/neighbors adjacent to NAV_DIR

  const keyName = ev.key;
  if(!isNavKey(keyName)) {
    return;
  }
  const key = NAV_KEY[keyName];

  const dirMap = ev.shiftKey ? keyDirMapShiftRev : keyDirMap;
  const dir = dirMap.get(key);
  if(dir === undefined) {
    return;
  }

  const axis = dir & 0b01;
  const parity = dir & 0b10;
  const sign = parity - 1;

  const indN = axis + parity * 1.5;

  const c = game.struct.value.cells.rowMajor[currentId];
  let newId = c.n[indN]?.id;

  if(newId === undefined) {
    const wrap = key > NAV_KEY.ArrowDown;

    const dij = [0, 0];
    dij[axis] = sign;
    const ij: [number, number] = [c.coord[0], c.coord[1]];
    ij[axis] += sign;

    const { colMajor: colMaj, rowMajor: rowMaj } = game.struct.value.cells;
    if(wrap) {
      const cellsArray = axis === 0 ? rowMaj : colMaj;
      let ind = cellsArray.indexOf(c) + sign;
      if(ind >= cellsArray.length) {
        ind = 0;
      }
      else if(ind < 0) {
        ind = cellsArray.length - 1;
      }
      newId = cellsArray[ind].id;
    }
    else {
      newId = c.n[indN + 1]?.id;
      if(newId === undefined && axis === 0) {
        newId = c.n[(indN + 5) % 6]?.id;
      }
    }
  }

  const newComp = cells.value.find(inst => inst !== null && inst.id === newId);
  if(!newComp) {
    console.warn('native HTML focus not applied -- new cell index has been set in internal reactive state, but unable to identify the corresponding component ref');
    return;
  }
  newComp.focus();
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
