import * as THREE from 'three';
import { CONFIG } from './config.js';

export class DayNightCycle {
  constructor(scene, dirLight, hemiLight) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.hemiLight = hemiLight;

    // Time state
    this.day = CONFIG.TIME.START_DAY;
    this.hour = CONFIG.TIME.START_HOUR;
    this.minute = CONFIG.TIME.START_MINUTE;
    this.timeAccumulator = 0;

    // Night point lights (campfires, clinic lantern)
    this.nightLights = [];

    // Pre-allocated reusable colors to avoid GC pressure
    this.fogColor = new THREE.Color();
    this.skyColor = new THREE.Color();
    this.groundColor = new THREE.Color();
    this.sunColor = new THREE.Color();
  }

  addNightLight(pointLight) {
    this.nightLights.push(pointLight);
  }

  update(delta) {
    this.timeAccumulator += delta;
    if (this.timeAccumulator >= CONFIG.TIME.SECONDS_PER_GAME_MINUTE) {
      this.timeAccumulator -= CONFIG.TIME.SECONDS_PER_GAME_MINUTE;
      this.minute++;
      if (this.minute >= 60) {
        this.minute = 0;
        this.hour++;
        if (this.hour >= 24) {
          this.hour = 0;
          this.day++;
        }
      }
    }

    // Time of day as a float 0.0 to 24.0
    const timeOfDay = this.hour + this.minute / 60;
    this.applyLighting(timeOfDay);
  }

  applyLighting(t) {
    // Determine sun angle and lighting palette based on hour of the day
    // Sunrise: 5:00 - 7:00
    // Noon: 12:00
    // Sunset: 17:30 - 19:30
    // Night: 20:00 - 4:30
    let sunIntensity = 0;
    let hemiSkyHex = 0xffffff;
    let hemiGroundHex = 0x444444;
    let sunColorHex = 0xfffae0;
    let bgColorHex = 0x1a1916;
    let fogDensity = 0.012;
    let nightLightsIntensity = 0;

    if (t >= 6 && t < 17) {
      // Full Daytime
      const middayFactor = Math.sin(((t - 6) / 11) * Math.PI);
      sunIntensity = 1.0 + middayFactor * 0.5;
      hemiSkyHex = 0xe2e6ce;
      hemiGroundHex = 0x423d2f;
      sunColorHex = 0xfff9e6;
      bgColorHex = 0x24221a;
      fogDensity = 0.010;
      nightLightsIntensity = 0.1;
    } else if (t >= 17 && t < 20) {
      // Golden Hour & Sunset (e.g. 18:40 default start)
      const f = (t - 17) / 3;
      sunIntensity = THREE.MathUtils.lerp(1.1, 0.25, f);
      hemiSkyHex = 0xd88a50; // Amber / reddish sunset tint
      hemiGroundHex = 0x33261a;
      sunColorHex = 0xf59a42;
      bgColorHex = 0x1d1712;
      fogDensity = 0.013;
      nightLightsIntensity = f * 1.5;
    } else if (t >= 20 || t < 5) {
      // Midnight & Deep Night
      sunIntensity = 0.08;
      hemiSkyHex = 0x1a2638; // Cold post-apocalyptic blue moonlit night
      hemiGroundHex = 0x0c0e14;
      sunColorHex = 0x4d6b94;
      bgColorHex = 0x0a0c10;
      fogDensity = 0.016;
      nightLightsIntensity = 2.0;
    } else {
      // Sunrise (5:00 - 6:00)
      const f = (t - 5);
      sunIntensity = THREE.MathUtils.lerp(0.08, 1.0, f);
      hemiSkyHex = 0xb07d62;
      hemiGroundHex = 0x241d18;
      sunColorHex = 0xffc48c;
      bgColorHex = 0x181714;
      fogDensity = 0.014;
      nightLightsIntensity = (1 - f) * 1.5;
    }

    // Directional light arc (orbit across map sky)
    const sunAngle = ((t - 6) / 24) * Math.PI * 2;
    this.dirLight.position.x = Math.cos(sunAngle) * 50;
    this.dirLight.position.y = Math.max(10, Math.sin(sunAngle) * 50);
    this.dirLight.position.z = 25;

    this.dirLight.intensity = sunIntensity;
    this.dirLight.color.setHex(sunColorHex);

    this.hemiLight.color.setHex(hemiSkyHex);
    this.hemiLight.groundColor.setHex(hemiGroundHex);

    this.scene.background.setHex(bgColorHex);
    if (this.scene.fog) {
      this.scene.fog.color.setHex(bgColorHex);
      this.scene.fog.density = fogDensity;
    }

    // Toggle point lights for campfires & clinic
    for (let i = 0; i < this.nightLights.length; i++) {
      this.nightLights[i].intensity = nightLightsIntensity;
    }
  }

  getTimeFormatted() {
    const hh = String(this.hour).padStart(2, '0');
    const mm = String(this.minute).padStart(2, '0');
    return `Day ${this.day}, ${hh}:${mm}`;
  }
}
