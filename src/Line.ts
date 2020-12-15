import SLNode from './SLNode.js';
import { line_json } from './types.js';


enum LineState {
    INDET = 0b000,
    BLANK = 0b010,
    LINE  = 0b001
}
class Line {

    static WIDTH: number = 4;
    static HOVER_WIDTH: number = 8;

    json?: line_json;
    nodes: [SLNode, SLNode];

    /** a line is asserted if it has been manually set, or if its state is fixed
     * by either of its nodes */
    asserted: boolean = false;

    bb: [[number, number], [number, number]];
    path: Path2D = new Path2D;

    constructor(json: line_json, start: SLNode, end: SLNode) {
        this.json = json;

        this.nodes = [start, end];
        start.addLine(this);
        end.addLine(this);

        this.path.moveTo(...start.coords);
        this.path.lineTo(...end.coords);

        //  set the bounding box with width >= HOVER_WIDTH
        let xs: [number, number] = [Math.min(start.x, end.x), 0];
        if(xs[0] === start.x) {
            xs[1] = end.x;
        }
        else {
            xs[1] = start.x;
        }
        if(Math.abs(xs[0] - xs[1]) < Line.HOVER_WIDTH) {
            xs = [xs[1] - Line.HOVER_WIDTH, xs[0] + Line.HOVER_WIDTH];
        }
        let ys: [number, number] = [Math.min(start.y, end.y), 0];
        if(ys[0] === start.y) {
            ys[1] = end.y;
        }
        else {
            ys[1] = start.y;
        }
        this.bb = [xs, ys];
    }

    get filled(): boolean {
        if(!this.json) {
            console.debug('no json object defined on line %o', this);
            throw new TypeError('undefined json object');
        }
        return this.json.filled;
    }
    set filled(state: boolean) {
        if(!this.json) {
            console.debug('no json object defined on line %o', this);
            throw new TypeError('undefined json object');
        }
        this.json.filled = state;
    }

    /** fill this line, assert it, and return whether or not this changed
     * anything */
    fill(): boolean {
        if(!this.asserted || !this.filled) {
            this.filled = true;
            this.asserted = true;
            return true;
        }
        return false;
    }
    /** empty this line, assert it, and return whether or not this changed
     * anything */
    empty(): boolean {
        if(!this.asserted || this.filled) {
            this.filled = false;
            this.asserted = true;
            return true;
        }
        return false;
    }
    /** toggle this line's state and assert it (return true because this method
     * changes the line's state by definition */
    toggle(): true {
        if(this.filled) {
            this.empty();
        }
        else {
            this.fill();
        }
        return true;
    }
    /** de-assert this line and return whether or not this changed anything */
    unset(): boolean {
        if(this.asserted) {
            this.asserted = false;
            return true;
        }
        return false;
    }
}


export default Line;
export {LineState};
