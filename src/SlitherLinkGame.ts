import Cell from './Cell.js';
import CSSColor from './CSSColor.js';
import Line, { LineState } from './Line.js';
import SLNode from './SLNode.js';
import { cell_json, hex_dirs, make_stem_cell } from './types.js';

//  local constants for convenience
//@ts-ignore: TS6133: 'up_op' is declared but its value is never read.
const { up, rt, dn, up_op, lf, dn_op } = hex_dirs;

class SlitherLinkGame {

    //  total number of possible states as 2 ^ (# of lines)
    //  a board 3 cells wide has 30 lines
    static numStates: bigint = BigInt(0);

    //  compute 256 states per frame b/c the frame rate is fast enough that
    //  they're barely visible anyway
    static statesPerFrame: number = Math.pow(2, 8);
    static initialState: bigint = BigInt(302492928);
    static startTime: DOMHighResTimeStamp;
    static stateProgress: number = 0;

    //  frame request id returned by requestAnimationFrame()
    //  used to pause/resume simulation
    static frameRequest: number = 0;

    //  next state to calculate on resuming simulation
    static resumeState: bigint = BigInt(-1);

    //  server request on initial page load
    static progressRequest: Promise<Response> = fetch('/progress', {method: 'GET'});

    //  periodic logging parameters
    static logPeriod: number = 60 * 1000;   //  milliseconds between log messages
    static lastLog: DOMHighResTimeStamp = 0;

    //  states with at least 1 valid loop
    static validLoopStates: bigint[] = [];

    // private canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;

    //  size parameter (number of cells across long diagonal)
    readonly size: number = -1;

    //  container arrays
    board: Cell[][] = [];
    cells: Cell[] = [];
    private readonly lines: Line[] = [];
    private nodes: SLNode[] = [];

    /** construct SlitherLinkGame with a given board size
     *
     * @param size - number of cells in the middle horizontal
     * @param canvas - canvas element on which the game will be drawn
     */
    constructor(size: number, canvas: HTMLCanvasElement) {

        this.size = size;

        //  define event listeners on canvas element
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
        canvas.addEventListener('click', this.handleClick.bind(this));

        // this.canvas = canvas;
        let ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if(ctx === null) {
            throw new Error('unable to get canvas rendering context');
        }
        this.ctx = ctx;

        //  size must be odd
        //  add 1 if even number given
        if(size % 2 === 0) {
            size += 1;
        }

        //  the total number of rows will be equal to the given width of the
        //  middle row
        this.generateRandom(size);

        //  define a number whose 32 binary digits will be used to encode the
        //  state of each line (30 lines total for size = 3)
        SlitherLinkGame.numStates = BigInt(Math.pow(2, this.lines.length));

        //  draw the initial board
        this.draw(400, 300);
    }

