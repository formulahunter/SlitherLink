import Cell from './Cell.js';
import SLNode from './SLNode.js';


enum LineState {
    INDET,
    BLANK,
    LINE
}
class Line {
    nodes: [SLNode, SLNode] = [new SLNode(), new SLNode()];
    cells: [Cell | null, Cell | null];
    state: LineState = LineState.INDET;

    constructor(cell1: Cell | null, cell2: Cell | null) {
        if(cell1 === null && cell2 === null) {
            throw new Error('cannot construct Line with 2 null cell arguments');
        }
        this.cells = [cell1, cell2];
    }

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
}


export default Line;
