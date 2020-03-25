import Cell from './Cell.js';
import Line, {LineState} from './Line.js';


class SLNode {

    coords: [number, number];

    dir?: 0 | 1;     //  0 if vertical line points up, 1 if down
    lines: [Line, Line] | [Line, Line, Line];  //  a node is the intersection
                                               //  of 2 (or 3) lines

    constructor(x: number, y: number, cell: Cell) {
        this.coords = [x, y];

        //  generate an array of temporary Line instances, to be rewritten
        //  immediately after Lines are instantiated in the Cell constructor
        this.lines = [
            new Line(this, this, cell),
            new Line(this, this, cell)
        ]
    }

    countFilled(): number {
        return this.lines.filter(line =>
            line !== null && line.proven
        ).length;
    }

    /** get lines opposing the given 'refLine', regardless of state */
    getOpposingLines(refLine: Line, state?: LineState): Line[] {
        let opposing: Line[] = this.lines.filter(line => line !== refLine);
        if(state !== undefined) {
            opposing = opposing.filter(line => line.state & state);
        }

        return opposing;
    }
    getNextLineInPath(refLine: Line): Line | null {
        let filled: Line[] = this.getOpposingLines(refLine, LineState.LINE);
        if(filled.length !== 1) {
            return null;
        }
        return filled[0];
    }

    get x(): number {
        return this.coords[0];
    }
    set x(x: number) {
        this.coords[0] = x;
    }

    get y(): number {
        return this.coords[1];
    }
    set y(y: number) {
        this.coords[1] = y;
    }
}


export default SLNode;
