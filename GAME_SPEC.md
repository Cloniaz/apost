# Apost — Game Specification

Apost is a 3D, low poly, real-time survival game in a post-apocalyptic world. War mutated the animals and the dead: zombies, mutated wolves, and mutated bears. You play a survivor who scavenges supplies, fights off waves, and completes missions for other survivors. It is NOT an open world: the map is a single bounded area, big enough to hold varied buildings and environments (ruined houses, a clinic, a gas station, a road, a forest of dead trees, a wasteland, a toxic puddle area, a survivor camp with a campfire). Goal: make the core mechanics feel as polished and satisfying as possible.

=== CAMERA AND CONTROLS (Fallout 1 / RTS style) ===
- Fixed high bird's-eye perspective camera at an angle, like the reference image. No free rotation.
- Pan with WASD, arrow keys, or moving the mouse to the screen edge. Zoom with the mouse wheel within a limited range. Camera stays inside the map bounds.
- Left-click: select a survivor. Right-click ground: move. Right-click enemy: attack. Right-click NPC or loot: interact. Disable the browser context menu on the canvas.
- Keys 1 to 4 use the quick slots (see HUD).
- Architecture must support a squad of up to 3 survivors (selection ring, "N survivors selected"). Start with 1 survivor.
- Movement uses grid-based A* pathfinding so units walk around buildings and obstacles.

=== 3D ART RULES (strict) ===
- Everything is real 3D geometry with flat shading. NO 2D sprites, NO billboards for characters or props.
- Build all models procedurally from primitives (box, cone, sphere, cylinder, octahedron, icosahedron with low detail) grouped into THREE.Group objects. No external model files needed.
- Characters: box body, sphere or low-detail head, limb boxes with simple walk animation (swing legs and arms).
- Zombies: green-gray, hunched, arms forward. Wolves: spiked back, glowing red eyes. Bears: large, brown, shoulder hump, tusk-like spikes.
- Do NOT copy the shapes in the reference image. The reference defines the UI and the camera angle only. Models should look better than the placeholders in it.
- Lighting: hemisphere light plus a directional light with soft shadows. A day/night cycle tints the lighting. Campfires and the clinic emit point lights at night.
- Performance: reuse geometries and materials, use InstancedMesh for trees, rocks and debris, cap active enemies, cull what is off screen. Target 60 FPS.

=== HUD: MUST MATCH THE REFERENCE IMAGE (highest priority) ===
Build the HUD as HTML and CSS overlaid on the canvas, not as 3D objects. The final screen should look like the reference image. Details:
- Palette: panel background #1c1b18, slot and portrait background #2c2a25, bar track #3a3832, text #e8e4d8. Sentence case labels, clean sans-serif font, 4px rounded corners, flat design, no gradients or glows.
- Top-left: dark rounded banner with an amber diamond icon (#f0a020) and the current mission text, e.g. "Mission: find fuel for the clinic". Shows "No active mission" when there is none.
- Top-right: dark rounded pill with the in-game day and clock, e.g. "Day 12, 18:40".
- Bottom: a full-width dark panel across the screen, about 18% of the screen height, in this left-to-right layout:
  1. Square portrait of the selected survivor.
  2. A 2x2 grid of stat bars, label above each bar: top row Hunger (orange #d98a3a) and Thirst (blue #4a9fd8); bottom row Health (red #c94a3f) and Stamina (yellow #d4c04a). Only these four stats exist. Bars animate smoothly.
  3. Four square quick slots in a row with item icons and count badges, mapped to keys 1 to 4: canned food, water bottle, bandage, stimulant. Below them the text "N survivors selected".
  4. Right side: a minimap in a dark rounded box. Draws the map outline, the player in green, enemies in red (only within detection range), and objective or NPC markers in amber.
- Show a small pulsing red edge warning when health is below 25%. The HUD must scale correctly from 1280x720 to 1920x1080 and must never block the playfield beyond the bottom panel and the two top boxes.
- If the reference image and this text disagree, follow the image.

=== SURVIVAL MECHANICS ===
Stats range 0 to 100, all tunable in config.js.
- Hunger drains from 100 to 0 in about 20 real minutes. Thirst in about 14 minutes.
- Stamina drains while sprinting (hold Shift) and regenerates when walking or standing. At 0 the survivor can only walk and swings slower.
- Health drops when hunger or thirst is 0, drops from enemy damage, and slowly regenerates when hunger and thirst are both above 50.
- At 0 health: death screen with "Survive again" and restart.
- Quick slot items: canned food (+hunger), water bottle (+thirst), bandage (+health), stimulant (+stamina).

=== COMBAT AND WAVES ===
- Simple, readable melee combat: the survivor has a weapon (starts with a bat), attack range, cooldown and damage. Show hit flashes, damage numbers and small knockback.
- Enemies: zombies (slow, many, groups), mutated wolves (fast, low health, packs), mutated bears (slow, very tough, heavy hit, rare). Each has idle, chase, attack and death states.
- Random waves: a randomized timer (about 90 to 180 seconds) triggers a wave from random map-edge spawn points away from the player. Wave size and mix grow with the day count. Night is more dangerous. Show a short "Wave incoming" text notification.

=== NPCS AND MISSIONS ===
- At least 3 distinct NPC survivors in the world (a camp, the clinic, etc.), each with an amber diamond marker above their head and a short dialogue box when interacted with.
- Each NPC gives a randomly assigned mission: fetch an item from a certain building, kill N enemies of a type, deliver supplies, or scavenge a number of items. The active mission shows in the top-left banner with progress.
- Completing a mission gives supplies (the NPC rewards randomly from food, water, bandages, stimulants, and scrap).
- Missions reset after a few minutes (configurable): if completed or expired, the NPC offers a new random mission.

=== LOOT ===
- Loot sources: buildings and containers (crates, lockers, cars), items scattered around the map, and drops from killed enemies.
- Loot respawns after several minutes, only when the player is far away. Looted containers visibly change (open lid, empty).
- A small floating item name appears on hover, and loot is picked up by right-clicking it.

=== SAVE ===
Autosave to localStorage (stats, position, items, mission progress, day and time). Offer "Continue" on load.

=== PHASES ===
Phase 1: Scene, bird's-eye camera, pan and zoom, bounded map with terrain and a road, one survivor made of primitives, right-click move with A* pathfinding, and the full HUD layout (all UI visible and matching the reference image, stats draining live, bars working).
Phase 2: Buildings, obstacles, environment variety (trees, rocks, toxic puddle, camp), day/night cycle and the game clock.
Phase 3: Loot containers, items, inventory quick slots, using items.
Phase 4: Zombies with AI and combat, hit feedback, death screen.
Phase 5: Mutated wolves and bears, random wave system.
Phase 6: NPCs, dialogue, missions, rewards, reset timers, loot respawn.
Phase 7: Minimap, sound hooks, polish, performance pass, save and load.
