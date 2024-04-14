type Coord = [ number, number ];

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

/**
 *
 * @param R
 * @param cellSpacing - distance (in rel. coords) between cell centers
 */
export function initBoard(R: number, cellSpacing: number): GameStruct {

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

  const deg60 = Math.PI / 3;
  const cos60 = Math.cos(deg60);
  const sin60 = Math.sin(deg60);

  const i0 = R + 1;
  const j0 = R;
  function gridToRel(gridCoord: Coord): Coord {
    return [
      cellSpacing * ((gridCoord[0] - i0) + (gridCoord[1] - j0) * cos60),
      cellSpacing * (gridCoord[1] - j0) * sin60,
    ];
  }

  const offsetRadius = cellSpacing / (2 * Math.cos(deg60 / 2));
  const vertOffsets: Coord[] = [];
  for(let i = -2.5; i < 3; i++) {
    const radians = i * deg60;
    vertOffsets.push([
      offsetRadius * Math.cos(radians),
      offsetRadius * Math.sin(radians),
    ]);
  }

  const G = W * H;
  const C = getCellCount(R);
  const L = getLineCount(R);
  const V = getVertCount(R);

  /** flat, dense array of vertex objects, indexed by id */
  const verts: GameVert[] = [];

  /** flat, dense array of line objects, indexed by id */
  const lines: GameLine[] = [];

  /** flat, sparse array of cell objects; indexed by id */
  const cells: GameCell[] = [];

  /** flat, dense array of cell id's; indexed sequentially */
  const cellIds: number[] = [];

  /** cell ids by grid position (i, j); indexed as grid[j][i] */
  const grid: number[][] = new Array(H);

  for(let j = 0; j < H; j++) {
    grid[j] = new Array(W);
    for(let i = 0; i < W; i++) {
      const gridCoord: Coord = [i, j];
      if(!coordsAreOnBoard(gridCoord)) {
        continue;
      }

      const cid = idAtCoords([i, j]);
      grid[j][i] = cid;
      cellIds.push(cid);

      const relCoord = gridToRel(gridCoord);

      //  each cell has lines `l`, vertices `v`, and neighbors `n`
      const c: GameCell = {
        id: cid,
        pos: {
          grid: gridCoord,
          rel: relCoord,
        },
        l: [],
        v: [],
        n: [],
      };
      cells[cid] = c;

      //  get/define all cell neighbors, lines, & vertices

      const n1 = j > 0 && cells[grid[j - 1][i]];
      const n2 = j > 0 && cells[grid[j - 1][i + 1]];
      const n0 = i > 0 && cells[grid[j][i - 1]];
      if(n1) {
        //  define n1 & reciprocal
        c.n[1] = n1;
        n1.n[4] = c;

        //  get existing l1 object ref & add c to it
        c.l[1] = n1.l[4];
        c.l[1].c[1] = c;

        //  get existing v0 and v1 object refs
        c.v[0] = n1.v[4];
        c.v[1] = n1.v[3];
      }
      else {
        if(n0) {
          //  get existing v0 object ref
          c.v[0] = n0.v[2];
        }
        else {
          //  define v0 & add to c
          const v0: GameVert = {
            id: verts.length,
            pos: {
              rel: [
                relCoord[0] + vertOffsets[0][0],
                relCoord[1] + vertOffsets[0][1],
              ],
            },
            l: [],
          };
          verts[v0.id] = v0;
          c.v[0] = v0;
        }
        if(n2) {
          //  get existing v1 object ref
          c.v[1] = n2.v[5];
        }
        else {
          //  define v1 & add to c
          const v1: GameVert = {
            id: verts.length,
            pos: {
              rel: [
                relCoord[0] + vertOffsets[1][0],
                relCoord[1] + vertOffsets[1][1],
              ],
            },
            l: [],
          };
          verts[v1.id] = v1;
          c.v[1] = v1;
        }
      }
      if(n2) {
        //  define n2 & reciprocal
        c.n[2] = n2;
        n2.n[5] = c;

        //  get existing l2 object ref & add c to it
        c.l[2] = n2.l[5];
        c.l[2].c[1] = c;

        //  get existing v2 object ref
        c.v[2] = n2.v[4];
      }
      else {
        const v2: GameVert = {
          id: verts.length,
          pos: {
            rel: [
              relCoord[0] + vertOffsets[2][0],
              relCoord[1] + vertOffsets[2][1],
            ],
          },
          l: [],
        };
        verts[v2.id] = v2;
        c.v[2] = v2;
      }
      if(n0) {
        //  define n0 & reciprocal
        c.n[0] = n0;
        n0.n[3] = c;

        //  get existing l0 object ref & add c to it
        c.l[0] = n0.l[3];
        c.l[0].c[1] = c;

        //  get existing v5 object ref
        c.v[5] = n0.v[3];
      }
      else {
        const v5: GameVert = {
          id: verts.length,
          pos: {
            rel: [
              relCoord[0] + vertOffsets[5][0],
              relCoord[1] + vertOffsets[5][1],
            ],
          },
          l: [],
        };
        verts[v5.id] = v5;
        c.v[5] = v5;
      }

      //  define verts 3 and 4
      {
        const v4: GameVert = {
          id: verts.length,
          pos: {
            rel: [
              relCoord[0] + vertOffsets[4][0],
              relCoord[1] + vertOffsets[4][1],
            ],
          },
          l: [],
        };
        verts[v4.id] = v4;
        c.v[4] = v4;

        const v3: GameVert = {
          id: verts.length,
          pos: {
            rel: [
              relCoord[0] + vertOffsets[3][0],
              relCoord[1] + vertOffsets[3][1],
            ],
          },
          l: [],
        };
        verts[v3.id] = v3;
        c.v[3] = v3;
      }

      //  define lines 0, 1, and 2 (where not available from neighboring cells)
      if(!c.l[0]) {
        const l0: GameLine = {
          id: lines.length,
          c: [undefined, c],
          v: [c.v[5], c.v[0]],
        };
        lines[l0.id] = l0;
        c.l[0] = l0;
      }
      if(!c.l[1]) {
        const l1: GameLine = {
          id: lines.length,
          c: [undefined, c],
          v: [c.v[0], c.v[1]],
        };
        lines[l1.id] = l1;
        c.l[1] = l1;
      }
      if(!c.l[2]) {
        const l2: GameLine = {
          id: lines.length,
          c: [undefined, c],
          v: [c.v[1], c.v[2]],
        };
        lines[l2.id] = l2;
        c.l[2] = l2;
      }

      //  define lines 3, 4, and 5
      {
        const l3: GameLine = {
          id: lines.length,
          c: [c, undefined],
          v: [c.v[3], c.v[2]],
        };
        lines[l3.id] = l3;
        c.l[3] = l3;

        const l5: GameLine = {
          id: lines.length,
          c: [c, undefined],
          v: [c.v[5], c.v[4]],
        };
        lines[l5.id] = l5;
        c.l[5] = l5;

        const l4: GameLine = {
          id: lines.length,
          c: [c, undefined],
          v: [c.v[4], c.v[3]],
        };
        lines[l4.id] = l4;
        c.l[4] = l4;
      }
    }
  }

  return {
    R,
    const: { D, S, W, H, G, C, L, V },
    cells,
    lines,
    verts,
  };
}
