import * as THREE from 'three';
import { CONFIG } from './config.js';
import { World } from './world.js';
import { CameraController } from './camera.js';
import { PathfindingGrid } from './pathfinding.js';
import { BuildingsManager } from './buildings.js';
import { NatureManager } from './nature.js';
import { DayNightCycle } from './environment.js';
import { Survivor } from './units.js';
import { HUD } from './hud.js';
import { LootManager } from './loot.js';
import { EnemiesManager } from './enemies.js';
import { NPCsManager } from './missions.js';
import { SoundManager } from './sound.js';
import { SaveSystem } from './save.js';
import { InteriorsManager } from './interiors.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.initScene();
    this.initLighting();

    this.grid = new PathfindingGrid(CONFIG.GRID_SIZE, CONFIG.GRID_CELL_SIZE);
    this.dayNightCycle = new DayNightCycle(this.scene, this.dirLight, this.hemiLight);
    this.world = new World(this.scene);
    this.buildingsManager = new BuildingsManager(this.scene, this.grid, this.dayNightCycle);
    this.natureManager = new NatureManager(this.scene, this.grid);

    this.cameraController = new CameraController(this.camera, this.canvas);
    this.survivor = new Survivor(this.scene, this.grid, 0, 0);
    this.hud = new HUD();
    this.sound = new SoundManager();

    // Interiors Manager (Clinic & Gas Station Interiors far away GTA SA style)
    this.interiorsManager = new InteriorsManager(this.scene, this.grid, this.dayNightCycle);

    this.lootManager = new LootManager(this.scene, this.grid);
    this.enemiesManager = new EnemiesManager(this.scene, this.grid);
    this.npcsManager = new NPCsManager(this.scene, this.grid);

    // Global drop loot callback for enemy deaths
    window.__dropLootAt = (x, z, type) => {
      this.lootManager.spawnGroundItem(x, z, type, CONFIG.ITEMS[type]?.name || 'Supplies');
      this.hud.showNotification(`✨ Enemy dropped ${CONFIG.ITEMS[type]?.name || 'Supplies'}!`);
    };

    this.isShiftDown = false;
    this.isGameOver = false;
    this.autoSaveTimer = 10;
    this.clock = new THREE.Clock();

    // Check saved progress
    this.checkLoadPrompt();

    this.initInteraction();
    this.initQuickSlotsInput();
    this.initResize();
    this.setupTestHooks();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  checkLoadPrompt() {
    if (SaveSystem.hasSave()) {
      const data = SaveSystem.load();
      if (data) {
        // Show non-intrusive Continue prompt on start
        const banner = document.createElement('div');
        banner.className = 'continue-banner';
        banner.innerHTML = `
          <span>Saved game found (Day ${data.time?.day || 12}).</span>
          <button id="btn-continue" class="continue-btn">Continue</button>
          <button id="btn-dismiss" class="dismiss-btn">New Run</button>
        `;
        document.body.appendChild(banner);
        document.getElementById('btn-continue').onclick = () => {
          SaveSystem.applySave(this, data);
          banner.remove();
          this.hud.showNotification('📁 Game state loaded!');
          this.sound.playNotification();
        };
        document.getElementById('btn-dismiss').onclick = () => {
          banner.remove();
        };
      }
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1916);
    this.scene.fog = new THREE.FogExp2(0x28261e, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA.NEAR,
      CONFIG.CAMERA.FAR
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  initLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xdde3c8, 0x3d382b, 1.1);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae0, 1.4);
    this.dirLight.position.set(30, 50, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 130;
    const d = 48;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
  }

  initQuickSlotsInput() {
    window.addEventListener('keydown', (e) => {
      if (this.isGameOver) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        this.consumeItem(e.key);
      }
    });

    const slots = document.querySelectorAll('.quick-slot');
    slots.forEach((el) => {
      el.addEventListener('click', () => {
        if (this.isGameOver) return;
        const key = el.getAttribute('data-key');
        if (key) this.consumeItem(key);
      });
    });
  }

  consumeItem(slotKey) {
    const res = this.survivor.useItem(slotKey);
    if (res && res.success) {
      this.sound.playConsume();
      this.hud.updateInventory(this.survivor.inventory);
      this.hud.showNotification(`${res.icon} Consumed ${res.item}`);
    } else {
      this.hud.showNotification('❌ Out of supplies!');
    }
  }

  initInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('contextmenu', (e) => {
      if (e.target.id === 'game-canvas' || e.target.closest('#hud')) {
        e.preventDefault();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.isShiftDown = true;
      if (e.code === 'KeyF') {
        const state = this.survivor.toggleFlashlight();
        this.hud.showNotification(state ? '🔦 Flashlight ON' : '🔦 Flashlight OFF');
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftDown = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.isGameOver) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);

      // Primary Action (Left-Click [e.button === 0] or Right-Click [e.button === 2])
      // Now Left-Click handles all interactions (Attack, Loot, Talk, Move, Select)
      if (e.button === 0 || e.button === 2) {
        // 0. Doorways -> Enter / Exit Building Interior
        const targetDoor = this.interiorsManager.findDoorAt(raycaster);
        if (targetDoor) {
          const dist = this.survivor.getPosition().distanceTo(targetDoor.position);
          if (dist <= targetDoor.radius + 1.2) {
            this.sound.playNotification();
            this.interiorsManager.teleportSurvivor(targetDoor, this.survivor, this.cameraController, this.hud);
          } else {
            this.survivor.moveTo(targetDoor.position.x, targetDoor.position.z);
            this.hud.showClickIndicator(e.clientX, e.clientY);
          }
          return;
        }

        // 1. Enemy -> Attack
        const targetEnemy = this.enemiesManager.findEnemyAt(raycaster);
        if (targetEnemy) {
          const dist = this.survivor.getPosition().distanceTo(targetEnemy.getPosition());
          if (dist <= CONFIG.COMBAT.PLAYER_ATTACK_RANGE + 0.8) {
            const combatRes = this.survivor.attackTarget(targetEnemy);
            if (combatRes) {
              this.sound.playHit();
              this.hud.showFloatingDamage(e.clientX, e.clientY, combatRes.damage, false);
              if (combatRes.isDead) {
                this.hud.showNotification(`💀 ${targetEnemy.cfg.NAME} eliminated!`);
                this.npcsManager.notifyEnemyKilled(targetEnemy.type, this.hud);
              }
            }
          } else {
            const ep = targetEnemy.getPosition();
            this.survivor.moveTo(ep.x, ep.z);
            this.hud.showClickIndicator(e.clientX, e.clientY);
          }
          return;
        }

        // 2. NPC -> Dialogue / Mission
        const targetNPC = this.npcsManager.findNPCAt(raycaster);
        if (targetNPC) {
          const dist = this.survivor.getPosition().distanceTo(targetNPC.position);
          if (dist <= targetNPC.radius + 1.2) {
            this.sound.playNotification();
            this.npcsManager.interactWithNPC(targetNPC, this.survivor, this.hud);
          } else {
            this.survivor.moveTo(targetNPC.position.x, targetNPC.position.z);
            this.hud.showClickIndicator(e.clientX, e.clientY);
          }
          return;
        }

        // 3. Loot Container or Ground Pickup
        const targetLoot = this.lootManager.findInteractableAt(raycaster);
        if (targetLoot) {
          const dist = this.survivor.getPosition().distanceTo(targetLoot.position);
          if (dist <= targetLoot.radius + 1.2) {
            const didLoot = this.lootManager.interactWithLoot(targetLoot, this.survivor, this.hud);
            if (didLoot) this.sound.playLoot();
          } else {
            this.survivor.moveTo(targetLoot.position.x, targetLoot.position.z);
            this.hud.showClickIndicator(e.clientX, e.clientY);
          }
          return;
        }

        // 4. Survivor selection
        const hitsSurvivor = raycaster.intersectObjects([this.survivor.group], true);
        if (hitsSurvivor.length > 0) {
          this.survivor.setSelected(true);
          return;
        }

        // 5. Ground -> Move
        const hits = raycaster.intersectObject(this.world.groundMesh);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const max = (CONFIG.MAP_SIZE / 2) - 1.5;
          const targetX = Math.max(-max, Math.min(max, pt.x));
          const targetZ = Math.max(-max, Math.min(max, pt.z));

          this.survivor.moveTo(targetX, targetZ);
          this.hud.showClickIndicator(e.clientX, e.clientY);
        }
      }
    });
  }

  handlePlayerDeath() {
    this.isGameOver = true;
    this.hud.showDeathScreen(() => {
      this.survivor.stats.health = CONFIG.SURVIVOR.MAX_HEALTH;
      this.survivor.stats.stamina = CONFIG.SURVIVOR.MAX_STAMINA;
      this.survivor.stats.hunger = CONFIG.SURVIVOR.MAX_HUNGER;
      this.survivor.stats.thirst = CONFIG.SURVIVOR.MAX_THIRST;
      this.survivor.inventory = { ...CONFIG.INITIAL_INVENTORY };
      this.survivor.group.position.set(0, 0, 0);
      this.survivor.path = [];
      this.survivor.isWalking = false;
      this.hud.updateInventory(this.survivor.inventory);
      
      // Reset and respawn all enemies to initial locations
      this.enemiesManager.resetAllEnemies();

      this.isGameOver = false;
      SaveSystem.save(this);
      this.hud.showNotification('✨ Respawned! Enemies reset.');
    });
  }

  initResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupTestHooks() {
    window.render_game_to_text = () => {
      const pos = this.survivor.getPosition();
      return JSON.stringify({
        phase: 7,
        survivor: {
          x: +pos.x.toFixed(2),
          z: +pos.z.toFixed(2),
          stats: {
            hunger: +this.survivor.stats.hunger.toFixed(1),
            thirst: +this.survivor.stats.thirst.toFixed(1),
            health: +this.survivor.stats.health.toFixed(1),
            stamina: +this.survivor.stats.stamina.toFixed(1),
          },
          inventory: this.survivor.inventory
        },
        enemiesCount: this.enemiesManager.getActiveEnemies().length,
        activeMission: this.npcsManager.activeMission ? this.npcsManager.activeMission.title : 'None',
        time: this.dayNightCycle.getTimeFormatted()
      });
    };

    window.advanceTime = (ms) => {
      const delta = ms / 1000;
      this.update(delta);
      this.renderer.render(this.scene, this.camera);
    };
  }

  update(delta) {
    if (this.isGameOver) return;

    this.dayNightCycle.update(delta);
    this.cameraController.update(delta);
    this.survivor.update(delta, this.isShiftDown);

    const playerPos = this.survivor.getPosition();

    // Auto-save every 15 seconds
    this.autoSaveTimer -= delta;
    if (this.autoSaveTimer <= 0) {
      SaveSystem.save(this);
      this.autoSaveTimer = 15;
    }

    if (this.survivor.stats.health <= 0) {
      this.handlePlayerDeath();
      return;
    }

    // Enemies
    this.enemiesManager.update(delta, playerPos, (dmg) => {
      const isDead = this.survivor.takeDamage(dmg);
      this.sound.playHit();
      this.hud.showFloatingDamage(window.innerWidth / 2, window.innerHeight / 2 - 30, dmg, true);
      if (isDead) {
        this.handlePlayerDeath();
      }
    }, this.hud);

    // Loot & NPCs
    this.lootManager.update(delta, playerPos);
    this.npcsManager.update(delta);

    // HUD & Minimap
    this.hud.update(
      delta,
      this.survivor,
      this.dayNightCycle,
      this.enemiesManager.getActiveEnemies(),
      this.npcsManager.npcs
    );
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(0.1, this.clock.getDelta());
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
