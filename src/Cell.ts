import Line  from './Line.js';
import SLNode from './SLNode.js';
import { cell_json } from './types.js';


class Cell {

    //  radius from center to "corner"
    static RADIUS = 50;

    //  dx, dy increments between cell nodes for hexagonal cells composed of
    //  equilateral triangles with sides of length Cell.RADIUS
    //  for center-to-center distances, multiply DX * 2 and DY * 3
    static DX = Cell.RADIUS * Math.sqrt(3) / 2;
    static DY = Cell.RADIUS / 2;

    //  direction vectors in the axial (q, r) coordinate system
    static readonly vectors: [number, number][] = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 0],
        [-1, -1],
        [0, -1]
    ];

    //  position offsets (canvas coords) of each node wrt center of cell
    static readonly nodeOffsets: [number, number][] = [
        [0, -2 * Cell.DY],
        [Cell.DX, -Cell.DY],
        [Cell.DX, Cell.DY],
        [0, 2 * Cell.DY],
        [-Cell.DX, Cell.DY],
        [-Cell.DX, -Cell.DY]
    ];

    //  original json object literal this Cell instance is derived from
    private readonly json: cell_json;

    //  public nominal coordinates (at center of hexagon)
    x: number;
    y: number;

    count: number | null = null;
    lines: Line[] = [];
    ownLines: (Line | null)[] = [null, null, null, null, null, null];
    nodes: SLNode[] = [];
    ownNodes: (SLNode | null)[] = [null, null, null, null, null, null];

    constructor(x: number, y: number, json: cell_json, lineRefs: (Line | null)[], nodeRefs: (SLNode | null)[]) {

        this.json = json;
        this.x = x;
        this.y = y;

        for(let i = 0; i < lineRefs.length; i++) {
            const line = lineRefs[i];
            if(line instanceof Line) {
                this.lines[i] = line;
            }
            else {
                const jLine = json.lines[i];
                if(jLine === null) {
                    console.error(`expected cell_json %o to have line at position ${i} but found 'null'`, json);
                    throw new TypeError('null line_json');
                }

                const i_2 = (i + 1) % 6;
                const [start, end]: [SLNode | [number, number], SLNode | [number, number]] = [
                    nodeRefs[i] || [x + Cell.nodeOffsets[i][0], y + Cell.nodeOffsets[i][1]],
                    nodeRefs[i_2] || [x + Cell.nodeOffsets[i_2][0], y + Cell.nodeOffsets[i_2][1]]
                ];
                this.lines[i] = new Line(jLine, start, end);
                this.ownLines[i] = this.lines[i];

                //  add nodes to lineRefs (where newly constructed by Line()) for reference in subsequent iterations
                nodeRefs[i] = nodeRefs[i] || this.lines[i].nodes[0];
                nodeRefs[i_2] = nodeRefs[i_2] || this.lines[i].nodes[1];
            }
            this.lines[i].addCell(this);
        }
        for(let i = 0; i < nodeRefs.length; i++) {
            //  in theory nodeRefs should have only SLNode references at this point since the lineRefs loop fills in
            //  null values with instances constructed by Line()
            const node = nodeRefs[i];
            if(node instanceof SLNode) {
                this.nodes[i] = node;
            }
            else {
                console.warn('unexpected condition: undefined node ref in Cell constructor\'s nodeRefs loop');
                this.nodes[i] = new SLNode(x + Cell.nodeOffsets[i][0], y + Cell.nodeOffsets[i][1]);
            }
            //  different condition for adding to ownNodes than in lineRefs loop because all 6 node refs are expected to
            //  be defined before the start of this (nodeRefs) loop
            if(this.lines[i].ownNodes.includes(this.nodes[i])) {
                this.ownNodes[i] = this.nodes[i]
            }
            this.nodes[i].addCell(this);
        }
    }
}


export default Cell;
