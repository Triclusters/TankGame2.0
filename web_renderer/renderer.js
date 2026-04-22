import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const FIELD_SIZE = 280;
const GRAVITY = 9.81;
const FLAK_88_MUZZLE_VELOCITY = {
  AP: 820,
  HE: 840,
};
const SHELL_PEN_MM = {
  AP: [
    [0, 185],
    [500, 170],
    [1000, 150],
    [1500, 130],
    [2000, 115],
  ],
  HE: [
    [0, 38],
    [500, 32],
    [1000, 26],
    [1500, 22],
    [2000, 18],
  ],
};
const VEHICLE_PROFILES = {
  M4A2: {
    armor: {
      hull_front: { thickness: 63, slopeDeg: 47, normal: new THREE.Vector3(0, 0, 1) },
      hull_side: { thickness: 38, slopeDeg: 0, normal: new THREE.Vector3(1, 0, 0) },
      hull_rear: { thickness: 38, slopeDeg: 8, normal: new THREE.Vector3(0, 0, -1) },
      turret_front: { thickness: 76, slopeDeg: 10, normal: new THREE.Vector3(0, 0, 1) },
      turret_side: { thickness: 50, slopeDeg: 0, normal: new THREE.Vector3(1, 0, 0) },
      turret_rear: { thickness: 50, slopeDeg: 0, normal: new THREE.Vector3(0, 0, -1) },
    },
    modules: [
      { key: "engine", center: new THREE.Vector3(0, 1.1, -2.2), radius: 1.0 },
      { key: "crew", center: new THREE.Vector3(0, 1.45, -0.2), radius: 0.95 },
      { key: "turret", center: new THREE.Vector3(0, 2.0, 0), radius: 1.0 },
      { key: "gun", center: new THREE.Vector3(0, 2.1, 1.55), radius: 0.62 },
    ],
  },
  PANTHER_D: {
    armor: {
      hull_front: { thickness: 80, slopeDeg: 55, normal: new THREE.Vector3(0, 0, 1) },
      hull_side: { thickness: 45, slopeDeg: 0, normal: new THREE.Vector3(1, 0, 0) },
      hull_rear: { thickness: 40, slopeDeg: 8, normal: new THREE.Vector3(0, 0, -1) },
      turret_front: { thickness: 100, slopeDeg: 12, normal: new THREE.Vector3(0, 0, 1) },
      turret_side: { thickness: 45, slopeDeg: 0, normal: new THREE.Vector3(1, 0, 0) },
      turret_rear: { thickness: 45, slopeDeg: 0, normal: new THREE.Vector3(0, 0, -1) },
    },
    modules: [
      { key: "engine", center: new THREE.Vector3(0, 1.1, -2.25), radius: 1.0 },
      { key: "crew", center: new THREE.Vector3(0, 1.45, -0.15), radius: 1.0 },
      { key: "turret", center: new THREE.Vector3(0, 2.0, 0), radius: 1.05 },
      { key: "gun", center: new THREE.Vector3(0, 2.05, 1.7), radius: 0.65 },
    ],
  },
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

function makeState(mesh, isPlayer = false, vehicleType = "M4A2") {
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
    vehicleType,
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
      underFireTimer: 0,
      lastSeenPlayerPos: null,
      lastPosition: mesh.tank.position.clone(),
      stuckTimer: 0,
      repathTimer: 0,
    },
  };
}

const player = makeState(playerMesh, true, "M4A2");
const enemy = makeState(enemyMesh, false, "PANTHER_D");

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
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
const terrainPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cursorAimPoint = new THREE.Vector3();
let dragLook = false;

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

function penAtDistance(ammoType, distanceMeters) {
  const table = SHELL_PEN_MM[ammoType] || SHELL_PEN_MM.AP;
  const d = THREE.MathUtils.clamp(distanceMeters, table[0][0], table[table.length - 1][0]);
  for (let i = 0; i < table.length - 1; i += 1) {
    const [d0, p0] = table[i];
    const [d1, p1] = table[i + 1];
    if (d >= d0 && d <= d1) {
      const t = (d - d0) / Math.max(0.0001, d1 - d0);
      return THREE.MathUtils.lerp(p0, p1, t);
    }
  }
  return table[table.length - 1][1];
}

