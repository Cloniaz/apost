import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Enemy {
  constructor(scene, grid, type, x, z) {
    this.scene = scene;
    this.grid = grid;
    this.type = type; // 'ZOMBIE', 'MUTATED_WOLF', 'MUTATED_BEAR'
    this.cfg = CONFIG.ENEMIES[type];

    this.health = this.cfg.HEALTH;
    this.maxHealth = this.cfg.HEALTH;
    this.damage = this.cfg.DAMAGE;
    this.speed = this.cfg.SPEED;
    this.attackRange = this.cfg.ATTACK_RANGE;
    this.attackCooldown = this.cfg.ATTACK_COOLDOWN;
    this.detectRange = this.cfg.DETECT_RANGE;

    this.cooldownTimer = 0;
    this.state = 'IDLE'; // 'IDLE', 'CHASE', 'ATTACK', 'DEAD'
    this.path = [];
    this.repathTimer = 0;
    this.isDead = false;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    this.buildModel();
    this.scene.add(this.group);
  }

  buildModel() {
    if (this.type === 'ZOMBIE') {
      this.buildZombieModel();
    } else if (this.type === 'MUTATED_WOLF') {
      this.buildWolfModel();
    } else {
      this.buildBearModel();
    }
  }

  buildZombieModel() {
    // Green-gray, hunched, arms forward
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5b7058, roughness: 0.9, flatShading: true });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x3d3c35, roughness: 0.9, flatShading: true });

    // Hunched torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    this.torso = new THREE.Mesh(torsoGeo, clothMat);
    this.torso.position.set(0, 1.25, 0.15);
    this.torso.rotation.x = 0.25; // Hunched forward
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head tilted
    const headGeo = new THREE.BoxGeometry(0.42, 0.45, 0.42);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 1.85, 0.35);
    this.head.rotation.set(0.2, 0.1, 0.1);
    this.head.castShadow = true;
    this.group.add(this.head);

    // Arms extended forward
    const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.45, 1.35, 0.45);
    leftArm.rotation.x = -Math.PI / 2.2;
    leftArm.castShadow = true;
    this.group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.45, 1.35, 0.45);
    rightArm.rotation.x = -Math.PI / 2.1;
    rightArm.castShadow = true;
    this.group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
    this.leftLeg = new THREE.Mesh(legGeo, clothMat);
    this.leftLeg.position.set(-0.2, 0.4, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, clothMat);
    this.rightLeg.position.set(0.2, 0.4, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);
  }

  buildWolfModel() {
    // Fast mutated quadruped with spiked back and glowing red eyes
    const furMat = new THREE.MeshStandardMaterial({ color: 0x36383a, roughness: 0.9, flatShading: true });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8a2b2b, roughness: 0.8, flatShading: true });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });

    // Long body
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.6, 1.4);
    this.torso = new THREE.Mesh(bodyGeo, furMat);
    this.torso.position.y = 0.7;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Spikes along back
    for (let z = -0.4; z <= 0.4; z += 0.3) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), spikeMat);
      spike.position.set(0, 1.15, z);
      spike.rotation.x = -0.3;
      this.group.add(spike);
    }

    // Snout / Head
    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.6);
    this.head = new THREE.Mesh(headGeo, furMat);
    this.head.position.set(0, 0.9, 0.85);
    this.group.add(this.head);

    // Glowing red eyes
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat);
    eye1.position.set(-0.16, 1.0, 1.15);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat);
    eye2.position.set(0.16, 1.0, 1.15);
    this.group.add(eye1, eye2);

    // 4 Quadruped Legs
    const legGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    const legOffsets = [
      { x: -0.28, z: 0.45 }, { x: 0.28, z: 0.45 },
      { x: -0.28, z: -0.45 }, { x: 0.28, z: -0.45 }
    ];
    this.legs = [];
    for (const off of legOffsets) {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(off.x, 0.27, off.z);
      leg.castShadow = true;
      this.legs.push(leg);
      this.group.add(leg);
    }
  }

  buildBearModel() {
    // Large, brown, shoulder hump, tusk-like spikes
    const furMat = new THREE.MeshStandardMaterial({ color: 0x422e20, roughness: 0.95, flatShading: true });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xd6c29a, roughness: 0.8, flatShading: true });

    // Massive torso
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.4, 2.2);
    this.torso = new THREE.Mesh(torsoGeo, furMat);
    this.torso.position.y = 1.25;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Shoulder hump
    const humpGeo = new THREE.BoxGeometry(1.4, 0.7, 0.9);
    const hump = new THREE.Mesh(humpGeo, furMat);
    hump.position.set(0, 1.95, 0.4);
    this.group.add(hump);

    // Heavy Head
    const headGeo = new THREE.BoxGeometry(0.9, 0.8, 0.9);
    this.head = new THREE.Mesh(headGeo, furMat);
    this.head.position.set(0, 1.35, 1.45);
    this.group.add(this.head);

    // Tusks
    const tusk1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), hornMat);
    tusk1.position.set(-0.45, 1.0, 1.7);
    tusk1.rotation.set(0.6, 0, -0.3);
    const tusk2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), hornMat);
    tusk2.position.set(0.45, 1.0, 1.7);
    tusk2.rotation.set(0.6, 0, 0.3);
    this.group.add(tusk1, tusk2);

    // Thick Legs
    const legGeo = new THREE.BoxGeometry(0.42, 0.8, 0.42);
    const legOffsets = [
      { x: -0.65, z: 0.7 }, { x: 0.65, z: 0.7 },
      { x: -0.65, z: -0.7 }, { x: 0.65, z: -0.7 }
    ];
    for (const off of legOffsets) {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(off.x, 0.4, off.z);
      leg.castShadow = true;
      this.group.add(leg);
    }
  }

  takeDamage(amount, attackerPos) {
    this.health = Math.max(0, this.health - amount);

    // Hit flash red
    if (this.torso) {
      const orig = this.torso.material.color.getHex();
      this.torso.material.color.setHex(0xff3333);
      setTimeout(() => {
        if (this.torso) this.torso.material.color.setHex(orig);
      }, 100);
    }

    // Small knockback
    if (attackerPos) {
      const dir = this.group.position.clone().sub(attackerPos).setY(0).normalize();
      this.group.position.addScaledVector(dir, CONFIG.COMBAT.KNOCKBACK_FORCE * 0.4);
    }

    if (this.health <= 0) {
      this.isDead = true;
      this.state = 'DEAD';
      // Fall down animation
      this.group.rotation.x = Math.PI / 2.2;
      this.group.position.y = 0.2;

      // Drop loot on death (50% chance for food/water/bandage/stimulant)
      if (Math.random() < 0.65 && window.__dropLootAt) {
        const types = ['cannedFood', 'waterBottle', 'bandage', 'stimulant'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        window.__dropLootAt(this.group.position.x, this.group.position.z, chosen);
      }
    }
    return this.isDead;
  }

  update(delta, playerPos, onAttackPlayer) {
    if (this.isDead) return;

    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }

    const distToPlayer = this.group.position.distanceTo(playerPos);

    // State machine: IDLE -> CHASE -> ATTACK
    if (distToPlayer <= this.attackRange) {
      this.state = 'ATTACK';
      if (this.cooldownTimer <= 0) {
        this.cooldownTimer = this.attackCooldown;
        if (onAttackPlayer) {
          onAttackPlayer(this.damage, this);
        }
      }
    } else if (distToPlayer <= this.detectRange) {
      this.state = 'CHASE';
      // Move towards player
      const dx = playerPos.x - this.group.position.x;
      const dz = playerPos.z - this.group.position.z;
      const step = Math.min(distToPlayer - (this.attackRange * 0.8), this.speed * delta);
      this.group.position.x += (dx / distToPlayer) * step;
      this.group.position.z += (dz / distToPlayer) * step;

      // Face player
      const angle = Math.atan2(dx, dz);
      this.group.rotation.y = angle;
    } else {
      this.state = 'IDLE';
    }
  }

  getPosition() {
    return this.group.position;
  }
}

