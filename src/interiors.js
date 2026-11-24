import * as THREE from 'three';

export class InteriorsManager {
  constructor(scene, grid, dayNightCycle) {
    this.scene = scene;
    this.grid = grid;
    this.dayNightCycle = dayNightCycle;

    // Interior coordinates (placed far away from main map [-40 to +40])
    // Clinic Interior: centered at (200, 0, 200)
    // Gas Station Interior: centered at (300, 0, 200)
    this.interiors = {
      CLINIC: {
        id: 'CLINIC',
        name: 'Clinic Interior',
        center: new THREE.Vector3(200, 0, 200),
        spawnPoint: new THREE.Vector3(200, 0, 204),
        exitDoorPos: new THREE.Vector3(200, 0, 206),
        outsideDoorPos: new THREE.Vector3(-16, 0, -13.5), // Outside clinic door
        size: { width: 14, length: 14, height: 4.5 }
      },
      GAS_STATION: {
        id: 'GAS_STATION',
        name: 'Gas Station Convenience Store',
        center: new THREE.Vector3(300, 0, 200),
        spawnPoint: new THREE.Vector3(300, 0, 203),
        exitDoorPos: new THREE.Vector3(300, 0, 205),
        outsideDoorPos: new THREE.Vector3(18, 0, 10.5), // Outside front/camera-facing door
        size: { width: 12, length: 12, height: 4.0 }
      }
    };

    this.doors = []; // Interactable doorways
    this.currentInterior = null; // null if on outside wasteland map

    this.buildClinicInterior();
    this.buildGasStationInterior();
    this.initExteriorDoors();
  }