function classifyArmorZone(target, impactPointWorld, incomingDirWorld) {
  const profile = VEHICLE_PROFILES[target.vehicleType] || VEHICLE_PROFILES.M4A2;
  const impactLocal = target.mesh.tank.worldToLocal(impactPointWorld.clone());
  const localIncoming = incomingDirWorld.clone().applyQuaternion(target.mesh.tank.quaternion.clone().invert()).normalize();
  const shooterLocal = localIncoming.clone().multiplyScalar(-1);
  const sideBias = Math.abs(shooterLocal.x) > Math.abs(shooterLocal.z);
  const rear = shooterLocal.z < -0.25 && !sideBias;
  const front = shooterLocal.z > 0.25 && !sideBias;
  const turretHit = impactLocal.y > 1.72;
  let zone = "hull_front";
  if (turretHit) {
    if (rear) zone = "turret_rear";
    else if (front) zone = "turret_front";
    else zone = "turret_side";
  } else if (rear) zone = "hull_rear";
  else if (front) zone = "hull_front";
  else zone = "hull_side";
  return { zone, armor: profile.armor[zone], impactLocal, localIncoming };
}

function closestModuleOnRay(target, impactLocal, localIncoming, penetrated) {
  const profile = VEHICLE_PROFILES[target.vehicleType] || VEHICLE_PROFILES.M4A2;
  const rayStart = impactLocal.clone().addScaledVector(localIncoming, penetrated ? 0.18 : 0.05);
  const maxDist = penetrated ? 4.8 : 1.6;
  const rayEnd = rayStart.clone().addScaledVector(localIncoming, maxDist);
  let best = null;
  let bestDist = Infinity;
  for (const module of profile.modules) {
    const seg = rayEnd.clone().sub(rayStart);
    const denom = Math.max(0.0001, seg.lengthSq());
    const t = THREE.MathUtils.clamp(module.center.clone().sub(rayStart).dot(seg) / denom, 0, 1);
    const nearest = rayStart.clone().addScaledVector(seg, t);
    const d = nearest.distanceTo(module.center);
    if (d <= module.radius && d < bestDist) {
      bestDist = d;
      best = module.key;
    }
  }
  return best;
}

