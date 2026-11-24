import * as THREE from 'three';
import { CONFIG } from './config.js';

export class NPCsManager {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;
    this.npcs = [];
    this.activeMission = null;

    this.spawnNPCs();
  }

  spawnNPCs() {
    // 3 distinct NPC survivors with unique roles
    // 1. Dr. Elena (Inside Clinic Interior at x: 200, z: 198)
    this.createNPC('Dr. Elena', 200, 198, 0x3d7068, {
      title: 'Find medical supplies for the Clinic',
      targetType: 'scavenge',
      requiredItem: 'bandage',
      requiredCount: 2,
      currentCount: 0,
      reward: { item: 'stimulant', count: 2 },
      dialogue: "Thank goodness you found me! We have injured survivors here. Can you scavenge 2 bandages from the wasteland?"
    });

    // 2. Marcus (Camp Leader at Survivor Camp in Wasteland)
    this.createNPC('Marcus', 0, -11, 0x6e503b, {
      title: 'Cull 3 mutated zombies threatening the camp',
      targetType: 'kill',
      enemyType: 'ZOMBIE',
      requiredCount: 3,
      currentCount: 0,
      reward: { item: 'cannedFood', count: 3 },
      dialogue: "The perimeter is breached. Kill 3 zombies around the ruins to secure our camp."
    });

    // 3. Jax (Mechanic inside Gas Station Store at x: 300, z: 199)
    this.createNPC('Jax', 300, 199, 0x634235, {
      title: 'Scavenge water for the generator cooling',
      targetType: 'scavenge',
      requiredItem: 'waterBottle',
      requiredCount: 2,
      currentCount: 0,
      reward: { item: 'bandage', count: 2 },
      dialogue: "The generator is overheating without water. Bring me 2 water bottles!"
    });
  }

  createNPC(name, x, z, jacketColor, mission) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Procedural NPC Character
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfb48c, roughness: 0.8, flatShading: true });
    const jacketMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.85, flatShading: true });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x242622, roughness: 0.9, flatShading: true });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), jacketMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.42), skinMat);
    head.position.y = 2.05;
    head.castShadow = true;
    group.add(head);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.25), pantsMat);
    leftLeg.position.set(-0.2, 0.45, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.25), pantsMat);
    rightLeg.position.set(0.2, 0.45, 0);
    group.add(leftLeg, rightLeg);

    // Amber Diamond Icon above NPC head (large, bright, rotating beacon)
    const diamondGeo = new THREE.OctahedronGeometry(0.48, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      flatShading: true
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 3.2;
    group.add(diamond);

    // Light beacon above NPC head so they are easily visible at night
    const beaconLight = new THREE.PointLight(0xffa020, 1.4, 14, 1.8);
    beaconLight.position.y = 3.2;
    group.add(beaconLight);

    // Floating text label background plane above NPC head
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    const nctx = nameCanvas.getContext('2d');
    nctx.fillStyle = 'rgba(28, 27, 24, 0.85)';
    nctx.roundRect(10, 10, 236, 44, 8);
    nctx.fill();
    nctx.strokeStyle = '#f0a020';
    nctx.lineWidth = 3;
    nctx.stroke();
    nctx.fillStyle = '#ffffff';
    nctx.font = 'bold 24px sans-serif';
    nctx.textAlign = 'center';
    nctx.fillText(name, 128, 40);

    const labelTex = new THREE.CanvasTexture(nameCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, depthTest: false });
    const labelSprite = new THREE.Sprite(labelMat);
    labelSprite.position.y = 4.1;
    labelSprite.scale.set(3.2, 0.8, 1);
    group.add(labelSprite);

    this.scene.add(group);

    const npcObj = {
      name,
      group,
      diamond,
      mission,
      position: new THREE.Vector3(x, 1, z),
      radius: 2.0,
      resetTimer: 0
    };
    this.npcs.push(npcObj);

    // Grid obstacle
    const gp = this.grid.worldToGrid(x, z);
    this.grid.setObstacle(gp.x, gp.z, true);
  }

  interactWithNPC(npc, survivor, hud) {
    // Check if player is turning in active mission
    if (this.activeMission && this.activeMission.npcName === npc.name) {
      if (this.checkMissionComplete(survivor)) {
        // Complete mission
        this.completeMission(survivor, hud);
        return;
      } else {
        hud.showDialogue(npc.name, `You still need more progress: "${this.activeMission.title}" (${this.activeMission.currentCount}/${this.activeMission.requiredCount}).`);
        return;
      }
    }

    // Otherwise assign this NPC's mission
    this.activeMission = {
      ...npc.mission,
      npcName: npc.name
    };
    hud.setMissionText(`Mission: ${this.activeMission.title} (${this.activeMission.currentCount}/${this.activeMission.requiredCount})`);
    hud.showDialogue(npc.name, `${npc.mission.dialogue}`);
  }

  checkMissionComplete(survivor) {
    if (!this.activeMission) return false;
    if (this.activeMission.targetType === 'scavenge') {
      const invCount = survivor.inventory[this.activeMission.requiredItem] || 0;
      return invCount >= this.activeMission.requiredCount;
    }
    return this.activeMission.currentCount >= this.activeMission.requiredCount;
  }

  notifyEnemyKilled(enemyType, hud) {
    if (!this.activeMission || this.activeMission.targetType !== 'kill') return;
    if (this.activeMission.enemyType === enemyType) {
      this.activeMission.currentCount++;
      hud.setMissionText(`Mission: ${this.activeMission.title} (${this.activeMission.currentCount}/${this.activeMission.requiredCount})`);
      if (this.activeMission.currentCount >= this.activeMission.requiredCount) {
        hud.showNotification('✨ Mission objective reached! Return to NPC for reward.');
      }
    }
  }

  completeMission(survivor, hud) {
    const reward = this.activeMission.reward;
    // Deduct items if scavenge mission
    if (this.activeMission.targetType === 'scavenge') {
      survivor.inventory[this.activeMission.requiredItem] -= this.activeMission.requiredCount;
    }

    survivor.addItem(reward.item, reward.count);
    hud.updateInventory(survivor.inventory);
    hud.showNotification(`🎉 Mission Completed! Received +${reward.count} ${CONFIG.ITEMS[reward.item].name}`);
    hud.showDialogue(this.activeMission.npcName, "Thank you so much! Here are the supplies I promised.");

    this.activeMission = null;
    hud.setMissionText('No active mission');

    // Reset NPC mission offering after configurable reset time (e.g. 60 seconds)
    npc.resetTimer = 60;
  }

  update(delta) {
    // Gentle rotation of amber diamond above NPC heads
    for (const n of this.npcs) {
      n.diamond.rotation.y += delta * 1.6;
      n.diamond.position.y = 2.75 + Math.sin(performance.now() * 0.003) * 0.08;

      // Quest reset timer
      if (n.resetTimer > 0) {
        n.resetTimer -= delta;
        if (n.resetTimer <= 0) {
          // Re-generate fresh mission variant
          this.refreshNPCMission(n);
        }
      }
    }
  }

  refreshNPCMission(n) {
    const pool = [
      {
        title: 'Scavenge supplies for our survival',
        targetType: 'scavenge',
        requiredItem: Math.random() < 0.5 ? 'cannedFood' : 'waterBottle',
        requiredCount: 2,
        currentCount: 0,
        reward: { item: 'bandage', count: 2 },
        dialogue: "We are running low on provisions again. Could you bring us 2 more supplies?"
      },
      {
        title: 'Exterminate lurking mutants',
        targetType: 'kill',
        enemyType: 'ZOMBIE',
        requiredCount: 2,
        currentCount: 0,
        reward: { item: 'stimulant', count: 2 },
        dialogue: "More mutant beasts were spotted nearby. Eliminate 2 of them!"
      }
    ];
    n.mission = pool[Math.floor(Math.random() * pool.length)];
  }

  findNPCAt(raycaster) {
    for (const n of this.npcs) {
      const hits = raycaster.intersectObjects([n.group], true);
      if (hits.length > 0) return n;
    }
    return null;
  }
}
