import { CONFIG } from './config.js';

export class HUD {
  constructor() {
    this.container = document.getElementById('hud');
    this.createElements();

    // Time tracking
    this.day = CONFIG.TIME.START_DAY;
    this.hour = CONFIG.TIME.START_HOUR;
    this.minute = CONFIG.TIME.START_MINUTE;
    this.timeAccumulator = 0;

    // Inventory copy for slot counts
    this.inventory = { ...CONFIG.INITIAL_INVENTORY };

    this.renderPortrait();
  }

  createElements() {
    this.container.innerHTML = `
      <div id="low-health-warning" class="low-health-warning"></div>

      <!-- TOP BAR -->
      <div class="hud-top-bar">
        <!-- Top-Left Mission Banner -->
        <div class="hud-mission-banner">
          <div class="mission-diamond"></div>
          <span id="mission-text" class="mission-text">Mission: find fuel for the clinic</span>
        </div>

        <!-- Top-Right Day/Clock Pill -->
        <div id="time-display" class="hud-time-pill">
          Day 12, 18:40
        </div>
      </div>

      <!-- BOTTOM FULL-WIDTH PANEL (~18% height) -->
      <div class="hud-bottom-panel">
        <!-- Survivor Info & 2x2 Stats -->
        <div class="hud-survivor-section">
          <div class="hud-portrait-container">
            <canvas id="portrait-canvas" width="78" height="78" class="hud-portrait-canvas"></canvas>
          </div>

          <div class="hud-stats-grid">
            <!-- Row 1: Hunger (Orange) & Thirst (Blue) -->
            <div class="stat-item">
              <div class="stat-header">
                <span>Hunger</span>
                <span id="hunger-val">100%</span>
              </div>
              <div class="stat-track">
                <div id="hunger-fill" class="stat-fill hunger" style="width: 100%;"></div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-header">
                <span>Thirst</span>
                <span id="thirst-val">100%</span>
              </div>
              <div class="stat-track">
                <div id="thirst-fill" class="stat-fill thirst" style="width: 100%;"></div>
              </div>
            </div>

            <!-- Row 2: Health (Red) & Stamina (Yellow) -->
            <div class="stat-item">
              <div class="stat-header">
                <span>Health</span>
                <span id="health-val">100%</span>
              </div>
              <div class="stat-track">
                <div id="health-fill" class="stat-fill health" style="width: 100%;"></div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-header">
                <span>Stamina</span>
                <span id="stamina-val">100%</span>
              </div>
              <div class="stat-track">
                <div id="stamina-fill" class="stat-fill stamina" style="width: 100%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Center: 4 Quick Slots & Squad text -->
        <div class="hud-inventory-section">
          <div class="quick-slots-container">
            <div class="quick-slot" data-key="1" title="[1] Canned Food (+Hunger)">
              <span class="slot-key">1</span>
              <span class="slot-icon">🥫</span>
              <span id="slot-count-1" class="slot-count">3</span>
            </div>
            <div class="quick-slot" data-key="2" title="[2] Water Bottle (+Thirst)">
              <span class="slot-key">2</span>
              <span class="slot-icon">💧</span>
              <span id="slot-count-2" class="slot-count">2</span>
            </div>
            <div class="quick-slot" data-key="3" title="[3] Bandage (+Health)">
              <span class="slot-key">3</span>
              <span class="slot-icon">🩹</span>
              <span id="slot-count-3" class="slot-count">1</span>
            </div>
            <div class="quick-slot" data-key="4" title="[4] Stimulant (+Stamina)">
              <span class="slot-key">4</span>
              <span class="slot-icon">💉</span>
              <span id="slot-count-4" class="slot-count">1</span>
            </div>
          </div>
          <div id="squad-info" class="selection-info-text">1 survivor selected</div>
        </div>

        <!-- Right: Minimap -->
        <div class="hud-minimap-container">
          <canvas id="minimap-canvas" width="120" height="84"></canvas>
        </div>
      </div>
    `;

    // Cache elements for high performance 60FPS updates
    this.dangerWarning = document.getElementById('low-health-warning');
    this.timeDisplay = document.getElementById('time-display');
    this.hungerVal = document.getElementById('hunger-val');
    this.hungerFill = document.getElementById('hunger-fill');
    this.thirstVal = document.getElementById('thirst-val');
    this.thirstFill = document.getElementById('thirst-fill');
    this.healthVal = document.getElementById('health-val');
    this.healthFill = document.getElementById('health-fill');
    this.staminaVal = document.getElementById('stamina-val');
    this.staminaFill = document.getElementById('stamina-fill');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');
  }

  updateInventory(inventory) {
    const s1 = document.getElementById('slot-count-1');
    const s2 = document.getElementById('slot-count-2');
    const s3 = document.getElementById('slot-count-3');
    const s4 = document.getElementById('slot-count-4');
    if (s1) s1.textContent = inventory.cannedFood ?? 0;
    if (s2) s2.textContent = inventory.waterBottle ?? 0;
    if (s3) s3.textContent = inventory.bandage ?? 0;
    if (s4) s4.textContent = inventory.stimulant ?? 0;
  }