function applyDamage(target, shell) {
  const shotDistance = shell.distanceMeters ?? target.mesh.tank.position.distanceTo(shell.shooter.mesh.tank.position);
  const shellPen = penAtDistance(shell.ammoType, shotDistance);
  const incomingDir = shell.directionWorld.clone().normalize();
  const impactPoint = shell.impactPointWorld.clone();
  const { zone, armor, impactLocal, localIncoming } = classifyArmorZone(target, impactPoint, incomingDir);
  const zoneNormalWorld = armor.normal.clone().applyQuaternion(target.mesh.tank.quaternion).normalize();
  const slopeFactor = 1 / Math.max(0.1, Math.cos(THREE.MathUtils.degToRad(armor.slopeDeg)));
  const angleFactor = 1 / Math.max(0.16, -incomingDir.dot(zoneNormalWorld));
  const effectiveArmor = armor.thickness * slopeFactor * angleFactor;
  const penetrated = shellPen >= effectiveArmor;
  const impact = penetrated
    ? (shell.ammoType === "HE" ? 18 : 34)
    : (shell.ammoType === "HE" ? 7 : 4);
  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - impact);

  const defaultModuleByZone = zone.includes("rear")
    ? "engine"
    : zone.includes("turret")
      ? "turret"
      : "crew";
  const hitModule = closestModuleOnRay(target, impactLocal, localIncoming, penetrated) || defaultModuleByZone;
  const moduleDamage = penetrated
    ? (shell.ammoType === "HE" ? 24 : 34)
    : (shell.ammoType === "HE" ? 8 : 5);
  const moduleBefore = target.modules[hitModule];
  target.modules[hitModule] = Math.max(0, target.modules[hitModule] - moduleDamage);
  notification = `${target.isPlayer ? "You were hit" : "Enemy hit"}: ${zone.toUpperCase()} ${penetrated ? "PEN" : "BLOCK"} · ${hitModule.toUpperCase()} -${moduleDamage.toFixed(0)}`;

  if (!target.isPlayer && shell.shooter?.isPlayer) {
    target.ai.underFireTimer = 3.5;
    target.ai.lastSeenPlayerPos = shell.shooter.mesh.tank.position.clone();
  }

  if (target.modules.crew <= 0 || target.hp <= 0) target.destroyed = true;
  if (target.destroyed) notification = target.isPlayer ? "Player knocked out." : "Target destroyed.";

  return {
    penetrated,
    hpDamage: Math.max(0, hpBefore - target.hp),
    module: hitModule,
    moduleDamage: Math.max(0, moduleBefore - target.modules[hitModule]),
    destroyed: target.destroyed,
    ammoType: shell.ammoType,
    armorZone: zone,
    effectiveArmor: Math.round(effectiveArmor),
    shellPen: Math.round(shellPen),
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
  hitCamText.textContent = `${report.ammoType} ${report.penetrated ? "PEN" : "NON-PEN"} · ${report.armorZone.toUpperCase()} ${report.shellPen}/${report.effectiveArmor}mm · ${report.module.toUpperCase()} -${report.moduleDamage} · HP -${report.hpDamage}${report.destroyed ? " · TARGET DESTROYED" : ""}`;
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
  hitCamCtx.fillText(`${r.penetrated ? "PEN" : "NON-PEN"} ${r.shellPen}/${r.effectiveArmor}mm`, 202, 30);
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
  shooter.reload = shooter.ammoType === "HE" ? 5.0 : 4.2;

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

function lineSegmentClear2D(from, to) {
  const segment = to.clone().sub(from);
  const segLenSq = Math.max(segment.lengthSq(), 0.0001);
  for (const obstacle of obstacles) {
    const center = new THREE.Vector3(obstacle.x, 0, obstacle.z);
    const toCenter = center.sub(from);
    const t = THREE.MathUtils.clamp(toCenter.dot(segment) / segLenSq, 0, 1);
    const nearest = from.clone().addScaledVector(segment, t);
    const dx = nearest.x - obstacle.x;
    const dz = nearest.z - obstacle.z;
    const clearance = obstacle.radius + 0.6;
    if ((dx * dx) + (dz * dz) < clearance * clearance) return false;
  }
  return true;
}

function scoreCoverPoint(point, fromPosition, playerPosition) {
  const toPoint = point.distanceTo(fromPosition);
  const fromPlayer = point.distanceTo(playerPosition);
  const hasMask = lineSegmentClear2D(playerPosition, point) ? 0 : 1;
  return (hasMask * 70) + THREE.MathUtils.clamp(fromPlayer * 0.25, 0, 26) - THREE.MathUtils.clamp(toPoint * 0.9, 0, 40);
}

function bestCoverPoint(fromPosition, playerPosition) {
  let bestPoint = nearestCover(fromPosition);
  let bestScore = -Infinity;
  for (const point of COVER_POINTS) {
    const score = scoreCoverPoint(point, fromPosition, playerPosition);
    if (score > bestScore) {
      bestScore = score;
      bestPoint = point;
    }
  }
  return bestPoint.clone();
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
  const enemyPos = enemy.mesh.tank.position;
  const playerPos = player.mesh.tank.position;
  const dist = enemyPos.distanceTo(playerPos);
  enemy.ai.decisionCooldown -= dt;
  enemy.ai.fireTimer -= dt;
  enemy.ai.repathTimer -= dt;
  enemy.ai.underFireTimer = Math.max(0, enemy.ai.underFireTimer - dt);

  const movedDist = enemyPos.distanceTo(enemy.ai.lastPosition);
  if (movedDist < 0.15 && enemy.ai.state !== "snipe") {
    enemy.ai.stuckTimer += dt;
  } else {
    enemy.ai.stuckTimer = Math.max(0, enemy.ai.stuckTimer - dt * 1.5);
  }
  enemy.ai.lastPosition.copy(enemyPos);

  if (lineSegmentClear2D(enemyPos, playerPos)) {
    enemy.ai.lastSeenPlayerPos = playerPos.clone();
  }

  const lowHp = enemy.hp < 45 || enemy.modules.engine < 35;
  const underPressure = enemy.ai.underFireTimer > 0.1 || enemy.modules.turret < 55 || enemy.modules.gun < 60;
  const needRepath = enemy.ai.stuckTimer > 1.1 || (enemy.ai.repathTimer <= 0 && enemy.ai.state === "cover" && movedDist < 0.05);

  if (enemy.ai.decisionCooldown <= 0) {
    enemy.ai.decisionCooldown = THREE.MathUtils.randFloat(1.2, 2.0);

    if (lowHp || underPressure) {
      enemy.ai.state = "cover";
      enemy.ai.destination = bestCoverPoint(enemyPos, playerPos);
      enemy.ai.aimError = underPressure ? 0.1 : 0.085;
    } else if (dist > 70) {
      enemy.ai.state = "push";
      const trackedPos = enemy.ai.lastSeenPlayerPos || playerPos;
      enemy.ai.destination = trackedPos.clone().add(new THREE.Vector3(THREE.MathUtils.randFloat(-16, 16), 0, THREE.MathUtils.randFloat(-16, 16)));
      enemy.ai.aimError = dist > 95 ? 0.09 : 0.07;
    } else {
      enemy.ai.state = "snipe";
      enemy.ai.destination = enemyPos.clone();
      enemy.ai.aimError = dist < 45 ? 0.03 : 0.05;
    }
  }

  if (needRepath) {
    enemy.ai.stuckTimer = 0;
    enemy.ai.repathTimer = THREE.MathUtils.randFloat(1.2, 2.2);
    if (enemy.ai.state === "cover") {
      enemy.ai.destination = bestCoverPoint(enemyPos, playerPos);
    } else {
      const trackedPos = enemy.ai.lastSeenPlayerPos || playerPos;
      enemy.ai.destination = trackedPos.clone().add(new THREE.Vector3(THREE.MathUtils.randFloat(-10, 10), 0, THREE.MathUtils.randFloat(-10, 10)));
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
  const toPlayer = playerPos.clone().sub(enemyPos);
  const playerForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.tank.rotation.y);
  const predicted = playerPos.clone().addScaledVector(playerForward, player.velocity * 0.28);
  const toPredicted = predicted.sub(enemyPos);
  const desiredTurret = Math.atan2(toPredicted.x, toPredicted.z) - enemy.mesh.tank.rotation.y;
  enemy.turretYawTarget = desiredTurret;
  enemy.gunPitchTarget = THREE.MathUtils.clamp(0.03 + toPlayer.length() * 0.0004, -0.1, 0.16);

  const turretError = Math.abs(wrapAngle(enemy.turretYawTarget - enemy.mesh.turretPivot.rotation.y));
  const canShoot = turretError < THREE.MathUtils.degToRad(4.5);
  const hasLOS = lineSegmentClear2D(enemyPos, playerPos);
  if (enemy.ai.fireTimer <= 0 && dist < 135 && enemy.modules.gun > 0 && canShoot && hasLOS) {
    enemy.ai.fireTimer = THREE.MathUtils.randFloat(1.8, 3.4);
    fireMainGun(enemy, player, enemy.ai.aimError + (enemy.ai.underFireTimer > 0 ? 0.02 : 0));
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
  if (e.button === 1) dragLook = true;
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 2) {
    mode.holdZoom = false;
    if (mode.view === "gunner") setMode("third");
  }
  if (e.button === 1) dragLook = false;
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
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (document.pointerLockElement === renderer.domElement || dragLook) {
    const yawDelta = e.movementX * 0.0024;
    const pitchDelta = e.movementY * 0.0017;
    aim.cameraYaw -= yawDelta;
    aim.cameraPitch = THREE.MathUtils.clamp(aim.cameraPitch - pitchDelta, -0.3, 0.58);
  }
});

renderer.domElement.addEventListener("click", () => renderer.domElement.requestPointerLock());
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


function updatePlayerAimFromCursor() {
  if (player.destroyed || player.modules.gun <= 0) return;

  raycaster.setFromCamera(mouseNDC, camera);
  const hit = raycaster.ray.intersectPlane(terrainPlane, cursorAimPoint);
  if (!hit) return;

  const turretWorldPos = player.mesh.turretPivot.getWorldPosition(new THREE.Vector3());
  const toAimWorld = cursorAimPoint.clone().sub(turretWorldPos);
  if (toAimWorld.lengthSq() < 0.0001) return;

  const tankLocalDir = toAimWorld.clone().applyQuaternion(
    player.mesh.tank.getWorldQuaternion(new THREE.Quaternion()).invert()
  );
  player.turretYawTarget = wrapAngle(Math.atan2(tankLocalDir.x, tankLocalDir.z));

  const turretQuat = player.mesh.turretPivot.getWorldQuaternion(new THREE.Quaternion());
  const turretLocalDir = toAimWorld.applyQuaternion(turretQuat.invert());
  const horizontal = Math.max(0.001, Math.hypot(turretLocalDir.x, turretLocalDir.z));
  const desiredPitch = -Math.atan2(turretLocalDir.y, horizontal);
  player.gunPitchTarget = THREE.MathUtils.clamp(desiredPitch, -0.16, 0.28);
}

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
  const orbitYaw = aim.cameraYaw;
  const velocityOffset = THREE.MathUtils.clamp(-player.velocity * 0.35, -2.2, 2.2);
  const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.tank.rotation.y);
  const speedRatio = THREE.MathUtils.clamp(Math.abs(player.velocity) / player.vehicle.maxForwardSpeed, 0, 1);
  const leadDistance = THREE.MathUtils.lerp(0.2, 1.6, speedRatio);
  const orbitRadius = THREE.MathUtils.lerp(7.5, 12.5, aim.zoomStep);
  const orbitElev = THREE.MathUtils.clamp(2.2 + aim.cameraPitch * 5.2, 0.7, 5.5);
  const orbitBack = new THREE.Vector3(Math.sin(orbitYaw), 0, Math.cos(orbitYaw)).multiplyScalar(-orbitRadius);
  const targetCamPos = pivot.clone()
    .add(orbitBack)
    .add(new THREE.Vector3(0, orbitElev, 0))
    .addScaledVector(forward, velocityOffset + leadDistance);
  targetCamPos.y = Math.max(targetCamPos.y, terrainHeightAt(targetCamPos.x, targetCamPos.z) + 0.75);
  const adaptiveLag = THREE.MathUtils.lerp(control.cameraLag, control.cameraLag * 1.9, speedRatio);
  camera.position.lerp(targetCamPos, 1 - Math.exp(-dt * adaptiveLag));
  const lookPoint = pivot
    .clone()
    .addScaledVector(forward, 1.6 + speedRatio * 1.4)
    .add(new THREE.Vector3(0, THREE.MathUtils.clamp(aim.cameraPitch * 2.1, -0.5, 0.9), 0));
  camera.lookAt(lookPoint);
}