    /** iterate through all possible combinations of line states (on/off) to
     *  identify valid solutions
     */
    async combinate(initialState?: bigint): Promise<void> {
        //  if this is the first time spinning up the sim, get progress/initial state from the server
        //  still give priority to the 'initialState' argument, if provided
        if(!initialState && SlitherLinkGame.resumeState === BigInt(-1)) {
            let res = await SlitherLinkGame.progressRequest;
            try {
                SlitherLinkGame.resumeState = BigInt(await res.text());
            }
            catch(er) {
                console.error(er);
                console.error('unable to parse response from server progress request\nfalling back to \'initialState\'');
                SlitherLinkGame.resumeState = SlitherLinkGame.initialState;
            }
        }

        //  record/log starting time & initial state for this run
        SlitherLinkGame.startTime = performance.now();
        SlitherLinkGame.initialState = initialState || SlitherLinkGame.resumeState;
        console.log(`starting simulation at ${SlitherLinkGame.startTime} with state ${(SlitherLinkGame.initialState)}`);
        console.warn('simulation will not stop itself -- click on the canvas to pause/resume');

        SlitherLinkGame.frameRequest = window.requestAnimationFrame(this.drawComboFrame.bind(this, this.lines, SlitherLinkGame.initialState));
    }
    /** animate frames by setting each line state to the corresponding bit in
     *  'currentState'
     * @param lines
     * @param currentState
     * @param currentTime
     */
    private drawComboFrame(lines: Line[], currentState: bigint, currentTime: DOMHighResTimeStamp) {

        //  un-set the frame request in case this method does not run to completion (where a new request ID will be assigned)
        SlitherLinkGame.frameRequest = 0;

        for(let i = 0; i < SlitherLinkGame.statesPerFrame; ++i) {

            this.setState(currentState, lines);
            if(this.checkWin()) {
                SlitherLinkGame.validLoopStates.push(currentState);
                // console.info(`new win state: ${currentState}\n`
                //     + `total win states identified: ${SlitherLinkGame.validLoopStates.length}`);
            }

            currentState++;
        }
        //  update the live progress locally and on the server
        SlitherLinkGame.resumeState = currentState;
        if(currentTime > SlitherLinkGame.lastLog + SlitherLinkGame.logPeriod) {
            this.logProgress(currentState);
            this.logCurrentRun(currentState, currentTime);
            SlitherLinkGame.lastLog = currentTime;
        }

        this.draw(400, 300);

        //  assign the new request id to be used to pause simulation in a canvas 'click' event
        SlitherLinkGame.frameRequest = window.requestAnimationFrame(this.drawComboFrame.bind(this, lines, currentState));
    }

    /** check if the current game state is a valid solution
     *  this is determined by three criteria:
     *  1. every filled line on the board is part of a single, continuous loop
     *      a. multiple loops => invalid
     *      b. any "dangling" lines => invalid
     *  2. every cell's count requirement is satisfied
     *  3. every cell must contribute at least 1 edge to the solution
     *      a. consider including rejected as "contributing" edges, i.e.
     *      every cell must have at least one edge that is either a
     *      confirmed line or proven blank
     */
    checkWin(): boolean {

        //  find the first line that is "on"
        let filledLines: Line[] = this.lines.filter(line => line.state === LineState.LINE);

        //  if no lines are filled in yet, the game has not been solved
        if(filledLines.length === 0) {
            return false;
        }

        //  follow the path until it returns to its start point or ends
        //  count the number of lines traversed for comparison to filledLines.length
        const start = filledLines[0];
        let currentLine: Line = start;
        let currentNode: SLNode = currentLine.start;
        let lineCount: number = 1;
        do {
            if(currentNode === currentLine.nodes[0]) {
                currentNode = currentLine.nodes[1];
            }
            else {
                currentNode = currentLine.nodes[0];
            }

            //  verify that exactly two filled lines meet at the current node
            let ind = currentNode.lines.indexOf(currentLine);
            const [left, right] = [currentNode.lines[(ind + 1) % 3], currentNode.lines[(ind + 2) % 3]];
            //  if either line is undefined (e.g. along the perimeter), only check the one that is defined
            //  if not filled, the path ends => win condition fails
            if(!left || !right) {
                const next = left ? left : right;
                if(next.state !== LineState.LINE) {
                    return false;
                }
                currentLine = next;
            }
            //  if both opposing lines have the same state, win condition fails regardless of what that state is
            //  else if exactly one opposing line has state LINE, it is the next line in the path
            //  else the path ends -> win condition fails
            else if(left.state === right.state) {
                return false;
            }
            else if(left.state === LineState.LINE) {
                currentLine = left;
            }
            else if(right.state === LineState.LINE) {
                currentLine = right;
            }
            else {
                return false
            }
            lineCount++;

        } while(currentLine !== start);

        //  if some filled lines were not traversed, win condition fails
        if(lineCount < filledLines.length) {
            return false;
        }

        //  confirm that every cell on the board "contributes" to the solution
        for(let i = 0; i < this.cells.length; i++) {
            let contrib = false;
            for(let k = 0; k < this.cells[i].lines.length; k++) {
                //  a given cell "contributes" if at least one of its lines are part of the solution
                if(this.cells[i].lines[k].state !== LineState.INDET) {
                    contrib = true;
                    break;
                }
            }
            if(!contrib) {
                return false;
            }
        }

        return true;
    }

