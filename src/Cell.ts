import CSSColor from './CSSColor.js';
import Line from './Line.js';
import SLNode from './SLNode.js';
import { cell_json } from './types.js';

// define these locally just for convenience


class Cell {

    //  radius from center to "corner"
    static RADIUS = 15;

    //  dx, dy between neighboring hexagons, e.g. center-to-center
    static DX = Cell.RADIUS * Math.sqrt(3);
    static DY = Cell.RADIUS * 1.5;

    private readonly json: cell_json;

    //  public nominal coordinates (at center of hexagon)
    x: number;
    y: number;

    count: number | null = null;
    lines: Line[];
    nodes: SLNode[];

    //  true while the mouse is above this specific cell
    mouse: boolean = false;
    private _path: Path2D | null = null;

    constructor(x: number, y: number, lines: Line[], nodes: SLNode[], json: cell_json) {

        this.json = json;
        this.x = x;
        this.y = y;

        this.nodes = nodes.slice();
        this.lines = lines.slice();

        // //  assign a count to ~1/3 of all cells
        // if(Math.random() > 2 / 3) {
        //     this.count = Math.floor(6 * Math.random());
        // }
    }

    getNeighbor(line: number | Line): Cell | null {
        if(typeof line === 'number') {
            line = this.lines[line];
        }

        //  each line is associated with two cells
        //  return the other one (not the one this method was called on)
        return line.cells[1 - line.cells.indexOf(this)];
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
