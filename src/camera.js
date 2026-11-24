import * as THREE from 'three';
import { CONFIG } from './config.js';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Camera focus anchor point in world coordinates
    this.target = new THREE.Vector3(0, 0, 0);

    // Zoom level multiplier (1.0 = default)
    this.zoom = 1.0;

    // Movement state
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    };

    this.mouseScreenX = window.innerWidth / 2;
    this.mouseScreenY = window.innerHeight / 2;
    this.isMouseInWindow = true;

    this.initListeners();
    this.updateCameraTransform();
  }

  initListeners() {
    window.addEventListener('keydown', (e) => {
      if (this.keys[e.code] !== undefined) {
        this.keys[e.code] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys[e.code] !== undefined) {
        this.keys[e.code] = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseScreenX = e.clientX;
      this.mouseScreenY = e.clientY;
      this.isMouseInWindow = true;
    });

    document.addEventListener('mouseleave', () => {
      this.isMouseInWindow = false;
    });

    window.addEventListener('wheel', (e) => {
      // Prevent browser page zoom when scrolling over game
      e.preventDefault();
      const delta = e.deltaY * CONFIG.CAMERA.ZOOM_SPEED;
      this.zoom = Math.max(CONFIG.CAMERA.MIN_ZOOM, Math.min(CONFIG.CAMERA.MAX_ZOOM, this.zoom + delta));
      this.updateCameraTransform();
    }, { passive: false });
  }

  update(delta) {
    const panSpeed = CONFIG.CAMERA.PAN_SPEED * delta;

    // Screen-relative directional vectors projected onto ground XZ plane
    // Camera is looking from (+ox, +oy, +oz) towards (0, 0, 0)
    // Forward (up on screen) is from camera towards target in XZ plane: (-1, -1) normalized
    const forward = new THREE.Vector3(-CONFIG.CAMERA.OFFSET_X, 0, -CONFIG.CAMERA.OFFSET_Z).normalize();
    // Right (right on screen) is perpendicular to forward: (forward.z, 0, -forward.x)
    const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

    const move = new THREE.Vector3();

    // Keyboard Pan (W = up on screen, S = down on screen, A = left, D = right)
    if (this.keys.KeyW || this.keys.ArrowUp) move.add(forward);
    if (this.keys.KeyS || this.keys.ArrowDown) move.sub(forward);
    if (this.keys.KeyA || this.keys.ArrowLeft) move.add(right);
    if (this.keys.KeyD || this.keys.ArrowRight) move.sub(right);

    // Screen Edge Pan
    if (this.isMouseInWindow) {
      const edge = CONFIG.CAMERA.EDGE_PAN_THRESHOLD;
      if (this.mouseScreenX <= edge) move.add(right);
      if (this.mouseScreenX >= window.innerWidth - edge) move.sub(right);
      if (this.mouseScreenY <= edge) move.add(forward);
      if (this.mouseScreenY >= window.innerHeight - edge) move.sub(forward);
    }

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(panSpeed);
      this.target.add(move);

      // Only clamp camera bounds if on the main wasteland map
      if (Math.abs(this.target.x) < 55 && Math.abs(this.target.z) < 55) {
        const maxRange = (CONFIG.MAP_SIZE / 2) - 6;
        this.target.x = Math.max(-maxRange, Math.min(maxRange, this.target.x));
        this.target.z = Math.max(-maxRange, Math.min(maxRange, this.target.z));
      }
      this.target.y = 0;

      this.updateCameraTransform();
    }
  }

  updateCameraTransform() {
    const ox = CONFIG.CAMERA.OFFSET_X * this.zoom;
    const oy = CONFIG.CAMERA.OFFSET_Y * this.zoom;
    const oz = CONFIG.CAMERA.OFFSET_Z * this.zoom;

    this.camera.position.set(
      this.target.x + ox,
      this.target.y + oy,
      this.target.z + oz
    );
    this.camera.lookAt(this.target);
  }

  setFocus(x, z) {
    this.target.set(x, 0, z);
    this.updateCameraTransform();
  }
}
