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
type board_json = [line_json[], line_json[], line_json[], line_json[], line_json[], line_json[]];

/** get a board with the given radius, with all lines unset. the json data is
 * modeled after a spiral -- the center cell is surrounded by six "arms" that
 * cascade around the circumference of the board, represented by six flat arrays
 * of cells. each cell contributes three lines of its own and borrows the other
 * three from neighboring cells, so that no lines are defined twice.
 *
 * cells are not represented explicitly but rather defined implicitly by each
 * successive sequence of three lines. These sequences start offset by one line
 * from the beginning of the array, as the first line in each arm belongs to the
 * board's center cell.
 *
 * finally, each cell around the perimeter actually requires four lines to close
 * all edges, so the final "side" of each arm includes 4 lines per cell instead
 * of the typical 3.
 *
 * @param r - the radius of the board to be created
 */
function make_board(r: number): board_json {

    //  total number of cells "above" center in each arm
    //  use (r - 1) * r / 2 instead of r * (r + 1) /2 to exclude the last ring
    const height = (r - 1) * r / 2;

    //  initialize the board with the center cell, represented by one line in
    //  each arm
    const b: board_json = [
        [{filled: false, asserted: false}],
        [{filled: false, asserted: false}],
        [{filled: false, asserted: false}],
        [{filled: false, asserted: false}],
        [{filled: false, asserted: false}],
        [{filled: false, asserted: false}]
    ];

    //  3 lines/cell in each ring below r
    //  4 lines/cell in last ring
    //  1 <= l <= count because each arm already has 1 line (center cell)
    let count = 3 * height + 4 * (r + 1);
    for(let l = 1; l <= count; l++) {
        b[0][l] = {filled: false, asserted: false};
        b[1][l] = {filled: false, asserted: false};
        b[2][l] = {filled: false, asserted: false};
        b[3][l] = {filled: false, asserted: false};
        b[4][l] = {filled: false, asserted: false};
        b[5][l] = {filled: false, asserted: false};
    }

    return b;
}

export {board_json, cell_json, line_json, make_board};
