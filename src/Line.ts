import Cell from './Cell.js';
import SLNode from './SLNode.js';


enum LineState {
    INDET,
    BLANK,
    LINE
}
class Line {
    nodes: [SLNode, SLNode];

    /** Cell references are designated 'inside' and 'outside' using a right-hand
     *  convention. The 'inside' cell is on the inside of a path followed when
     *  tracing the hexagon counterclockwise (to the right); stated differently,
     *  it is to the right when looking from the start node toward the end node.
     *
     *  Due to the way line references are linked (reassigned) when the board
     *  is generated, a line's inside cell will always be defined but may not be
     *  on the expected side (i.e. may point left instead of right for one cell
     *  because it points right for the other; see explanation of "sides" above)
     */
    cells: [Cell, Cell | null];
    state: LineState = LineState.INDET;

    constructor(start: SLNode, end: SLNode, inside: Cell) {
        this.nodes = [start, end];
        this.cells = [inside, null];
    }

    // isViable(fromLine: Line): boolean {
    //
    // }

    get start(): SLNode {
        return this.nodes[0];
    }
    set start(start: SLNode) {
        this.nodes[0] = start;
    }

    get end(): SLNode {
        return this.nodes[1];
    }
    set end(end: SLNode) {
        this.nodes[1] = end;
    }

    /* The 'inside' cell is the cell on the inside of the curve followed when
       tracing the hexagon clockwise; from the start node looking toward the
        end node, it is on the right side
     */
    get inside(): Cell {
        return this.cells[0];
    }
    set inside(inside: Cell) {
        this.cells[0] = inside;
    }

    get outside(): Cell | null {
        return this.cells[1];
    }
    set outside(outside: Cell | null) {
        this.cells[1] = outside;
    }
}


export default Line;
