import Cell from './Cell.js';
import CSSColor from './CSSColor.js';
import Line, { LineState } from './Line.js';
import SLNode from './SLNode.js';
import { cell_json, hex_dirs, make_stem_cell } from './types.js';

//  local constants for convenience
//@ts-ignore: TS6133: 'up_op' is declared but its value is never read.
const { up, rt, dn, up_op, lf, dn_op } = hex_dirs;

//  get an integer whose binary form indicates the bits that changed when the argument was incremented to its
//  current value
function getBitsChanged(s: bigint): bigint {
    //  previous value of s
    const s_1 = s - 1n;
    //  true for each bit that changed from 0 -> 1 or 1 -> 0; this will include the highest-order changed bit
    //  and, incidentally, every lower-order bit
    return ~( (s & s_1) | ~(s | s_1) );
}
//  get the index of the highest-order line whose state will be changed next time 'currentState' is incremented
const shift: bigint = 1n;
//  get the base-2 magnitude (effectively the position of the highest-order bit) of the change when 'state'
//  was incremented from its previous values
function getChangeMagnitudeBase2(state: bigint): number {
    let magnitude: bigint = getBitsChanged(state);
    let i = -1;
    while(magnitude) {
        magnitude >>= shift;
        i++;
    }
    return i;
}
//  return 1 if the given line is filled in 'state', otherwise return 0
function getLineState(lineIndex: number, state: bigint): (1 | 0) {
    return state & 1n << BigInt(lineIndex) ? 1 : 0;
}

let invalidCount: number = -1;
class SlitherLinkGame {

    //  total number of possible states as 2 ^ (# of lines)
    //  a board 3 cells wide has 30 lines
    static numStates: bigint = -1n;

    //  compute 256 states per frame b/c the frame rate is fast enough that
    //  they're barely visible anyway
    static statesPerFrame: number = Math.pow(2, 8);
    static initialState: bigint = 869730877n;
    static startTime: DOMHighResTimeStamp;
    static stateProgress: number = 0;

    //  frame request id returned by requestAnimationFrame()
    //  used to schedule animation frames
    static frameRequest: number = 0;

    //  timeout id returned by setTimeout
    //  used to pause/resume simulation
    simTimeout: number = 0;

    //  records used for measuring performance of each sim sprint
    startTime: number = -1;
    startState: bigint = -1n;

    //  next state to calculate on resuming simulation
    static resumeState: bigint = -1n;

    //  server request on initial page load
    static progressRequest: Promise<Response> = fetch('/progress', {method: 'GET'});

    //  periodic logging parameters
    static logPeriod: number = 15 * 1000;   //  milliseconds between log messages
    static nextLog: DOMHighResTimeStamp = 0;

    //  states with at least 1 valid loop
    static validLoopStates: LineState[][] = [];

    // private canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;

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

        //  define a number whose 32 binary digits will be used to encode the
        //  state of each line (30 lines total for span = 3)
        SlitherLinkGame.numStates = 2n ** BigInt(this.lineCount);

        //  define event listeners on canvas element
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
        canvas.addEventListener('click', this.handleClick.bind(this));

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