  buildClinicInterior() {
    const info = this.interiors.CLINIC;
    const group = new THREE.Group();
    group.position.copy(info.center);

    // Clean medical tiled floor
    const floorGeo = new THREE.PlaneGeometry(info.size.width, info.size.length);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x98a39c, roughness: 0.5, flatShading: true });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    group.add(floor);

    // Interior Walls (surrounding box)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc4c9be, roughness: 0.8, flatShading: true });
    const h = info.size.height;
    const w = info.size.width;
    const l = info.size.length;

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), wallMat);
    backWall.position.set(0, h / 2, -l / 2);
    group.add(backWall);

    // Front wall with door gap
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 1.2, h, 0.4), wallMat);
    frontWallLeft.position.set(-(w / 4 + 0.6), h / 2, l / 2);
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 1.2, h, 0.4), wallMat);
    frontWallRight.position.set(w / 4 + 0.6, h / 2, l / 2);
    group.add(frontWallLeft, frontWallRight);

    // Left & Right walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, l), wallMat);
    leftWall.position.set(-w / 2, h / 2, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, l), wallMat);
    rightWall.position.set(w / 2, h / 2, 0);
    group.add(leftWall, rightWall);

    // Interior Furniture & Medical Props
    // 1. Examination table
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x486b62, roughness: 0.7, flatShading: true });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 4.0), tableMat);
    table.position.set(-3.5, 0.45, 0);
    table.castShadow = true;
    group.add(table);

    // 2. Doctor Desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x47382b, roughness: 0.8, flatShading: true });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.85, 1.6), deskMat);
    desk.position.set(2.5, 0.42, -3.5);
    desk.castShadow = true;
    group.add(desk);

    // 3. Medicine Shelves
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x5a6358, roughness: 0.8, flatShading: true });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.2, 0.8), shelfMat);
    shelf.position.set(0, 1.6, -l / 2 + 0.6);
    shelf.castShadow = true;
    group.add(shelf);

    // Interior Warm Ceiling Lighting
    const ceilingLight = new THREE.PointLight(0xfffae0, 2.8, 22, 1.5);
    ceilingLight.position.set(0, 3.8, 0);
    ceilingLight.castShadow = true;
    group.add(ceilingLight);

    // Exit Door Rug / Trigger Indicator
    const exitMarkerGeo = new THREE.BoxGeometry(2.4, 0.08, 1.4);
    const exitMarkerMat = new THREE.MeshBasicMaterial({ color: 0x4a9fd8, transparent: true, opacity: 0.8 });
    const exitMarker = new THREE.Mesh(exitMarkerGeo, exitMarkerMat);
    exitMarker.position.set(0, 0.04, l / 2 - 0.6);
    group.add(exitMarker);

    this.scene.add(group);

    // Add Exit Door to interactable doors list
    this.doors.push({
      type: 'EXIT_DOOR',
      interiorId: 'CLINIC',
      label: 'Exit to Wasteland',
      position: new THREE.Vector3(info.center.x, 1, info.center.z + l / 2 - 0.8),
      targetPos: info.outsideDoorPos.clone(),
      radius: 2.2,
      mesh: exitMarker
    });
  }

  buildGasStationInterior() {
    const info = this.interiors.GAS_STATION;
    const group = new THREE.Group();
    group.position.copy(info.center);

    const w = info.size.width;
    const l = info.size.length;
    const h = info.size.height;

    // Linoleum store floor
    const floorGeo = new THREE.PlaneGeometry(w, l);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x7a7164, roughness: 0.6, flatShading: true }));
    floor.receiveShadow = true;
    group.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a8475, roughness: 0.85, flatShading: true });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), wallMat);
    backWall.position.set(0, h / 2, -l / 2);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, l), wallMat);
    leftWall.position.set(-w / 2, h / 2, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, l), wallMat);
    rightWall.position.set(w / 2, h / 2, 0);
    group.add(backWall, leftWall, rightWall);

    // Front Wall with door opening
    const fw1 = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 1.2, h, 0.4), wallMat);
    fw1.position.set(-(w / 4 + 0.6), h / 2, l / 2);
    const fw2 = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 1.2, h, 0.4), wallMat);
    fw2.position.set(w / 4 + 0.6, h / 2, l / 2);
    group.add(fw1, fw2);

    // Counter checkout desk
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0x4a382c, flatShading: true }));
    counter.position.set(-2.5, 0.45, -2.5);
    group.add(counter);

    // Snack / Soda shelves
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.5, 5.0), new THREE.MeshStandardMaterial({ color: 0x3d4852, flatShading: true }));
    rack.position.set(2.5, 1.25, 0);
    group.add(rack);

    // Ceiling Light
    const storeLight = new THREE.PointLight(0xffeedd, 2.4, 20, 1.5);
    storeLight.position.set(0, 3.4, 0);
    group.add(storeLight);

    // Exit Door Marker
    const exitMarker = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.08, 1.4),
      new THREE.MeshBasicMaterial({ color: 0x4a9fd8, transparent: true, opacity: 0.8 })
    );
    exitMarker.position.set(0, 0.04, l / 2 - 0.6);
    group.add(exitMarker);

    this.scene.add(group);

    this.doors.push({
      type: 'EXIT_DOOR',
      interiorId: 'GAS_STATION',
      label: 'Exit to Wasteland',
      position: new THREE.Vector3(info.center.x, 1, info.center.z + l / 2 - 0.8),
      targetPos: info.outsideDoorPos.clone(),
      radius: 2.2,
      mesh: exitMarker
    });
  }

  initExteriorDoors() {
    // 1. Clinic Outside Doorway: x: -16, z: -14.2
    this.createExteriorDoor(
      -16, -14.2,
      'CLINIC',
      '🚪 Enter Clinic',
      this.interiors.CLINIC.spawnPoint
    );

    // 2. Gas Station Outside Doorway: positioned facing the camera & road at (18, 10.5)
    this.createExteriorDoor(
      18, 10.5,
      'GAS_STATION',
      '🚪 Enter Gas Station Store',
      this.interiors.GAS_STATION.spawnPoint
    );
  }

  createExteriorDoor(x, z, targetInteriorId, label, targetSpawnPos) {
    // Glowing door rug indicator on outside ground
    const mat = new THREE.MeshBasicMaterial({ color: 0xf0a020, transparent: true, opacity: 0.7 });
    const rug = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.4), mat);
    rug.position.set(x, 0.04, z);
    this.scene.add(rug);

    // Floating door icon sprite
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(28, 27, 24, 0.9)';
    ctx.roundRect(4, 4, 120, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#f0a020';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOOR', 64, 38);

    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.position.set(x, 2.4, z);
    sprite.scale.set(1.8, 0.9, 1);
    this.scene.add(sprite);

    this.doors.push({
      type: 'ENTER_DOOR',
      targetInteriorId,
      label,
      position: new THREE.Vector3(x, 0.5, z),
      targetPos: targetSpawnPos.clone(),
      radius: 2.4,
      mesh: rug
    });
  }

  teleportSurvivor(door, survivor, cameraController, hud) {
    survivor.group.position.copy(door.targetPos);
    survivor.path = [];
    survivor.isWalking = false;

    // Point camera to newly entered area
    cameraController.setFocus(door.targetPos.x, door.targetPos.z);

    if (door.type === 'ENTER_DOOR') {
      this.currentInterior = door.targetInteriorId;
      hud.showNotification(`🚪 Entered ${this.interiors[door.targetInteriorId].name}`);
    } else {
      this.currentInterior = null;
      hud.showNotification('☀️ Exited to Wasteland');
    }
  }

  findDoorAt(raycaster) {
    for (const d of this.doors) {
      if (this.currentInterior === null && d.type === 'EXIT_DOOR') continue;
      if (this.currentInterior !== null && d.type === 'ENTER_DOOR') continue;
      if (this.currentInterior !== null && d.interiorId !== this.currentInterior) continue;

      if (d.mesh) {
        const hits = raycaster.intersectObjects([d.mesh], true);
        if (hits.length > 0) return d;
      }
    }
    return null;
  }
}
