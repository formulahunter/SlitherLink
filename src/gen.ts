export interface GameBoardData {
  R: number;
  span: number;
  cellCount: number;
  lineCount: number;
  nodeCount: number;
  toId: (x: number, y: number) =>  number;
  toXY: (id: number) => [number, number];
  isOnBoard: (x_or_i: number, y_maybe?: number) => boolean;
  lines: [number, number][];
  nodesOfCell: number[][];
  linesOfCell: number[][];
  neighborsOfCell: number[][];
  cellsShuffled: number[];
}

export function fac_quot(n: number, d: number): number {
  let prod = 1;
  for(let i = n; i > d; i--) {
    prod *= i;
  }
  return prod;
}
export function fac(n: number): number {
  return fac_quot(n, 1);
}
export function nChK(n: number, k: number): number {
  if(k < 0 || k > n) {
    return 0;
  }
  return fac_quot(n, k) / fac(n - k);
}

export function cellCountForRadius(rad: number): number {
  if(rad === 0) {
    return 1;
  }
  return 1 + 6 * nChK(rad + 1, rad - 1);
}
export function lineCountForRadius(rad: number): number {
  return 3 * (rad - 1) * rad / 2 + 4 * rad + 1;
}
export function nodeCountForRadius(rad: number): number {
  return 6 * rad * (rad + 2) + 6;
}

export function cardinalToAxial(R: number, i: number): [number, number] {
  const span = 2 * R + 1;
  return [i % (span + 2), i / (span + 2) | 0];
}
export function axialToCardinal(R: number, x: number, y: number): number {
  return y * (2 * R + 1 + 2) + x;
}

export function coordIsValid(R: number, coord: [number, number]): boolean {
  const span = 2 * R + 1;
  if(coord[0] < 1 || coord[1] < 0 || coord[0] > span || coord[1] >= span) {
    return false;
  }
  return (coord[1] >= R + 1 - coord[0]) && (coord[1] <= 3 * R + 1 - coord[0]);
}
export function indexIsValid(R: number, i: number) {
  return coordIsValid(R, cardinalToAxial(R, i));
}
export function isOnBoard(R: number, x_or_i: number, y_maybe?: number): boolean {
  if(typeof y_maybe === 'number') {
    return coordIsValid(R, [x_or_i, y_maybe]);
  }
  return indexIsValid(R, x_or_i);
}

export function initBoard(R: number): GameBoardData {

  const cellCount = cellCountForRadius(R);
  const lineCount = lineCountForRadius(R);
  const nodeCount = nodeCountForRadius(R);

  const span = 2 * R + 1;

  const lines = new Array(lineCount);

  //  cache nodes, lines, and neighbors per cell, indexed by relative position
  //  wrt the cell
  const nodesOfCell = new Array(cellCount);
  const linesOfCell = new Array(cellCount);
  const neighborsOfCell = new Array(cellCount);

  //  populate `linesOfCell`, `nodesOfCell`, & `neighborsOfCell`
  for(let i = 0; i < cellCount; i++) {
    const [col, row] = cardinalToAxial(R, i);
    if(!isOnBoard(R, col, row)) {
      continue;
    }

    const n0 = 2 * (span + 3) * row + col;
    const n3 = n0 + 2 * span + 5;
    //  index nodes beginning at upper left ("north-west") and progressing
    //  counter-clockwise
    nodesOfCell[i] = [n0, n0 + 1, n0 + 2, n3 + 2, n3 + 1, n3];

    const l0 = (3 * (span + 3) - 1) * row + 3 * col;
    const l4 = l0 + 3 * (span + 3);
    //  index lines beginning at left ("west") and progressing counter-clockwise
    linesOfCell[i] = [l0, l0 + 1, l0 + 2, l0 + 3, l4, l4 - 2];

    //  also cache lines' start & end nodes, since they're readily accessible
    if(!Array.isArray(lines[linesOfCell[i][0]])) {
      lines[linesOfCell[i][0]] = [nodesOfCell[i][5], nodesOfCell[i][0]];
    }
    if(!Array.isArray(lines[linesOfCell[i][1]])) {
      lines[linesOfCell[i][0]] = [nodesOfCell[i][0], nodesOfCell[i][1]];
    }
    if(!Array.isArray(lines[linesOfCell[i][2]])) {
      lines[linesOfCell[i][0]] = [nodesOfCell[i][1], nodesOfCell[i][2]];
    }
    if(!Array.isArray(lines[linesOfCell[i][3]])) {
      lines[linesOfCell[i][0]] = [nodesOfCell[i][3], nodesOfCell[i][2]];
    }
    if(!Array.isArray(lines[linesOfCell[i][4]])) {
      lines[linesOfCell[i][0]] = [nodesOfCell[i][4], nodesOfCell[i][3]];
    }
    if(!Array.isArray(lines[linesOfCell[i][5]])) {
      lines[linesOfCell[i][0]] = [nodesOfCell[i][5], nodesOfCell[i][4]];
    }

    //  index neighbors beginning at left ("west") and progressing counter-clockwise
    neighborsOfCell[i] = [-1, -1, -1, -1, -1, -1];
    if(isOnBoard(R, col - 1, row)) {
      neighborsOfCell[i][0] = axialToCardinal(R, col - 1, row);
    }
    if(isOnBoard(R, col, row - 1)) {
      neighborsOfCell[i][1] = axialToCardinal(R, col, row - 1);
    }
    if(isOnBoard(R, col + 1, row - 1)) {
      neighborsOfCell[i][2] = axialToCardinal(R, col + 1, row - 1);
    }
    if(isOnBoard(R, col + 1, row)) {
      neighborsOfCell[i][3] = axialToCardinal(R, col + 1, row);
    }
    if(isOnBoard(R, col, row + 1)) {
      neighborsOfCell[i][4] = axialToCardinal(R, col, row + 1);
    }
    if(isOnBoard(R, col - 1, row + 1)) {
      neighborsOfCell[i][5] = axialToCardinal(R, col - 1, row + 1);
    }
  }

  //  generate a list of cells in random order

  const cellsShuffled = new Array(cellCount);
  for(let i = 0; i < cellCount; i++) {
    cellsShuffled[i] = i;
  }
  for(let i = cellCount - 1; i > 0; i--) {
    const randomInd = Math.random() * i | 0;
    const temp = cellsShuffled[i];
    cellsShuffled[i] = cellsShuffled[randomInd];
    cellsShuffled[randomInd] = temp;
  }

  return {
    R,
    span,
    cellCount,
    lineCount,
    nodeCount,
    toId: axialToCardinal.bind(null, R),
    toXY: cardinalToAxial.bind(null, R),
    isOnBoard: isOnBoard.bind(null, R),
    lines,
    nodesOfCell,
    linesOfCell,
    neighborsOfCell,
    cellsShuffled,
  };
}
