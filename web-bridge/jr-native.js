// Native helpers for the JR Stone WorkFlow web app.
// Include this in the job board's index.html. Inside the iOS/Android app it uses the
// phone's GPS and camera through Capacitor; in a normal browser it falls back to the web APIs.
// The /api routes it calls (clock, location, photos) are added to the Netlify function in phase 2.
(function () {
  const Cap = window.Capacitor;
  const isApp = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => (isApp ? Cap.Plugins[name] : null);
  let watcherId = null;

  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(path + ' failed: ' + res.status);
    return res.json().catch(() => ({}));
  }

  async function currentPosition() {
    const Geo = plugin('Geolocation');
    if (Geo) {
      await Geo.requestPermissions();
      const p = await Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
      return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
    }
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        reject,
        { enableHighAccuracy: true, timeout: 20000 }
      )
    );
  }

  async function startTracking() {
    const BG = plugin('BackgroundGeolocation');
    if (!BG || watcherId) return;
    watcherId = await BG.addWatcher(
      {
        backgroundTitle: 'JR Stone WorkFlow',
        backgroundMessage: 'Sharing your location while you are clocked in.',
        requestPermissions: true,
        stale: false,
        distanceFilter: 50,
      },
      (loc, err) => {
        if (err || !loc) return;
        post('/api/location', {
          lat: loc.latitude, lng: loc.longitude, accuracy: loc.accuracy, at: new Date(loc.time).toISOString(),
        }).catch(() => {});
      }
    );
  }

  async function stopTracking() {
    const BG = plugin('BackgroundGeolocation');
    if (BG && watcherId) await BG.removeWatcher({ id: watcherId });
    watcherId = null;
  }

  window.JRNative = {
    isApp,

    async clockIn(jobId) {
      const pos = await currentPosition();
      const result = await post('/api/clock', { action: 'in', jobId, ...pos, at: new Date().toISOString() });
      await startTracking();
      return result;
    },

    async clockOut() {
      await stopTracking();
      const pos = await currentPosition().catch(() => ({}));
      return post('/api/clock', { action: 'out', ...pos, at: new Date().toISOString() });
    },

    // Returns a data URL (JPEG) of a photo taken with the camera or picked from the library.
    async takeJobPhoto() {
      const Camera = plugin('Camera');
      if (Camera) {
        const photo = await Camera.getPhoto({ quality: 75, width: 1600, resultType: 'dataUrl', source: 'PROMPT' });
        return photo.dataUrl;
      }
      return new Promise((resolve, reject) => {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', capture: 'environment' });
        input.onchange = () => {
          const file = input.files[0];
          if (!file) return reject(new Error('No photo chosen'));
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },

    async uploadJobPhoto(jobId, dataUrl, note) {
      return post('/api/photos', { jobId, image: dataUrl, note, at: new Date().toISOString() });
    },
  };
})();
