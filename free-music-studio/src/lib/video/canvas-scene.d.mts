// 원본 boks-music `electron/canvas-scene.d.mts`(MIT, © 2026 boksajang) — 2026-11-06 그대로 옮김(free-music-studio/NOTICE.md). 고치지 말고 원본과 맞춰 둔다.
export const CANVAS_SCENES: readonly string[];
export const CANVAS_SCENE_FILES: readonly string[];

export function createCanvasScene(input:{scene:string;width:number;height:number;tracks:Record<string,any>[];options:Record<string,any>;images:{background:CanvasImageSource|null;arts:(CanvasImageSource|null)[]};analyses:any[]}):{draw:(ctx:CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D,time:number)=>void;duration:number};

export function mountCanvasPreview(host:HTMLElement,config?:{scene:string;tracks?:Record<string,any>[];options?:Record<string,any>;duration?:number;assets?:Record<string,any>;start?:number}):{ready:Promise<void>;update:(next:{scene?:string;options?:Record<string,any>})=>void;dispose:()=>void};

export function renderSceneThumbnail(canvas:HTMLCanvasElement|OffscreenCanvas,input:{scene:string;tracks?:Record<string,any>[];options?:Record<string,any>;images?:{background?:CanvasImageSource|null;arts?:(CanvasImageSource|null)[]};time?:number}):boolean;

export function loadSceneBitmap(src:string|undefined,limit:number,signal?:AbortSignal):Promise<ImageBitmap|null>;

export function boundedBitmap(blob:Blob,limit:number):Promise<ImageBitmap>;

export function unpackAnalysis(item:any):any;

export function drawSpectrum(ctx:CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D,input:{kind?:string;bins?:number[];waveform?:number[];color?:string;tint?:number[];alpha?:number;amp?:number;x:number;y:number;width:number;height:number}):void;
