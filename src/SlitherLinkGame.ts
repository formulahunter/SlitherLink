import Cell from './Cell.js';
import CSSColor from './CSSColor.js';
import Line, { LineState } from './Line.js';
import SLNode from './SLNode.js';

//  ⋰⋱⋮⋯│─┄┆╱╲

class SlitherLinkGame {

    //  total number of possible states as 2 ^ (# of lines)
    //  a board 3 cells wide has 30 lines
    static numStates: bigint = BigInt(0);

    //  compute 256 states per frame b/c the frame rate is fast enough that
    //  they're barely visible anyway
    static statesPerFrame: number = Math.pow(2, 8);
    static initialState: bigint = BigInt(106581248);
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

    //  1/2 cell width
    static readonly cellRadius: number = 10;

    // private canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;

    //  container arrays
    private rows: Cell[][];
    private readonly lines: Line[];

    /** construct SlitherLinkGame with a given board size
     *
     * @param size - number of cells in the middle horizontal
     * @param canvas - canvas element on which the game will be drawn
     */
    constructor(size: number, canvas: HTMLCanvasElement) {

        //  define event listeners on canvas element
        // canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
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
        this.rows = new Array(Math.ceil(size));
        this.generateRandom(size);
        this.lines = this.getAllLines();

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
     *      a. (...what was this for...?)
     *  2. every cell's count requirement is satisfied
     *  3. every cell must contribute at least 1 edge to the solution
     *      a. consider including rejected as "contributing" edges, i.e.
     *      every cell must have at least one edge that is either a
     *      confirmed line or proven blank
     */
    checkWin(): boolean {

        //  find the first line that is "on"
        let filledLines: Line[] = this.rows.flatMap(row =>
            row.flatMap(cell =>
                cell.lines.filter(line => line !== null && line.proven)
            )
        );

        //  if no lines are filled in yet, the game has not been solved
        if(filledLines.length === 0) {
            return false;
        }

        //  THIS LOOP ONLY CHECKS FOR A CONTINUOUS LOOP
        //  EVEN IF TRUE, IT MAY NOT BE THE ONLY ONE
        let currentLine: Line = filledLines[0];
        let currentNode: SLNode = currentLine.start;
        do {
            currentNode = currentLine.getOppositeNode(currentNode);

            //  verify that exactly two filled lines meet at the current node
            let next: Line | null = currentNode.getNextLineInPath(currentLine);
            if(next === null) {
                return false;
            }
            currentLine = next;

        } while(currentLine !== filledLines[0]);

        //  confirm that every cell on the board "contributes" to the solution
        for(let row of this.rows) {
            if(row.some(cell => !cell.contributes)) {
                return false;
            }
        }

        return true;
    }

    private generateRandom(size: number) {

        //  generate the game board
        //  1. generate unlinked cells in every position
        //  2. link cells by their shared lines
        //  3. link lines by their shared nodes

        /* 1. generate unlinked cells in every position */
        //  start with the single middle row
        const mid: number = Math.floor(size / 2);
        this.rows[mid] = new Array(size);
        for(let i = 0; i < size; ++i) {
            let x: number = (i - size / 2 + 0.5) * Cell.DX;
            this.rows[mid][i] = new Cell(x, 0);
        }

        //  width is the number of cells in the current row(s)
        //  height is the number of rows *above/below the middle row*
        let width: number = size - 1;
        let height: number = 1;

        //  width decreases while height increases
        //  when they are equal, the diagonal edges have as many cells as
        //  the current row/edge
        while(width > height) {

            let highInd = mid - height;
            let lowInd = mid + height;

            this.rows[highInd] = new Array(width);
            this.rows[lowInd] = new Array(width);

            let y1 = -height * Cell.DY;
            let y2 = height * Cell.DY;
            let half: number = width / 2;

            for(let i = 0; i < width; ++i) {

                let x: number = (i - half + 0.5) * Cell.DX;
                this.rows[highInd][i] = new Cell(x, y1);
                this.rows[lowInd][i] = new Cell(x, y2);
            }

            --width;
            ++height;
        }

        /* 2. link cells by their shared lines */
        //  reassign the left line of each cell in the middle row
        for(let i = 1; i < size; ++i) {
            let cell = this.rows[mid][i];
            cell.lines[4] = this.rows[mid][i - 1].lines[1];
            cell.lines[4].cells[1] = cell;
        }

        //  reassign the top-right, top-left, and left lines of each cell
        //  above/below the middle row
        width = size - 1;
        height = 1;
        while(width > height) {

            let highInd = mid - height;
            let lowInd = mid + height;

            let highRow: Cell[] = this.rows[highInd];
            let lowRow: Cell[] = this.rows[lowInd];
            for(let i = 0; i < width; ++i) {

                //  check the "previous" (closer to center) rows
                let prevHigh: Cell[] = this.rows[highInd + 1];
                let prevLow: Cell[] = this.rows[lowInd - 1];

                let highCell: Cell = highRow[i];
                let lowCell: Cell = lowRow[i];

                //  link top left (i=5)/bottom left (i=3) lines (both are
                //  defined for all cells)
                highCell.lines[3] = prevHigh[i].lines[0];
                highCell.lines[3].cells[1] = highCell;

                lowCell.lines[5] = prevLow[i].lines[2];
                lowCell.lines[5].cells[1] = lowCell;

                //  link the top right (i=0)/bottom (i=2) lines (both are
                //  defined for all cells)
                highCell.lines[2] = prevHigh[i + 1].lines[5];
                highCell.lines[2].cells[1] = highCell;

                lowCell.lines[0] = prevLow[i + 1].lines[3];
                lowCell.lines[0].cells[1] = lowCell;

                if(i > 0) {

                    //  link left lines of cell1 & cell2 (undefined for the first
                    //  cell in a row)
                    highCell.lines[4] = highRow[i - 1].lines[1];
                    highCell.lines[4].cells[1] = highCell;

                    lowCell.lines[4] = lowRow[i - 1].lines[1];
                    lowCell.lines[4].cells[1] = lowCell;
                }
            }

            ++height;
            --width;
        }

        /* 3. link lines by their shared nodes */
        //  reassign nodes in the middle row
        /*
                 / F
               /     \
             L         \
            |           ^
            |           |
            |           v
             F         /
               \     /
                 \ L

            arrows point *away* from line whose node is reassigned/discarded
         */
        for(let i = 0; i < size; ++i) {
            let cell = this.rows[mid][i];

            //  lines[4] is reversed in first cell
            if(i === 0) {
                cell.lines[5].start = cell.lines[4].end;
                cell.lines[3].end = cell.lines[4].start;
            }
            else {
                cell.lines[5].start = cell.lines[4].start;
                cell.lines[3].end = cell.lines[4].end;
            }

            cell.lines[0].start = cell.lines[5].end;
            cell.lines[2].end = cell.lines[3].start;

            cell.lines[1].start = cell.lines[0].end;
            cell.lines[1].end = cell.lines[2].start;
        }

        //  reassign nodes in rows above/below the middle row
        /*
            First cell:         remaining cells:

                 / F                    / F
               /     \                /     \
             L         \            L         \
        t   |           ^          |           ^
        o   |           |          |           |
        p   v*          v          |           v
             \         /            \         /
               \     /                \     /
                 \ /                    \ /
        _____________________________________________

                 / \                    / \
               /     \                /     \
             /         \            /         \
        b   ^*          ^          |           ^
        o   |           |          |           |
        t   |           v          |           v
        t    F         /            F         /
        o      \     /                \     /
        m        \ L                    \ L


             * indicates link is only made for the first cell in a row
         */
        width = size - 1;
        height = 1;
        while(width > height) {

            let highRow: Cell[] = this.rows[mid - height];
            let lowRow: Cell[] = this.rows[mid + height];

            for(let i = 0; i < width; ++i) {

                let highCell: Cell = highRow[i];
                let lowCell: Cell = lowRow[i];

                highCell.lines[0].start = highCell.lines[5].end;
                highCell.lines[1].end = highCell.lines[2].end;
                highCell.lines[1].start = highCell.lines[0].end;

                lowCell.lines[2].end = lowCell.lines[3].start;
                lowCell.lines[1].end = lowCell.lines[2].start;
                lowCell.lines[1].start = lowCell.lines[0].start;

                if(i === 0) {
                    highCell.lines[5].start = highCell.lines[4].end;
                    lowCell.lines[3].end = lowCell.lines[4].start;
                }
                else {
                    highCell.lines[5].start = highCell.lines[4].start;
                    lowCell.lines[3].end = lowCell.lines[4].end;
                }
            }

            --width;
            ++height;
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
        for(let row of this.rows) {
            for(let cell of row) {
                cell.mouse = this.ctx.isPointInPath(cell.getPath(), x, y);
            }
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

        //  set line style for drawing cell outlines
        ctx.strokeStyle = CSSColor.black;
        ctx.lineWidth = 1;

        //  set font size & alignment so that cell numbers align correctly
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CSSColor.black;

        const size: number = this.rows.length;

        //  pass the drawing context to each cell to draw their outlines and
        //  counts
        //  identify the cell beneath the mouse
        let hover: Cell | null = null;
        for(let i = 0; i < size; ++i) {
            for(let j = 0; j < this.rows[i].length; ++j) {
                this.rows[i][j].draw(ctx);
                if(this.rows[i][j].mouse) {
                    hover = this.rows[i][j];
                }
            }
        }

        //  highlight the neighbors of the highlighted cell
        if(hover !== null) {
            ctx.save();

            //  highlight neighbors
            ctx.fillStyle = CSSColor.lightgreen;
            for(let i = 0; i < 6; ++i) {
                hover.getNeighbor(hover.lines[i])?.draw(ctx, i.toString());
            }
            ctx.restore();
        }

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
            lines = this.getAllLines();
        }

        //  set each line's state based on
        lines.forEach((line, ind) => {
            line.state = (state & BigInt(Math.pow(2, ind))) ? LineState.LINE : LineState.INDET;
        });
    }

    getAllLines(): Line[] {
        let lines: Line[] = [];

        //  may need to adjust the order in which lines are added to the array
        //  positions must align with respective bits in a 'state' BigInt
        for(let row of this.rows) {
            for(let cell of row) {
                for(let line of cell.lines) {
                    if(lines.indexOf(line) < 0) {
                        lines.push(line);
                    }
                }
            }
        }

        return lines;
    }
}

export default SlitherLinkGame;
