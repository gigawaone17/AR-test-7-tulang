# Marker WebAR Site

Static marker-based WebAR viewer built with A-Frame and AR.js.

## Files

- `index.html` - mobile AR experience with camera permission handling.
- `components.js` - rotate and pinch-scale touch gesture components.
- `app.js` - permission flow, AR scene mounting, marker tracking UI, reset control.
- `qr.html` and `qr.js` - QR launch page that encodes the current hosted URL.
- `assets/models/dinoV6.glb` - expected Blender GLB model path.

## Blender Model

Export from Blender as `glTF Binary (.glb)` and save the file here:

```text
assets/models/dinoV6.glb
```

The AR scene already points to that file.

## Marker

The scene uses the built-in AR.js Hiro marker:

```html
<a-marker preset="hiro">
```

Print or display a Hiro marker and point the camera at it to anchor the model.

## Running Locally

```powershell
node server.mjs 8080
```

Then open:

```text
http://127.0.0.1:8080/
```

## QR And Camera Notes

The QR page works best after deploying the site to an HTTPS URL. Mobile browsers require a secure context for camera access, so a QR that opens plain HTTP on a LAN address will usually be blocked by the browser camera policy.
