/**
 * Mock background-removal client.
 *
 * The real product will POST each image to the Flask/Photoroom backend (see the
 * proxy in vite.config.js) and stream progress back. Until that endpoint exists,
 * this simulates the job so we can build and feel out the Tool UX end to end.
 *
 * Keep this module's exported shape stable when wiring the real API:
 *   removeBackground(file, { onProgress }) -> Promise<{ url }>
 */

const SUPPORTED = ["image/jpeg", "image/png", "image/webp"];

export function isSupported(file) {
  return SUPPORTED.includes(file.type);
}

/**
 * Simulate removing the background from one image.
 * Resolves with an object URL for a "result" preview. In the mock we just hand
 * back the original image displayed on a transparency checkerboard, so the flow
 * looks real without a backend.
 */
export function removeBackground(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (!isSupported(file)) {
      reject(new Error(`Unsupported file type: ${file.type || "unknown"}`));
      return;
    }

    let pct = 0;
    const tick = () => {
      // Uneven steps so the bar feels like real work, not a linear timer.
      pct += Math.random() * 22 + 8;
      if (pct >= 100) {
        onProgress?.(100);
        resolve({ url: URL.createObjectURL(file) });
        return;
      }
      onProgress?.(Math.min(99, Math.round(pct)));
      setTimeout(tick, 250 + Math.random() * 350);
    };
    setTimeout(tick, 200);
  });
}
