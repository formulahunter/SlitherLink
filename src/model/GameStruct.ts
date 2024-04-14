type Coord = [ number, number ];

export interface GameStruct {
  R: number;
  cells: GameCell[];
  lines: GameLine[];
  verts: GameVert[];
}

/** hexagonal cell defined by six vertices connected by six lines
 *
 * cell count, if defined, is recorded in `GameState` (to avoid data duplication)
 */
export interface GameCell {
  id: number;

  /** position of cell's geometric center */
  pos: {
    /** grid coordinates (i, j) */
    grid: Coord;

    /** relative coordinates (u, v) */
    rel: Coord;
  };

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

  /** vertex position */
  pos: {
    /** relative coordinates (u, v) */
    rel: [number, number];
  };

  /** vertex lines, where defined */
  l: [GameLine?, GameLine?, GameLine?];
}


export function getCellCount(r: number): number {
  //  6((1/2)(r^2 - r)) + 1
  return (3 * r + 3) * r + 1;
}
export function getLineCount(r: number): number {
  //  6((3/2)r^2 + (5/2)r + 1)
  return (9 * r + 15) * r + 6;
}
export function getVertCount(r: number): number {
  //  6(r^2 + 2r + 1)
  return (6 * r + 12) * r + 6;
}

export function initBoard(R: number): GameStruct {

  const D = 2 * R;
  const S = D + 1;
  const W = S + 2;
  const H = S + 1;

  function coordsOfId(id: number): Coord {
    return [id % W, id / W | 0];
  }
  function idAtCoords(coords: Coord): number {
    return coords[1] * W + coords[0];
  }

  function coordsAreOnBoard(coords: Coord): boolean {
    if(coords[0] < 1 || coords[1] < 0 || coords[0] > S || coords[1] >= S) {
      return false;
    }
    if(coords[1] < R - coords[0] + 1 || coords[1] > 3 * R - coords[0] + 1) {
      return false;
    }
    return true;
  }
  function idIsOnBoard(id: number): boolean {
    return coordsAreOnBoard(coordsOfId(id));
  }

  const G = W * H;
  const C = getCellCount(R);
  const L = getLineCount(R);
  const V = getVertCount(R);

  /** flat, dense array of vertex objects, indexed by id */
  const verts: GameVert[] = [];
  for(let vid = 0; vid < V; vid++) {
    const v: GameVert = {
      id: vid,
      pos: {
        rel: [0, 0],
      },
      l: [],
    };
    verts[vid] = v;
  }

  /** flat, dense array of line objects, indexed by id */
  const lines: GameLine[] = [];
  for(let lid = 0; lid < L; lid++) {
    const l: GameLine = {
      id: lid,
      v: [verts[0], verts[0]],
      c: [],
    }
    lines[lid] = l;
  }

  /** flat, sparse array of cell objects; indexed by id */
  const cells: GameCell[] = [];

  /** flat, dense array of cell id's; indexed sequentially */
  const cellIds: number[] = [];

  /** cell ids by grid position (i, j); indexed as grid[j][i] */
  const grid: number[][] = new Array(H);

  for(let j = 0; j < H; j++) {
    grid[j] = new Array(W);
    for(let i = 0; i < W; i++) {
      if(!coordsAreOnBoard([i, j])) {
        continue;
      }

      const cid = idAtCoords([i, j]);
      grid[j][i] = cid;
      cellIds.push(cid);

      //  each cell has lines `l`, vertices `v`, and neighbors `n`
      const c: GameCell = {
        id: cid,
        pos: {
          grid: [i, j],
          rel: [0, 0],
        },
        l: [],
        v: [],
        n: [],
      };
      cells[cid] = c;

      //  get/define cell lines & cell neighbors
      if(coordsAreOnBoard([i - 1, j])) {
        const n = cells[idAtCoords([i - 1, j])];
        c.n[0] = n;
        n.n[3] = c;
        c.l[0] = n.l[3];
      }
      // else {
      //   c.l[0] =
      // }
    }
  }

  return {
    R,
    cells,
    lines,
    verts,
  };
}
