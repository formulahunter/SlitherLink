import Cell from './Cell.js';
import CSSColor from './CSSColor.js';
import Line, { LineState } from './Line.js';
import SLNode from './SLNode.js';
import { board_json, make_board } from './types.js';

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

    /** the layout of the `arms` array mimics the spiral-arm structure of the
     * raw `board_json` except that the center cell is also defined and is the
     * first element in all 6 arrays
     */
    arms: [Cell[], Cell[], Cell[], Cell[], Cell[], Cell[]] = [[], [], [], [], [], []];

    /** the `cells` array is meant to simplify neighbor-finding. it stores cells
     * in a grid using an [axial coordinate system][1] as `cells[x][y]`, where
     * +x runs horizontally to the right of the board and +y runs diagonally
     * toward the bottom-right of the board. the "origin" of this grid, for
     * purposes of array indexing, lies at the intersection of the bottom-left
     * and top "sides" of the board.
     *
     * [1]: https://www.redblobgames.com/grids/hexagons/#coordinates-axial
     */
    board: Cell[][];

    /** a flat array of all cells on the board for fast iteration - it's
     * probably not very useful beyond this as cells are simply added in
     * the order they're initialized in `generateRandom()`
     *
     * @private
     */
    cells: Cell[] = [];

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

        this.board = new Array(this.cellCount);
        this.lines = new Array(this.lineCount);
        this.nodes = new Array(this.nodeCount);

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

        //  get a raw spiral board structure
        const raw: board_json = make_board(radius);

        const dx = Cell.DX * 2;
        const dy = Cell.DY * 3;

        //  construct the center cell (which has no "own" lines)
        const center = new Cell(0, 0, []);

        //  the center cell is the first element in every "arm" array so that
        //  accessing arms[a][0] returns the center cell for any a
        this.arms = [[center], [center], [center], [center], [center], [center]];

        //  dh coefficients for calculating x, y grid coordinates from r, s
        //  coeffs[side][x=0 | y=1]
        //  multiply these coefficients by (dh + 1) to get offset from previous
        //  corner cell (in grid coordinates, origin @ center cell)
        const coeffs: number[][] = [
            [0, -1],
            [-1, 0],
            [-1, 1],
            [0, 1],
            [1, 0],
            [1, -1]
        ];

        //  offsets to account for implicit cell_json orientation
        //  these are used where indices must be rotated with the
        //  associated spiral arm
        const offsetsForSide: number[][] = [
            [0, 1, 2, 3, 4, 5],
            [1, 2, 3 ,4, 5, 0],
            [2, 3, 4, 5, 0, 1],
            [3, 4, 5 ,0, 1, 2],
            [4, 5, 0, 1, 2, 3],
            [5, 0, 1, 2, 3, 4]
        ];

        //  "triangle" numbers
        const triangles: number[] = [0];
        for(let n = 1; n <= radius; n++) {
            triangles[n] = triangles[n - 1] + n;
        }

        //  current height, iterated for each r
        let h: number = 0;

        //  final h value in the current ring
        let hMax = 0;

        //  iterate through "rings" from 0 to 'radius'
        //  center cell (r = 0) is implicitly defined
        let r: number = 1;

        //  loop condition uses raw[0].length, not 'radius' because the
        //  raw board structure will have (radius + 1) rings
        //  see note in `make_board` doc comment
        for(; r < raw[0].length; r++) {

            //  grid coordinates of preceding corner for each side for current r
            //  cornerBefore is irrespective of dh along current side s
            //  'coeffs' is defined for dh but can be used for r by offsetting
            //  the node/side index (i.e. 4 instead of 0, 5 instead of 1, etc.)
            const cornerBefore = [
                [r * coeffs[4][0], r * coeffs[4][1]],
                [r * coeffs[5][0], r * coeffs[5][1]],
                [r * coeffs[0][0], r * coeffs[0][1]],
                [r * coeffs[1][0], r * coeffs[1][1]],
                [r * coeffs[2][0], r * coeffs[2][1]],
                [r * coeffs[3][0], r * coeffs[3][1]]
            ];

            //  add current radius to maximum height
            hMax += r;

            //  height above starting height for current r
            let dh = 0;

            //  loop through cells along the current ring's edges
            for(; h < hMax; h++, dh++) {

                //  current arm in ring 'r', starting on side 0
                //  (incremented in the 's' loop's final expression)
                let a = 5 - (r + 4) % 6;

                //  construct the cells at height h on all sides
                //  note that a is incremented along with s
                for(let s = 0; s < 6; s++, a = (a + 1) % 6) {

                    //  calculate grid & canvas coordinates
                    const grid: number[] = [
                        coeffs[s][0] * (dh + 1) + cornerBefore[s][0],
                        coeffs[s][1] * (dh + 1) + cornerBefore[s][1]
                    ];
                    const canv: number[] = [
                        grid[0] * dx + grid[1] * dx / 2,
                        grid[1] * dy
                    ];

                    //  compile cell, node, & line refs from neighboring cells where defined
                    const offsets = offsetsForSide[s];
                    const next = this.arms[(a + 1) % 6];
                    const cellRefs: Cell[] = [
                        next[h + dh - r + 1]
                    ];
                    const nodeRefs: SLNode[] = [];
                    nodeRefs[0] = cellRefs[0].lines[offsets[4]].nodes[0];
                    nodeRefs[1] = cellRefs[0].lines[offsets[3]].nodes[0];
                    nodeRefs[4] = new SLNode(canv[0] + Cell.nodeOffsets[4][0], canv[1] + Cell.nodeOffsets[4][1]);
                    nodeRefs[5] = new SLNode(canv[0] + Cell.nodeOffsets[5][0], canv[1] + Cell.nodeOffsets[5][1]);

                    const lineRefs: Line[] = [];
                    lineRefs[0] = new Line(raw[a][h][0], nodeRefs[0], nodeRefs[1]);
                    lineRefs[4] = new Line(raw[a][h][2], nodeRefs[4], nodeRefs[5]);
                    lineRefs[5] = new Line(raw[a][h][1], nodeRefs[5], nodeRefs[0]);

                    //  if this is not the first ring, the "next" arm is defined
                    //  otherwise we have to make sure
                    if(h > 0) {
                        cellRefs[1] = next[h + dh - r];
                        lineRefs[1] = cellRefs[1].lines[offsets[4]];
                        nodeRefs[2] = lineRefs[1].nodes[1];

                        //  if this is not the arm's first cell in a new ring,
                        //  also get line and node refs from the previous cell in
                        //  the same arm
                        if(dh > 0) {
                            cellRefs[2] = this.arms[a][h - 1];
                            lineRefs[2] = cellRefs[2].lines[offsets[2]];
                            nodeRefs[3] = lineRefs[2].nodes[1];
                        }
                    }
                    else if(s > 0) {
                        //
                    }

                    const cell = new Cell(grid[0], grid[1], [lineRefs[0], lineRefs[5], lineRefs[4]], lineRefs);

                    //  add lines to container array (mainly used for rendering)
                    let lineCount = this.lines.length;
                    this.lines[lineCount++] = cell.ownLines[0];
                    this.lines[lineCount++] = cell.ownLines[1];
                    this.lines[lineCount++] = cell.ownLines[2];

                    //  offset grid coordinates x & y by the board radius to
                    //  avoid negative indices
                    this.board[grid[0] + radius][grid[1] + radius] = cell;

                    //  add 1 to h b/c center cell defined as first element in each arm
                    this.arms[a][h + 1] = cell;

                    this.cells[this.cells.length] = cell;
                }
            }
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
            else if(ev.button === 1 || (ev.button && !this.mouse.filled) || (this.mouse.filled && !ev.button)) {
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
        for(let i = 0; i < this.board.length; ++i) {
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
                if(this.lines[i].filled) {
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
            if(this.mouse.filled) {
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
                lines[i].filled = !!state[i];
            }
            return;
        }

        //  set each line's state based on corresponding bit in 'state'
        let lineMask = 1n;
        for(let i = 0; i < lines.length; i++) {
            lines[i].filled = !!(state & lineMask);
            lineMask <<= 1n;
        }
    }
}

export default SlitherLinkGame;
