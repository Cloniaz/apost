// LocalStorage Auto-Save & Continue System for Apost
const SAVE_KEY = 'apost_saved_game_v1';

export class SaveSystem {
  static save(game) {
    try {
      const data = {
        stats: game.survivor.stats,
        inventory: game.survivor.inventory,
        position: {
          x: game.survivor.group.position.x,
          z: game.survivor.group.position.z,
        },
        time: {
          day: game.dayNightCycle.day,
          hour: game.dayNightCycle.hour,
          minute: game.dayNightCycle.minute,
        },
        activeMission: game.npcsManager.activeMission,
        savedAt: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Could not save game:', e);
      return false;
    }
  }

  static hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  static applySave(game, data) {
    if (!data) return false;
    if (data.stats) game.survivor.stats = { ...data.stats };
    if (data.inventory) {
      game.survivor.inventory = { ...data.inventory };
      game.hud.updateInventory(game.survivor.inventory);
    }
    if (data.position) {
      game.survivor.group.position.set(data.position.x, 0, data.position.z);
      game.cameraController.setFocus(data.position.x, data.position.z);
    }
    if (data.time) {
      game.dayNightCycle.day = data.time.day;
      game.dayNightCycle.hour = data.time.hour;
      game.dayNightCycle.minute = data.time.minute;
    }
    if (data.activeMission) {
      game.npcsManager.activeMission = data.activeMission;
      game.hud.setMissionText(`Mission: ${data.activeMission.title} (${data.activeMission.currentCount}/${data.activeMission.requiredCount})`);
    }
    return true;
  }
}
