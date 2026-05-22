const permissionPanel = document.getElementById('permissionPanel');
const permissionMessage = document.getElementById('permissionMessage');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const arStage = document.getElementById('arStage');
const sceneTemplate = document.getElementById('sceneTemplate');
const trackingStatus = document.getElementById('trackingStatus');
const modelNotice = document.getElementById('modelNotice');

let marker = null;
let model = null;

const defaultTransform = {
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 0.55, y: 0.55, z: 0.55 }
};

async function requestCameraAccess() {
  if (!window.isSecureContext) {
    permissionMessage.textContent = 'Camera access needs HTTPS, localhost, or a trusted development tunnel.';
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    permissionMessage.textContent = 'This browser does not expose camera access.';
    startButton.disabled = true;
    return;
  }

  try {
    startButton.disabled = true;
    permissionMessage.textContent = 'Opening camera...';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    stream.getTracks().forEach((track) => track.stop());
    mountScene();
    permissionPanel.classList.add('is-hidden');
  } catch (error) {
    const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
    permissionMessage.textContent = denied
      ? 'Camera permission was blocked. Allow camera access in the browser to start AR.'
      : 'Camera access is unavailable on this device or browser.';
    startButton.disabled = false;
  }
}

function setTracking(isTracking) {
  trackingStatus.classList.toggle('is-tracking', isTracking);
  trackingStatus.querySelector('span:last-child').textContent = isTracking ? 'Tracking' : 'Find marker';
}

function resetModel() {
  if (!model) return;

  model.object3D.rotation.set(
    defaultTransform.rotation.x,
    defaultTransform.rotation.y,
    defaultTransform.rotation.z
  );
  model.object3D.scale.set(
    defaultTransform.scale.x,
    defaultTransform.scale.y,
    defaultTransform.scale.z
  );
}

function wireModelState() {
  if (!model || !marker) return;

  model.addEventListener('model-loaded', () => {
    modelNotice.hidden = true;
  });

  model.addEventListener('model-error', () => {
    modelNotice.hidden = false;
  });

  marker.addEventListener('markerFound', () => setTracking(true));
  marker.addEventListener('markerLost', () => setTracking(false));
}

function mountScene() {
  if (document.getElementById('scene')) return;

  document.documentElement.classList.add('ar-active');
  document.body.classList.add('ar-active');
  arStage.classList.add('is-active');
  arStage.prepend(sceneTemplate.content.cloneNode(true));
  marker = document.getElementById('marker');
  model = document.getElementById('model');
  wireModelState();
}

startButton.addEventListener('click', requestCameraAccess);
resetButton.addEventListener('click', resetModel);
