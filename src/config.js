// Apost Game Configuration & Balance Parameters
export const CONFIG = {
  // Map dimensions (world units)
  MAP_SIZE: 80,
  GRID_SIZE: 80, // 80x80 navigation grid (1 unit per cell)
  GRID_CELL_SIZE: 1.0,

  // Camera settings (Fallout 1 / RTS fixed high bird's-eye angle)
  CAMERA: {
    FOV: 35,
    NEAR: 0.1,
    FAR: 300,
    OFFSET_X: 22,
    OFFSET_Y: 28,
    OFFSET_Z: 22,
    PAN_SPEED: 26,
    EDGE_PAN_THRESHOLD: 24, // px from screen border
    MIN_ZOOM: 0.6,
    MAX_ZOOM: 1.6,
    ZOOM_SPEED: 0.0015,
  },

  // Survivor settings
  SURVIVOR: {
    WALK_SPEED: 3.4,
    SPRINT_SPEED: 6.4,
    MAX_HEALTH: 100,
    MAX_STAMINA: 100,
    MAX_HUNGER: 100,
    MAX_THIRST: 100,

    // Drain rates (units per second)
    HUNGER_DRAIN_PER_SEC: 100 / 1200,
    THIRST_DRAIN_PER_SEC: 100 / 840,
    // Stamina sprint drain reduced significantly (from 25 to 11 per sec)
    STAMINA_SPRINT_DRAIN_PER_SEC: 11.0,
    STAMINA_REGEN_PER_SEC: 22.0,
    // Health decay when hunger/thirst is 0
    STARVATION_DAMAGE_PER_SEC: 2.5,
    // Health regen when hunger and thirst both > 50
    HEALTH_REGEN_PER_SEC: 1.0,
  },

  // Day / Night cycle (for clock display)
  TIME: {
    START_DAY: 12,
    START_HOUR: 18,
    START_MINUTE: 40,
    // 2x faster time: 1 in-game minute = 0.5 real seconds (1 day = 1440 mins * 0.5s = 720s = 12 minutes)
    SECONDS_PER_GAME_MINUTE: 0.5,
  },

  // Initial quick slot quantities
  INITIAL_INVENTORY: {
    cannedFood: 3,
    waterBottle: 2,
    bandage: 1,
    stimulant: 1,
  },

  // Item restoration amounts
  ITEMS: {
    cannedFood: { name: 'Canned Food', icon: '🥫', slot: 1, hungerRestore: 35, thirstRestore: 5 },
    waterBottle: { name: 'Water Bottle', icon: '💧', slot: 2, thirstRestore: 45, hungerRestore: 0 },
    bandage: { name: 'Bandage', icon: '🩹', slot: 3, healthRestore: 30, staminaRestore: 0 },
    stimulant: { name: 'Stimulant', icon: '💉', slot: 4, staminaRestore: 70, healthRestore: 5 },
  },

  // Combat parameters
  COMBAT: {
    PLAYER_ATTACK_RANGE: 2.8, // Increased from 1.8 to 2.8 so player outranges all enemies!
    PLAYER_ATTACK_DAMAGE: 32,
    PLAYER_ATTACK_COOLDOWN: 0.55, // seconds
    HIT_FLASH_DURATION: 0.12,
    KNOCKBACK_FORCE: 2.8,
  },

  // Enemies parameters (2.0s attack delay across all enemy types)
  ENEMIES: {
    ZOMBIE: {
      NAME: 'Zombie',
      HEALTH: 50,
      DAMAGE: 10,
      SPEED: 1.25, // Slow shambling
      ATTACK_RANGE: 1.4, // Player range (2.8) easily outranges zombie (1.4)
      ATTACK_COOLDOWN: 2.0, // 2 second delay between attacks
      DETECT_RANGE: 15,
    },
    MUTATED_WOLF: {
      NAME: 'Mutated Wolf',
      HEALTH: 40,
      DAMAGE: 14,
      SPEED: 5.0,
      ATTACK_RANGE: 1.5, // Outranged by player
      ATTACK_COOLDOWN: 2.0, // 2 second delay between attacks
      DETECT_RANGE: 20,
    },
    MUTATED_BEAR: {
      NAME: 'Mutated Bear',
      HEALTH: 160,
      DAMAGE: 28,
      SPEED: 2.4,
      ATTACK_RANGE: 1.9, // Outranged by player
      ATTACK_COOLDOWN: 2.0, // 2 second delay between attacks
      DETECT_RANGE: 18,
    }
  },

  // Waves settings
  WAVES: {
    MIN_INTERVAL: 90, // seconds
    MAX_INTERVAL: 160,
  },

  // Missions settings
  MISSIONS: {
    RESET_TIME: 180, // seconds
  },

  // Colors
  COLORS: {
    GROUND: 0x615e45,
    GROUND_DARK: 0x474532,
    ROAD: 0x36342e,
    ROAD_LINE: 0x6e6b5a,
    SELECTION_RING: 0x5cd65c,
  }
};
