export interface GameState {
  /** cell counts generated for the solution, as array of [cell id, cell count] */
  c: [number, number][];

  /** current line state (enum value) for every line on the board, indexed by id */
  l: LineState[];
}

export enum LineState {
  DEFAULT,
  FILLED,
  EMPTY,
}
