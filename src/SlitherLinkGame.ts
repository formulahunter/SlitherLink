class SLNode {
    dir?: 0 | 1;     //  0 if vertical line points up, 1 if down
    lines?: [Line, Line, Line];  //  a node is the intersection of 3 lines
}

class Cell {

    static RADIUS = 15;

    //  dx, dy measured from center of hexagon
    static DX = Cell.RADIUS * Math.sqrt(3);
    static DY = Cell.RADIUS * 1.5;

    //  public nominal coordinates (at center of hexagon)
    x: number;
    y: number;

    count: number | null = null;
    lines: [Line, Line, Line, Line, Line, Line];

    private _path: Path2D | null = null;

    constructor(x: number, y: number) {

        this.x = x;
        this.y = y;

        this.lines = [
            new Line(this, null),
            new Line(null, this),
            new Line(null, this),
            new Line(null, this),
            new Line(this, null),
            new Line(this, null)
        ];

        //  assign a count to ~1/3 of all cells
        if(Math.random() > 2 / 3) {
            this.count = Math.floor(6 * Math.random());
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {

        ctx.stroke(this.getPath());

        if(this.count !== null) {
            ctx.beginPath();
            //  not sure why but characters look just a hair too high when drawn
            //  at this.y, so adding 1 to lower them
            ctx.fillText(this.count.toString(), this.x, this.y + 1, Cell.RADIUS);
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

enum LineState {
    INDET,
    BLANK,
    LINE
}
class Line {
    nodes: [SLNode, SLNode] = [new SLNode(), new SLNode()];
    cells: [Cell | null, Cell | null];
    state: LineState = LineState.INDET;

    constructor(cell1: Cell | null, cell2: Cell | null) {
        if(cell1 === null && cell2 === null) {
            throw new Error('cannot construct Line with 2 null cell arguments');
        }
        this.cells = [cell1, cell2];
    }

    get start(): SLNode {
        return this.nodes[0];
    }
    set start(start: SLNode) {
        this.nodes[0] = start;
    }

    get end(): SLNode {
        return this.nodes[1];
    }
    set end(end: SLNode) {
        this.nodes[1] = end;
    }
}

class SlitherLinkGame {

    static readonly cellRadius: number = 10;

    rows: Cell[][];

    /** construct SlitherLinkGame with a given board size
     *
     * @param size - number of cells in the middle horizontal
     */
    constructor(size: number) {

        //  size must be odd
        //  add 1 if even number given
        if(size % 2 === 0) {
            size += 1;
        }

        //  generate the game board
        //  1. generate unlinked cells in every position
        //  2. link cells by their shared lines
        //  3. link lines by their shared nodes

        //  the total number of rows will be equal to the given width of the
        //  middle row
        this.rows = new Array(Math.ceil(size));
        console.log(size, this.rows.length);

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
                    lowCell.lines[0].cells[1] = lowCell;

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

    draw(ctx: CanvasRenderingContext2D, x0: number, y0: number): void {

        //  set the given origin as the center of the board
        ctx.resetTransform();
        ctx.translate(x0, y0);

        //  set line style for drawing cell outlines
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        //  set font size & alignment so that cell numbers align correctly
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';

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

// export default SlitherLinkGame;
