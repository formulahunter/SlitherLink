import SlitherLinkGame from './SlitherLinkGame.js';

// function main(): void {
    let canvas: HTMLElement | null = document.getElementById('game');
    if(canvas === null || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('missing or invalid canvas element');
    }

    // @ts-ignore
    window.game = new SlitherLinkGame(23, canvas);
// }