export class EnemiesManager {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;
    this.enemies = [];

    // Wave system timer (90 to 160s)
    this.waveTimer = 90;
    this.waveCount = 1;

    this.spawnInitialEnemies();
  }

  resetAllEnemies() {
    // Clear all existing enemy models
    for (const e of this.enemies) {
      this.scene.remove(e.group);
    }
    this.enemies = [];
    this.waveTimer = 90;
    this.waveCount = 1;
    this.spawnInitialEnemies();
  }

  spawnInitialEnemies() {
    // Initial zombies near ruined houses and wasteland
    const initialZombies = [
      { x: -24, z: 20 },
      { x: -16, z: 22 },
      { x: 19, z: -22 },
      { x: 24, z: -16 },
      { x: -26, z: -8 }
    ];
    for (const z of initialZombies) {
      this.spawnEnemy('ZOMBIE', z.x, z.z);
    }

    // Initial mutated wolves in forest area
    this.spawnEnemy('MUTATED_WOLF', 22, -28);
    this.spawnEnemy('MUTATED_WOLF', 28, -24);

    // Initial mutated bear in distant wasteland
    this.spawnEnemy('MUTATED_BEAR', -28, 28);
  }

  spawnEnemy(type, x, z) {
    const e = new Enemy(this.scene, this.grid, type, x, z);
    this.enemies.push(e);
    return e;
  }

  spawnWave(playerPos, hud) {
    this.waveCount++;
    hud.showNotification(`⚠️ Wave ${this.waveCount} incoming!`);

    // Pick random map-edge spawn points away from player
    const mapHalf = (CONFIG.MAP_SIZE / 2) - 3;
    const spawnPoints = [
      { x: -mapHalf, z: 0 },
      { x: mapHalf, z: 0 },
      { x: 0, z: -mapHalf },
      { x: 0, z: mapHalf },
    ];
    // Find edge point furthest from player
    spawnPoints.sort((a, b) => {
      const da = Math.hypot(a.x - playerPos.x, a.z - playerPos.z);
      const db = Math.hypot(b.x - playerPos.x, b.z - playerPos.z);
      return db - da;
    });

    const spawn = spawnPoints[0];
    const zombieCount = 2 + Math.min(6, this.waveCount);
    for (let i = 0; i < zombieCount; i++) {
      this.spawnEnemy('ZOMBIE', spawn.x + (Math.random() - 0.5) * 6, spawn.z + (Math.random() - 0.5) * 6);
    }

    if (this.waveCount >= 2) {
      this.spawnEnemy('MUTATED_WOLF', spawn.x + 2, spawn.z + 2);
    }
    if (this.waveCount >= 3) {
      this.spawnEnemy('MUTATED_BEAR', spawn.x - 2, spawn.z - 2);
    }
  }

  update(delta, playerPos, onAttackPlayer, hud) {
    // Wave timer countdown
    this.waveTimer -= delta;
    if (this.waveTimer <= 0) {
      this.spawnWave(playerPos, hud);
      this.waveTimer = Math.random() * (CONFIG.WAVES.MAX_INTERVAL - CONFIG.WAVES.MIN_INTERVAL) + CONFIG.WAVES.MIN_INTERVAL;
    }

    // Update active enemies & remove dead bodies after delay to respawn
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) {
        if (!e.deathTimer) e.deathTimer = 15; // 15s body stays before cleanup
        e.deathTimer -= delta;
        if (e.deathTimer <= 0) {
          this.scene.remove(e.group);
          this.enemies.splice(i, 1);
          // Respawn replacement zombie around edge after delay
          setTimeout(() => {
            const rx = (Math.random() - 0.5) * 60;
            const rz = (Math.random() - 0.5) * 60;
            if (Math.hypot(rx - playerPos.x, rz - playerPos.z) > 16) {
              this.spawnEnemy('ZOMBIE', rx, rz);
            }
          }, 20000);
        }
        continue;
      }
      e.update(delta, playerPos, onAttackPlayer);
    }
  }

  findEnemyAt(raycaster) {
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const hits = raycaster.intersectObjects([e.group], true);
      if (hits.length > 0) return e;
    }
    return null;
  }

  getActiveEnemies() {
    return this.enemies.filter(e => !e.isDead);
  }
}