  showNotification(msg) {
    let notif = document.getElementById('hud-notification');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'hud-notification';
      notif.className = 'hud-notification';
      document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.classList.add('visible');
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      notif.classList.remove('visible');
    }, 1500);
  }

  showFloatingDamage(screenX, screenY, damage, isPlayer = false) {
    const el = document.createElement('div');
    el.className = `floating-damage ${isPlayer ? 'player' : 'enemy'}`;
    el.textContent = `-${damage}`;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  showDeathScreen(onRestart) {
    let overlay = document.getElementById('death-screen');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'death-screen';
      overlay.className = 'death-screen-overlay';
      overlay.innerHTML = `
        <div class="death-dialog">
          <div class="death-title">YOU PERISHED</div>
          <p class="death-desc">The wasteland claimed another soul.</p>
          <button id="btn-restart" class="restart-btn">Survive Again</button>
        </div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('btn-restart').onclick = () => {
        overlay.remove();
        if (onRestart) onRestart();
      };
    }
  }

  setMissionText(text) {
    const el = document.getElementById('mission-text');
    if (el) el.textContent = text;
  }

  showDialogue(speaker, text) {
    let box = document.getElementById('dialogue-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dialogue-box';
      box.className = 'hud-dialogue-box';
      document.body.appendChild(box);
    }
    box.innerHTML = `
      <div class="dialogue-speaker">${speaker}</div>
      <div class="dialogue-content">${text}</div>
      <button class="dialogue-close-btn" onclick="this.parentElement.remove()">Dismiss</button>
    `;
    box.style.display = 'block';
  }

  renderPortrait() {
    const canvas = document.getElementById('portrait-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Draw stylized low-poly survivor portrait
    ctx.fillStyle = '#2c2a25';
    ctx.fillRect(0, 0, 78, 78);

    // Vignette background
    const grad = ctx.createRadialGradient(39, 39, 10, 39, 39, 45);
    grad.addColorStop(0, '#3a3730');
    grad.addColorStop(1, '#1e1c18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 78, 78);

    // Torso / Jacket
    ctx.fillStyle = '#3b5066';
    ctx.beginPath();
    ctx.moveTo(18, 78);
    ctx.lineTo(24, 52);
    ctx.lineTo(54, 52);
    ctx.lineTo(60, 78);
    ctx.closePath();
    ctx.fill();

    // Collar / neck
    ctx.fillStyle = '#dfb48c';
    ctx.fillRect(34, 46, 10, 10);

    // Head
    ctx.fillStyle = '#dfb48c';
    ctx.beginPath();
    ctx.arc(39, 36, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Cap
    ctx.fillStyle = '#28231d';
    ctx.beginPath();
    ctx.arc(39, 32, 14, Math.PI, 0);
    ctx.fill();

    // Eyes (simple stylized dots)
    ctx.fillStyle = '#1c1b18';
    ctx.fillRect(33, 34, 3, 3);
    ctx.fillRect(42, 34, 3, 3);
  }

  update(delta, survivor, dayNightCycle, enemies, npcs) {
    if (!survivor) return;

    // 1. Sync clock from DayNightCycle
    if (dayNightCycle) {
      this.timeDisplay.textContent = dayNightCycle.getTimeFormatted();
    }

    // 2. Update Stats
    const stats = survivor.stats;
    const hg = Math.round(stats.hunger);
    const th = Math.round(stats.thirst);
    const hp = Math.round(stats.health);
    const st = Math.round(stats.stamina);

    this.hungerVal.textContent = `${hg}%`;
    this.hungerFill.style.width = `${hg}%`;

    this.thirstVal.textContent = `${th}%`;
    this.thirstFill.style.width = `${th}%`;

    this.healthVal.textContent = `${hp}%`;
    this.healthFill.style.width = `${hp}%`;

    this.staminaVal.textContent = `${st}%`;
    this.staminaFill.style.width = `${st}%`;

    // 3. Low Health Warning (<25%)
    if (hp <= 25) {
      this.dangerWarning.classList.add('active');
    } else {
      this.dangerWarning.classList.remove('active');
    }

    // 4. Update Minimap
    this.drawMinimap(survivor, enemies, npcs);
  }

  drawMinimap(survivor, enemies, npcs) {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.fillStyle = '#1c1b18';
    ctx.fillRect(0, 0, w, h);

    // Map terrain bounds
    ctx.strokeStyle = '#3a3832';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Road indicator
    const roadY = h / 2;
    ctx.strokeStyle = '#36342e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(4, roadY);
    ctx.lineTo(w - 4, roadY);
    ctx.stroke();

    const mapSize = CONFIG.MAP_SIZE;
    const pos = survivor.getPosition();

    // Draw NPCs (Amber dots)
    if (npcs) {
      ctx.fillStyle = '#f0a020';
      for (const n of npcs) {
        const nx = ((n.position.x + mapSize / 2) / mapSize) * (w - 12) + 6;
        const ny = ((n.position.z + mapSize / 2) / mapSize) * (h - 12) + 6;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Enemies within detection range (Red dots)
    if (enemies) {
      ctx.fillStyle = '#c94a3f';
      for (const e of enemies) {
        if (e.isDead) continue;
        const epos = e.getPosition();
        if (epos.distanceTo(pos) <= 24) {
          const ex = ((epos.x + mapSize / 2) / mapSize) * (w - 12) + 6;
          const ey = ((epos.z + mapSize / 2) / mapSize) * (h - 12) + 6;
          ctx.beginPath();
          ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Survivor (green dot)
    const mx = ((pos.x + mapSize / 2) / mapSize) * (w - 12) + 6;
    const my = ((pos.z + mapSize / 2) / mapSize) * (h - 12) + 6;
    ctx.fillStyle = '#5cd65c';
    ctx.beginPath();
    ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  showClickIndicator(screenX, screenY) {
    const el = document.createElement('div');
    el.className = 'click-indicator';
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 400);
  }
}
