import CSSColor from './CSSColor.js';
import Line from './Line.js';
import SLNode from './SLNode.js';
import { cell_json } from './types.js';


class Cell {

    //  radius from center to "corner"
    static RADIUS = 15;

    //  dx, dy increments between cell nodes for hexagonal cells composed of
    //  equilateral triangles with sides of length Cell.RADIUS
    static DX = Cell.RADIUS * Math.sqrt(3) / 2;
    static DY = Cell.RADIUS / 2;

    //  direction vectors in the axial (q, r) coordinate system
    static readonly vectors: [number, number][] = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 0],
        [-1, -1],
        [0, -1]
    ];

    //  position offsets (canvas coords) of each node wrt center of cell
    static readonly nodeOffsets: [number, number][] = [
        [0, -2 * Cell.DY],
        [Cell.DX, -Cell.DY],
        [Cell.DX, Cell.DY],
        [0, 2 * Cell.DY],
        [-Cell.DX, Cell.DY],
        [-Cell.DX, -Cell.DY]
    ];

    //  original json object literal this Cell instance is derived from
    private readonly json: cell_json;

    //  public nominal coordinates (at center of hexagon)
    x: number;
    y: number;

    count: number | null = null;
    lines: Line[] = [];
    nodes: SLNode[] = [];

    //  true while the mouse is above this specific cell
    mouse: boolean = false;
    private _path: Path2D | null = null;

    constructor(x: number, y: number, lineRefs: (Line | null)[], nodeRefs: (SLNode | null)[], json: cell_json) {

        this.json = json;
        this.x = x;
        this.y = y;

        for(let i = 0; i < nodeRefs.length; i++) {
            const node = nodeRefs[i];
            if(node instanceof SLNode) {
                this.nodes[i] = node;
            }
            else {
                this.nodes[i] = new SLNode(x + Cell.nodeOffsets[i][0], y + Cell.nodeOffsets[i][1]);
            }
        }
        for(let i = 0; i < lineRefs.length; i++) {
            const line = lineRefs[i];
            if(line instanceof Line) {
                this.lines[i] = line;
            }
            else {
                this.lines[i] = new Line(this.nodes[i], this.nodes[(i + 1) % 6]);
            }
        }

        // //  assign a count to ~1/3 of all cells
        // if(Math.random() > 2 / 3) {
        //     this.count = Math.floor(6 * Math.random());
        // }
    }

    getNeighbor(line: number | Line): Cell | null {
        if(typeof line === 'number') {
            line = this.lines[line];
        }
        else if(!this.lines.includes(line)) {
            console.error('line %o does not lie on cell %o', line, this);
            throw new Error('line does not lie on this cell');
        }

        //  each line is associated with two cells
        //  return the other one (not the one this method was called on)
        const cell0 = line.cells[0];
        if(cell0 === this) {
            return line.cells[1];
        }
        return cell0;
    }

    draw(ctx: CanvasRenderingContext2D, text?: string): void {

        let path: Path2D = this.getPath();

        //  highlight the cell under the mouse
        if(this.mouse) {
            //  save() and restore() ensure that the fill color is reverted to
            //  its previous value
            ctx.save();
            ctx.fillStyle = CSSColor.green;
            ctx.fill(path);
            ctx.restore();
        }
        else if(ctx.fillStyle === CSSColor.lightgreen) {
            ctx.fill(path);
        }

        //  draw each line depending on its state
        ctx.save();
        for(let line of this.lines) {
            if(line.proven) {
                ctx.strokeStyle = CSSColor.black;
            }
            else {
                ctx.strokeStyle = CSSColor.lightgray;
            }

            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            ctx.stroke();
        }
        ctx.restore();

        //  print text centered in the cell if it has a count constraint
        // if(this.count !== null) {
        if(text !== undefined) {
            ctx.save();
            ctx.fillStyle = CSSColor.black;
            // ctx.beginPath();
            //  not sure why but characters look just a hair too high when drawn
            //  at this.y, so adding 1 to lower them
            // ctx.fillText(this.count.toString(), this.x, this.y + 1, Cell.RADIUS);
            ctx.fillText(text, this.x, this.y + 1, Cell.RADIUS);
            ctx.restore();
        }
    }
    getPath(): Path2D {

        if(this._path !== null) {
            return this._path;
        }

        //  declare local variables for readability & performance
        const x0 = this.x;
        const y0 = this.y;
        const dx = Cell.DX / 2;
        const dy = Cell.DY / 3;

        let path: Path2D = new Path2D();

        // path.arc(x0, y0, 1, 0, 2 * Math.PI);

        path.moveTo(x0 + dx, y0 + dy);
        path.lineTo(x0 + dx, y0 - dy);
        path.lineTo(x0, y0 - 2 * dy);
        path.lineTo(x0 - dx, y0 - dy);
        path.lineTo(x0 - dx, y0 + dy);
        path.lineTo(x0, y0 + 2 * dy);
        path.closePath();

        this._path = path;

        return path;
    }
}


export default Cell;
