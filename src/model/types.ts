export type Coord = [number, number];

export enum LineState {
  DEFAULT,
  FILLED,
  EMPTY,
}

/** hexagonal cell defined by six vertices connected by six lines
 *
 * cell count, if defined, is recorded in `GameState` (to avoid data duplication)
 */
export interface GameCell {
  id: number;

  /** grid coordinates (i, j) */
  coord: Coord;

  /** cell lines, indexed clockwise from left */
  l: GameLine[];

  /** cell vertices, indexed clockwise from top left */
  v: GameVert[];

  /** cell neighbors, indexed to align with cell lines `l` */
  n: GameCell[];
}

/** line between two vertices, forming part of a cell's border
 *
 * line value is recorded in `GameState` (to avoid data duplication)
 */
export interface GameLine {
  id: number;

  /** line vertices, indexed as [start, end] */
  v: [GameVert, GameVert];

  /** line cells, where defined, indexed as [left, right] (when viewed from `start` vertex toward `end`) */
  c: [GameCell?, GameCell?];
}

/** vertex where two or three lines meet */
export interface GameVert {
  id: number;

  /** nominal coordinates (u, v) */
  nom: [number, number];

  /** vertex lines, where defined */
  l: [GameLine?, GameLine?, GameLine?];
}

/** data representing the raw structure of all game elements */
export interface GameStruct {
  R: number;
  const: {
    D: number;
    S: number;
    W: number;
    H: number;
    G: number;
    C: number;
    L: number;
    V: number;
  };
  cells: GameCell[];
  lines: GameLine[];
  verts: GameVert[];
}

/** data representing the point-in-time state of the game board */
export interface GameState {
  /** generated solution as an array of line states, indexed by line id */
  sol: LineState[];

  /** cell counts generated for the solution, as array of [cell id, cell count] */
  c: [number, number][];

  /** current line state (enum value) for every line on the board, indexed by id */
  l: LineState[];
}

/** backdrop image data for display as an SVG <image> */
export interface BackdropData {
  file: File | null;
  size: [number, number];
  href: string;
  datums: {
    nu0: number;
    nud: number;
    mur: number;
  };
}
