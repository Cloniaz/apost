import * as THREE from 'three';
import { CONFIG } from './config.js';

export class NatureManager {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;

    this.spawnInstancedDeadTrees();
    this.spawnInstancedRocks();
  }

  spawnInstancedDeadTrees() {
    // Dead twisted post-apocalyptic trees in clusters (forest area north-east + wasteland scattering)
    const treeCount = 65;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.45, 4.5, 5);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x2b2622,
      roughness: 0.95,
      flatShading: true
    });

    const instancedTrunk = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    instancedTrunk.castShadow = true;
    instancedTrunk.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const treePositions = [];

    // North-East dead forest cluster (x: 8 to 35, z: -35 to -10)
    for (let i = 0; i < 45; i++) {
      const x = 12 + Math.random() * 24;
      const z = -34 + Math.random() * 20;
      treePositions.push({ x, z });
    }

    // Wasteland scattered dead trees (south quadrant)
    for (let i = 0; i < 20; i++) {
      const x = -32 + Math.random() * 64;
      const z = 14 + Math.random() * 22;
      // Don't place on main buildings
      if (Math.abs(x - 18) < 8 && Math.abs(z - 8) < 8) continue;
      if (Math.abs(x + 18) < 7 && Math.abs(z - 26) < 7) continue;
      treePositions.push({ x, z });
    }

    let actualIndex = 0;
    for (let i = 0; i < treePositions.length && actualIndex < treeCount; i++) {
      const pos = treePositions[i];
      // Don't place in road (road is around z = 0, thickness 7)
      if (Math.abs(pos.z) < 4.5) continue;

      const scaleY = 0.8 + Math.random() * 0.5;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = (Math.random() - 0.5) * 0.15; // slight lean

      dummy.position.set(pos.x, (4.5 * scaleY) / 2, pos.z);
      dummy.scale.set(1.0, scaleY, 1.0);
      dummy.rotation.set(0, rotY, rotZ);
      dummy.updateMatrix();

      instancedTrunk.setMatrixAt(actualIndex, dummy.matrix);

      // Register tree trunk in pathfinding grid as obstacle
      const gp = this.grid.worldToGrid(pos.x, pos.z);
      this.grid.setObstacle(gp.x, gp.z, true);

      actualIndex++;
    }

    instancedTrunk.count = actualIndex;
    instancedTrunk.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedTrunk);
  }

  spawnInstancedRocks() {
    // Low-poly jagged rocks scattered across wasteland
    const rockCount = 50;
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 0); // Flat faceted low poly
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4d493f,
      roughness: 0.9,
      flatShading: true
    });

    const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    instancedRocks.castShadow = true;
    instancedRocks.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let rockIndex = 0;

    for (let i = 0; i < rockCount; i++) {
      const x = -36 + Math.random() * 72;
      const z = -36 + Math.random() * 72;

      // Keep road clear
      if (Math.abs(z) < 4.5) continue;
      // Keep clinic & camp clear
      if (Math.abs(x + 16) < 8 && Math.abs(z + 18) < 6) continue;
      if (Math.abs(x - 2) < 6 && Math.abs(z + 14) < 5) continue;

      const scale = 0.5 + Math.random() * 0.9;
      dummy.position.set(x, scale * 0.45, z);
      dummy.scale.set(scale, scale * (0.6 + Math.random() * 0.6), scale);
      dummy.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      dummy.updateMatrix();

      instancedRocks.setMatrixAt(rockIndex, dummy.matrix);

      // Larger rocks block path
      if (scale > 0.85) {
        const gp = this.grid.worldToGrid(x, z);
        this.grid.setObstacle(gp.x, gp.z, true);
      }

      rockIndex++;
    }

    instancedRocks.count = rockIndex;
    instancedRocks.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedRocks);
  }
}
