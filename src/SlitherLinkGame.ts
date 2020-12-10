import Cell from './Cell.js';
import CSSColor from './CSSColor.js';
import Line, { LineState } from './Line.js';
import SLNode from './SLNode.js';
import { cell_json, hex_dirs, make_stem_cell } from './types.js';

//  local constants for convenience
//@ts-ignore: TS6133: 'up_op' is declared but its value is never read.
const { up, rt, dn, up_op, lf, dn_op } = hex_dirs;

class SlitherLinkGame {

    //  frame request id returned by requestAnimationFrame()
    //  used to schedule animation frames
    static frameRequest: number = 0;

    // private canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;

    //  line or cell below the mouse, if any
    private mouse: Line | null = null;

    //  size parameters
    //  distance (in cell count) from center to corner cell
    readonly radius: number = -1;
    //  distance (in cell count) from corner to corner
    readonly diameter: number = -1;
    //  total number of cells
    readonly cellCount: number = -1;
    //  total number of lines
    readonly lineCount: number = -1;
    //  total number of nodes
    readonly nodeCount: number = -1;

    //  container arrays
    board: Cell[][];
    cells: Cell[];
    private readonly lines: Line[];
    private nodes: SLNode[];

    /** construct SlitherLinkGame with a given board size
     *
     * @param r - "radius" of the board as distance (in cell count) from center to corner
     * @param canvas - canvas element on which the game will be drawn
     */
    constructor(r: number, canvas: HTMLCanvasElement) {

        const _3r = 3 * r;
        this.radius = r;
        this.diameter = 2 * r;
        this.cellCount = _3r * (r + 1) + 1;
        this.lineCount = _3r * (_3r + 5) + 6;
        this.nodeCount = 6 * r * (r + 2) + 6;

        this.cells = new Array(this.cellCount);
        this.lines = new Array(this.lineCount);
        this.nodes = new Array(this.nodeCount);

        //  populate a 2D array of cell references by axial coordinates
        this.board = new Array(this.diameter + 1);
        for(let q = 0; q < this.diameter + 1; q++) {
            this.board[q] = [];
        }

        //  define event listeners on canvas element
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
        canvas.addEventListener('click', this.handleClick.bind(this));
        canvas.addEventListener('auxclick', this.handleAuxClick.bind(this));
        canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        // this.canvas = canvas;
        let ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if(ctx === null) {
            throw new Error('unable to get canvas rendering context');
        }
        this.ctx = ctx;

        //  the total number of rows will be equal to the given width of the
        //  middle row
        this.generateRandom(r);

        //  draw the initial board
        this.draw(400, 300);
    }

