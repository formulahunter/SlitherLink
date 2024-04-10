const BOARD_RADIUS = 4;


let canvas: HTMLElement | null = document.getElementById('game');
if(canvas === null || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('missing or invalid canvas element');
}

const ctx = canvas.getContext('2d');
if(ctx === null || !(ctx instanceof CanvasRenderingContext2D)) {
    throw new Error('failed to get rendering context');
}

ctx.fillText(`radius: ${BOARD_RADIUS}`, 100, 100);

// let game: SlitherLinkGame = new SlitherLinkGame(3, canvas);
// game.resumeSimulation();

// @ts-ignore
window.game = game;
