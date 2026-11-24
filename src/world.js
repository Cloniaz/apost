import * as THREE from 'three';
import { CONFIG } from './config.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.size = CONFIG.MAP_SIZE;
    this.halfSize = this.size / 2;
    this.objects = [];

    this.initTerrain();
    this.initRoad();
    this.initMapBoundaryMarkers();
  }

  initTerrain() {
    // Ground plane with low poly subdivisions for flat-shaded wasteland look
    const segments = 40;
    const groundGeo = new THREE.PlaneGeometry(this.size, this.size, segments, segments);
    groundGeo.rotateX(-Math.PI / 2);

    // Apply slight vertex elevation variation for post-apocalyptic rugged terrain
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Keep road area (around z = 0, x between -40 and 40) relatively flat
      const distFromRoad = Math.abs(z);
      if (distFromRoad > 6) {
        const noise = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.35 +
                      Math.sin(x * 0.3 + z * 0.2) * 0.15;
        pos.setY(i, Math.max(-0.2, noise));
      } else {
        pos.setY(i, 0);
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.GROUND,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'ground';
    this.scene.add(this.groundMesh);
  }

  initRoad() {
    // Cracked asphalt road cutting through the wasteland
    const roadWidth = 7;
    const roadLength = this.size;
    const roadGeo = new THREE.PlaneGeometry(roadLength, roadWidth, 30, 4);
    roadGeo.rotateX(-Math.PI / 2);

    // Slight elevation offset to avoid z-fighting
    const roadMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.ROAD,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.y = 0.02;
    road.receiveShadow = true;
    this.scene.add(road);

    // Broken dashed road markings (procedural low-poly segments)
    const stripeGeo = new THREE.BoxGeometry(2.5, 0.02, 0.3);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.ROAD_LINE,
      roughness: 0.9,
      flatShading: true
    });

    for (let x = -this.halfSize + 3; x < this.halfSize; x += 6) {
      // Some broken/missing stripes for post-apocalyptic wear
      if (Math.abs(x) % 12 === 0) continue;
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(x, 0.03, 0);
      stripe.rotation.y = (Math.random() - 0.5) * 0.08;
      this.scene.add(stripe);
    }
  }

  initMapBoundaryMarkers() {
    // Low-poly boundary posts/barriers at map edges
    const postGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.8, 5);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x4a473b,
      flatShading: true,
      roughness: 0.9
    });

    const step = 8;
    for (let x = -this.halfSize; x <= this.halfSize; x += step) {
      this.createPost(postGeo, postMat, x, -this.halfSize);
      this.createPost(postGeo, postMat, x, this.halfSize);
    }
    for (let z = -this.halfSize + step; z < this.halfSize; z += step) {
      this.createPost(postGeo, postMat, -this.halfSize, z);
      this.createPost(postGeo, postMat, this.halfSize, z);
    }
  }

  createPost(geo, mat, x, z) {
    const post = new THREE.Mesh(geo, mat);
    post.position.set(x, 0.9, z);
    post.castShadow = true;
    post.receiveShadow = true;
    this.scene.add(post);
  }
}