    private generateRandom(size: number) {

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

        //  populate a 2D array of cells references by axial coordinates
        const board: Cell[][] = [];
        for(let q = 0; q < size; q++) {
            board[q] = [];
        }

        //  get neighbors of the cell at [q, r], arranged in order corresponding to shared line positions
        function get_neighbors_of(q: number, r: number): (Cell | null)[] {
            //  validate the given axial coordinates
            if(q < 0 || q > size - 1) {
                console.error(`q = ${q} is outside of valid range (0, ${size - 1})`);
                throw new RangeError('out-of-range axial coordinate q');
            }
            if(r < 0 || r > size - 1) {
                console.error(`r = ${r} is outside of valid range (0, ${size - 1})`);
                throw new RangeError('out-of-range axial coordinate r');
            }
            if(Math.abs(r - q) > (size - 1) / 2) {
                console.error(`[q, r] = [${q}, ${r}] fails limiting condition ==> abs(${r} - ${q}) > (${size} - 1) / 2`);
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
        const root: cell_json = make_stem_cell(size);

        //  get the raw cell at grid position [i, j]
        //  i gives the stem position, j gives the branch position (both are zero-indexed)
        function get_cell_json_at(i: number, j: number): cell_json {
            if((i + j) >= size || j > (size - 1) / 2) {
                throw new Error(`invalid tree position [${i}, ${j}] for grid of size ${size}`);
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
        for(let i = 0; i < size; i++) {
            //  create the stem cell (j = 0), then the lower branch (j < 0), then the upper branch (j > 0)
            for(let s = 0; s < sides.length; s++) {
                for(let j = sides[s]; Math.abs(j) < (size + 1) / 2 && Math.abs(j) + i < size; j += sides[s]) {
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
                    this.addCell(cell);
                    for(let n = 0; n < cell.nodes.length; n++) {
                        if(nodeRefs[n] === null) {
                            this.addNode(cell.nodes[n]);
                        }
                    }
                    for(let l = 0; l < cell.lines.length; l++) {
                        if(lineRefs[l] === null) {
                            this.addLine(cell.lines[l]);
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
        this.board = board;
    }
    addCell(cell: Cell): void {
        if(!this.cells.includes(cell)) {
            this.cells.push(cell);
        }
    }
    addLine(line: Line): void {
        if(!this.lines.includes(line)) {
            this.lines.push(line);
        }
    }
    addNode(node: SLNode): void {
        if(!this.nodes.includes(node)) {
            this.nodes.push(node);
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

        //  identify the cell under the mouse, if any
        //  there is probably a better way to do this - shouldn't have to loop
        //  over so many cells each time mousemove fires (which can easily
        //  happen dozens of times per second)
        this.ctx.translate(400, 300);
        this.ctx.translate(-(this.size * Cell.DX * 2) / 2, 0);
        for(let i = 0; i < this.cells.length; i++) {
            this.cells[i].mouse = this.ctx.isPointInPath(this.cells[i].getPath(), x, y);
        }
        this.ctx.resetTransform();

        //  redraw the board
        //  it's probably a good idea to rework this process so that just the
        //  region surrounding cells that change are re-drawn (instead of the
        //  entire canvas)
        this.draw(400, 300);
    }
    handleClick(_ev: MouseEvent): void {
        //  pause the simulation if it is currently running, otherwise resume it
        if(SlitherLinkGame.frameRequest) {
            window.cancelAnimationFrame(SlitherLinkGame.frameRequest);
            SlitherLinkGame.frameRequest = 0;

            let progress: number = Number(BigInt(1000) * SlitherLinkGame.resumeState / SlitherLinkGame.numStates);
            let percent = `${(Number(progress) / 10).toFixed(2)}%`;
            this.logProgress(SlitherLinkGame.resumeState - BigInt(1));
            this.logCurrentRun(SlitherLinkGame.resumeState - BigInt(1));
            console.log(`paused: next state to compute is ${SlitherLinkGame.resumeState} (${percent})`);
        }
        else {
            this.combinate();
        }
    }

    draw(x0: number, y0: number): void {

        //  declare a local variable for the drawing context since its used
        //  so often
        let ctx: CanvasRenderingContext2D = this.ctx;
        ctx.clearRect(0, 0, 800, 600);

        //  set the given origin as the center of the board
        ctx.resetTransform();
        ctx.translate(x0, y0);

        //  shift the context to center the hex grid
        ctx.translate(-(this.size * Cell.DX * 2) / 2, 0);

        //  set line style for drawing cell outlines
        ctx.strokeStyle = CSSColor.black;
        ctx.lineWidth = 1;

        //  set font size & alignment so that cell numbers align correctly
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CSSColor.black;

        //  pass the drawing context to each cell to draw their outlines and
        //  counts
        //  identify the cell beneath the mouse
        // let hover: Cell | null = null;
        for(let i = 0; i < this.cells.length; ++i) {
            this.cells[i].draw(ctx);
            // if(this.cells[i].mouse) {
            //     hover = this.cells[i];
            // }
        }

        //  highlight the neighbors of the highlighted cell
        // if(hover !== null) {
        //     ctx.save();
        //
        //     //  highlight neighbors
        //     ctx.fillStyle = CSSColor.lightgreen;
        //     for(let i = 0; i < 6; ++i) {
        //         hover.getNeighbor(hover.lines[i])?.draw(ctx, i.toString());
        //     }
        //     ctx.restore();
        // }

        //  reset the transform
        ctx.resetTransform();
    }

    /** log big-picture progress */
    async logProgress(currentState: bigint): Promise<void> {
        SlitherLinkGame.stateProgress = Number(BigInt(1000) * currentState / SlitherLinkGame.numStates);

        //  POST current state to server
        const req = fetch('/progress', {
            method: 'POST',
            body: JSON.stringify({progress: currentState.toString()}),
            headers: {
                'Content-Type': 'application/json',
                Accept: '*'
            }
        });
        const percent = (SlitherLinkGame.stateProgress / 10).toFixed(2);
        console.log(`${currentState} of ${SlitherLinkGame.numStates} states checked (${percent}%)`);

        const res = await req;
        if(res.status !== 200) {
            console.warn(`unexpected status code received from server progress update: ${res.status} - ${res.statusText}\n`
                + 'verify that progress was written to file');
        }

    }
    /** log stats of current simulation run (since started/resumed) */
    logCurrentRun(currentState: bigint, currentTime: DOMHighResTimeStamp = performance.now()): void {
        const elapsedTime: number = (currentTime - SlitherLinkGame.startTime) / 1000;
        const elapsedStates: bigint = currentState - SlitherLinkGame.initialState;
        const avg = Number(elapsedStates) / elapsedTime;   //  convert ms to seconds (cast BigInts back to Numbers to preserve sigfigs that would otherwise be lost to rounding)
        console.log(`current run: ${elapsedStates} states in ${elapsedTime.toFixed(3)}s (${avg.toFixed(3)} states/s)`);
    }

    /** Accepts an optional lines argument to expedite in the case where lines
     *  are accessible in the calling context
     */
    setState(state: bigint, lines?: Line[]): void {
        if(lines === undefined) {
            lines = this.lines;
        }

        //  set each line's state based on corresponding bit in 'state'
        for(let i = 0; i < lines.length; i++) {
            lines[i].state = (state & BigInt(Math.pow(2, i))) ? LineState.LINE : LineState.INDET;
        }
    }
}

export default SlitherLinkGame;
