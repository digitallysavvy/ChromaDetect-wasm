/* tslint:disable */
/* eslint-disable */
/**
*/
export class ChromaDetect {
  free(): void;
/**
*/
  constructor();
/**
* Analyze a single image
* pixels: RGBA pixel data (Uint8Array from canvas)
* @param {Uint8Array} pixels
* @param {number} width
* @param {number} height
* @returns {any}
*/
  detect_from_image(pixels: Uint8Array, width: number, height: number): any;
/**
* Initialize video analysis session
*/
  start_video_analysis(): void;
/**
* Add a video frame to the analysis
* @param {Uint8Array} pixels
* @param {number} width
* @param {number} height
* @returns {boolean}
*/
  add_video_frame(pixels: Uint8Array, width: number, height: number): boolean;
/**
* Get consensus result from all analyzed frames
* @returns {any}
*/
  get_video_consensus(): any;
/**
* Update detection configuration
* @param {any} config
*/
  set_config(config: any): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_chromadetect_free: (a: number) => void;
  readonly chromadetect_new: () => number;
  readonly chromadetect_detect_from_image: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly chromadetect_start_video_analysis: (a: number) => void;
  readonly chromadetect_add_video_frame: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly chromadetect_get_video_consensus: (a: number) => number;
  readonly chromadetect_set_config: (a: number, b: number) => void;
  readonly __wbindgen_export_0: (a: number, b: number) => number;
  readonly __wbindgen_export_1: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
