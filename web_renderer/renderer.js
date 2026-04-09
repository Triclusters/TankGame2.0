import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const FIELD_SIZE = 280;
const GRAVITY = 9.81;
const FLAK_88_MUZZLE_VELOCITY = {
  AP: 820,
  HE: 840,
};
const COVER_POINTS = [
  new THREE.Vector3(-35, 0, 10),
  new THREE.Vector3(10, 0, -25),
  new THREE.Vector3(30, 0, 20),
  new THREE.Vector3(-5, 0, 35),
];
const obstacles = [];

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x90afcd, 0.0046);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.07;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);
const clock = new THREE.Clock();

function addSkyDome() {
  const geometry = new THREE.SphereGeometry(900, 24, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x88afd2) },
      horizonColor: { value: new THREE.Color(0xc9dae8) },
      bottomColor: { value: new THREE.Color(0xe8d4b5) },
    },
    vertexShader: `varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 sky = mix(horizonColor, topColor, smoothstep(0.0, 0.9, max(h, 0.0)));
        sky = mix(bottomColor, sky, smoothstep(-0.6, 0.12, h));
        gl_FragColor = vec4(sky, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geometry, material));
}

addSkyDome();
scene.add(new THREE.HemisphereLight(0xd0e0f3, 0x4d5a40, 0.56));

const sun = new THREE.DirectionalLight(0xfff1d2, 1.2);
sun.position.set(78, 92, -44);
sun.castShadow = true;
sun.shadow.mapSize.set(3072, 3072);
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
scene.add(sun);

const terrainGeom = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE, 128, 128);
terrainGeom.rotateX(-Math.PI / 2);
const positions = terrainGeom.attributes.position;
for (let i = 0; i < positions.count; i += 1) {
  const x = positions.getX(i);
  const z = positions.getZ(i);
  positions.setY(i, Math.sin(x * 0.045) * 1.2 + Math.cos(z * 0.04) * 1.15 + Math.sin((x + z) * 0.09) * 0.45);
}
terrainGeom.computeVertexNormals();

const terrain = new THREE.Mesh(
  terrainGeom,
  new THREE.MeshStandardMaterial({ color: 0x6f845f, roughness: 0.98, metalness: 0.02 })
);
terrain.receiveShadow = true;
scene.add(terrain);

function addRock(x, z, s) {
  const y = terrainHeightAt(x, z);
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(s, 0),
    new THREE.MeshStandardMaterial({ color: 0x72756d, roughness: 0.93 })
  );
  rock.position.set(x, y + s * 0.5, z);
  rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  registerObstacle(x, z, s * 0.85, s * 1.2);
}

function addTree(x, z, h = 2.4) {
  const y = terrainHeightAt(x, z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, h, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b4836, roughness: 0.9 })
  );
  trunk.position.set(x, y + h / 2, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.1, 9),
    new THREE.MeshStandardMaterial({ color: 0x5f7f4e, roughness: 0.95 })
  );
  crown.position.set(x, y + h + 0.9, z);
  crown.castShadow = true;
  crown.receiveShadow = true;
  scene.add(crown);
  registerObstacle(x, z, 1.0, h + 2.1);
}

for (let i = 0; i < 100; i += 1) {
  const x = THREE.MathUtils.randFloatSpread(FIELD_SIZE * 0.95);
  const z = THREE.MathUtils.randFloatSpread(FIELD_SIZE * 0.95);
  if (Math.abs(x) < 28 && Math.abs(z) < 28) continue;
  if (Math.random() > 0.45) addRock(x, z, THREE.MathUtils.randFloat(0.3, 1.1));
  if (Math.random() < 0.32) addTree(x + Math.random(), z + Math.random(), THREE.MathUtils.randFloat(1.6, 2.8));
}

function addGrassAndFlowers() {
  const grassGeom = new THREE.ConeGeometry(0.08, 0.7, 5);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x6e9b59, roughness: 0.96 });
  const grass = new THREE.InstancedMesh(grassGeom, grassMat, 1200);
  grass.castShadow = true;
  grass.receiveShadow = true;

  const flowerGeom = new THREE.SphereGeometry(0.06, 6, 6);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf0c2de, roughness: 0.65, metalness: 0.02 });
  const flowers = new THREE.InstancedMesh(flowerGeom, flowerMat, 260);

  const m = new THREE.Matrix4();
  for (let i = 0; i < 1200; i += 1) {
    const x = THREE.MathUtils.randFloatSpread(FIELD_SIZE * 0.92);
    const z = THREE.MathUtils.randFloatSpread(FIELD_SIZE * 0.92);
    const y = terrainHeightAt(x, z) + 0.35;
    const s = THREE.MathUtils.randFloat(0.8, 1.3);
    m.compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0)),
      new THREE.Vector3(s, s, s)
    );
    grass.setMatrixAt(i, m);
  }

  for (let i = 0; i < 260; i += 1) {
    const x = THREE.MathUtils.randFloatSpread(FIELD_SIZE * 0.85);
    const z = THREE.MathUtils.randFloatSpread(FIELD_SIZE * 0.85);
    const y = terrainHeightAt(x, z) + 0.42;
    const s = THREE.MathUtils.randFloat(0.7, 1.4);
    m.compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion(),
      new THREE.Vector3(s, s, s)
    );
    flowers.setMatrixAt(i, m);
  }

  scene.add(grass);
  scene.add(flowers);
}

addGrassAndFlowers();

function addCover(x, z, sx, sy, sz, c = 0x6f6b61) {
  const y = terrainHeightAt(x, z);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })
  );
  mesh.position.set(x, y + sy / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  registerObstacle(x, z, Math.max(sx, sz) * 0.55, sy);
}

addCover(-35, 10, 18, 4, 16, 0x667055);
addCover(10, -25, 12, 3, 10, 0x64704f);
addCover(30, 20, 9, 5, 9, 0x636e4e);
addCover(-5, 35, 22, 3, 8, 0x677259);

function makeTank(colorHex) {
  const tank = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.78, metalness: 0.25 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 6.2), material);
  hull.position.y = 1.2;
  hull.castShadow = true;
  tank.add(hull);

  const turretPivot = new THREE.Group();
  turretPivot.position.set(0, 2.0, 0);
  tank.add(turretPivot);

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.45, 1.0, 16),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex).multiplyScalar(0.88), roughness: 0.72, metalness: 0.28 })
  );
  turret.castShadow = true;
  turretPivot.add(turret);

  const gunPivot = new THREE.Group();
  gunPivot.position.set(0, 0.15, 1.1);
  turretPivot.add(gunPivot);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 4.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x424950, roughness: 0.46, metalness: 0.8 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 2.2;
  barrel.castShadow = true;
  gunPivot.add(barrel);

  return { tank, turretPivot, gunPivot, hull, turret };
}

const playerMesh = makeTank(0x6b8868);
playerMesh.tank.position.set(-20, 0, -20);
scene.add(playerMesh.tank);

const enemyMesh = makeTank(0x8a6c60);
enemyMesh.tank.position.set(48, 0, 34);
enemyMesh.tank.rotation.y = THREE.MathUtils.degToRad(210);
scene.add(enemyMesh.tank);

function makeState(mesh, isPlayer = false) {
  const vehicle = isPlayer
    ? {
        horsepower: 850,
        massTons: 46,
        maxForwardSpeed: 11.4,
        maxReverseSpeed: 4.6,
        turnRate: THREE.MathUtils.degToRad(16),
        brakeDecel: 2.8,
      }
    : {
        horsepower: 750,
        massTons: 52,
        maxForwardSpeed: 9.6,
        maxReverseSpeed: 3.8,
        turnRate: THREE.MathUtils.degToRad(14),
        brakeDecel: 2.3,
      };
  return {
    mesh,
    isPlayer,
    hp: 100,
    modules: { engine: 100, gun: 100, turret: 100, crew: 100 },
    destroyed: false,
    burning: false,
    reload: 0,
    ammoType: "AP",
    enginePower: 0,
    vehicle,
    turretYawTarget: 0,
    gunPitchTarget: 0,
    velocity: 0,
    turretTurnSpeed: THREE.MathUtils.degToRad(isPlayer ? 14 : 12),
    gunPitchSpeed: THREE.MathUtils.degToRad(isPlayer ? 12 : 10),
    ai: {
      state: "snipe",
      decisionCooldown: 0,
      fireTimer: 0,
      destination: null,
      aimError: 0.05,
    },
  };
}

const player = makeState(playerMesh, true);
const enemy = makeState(enemyMesh, false);

const shells = [];
const flashes = [];
const burnEffects = [];

const keys = new Set();
const hud = document.getElementById("hud");
const compass = document.getElementById("compass");
const status = document.getElementById("status");
const rangefinderEl = document.getElementById("rangefinder");
const hitCamEl = document.getElementById("hitcam");
const hitCamCanvas = document.getElementById("hitcam-canvas");
const hitCamText = document.getElementById("hitcam-text");
const hitCamCtx = hitCamCanvas.getContext("2d");

const mode = { view: "third", freeLook: false, holdZoom: false };
const aim = { cameraYaw: 0, cameraPitch: 0.22, zoomStep: 0.45 };
let rangeMeters = null;
let notification = "Battle started.";
const hitCam = { active: false, ttl: 0, report: null };
const control = { stabilizer: true, cameraLag: 12, driveAssist: true };

function terrainHeightAt(x, z) {
  return Math.sin(x * 0.045) * 1.2 + Math.cos(z * 0.04) * 1.15 + Math.sin((x + z) * 0.09) * 0.45;
}

function registerObstacle(x, z, radius, height = 3) {
  obstacles.push({ x, z, radius, height });
}

function muzzlePosition(state) {
  const pos = state.mesh.gunPivot.getWorldPosition(new THREE.Vector3());
  const q = state.mesh.gunPivot.getWorldQuaternion(new THREE.Quaternion());
  return pos.add(new THREE.Vector3(0, 0, 4.85).applyQuaternion(q));
}

function applyDamage(target, shell) {
  const impact = shell.ammoType === "HE" ? 16 : 28;
  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - impact);

  const moduleKeys = ["engine", "gun", "turret", "crew"];
  const hitModule = moduleKeys[Math.floor(Math.random() * moduleKeys.length)];
  const moduleDamage = shell.ammoType === "HE" ? 18 : 26;
  const moduleBefore = target.modules[hitModule];
  target.modules[hitModule] = Math.max(0, target.modules[hitModule] - moduleDamage);
  notification = `${target.isPlayer ? "You were hit" : "Enemy hit"}: ${hitModule.toUpperCase()} -${moduleDamage.toFixed(0)}`;

  if (target.modules.crew <= 0 || target.hp <= 0) target.destroyed = true;
  if (target.destroyed) notification = target.isPlayer ? "Player knocked out." : "Target destroyed.";

  return {
    penetrated: shell.ammoType === "AP" ? Math.random() > 0.15 : Math.random() > 0.35,
    hpDamage: Math.max(0, hpBefore - target.hp),
    module: hitModule,
    moduleDamage: Math.max(0, moduleBefore - target.modules[hitModule]),
    destroyed: target.destroyed,
    ammoType: shell.ammoType,
  };
}

function showHitCam(report) {
  // Only show text if something was actually damaged.
  if (report.hpDamage <= 0 && report.moduleDamage <= 0) {
    hitCam.active = false;
    hitCamEl.style.display = "none";
    hitCamText.textContent = "";
    return;
  }

  hitCam.active = true;
  hitCam.ttl = 2.25;
  hitCam.report = report;
  hitCamEl.style.display = "block";
  hitCamText.textContent = `${report.ammoType} ${report.penetrated ? "penetration" : "partial"} · ${report.module.toUpperCase()} -${report.moduleDamage} · HP -${report.hpDamage}${report.destroyed ? " · TARGET DESTROYED" : ""}`;
}

function renderHitCam() {
  hitCamCtx.clearRect(0, 0, hitCamCanvas.width, hitCamCanvas.height);
  if (!hitCam.active || !hitCam.report) return;
  const r = hitCam.report;

  hitCamCtx.fillStyle = "rgba(36, 51, 68, .95)";
  hitCamCtx.fillRect(16, 24, 210, 72);
  hitCamCtx.strokeStyle = "rgba(210,225,245,.45)";
  hitCamCtx.lineWidth = 1.2;
  hitCamCtx.strokeRect(16, 24, 210, 72);

  hitCamCtx.fillStyle = "rgba(70,80,96,.9)";
  hitCamCtx.fillRect(92, 40, 56, 32); // turret block

  hitCamCtx.strokeStyle = r.penetrated ? "#ffd08a" : "#ff8f72";
  hitCamCtx.lineWidth = 2.6;
  hitCamCtx.beginPath();
  hitCamCtx.moveTo(290, 60);
  hitCamCtx.lineTo(r.penetrated ? 118 : 170, 56);
  hitCamCtx.stroke();

  if (r.penetrated) {
    hitCamCtx.strokeStyle = "rgba(255, 170, 90, .85)";
    hitCamCtx.beginPath();
    hitCamCtx.moveTo(118, 56);
    hitCamCtx.lineTo(55, 56 + (r.module === "engine" ? 16 : r.module === "crew" ? -12 : 0));
    hitCamCtx.stroke();
  }

  hitCamCtx.fillStyle = "rgba(255, 210, 155, .95)";
  hitCamCtx.font = "11px sans-serif";
  hitCamCtx.fillText(r.penetrated ? "PEN" : "NON-PEN", 246, 30);
}

function spawnFlash(position) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd08a })
  );
  flash.position.copy(position);
  flash.userData.life = 0.06;
  flashes.push(flash);
  scene.add(flash);
}

function createBurningWreck(target) {
  if (target.burning) return;
  target.burning = true;
  const root = new THREE.Group();
  root.userData = { state: target, particles: [] };
  scene.add(root);
  burnEffects.push(root);
}

function updateBurningWrecks(dt) {
  for (let i = burnEffects.length - 1; i >= 0; i -= 1) {
    const effect = burnEffects[i];
    const state = effect.userData.state;
    if (!state) continue;

    const basePos = state.mesh.tank.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    effect.position.copy(basePos);

    const particles = effect.userData.particles;
    const spawnCount = Math.max(1, Math.floor(22 * dt));
    for (let s = 0; s < spawnCount; s += 1) {
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff7b2f, transparent: true, opacity: 0.9 })
      );
      flame.position.set(
        THREE.MathUtils.randFloatSpread(1.6),
        THREE.MathUtils.randFloat(0.0, 0.6),
        THREE.MathUtils.randFloatSpread(1.6)
      );
      flame.userData.vel = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(0.4),
        THREE.MathUtils.randFloat(1.2, 2.8),
        THREE.MathUtils.randFloatSpread(0.4)
      );
      flame.userData.life = THREE.MathUtils.randFloat(0.35, 0.8);
      flame.userData.maxLife = flame.userData.life;
      particles.push(flame);
      effect.add(flame);
    }

    for (let p = particles.length - 1; p >= 0; p -= 1) {
      const flame = particles[p];
      flame.userData.life -= dt;
      flame.position.addScaledVector(flame.userData.vel, dt);
      flame.scale.multiplyScalar(0.96);
      flame.material.opacity = THREE.MathUtils.clamp(flame.userData.life / flame.userData.maxLife, 0, 1);
      if (flame.userData.life <= 0) {
        effect.remove(flame);
        flame.geometry.dispose();
        flame.material.dispose();
        particles.splice(p, 1);
      }
    }
  }
}

function fireMainGun(shooter, target, forcedError = 0) {
  if (shooter.destroyed || shooter.reload > 0 || shooter.modules.gun <= 0) return;
  shooter.reload = shooter.ammoType === "HE" ? 1.35 : 0.95;

  const q = shooter.mesh.gunPivot.getWorldQuaternion(new THREE.Quaternion());
  const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();

  const errorVec = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(forcedError),
    THREE.MathUtils.randFloatSpread(forcedError * 0.6),
    THREE.MathUtils.randFloatSpread(forcedError)
  );
  dir.add(errorVec).normalize();

  const shell = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 0.28, 4, 8),
    new THREE.MeshBasicMaterial({ color: shooter.ammoType === "HE" ? 0xff9e67 : 0xffecb5 })
  );
  shell.position.copy(muzzlePosition(shooter));
  shell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  shell.userData.velocity = dir.multiplyScalar(FLAK_88_MUZZLE_VELOCITY[shooter.ammoType] || FLAK_88_MUZZLE_VELOCITY.AP);
  shell.userData.gravity = shooter.ammoType === "HE" ? GRAVITY * 1.08 : GRAVITY;
  shell.userData.life = 8;
  shell.userData.shooter = shooter;
  shell.userData.target = target;
  shell.userData.ammoType = shooter.ammoType;
  shells.push(shell);
  scene.add(shell);
  spawnFlash(shell.position);
}

function measureRange() {
  rangeMeters = player.mesh.tank.position.distanceTo(enemy.mesh.tank.position);
}

function restartBattle() {
  player.hp = 100;
  enemy.hp = 100;
  player.modules = { engine: 100, gun: 100, turret: 100, crew: 100 };
  enemy.modules = { engine: 100, gun: 100, turret: 100, crew: 100 };
  player.destroyed = false;
  enemy.destroyed = false;
  player.reload = 0;
  enemy.reload = 0;
  player.burning = false;
  enemy.burning = false;
  player.mesh.tank.position.set(-20, terrainHeightAt(-20, -20), -20);
  enemy.mesh.tank.position.set(48, terrainHeightAt(48, 34), 34);
  player.mesh.tank.rotation.set(0, 0, 0);
  enemy.mesh.tank.rotation.set(0, THREE.MathUtils.degToRad(210), 0);
  notification = "Battle restarted.";
  hitCam.active = false;
  hitCamEl.style.display = "none";
  hitCamText.textContent = "";
  for (let i = burnEffects.length - 1; i >= 0; i -= 1) {
    const effect = burnEffects[i];
    effect.userData.particles.forEach((flame) => {
      flame.geometry.dispose();
      flame.material.dispose();
    });
    scene.remove(effect);
    burnEffects.splice(i, 1);
  }
}

function nearestCover(fromPosition) {
  let best = COVER_POINTS[0];
  let bestD = Infinity;
  COVER_POINTS.forEach((p) => {
    const d = fromPosition.distanceTo(p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  });
  return best.clone();
}

function resolveTankObstacleCollision(position, tankRadius = 2.3) {
  for (const obstacle of obstacles) {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const d2 = dx * dx + dz * dz;
    const minDist = tankRadius + obstacle.radius;
    if (d2 < minDist * minDist) {
      const d = Math.sqrt(Math.max(d2, 0.0001));
      const push = (minDist - d) + 0.05;
      position.x += (dx / d) * push;
      position.z += (dz / d) * push;
    }
  }
}

function updateEnemyAI(dt) {
  if (enemy.destroyed) return;
  const dist = enemy.mesh.tank.position.distanceTo(player.mesh.tank.position);
  enemy.ai.decisionCooldown -= dt;
  enemy.ai.fireTimer -= dt;

  if (enemy.ai.decisionCooldown <= 0) {
    enemy.ai.decisionCooldown = THREE.MathUtils.randFloat(1.2, 2.0);

    if (enemy.hp < 45 || enemy.modules.engine < 35) {
      enemy.ai.state = "cover";
      enemy.ai.destination = nearestCover(enemy.mesh.tank.position);
      enemy.ai.aimError = 0.085;
    } else if (dist > 70) {
      enemy.ai.state = "push";
      enemy.ai.destination = player.mesh.tank.position.clone().add(new THREE.Vector3(THREE.MathUtils.randFloat(-8, 8), 0, THREE.MathUtils.randFloat(-8, 8)));
      enemy.ai.aimError = 0.08;
    } else {
      enemy.ai.state = "snipe";
      enemy.ai.destination = enemy.mesh.tank.position.clone();
      enemy.ai.aimError = 0.04;
    }
  }

  const targetPos = enemy.ai.destination || enemy.mesh.tank.position;
  const toTarget = targetPos.clone().sub(enemy.mesh.tank.position);
  const moveDist = toTarget.length();

  let throttle = 0;
  if (enemy.ai.state === "push") throttle = 0.75;
  if (enemy.ai.state === "cover") throttle = 0.55;
  if (enemy.ai.state === "snipe") throttle = moveDist > 8 ? 0.25 : 0;

  if (moveDist > 1.5 && throttle > 0) {
    const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
    const yawDiff = desiredYaw - enemy.mesh.tank.rotation.y;
    enemy.mesh.tank.rotation.y += Math.sin(yawDiff) * dt * 1.2;
    const moveDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.mesh.tank.rotation.y);
    enemy.mesh.tank.position.addScaledVector(moveDir, dt * 8.5 * throttle);
    resolveTankObstacleCollision(enemy.mesh.tank.position);
  }

  // Aim with imperfect prediction.
  const toPlayer = player.mesh.tank.position.clone().sub(enemy.mesh.tank.position);
  const predicted = player.mesh.tank.position.clone().add(new THREE.Vector3(0, 0, player.velocity * 0.15));
  const toPredicted = predicted.sub(enemy.mesh.tank.position);
  const desiredTurret = Math.atan2(toPredicted.x, toPredicted.z) - enemy.mesh.tank.rotation.y;
  enemy.turretYawTarget = desiredTurret;
  enemy.gunPitchTarget = THREE.MathUtils.clamp(0.03 + toPlayer.length() * 0.0004, -0.1, 0.16);

  if (enemy.ai.fireTimer <= 0 && dist < 135 && enemy.modules.gun > 0) {
    enemy.ai.fireTimer = THREE.MathUtils.randFloat(2.1, 3.6);
    fireMainGun(enemy, player, enemy.ai.aimError);
  }
}

function updateTankTransform(state, dt) {
  const turretDiff = THREE.MathUtils.euclideanModulo(
    state.turretYawTarget - state.mesh.turretPivot.rotation.y + Math.PI,
    Math.PI * 2
  ) - Math.PI;
  const turretStep = THREE.MathUtils.clamp(turretDiff, -state.turretTurnSpeed * dt, state.turretTurnSpeed * dt);
  state.mesh.turretPivot.rotation.y += turretStep;

  const gunDiff = state.gunPitchTarget - state.mesh.gunPivot.rotation.x;
  const gunStep = THREE.MathUtils.clamp(gunDiff, -state.gunPitchSpeed * dt, state.gunPitchSpeed * dt);
  state.mesh.gunPivot.rotation.x += gunStep;

  if (state.isPlayer && !mode.freeLook) {
    aim.cameraYaw = state.mesh.tank.rotation.y + state.mesh.turretPivot.rotation.y;
  }
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function setMode(nextMode) {
  mode.view = nextMode;
  if (nextMode !== "third") mode.freeLook = false;
}

window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) fireMainGun(player, enemy, 0.018);
  if (e.button === 2) {
    mode.holdZoom = true;
    if (mode.view === "third") setMode("gunner");
  }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 2) {
    mode.holdZoom = false;
    if (mode.view === "gunner") setMode("third");
  }
});

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "Space") fireMainGun(player, enemy, 0.018);
  if (e.code === "Digit1") player.ammoType = "AP";
  if (e.code === "Digit2") player.ammoType = "HE";
  if (e.code === "Tab") {
    e.preventDefault();
    player.ammoType = player.ammoType === "AP" ? "HE" : "AP";
  }
  if (e.code === "KeyR") measureRange();
  if (e.code === "KeyP") restartBattle();
  if (e.code === "KeyV") setMode(mode.view === "third" ? "gunner" : "third");
  if (e.code === "KeyB") setMode(mode.view === "binoc" ? "third" : "binoc");
  if (e.code === "KeyC" || e.code === "AltLeft") mode.freeLook = true;
  if (e.code === "KeyG") control.stabilizer = !control.stabilizer;
  if (e.code === "KeyH") control.driveAssist = !control.driveAssist;
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "KeyC" || e.code === "AltLeft") mode.freeLook = false;
});

window.addEventListener("wheel", (e) => {
  aim.zoomStep = THREE.MathUtils.clamp(aim.zoomStep + Math.sign(e.deltaY) * 0.05, 0.05, 1.0);
});

window.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  const yawDelta = e.movementX * 0.0024;
  const pitchDelta = e.movementY * 0.0017;
  aim.cameraYaw -= yawDelta;
  aim.cameraPitch = THREE.MathUtils.clamp(aim.cameraPitch - pitchDelta, -0.3, 0.58);
  if (!mode.freeLook) {
    player.turretYawTarget = wrapAngle(aim.cameraYaw - player.mesh.tank.rotation.y);
    if (control.stabilizer) player.gunPitchTarget = THREE.MathUtils.clamp(aim.cameraPitch * 0.5, -0.16, 0.28);
  }
});

renderer.domElement.addEventListener("click", () => renderer.domElement.requestPointerLock());
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateCamera(dt) {
  const gunForward = new THREE.Vector3(0, 0, 1).applyQuaternion(
    player.mesh.gunPivot.getWorldQuaternion(new THREE.Quaternion())
  );
  const scopedFov = THREE.MathUtils.lerp(16, 40, aim.zoomStep);
  const binoFov = THREE.MathUtils.lerp(12, 24, aim.zoomStep);
  const fovTarget = mode.holdZoom
    ? (mode.view === "gunner" ? THREE.MathUtils.lerp(8, 20, aim.zoomStep) : 30)
    : (mode.view === "binoc" ? binoFov : mode.view === "gunner" ? scopedFov : 72);
  camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 10);
  camera.updateProjectionMatrix();

  if (mode.view === "gunner") {
    const sightPos = player.mesh.gunPivot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.17, -0.05));
    camera.position.lerp(sightPos, 1 - Math.exp(-dt * 22));
    camera.lookAt(sightPos.clone().add(gunForward.clone().multiplyScalar(220)));
    return;
  }

  if (mode.view === "binoc") {
    const binoPos = player.mesh.tank.position.clone().add(new THREE.Vector3(0, 4.8, 0));
    const binoDir = new THREE.Vector3(0, 0, 1)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), aim.cameraPitch)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), aim.cameraYaw);
    camera.position.lerp(binoPos, 1 - Math.exp(-dt * 12));
    camera.lookAt(binoPos.clone().add(binoDir.multiplyScalar(120)));
    return;
  }

  const pivot = player.mesh.tank.position.clone().add(new THREE.Vector3(0, 2.8, 0));
  const orbitYaw = mode.freeLook ? aim.cameraYaw : player.mesh.tank.rotation.y + player.mesh.turretPivot.rotation.y;
  const velocityOffset = THREE.MathUtils.clamp(-player.velocity * 0.35, -2.8, 2.8);
  const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.tank.rotation.y);
  const speedRatio = THREE.MathUtils.clamp(Math.abs(player.velocity) / player.vehicle.maxForwardSpeed, 0, 1);
  const leadDistance = THREE.MathUtils.lerp(0.3, 2.8, speedRatio);
  const targetCamPos = pivot.clone().addScaledVector(forward, velocityOffset + leadDistance);
  targetCamPos.y = Math.max(targetCamPos.y, terrainHeightAt(targetCamPos.x, targetCamPos.z) + 0.75);
  const adaptiveLag = THREE.MathUtils.lerp(control.cameraLag, control.cameraLag * 1.9, speedRatio);
  camera.position.lerp(targetCamPos, 1 - Math.exp(-dt * adaptiveLag));
  const viewDir = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(1, 0, 0), aim.cameraPitch)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitYaw);
  camera.lookAt(camera.position.clone().add(viewDir.multiplyScalar(70)));
}

function updateShells(dt) {
  for (let i = shells.length - 1; i >= 0; i -= 1) {
    const shell = shells[i];
    shell.userData.life -= dt;
    shell.userData.velocity.y -= shell.userData.gravity * dt;
    shell.position.addScaledVector(shell.userData.velocity, dt);
    shell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shell.userData.velocity.clone().normalize());

    const target = shell.userData.target;
    if (!target.destroyed && shell.position.distanceTo(target.mesh.tank.position.clone().add(new THREE.Vector3(0, 1.6, 0))) < 2.4) {
      const report = applyDamage(target, { ammoType: shell.userData.ammoType });
      if (shell.userData.shooter?.isPlayer && !target.isPlayer) showHitCam(report);
      if (report.destroyed) createBurningWreck(target);
      scene.remove(shell);
      shells.splice(i, 1);
      continue;
    }

    if (shell.position.y < terrainHeightAt(shell.position.x, shell.position.z) || shell.userData.life <= 0) {
      scene.remove(shell);
      shells.splice(i, 1);
    }
  }
}

function updateFlashes(dt) {
  for (let i = flashes.length - 1; i >= 0; i -= 1) {
    const flash = flashes[i];
    flash.userData.life -= dt;
    flash.scale.multiplyScalar(0.88);
    if (flash.userData.life <= 0) {
      scene.remove(flash);
      flashes.splice(i, 1);
    }
  }
}

function updateHUD() {
  const bearing = ((THREE.MathUtils.radToDeg(player.mesh.tank.rotation.y) % 360) + 360) % 360;
  hud.innerHTML = `<strong>M4A2 · STEEL FURY</strong><br/>Mode ${mode.view.toUpperCase()} · Ammo ${player.ammoType} · Reload ${player.reload <= 0 ? "READY" : `${player.reload.toFixed(1)}s`}<br/>HP ${player.hp.toFixed(0)} · Enemy ${enemy.hp.toFixed(0)} · AI ${enemy.ai.state.toUpperCase()}`;
  compass.textContent = `Bearing ${bearing.toFixed(0)}° · Turret ${THREE.MathUtils.radToDeg(player.mesh.turretPivot.rotation.y).toFixed(0)}°`;
  status.textContent = `SPD ${Math.abs(player.velocity).toFixed(1)} m/s | ENG ${player.modules.engine.toFixed(0)}% | GUN ${player.modules.gun.toFixed(0)}% | STAB ${control.stabilizer ? "ON" : "OFF"}`;
  rangefinderEl.textContent = rangeMeters === null ? "LASER ---- m" : `LASER ${rangeMeters.toFixed(0)} m`;
  const events = document.getElementById("events");
  events.textContent = notification;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  player.reload = Math.max(0, player.reload - dt);
  enemy.reload = Math.max(0, enemy.reload - dt);

  // Player movement.
  const steer = (keys.has("KeyA") ? 1 : 0) + (keys.has("KeyD") ? -1 : 0);
  const throttle = (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);

  if (!player.destroyed && player.modules.engine > 0) {
    const hpPerTon = player.vehicle.horsepower / player.vehicle.massTons;
    const acceleration = THREE.MathUtils.clamp(hpPerTon * 0.11, 1.2, 3.0);
    player.enginePower += (throttle - player.enginePower) * Math.min(1, dt * 2.2);
    const targetSpeed = player.enginePower >= 0
      ? player.enginePower * player.vehicle.maxForwardSpeed
      : player.enginePower * player.vehicle.maxReverseSpeed;
    const speedDelta = targetSpeed - player.velocity;
    const decel = Math.abs(targetSpeed) < Math.abs(player.velocity) ? player.vehicle.brakeDecel : acceleration;
    const maxSpeedStep = decel * dt;
    player.velocity += THREE.MathUtils.clamp(speedDelta, -maxSpeedStep, maxSpeedStep);
    if (Math.abs(throttle) < 0.01) {
      player.velocity += THREE.MathUtils.clamp(-player.velocity, -player.vehicle.brakeDecel * dt * 0.55, player.vehicle.brakeDecel * dt * 0.55);
    }

    let steerInput = steer;
    if (control.driveAssist && !mode.freeLook && Math.abs(throttle) > 0.1) {
      const desiredHullYaw = aim.cameraYaw;
      const hullError = Math.atan2(Math.sin(desiredHullYaw - player.mesh.tank.rotation.y), Math.cos(desiredHullYaw - player.mesh.tank.rotation.y));
      steerInput += THREE.MathUtils.clamp(hullError * 1.7, -1, 1);
    }
    const speedFactor = THREE.MathUtils.clamp(Math.abs(player.velocity) / player.vehicle.maxForwardSpeed, 0, 1);
    const turnAuthority = THREE.MathUtils.lerp(1.1, 0.32, speedFactor);
    player.mesh.tank.rotation.y += steerInput * dt * player.vehicle.turnRate * turnAuthority;

    if (Math.abs(player.velocity) > 0.02) {
      const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.tank.rotation.y);
      player.mesh.tank.position.addScaledVector(dir, player.velocity * dt);
      resolveTankObstacleCollision(player.mesh.tank.position);
    } else {
      player.velocity = 0;
    }
  }

  player.mesh.tank.position.x = THREE.MathUtils.clamp(player.mesh.tank.position.x, -FIELD_SIZE * 0.45, FIELD_SIZE * 0.45);
  player.mesh.tank.position.z = THREE.MathUtils.clamp(player.mesh.tank.position.z, -FIELD_SIZE * 0.45, FIELD_SIZE * 0.45);
  player.mesh.tank.position.y = terrainHeightAt(player.mesh.tank.position.x, player.mesh.tank.position.z);

  updateEnemyAI(dt);
  enemy.mesh.tank.position.y = terrainHeightAt(enemy.mesh.tank.position.x, enemy.mesh.tank.position.z);
  updateTankTransform(player, dt);
  updateTankTransform(enemy, dt);
  updateCamera(dt);
  updateShells(dt);
  updateFlashes(dt);
  updateBurningWrecks(dt);
  updateHUD();
  if (hitCam.active) {
    hitCam.ttl -= dt;
    if (hitCam.ttl <= 0) {
      hitCam.active = false;
      hitCamEl.style.display = "none";
      hitCamText.textContent = "";
    }
  }
  renderHitCam();

  renderer.render(scene, camera);
}

animate();
