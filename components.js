AFRAME.registerComponent('gesture-detector', {
  init() {
    this.el.sceneEl.canvas.addEventListener('touchmove', (event) => {
      if (event.touches.length > 1) event.preventDefault();
    }, { passive: false });
  }
});

AFRAME.registerComponent('gesture-handler', {
  schema: {
    rotationFactor: { default: 0.45 },
    minScale: { default: 0.2 },
    maxScale: { default: 2.2 }
  },
  init() {
    this.initialPinchDistance = null;
    this.initialScale = this.el.object3D.scale.clone();
    this.previousTouch = null;

    const canvas = this.el.sceneEl.canvas;
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
  },
  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.previousTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      return;
    }

    if (event.touches.length === 2) {
      this.initialPinchDistance = getPinchDistance(event.touches);
      this.initialScale = this.el.object3D.scale.clone();
    }
  },
  onTouchMove(event) {
    if (event.touches.length === 1 && this.previousTouch) {
      event.preventDefault();
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.previousTouch.x;
      this.el.object3D.rotation.y += THREE.MathUtils.degToRad(deltaX * this.data.rotationFactor);
      this.previousTouch = { x: touch.clientX, y: touch.clientY };
      return;
    }

    if (event.touches.length === 2 && this.initialPinchDistance) {
      event.preventDefault();
      const distance = getPinchDistance(event.touches);
      const multiplier = distance / this.initialPinchDistance;
      const nextScale = THREE.MathUtils.clamp(
        this.initialScale.x * multiplier,
        this.data.minScale,
        this.data.maxScale
      );
      this.el.object3D.scale.set(nextScale, nextScale, nextScale);
    }
  },
  onTouchEnd(event) {
    if (event.touches.length < 2) this.initialPinchDistance = null;
    if (event.touches.length === 0) this.previousTouch = null;
  }
});

function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}
