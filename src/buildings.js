import * as THREE from 'three';
import { CONFIG } from './config.js';

export class BuildingsManager {
  constructor(scene, grid, dayNightCycle) {
    this.scene = scene;
    this.grid = grid;
    this.dayNightCycle = dayNightCycle;
    this.buildings = [];

    this.initSharedMaterials();
    this.buildClinic();
    this.buildGasStation();
    this.buildRuinedHouses();
    this.buildSurvivorCamp();
    this.buildToxicPuddleArea();
  }

  initSharedMaterials() {
    this.matClinicWall = new THREE.MeshStandardMaterial({ color: 0x8a9289, roughness: 0.85, flatShading: true });
    this.matClinicRoof = new THREE.MeshStandardMaterial({ color: 0x47514a, roughness: 0.9, flatShading: true });
    this.matRedCross = new THREE.MeshStandardMaterial({ color: 0xb5352c, roughness: 0.6, flatShading: true });
    this.matGasRoof = new THREE.MeshStandardMaterial({ color: 0xa8732e, roughness: 0.8, flatShading: true });
    this.matPillar = new THREE.MeshStandardMaterial({ color: 0x3d3a33, roughness: 0.9, flatShading: true });
    this.matWood = new THREE.MeshStandardMaterial({ color: 0x4f3f2d, roughness: 0.9, flatShading: true });
    this.matRuinedBrick = new THREE.MeshStandardMaterial({ color: 0x6e4d41, roughness: 0.9, flatShading: true });
    this.matTent = new THREE.MeshStandardMaterial({ color: 0x5a6350, roughness: 0.9, flatShading: true });
  }

  markObstacleBox(minX, minZ, maxX, maxZ) {
    const min = this.grid.worldToGrid(minX, minZ);
    const max = this.grid.worldToGrid(maxX, maxZ);
    for (let gz = min.z; gz <= max.z; gz++) {
      for (let gx = min.x; gx <= max.x; gx++) {
        this.grid.setObstacle(gx, gz, true);
      }
    }
  }

