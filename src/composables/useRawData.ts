import { GameCell, GameStruct } from 'src/model';
import { MaybeRef, Ref, ref, toValue, watchEffect } from 'vue';

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

/** all keyboard keys that affect cell counts/values */
enum VAL_KEY {
  K0,
  K1,
  K2,
  K3,
  K4,
  K5,
  Backspace,
  Delete,
}
function isValKey(key: string): key is keyof typeof VAL_KEY {
  return key in VAL_KEY || 'K' + key in VAL_KEY;
}

/** all keyboard keys that affect navigation
 *
 * setting a cell's count results in focus automatically advancing to the
 * next cell, so the numeric keys 0-5 are effectively navigation keys in
 * addition to value keys. in this context, considering them this way
 * simplifies the navigation event management as all keyboard events that
 * *might* affect navigation can be routed through a single, unified pipeline.
 * events that also concern the cell value can then be screened for additional
 * processing.
 */
enum NAV_KEY {
  K0 = VAL_KEY.K0,
  K1 = VAL_KEY.K1,
  K2 = VAL_KEY.K2,
  K3 = VAL_KEY.K3,
  K4 = VAL_KEY.K4,
  K5 = VAL_KEY.K5,
  Backspace = VAL_KEY.Backspace,
  Delete = VAL_KEY.Delete,
  Tab,           //  these two keys can be modified with 'shift'
  Enter,         //  see note on finding opposite directions in `NAV_DIR`
  ArrowLeft,
  ArrowUp,
  ArrowRight,
  ArrowDown,
}
function isNavKey(key: string): key is keyof typeof NAV_KEY {
  return key in NAV_KEY || 'K' + key in NAV_KEY;
}

const keyDirMap: Map<NAV_KEY, NAV_DIR> = new Map([
  [NAV_KEY.ArrowUp, NAV_DIR.Up],
  [NAV_KEY.ArrowDown, NAV_DIR.Down],
  [NAV_KEY.ArrowLeft, NAV_DIR.Left],
  [NAV_KEY.ArrowRight, NAV_DIR.Right],
  [NAV_KEY.Delete, NAV_DIR.Right],
  [NAV_KEY.Backspace, NAV_DIR.Left],
  [NAV_KEY.Tab, NAV_DIR.Right],
  [NAV_KEY.Enter, NAV_DIR.Down],
  [NAV_KEY.K0, NAV_DIR.Right],
  [NAV_KEY.K1, NAV_DIR.Right],
  [NAV_KEY.K2, NAV_DIR.Right],
  [NAV_KEY.K3, NAV_DIR.Right],
  [NAV_KEY.K4, NAV_DIR.Right],
  [NAV_KEY.K5, NAV_DIR.Right],
]);
function directionForKey(key: NAV_KEY, revModifier: boolean): NAV_DIR {
  const dir = keyDirMap.get(key);
  if(dir === undefined) {
    console.error('unrecognized NAV_KEY: %o', key);
    throw new Error('invalid NAV_KEY ' + key);
  }

  if(revModifier) {
    return (dir + 2) % 4;
  }
  return dir;
}

const inputVals: Ref<number[]> = ref([]);
const inputInd = ref(0);

const cells: Ref<{ rowMajor: GameCell[], colMajor: GameCell[] }> = ref({ rowMajor: [], colMajor: [] });

