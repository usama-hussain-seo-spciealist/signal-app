(function (root) {
  'use strict';
  function decode(canvas, decoder) {
    if (!canvas.width || !canvas.height) return null;
    const pixels = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
    const result = decoder(pixels.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
    return result ? result.data : null;
  }
  function cameraError(error) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Camera permission was denied. Allow camera access in Safari website settings, then try again. You can also upload a QR image.';
    if (error.name === 'NotFoundError') return 'No camera was found. Upload a QR image instead.';
    if (error.name === 'NotReadableError') return 'Camera is busy or unavailable. Close other camera apps and try again.';
    return 'Camera could not continue. Tap Start camera to retry, or upload a clear QR image.';
  }
  function createCamera(options) {
    const { video, canvas, media, decoder, status, preview, result } = options;
    const later = options.later || setTimeout, cancel = options.cancel || clearTimeout;
    let generation = 0, stream = null, timer = null, frames = 0, failures = 0;
    function stop() {
      generation++; cancel(timer); timer = null;
      const previous = stream; stream = null;
      if (previous) previous.getTracks().forEach(track => track.stop());
      video.srcObject = null; preview(false);
    }
    async function start() {
      stop(); const token = generation; frames = 0; failures = 0;
      if (!media || !media.getUserMedia) { status('Camera is unavailable. Open this app over HTTPS in Safari, or upload a QR image.'); return; }
      status('Waiting for camera permission. Frames are processed on this device.');
      try {
        const acquired = await media.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (generation !== token) { acquired.getTracks().forEach(track => track.stop()); return; }
        stream = acquired; video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
        video.srcObject = stream; preview(true);
        for (const track of stream.getVideoTracks()) {
          track.addEventListener('ended', () => { if (token === generation) { stop(); status('Camera access ended. Tap Start camera to reconnect. Your last decoded result is kept below.'); } });
          track.addEventListener('mute', () => { if (token === generation) status('Camera feed paused. Return to this app or restart the camera.'); });
          track.addEventListener('unmute', () => { if (token === generation) status('Camera resumed. Hold the whole QR inside the frame.'); });
        }
        await video.play();
        if (generation !== token) return;
        status('Camera ready. Hold the whole QR steady with a white border and good light.');
        function scan() {
          if (generation !== token || !stream) return;
          frames++;
          try {
            if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
              const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
              canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
              const raw = decode(canvas, decoder); failures = 0;
              if (raw !== null) { stop(); result(raw, 'Camera'); return; }
            }
            if (frames === 60) status(video.readyState < 2 ? 'Camera opened but no video frames arrived. Stop and restart the camera, or upload the QR image.' : 'No readable QR yet. Move back to include all four corners, improve light, or upload the image. Camera is still scanning.');
          } catch (_) {
            failures++;
            if (failures >= 5) { stop(); status('Camera frames could not be decoded. Restart the camera or upload the QR image. Your last result is kept below.'); return; }
            status('A camera frame was interrupted. Retrying automatically…');
          }
          timer = later(scan, 160);
        }
        scan();
      } catch (error) { if (generation === token) { stop(); status(cameraError(error)); } }
    }
    return { start, stop };
  }
  const api = { decode, createCamera, cameraError };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SignalScanner = api;
})(typeof window !== 'undefined' ? window : globalThis);
