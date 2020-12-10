import Cell from './Cell.js';
import Line  from './Line.js';

let depth: number = 0;
class SLNode {

    static readonly RADIUS: number = 6;

    coords: [number, number];

    lines: Line[] = [];  //  a node is the intersection
    cells: Cell[] = [];

    path: Path2D = new Path2D;

    constructor(x: number, y: number) {
        this.coords = [x, y];
        this.path.arc(x, y, SLNode.RADIUS, 0, 2 * Math.PI);
    }

    addLine(line: Line): void {
        if(!this.lines.includes(line)) {
            this.lines.push(line);
        }
    }
    addCell(cell: Cell) {
        if(!this.cells.includes(cell)) {
            this.cells.push(cell);
        }
    }

    get assertedCount(): number {
        let c = 0;
        for(let i = 0; i < this.lines.length; i++) {
            if(this.lines[i].asserted) {
                c++;
            }
        }
        return c;
    }
    get filledCount(): number {
        let c = 0;
        for(let i = 0; i < this.lines.length; i++) {
            if(this.lines[i].asserted && this.lines[i].state) {
                c++;
            }
        }
        return c;
    }
    isValid(): boolean {
        let c = 0;
        for(let i = 0; i < this.lines.length; i++) {
            //  a node may always be valid if it has at least 1 unset line
            if(!this.lines[i].asserted) {
                return true;
            }
            c += this.lines[i].state;
        }
        return c === 2 || c === 0;
    }

    get dof(): number {
        return this.lines.length - this.assertedCount - 1;
    }

    updateDoF() {
        depth++;
        if(depth > 30) {
            throw new Error('too much recursion');
        }

        //  record the changed line and its resulting state
        // this.updateOrigin = instigator;

        //  if a single line remains undetermined, set its state and update its
        //  opposite node
        if(this.dof === 0) {
            let i = 0;
            for(; i < this.lines.length; i++) {
                if(!this.lines[i].asserted) {
                    break;
                }
            }

            //  fix the undetermined line's state to make this node valid
            if(this.filledCount % 2) {
                this.lines[i].fill();
            }
            else {
                this.lines[i].empty();
            }

            //  propagate changes to the newly asserted line's opposite node
            if(this.lines[i].nodes[0] === this) {
                this.lines[i].nodes[1].updateDoF();
            }
            else {
                this.lines[i].nodes[0].updateDoF();
            }
        }
        depth--;
    }


    get x(): number {
        return this.coords[0];
    }

    get y(): number {
        return this.coords[1];
    }
}


export default SLNode;
