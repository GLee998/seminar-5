import { useEffect, useRef } from 'react';

/*
 * Топографическая карта: изолинии шумового рельефа с вершиной.
 * Каждая пятая линия толще — как утолщённые горизонтали на настоящих картах.
 * Рисуется marching squares на canvas, медленно «дышит»; при reduce-motion — статична.
 */
export default function Topo() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const cx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const perm = new Uint8Array(512);
    const base = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [base[i], base[j]] = [base[j], base[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const h = (x, y) => perm[(perm[x & 255] + y) & 255] / 255;
    const sm = t => t * t * (3 - 2 * t);
    const noise = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
      const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };

    let W = 0, H = 0, raf = 0, last = 0, t = Math.random() * 10;
    const STEP = 9;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1;
      const v = new Float32Array(cols * rows);
      const scale = Math.max(W, H) / 3.2;
      // вершина справа вверху на широких экранах, по центру сверху на телефоне
      const px = W > 760 ? W * 0.72 : W * 0.6, py = H * 0.34, pr = Math.min(W, H) * 0.42;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * STEP, y = r * STEP;
        const n = noise(x / scale + t, y / scale) * 0.6 + noise(x / scale * 2.3 - t * 0.6, y / scale * 2.3 + 4) * 0.3;
        const dx = (x - px) / pr, dy = (y - py) / pr;
        v[r * cols + c] = n + Math.exp(-(dx * dx + dy * dy)) * 0.75;
      }
      cx.clearRect(0, 0, W, H);
      cx.lineJoin = 'round';
      const L0 = 0.12, LS = 0.055, N = 26;
      for (let L = 0; L < N; L++) {
        const lv = L0 + L * LS, index = L % 5 === 0;
        cx.beginPath();
        for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
          const i = r * cols + c;
          const a = v[i], b = v[i + 1], d = v[i + cols], e = v[i + cols + 1]; // tl tr bl br
          const k = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (e > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (k === 0 || k === 15) continue;
          const x = c * STEP, y = r * STEP;
          const T = () => [x + STEP * (lv - a) / (b - a), y];
          const R = () => [x + STEP, y + STEP * (lv - b) / (e - b)];
          const B = () => [x + STEP * (lv - d) / (e - d), y + STEP];
          const Lf = () => [x, y + STEP * (lv - a) / (d - a)];
          const seg = (p, q) => { cx.moveTo(p[0], p[1]); cx.lineTo(q[0], q[1]); };
          switch (k) {
            case 1: case 14: seg(Lf(), B()); break;
            case 2: case 13: seg(B(), R()); break;
            case 3: case 12: seg(Lf(), R()); break;
            case 4: case 11: seg(T(), R()); break;
            case 6: case 9: seg(T(), B()); break;
            case 7: case 8: seg(T(), Lf()); break;
            case 5: seg(T(), Lf()); seg(B(), R()); break;
            case 10: seg(T(), R()); seg(Lf(), B()); break;
          }
        }
        cx.lineWidth = index ? 1.6 : 0.8;
        cx.strokeStyle = index ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.16)';
        cx.stroke();
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 66) return; // ~15 кадров/с — рельеф меняется медленно
      t += (now - last || 66) * 0.000012;
      last = now;
      draw();
    }

    resize();
    addEventListener('resize', resize);
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return <canvas ref={ref} className="topo" aria-hidden="true" />;
}
