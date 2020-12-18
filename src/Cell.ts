import Line  from './Line.js';


class Cell {

    //  radius from center to "corner"
    static RADIUS = 50;

    //  dx, dy increments between cell nodes for hexagonal cells composed of
    //  equilateral triangles with sides of length Cell.RADIUS
    //  for center-to-center distances, multiply DX * 2 and DY * 3
    static DX = Cell.RADIUS * Math.sqrt(3) / 2;
    static DY = Cell.RADIUS / 2;

    //  position offsets (canvas coords) of each node wrt center of cell
    static readonly nodeOffsets: [number, number][] = [
        [-Cell.DX, -Cell.DY],
        [-Cell.DX, Cell.DY],
        [0, 2 * Cell.DY],
        [Cell.DX, Cell.DY],
        [Cell.DX, -Cell.DY],
        [0, -2 * Cell.DY]
    ];

    //  public nominal coordinates (at center of hexagon)
    grid: [number, number];
    canv: [number, number];

    count: number | null = null;
    lines: Line[];
    ownLines: Line[];

    /** construct a Cell instance with given coordinates and own lines.
     * additional line refs can be provided as well, but may also be assigned
     * after construction
     *
     * @param grid - integer x & y coordinates of this cell in the game's `cells` array
     * @param canv - this cell's canvas coordinates
     * @param ownLines - an array of this cell's "own" lines as defined by its json object
     * @param lines - an optional array of all this cell's lines. if provided,
     *      this array must include external line refs as well as this cell's
     *      own line refs (same as in `ownLines`), all in the correct positions
     */
    constructor(grid: [number, number], canv: [number, number], ownLines: Line[], lines: Line[] = []) {

        this.grid = grid;
        this.canv = canv
        this.ownLines = ownLines;
        this.lines = lines;
    }
}


export default Cell;