    private generateRandom(radius: number) {

        //  get axial (q, r) coordinates from json tree coordinates (stem, branch)
        function tree_to_axial(i: number, j: number): [number, number] {
            const ind = j < 0 ? 0 : 1;

            const comp = [i, i + Math.abs(j)];
            return [
                comp[ind],
                comp[1 - ind]
            ];
        }
        //  get raw tree coordinates (stem, branch) from axial coordinates
        //@ts-ignore: TS6133: 'axial_to_tree' is declared but its value is never read.
        function axial_to_tree(q: number, r: number) {
            const ind = q < r ? 0 : 1;
            const a = [q, r];
            return [
                a[ind],
                a[1 - ind] - a[ind]
            ];
        }

        const span = this.diameter + 1;
        const board = this.board;

        //  get neighbors of the cell at [q, r], arranged in order corresponding to shared line positions
        function get_neighbors_of(q: number, r: number): (Cell | null)[] {
            //  validate the given axial coordinates
            if(q < 0 || q > span - 1) {
                console.error(`q = ${q} is outside of valid range (0, ${span - 1})`);
                throw new RangeError('out-of-range axial coordinate q');
            }
            if(r < 0 || r > span - 1) {
                console.error(`r = ${r} is outside of valid range (0, ${span - 1})`);
                throw new RangeError('out-of-range axial coordinate r');
            }
            if(Math.abs(r - q) > radius) {
                console.error(`[q, r] = [${q}, ${r}] fails limiting condition ==> abs(${r} - ${q}) > (${radius})`);
                throw new RangeError('invalid axial coordinates q, r');
            }
            const v = Cell.vectors;
            let neighbors: (Cell | null)[] = [];
            for(let i = 0; i < v.length; i ++) {
                const col = board[q + v[i][0]];
                if(!col) {
                    neighbors[i] = null;
                }
                else {
                    neighbors[i] = col[r + v[i][1]] || null;
                }
            }
            return neighbors;
        }

        //  get a raw structure of (mostly) unlinked lines/cells
        const root: cell_json = make_stem_cell(span);

        //  get the raw cell at grid position [i, j]
        //  i gives the stem position, j gives the branch position (both are zero-indexed)
        function get_cell_json_at(i: number, j: number): cell_json {
            if((i + j) >= span || j > (span - 1) / 2) {
                throw new Error(`invalid tree position [${i}, ${j}] for grid of span ${span}`);
            }
            let cell: cell_json = root;
            while(i > 0) {
                const temp = cell.cells[rt];
                if(!temp) {
                    console.debug('undefined child stem cell of %o', cell);
                    throw new TypeError('undefined cell reference');
                }
                cell = temp;
                i--;
            }
            const dir = j >= 0 ? up : dn;
            j = Math.abs(j);
            while(j > 0) {
                const temp = cell.cells[dir];
                if(!temp) {
                    console.debug('undefined child branch cell of %o', cell);
                    throw new TypeError('undefined cell reference');
                }
                cell = temp;
                j--;
            }
            return cell;
        }

        const dx = Cell.DX * 2;
        const dy = Cell.DY * 3;
        const sides = [0, -1, 1];
        let [cellInd, lineInd, nodeInd] = [0, 0, 0];
        for(let i = 0; i < span; i++) {
            //  create the stem cell (j = 0), then the lower branch (j < 0), then the upper branch (j > 0)
            for(let s = 0; s < sides.length; s++) {
                for(let j = sides[s]; Math.abs(j) < (span + 1) / 2 && Math.abs(j) + i < span; j += sides[s]) {
                    const [q, r] = tree_to_axial(i, j);
                    const json = get_cell_json_at(i, j);
                    //  x, y relative to root cell
                    const [x0, y0] = [
                        (i + Math.abs(j) / 2) * dx,
                        (-j * dy)
                    ];

                    const nodeRefs: (SLNode | null)[] = [null, null, null, null, null, null];
                    const lineRefs: (Line | null)[] = [null, null, null, null, null, null];

                    const neighbors = get_neighbors_of(q, r);
                    const [dl, lf, ul] = [neighbors[3], neighbors[4], neighbors[5]];
                    //  check for left neighbor & copy refs
                    if(lf) {
                        nodeRefs[4] = lf.nodes[2];
                        nodeRefs[5] = lf.nodes[1];
                        lineRefs[4] = lf.lines[1];
                    }
                    //  check for upper left neighbor & copy refs
                    //  if refs copied from lf, don't overwrite them
                    if(ul) {
                        nodeRefs[0] = ul.nodes[2];
                        nodeRefs[5] = nodeRefs[5] || ul.nodes[3];   //  nodeRefs[5] will be null if not copied from lf
                        lineRefs[5] = ul.lines[2];
                    }
                    //  check for lower left neighbor & copy refs
                    //  if refs copied from lf, don't overwrite them
                    if(dl) {
                        nodeRefs[3] = dl.nodes[1];
                        nodeRefs[4] = nodeRefs[4] || dl.nodes[0];   //  nodeRefs[4] will be null if not copied from lf
                        lineRefs[3] = dl.lines[0];
                    }

                    const cell = new Cell(x0, y0, json, lineRefs, nodeRefs);
                    this.addCell(cell, cellInd++);
                    for(let n = 0; n < cell.nodes.length; n++) {
                        const node = cell.nodes[n];
                        if(node !== null) {
                            this.addNode(node, nodeInd++);
                        }
                    }
                    for(let l = 0; l < cell.ownLines.length; l++) {
                        const line = cell.ownLines[l];
                        if(line !== null) {
                            this.addLine(line, lineInd++);
                        }
                    }
                    board[q][r] = cell;

                    //  need to manually break this loop on the middle row (j = s = 0)
                    if(s === 0) {
                        break;
                    }
                }
            }
        }
        this.nodes = this.nodes.filter(n => n);
    }
    addCell(cell: Cell, i: number): void {
        if(!this.cells.includes(cell)) {
            this.cells[i] = cell;
        }
    }
    addLine(line: Line, i: number): void {
        if(!this.lines.includes(line)) {
            this.lines[i] = line;
        }
    }
    addNode(node: SLNode, i: number): void {
        if(!this.nodes.includes(node)) {
            this.nodes[i] = node;
        }
    }

