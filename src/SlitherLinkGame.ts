import Cell from './Cell.js';
import CSSColor from './CSSColor.js';

class SlitherLinkGame {

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

            this.rows[mid - height] = new Array(width);
            this.rows[mid + height] = new Array(width);

            let y1 = -height * Cell.DY;
            let y2 = height * Cell.DY;
            let half: number = width / 2;

            for(let i = 0; i < width; ++i) {

                let x: number = (i - half + 0.5) * Cell.DX;

                let cell1: Cell = new Cell(x, y1);
                let cell2: Cell = new Cell(x, y2);

                //  link top/bottom left lines (always defined) of cell1 & cell2
                cell1.lines[3] = this.rows[mid - height + 1][i].lines[0];
                cell1.lines[3].cells[1] = cell1;
                cell2.lines[5] = this.rows[mid + height - 1][i].lines[2];
                cell2.lines[5].cells[0] = cell2;

                //  link left lines of cell1 & cell2 (undefined for the first
                //  cell in a row)
                if(i > 0) {
                    cell1.lines[4] = this.rows[mid - height][i - 1].lines[1];
                    cell1.lines[4].cells[0] = cell1;
                    cell2.lines[4] = this.rows[mid + height][i - 1].lines[1];
                    cell2.lines[4].cells[0] = cell2;
                }
                //  link the top/bottom right lines (undefined for the last
                //  cell in a row)
                if(i < width - 1) {
                    cell1.lines[2] = this.rows[mid - height + 1][i + 1].lines[5];
                    cell1.lines[2].cells[1] = cell1;
                    cell2.lines[0] = this.rows[mid + height - 1][i + 1].lines[3];
                    cell2.lines[0].cells[0] = cell2;
                }

                this.rows[mid - height][i] = cell1;
                this.rows[mid + height][i] = cell2;
            }

            --width;
            ++height;
        }

        /* 2. link cells by their shared lines */
        //  reassign the left line of each cell in the middle row
        for(let i = 1; i < size; ++i) {
            let cell = this.rows[mid][i];
            cell.lines[4] = this.rows[mid][i - 1].lines[1];
            cell.lines[4].cells[0] = cell;
        }

        //  reassign the top-right, top-left, and left lines of each cell
        //  above/below the middle row
        width = size - 1;
        height = 1;
        while(width > height) {

            let lowRow: Cell[] = this.rows[mid + height];
            let highRow: Cell[] = this.rows[mid - height];
            for(let i = 0; i < width; ++i) {

                //  check the "previous" (closer to center) rows
                let prevLow: Cell[] = this.rows[mid + height - 1];
                let prevHigh: Cell[] = this.rows[mid - height + 1];

                let lowCell: Cell = lowRow[i];
                let highCell: Cell = highRow[i];

                if(i > 0) {

                    /*  a. check the cell in the same row at the previous
                     horizontal index (adjacent to the left on a hex board)
                     */
                    lowCell.lines[4] = lowRow[i - 1].lines[1];
                    lowCell.lines[4].cells[0] = lowCell;

                    highCell.lines[4] = highRow[i - 1].lines[1];
                    highCell.lines[4].cells[0] = highCell;

                    /*  b. check the above/below cell at the same horizontal
                     index (to the left on a hex board)
                     */
                    lowCell.lines[5] = prevLow[i].lines[2];
                    lowCell.lines[5].cells[0] = lowCell;

                    highCell.lines[3] = prevHigh[i].lines[0];
                    highCell.lines[3].cells[1] = highCell;
                }

                if(i < width - 1) {

                    /*  c. check the above/below cell at the next horizontal
                     index (to the right on a hex board)
                     */
                    lowCell.lines[0] = prevLow[i + 1].lines[3];
                    lowCell.lines[0].cells[0] = lowCell;

                    highCell.lines[2] = prevHigh[i + 1].lines[5];
                    highCell.lines[2].cells[1] = highCell;
                }
            }

            --width;
            ++height;
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
         */
        for(let i = 0; i < size; ++i) {
            let cell = this.rows[mid][i];
            cell.lines[5].end = cell.lines[4].start;
            cell.lines[3].end = cell.lines[4].end;

            cell.lines[0].end = cell.lines[5].start;
            cell.lines[2].end = cell.lines[3].start;

            cell.lines[1].start = cell.lines[0].start;
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

            let lowRow = this.rows[mid + height];
            let highRow = this.rows[mid - height];

            //  make necessary reassignments on first cell of each row
            lowRow[0].lines[4].start = lowRow[0].lines[5].end;
            highRow[0].lines[4].end = highRow[0].lines[3].end;

            for(let i = 0; i < width; ++i) {

                let lowCell = lowRow[i];
                let highCell = highRow[i];

                lowCell.lines[3].end = lowCell.lines[4].end;
                lowCell.lines[2].end = lowCell.lines[3].start;
                lowCell.lines[1].end = lowCell.lines[2].start;
                lowCell.lines[1].start = lowCell.lines[0].start;

                highCell.lines[5].end = highCell.lines[4].start;
                highCell.lines[0].end = highCell.lines[5].start;
                highCell.lines[1].end = highCell.lines[2].start;
                highCell.lines[1].start = highCell.lines[0].start;
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
        for(let i = 0; i < size; ++i) {
            for(let j = 0; j < this.rows[i].length; ++j) {
                this.rows[i][j].draw(ctx);
            }
        }

        //  reset the transform
        ctx.resetTransform();
    }
}

export default SlitherLinkGame;
