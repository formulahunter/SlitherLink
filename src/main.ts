import SlitherLinkGame from './SlitherLinkGame.js';

// function main(): void {
    // @ts-ignore
    let canvas: HTMLElement | null = document.getElementById('game');
    if(canvas === null || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('missing or invalid canvas element');
    }

    new SlitherLinkGame(23, canvas);
// }
