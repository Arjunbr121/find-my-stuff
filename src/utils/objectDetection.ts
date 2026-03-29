/**
 * On-device object detection via a hidden WebView sandbox.
 *
 * TF.js + COCO-SSD run inside a WebView (loaded from CDN) so Metro never
 * has to bundle them — no Node.js built-in conflicts, works on iOS, Android
 * and web (iframe).
 *
 * Flow:
 *   1. Caller renders <DetectionWebView ref={ref} />  (hidden, 0x0)
 *   2. Caller calls ref.current.detect(base64Jpeg) → Promise<DetectedObject[]>
 *   3. WebView loads TF.js + COCO-SSD from CDN, runs detection, postMessages results back
 */

export type DetectedObject = {
    label: string;
    score: number;
    bbox: [number, number, number, number];
};

// ─── HTML injected into the WebView ──────────────────────────────────────────
// Loads TF.js + COCO-SSD from jsDelivr CDN (no backend needed).
// Listens for { type:'detect', imageData:'data:image/jpeg;base64,...' }
// Posts back { type:'result', objects:[...] } or { type:'error', message }
export const DETECTION_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"></script>
<script>
  var model = null;

  cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(function(m) {
    model = m;
    postMessage(JSON.stringify({ type: 'ready' }), '*');
  }).catch(function(e) {
    postMessage(JSON.stringify({ type: 'error', message: 'Model load failed: ' + e.message }), '*');
  });

  function handleMessage(event) {
    var data;
    try { data = JSON.parse(event.data); } catch(e) { return; }
    if (data.type !== 'detect') return;
    if (!model) {
      postMessage(JSON.stringify({ type: 'error', message: 'Model not ready yet' }), '*');
      return;
    }
    var img = new Image();
    img.onload = function() {
      model.detect(img).then(function(predictions) {
        var objects = predictions
          .filter(function(p) { return p.score >= 0.35; })
          .sort(function(a, b) { return b.score - a.score; })
          .map(function(p) { return { label: p.class, score: p.score, bbox: p.bbox }; });
        postMessage(JSON.stringify({ type: 'result', objects: objects }), '*');
      }).catch(function(e) {
        postMessage(JSON.stringify({ type: 'error', message: e.message }), '*');
      });
    };
    img.onerror = function() {
      postMessage(JSON.stringify({ type: 'error', message: 'Failed to load image' }), '*');
    };
    img.src = data.imageData;
  }

  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage); // Android WebView
</script>
</body>
</html>`;

// ─── Summary builder ─────────────────────────────────────────────────────────
export function buildLocationSummary(
    objects: DetectedObject[],
    roomName: string,
    specificLocation: string
): string {
    if (objects.length === 0) {
        return `Stored in ${roomName} — ${specificLocation}.`;
    }
    const labels = objects
        .slice(0, 5)
        .map(o => o.label)
        .filter((v, i, a) => a.indexOf(v) === i);

    const list = labels.length === 1
        ? labels[0]
        : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];

    return `Spotted nearby: ${list}. Find it in the ${roomName}, ${specificLocation}.`;
}