    handleMouseMove(ev: MouseEvent): void {

        //  ts type narrowing to use offsetTop/Left properties
        if(!(ev.target instanceof HTMLElement)) {
            throw new Error(`unrecognized event target: ${ev.target}`);
        }

        //  this only works because we know the canvas's offset parent is the
        //  document body
        //  climbing the offsetParent hierarchy in typescript is a chore because
        //  offsetParent is a property of HTMLElement but its type is Element
        let x: number = ev.clientX - ev.target.offsetLeft - window.scrollX;
        let y: number = ev.clientY - ev.target.offsetTop - window.scrollY;

        this.ctx.translate(400, 300);
        this.ctx.translate(-this.radius * Cell.DX * 2, 0);

        //  set the drawing context's stroke wide for checking mouse position
        this.ctx.lineWidth = 5;

        //  apply current transform to mouse coords (i.e. convert mouse
        //  coords to ctx coords)
        const t = this.ctx.getTransform();
        const [xm, ym] = [(ev.offsetX - t.e) / t.a, (ev.offsetY - t.f) / t.d];

        //  check if the mouse is over a line
        this.mouse = null;
        for(let i = 0; i < this.lines.length; i++) {
            let bb = this.lines[i].bb;
            if(xm >= bb[0][0] && xm <= bb[0][1] && ym >= bb[1][0] && ym <= bb[1][1]) {
                if(this.ctx.isPointInStroke(this.lines[i].path, x, y)) {
                    this.mouse = this.lines[i];
                    break;
                }
            }
        }

        this.ctx.resetTransform();

        //  redraw the board
        //  it's probably a good idea to rework this process so that just the
        //  region surrounding cells that change are re-drawn (instead of the
        //  entire canvas)
        this.draw(400, 300);
    }
    //  manually save the current state on alt-click, otherwise pause/resume the simulation
    handleClick(ev: MouseEvent): void {

        //  if the mouse is over a line, set the line's state and/or assertion
        //
        //  middle click always de-asserts a line
        //
        //  right click fills and left click empties, unless the line
        //  already has that state, in which case it is de-asserted
        if(this.mouse) {
            //  if this click causes a line to be unset, no DOF updates are
            //  necessary
            //  otherwise, update DOF of both of the line's nodes
            //  0 => no update needed
            //  1 => redraw needed but not DOF
            //  2 => redraw & DOF update needed
            let update: number = 0;
            if(!this.mouse.asserted) {
                if(ev.button === 2) {
                    this.mouse.empty()
                    update = 2;
                }
                else if(ev.button === 0) {
                    this.mouse.fill()
                    update = 2;
                }
            }
            else if(ev.button === 1 || (ev.button && !this.mouse.state) || (this.mouse.state && !ev.button)) {
                if(this.mouse.unset()) {
                    update = 1;
                }
            }
            else {
                this.mouse.toggle();
                update = 2;
            }
            if(update > 0) {
                //  update DOF before draw so all resultant assertions are
                //  reflected
                if(update > 1) {
                    //  update DOF
                    this.mouse.nodes[0].updateDoF();
                    this.mouse.nodes[1].updateDoF();
                }
                this.draw(400, 300);
            }
        }
    }
    handleAuxClick(ev: MouseEvent): void {
        ev.preventDefault();
        this.handleClick(ev);
    }
    handleContextMenu(ev: MouseEvent): void {
        ev.preventDefault();
    }