function updateShells(dt) {
  for (let i = shells.length - 1; i >= 0; i -= 1) {
    const shell = shells[i];
    shell.userData.life -= dt;
    shell.userData.velocity.y -= shell.userData.gravity * dt;

    const target = shell.userData.target;
    const prevPos = shell.position.clone();
    const nextPos = shell.position.clone().addScaledVector(shell.userData.velocity, dt);
    const targetCenter = target.mesh.tank.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const segment = nextPos.clone().sub(prevPos);
    const segLenSq = Math.max(segment.lengthSq(), 0.0001);
    const t = THREE.MathUtils.clamp(targetCenter.clone().sub(prevPos).dot(segment) / segLenSq, 0, 1);
    const closestPoint = prevPos.clone().addScaledVector(segment, t);

    if (!target.destroyed && closestPoint.distanceTo(targetCenter) < 2.6) {
      const report = applyDamage(target, {
        ammoType: shell.userData.ammoType,
        shooter: shell.userData.shooter,
        distanceMeters: shell.userData.shooter.mesh.tank.position.distanceTo(target.mesh.tank.position),
        directionWorld: shell.userData.velocity.clone().normalize(),
        impactPointWorld: closestPoint.clone(),
      });
      if (shell.userData.shooter?.isPlayer && !target.isPlayer) showHitCam(report);
      if (report.destroyed) createBurningWreck(target);
      scene.remove(shell);
      shells.splice(i, 1);
      continue;
    }

    shell.position.copy(nextPos);
    shell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shell.userData.velocity.clone().normalize());

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
  const camYawInput = (keys.has("ArrowLeft") ? 1 : 0) + (keys.has("ArrowRight") ? -1 : 0);
  const camPitchInput = (keys.has("ArrowUp") ? 1 : 0) + (keys.has("ArrowDown") ? -1 : 0);
  if (camYawInput !== 0 || camPitchInput !== 0) {
    aim.cameraYaw += camYawInput * dt * 1.55;
    aim.cameraPitch = THREE.MathUtils.clamp(aim.cameraPitch + camPitchInput * dt * 1.1, -0.3, 0.58);
  }

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
  updatePlayerAimFromCursor();
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
