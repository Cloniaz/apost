// Grid and A* Pathfinding for Apost
export class PathfindingGrid {
  constructor(size, cellSize) {
    this.size = size;
    this.cellSize = cellSize;
    this.halfSize = size / 2;
    // 0 = walkable, 1 = obstacle
    this.grid = new Uint8Array(size * size);
  }

  worldToGrid(x, z) {
    const gx = Math.floor((x + this.halfSize) / this.cellSize);
    const gz = Math.floor((z + this.halfSize) / this.cellSize);
    return {
      x: Math.max(0, Math.min(this.size - 1, gx)),
      z: Math.max(0, Math.min(this.size - 1, gz))
    };
  }

  gridToWorld(gx, gz) {
    return {
      x: (gx + 0.5) * this.cellSize - this.halfSize,
      z: (gz + 0.5) * this.cellSize - this.halfSize
    };
  }

  isWalkable(gx, gz) {
    if (gx < 0 || gx >= this.size || gz < 0 || gz >= this.size) return false;
    return this.grid[gz * this.size + gx] === 0;
  }

  setObstacle(gx, gz, isObstacle = true) {
    if (gx >= 0 && gx < this.size && gz >= 0 && gz < this.size) {
      this.grid[gz * this.size + gx] = isObstacle ? 1 : 0;
    }
  }

  // A* pathfinding algorithm with 8-directional movement
  findPath(startWorldX, startWorldZ, targetWorldX, targetWorldZ) {
    // If inside interior area (x > 100 or z > 100), allow direct open movement
    if (Math.abs(startWorldX) > 100 || Math.abs(startWorldZ) > 100) {
      return [{ x: targetWorldX, z: targetWorldZ }];
    }

    const start = this.worldToGrid(startWorldX, startWorldZ);
    let target = this.worldToGrid(targetWorldX, targetWorldZ);

    // If target itself is blocked (e.g. clicked directly on a crate or building wall),
    // find the closest walkable cell in an expanding spiral radius up to 5 cells
    if (!this.isWalkable(target.x, target.z)) {
      let nearestCell = null;
      let minDst = Infinity;
      for (let r = 1; r <= 5; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
            const nx = target.x + dx;
            const nz = target.z + dz;
            if (this.isWalkable(nx, nz)) {
              const d = Math.hypot(dx, dz);
              if (d < minDst) {
                minDst = d;
                nearestCell = { x: nx, z: nz };
              }
            }
          }
        }
        if (nearestCell) break;
      }
      if (!nearestCell) return [];
      target = nearestCell;
    }

    if (start.x === target.x && start.z === target.z) {
      return [{ x: targetWorldX, z: targetWorldZ }];
    }

    const size = this.size;
    const openSet = [];
    const openSetHash = new Set();
    const closedSet = new Uint8Array(size * size);

    const gScore = new Float32Array(size * size).fill(Infinity);
    const fScore = new Float32Array(size * size).fill(Infinity);
    const cameFrom = new Int32Array(size * size).fill(-1);

    const startIndex = start.z * size + start.x;
    const targetIndex = target.z * size + target.x;

    gScore[startIndex] = 0;
    fScore[startIndex] = this.heuristic(start.x, start.z, target.x, target.z);

    openSet.push(startIndex);
    openSetHash.add(startIndex);

    const dirs = [
      { x: 1, z: 0, cost: 1 },
      { x: -1, z: 0, cost: 1 },
      { x: 0, z: 1, cost: 1 },
      { x: 0, z: -1, cost: 1 },
      { x: 1, z: 1, cost: 1.414 },
      { x: -1, z: 1, cost: 1.414 },
      { x: 1, z: -1, cost: 1.414 },
      { x: -1, z: -1, cost: 1.414 }
    ];

    while (openSet.length > 0) {
      // Find lowest fScore in openSet
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (fScore[openSet[i]] < fScore[openSet[lowestIdx]]) {
          lowestIdx = i;
        }
      }

      const current = openSet.splice(lowestIdx, 1)[0];
      openSetHash.delete(current);

      if (current === targetIndex) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, current, targetWorldX, targetWorldZ);
      }

      closedSet[current] = 1;
      const cx = current % size;
      const cz = Math.floor(current / size);

      for (const d of dirs) {
        const nx = cx + d.x;
        const nz = cz + d.z;

        if (!this.isWalkable(nx, nz)) continue;

        const neighborIndex = nz * size + nx;
        if (closedSet[neighborIndex] === 1) continue;

        const tentativeG = gScore[current] + d.cost;

        if (tentativeG < gScore[neighborIndex]) {
          cameFrom[neighborIndex] = current;
          gScore[neighborIndex] = tentativeG;
          fScore[neighborIndex] = tentativeG + this.heuristic(nx, nz, target.x, target.z);

          if (!openSetHash.has(neighborIndex)) {
            openSet.push(neighborIndex);
            openSetHash.add(neighborIndex);
          }
        }
      }
    }

    // No path found
    return [];
  }

  heuristic(x1, z1, x2, z2) {
    const dx = Math.abs(x1 - x2);
    const dz = Math.abs(z1 - z2);
    // Octile distance
    return (dx + dz) + (1.414 - 2) * Math.min(dx, dz);
  }

  reconstructPath(cameFrom, current, finalX, finalZ) {
    const path = [];
    let curr = current;
    while (curr !== -1) {
      const gx = curr % this.size;
      const gz = Math.floor(curr / this.size);
      const worldPos = this.gridToWorld(gx, gz);
      path.push(worldPos);
      curr = cameFrom[curr];
    }
    path.reverse();
    // Replace last node with exact clicked coordinate
    if (path.length > 0) {
      path[path.length - 1] = { x: finalX, z: finalZ };
    }
    return path;
  }
}