    draw(x0: number, y0: number): void {

        SlitherLinkGame.frameRequest = 0;

        //  declare a local variable for the drawing context since its used
        //  so often
        let ctx: CanvasRenderingContext2D = this.ctx;
        ctx.resetTransform();
        ctx.clearRect(0, 0, 800, 600);

        //  set the given origin as the center of the board
        ctx.translate(x0, y0);

        //  shift the context to center the hex grid
        ctx.translate(-this.radius * Cell.DX * 2, 0);

        //  set line style for drawing cell outlines
        ctx.strokeStyle = CSSColor.black;
        ctx.lineWidth = 1;

        //  set font size & alignment so that cell numbers align correctly
        ctx.font = `24px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CSSColor.black;

        //  print each cell's count, if defined
        ctx.save();
        for(let i = 0; i < this.cells.length; ++i) {
            const count = this.cells[i].count;
            if(count !== null) {
                //  not sure why but characters look just a hair too high when drawn
                //  at cell.y, so adding 1 to lower them
                ctx.fillText(count.toString(), this.cells[i].x, this.cells[i].y + 1, Cell.RADIUS);
            }
        }
        ctx.restore();

        //  draw each line, accounting for its state and mouse presence
        ctx.save();
        ctx.lineWidth = Line.WIDTH;
        const dash = [Cell.RADIUS / 7];
        for(let i = 0; i < this.lines.length; i++) {
            if(!this.lines[i].asserted) {
                ctx.strokeStyle = CSSColor.gray;
                ctx.setLineDash(dash);
            }
            else {
                if(this.lines[i].state === LineState.LINE) {
                    ctx.strokeStyle = CSSColor.black;
                }
                else {
                    ctx.strokeStyle = CSSColor.lightgray;
                }
                ctx.setLineDash([]);
            }
            ctx.stroke(this.lines[i].path);
        }
        ctx.restore();

        //  if the mouse is above a line, draw it wider
        if(this.mouse) {
            ctx.save();

            //  highlight the line below the mouse
            ctx.lineWidth = Line.HOVER_WIDTH;
            ctx.lineCap = 'round';
            if(this.mouse.state === LineState.LINE) {
                ctx.strokeStyle = CSSColor.black;
            }
            else {
                ctx.strokeStyle = CSSColor.lightgray;
            }
            ctx.stroke(this.mouse.path);
            ctx.restore();
        }

        //  mark each node as valid or invalid
        ctx.save();
        for(let i = 0; i < this.nodes.length; i++) {
            if(this.nodes[i].isValid()) {
                ctx.fillStyle = CSSColor.green;
            }
            else {
                ctx.fillStyle = CSSColor.red;
            }
            ctx.fill(this.nodes[i].path);
        }
        ctx.restore();

        //  reset the transform
        ctx.resetTransform();
    }

    /** Accepts an optional lines argument to expedite in the case where lines
     *  are accessible in the calling context
     */
    setState(state: bigint | LineState[], lines?: Line[]): void {
        if(lines === undefined) {
            lines = this.lines;
        }

        if(Array.isArray(state)) {
            for(let i = 0; i < lines.length; i++) {
                lines[i].state = state[i];
            }
            return;
        }

        //  set each line's state based on corresponding bit in 'state'
        let lineMask = 1n;
        for(let i = 0; i < lines.length; i++) {
            lines[i].state = (state & lineMask) ? LineState.LINE : LineState.INDET;
            lineMask <<= 1n;
        }
    }
}

export default SlitherLinkGame;
