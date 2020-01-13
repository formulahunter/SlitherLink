// function main(): void {
    // @ts-ignore
    let game = new SlitherLinkGame(5);
    let canvas: HTMLElement | null = document.getElementById('game');
    if(canvas === null || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('missing or invalid canvas element');
    }

    let ctx = canvas.getContext('2d');
    if(ctx === null) {
        throw new Error('unable to get canvas rendering context');
    }
// }
