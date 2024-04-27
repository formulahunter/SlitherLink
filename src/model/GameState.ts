import alea from 'alea';
import { GameCell, GameLine, GameState, GameStruct, LineState } from 'src/model';


export function initState(board: GameStruct): GameState {
  return {
    sol: [],
    c: [],
    l: new Array(board.const.L).fill(LineState.DEFAULT),
  };
}

export function* generateRandomSolution(board: GameStruct, state: GameState, seed?: number | string): Generator<number, void, number[]> {
  //  get an array of cells/ids in random order
  const cellIds: number[] = board.cells.filter(c => c).map(c => c.id);
  const shuffle = randomIterator(cellIds);


  //  initialize sorting arrays & result
  const even: GameCell[] = [];
  const odd: GameCell[] = [];
  const sol: GameLine[] = [];

  //  1. designate a random starting cell `curr`
  //  2. add `curr` to `odd` and respective lines to `sol`
  //  3. remove `curr` from `cells`
  //  4. reassign `curr` as `prev`
  //  5. for each neighbor `n` of `curr` in random order:
  //    a. if `n` is not in `cells`, skip to next
  //    b. restart at (2) with neighbor `n` as `curr`
  //

}

export interface UpdateIterator<T> {
  add: T[];
  rem: T[];
}
export function* randomIterator<T>(values: T[], seed = Math.random()): Generator<T, T[], UpdateIterator<T>> {
  const prng = alea(seed);
  const shuffled: T[] = Array.from(values);
  const exclude: T[] = [];
  const result: T[] = [];
  for(let i = 0; i < shuffled.length - 1; i++) {
    const j = (prng() * (shuffled.length - i) | 0) + i;
    const t = shuffled[j];
    shuffled[j] = shuffled[i];
    shuffled[i] = t;

    if(exclude.includes(t)) {
      continue;
    }

    result.push(t);
    const update = yield t;
    if(update.add.length) {
      shuffled.push(...update.add);
    }
    if(update.rem.length) {
      exclude.push(...update.rem);
    }
  }
  return result;
}
