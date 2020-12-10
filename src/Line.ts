import Cell from './Cell.js';
import SLNode from './SLNode.js';
import { line_json } from './types.js';


enum LineState {
    INDET = 0b000,
    BLANK = 0b010,
    LINE  = 0b001
}
class Line {

    static WIDTH: number = 5;
    static HOVER_WIDTH: number = 8;

    readonly json: line_json
    nodes: [SLNode, SLNode];
    ownNodes: [SLNode | null, SLNode | null] = [null, null];

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
    cells: Cell[] = [];

    bb: [[number, number], [number, number]];
    path: Path2D = new Path2D;

    constructor(json: line_json, start: (SLNode | [number, number]), end: (SLNode | [number, number])) {
        this.json = json;

        let startNode: SLNode;
        let endNode: SLNode;
        if(start instanceof SLNode) {
            startNode = start;
        }
        else {
            startNode = new SLNode(...start);
            this.ownNodes[0] = startNode;
        }
        if(end instanceof SLNode) {
            endNode = end;
        }
        else {
            endNode = new SLNode(...end);
            this.ownNodes[1] = endNode;
        }
        this.nodes = [startNode, endNode];
        this.nodes[0].addLine(this);
        this.nodes[1].addLine(this);
        let xs: [number, number] = [Math.min(this.nodes[0].x, this.nodes[1].x), 0];
        if(xs[0] === this.nodes[0].x) {
            xs[1] = this.nodes[1].x;
        }
        else {
            xs[1] = this.nodes[0].x;
        }
        if(Math.abs(xs[0] - xs[1]) < Line.HOVER_WIDTH) {
            xs = [xs[1] - Line.HOVER_WIDTH, xs[0] + Line.HOVER_WIDTH];
        }
        let ys: [number, number] = [Math.min(this.nodes[0].y, this.nodes[1].y), 0];
        if(ys[0] === this.nodes[0].y) {
            ys[1] = this.nodes[1].y;
        }
        else {
            ys[1] = this.nodes[0].y;
        }
        this.bb = [xs, ys];


        this.path.moveTo(...this.nodes[0].coords);
        this.path.lineTo(...this.nodes[1].coords);
    }

    draw(ctx: CanvasRenderingContext2D): void {

        ctx.save();
        // if(this.proven) {
        //     ctx.strokeStyle = CSSColor.black;
        // }
        // else {
        //     ctx.strokeStyle = CSSColor.lightgray;
        // }

        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        ctx.restore();
    }

    get state(): LineState {
        return this.json.state;
    }
    set state(state: LineState) {
        this.json.state = state;
    }

    get proven(): number {
        return this.state & LineState.LINE;
    }
    get disproven(): number {
        return this.state & LineState.BLANK;
    }
    get indet(): number {
        return this.state & LineState.INDET;
    }

    /** Given a refNode, get the opposite node */
    getOppositeNode(refNode: SLNode) {
        return this.nodes[1 - this.nodes.indexOf(refNode)];
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

    get outside(): Cell {
        return this.cells[1];
    }
    set outside(outside: Cell) {
        this.cells[1] = outside;
    }

    addCell(cell: Cell) {
        if(!this.cells.includes(cell)) {
            this.cells.push(cell);
        }
    }
}


export default Line;
export {LineState};
