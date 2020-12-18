/** The board's raw json format is modeled as a spiral -- the center cell is
 * surrounded by six "arms" that cascade around the circumference of the board.
 * represented by six flat arrays of cells. each cell contributes three lines of
 * its own and borrows the other three from neighboring cells, so that no lines are defined twice.
 */

type line_json = {
    filled: boolean,
    asserted: boolean
};
type board_json = [line_json[], line_json[], line_json[], line_json[], line_json[], line_json[]];

/** get groups of individual lines, arranged in six "spiral arm" arrays (as
 * described below) to represent a board with the given radius
 *
 * the board's raw json format is conceptually modeled as a spiral. the center
 * cell is surrounded by six "arms" that cascade around the circumference of the
 * board and represent consecutive cells. cells define/are defined by individual
 * lines such that any given line is "owned" by exactly one cell, thus avoiding
 * duplicate -- and potentially conflicting -- records.
 *
 * generally, a given cell is said to "contribute" three unique lines to the
 * board, and to "borrow" its remaining three lines from neighboring cells.
 * there are two exceptions to this rule: 1) cells around the outer bounds of
 * the board contribute four lines each, so as to close otherwise open edges;
 * and 2) the center cell contributes all six of its own edges, as a result of
 * the way that cells' own lines are arranged/assigned.
 *
 * because of the fixed spatial/structural relation of lines and cells, and
 * because the aggregate board state is defined in terms of line states, cells
 * have no explicit implementation. spiral arms consist of individual lines, and
 * cells are defined implicitly as groups of three (or four) consecutive lines,
 * with the first single line in each arm owned by the cell at the center of the
 * board.
 *
 * @param r - the radius of the board to be created
 */
function make_board(r: number): board_json {

    //  total number of cells "above" center in each arm
    //  use (r - 1) * r / 2 instead of r * (r + 1) /2 to exclude the last ring
    const height = (r - 1) * r / 2;

    //  3 lines/cell in each ring below r
    //  4 lines/cell in last ring
    //  1 line for center cell (in each arm)
    let count = 3 * height + 4 * r + 1;

    //  initialize the board and populate arms with lines
    const b: board_json = [[], [], [], [], [], []];
    for(let l = 0; l <= count; l++) {
        b[0][l] = {filled: false, asserted: false};
        b[1][l] = {filled: false, asserted: false};
        b[2][l] = {filled: false, asserted: false};
        b[3][l] = {filled: false, asserted: false};
        b[4][l] = {filled: false, asserted: false};
        b[5][l] = {filled: false, asserted: false};
    }

    return b;
}

export {board_json, line_json, make_board};