/** evaluate navigation (keyboard) input & identify the intended target,
 * subject to the following mechanics:
 *
 * arrow keys ==> up/down/right/left (no wrapping)
 * enter +/-shift ==> up/down (with wrapping)
 * tab +/-shift ==> right/left (with wrapping)
 * delete ==> clear & right (with wrapping)
 * backspace ==> clear & left (with wrapping)
 *
 * grouped by direction:
 *
 * "next"  (+i): right arrow, tab, delete
 * "prev"  (-i): left arrow, shift+tab, backspace
 * "below" (+j): down arrow, enter
 * "above" (-j): up arrow, shift+enter
 *
 * notwithstanding the skewed axes, arrow keys are probably the most intuitive
 * for moving around quickly, but they stop at the edges of the board. tab
 * and enter are meant to handle most of the traversal while entering board
 * data, similar to a spreadsheet. backspace and delete clear individual
 * cell values, automatically jumping to the previous/next cell, respectively
 * (the only reason to stay in place in that scenario would be to enter
 * a replacement value, and the numeric keys overwrite existing values by
 * default).
 *
 * this function will fail to find a target id if (and only if) attempting
 * to traverse beyond the board edges using the arrow keys. other than that,
 * it will always return a valid id for a target cell to receive focus.
 *
 *
 * details/discussion:
 *
 * the algorithm implemented herein is fairly abstracted, mostly in hopes
 * of mitigating performance load -- my laptop is a bit choppy with the
 * graphics bits as it is...
 *
 * starting with the assumption that this is happening away from any board
 * edges, the current cell's neighbor in the indicated direction is checked
 * and, if defined, its id is designated as the new target. otherwise, the
 * next steps condense what would be some a set of conditionals 3 or 4 blocks
 * deep into a rather succinct set of array lookups by way of some crafty
 * index math. if the pressed key wraps around the board on exceeding its
 * borders, cells are accessed via one of two flat, continuous arrays so
 * that a simple min/max index check is all that's needed; if not -- namely,
 * when using the arrow keys -- the cell's neighbors are checked again for
 * any adjacent to the target direction, starting to the right (which is
 * considered a valid alternate direction for both axes) and deferring to
 * the left only for horizontal target directions.
 *
 */
function findNavTarget(key: NAV_KEY, dir: NAV_DIR, currentId: number): number | undefined {

  const axis = dir & 0b01;
  const parity = dir & 0b10;
  const sign = parity - 1;
  const indN = axis + parity * 1.5;

  const c = cells.value.rowMajor[currentId];

  let newId = c.n[indN]?.id;
  if(newId === undefined) {
    const { colMajor: colMaj, rowMajor: rowMaj } = cells.value;

    const wrap = key < NAV_KEY.ArrowLeft;
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

  return newId;
}

type KeyNames = keyof typeof NAV_KEY;
const keyIsDown: {[k in KeyNames]: boolean} = {
  K0: false,
  K1: false,
  K2: false,
  K3: false,
  K4: false,
  K5: false,
  Tab: false,
  Enter: false,
  Delete: false,
  Backspace: false,
  ArrowLeft: false,
  ArrowUp: false,
  ArrowRight: false,
  ArrowDown: false,
};
function setCellCount(key: VAL_KEY, currentId: number) {
  if(key === VAL_KEY.Backspace || key === VAL_KEY.Delete) {
    delete inputVals.value[currentId];
  }
  else {
    inputVals.value[currentId] = key;
  }
}
function releaseKey(ev: KeyboardEvent) {
  const keyName = prefixNumericKeys(ev.key);
  if(!isNavKey(keyName)) {
    console.warn('cell keyboard release triggered by unexpected keyboard key: ' + keyName);
    return;
  }
  keyIsDown[keyName] = false;
}

function prefixNumericKeys(key: string): string {
  //  this RegExp replacement adds the 'K' prefix ONLY if it's missing
  return key.replace(/K?([0-6])/, 'K$1');
}
function initKeyNav(ev: KeyboardEvent, currentId: number): number | void {
  const keyName = prefixNumericKeys(ev.key);
  if(!isNavKey(keyName)) {
    console.warn('cell keyboard nav triggered by unexpected keyboard key: ' + keyName);
    return;
  }
  const key = NAV_KEY[keyName];

  if(keyIsDown[keyName]) {
    return;
  }
  keyIsDown[keyName] = true;

  if(isValKey(keyName)) {
    setCellCount(VAL_KEY[keyName], currentId);
  }

  const dir = directionForKey(key, ev.shiftKey);
  return findNavTarget(key, dir, currentId);
}

export function useRawData(struct: MaybeRef<GameStruct>) {
  watchEffect(() => {
    //  only overwrite input values if board size changes
    const structVal = toValue(struct);
    const newVal = structVal.const.C;
    const oldVal = inputVals.value.length;
    if(newVal === oldVal) {
      return;
    }
    inputVals.value = new Array(newVal);
    inputInd.value = 0;
    cells.value = structVal.cells;
  });

  return {
    vals: inputVals,
    ind: inputInd,
    nav: {
      NAV_KEY,
      VAL_KEY,
      isNavKey,
      isValKey,
      findTarget: findNavTarget,
      initKeyNav,
      setCellCount,
      releaseKey,
    }
  };
}