  buildClinic() {
    // Clinic building at north quadrant: x: -16, z: -18, size 12x8
    const group = new THREE.Group();
    group.position.set(-16, 0, -18);

    // Main walls
    const mainGeo = new THREE.BoxGeometry(11, 4.2, 7.5);
    const mainMesh = new THREE.Mesh(mainGeo, this.matClinicWall);
    mainMesh.position.y = 2.1;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // Roof
    const roofGeo = new THREE.BoxGeometry(11.6, 0.6, 8.1);
    const roofMesh = new THREE.Mesh(roofGeo, this.matClinicRoof);
    roofMesh.position.y = 4.5;
    roofMesh.castShadow = true;
    group.add(roofMesh);

    // Red Cross Emblems on front facade
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.08), this.matRedCross);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.08), this.matRedCross);
    crossV.position.set(0, 3.2, 3.8);
    crossH.position.set(0, 3.2, 3.8);
    group.add(crossV, crossH);

    // Doorway opening (dark recessed box)
    const doorGeo = new THREE.BoxGeometry(1.6, 2.4, 0.2);
    const doorMesh = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: 0x181714, flatShading: true }));
    doorMesh.position.set(0, 1.2, 3.76);
    group.add(doorMesh);

    // Clinic Entrance Light (warm yellow beacon at night)
    const clinicLight = new THREE.PointLight(0xffdf88, 0, 18, 1.8);
    clinicLight.position.set(0, 3.5, 4.5);
    group.add(clinicLight);
    this.dayNightCycle.addNightLight(clinicLight);

    // Medical supplies crates near clinic
    this.createCrate(-10, -14, 1.2, 1.2, 1.2);
    this.createCrate(-9, -15, 0.9, 0.9, 0.9);

    this.scene.add(group);
    this.markObstacleBox(-22, -22.5, -10, -14);
  }

  buildGasStation() {
    // Gas station along the road (x: 18, z: 8)
    const group = new THREE.Group();
    group.position.set(18, 0, 8);

    // Canopy canopy roof
    const canopyGeo = new THREE.BoxGeometry(12, 0.8, 8);
    const canopy = new THREE.Mesh(canopyGeo, this.matGasRoof);
    canopy.position.y = 4.8;
    canopy.castShadow = true;
    group.add(canopy);

    // 4 Support Pillars
    const pillarGeo = new THREE.BoxGeometry(0.6, 4.8, 0.6);
    const offsets = [
      { x: -4.8, z: -2.8 },
      { x: 4.8, z: -2.8 },
      { x: -4.8, z: 2.8 },
      { x: 4.8, z: 2.8 },
    ];
    for (const off of offsets) {
      const p = new THREE.Mesh(pillarGeo, this.matPillar);
      p.position.set(off.x, 2.4, off.z);
      p.castShadow = true;
      group.add(p);
      this.markObstacleBox(18 + off.x - 0.5, 8 + off.z - 0.5, 18 + off.x + 0.5, 8 + off.z + 0.5);
    }

    // Two Fuel Dispenser Pumps
    const pumpGeo = new THREE.BoxGeometry(1.2, 2.0, 1.0);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x96392b, flatShading: true });
    const pump1 = new THREE.Mesh(pumpGeo, pumpMat);
    pump1.position.set(-2, 1.0, 0);
    pump1.castShadow = true;
    const pump2 = new THREE.Mesh(pumpGeo, pumpMat);
    pump2.position.set(2, 1.0, 0);
    pump2.castShadow = true;
    group.add(pump1, pump2);
    this.markObstacleBox(15, 7.2, 21, 8.8);

    // Small back convenience store shack
    const storeGeo = new THREE.BoxGeometry(7, 3.5, 5);
    const store = new THREE.Mesh(storeGeo, this.matClinicWall);
    store.position.set(0, 1.75, 7.5);
    store.castShadow = true;
    group.add(store);
    // Mark only store walls as obstacle, keep entrance area at south (z: 10.5) open and accessible
    this.markObstacleBox(15, 13.5, 21, 17.5);

    this.scene.add(group);
  }

  buildRuinedHouses() {
    // Ruined house 1 (x: -20, z: 16)
    this.createRuinedStructure(-20, 16, 9, 7, 3.6, 0.1);

    // Ruined house 2 (x: 16, z: -18)
    this.createRuinedStructure(16, -18, 8, 6.5, 3.2, -0.2);
  }

  createRuinedStructure(x, z, width, depth, height, angle) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = angle;

    const wallThick = 0.5;
    // Back wall intact
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), this.matRuinedBrick);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.castShadow = true;
    group.add(backWall);

    // Partial Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth * 0.7), this.matRuinedBrick);
    leftWall.position.set(-width / 2, height / 2, -depth * 0.15);
    leftWall.castShadow = true;
    group.add(leftWall);

    // Collapsed Right Wall (low profile)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height * 0.45, depth * 0.5), this.matRuinedBrick);
    rightWall.position.set(width / 2, height * 0.225, -depth * 0.2);
    rightWall.castShadow = true;
    group.add(rightWall);

    this.scene.add(group);

    // Only mark the actual wall segments as obstacles so inside the ruins is fully walkable!
    this.markObstacleBox(x - width / 2, z - depth / 2 - 0.3, x + width / 2, z - depth / 2 + 0.3); // back wall
    this.markObstacleBox(x - width / 2 - 0.3, z - depth / 2, x - width / 2 + 0.3, z + depth * 0.2); // left wall
    this.markObstacleBox(x + width / 2 - 0.3, z - depth / 2, x + width / 2 + 0.3, z); // right wall
  }

  buildSurvivorCamp() {
    // Survivor Camp (x: 2, z: -14)
    const group = new THREE.Group();
    group.position.set(2, 0, -14);

    // Survivor Tents (low-poly wedge/pyramid)
    const tentGeo = new THREE.ConeGeometry(2.2, 2.4, 4);
    tentGeo.rotateY(Math.PI / 4);
    const tent1 = new THREE.Mesh(tentGeo, this.matTent);
    tent1.position.set(-3.5, 1.2, 0);
    tent1.castShadow = true;
    group.add(tent1);
    this.markObstacleBox(-3.5 + 2 - 2, -14 - 2, -3.5 + 2 + 2, -14 + 2);

    const tent2 = new THREE.Mesh(tentGeo, this.matTent);
    tent2.position.set(3.5, 1.2, 1.2);
    tent2.castShadow = true;
    group.add(tent2);
    this.markObstacleBox(3.5 + 2 - 2, 1.2 - 14 - 2, 3.5 + 2 + 2, 1.2 - 14 + 2);

    // Campfire in center of camp
    const pitGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.3, 8);
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x24201a, flatShading: true });
    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.y = 0.15;
    group.add(pit);

    // Fire log embers (glowing orange cone)
    const emberGeo = new THREE.ConeGeometry(0.5, 0.8, 5);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const embers = new THREE.Mesh(emberGeo, emberMat);
    embers.position.y = 0.45;
    group.add(embers);

    // Campfire Point Light (flickers at night)
    this.campFireLight = new THREE.PointLight(0xff7722, 1.8, 20, 2.0);
    this.campFireLight.position.set(0, 1.2, 0);
    this.campFireLight.castShadow = true;
    group.add(this.campFireLight);
    this.dayNightCycle.addNightLight(this.campFireLight);

    this.scene.add(group);
  }

  buildToxicPuddleArea() {
    // Toxic puddle zone in south-west wasteland: x: -18, z: 26
    const puddleGroup = new THREE.Group();
    puddleGroup.position.set(-18, 0.04, 26);

    // Glowing irradiated toxic slime disk
    const slimeGeo = new THREE.CylinderGeometry(5.5, 6.0, 0.08, 16);
    const slimeMat = new THREE.MeshStandardMaterial({
      color: 0x48bb22, // Radioactive bio-green
      emissive: 0x286e10,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
      flatShading: true,
      transparent: true,
      opacity: 0.88
    });
    const slime = new THREE.Mesh(slimeGeo, slimeMat);
    puddleGroup.add(slime);

    // Toxic warning barrel tipped over
    const barrelGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.2, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x827e24, flatShading: true });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(3.2, 0.45, 2.1);
    barrel.rotation.z = Math.PI / 2.2;
    barrel.castShadow = true;
    puddleGroup.add(barrel);

    // Faint eerie green point light from toxic puddle
    const toxicLight = new THREE.PointLight(0x44ee11, 0.8, 12, 2.0);
    toxicLight.position.set(0, 1.0, 0);
    puddleGroup.add(toxicLight);

    this.scene.add(puddleGroup);
  }

  createCrate(x, z, w, h, d) {
    const crateGeo = new THREE.BoxGeometry(w, h, d);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x5a4a35, roughness: 0.9, flatShading: true });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(x, h / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
    this.markObstacleBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }
}
