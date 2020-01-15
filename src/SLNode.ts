import Line from './Line';


class SLNode {
    dir?: 0 | 1;     //  0 if vertical line points up, 1 if down
    lines?: [Line, Line, Line];  //  a node is the intersection of 3 lines
}


export default SLNode;
