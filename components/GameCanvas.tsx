import React, { useEffect, useRef } from 'react';
import { GRID_W, GRID_H, COLORS, TOOLS, GAME_DURATION, MAX_ENERGY, ENERGY_RECHARGE_RATE, INITIAL_ENERGY } from '../constants';
import { PlayerId, ToolType, Projectile, Unit, Particle, GameState, PlayerType } from '../types';

interface GameCanvasProps {
  p1Tool: ToolType;
  p2Tool: ToolType;
  p1Type: PlayerType;
  p2Type: PlayerType;
  onStateUpdate: (state: GameState) => void;
  gameActive: boolean;
  onGameOver: (winner: PlayerId | 'DRAW') => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ p1Tool, p2Tool, p1Type, p2Type, onStateUpdate, gameActive, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for performance)
  const gridRef = useRef<number[][]>([]);
  const unitsRef = useRef<Unit[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // AI State
  const aiStateRef = useRef({
      p1Cooldown: 0,
      p2Cooldown: 0
  });
  
  const stateRef = useRef({
    p1Energy: INITIAL_ENERGY,
    p2Energy: INITIAL_ENERGY,
    timeRemaining: GAME_DURATION,
    frameCount: 0,
    winner: null as PlayerId | null,
  });

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize/Reset Game
  useEffect(() => {
    // 1. Reset Grid
    const grid: number[][] = [];
    for (let y = 0; y < GRID_H; y++) {
      const row: number[] = [];
      for (let x = 0; x < GRID_W; x++) {
        // Initial 50/50 Split
        row.push(x < GRID_W / 2 ? COLORS.GRID_P1 : COLORS.GRID_P2);
      }
      grid.push(row);
    }
    gridRef.current = grid;

    // 2. Reset Entities
    unitsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    
    // 3. Reset AI
    aiStateRef.current = { p1Cooldown: 60, p2Cooldown: 60 };

    // 4. Reset State if starting new game
    if (gameActive) {
        stateRef.current = {
            p1Energy: INITIAL_ENERGY,
            p2Energy: INITIAL_ENERGY,
            timeRemaining: GAME_DURATION,
            frameCount: 0,
            winner: null,
        };
    }
  }, [gameActive]);

  const spawnProjectile = (x: number, y: number, type: ToolType, owner: PlayerId, moveDir: number, targetX?: number, targetY?: number) => {
    let vx = 0; 
    let vy = 0;
    let radius = 1;
    let bounces = 0;
    let maxAge = 0; // 0 = infinite until collision

    const speed = type === ToolType.MACHINE_GUN ? 0.8 : 0.4;
    
    if (type === ToolType.CANNON) {
      // Cannon aims slightly randomly forward
      vx = moveDir * (0.3 + Math.random() * 0.2);
      vy = (Math.random() - 0.5) * 0.2;
      radius = 3;
    } else if (type === ToolType.MACHINE_GUN) {
      // MG shoots fast, can bounce
      vx = moveDir * speed;
      vy = (Math.random() - 0.5) * 0.5; // Some spread
      bounces = 5;
      radius = 1;
    } else if (type === ToolType.METEOR && targetX !== undefined && targetY !== undefined) {
      // Meteor: Comes from the sky (outside arena)
      // Determine start position based on player side preference roughly, but high up
      // P1 (Left) meteors come from top-left, P2 from top-right visually
      const spawnX = owner === PlayerId.P1 ? targetX - 20 : targetX + 20; 
      const spawnY = -20; // Above screen
      
      // Overwrite initial x,y with spawn position
      x = spawnX;
      y = spawnY;

      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const meteorSpeed = 0.6; // Speed of fall
      
      vx = (dx / dist) * meteorSpeed;
      vy = (dy / dist) * meteorSpeed;
      
      radius = 6;
      // Fuse: Calculate exactly how many frames to reach target
      maxAge = Math.ceil(dist / meteorSpeed);
    } else if (type === ToolType.TANK) {
      // Tank spray (short range, random direction)
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * 0.5;
      vy = Math.sin(angle) * 0.5;
      radius = 0.5; // Paints single pixel essentially
    }

    projectilesRef.current.push({
      id: Math.random(),
      x,
      y,
      vx,
      vy,
      type,
      owner,
      radius,
      bounces,
      markedForDeletion: false,
      age: 0,
      maxAge: maxAge > 0 ? maxAge : undefined
    });
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1.0,
        color,
      });
    }
  };

  const paintGrid = (cx: number, cy: number, radius: number, owner: PlayerId) => {
    const grid = gridRef.current;
    const rSq = radius * radius;
    const gridVal = owner === PlayerId.P1 ? COLORS.GRID_P1 : COLORS.GRID_P2;
    
    // Bounding box optimization
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(GRID_W - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(GRID_H - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rSq) {
          if (grid[y][x] !== gridVal) {
             grid[y][x] = gridVal;
          }
        }
      }
    }
  };

  const processAi = (player: PlayerId) => {
      // Simple AI Logic
      // 1. Check Energy
      const state = stateRef.current;
      const energy = player === PlayerId.P1 ? state.p1Energy : state.p2Energy;
      
      // Determine what to buy
      // Random weighted selection
      const rand = Math.random();
      let selectedTool = ToolType.CANNON;
      
      if (rand < 0.4) selectedTool = ToolType.TANK;      // 40% Tank
      else if (rand < 0.7) selectedTool = ToolType.CANNON; // 30% Cannon
      else if (rand < 0.9) selectedTool = ToolType.MACHINE_GUN; // 20% MG
      else selectedTool = ToolType.METEOR;               // 10% Meteor
      
      const config = TOOLS[selectedTool];
      
      if (energy >= config.cost) {
          // Attempt to find a valid spot
          let validSpot = false;
          let tx = 0, ty = 0;
          
          if (selectedTool === ToolType.METEOR) {
              // Target Enemy Territory - try 10 times to find an enemy pixel
              for (let i = 0; i < 10; i++) {
                  tx = Math.floor(Math.random() * GRID_W);
                  ty = Math.floor(Math.random() * GRID_H);
                  const val = gridRef.current[ty][tx];
                  // Ideally target enemy color
                  const enemyColor = player === PlayerId.P1 ? COLORS.GRID_P2 : COLORS.GRID_P1;
                  if (val === enemyColor) {
                      validSpot = true;
                      break;
                  }
              }
              // If no enemy spot found (rare), just bomb anywhere (fallback)
              if (!validSpot) {
                  tx = Math.floor(Math.random() * GRID_W);
                  ty = Math.floor(Math.random() * GRID_H);
                  validSpot = true;
              }
          } else {
              // Standard Tool: Must be on OWN color
              for (let i = 0; i < 20; i++) {
                  tx = Math.floor(Math.random() * GRID_W);
                  ty = Math.floor(Math.random() * GRID_H);
                  const val = gridRef.current[ty][tx];
                  const myColor = player === PlayerId.P1 ? COLORS.GRID_P1 : COLORS.GRID_P2;
                  
                  if (val === myColor) {
                      // Check if occupied by another unit roughly
                      const occupied = unitsRef.current.some(u => Math.abs(u.x - tx) < 2 && Math.abs(u.y - ty) < 2);
                      if (!occupied) {
                          validSpot = true;
                          break;
                      }
                  }
              }
          }
          
          if (validSpot) {
              // Execute Buy
              if (player === PlayerId.P1) stateRef.current.p1Energy -= config.cost;
              else stateRef.current.p2Energy -= config.cost;
              
              if (selectedTool === ToolType.METEOR) {
                  spawnProjectile(0, 0, selectedTool, player, 0, tx, ty);
              } else {
                   unitsRef.current.push({
                      id: Math.random(),
                      x: tx,
                      y: ty,
                      owner: player,
                      type: selectedTool,
                      hp: config.hp,
                      maxHp: config.hp,
                      cooldownTimer: 0,
                      markedForDeletion: false,
                      moveDir: player === PlayerId.P1 ? 1 : -1
                  });
                   spawnParticles(tx, ty, '#ffffff', 5);
              }
              return true; // Action taken
          }
      }
      return false;
  };

  const update = (dt: number) => {
    if (!gameActive) return;

    const state = stateRef.current;
    state.frameCount++;

    // 1. Energy Recharge (1 per second)
    if (state.frameCount % 60 === 0) {
      state.p1Energy = Math.min(state.p1Energy + ENERGY_RECHARGE_RATE, MAX_ENERGY);
      state.p2Energy = Math.min(state.p2Energy + ENERGY_RECHARGE_RATE, MAX_ENERGY);
      state.timeRemaining = Math.max(0, state.timeRemaining - 1);
    }

    // 2. AI Logic
    // P1 AI
    if (p1Type === 'CPU') {
        if (aiStateRef.current.p1Cooldown <= 0) {
            const acted = processAi(PlayerId.P1);
            // If acted, set random delay (30-90 frames), else check again sooner (10 frames)
            aiStateRef.current.p1Cooldown = acted ? 30 + Math.random() * 60 : 10;
        } else {
            aiStateRef.current.p1Cooldown--;
        }
    }
    // P2 AI
    if (p2Type === 'CPU') {
        if (aiStateRef.current.p2Cooldown <= 0) {
            const acted = processAi(PlayerId.P2);
            aiStateRef.current.p2Cooldown = acted ? 30 + Math.random() * 60 : 10;
        } else {
            aiStateRef.current.p2Cooldown--;
        }
    }

    // 3. Units Update
    unitsRef.current.forEach(unit => {
      // Move Tank
      if (unit.type === ToolType.TANK) {
        unit.x += unit.moveDir * 0.1; // Slow movement
        
        // Check bounds
        if (unit.x < 0 || unit.x >= GRID_W) {
          unit.markedForDeletion = true;
        } else {
          // Paint under tank
          paintGrid(unit.x, unit.y, 1.5, unit.owner);
        }
      }

      // Shoot Logic
      if (unit.cooldownTimer <= 0) {
        const config = TOOLS[unit.type];
        
        if (unit.type === ToolType.TANK) {
          // Spinner behavior
          spawnProjectile(unit.x, unit.y, ToolType.TANK, unit.owner, 0); 
          unit.cooldownTimer = config.cooldown;
        } else {
          // Turrets
          spawnProjectile(unit.x, unit.y, unit.type, unit.owner, unit.moveDir);
          unit.cooldownTimer = config.cooldown;
        }
      } else {
        unit.cooldownTimer--;
      }
    });

    // 4. Projectiles Update
    projectilesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.age++;

      // Meteor Fuse Check (Target reached)
      if (p.type === ToolType.METEOR && p.maxAge && p.age >= p.maxAge) {
          // Explode due to fuse (falling impact)
          paintGrid(p.x, p.y, p.radius, p.owner); // Paints the ground on impact
          spawnParticles(p.x, p.y, p.owner === PlayerId.P1 ? COLORS[PlayerId.P1] : COLORS[PlayerId.P2], 20);
          spawnParticles(p.x, p.y, '#fbbf24', 10); // Fire particles
          
          // Meteor Explosion Damage to Units - Massive Damage (6)
          unitsRef.current.forEach(u => {
              if (u.owner !== p.owner) {
                  const dx = u.x - p.x;
                  const dy = u.y - p.y;
                  // AOE Range
                  if (Math.sqrt(dx*dx + dy*dy) < p.radius + 1) {
                      u.hp -= 6; // Meteor deals 6 damage
                      spawnParticles(u.x, u.y, '#ff0000', 5);
                      if (u.hp <= 0) u.markedForDeletion = true;
                  }
              }
          });
          
          p.markedForDeletion = true;
          return; // Skip other checks
      }

      // Check Collision with Enemy Units (Hitbox)
      let hitUnit = false;
      // Projectiles (except Meteor flight) hit units
      if (p.type !== ToolType.METEOR) {
          for (const unit of unitsRef.current) {
              if (unit.owner !== p.owner && !unit.markedForDeletion) {
                  const dx = unit.x - p.x;
                  const dy = unit.y - p.y;
                  const hitDist = (unit.type === ToolType.TANK) ? 2.5 : 1.5; // Tanks are bigger
                  
                  if (Math.sqrt(dx*dx + dy*dy) < hitDist) {
                      unit.hp -= 1; // Standard damage is 1
                      spawnParticles(unit.x, unit.y, unit.owner === PlayerId.P1 ? COLORS[PlayerId.P1] : COLORS[PlayerId.P2], 3);
                      
                      if (unit.hp <= 0) {
                          unit.markedForDeletion = true;
                          spawnParticles(unit.x, unit.y, '#ffffff', 8); // Explosion
                      }
                      hitUnit = true;
                      break; // Hit one unit per frame max
                  }
              }
          }
      }

      if (hitUnit) {
          p.markedForDeletion = true;
          return;
      }

      // Bounds Check for Standard Projectiles
      if (p.type !== ToolType.METEOR) {
          let hitWall = false;
          if (p.x < 0 || p.x >= GRID_W) {
            p.vx *= -1;
            hitWall = true;
          }
          if (p.y < 0 || p.y >= GRID_H) {
            p.vy *= -1;
            hitWall = true;
          }
          
          if (hitWall) {
             if (p.type === ToolType.MACHINE_GUN) {
                // Ricochet logic
                if (p.bounces > 0) {
                    p.bounces--;
                } else {
                    p.markedForDeletion = true;
                }
             } else {
                p.markedForDeletion = true;
             }
             p.x = Math.max(0, Math.min(GRID_W - 0.1, p.x));
             p.y = Math.max(0, Math.min(GRID_H - 0.1, p.y));
          }
      }

      // Paint logic for standard projectiles (hitting ground)
      const gx = Math.floor(p.x);
      const gy = Math.floor(p.y);
      const inBounds = gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H;

      if (inBounds && !p.markedForDeletion && p.type !== ToolType.METEOR) {
          const currentCell = gridRef.current[gy][gx];
          const isEnemyCell = (p.owner === PlayerId.P1 && currentCell === COLORS.GRID_P2) || 
                              (p.owner === PlayerId.P2 && currentCell === COLORS.GRID_P1);
          
          if (p.type === ToolType.MACHINE_GUN) {
             // MG: Paints ONLY if enemy cell, then dies
             if (isEnemyCell) {
                 paintGrid(p.x, p.y, p.radius, p.owner);
                 spawnParticles(p.x, p.y, p.owner === PlayerId.P1 ? COLORS[PlayerId.P1] : COLORS[PlayerId.P2], 3);
                 p.markedForDeletion = true;
             }
          } else if (p.type === ToolType.CANNON) {
             // Cannon: Explodes on impact with enemy cell
             if (isEnemyCell) {
                 paintGrid(p.x, p.y, p.radius, p.owner);
                 spawnParticles(p.x, p.y, p.owner === PlayerId.P1 ? COLORS[PlayerId.P1] : COLORS[PlayerId.P2], 5);
                 p.markedForDeletion = true;
             }
          } else if (p.type === ToolType.TANK) {
              // Spray bullet
              paintGrid(p.x, p.y, 0.8, p.owner);
              p.markedForDeletion = true;
          }
      }
    });

    // Clean up
    unitsRef.current = unitsRef.current.filter(u => !u.markedForDeletion);
    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion);

    // Update Particles
    particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Win Condition Check (Expensive, do every 10 frames)
    if (state.frameCount % 10 === 0) {
        let p1Count = 0;
        let p2Count = 0;
        let total = GRID_W * GRID_H;
        
        for(let y=0; y<GRID_H; y++) {
            for(let x=0; x<GRID_W; x++) {
                if(gridRef.current[y][x] === COLORS.GRID_P1) p1Count++;
                else if(gridRef.current[y][x] === COLORS.GRID_P2) p2Count++;
            }
        }
        
        const p1Pct = p1Count / total;
        const p2Pct = p2Count / total;

        // Check 98% Win
        if (p1Pct >= 0.98) onGameOver(PlayerId.P1);
        else if (p2Pct >= 0.98) onGameOver(PlayerId.P2);
        else if (state.timeRemaining <= 0) {
            if (p1Pct > p2Pct) onGameOver(PlayerId.P1);
            else if (p2Pct > p1Pct) onGameOver(PlayerId.P2);
            else onGameOver('DRAW');
        }

        // Sync State to React
        onStateUpdate({
            grid: [], 
            p1Energy: state.p1Energy,
            p2Energy: state.p2Energy,
            timeRemaining: state.timeRemaining,
            winner: state.winner,
            isRunning: true
        });
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / GRID_W;
    const cellH = h / GRID_H;

    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            const val = gridRef.current[y][x];
            ctx.fillStyle = val === COLORS.GRID_P1 ? COLORS[PlayerId.P1] : COLORS[PlayerId.P2];
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
    }

    // Draw Units
    unitsRef.current.forEach(u => {
        const cx = u.x * cellW;
        const cy = u.y * cellH;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (u.type === ToolType.TANK) {
             // Draw Tank Body
             ctx.fillRect(cx - 6, cy - 4, 12, 8);
             // Draw Turret/Barrel
             ctx.fillStyle = '#ccc';
             ctx.fillRect(cx - 3, cy - 6, 6, 6); // Top turret
        } else {
             ctx.arc(cx, cy, 6, 0, Math.PI * 2);
             ctx.fill();
        }
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Health Bar
        if (u.maxHp > 0) {
            const hpPct = Math.max(0, u.hp / u.maxHp);
            const barW = 20;
            const barH = 4;
            const barX = cx - barW / 2;
            const barY = cy - 16; 

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(barX, barY, barW, barH);
            
            // HP Color
            ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * hpPct, barH - 2);
        }
    });

    // Draw Projectiles
    projectilesRef.current.forEach(p => {
        const px = p.x * cellW;
        const py = p.y * cellH;
        
        if (p.type === ToolType.METEOR) {
            // Draw big meteor
            ctx.beginPath();
            ctx.fillStyle = '#fbbf24'; // Amber center
            ctx.arc(px, py, 6, 0, Math.PI * 2); 
            ctx.fill();
            
            // Outer glow
            ctx.beginPath();
            ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
            ctx.arc(px, py, 10, 0, Math.PI * 2); 
            ctx.fill();

            // Trail
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - p.vx * 15, py - p.vy * 15);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.fillStyle = '#fff';
            ctx.arc(px, py, 3, 0, Math.PI * 2); 
            ctx.fill();
        }
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x * cellW, p.y * cellH, 4, 4);
        ctx.globalAlpha = 1.0;
    });
  };

  const loop = (time: number) => {
    lastTimeRef.current = time;
    update(16);
    draw();
    if (gameActive) {
        requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    if (gameActive) {
        requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameActive]);

  const handleCanvasClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!gameActive || !canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const scaleX = GRID_W / rect.width;
      const scaleY = GRID_H / rect.height;
      
      const gx = clickX * scaleX;
      const gy = clickY * scaleY;
      
      const gxInt = Math.floor(gx);
      const gyInt = Math.floor(gy);

      if (gxInt < 0 || gxInt >= GRID_W || gyInt < 0 || gyInt >= GRID_H) return;

      // Identity Resolution: Left Click = P1, Right Click = P2
      // Only allow click if that player is HUMAN
      let actingPlayer: PlayerId | null = null;
      
      if (e.button === 0 && p1Type === 'PLAYER') actingPlayer = PlayerId.P1;
      else if (e.button === 2 && p2Type === 'PLAYER') actingPlayer = PlayerId.P2;
      
      if (!actingPlayer) return;

      const toolType = actingPlayer === PlayerId.P1 ? p1Tool : p2Tool;
      const config = TOOLS[toolType];
      const cost = config.cost;
      const currentEnergy = actingPlayer === PlayerId.P1 ? stateRef.current.p1Energy : stateRef.current.p2Energy;

      if (currentEnergy >= cost) {
          const gridVal = gridRef.current[gyInt][gxInt];
          
          let isValidPlacement = false;
          
          if (toolType === ToolType.METEOR) {
              isValidPlacement = true; // Meteor targets anywhere
          } else {
              // Standard Tool check: Must be on Ally Color
              const isAllyColor = (actingPlayer === PlayerId.P1 && gridVal === COLORS.GRID_P1) ||
                                  (actingPlayer === PlayerId.P2 && gridVal === COLORS.GRID_P2);
              isValidPlacement = isAllyColor;
          }

          if (isValidPlacement) {
              // Deduct Energy
              if (actingPlayer === PlayerId.P1) stateRef.current.p1Energy -= cost;
              else stateRef.current.p2Energy -= cost;

              if (toolType === ToolType.METEOR) {
                  // Spawn Meteor targeting clicked location
                  spawnProjectile(0, 0, toolType, actingPlayer, 0, gx, gy);
              } else {
                  // Spawn Unit
                  unitsRef.current.push({
                      id: Math.random(),
                      x: gx,
                      y: gy,
                      owner: actingPlayer,
                      type: toolType,
                      hp: config.hp,
                      maxHp: config.hp,
                      cooldownTimer: 0,
                      markedForDeletion: false,
                      moveDir: actingPlayer === PlayerId.P1 ? 1 : -1
                  });
                   spawnParticles(gx, gy, '#ffffff', 5);
              }
          } else {
              // Visual feedback for invalid placement
              spawnParticles(gx, gy, '#555555', 3);
          }
      }
  };

  return (
    <canvas 
        ref={canvasRef}
        width={1200}
        height={675}
        className="w-full h-full object-contain cursor-crosshair touch-none"
        onMouseDown={handleCanvasClick}
        onContextMenu={(e) => e.preventDefault()} 
    />
  );
};

export default GameCanvas;