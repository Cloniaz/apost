import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Survivor {
  constructor(scene, grid, x = 0, z = 0) {
    this.scene = scene;
    this.grid = grid;

    // Survival Stats (0 - 100)
    this.stats = {
      health: CONFIG.SURVIVOR.MAX_HEALTH,
      stamina: CONFIG.SURVIVOR.MAX_STAMINA,
      hunger: CONFIG.SURVIVOR.MAX_HUNGER,
      thirst: CONFIG.SURVIVOR.MAX_THIRST,
    };

    // Inventory copy for quick slots
    this.inventory = { ...CONFIG.INITIAL_INVENTORY };

    // Stimulant Buff state (speed, bonus damage, health regen)
    this.stimulantBuffTimer = 0;
    this.stimulantHealTimer = 0;

    this.isSelected = true;
    this.isSprinting = false;
    this.isWalking = false;

    // Combat weapon (bat)
    this.attackCooldownTimer = 0;
    this.isAttacking = false;

    // Path movement
    this.path = [];
    this.currentWaypointIndex = 0;
    this.speed = CONFIG.SURVIVOR.WALK_SPEED;

    // Build procedural 3D model
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.buildModel();
    this.createSelectionRing();

    this.scene.add(this.group);

    // Animation state
    this.animTime = 0;

    // Flashlight (Toggle with F)
    this.flashlightOn = false;
    this.initFlashlight();
  }

  initFlashlight() {
    // Wide, powerful beam spotlight for survivor
    this.flashlight = new THREE.SpotLight(0xfff6d6, 0, 48, Math.PI / 3.2, 0.4, 1.1);
    this.flashlight.position.set(0, 1.4, 0.4);
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 1.0, 12);
    this.group.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.group.add(this.flashlight);

    // Secondary ambient glow around player so survivor is clearly illuminated
    this.flashlightAura = new THREE.PointLight(0xfff0c2, 0, 10, 1.8);
    this.flashlightAura.position.set(0, 1.5, 0);
    this.group.add(this.flashlightAura);
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 6.5 : 0;
    this.flashlightAura.intensity = this.flashlightOn ? 1.4 : 0;
    return this.flashlightOn;
  }

  buildModel() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdfb48c,
      roughness: 0.8,
      flatShading: true
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x3b5066,
      roughness: 0.85,
      flatShading: true
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x2e3529,
      roughness: 0.9,
      flatShading: true
    });
    const bootsMat = new THREE.MeshStandardMaterial({
      color: 0x1f1a17,
      roughness: 0.9,
      flatShading: true
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x28231d,
      roughness: 0.9,
      flatShading: true
    });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    this.torso = new THREE.Mesh(torsoGeo, jacketMat);
    this.torso.position.y = 1.35;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.55, 0.65, 0.28);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x5a4a35, roughness: 0.9, flatShading: true });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 1.4, -0.32);
    pack.castShadow = true;
    this.group.add(pack);

    // Head
    const headGeo = new THREE.BoxGeometry(0.42, 0.46, 0.42);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 2.05;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Hair / Cap
    const hairGeo = new THREE.BoxGeometry(0.44, 0.18, 0.44);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.22;
    this.group.add(hair);

    // Limbs
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.48, 1.7, 0);
    const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.position.y = -0.35;
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);
    this.group.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.48, 1.7, 0);
    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.position.y = -0.35;
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);

    // Bat / Weapon in right hand
    const batGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.85, 6);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x6e4e30, roughness: 0.8, flatShading: true });
    const bat = new THREE.Mesh(batGeo, batMat);
    bat.position.set(0, -0.65, 0.25);
    bat.rotation.x = Math.PI / 3;
    bat.castShadow = true;
    this.rightArmPivot.add(bat);

    this.group.add(this.rightArmPivot);

    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.2, 0.9, 0);
    const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.25);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.y = -0.4;
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);

    const bootGeo = new THREE.BoxGeometry(0.26, 0.2, 0.34);
    const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
    leftBoot.position.set(0, -0.8, 0.04);
    leftBoot.castShadow = true;
    this.leftLegPivot.add(leftBoot);
    this.group.add(this.leftLegPivot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.2, 0.9, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.y = -0.4;
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);

    const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
    rightBoot.position.set(0, -0.8, 0.04);
    rightBoot.castShadow = true;
    this.rightLegPivot.add(rightBoot);
    this.group.add(this.rightLegPivot);
  }

  createSelectionRing() {
    const ringGeo = new THREE.RingGeometry(0.7, 0.82, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.SELECTION_RING,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.position.y = 0.03;
    this.group.add(this.selectionRing);
  }

  setSelected(selected) {
    this.isSelected = selected;
    if (this.selectionRing) {
      this.selectionRing.visible = selected;
    }
  }

  addItem(itemType, amount = 1) {
    if (this.inventory[itemType] !== undefined) {
      this.inventory[itemType] += amount;
      return true;
    }
    return false;
  }

  useItem(slotKey) {
    const slotMap = {
      '1': 'cannedFood',
      '2': 'waterBottle',
      '3': 'bandage',
      '4': 'stimulant'
    };
    const itemKey = slotMap[slotKey];
    if (!itemKey) return null;

    if (this.inventory[itemKey] <= 0) {
      return { success: false, reason: 'Empty stock' };
    }

    const item = CONFIG.ITEMS[itemKey];
    this.inventory[itemKey]--;

    if (item.hungerRestore) {
      this.stats.hunger = Math.min(CONFIG.SURVIVOR.MAX_HUNGER, this.stats.hunger + item.hungerRestore);
    }
    if (item.thirstRestore) {
      this.stats.thirst = Math.min(CONFIG.SURVIVOR.MAX_THIRST, this.stats.thirst + item.thirstRestore);
    }
    if (item.healthRestore) {
      this.stats.health = Math.min(CONFIG.SURVIVOR.MAX_HEALTH, this.stats.health + item.healthRestore);
    }
    if (item.staminaRestore) {
      this.stats.stamina = Math.min(CONFIG.SURVIVOR.MAX_STAMINA, this.stats.stamina + item.staminaRestore);
      // Activate 30-second stimulant adrenaline buff!
      this.stimulantBuffTimer = 30.0;
    }

    return { success: true, item: item.name, icon: item.icon };
  }

  takeDamage(amount) {
    this.stats.health = Math.max(0, this.stats.health - amount);
    if (this.torso) {
      const orig = this.torso.material.color.getHex();
      this.torso.material.color.setHex(0xff2222);
      setTimeout(() => {
        if (this.torso) this.torso.material.color.setHex(orig);
      }, 120);
    }
    return this.stats.health <= 0;
  }

  attackTarget(targetEnemy) {
    if (this.attackCooldownTimer > 0) return null;
    this.attackCooldownTimer = CONFIG.COMBAT.PLAYER_ATTACK_COOLDOWN;
    this.isAttacking = true;

    // Swing arm animation
    this.rightArmPivot.rotation.x = -1.2;
    setTimeout(() => {
      this.rightArmPivot.rotation.x = 0.8;
      setTimeout(() => {
        this.isAttacking = false;
      }, 140);
    }, 110);

    // Apply stimulant bonus damage (+60% damage)
    const baseDamage = CONFIG.COMBAT.PLAYER_ATTACK_DAMAGE;
    const finalDamage = this.stimulantBuffTimer > 0 ? Math.round(baseDamage * 1.6) : baseDamage;

    const isDead = targetEnemy.takeDamage(finalDamage, this.group.position);
    return { damage: finalDamage, isDead };
  }

  moveTo(targetX, targetZ) {
    const startX = this.group.position.x;
    const startZ = this.group.position.z;
    const path = this.grid.findPath(startX, startZ, targetX, targetZ);

    if (path && path.length > 0) {
      this.path = path;
      this.currentWaypointIndex = 0;
      this.isWalking = true;
    }
  }

  update(delta, isShiftDown) {
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }

    // 1. Hunger & Thirst drain continuously
    this.stats.hunger = Math.max(0, this.stats.hunger - CONFIG.SURVIVOR.HUNGER_DRAIN_PER_SEC * delta);
    this.stats.thirst = Math.max(0, this.stats.thirst - CONFIG.SURVIVOR.THIRST_DRAIN_PER_SEC * delta);

    // 2. Sprinting / Stamina & Movement Speed
    const speedMult = this.stimulantBuffTimer > 0 ? 1.35 : 1.0; // +35% move speed when buffed
    if (this.isWalking && isShiftDown && this.stats.stamina > 2) {
      this.isSprinting = true;
      this.speed = CONFIG.SURVIVOR.SPRINT_SPEED * speedMult;
      this.stats.stamina = Math.max(0, this.stats.stamina - CONFIG.SURVIVOR.STAMINA_SPRINT_DRAIN_PER_SEC * delta);
    } else {
      this.isSprinting = false;
      this.speed = CONFIG.SURVIVOR.WALK_SPEED * speedMult;
      if (this.stats.stamina < CONFIG.SURVIVOR.MAX_STAMINA) {
        this.stats.stamina = Math.min(
          CONFIG.SURVIVOR.MAX_STAMINA,
          this.stats.stamina + CONFIG.SURVIVOR.STAMINA_REGEN_PER_SEC * delta
        );
      }
    }

    // 2b. Stimulant Buff Timers & Passive Health Regeneration
    if (this.stimulantBuffTimer > 0) {
      this.stimulantBuffTimer -= delta;
      // Gentle passive heal (2.5 HP per sec)
      if (this.stats.health < CONFIG.SURVIVOR.MAX_HEALTH) {
        this.stats.health = Math.min(CONFIG.SURVIVOR.MAX_HEALTH, this.stats.health + 2.5 * delta);
      }
    }

    // 3. Health logic
    if (this.stats.hunger <= 0 || this.stats.thirst <= 0) {
      this.stats.health = Math.max(0, this.stats.health - CONFIG.SURVIVOR.STARVATION_DAMAGE_PER_SEC * delta);
    } else if (this.stats.hunger > 50 && this.stats.thirst > 50 && this.stats.health < CONFIG.SURVIVOR.MAX_HEALTH) {
      this.stats.health = Math.min(
        CONFIG.SURVIVOR.MAX_HEALTH,
        this.stats.health + CONFIG.SURVIVOR.HEALTH_REGEN_PER_SEC * delta
      );
    }

    // Path Movement
    if (this.path.length > 0 && this.currentWaypointIndex < this.path.length) {
      const targetWp = this.path[this.currentWaypointIndex];
      const currentPos = this.group.position;
      const dx = targetWp.x - currentPos.x;
      const dz = targetWp.z - currentPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.15) {
        this.currentWaypointIndex++;
        if (this.currentWaypointIndex >= this.path.length) {
          this.path = [];
          this.isWalking = false;
        }
      } else {
        this.isWalking = true;
        const step = Math.min(dist, this.speed * delta);
        currentPos.x += (dx / dist) * step;
        currentPos.z += (dz / dist) * step;

        const targetAngle = Math.atan2(dx, dz);
        let diff = targetAngle - this.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1.0, 14 * delta);
      }
    } else {
      this.isWalking = false;
    }

    // Walk Animation
    if (this.isWalking) {
      const animSpeed = this.isSprinting ? 14 : 9;
      this.animTime += delta * animSpeed;
      const angle = Math.sin(this.animTime) * 0.65;

      this.leftLegPivot.rotation.x = angle;
      this.rightLegPivot.rotation.x = -angle;
      if (!this.isAttacking) {
        this.leftArmPivot.rotation.x = -angle * 0.75;
        this.rightArmPivot.rotation.x = angle * 0.75;
      }

      this.torso.position.y = 1.35 + Math.abs(Math.sin(this.animTime)) * 0.05;
      this.head.position.y = 2.05 + Math.abs(Math.sin(this.animTime)) * 0.05;
    } else {
      this.leftLegPivot.rotation.x *= 0.8;
      this.rightLegPivot.rotation.x *= 0.8;
      if (!this.isAttacking) {
        this.leftArmPivot.rotation.x *= 0.8;
        this.rightArmPivot.rotation.x *= 0.8;
      }
      this.torso.position.y = 1.35;
      this.head.position.y = 2.05;
      this.animTime = 0;
    }
  }

  getPosition() {
    return this.group.position;
  }
}
