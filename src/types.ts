/** define a dictionary of direction key-value pairs for consistency & ease of
 * maintenance */
export const hex_dirs = {
    up: 0,
    rt: 1,
    dn: 2,
    up_op: 3,
    lf: 4,
    dn_op: 5
};

//  local constants for convenience
const { up, rt, dn, up_op, lf, dn_op } = hex_dirs;

/** map each direction index to its opposite */
const opps: number[] = [];
opps[up] = up_op;
opps[rt] = lf;
opps[dn] = dn_op;
opps[up_op] = up;
opps[lf] = rt;
opps[dn_op] = dn;

/** define the "radius" of the grid as the distance, in cell count, from center
 * to corners */
let radius: number = -1;


 /** raw lines indicate no info other that their state */
export interface line_json {
    state: number
}

/** cell_json represents raw cell data, namely their constituent lines and
 * adjacent cells, primarily for purposes of defining the raw board structure
 * that gives meaning to the line_json instances' states.
 *
 * the principle of single ownership is prioritized because any cyclic references
 * would preclude serialization (or at least create a lot of extra work). every
 * cell is referenced by at most 1 other cell. as a result, the relation is
 * casually referred to in terms of "ownership". these cell-cell relations are
 * expressed independent of line instances for simplicity, as accessing adjacent
 * cells indirectly via line instances creates extra work and serves no real
 * purpose.
 *
 * the conceptual model is further elaborated here, though the implementation
 * differs slightly for practical reasons as described below the diagram.
 *
 * the hex grid (also "board, "game board") is modeled as a branching structure
 * resembling a tree. the "root" cell lies in one corner of the board (e.g. the
 * left corner) and is not referenced, or "owned", by any other cell. "stem"
 * cells lie along the same row as the root cell (the root cell can also be
 * considered a stem cell). "branch" cells lie above or below the stem. a "leaf"
 * cell is a branch cell that does not reference any other cells (the "end" of a
 * branch).
 *
 *                        O     O     O
 *                       /     /     /
 *  "branch" cells" --> O     O     O     O
 *                     /     /     /     /
 *    "root" cell --> O --- O --- O --- O --- O <-- "stem" cells
 *                     \     \     \     \
 *                      O     O     O     O <-,--- "leaf" cells
 *                       \     \     \       /
 *                        O     O     O <---'
 *
 * each stem cell (except the last) references exactly three other cells: the
 * next (adjacent) stem cell, one branch cell above it, and one branch cell
 * below it (branch cells are by definition positioned to the right of their
 * immediate parent). the last stem cell is both a stem and a leaf.
 *
 * in practice, leaf cells are simply branch cells with no children, and the
 * root cell is a stem cell with no parent. for these reasons this
 * implementation is built on the two base types only (stems & branches).
 * furthermore, note that all cells are structurally identical (described by the
 * single cell_json interface), although the procedures for composing them
 * differ slightly.
 */
export interface cell_json {
    lines: (line_json | null)[],
    cells: (cell_json | null)[]
}

/** get an object containing only raw cell data */
function make_cell(): cell_json {
    //  line arrays: [right, bottom-right, bottom-left, left, top-left, top-right]
    return {
        lines: [{state: 0}, {state: 0}, {state: 0}, {state: 0}, {state: 0}, {state: 0}],    //  every cell will maintain between 3 - 6 lines
        cells: [null, null, null]       //  cells will only ever reference their children -> up, rt, dn
    };
}

/** get an object representing a cell in a branch */
function make_branch_cell(length: number, dir: number): cell_json {
    const cell = make_cell();
    if(length) {
        const child = make_branch_cell(length - 1, dir);
        child.lines[opps[dir]] = null;
        cell.cells[dir] = child;
    }
    return cell;
}

/** get an object representing a cell in the stem (main/middle row).
 *
 * @param length - the number of cells in the stem after this one
 */
export function make_stem_cell(length: number): cell_json {
    //  set the global radius reference & associated flag
    let resetRadius = false;
    if(radius === -1) {
        //  overall board size must be an odd number
        if(!(length % 2)) {
            console.warn(`hex grid size must be an odd number, but ${length} is even\nusing ${length + 1} instead`);
            length++;
        }
        radius = (length - 1) / 2;
        resetRadius = true;
    }

    const cell = make_cell();
    if(length) {
        //  construct next stem & branches
        //  branch lengths are never more than the grid radius
        const branchSize: number = Math.min(length - 1, radius);
        const next = make_stem_cell(length - 1);
        const topBranch = make_branch_cell(branchSize, up);
        const bottomBranch = make_branch_cell(branchSize, dn);

        //  assign references to 'cell'
        cell.cells[rt] = next;
        cell.cells[up] = topBranch;
        cell.cells[dn] = bottomBranch;

        //  replace immediate edge references
        //  these may be redundant with the loop below
        next.lines[lf] = null;
        topBranch.lines[up_op] = null;
        bottomBranch.lines[dn_op] = null;

        //  replace references in bordering branches
        const nextUpper = smear_branch(next, up);
        const nextLower = smear_branch(next, dn);

        for(let i = 0; i < branchSize; i++) {   //  'length' is not valid here because branches toward the right of the board have fewer cells
            nextUpper[i].lines[dn_op] = null;
            nextUpper[i].lines[lf] = null;

            nextLower[i].lines[up_op] = null;
            nextLower[i].lines[lf] = null;
        }
    }

    //  if all recursive calls are complete, reset the radius variable
    if(resetRadius) {
        radius = -1;
    }

    return cell;
}

/** aggregate all cells in a branch into a flat array for easier iteration */
function smear_branch(branch: cell_json, side: number): cell_json[] {
    const recurse: cell_json | null = branch.cells[side];
    if(recurse !== null) {
        return [branch, ...smear_branch(recurse, side)];
    }
    return [branch];
}
