import { Coord, GameCell, GameLine, GameStruct, GameVert } from 'src/model';

/** 30 degrees = pi/6 radians */
const deg30 = Math.PI / 6;
/** 60 degrees = pi/3 radians */
const deg60 = Math.PI / 3;
/** sin(60 degrees) = sin(pi/3 radians) =~ 0.866 */
const sin60 = Math.sin(deg60);
/** cos(60 degrees) = cos(pi/3 radians) = 0.5 */
const cos60 = Math.cos(deg60);

/** du/di, derivative of u with respect to i */
const du_di = 1;
/** dv/di, derivative of v with respect to i */
const dv_di = 0;
/** du/dj, derivative of u with respect to j */
const du_dj = du_di * cos60;
/** dv/dj, derivative of v with respect to j */
const dv_dj = du_di * sin60;


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

function initCell(id: number, ij: Coord): GameCell {
  return {
    id,
    coord: ij,
    uv: [0, 0],
    l: [],
    v: [],
    n: [],
  };
}
function initLine(id: number, verts: [GameVert, GameVert]): GameLine {
  return {
    id,
    v: verts,
    c: [],
  };
}
function initVert(id: number, uv: Coord): GameVert {
  return {
    id,
    nom: uv,
    l: [],
  };
}

/** initialize minimal structure for given board radius */
export function initBoard(R: number): GameStruct {

  /** board diameter, corner-to-corner distance in units of cells */
  const D = 2 * R;
  /** board "span", number of cells across any board diagonal */
  const S = D + 1;
  /** grid width */
  const W = S;
  /** grid height */
  const H = S;

  /** horizontal position of board center, in units of cells */
  const i_R = R;
  /** vertical position of board center, in units of cells */
  const j_R = R;

  /** check whether a cell exists at the given coordinates */
  function isOnBoard(ij: Coord): boolean {
    //  (0 <= i < W) && (0 <= j < H)
    if(ij[0] < 0 || ij[1] < 0 || ij[0] >= W || ij[1] >= H) {
      return false;
    }

    //  (j >= R - i) && (j <= 3*R - i)
    if(ij[1] < R - ij[0] || ij[1] > 3 * R - ij[0]) {
      return false;
    }

    return true;
  }

  /** ([i,j]) => ([u,v]) */
  function toNom(ij: Coord): Coord {
    //  u = ((i - i_R) + (j - j_R) * cos(60 deg)) * du
    //  v = (j - j_R) * dv
    return [
      (ij[0] - i_R) * du_di + (ij[1] - j_R) * du_dj,
      (ij[1] - j_R) * dv_dj,
    ];
  }
  /** ([u,v]) => ([i,j]) */
  function fromNom(uv: Coord): Coord {
    //  i = u / du - (j - j_R) * cos(60 deg) + i_R
    //  j = v / dv + j_R
    const j = uv[1] / dv_dj + j_R;
    return [
      uv[0] / du_di - (j - j_R) * cos60 + i_R,
      j
    ];
  }

  /** hypotenuse of a triangle whose 'adjacent' side is (du_di/2) */
  const offsetRadius = du_di / (2 * Math.cos(deg30));
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

  /** flat, dense array of cell objects; indexed by id */
  const cells: GameCell[] = [];

  /** cell ids by grid position (i, j); indexed as grid[j][i] */
  const grid: number[][] = new Array(H);

  for(let j = 0; j < H; j++) {
    grid[j] = new Array(W);
    for(let i = 0; i < W; i++) {
      const gridCoord: Coord = [i, j];
      if(!isOnBoard(gridCoord)) {
        grid[j][i] = -1;
        continue;
      }

      const cid = cells.length;
      const c = initCell(cid, gridCoord);
      c.coord = gridCoord;
      c.uv = toNom(gridCoord);
      cells[cid] = c;
      grid[j][i] = cid;

      //  get/define all cell neighbors, lines, & vertices
      const nomCoord = toNom(gridCoord);

      const n1 = j > 0 && grid[j - 1][i] >= 0 && cells[grid[j - 1][i]];
      const n2 = j > 0 && grid[j - 1][i + 1] >= 0 && cells[grid[j - 1][i + 1]];
      const n0 = i > 0 && grid[j][i - 1] >= 0 && cells[grid[j][i - 1]];
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
          const vertNom: Coord = [
            nomCoord[0] + vertOffsets[0][0],
            nomCoord[1] + vertOffsets[0][1],
          ];
          const v0 = initVert(verts.length, vertNom);
          verts[v0.id] = v0;
          c.v[0] = v0;
        }
        if(n2) {
          //  get existing v1 object ref
          c.v[1] = n2.v[5];
        }
        else {
          //  define v1 & add to c
          const vertNom: Coord = [
            nomCoord[0] + vertOffsets[1][0],
            nomCoord[1] + vertOffsets[1][1],
          ];
          const v1 = initVert(verts.length, vertNom);
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
        //  define v2 & add to c
        const vertNom: Coord = [
          nomCoord[0] + vertOffsets[2][0],
          nomCoord[1] + vertOffsets[2][1],
        ];
        const v2 = initVert(verts.length, vertNom);
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
        //  define v2 & add to c
        const vertNom: Coord = [
          nomCoord[0] + vertOffsets[5][0],
          nomCoord[1] + vertOffsets[5][1],
        ];
        const v5 = initVert(verts.length, vertNom);
        verts[v5.id] = v5;
        c.v[5] = v5;
      }

      //  define vert 4
      {
        const vertNom: Coord = [
          nomCoord[0] + vertOffsets[4][0],
          nomCoord[1] + vertOffsets[4][1],
        ];
        const v4 = initVert(verts.length, vertNom);
        verts[v4.id] = v4;
        c.v[4] = v4;
      }
      //  define vert 3
      {
        const v3 = initVert(verts.length, [
          nomCoord[0] + vertOffsets[3][0],
          nomCoord[1] + vertOffsets[3][1],
        ]);
        verts[v3.id] = v3;
        c.v[3] = v3;
      }

      //  define lines 0, 1, and 2 (where not available from neighboring cells)
      if(!c.l[0]) {
        const l0 = initLine(lines.length, [c.v[5], c.v[0]]);
        lines[l0.id] = l0;
        l0.c[1] = c;
        c.l[0] = l0;
      }
      if(!c.l[1]) {
        const l1 = initLine(lines.length, [c.v[0], c.v[1]]);
        lines[l1.id] = l1;
        l1.c[1] = c;
        c.l[1] = l1;
      }
      if(!c.l[2]) {
        const l2 = initLine(lines.length, [c.v[1], c.v[2]]);
        lines[l2.id] = l2;
        l2.c[1] = c;
        c.l[2] = l2;
      }

      //  define line 3
      {
        const l3 = initLine(lines.length, [c.v[3], c.v[2]]);
        lines[l3.id] = l3;
        l3.c[0] = c;
        c.l[3] = l3;
      }
      //  define line 5
      {
        const l5 = initLine(lines.length, [c.v[5], c.v[4]]);
        lines[l5.id] = l5;
        l5.c[0] = c;
        c.l[5] = l5;
      }
      //  define line 4
      {
        const l4 = initLine(lines.length, [c.v[4], c.v[3]]);
        lines[l4.id] = l4;
        l4.c[0] = c;
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
