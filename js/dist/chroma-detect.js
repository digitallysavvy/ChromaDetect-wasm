var w = Object.defineProperty;
var E = (d, e, t) => e in d ? w(d, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : d[e] = t;
var h = (d, e, t) => E(d, typeof e != "symbol" ? e + "" : e, t);
import u, { ChromaDetect as f } from "../wasm/chroma_detect";
class L {
  constructor() {
    h(this, "detector", null);
    h(this, "initialized", !1);
  }
  async init() {
    this.initialized || (await u(), this.detector = new f(), this.initialized = !0);
  }
  setConfig(e) {
    this.detector && this.detector.set_config(e);
  }
  async detectFromImage(e) {
    if (!this.detector) throw new Error("Not initialized");
    const t = this.toImageData(e), n = new Uint8Array(
      t.data.buffer,
      t.data.byteOffset,
      t.data.byteLength
    );
    return this.detector.detect_from_image(
      n,
      t.width,
      t.height
    );
  }
  toImageData(e) {
    if (e instanceof ImageData)
      return e;
    const t = document.createElement("canvas"), n = t.getContext("2d");
    return e instanceof HTMLImageElement ? (t.width = e.naturalWidth, t.height = e.naturalHeight, n.drawImage(e, 0, 0)) : (t.width = e.width, t.height = e.height, n.drawImage(e, 0, 0)), n.getImageData(0, 0, t.width, t.height);
  }
}
class y {
  constructor() {
    h(this, "detector", null);
    h(this, "initialized", !1);
  }
  async init() {
    this.initialized || (await u(), this.detector = new f(), this.initialized = !0);
  }
  setConfig(e) {
    this.detector && this.detector.set_config(e);
  }
  async detectFromVideo(e, t = {}) {
    if (!this.detector) throw new Error("Not initialized");
    const {
      frameSampleCount: n = 8,
      sampleStrategy: r = "uniform",
      maxDuration: i = 30
    } = t, a = e instanceof File, o = a ? await this.loadVideoFile(e) : e;
    try {
      await this.ensureVideoReady(o);
      const c = this.calculateFrameTimestamps(
        o.duration,
        n,
        r,
        i
      );
      this.detector.start_video_analysis();
      for (const l of c)
        try {
          const m = await this.extractFrame(o, l), s = new Uint8Array(
            m.data.buffer,
            m.data.byteOffset,
            m.data.byteLength
          );
          this.detector.add_video_frame(
            s,
            m.width,
            m.height
          );
        } catch (m) {
          console.warn(`Failed to extract frame at ${l}s`, m);
        }
      return this.detector.get_video_consensus();
    } finally {
      a && o.src.startsWith("blob:") && URL.revokeObjectURL(o.src);
    }
  }
  calculateFrameTimestamps(e, t, n, r) {
    const i = Math.min(e, r);
    if (n === "uniform") {
      const a = i / (t + 1);
      return Array.from({ length: t }, (o, c) => (c + 1) * a);
    } else {
      const a = [], o = Math.floor(t * 0.4);
      for (let s = 0; s < o; s++)
        a.push(i * 0.1 * s / o);
      const c = i * 0.9;
      for (let s = 0; s < o; s++)
        a.push(c + i * 0.1 * s / o);
      const g = t - o * 2, l = i * 0.3, m = i * 0.7;
      for (let s = 0; s < g; s++)
        a.push(
          l + (m - l) * s / g
        );
      return a.sort((s, v) => s - v);
    }
  }
  async ensureVideoReady(e) {
    return new Promise((t, n) => {
      if (e.readyState >= 4) {
        t();
        return;
      }
      const r = () => {
        e.removeEventListener("canplaythrough", r), e.removeEventListener("error", i), clearTimeout(a), t();
      }, i = (o) => {
        e.removeEventListener("canplaythrough", r), e.removeEventListener("error", i), clearTimeout(a), n(new Error("Video failed to load: " + o.message));
      };
      e.addEventListener("canplaythrough", r), e.addEventListener("error", i);
      const a = setTimeout(() => {
        e.removeEventListener("canplaythrough", r), e.removeEventListener("error", i), n(new Error("Video load timeout"));
      }, 3e4);
      e.load();
    });
  }
  async extractFrame(e, t) {
    return new Promise((n, r) => {
      const i = document.createElement("canvas"), a = i.getContext("2d"), o = () => {
        i.width = e.videoWidth, i.height = e.videoHeight, a.drawImage(e, 0, 0);
        const l = a.getImageData(0, 0, i.width, i.height);
        e.removeEventListener("seeked", o), clearTimeout(g), n(l);
      }, c = () => {
        e.removeEventListener("seeked", o), clearTimeout(g), r(new Error("Seek failed"));
      };
      e.addEventListener("seeked", o), e.addEventListener("error", c), e.currentTime = t;
      const g = setTimeout(() => {
        e.removeEventListener("seeked", o), e.removeEventListener("error", c), r(new Error("Frame extraction timeout"));
      }, 5e3);
    });
  }
  async loadVideoFile(e) {
    return new Promise((t, n) => {
      const r = document.createElement("video"), i = URL.createObjectURL(e);
      r.preload = "auto", r.muted = !0, r.src = i;
      const a = () => {
        r.removeEventListener("canplaythrough", a), r.removeEventListener("error", o), clearTimeout(c), t(r);
      }, o = () => {
        r.removeEventListener("canplaythrough", a), r.removeEventListener("error", o), clearTimeout(c), URL.revokeObjectURL(i), n(new Error("Failed to load video"));
      };
      r.addEventListener("canplaythrough", a), r.addEventListener("error", o);
      const c = setTimeout(() => {
        r.removeEventListener("canplaythrough", a), r.removeEventListener("error", o), URL.revokeObjectURL(i), n(new Error("Video load timeout"));
      }, 3e4);
    });
  }
}
class I {
  constructor() {
    h(this, "imageProcessor");
    h(this, "videoProcessor");
    h(this, "config", {});
    this.imageProcessor = new L(), this.videoProcessor = new y();
  }
  async init() {
    await Promise.all([this.imageProcessor.init(), this.videoProcessor.init()]);
  }
  /**
   * Update detection configuration
   */
  setConfig(e) {
    this.config = { ...this.config, ...e }, this.imageProcessor.setConfig(this.config), this.videoProcessor.setConfig(this.config);
  }
  // Simple API for images
  async detectFromImage(e) {
    if (e instanceof File) {
      const t = await this.loadImage(e);
      return this.imageProcessor.detectFromImage(t);
    }
    return this.imageProcessor.detectFromImage(e);
  }
  // Simple API for videos
  async detectFromVideo(e, t) {
    return this.videoProcessor.detectFromVideo(e, t);
  }
  loadImage(e) {
    return new Promise((t, n) => {
      const r = new Image(), i = URL.createObjectURL(e);
      r.onload = () => {
        URL.revokeObjectURL(i), t(r);
      }, r.onerror = () => {
        URL.revokeObjectURL(i), n(new Error("Failed to load image"));
      }, r.src = i;
    });
  }
}
export {
  I as ChromaDetect
};
