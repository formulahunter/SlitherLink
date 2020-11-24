import SlitherLinkGame from './SlitherLinkGame.js';

// function main(): void {
    let canvas: HTMLElement | null = document.getElementById('game');
    if(canvas === null || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('missing or invalid canvas element');
    }

    let game: SlitherLinkGame = new SlitherLinkGame(3, canvas);
    game.resumeSimulation();

    // @ts-ignore
    window.game = game;
// }
