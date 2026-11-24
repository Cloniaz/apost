import * as THREE from 'three';
import { CONFIG } from './config.js';

export class LootManager {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;
    this.containers = []; // Crates, lockers, abandoned cars
    this.groundItems = []; // Scattered pickups

    this.initSharedGeometries();
    this.spawnContainers();
    this.spawnScatteredPickups();
  }

  initSharedGeometries() {
    this.matCrate = new THREE.MeshStandardMaterial({ color: 0x6e523b, roughness: 0.85, flatShading: true });
    this.matLocker = new THREE.MeshStandardMaterial({ color: 0x47515c, roughness: 0.8, flatShading: true });
    this.matCarBody = new THREE.MeshStandardMaterial({ color: 0x8a3933, roughness: 0.9, flatShading: true });
    this.matCarGlass = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.5, flatShading: true });
    this.matLootGlow = new THREE.MeshBasicMaterial({ color: 0xf0a020, wireframe: true, transparent: true, opacity: 0.35 });
  }

  spawnContainers() {
    // 1. Crates around clinic, gas station, and houses
    this.createContainer(-8, -13, 'Crate', 'cannedFood', 2);
    this.createContainer(-14, -23, 'Medical Box', 'bandage', 2);
    this.createContainer(22, 13, 'Storage Crate', 'stimulant', 1);
    this.createContainer(15, -17, 'Supply Crate', 'waterBottle', 2);
    this.createContainer(-17, 18, 'Wooden Crate', 'cannedFood', 1);

    // 2. Lockers inside clinic porch and gas station
    this.createLocker(-11, -18, 'Clinic Locker', 'bandage', 1);
    this.createLocker(16, 12, 'Station Locker', 'stimulant', 1);

    // 3. Abandoned Cars along the road
    this.createAbandonedCar(-12, 1.2, 0.2, 'Abandoned Car', 'cannedFood', 2);
    this.createAbandonedCar(10, -1.5, -0.15, 'Rusty Sedan', 'waterBottle', 2);
  }

  createContainer(x, z, label, itemType, amount) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Box base
    const baseGeo = new THREE.BoxGeometry(1.2, 0.7, 1.2);
    const base = new THREE.Mesh(baseGeo, this.matCrate);
    base.position.y = 0.35;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Lid (can open when looted)
    const lidGeo = new THREE.BoxGeometry(1.3, 0.18, 1.3);
    const lid = new THREE.Mesh(lidGeo, this.matCrate);
    lid.position.set(0, 0.79, 0);
    lid.castShadow = true;
    group.add(lid);

    this.scene.add(group);

    const containerObj = {
      type: 'container',
      mesh: group,
      lidMesh: lid,
      label,
      itemType,
      amount,
      isLooted: false,
      respawnTimer: 0,
      position: new THREE.Vector3(x, 0.5, z),
      radius: 2.2
    };
    this.containers.push(containerObj);

    // Mark as obstacle in pathfinding
    const gp = this.grid.worldToGrid(x, z);
    this.grid.setObstacle(gp.x, gp.z, true);
  }

  createLocker(x, z, label, itemType, amount) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const geo = new THREE.BoxGeometry(0.8, 1.9, 0.8);
    const mesh = new THREE.Mesh(geo, this.matLocker);
    mesh.position.y = 0.95;
    mesh.castShadow = true;
    group.add(mesh);

    this.scene.add(group);

    const containerObj = {
      type: 'locker',
      mesh: group,
      lidMesh: null,
      label,
      itemType,
      amount,
      isLooted: false,
      respawnTimer: 0,
      position: new THREE.Vector3(x, 0.9, z),
      radius: 1.5
    };
    this.containers.push(containerObj);

    const gp = this.grid.worldToGrid(x, z);
    this.grid.setObstacle(gp.x, gp.z, true);
  }

  createAbandonedCar(x, z, rotY, label, itemType, amount) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    // Body
    const bodyGeo = new THREE.BoxGeometry(4.2, 1.1, 1.9);
    const body = new THREE.Mesh(bodyGeo, this.matCarBody);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabGeo = new THREE.BoxGeometry(2.2, 0.85, 1.6);
    const cab = new THREE.Mesh(cabGeo, this.matCarGlass);
    cab.position.set(-0.2, 1.7, 0);
    cab.castShadow = true;
    group.add(cab);

    // Wheels (4 black cylinders)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 8);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, flatShading: true });
    const wheelOffsets = [
      { x: -1.3, z: 0.95 }, { x: 1.3, z: 0.95 },
      { x: -1.3, z: -0.95 }, { x: 1.3, z: -0.95 }
    ];
    for (const w of wheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(w.x, 0.38, w.z);
      group.add(wheel);
    }

    this.scene.add(group);

    const carObj = {
      type: 'car',
      mesh: group,
      lidMesh: null,
      label,
      itemType,
      amount,
      isLooted: false,
      respawnTimer: 0,
      position: new THREE.Vector3(x, 0.8, z),
      radius: 2.5
    };
    this.containers.push(carObj);

    const min = this.grid.worldToGrid(x - 2, z - 1);
    const max = this.grid.worldToGrid(x + 2, z + 1);
    for (let gz = min.z; gz <= max.z; gz++) {
      for (let gx = min.x; gx <= max.x; gx++) {
        this.grid.setObstacle(gx, gz, true);
      }
    }
  }

  spawnScatteredPickups() {
    // Individual items on the ground
    this.groundSpawnPoints = [
      { x: -2, z: -10, type: 'waterBottle', label: 'Water Bottle' },
      { x: 5, z: -12, type: 'cannedFood', label: 'Canned Food' },
      { x: -22, z: 14, type: 'bandage', label: 'Bandage' },
      { x: 26, z: 7, type: 'waterBottle', label: 'Water Bottle' },
      { x: -14, z: 24, type: 'stimulant', label: 'Stimulant' },
      { x: 20, z: -25, type: 'cannedFood', label: 'Canned Food' }
    ];

    for (const s of this.groundSpawnPoints) {
      this.spawnGroundItem(s.x, s.z, s.type, s.label);
    }
  }

  spawnGroundItem(x, z, itemType, label) {
    const group = new THREE.Group();
    group.position.set(x, 0.25, z);

    let itemGeo;
    let itemMat;

    if (itemType === 'cannedFood') {
      itemGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8);
      itemMat = new THREE.MeshStandardMaterial({ color: 0xd98a3a, flatShading: true });
    } else if (itemType === 'waterBottle') {
      itemGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 8);
      itemMat = new THREE.MeshStandardMaterial({ color: 0x4a9fd8, flatShading: true });
    } else if (itemType === 'bandage') {
      itemGeo = new THREE.BoxGeometry(0.3, 0.18, 0.3);
      itemMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true });
    } else {
      // Stimulant
      itemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6);
      itemMat = new THREE.MeshStandardMaterial({ color: 0xd4c04a, flatShading: true });
    }

    const mesh = new THREE.Mesh(itemGeo, itemMat);
    mesh.castShadow = true;
    group.add(mesh);

    // Subtle beacon ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.42, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf0a020, transparent: true, opacity: 0.6 }));
    ring.position.y = -0.22;
    group.add(ring);

    this.scene.add(group);

    const itemObj = {
      mesh: group,
      itemType,
      label,
      position: new THREE.Vector3(x, 0.25, z),
      radius: 1.4,
      collected: false,
      respawnTimer: 0
    };
    this.groundItems.push(itemObj);
  }

  interactWithLoot(target, survivor, hud) {
    if (target.type === 'container' || target.type === 'locker' || target.type === 'car') {
      if (target.isLooted) {
        hud.showNotification(`📦 ${target.label} is already empty`);
        return false;
      }
      target.isLooted = true;
      target.respawnTimer = 240; // 4 minutes respawn

      // Open lid visually for crate
      if (target.lidMesh) {
        target.lidMesh.position.y += 0.4;
        target.lidMesh.rotation.z = 0.5;
      }

      survivor.addItem(target.itemType, target.amount);
      hud.updateInventory(survivor.inventory);
      hud.showNotification(`+${target.amount} ${CONFIG.ITEMS[target.itemType].name} scavenged!`);
      return true;
    }

    // Ground pickup
    if (target.collected === false) {
      target.collected = true;
      target.respawnTimer = 180; // 3 minutes respawn
      this.scene.remove(target.mesh);
      survivor.addItem(target.itemType, 1);
      hud.updateInventory(survivor.inventory);
      hud.showNotification(`+1 ${CONFIG.ITEMS[target.itemType].name} picked up!`);
      return true;
    }
    return false;
  }

  update(delta, playerPos) {
    // Respawn containers after timer when player is far away (> 20 units)
    for (const c of this.containers) {
      if (c.isLooted) {
        c.respawnTimer -= delta;
        if (c.respawnTimer <= 0 && c.position.distanceTo(playerPos) > 16) {
          c.isLooted = false;
          if (c.lidMesh) {
            c.lidMesh.position.y -= 0.4;
            c.lidMesh.rotation.z = 0;
          }
        }
      }
    }

    // Respawn ground items
    for (const g of this.groundItems) {
      if (g.collected) {
        g.respawnTimer -= delta;
        if (g.respawnTimer <= 0 && g.position.distanceTo(playerPos) > 16) {
          g.collected = false;
          this.scene.add(g.mesh);
        }
      }
    }

    // Gentle floating bobbing for ground pickups
    const t = performance.now() * 0.003;
    for (const g of this.groundItems) {
      if (!g.collected) {
        g.mesh.position.y = 0.25 + Math.sin(t + g.position.x) * 0.06;
        g.mesh.rotation.y += delta * 1.2;
      }
    }
  }

  findInteractableAt(raycaster) {
    // Check ground items
    for (const g of this.groundItems) {
      if (g.collected) continue;
      const hits = raycaster.intersectObjects([g.mesh], true);
      if (hits.length > 0) return g;
    }
    // Check containers
    for (const c of this.containers) {
      const hits = raycaster.intersectObjects([c.mesh], true);
      if (hits.length > 0) return c;
    }
    return null;
  }
}
