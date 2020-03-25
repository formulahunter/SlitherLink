import Cell from './Cell.js';
import CSSColor from './CSSColor.js';
import Line, {LineState} from './Line.js';
import SLNode from './SLNode.js';

//  ⋰⋱⋮⋯│─┄┆╱╲

class SlitherLinkGame {

    //  total number of possible states as 2 ^ (# of lines)
    //  a board 3 cells wide has 30 lines
    static numStates: bigint = BigInt(0);

    //  compute 256 states per frame b/c the frame rate is fast enough that
    //  they're barely visible anyway
    static statesPerFrame: number = Math.pow(2, 8);
    static initialState: bigint = BigInt(0);
    static startTime: DOMHighResTimeStamp;
    static stateProgress: number = 0;

    //  30,000 milliseconds, or 30 seconds
    static simTimeout: number = 30000;

    //  max # states per run equal to 2 full cycles of the first four cells
    static simStateout: bigint = BigInt(Math.pow(2, 18));

    //  states with at least 1 valid loop
    static validLoopStates: bigint[] = [];

    //  1/2 cell width
    static readonly cellRadius: number = 10;

    // private canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private rows: Cell[][];

    /** construct SlitherLinkGame with a given board size
     *
     * @param size - number of cells in the middle horizontal
     * @param canvas - canvas element on which the game will be drawn
     */
    constructor(size: number, canvas: HTMLCanvasElement) {

        //  define event listeners on canvas element
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);

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

        //  draw the initial board
        this.draw(400, 300);
    }

    /** iterate through all possible combinations of line states (on/off) to
     *  identify valid solutions
     */
    combinate(initialState?: bigint): void {

        //  compile an array of all lines on the board
        let lines: Line[] = [];
        for(let row of this.rows) {
            for(let cell of row) {
                for(let line of cell.lines) {
                    if(!lines.includes(line)) {
                        lines.push(line);
                    }
                }
            }
        }
        // console.info(lines.length);

        //  define a number whose 32 binary digits will be used to encode the
        //  state of each line (30 lines total)
        SlitherLinkGame.numStates = BigInt(Math.pow(2, lines.length));
        SlitherLinkGame.stateProgress = 0;
        SlitherLinkGame.startTime = performance.now();
        let currentState: bigint = initialState || SlitherLinkGame.initialState;
        window.requestAnimationFrame(this.drawComboFrame.bind(this, lines, currentState));
    }
    /** animate frames by setting each line state to the corresponding bit in
     *  'currentState'
     * @param lines
     * @param currentState
     * @param currentTime
     */
    private drawComboFrame(lines: Line[], currentState: bigint, currentTime: DOMHighResTimeStamp) {

        let elapsedTime: DOMHighResTimeStamp = currentTime - SlitherLinkGame.startTime;
        let elapsedStates: bigint = currentState - SlitherLinkGame.initialState;
        if(elapsedStates >= SlitherLinkGame.simStateout || elapsedTime > SlitherLinkGame.simTimeout) {
            console.log(`animated ${elapsedStates - BigInt(1)} states in ${(elapsedTime / 1000).toFixed(3)} seconds\n`
                + `next state to compute is ${currentState}`);
            SlitherLinkGame.initialState = currentState;
            return;
        }

        let progress: number = Number(BigInt(10000) * currentState / SlitherLinkGame.numStates);
        if(progress > SlitherLinkGame.stateProgress) {
            SlitherLinkGame.stateProgress = progress;
            console.log(`${(Number(progress) / 100).toFixed(2)}%`);
        }

        for(let i = 0; i < SlitherLinkGame.statesPerFrame; ++i) {

            this.setState(currentState, lines);
            if(this.checkWin()) {
                SlitherLinkGame.validLoopStates.push(currentState);
            }

            currentState++;
        }
        this.draw(400, 300);

        window.requestAnimationFrame(this.drawComboFrame.bind(this, lines, currentState));
    }

    /** check if the current game state is a valid solution
     *  this is determined by three criteria:
     *  1. every filled line on the board is part of a single, continuous loop
     *      a.
     *  2. every cell's count requirement is satisfied
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
