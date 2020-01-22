import Cell from './Cell.js';
import Line from './Line.js';


class SLNode {

    coords: [number, number];

    dir?: 0 | 1;     //  0 if vertical line points up, 1 if down
    lines: [Line, Line, Line | null];  //  a node is the intersection
                                       // of 2 (or 3) lines

    constructor(x: number, y: number, cell: Cell) {
        this.coords = [x, y];

        //  generate an array of temporary Line instances, to be rewritten
        //  immediately after Lines are instantiated in the Cell constructor
        this.lines = [
            new Line(this, this, cell),
            new Line(this, this, cell),
            null
        ]
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
