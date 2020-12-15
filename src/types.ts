/** The board's raw json format is organized like a bicycle wheel. Each spoke is
 * an array of cells, and the hub is the center cell. Each cell "owns" four
 * lines, except for the center cell which owns none -- it is composed of one
 * line from each of the first cell in each spoke. Each Line has a state which
 * is either filled, unset (i.e. not asserted), or blank.
 */

type line_json = {
    filled: boolean,
    asserted: false
};

//  cell_json may be an empty array b/c the center cell has no lines of its own
type cell_json = line_json[];
type board_json = [cell_json[], cell_json[], cell_json[], cell_json[], cell_json[], cell_json[]];

/** get a board with the given radius, with all lines unset. the json data is
 * structured like a spiral -- the center cell is surrounded by six "arms" that
 * cascade around the circumference of the board, represented by six flat arrays
 * of cells. each cell contributes three lines of its own and borrows the other
 * three from neighboring cells, so that no lines are defined twice.
 *
 * the returned board structure will have r + 1 rings ("height" of each arm is
 * (r + 1)). this is necessary because otherwise the perimeter cells would be
 * missing lines.
 *
 * the first cell in each array is the first cell bordering the center cell in
 * the corresponding direction. the center cell is not explicitly represented
 * but rather defined implicitly by one line from each of the surrounding six
 * cells.
 *
 *
 *
 * @param r - the radius of the board to be created
 */
function make_board(r: number) {
    const b: board_json = [[], [], [], [], [], []];
    for(let i = 0; i <= r; i++) {
        b[i][0] = [{filled: false, asserted: false}, {filled: false, asserted: false}, {filled: false, asserted: false}];
        b[i][1] = [{filled: false, asserted: false}, {filled: false, asserted: false}, {filled: false, asserted: false}];
        b[i][2] = [{filled: false, asserted: false}, {filled: false, asserted: false}, {filled: false, asserted: false}];
        b[i][3] = [{filled: false, asserted: false}, {filled: false, asserted: false}, {filled: false, asserted: false}];
        b[i][4] = [{filled: false, asserted: false}, {filled: false, asserted: false}, {filled: false, asserted: false}];
        b[i][5] = [{filled: false, asserted: false}, {filled: false, asserted: false}, {filled: false, asserted: false}];
    }
    return b;
}

export {board_json, cell_json, line_json, make_board};
