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

const keyDirMap = new Map<NAV_KEY, (NAV_DIR | ((shiftKey?: boolean) => NAV_DIR))>([
  [ NAV_KEY.ArrowUp, NAV_DIR.Up ],
  [ NAV_KEY.ArrowDown, NAV_DIR.Down ],
  [ NAV_KEY.ArrowLeft, NAV_DIR.Left ],
  [ NAV_KEY.ArrowRight, NAV_DIR.Right ],
  [ NAV_KEY.Delete, NAV_DIR.Right ],
  [ NAV_KEY.Backspace, NAV_DIR.Left ],
  [ NAV_KEY.Tab, (shiftKey?: boolean): NAV_DIR => shiftKey ? NAV_DIR.Left : NAV_DIR.Right ],
  [ NAV_KEY.Enter, (shiftKey?: boolean): NAV_DIR => shiftKey ? NAV_DIR.Up : NAV_DIR.Down ],
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
  const key = { name: '', val: Number.NaN };
  {
    const keyName = ev.key;
    if(!isNavKey(keyName)) {
      return;
    }
    key.name = keyName;
    key.val = NAV_KEY[keyName];
  }

  const maybeDir = keyDirMap.get(key.val);
  if(maybeDir === undefined) {
    return;
  }
  const dir = typeof maybeDir === 'function' ? maybeDir(ev.shiftKey) : maybeDir;

  //  initially assume far from borders and wrapping is irrelevant
  //  use grid coordinates and/or neighbor references to identify next focus target
  //  if coords out of bounds/neighbor refs undefined:
  //  - if wrapping, use row/col major cell arrays
  //  - else check grid/neighbors adjacent to NAV_DIR

  const axis = dir & 0b01;
  const sign = (dir & 0b10) - 1;  //  operator precedence makes parenthesis necessary

  const c = game.struct.value.cells.rowMajor[currentId];

  let n;
  switch(dir) {
    case NAV_DIR.Up:
      n = c.n[1];
      break;
    case NAV_DIR.Down:
      n = c.n[4];
      break;
    case NAV_DIR.Left:
      n = c.n[0];
      break;
    case NAV_DIR.Right:
      n = c.n[3];
      break;
    default:
      throw new Error('invalid nav direction: ' + dir);
  }

  const wrap = key.val > NAV_KEY.ArrowDown;

  const dij = [0, 0];
  dij[axis] = sign;
  const ij: [number, number] = [c.coord[0], c.coord[1]];
  ij[axis] += sign;

  const { colMajor: colMaj, rowMajor: rowMaj } = game.struct.value.cells;
  let newId;
  if(n === undefined) {
    if(wrap) {
      //  horizontal is simple -- just incrementing cell index/id
      //  vertical has been simplified by a new "column-major" cells array
      if(axis === 0) {
        const rowMajInd = rowMaj.indexOf(c);
        let newInd = rowMajInd + sign;
        if(newInd >= rowMaj.length) {
          newInd = 0;
        }
        else if(newInd < 0) {
          newInd = rowMaj.length - 1;
        }
        newId = rowMaj[newInd].id;
      }
      else if(axis === 1) {
        const colMajInd = colMaj.indexOf(c);
        let newInd = colMajInd + sign;
        if(newInd >= colMaj.length) {
          newInd = 0;
        }
        else if(newInd < 0) {
          newInd = colMaj.length - 1;
        }
        newId = colMaj[newInd].id;
      }
    }
    else {

    }
  }


  switch(dir) {
    case NAV_DIR.Left:
      newId = currentId - 1;
      if(wrap) {
        if(newId < 0) {
          newId = game.struct.value.cells.rowMajor.length - 1;
        }
      }
      else {
        n = c.n[0] || c.n[1] || c.n[5];
        if(n !== undefined) {
          newId = n.id;
        }
      }
      break;
    case NAV_DIR.Up:

      break;
    case NAV_DIR.Right:

      break;
    case NAV_DIR.Down:

  }
  if(dir === NAV_DIR.Left) {
    newId = currentId - 1;
    if(wrap) {
      if(newId < 0) {
        newId = game.struct.value.cells.rowMajor.length - 1;
      }
    }
    else {
      n = c.n[0] || c.n[1] || c.n[5];
      if(n !== undefined) {
        newId = n.id;
      }
    }
  }
  else if(dir === NAV_DIR.Right) {

  }
  else if(key.name === 'ArrowRight' || key.name === 'Delete' || key.name === 'Tab') {
    ij[0]++;
    n = c.n[3] || c.n[4] || c.n[2];
  }
  else if(key.name === 'ArrowUp' || (key.name === 'Enter' && ev.shiftKey)) {
    ij[1]--;
    n = c.n[1] || c.n[2];
  }
  else if(key.name === 'ArrowDown' || key.name == 'Enter') {
    ij[1]++;
    n = c.n[4] || c.n[5];
  }

  if(key.val <= NAV_KEY.ArrowDown) {
    const c = game.struct.value.cells.rowMajor[currentId]
    let n;
    if(key.val === NAV_KEY.ArrowDown) {
      n = c.n[4] || c.n[5];
    }
    else if(key.val === NAV_KEY.ArrowUp) {
      n = c.n[1] || c.n[2];
    }
    else if(key.val === NAV_KEY.ArrowRight) {
      n = c.n[3] || c.n[4] || c.n[2];
    }
    else if(key.val === NAV_KEY.ArrowLeft) {
      n = c.n[0] || c.n[1] || c.n[5];
    }

    if(n !== undefined) {
      data.input.ind.value = n.id;
    }
  }
  else if(key.name === 'Backspace' || ev.shiftKey) {
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

  const newComp = cells.value.find(inst => inst !== null && inst.id === data.input.ind.value);
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