    /** iterate through all possible combinations of line states (on/off) to
     *  identify valid solutions
     */
    async combinate(initialState?: bigint): Promise<void> {
        //  if this is the first time spinning up the sim, get progress/initial state from the server
        //  still give priority to the 'initialState' argument, if provided
        if(!initialState && SlitherLinkGame.resumeState === -1n) {
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
        SlitherLinkGame.nextLog = SlitherLinkGame.startTime + SlitherLinkGame.logPeriod;
        SlitherLinkGame.initialState = initialState || SlitherLinkGame.resumeState;
        SlitherLinkGame.stateProgress = Number(1000n * (SlitherLinkGame.initialState + 1n) / SlitherLinkGame.numStates);

        const percent = (SlitherLinkGame.stateProgress / 10).toFixed(2);
        console.log(`starting simulation with state ${(SlitherLinkGame.initialState)}\n${percent}% %cof ${SlitherLinkGame.numStates}`, 'color: #888888');
        console.info('%csimulation will not stop itself\n%cclick on the canvas to pause/resume', 'color: #e0e0a0; background-color: #606040;', 'color: #888888; background-color: unset;');

        this.simTimeout = window.setTimeout(this.drawComboFrame.bind(this, this.lines, SlitherLinkGame.initialState), 0);
    }
    /** animate frames by setting each line state to the corresponding bit in
     *  'currentState'
     * @param lines
     * @param currentState
     */
    private drawComboFrame(lines: Line[], currentState: bigint) {

        //  un-set the timeout id in case this method does not run to completion (where a new ID will be assigned)
        this.simTimeout = 0;

        if(this.startTime < 0) {
            this.startTime = performance.now();
            this.startState = currentState;
        }

        const s: LineState[] = lines.map(line => line.state);
        const l: number[][] = lines.map(line => line.nodes.map(node => this.nodes.indexOf(node)));
        const n: number[][] = this.nodes.map(node => node.lines.map(line => lines.indexOf(line)));
        // console.debug(s);
        // console.debug(l);
        // console.debug(n);

        const yieldSchedule = performance.now() + 50;
        while(performance.now() < yieldSchedule) {

            if(currentState === SlitherLinkGame.numStates - 1n) {
                SlitherLinkGame.resumeState = currentState;
                this.logProgress(currentState);
                this.saveProgress(SlitherLinkGame.resumeState);
                console.log('%call states checked', 'color: #a0e0a0; background-color: #406040;');
                this.draw(400, 300);
                return;
            }

            // //  check states until a valid one is found
            // let v = false;
            // while(!v) {
            //
            //     //  check every node on the board
            //     let chk: number[] = [];
            //     //  will il always be the lowest-index line...?
            //     //  if so this can use a while loop and the index can be used in subsequent increment loops
            //     for(let il = 0; il < l.length; il++) {
            //         //  each line has two nodes
            //         for(let inl = 0; inl < 2; inl++) {
            //             //  but skip a node if it's already been checked
            //             if(chk.includes(l[il][inl])) {
            //                 continue;
            //             }
            //             //  get the node's lines and mark it so it won't be checked again
            //             const nd = n[l[il][inl]];
            //             chk.push(l[il][inl]);
            //
            //             //  check whether this node has a null line and, if so, which one it is
            //             const izn = nd[0] === -1 ? 0 : nd[1] === -1 ? 1 : nd[2] === -1 ? 2 : -1;
            //
            //             //  index of highest-order line at node
            //             let ilhn = nd[0] > nd[1] ? nd[0] > nd[2] ? nd[0] : nd[2] : nd[1] > nd[2] ? nd[1] : nd[2];
            //
            //             //  index of lowest-order line at the node
            //             const illn = (ilhn + 1) % 3 === izn ? (ilhn + 2) % 3 : (ilhn + 1) % 3;
            //
            //             //  determine if node is valid
            //             v = izn === -1
            //                 ? !s[nd[0]] !== (s[nd[1]] !== s[nd[2]])     //  if two nodes match, third must be empty; else third must be filled
            //                 : s[nd[illn]] === s[nd[ilhn]];              //  both nodes must match
            //
            //             //  stop checking this line's nodes if either one is invalid
            //             if(!v) {
            //                 break;
            //             }
            //         }
            //
            //         //  set s[] to the next valid state
            //         //  --> if not valid, increment the current line's state & reset lower-index lines
            //         //  --> otherwise increment the first line's state
            //         //  note that incrementing a line's state implies propagating upward to higher-index lines
            //         //  directly analogous to incrementing a bitwise state integer
            //         let inc: number = v ? 0 : il;
            //         if(!v) {
            //             //  increment this line's state lmin and propagate upward
            //             //  clear state of all lower-order lines
            //             //  start over with the first line
            //             inc = il;
            //         }
            //         for(let i = 0; i < inc; i++) {
            //             s[i] = 0;
            //         }
            //         for(let i = inc; i < s.length; i++) {
            //             if(s[i] === 0) {
            //                 s[i] = 1;
            //                 break;
            //             }
            //             s[i] = 0;
            //         }
            //         if(inc) {
            //             il = 0;    //  il will be incremented before the start of the next iteration
            //         }
            //     }
            // }
            //
            // const state = s.slice().reverse().join('');
            // if(v) {
            //     console.info(`valid state ${state}`);
            //     if(this.checkWin()) {
            //         SlitherLinkGame.validLoopStates.push(s.slice());
            //         console.info(`new win state: ${currentState}\n`
            //             + `total win states identified: ${SlitherLinkGame.validLoopStates.length}`);
            //     }
            // }

            let v: boolean = false;
            while(!v) {
                v = true;
                let loLine: number = Number.POSITIVE_INFINITY;
                const chk: number[] = [];   //  indices of nodes that have already been checked
                for(let i = 0; i < l.length; i++) {
                    let lo: [number, number] = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
                    for(let j = 0; j < 2; j++) {
                        const node = l[i][j];
                        if(chk.indexOf(node) >= 0) {
                            continue;
                        }
                        chk.push(node);

                        //  count of filled lines at this node
                        let c = 0;

                        //  add each line's state to this node's count and find its lowest-index line
                        for(let k = 0; k < n[node].length; k++) {
                            const ind = n[node][k];
                            if(ind < 0) {
                                continue;
                            }
                            c += s[ind];
                            if(ind < lo[j]) {
                                lo[j] = ind;
                            }
                        }

                        //  nodes must have exactly zero or two filled lines
                        if(c % 2) {
                            v = false;
                            break;
                        }
                    }
                    //  identify the line to increment if the current state is not valid
                    if(!v) {
                        if(lo[0] > -1) {
                            loLine = lo[0] < loLine ? lo[0] : loLine;
                        }
                        if(lo[1] > -1) {
                            loLine = lo[1] < loLine ? lo[1] : loLine;
                        }
                        break;
                    }
                }
                //  advance to the next valid state
                //  skip any states in which a currently invalid node would remain invalid
                //  if all nodes are valid, just advance the lowest-index line's state
                for(let j = 0; j < loLine; j++) {
                    s[j] = 0;
                }
                for(let j = loLine; j < l.length; j++) {
                    if(s[j] === 0) {
                        s[j] = 1;
                        break;
                    }
                    s[j] = 0;
                }
            }
        }

        //  express current state as an integer
        currentState = 0n;
        for(let i = s.length - 1; i >= 0; i--) {
            currentState = (currentState << 1n) + BigInt(s[i]);
        }

        //  state must be set to change what gets animated by draw()
        this.setState(currentState, lines);

        //  update the live progress locally and on the server
        SlitherLinkGame.resumeState = currentState;
        const currentTime = performance.now();
        if(currentTime > SlitherLinkGame.nextLog) {
            this.logProgress(currentState, currentTime);
            this.logCurrentRun(currentState - this.startState, (currentTime - this.startTime) / 1000, invalidCount || undefined);
            this.startTime = -1;
            this.startState = -1n;
            invalidCount = 0;
            this.saveProgress(currentState);
        }

        //  if the most recent frame has been drawn to the canvas, request the next frame
        if(!SlitherLinkGame.frameRequest) {
            SlitherLinkGame.frameRequest = window.requestAnimationFrame(this.draw.bind(this, 400, 300));
        }

        //  schedule another run on the window's execution queue
        //  if a 'click' event is pending/queued, this will be cleared before it is invoked
        this.simTimeout = window.setTimeout(this.drawComboFrame.bind(this, lines, currentState));
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

        //  identify the cell under the mouse, if any
        //  there is probably a better way to do this - shouldn't have to loop
        //  over so many cells each time mousemove fires (which can easily
        //  happen dozens of times per second)
        this.ctx.translate(400, 300);
        this.ctx.translate(-this.radius * Cell.DX * 2, 0);
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
    //  manually save the current state on alt-click, otherwise pause/resume the simulation
    handleClick(ev: MouseEvent): void {

        //  alt+click => log progress but don't pause the sim
        if(ev.altKey) {
            this.saveProgress();
            return;
        }

        //  log current progress
        this.logProgress(SlitherLinkGame.resumeState);
        this.logCurrentRun(SlitherLinkGame.resumeState);

        //  pause/resume simulation
        this.toggleSimulation();
    }
    //  pause the simulation if it is currently running, otherwise resume it
    toggleSimulation(): void {
        if(this.simTimeout) {
            this.pauseSimulation();
        }
        else {
            this.resumeSimulation();
        }
    }
    //  pause the simulation if it is currently running
    pauseSimulation(): void {
        if(!this.simTimeout) {
            return;
        }

        window.clearTimeout(this.simTimeout);
        this.simTimeout = 0;
        let progress: number = Number(1000n * SlitherLinkGame.resumeState / SlitherLinkGame.numStates);
        let percent = `${(Number(progress) / 10).toFixed(2)}%`;
        console.log(`paused after ${SlitherLinkGame.resumeState} states (${percent})`);
        console.info(`%cnext state to compute is ${SlitherLinkGame.resumeState} `, 'color: #888888;');
    }
    //  start/resume the simulation if it is currently paused
    resumeSimulation(): void {
        if(this.simTimeout) {
            return;
        }
        this.combinate();
    }

    draw(x0: number, y0: number): void {

        SlitherLinkGame.frameRequest = 0;

        //  declare a local variable for the drawing context since its used
        //  so often
        let ctx: CanvasRenderingContext2D = this.ctx;
        ctx.clearRect(0, 0, 800, 600);

        //  set the given origin as the center of the board
        ctx.resetTransform();
        ctx.translate(x0, y0);

        //  shift the context to center the hex grid
        ctx.translate(-this.radius * Cell.DX * 2, 0);

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
    logProgress(statesChecked: bigint, currentTime: DOMHighResTimeStamp = performance.now()): void {
        SlitherLinkGame.stateProgress = Number(1000n * (statesChecked + 1n) / SlitherLinkGame.numStates);

        const percent = (SlitherLinkGame.stateProgress / 10).toFixed(2);
        console.log(`${statesChecked} states checked\n${percent}% %cof ${SlitherLinkGame.numStates} states`, 'color: #888888;');
        SlitherLinkGame.nextLog = currentTime + SlitherLinkGame.logPeriod;
    }
    /** log stats of current simulation run (since started/resumed) */
    logCurrentRun(elapsedStates: bigint, elapsedTime: DOMHighResTimeStamp = (performance.now() - this.startTime) / 1000, invalids?: number): void {
        const avg = Number(elapsedStates) / elapsedTime;   //  convert ms to seconds (cast BigInts back to Numbers to preserve sigfigs that would otherwise be lost to rounding)
        console.info(`current run: ${avg.toFixed(1)} states/s\n%c${elapsedStates} states in ${(elapsedTime).toFixed(3)}s`, 'color: #888888;');
        if(invalids !== undefined) {
            console.debug(`%cskipped checking ${invalids} invalid states`, 'color: #888888');
        }
    }
    /** save current progress to server */
    async saveProgress(currentState: bigint = SlitherLinkGame.resumeState): Promise<boolean> {
        //  POST current state to server
        const req = fetch('progress', {
            method: 'POST',
            body: JSON.stringify({progress: currentState.toString()}),
            headers: {
                'Content-Type': 'application/json',
                Accept: '*'
            }
        });
        const res = await req;

        //  return true if request was successful
        if(res && res.status === 200) {
            console.log('%cprogress saved to server', 'color: #a0e0a0; background-color: #406040;');
            console.info(`%c${currentState} of ${SlitherLinkGame.numStates} states`, 'color: #888888; background-color: unset;');
            return true;
        }

        //  log the request failure & return false
        if(!res) {
            console.error(`no response received from server\nverify that progress was written`);
        }
        else if(res.status !== 200) {
            console.warn(`unexpected status code received from server: ${res.status} - ${res.statusText}\n`);
        }
        console.warn(`verify that progress was written to file (currently ${currentState} of ${SlitherLinkGame.resumeState} states)`);
        return false
    }

    /** Accepts an optional lines argument to expedite in the case where lines
     *  are accessible in the calling context
     */
    setState(state: bigint, lines?: Line[]): void {
        if(lines === undefined) {
            lines = this.lines;
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
