/**
 * gui/js/scene_studio.js — 3D Arena & Scene Builder with .bob and .cob Asset Pipeline
 */

import { state } from './state.js';
import { showToast, switchStudioTab } from './main.js';
import { parseBobToArray, parseCobToArray, buildThreeGeometry } from './bob_cob_parser.js';
import { setStudioCode, getStudioCode, validateStudioCode } from './code_studio.js';

export function initScene3D() {
  const container = document.getElementById('scene-canvas-container');
  if (!container || !window.THREE) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  const scene = new window.THREE.Scene();
  scene.background = new window.THREE.Color(0x0a0b0e);

  const camera = new window.THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 18, 24);

  const renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  let controls = null;
  if (window.THREE.OrbitControls) {
    controls = new window.THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, 0);
  }

  // Lighting
  const ambientLight = new window.THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new window.THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(12, 25, 15);
  scene.add(dirLight);

  state.scene3d.scene = scene;
  state.scene3d.camera = camera;
  state.scene3d.renderer = renderer;
  state.scene3d.controls = controls;

  // Build Default Arena Base
  buildArenaMesh('diorama');

  // Add Initial Nodes
  addSceneNode('spawn', 1, -4.5, 2.5, 0);
  addSceneNode('spawn', 2, 4.5, 2.5, 0);
  addSceneNode('flag', 1, -6.5, 2.5, 0);
  addSceneNode('flag', 2, 6.5, 2.5, 0);
  addSceneNode('powerup', 1, 0, 3.2, 0);

  // Animation Loop
  function animate() {
    state.scene3d.animationId = requestAnimationFrame(animate);
    if (controls) controls.update();

    state.scene3d.nodes.forEach(node => {
      if (node.type === 'powerup' && node.mesh) {
        node.mesh.rotation.y += 0.015;
      }
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', resizeSceneCanvas);

  // Setup drag-and-drop file listener for .bob and .cob files onto the 3D viewport
  setupDragAndDrop(container);
}

export function resizeSceneCanvas() {
  const container = document.getElementById('scene-canvas-container');
  if (!container || !state.scene3d.renderer || !state.scene3d.camera) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width === 0 || height === 0) return;

  state.scene3d.camera.aspect = width / height;
  state.scene3d.camera.updateProjectionMatrix();
  state.scene3d.renderer.setSize(width, height);
}

export function buildArenaMesh(preset) {
  const scene = state.scene3d.scene;
  if (!scene) return;

  if (state.scene3d.arenaMesh) {
    scene.remove(state.scene3d.arenaMesh);
    state.scene3d.arenaMesh = null;
  }

  const group = new window.THREE.Group();

  if (preset === 'diorama') {
    const geom = new window.THREE.BoxGeometry(18, 1.8, 12);
    const mat = new window.THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.7, metalness: 0.1 });
    const box = new window.THREE.Mesh(geom, mat);
    box.position.y = 0.9;
    group.add(box);

    const grid = new window.THREE.GridHelper(16, 16, 0x4a5568, 0x1f2433);
    grid.position.y = 1.82;
    group.add(grid);
  } else if (preset === 'rampage') {
    const geom = new window.THREE.CylinderGeometry(9, 6, 2.5, 6);
    const mat = new window.THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.8 });
    const cyl = new window.THREE.Mesh(geom, mat);
    cyl.position.y = 1.25;
    group.add(cyl);

    const grid = new window.THREE.GridHelper(12, 12, 0x4a5568, 0x1f2433);
    grid.position.y = 2.52;
    group.add(grid);
  } else if (preset === 'football') {
    const geom = new window.THREE.BoxGeometry(22, 1.2, 14);
    const mat = new window.THREE.MeshStandardMaterial({ color: 0x142e20, roughness: 0.8 });
    const pitch = new window.THREE.Mesh(geom, mat);
    pitch.position.y = 0.6;
    group.add(pitch);

    const grid = new window.THREE.GridHelper(20, 10, 0xffffff, 0x244230);
    grid.position.y = 1.22;
    group.add(grid);
  } else if (preset === 'crag') {
    const geom = new window.THREE.BoxGeometry(16, 1.5, 16);
    const mat = new window.THREE.MeshStandardMaterial({ color: 0x1b1c24, roughness: 0.9 });
    const base = new window.THREE.Mesh(geom, mat);
    base.position.y = 0.75;
    group.add(base);

    const grid = new window.THREE.GridHelper(14, 14, 0x4a5568, 0x22232e);
    grid.position.y = 1.52;
    group.add(grid);
  }

  // Infinite Death Plane Ring
  const ringGeom = new window.THREE.RingGeometry(18, 18.2, 32);
  const ringMat = new window.THREE.MeshBasicMaterial({ color: 0x4b5563, side: window.THREE.DoubleSide });
  const ring = new window.THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  scene.add(group);
  state.scene3d.arenaMesh = group;
}

export function changeArenaPreset(preset) {
  state.scene3d.currentPreset = preset;
  buildArenaMesh(preset);
  showToast(`Loaded arena preset: ${preset}`);
}

/**
 * Loads a user-provided .bob or .cob file into the 3D scene.
 */
export async function loadCustomAssetFile(file) {
  const name = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  try {
    let parsed = null;
    let isCollision = false;

    if (name.endsWith('.cob')) {
      parsed = parseCobToArray(arrayBuffer);
      isCollision = true;
    } else if (name.endsWith('.bob')) {
      parsed = parseBobToArray(arrayBuffer);
    } else {
      showToast('Please select a valid .bob or .cob file.');
      return;
    }

    renderParsedAsset(parsed, file.name, isCollision);
  } catch (err) {
    showToast(`Failed to parse asset: ${err.message}`);
  }
}

/**
 * Loads the built-in sample .bob or .cob model from the backend.
 */
export async function loadSampleAsset(type = 'bob') {
  try {
    showToast(`Loading sample .${type} model...`);
    const res = await fetch(`/api/studio/sample-asset?type=${type}`);
    const data = await res.json();
    renderParsedAsset(data, `sample_${type}.${type}`, type === 'cob');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

function renderParsedAsset(parsed, filename, isCollision = false) {
  const scene = state.scene3d.scene;
  if (!scene) return;

  if (state.scene3d.importedMesh) {
    scene.remove(state.scene3d.importedMesh);
    state.scene3d.importedMesh = null;
  }

  const geometry = buildThreeGeometry(parsed);
  if (!geometry) return;

  let material = null;
  if (isCollision) {
    // Collision hull: Wireframe or semi-transparent
    material = new window.THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
  } else {
    // Visual model: Smooth shaded
    material = new window.THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.5,
      metalness: 0.2,
      side: window.THREE.DoubleSide,
    });
  }

  const mesh = new window.THREE.Mesh(geometry, material);
  mesh.position.set(0, 2.0, 0);

  scene.add(mesh);
  state.scene3d.importedMesh = mesh;

  showToast(`Rendered 3D ${isCollision ? 'Collision Hull (.cob)' : 'Model (.bob)'}: ${filename} (${parsed.vertex_count} vertices, ${parsed.face_count} faces)`);
}

function setupDragAndDrop(container) {
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadCustomAssetFile(e.dataTransfer.files[0]);
    }
  });
}

export function addSceneNode(type, team = 1, x = 0, y = 2.5, z = 0) {
  const scene = state.scene3d.scene;
  if (!scene) return;

  state.scene3d.nodeCounter[type] = (state.scene3d.nodeCounter[type] || 0) + 1;
  const count = state.scene3d.nodeCounter[type];

  let id = '';
  let color = 0x94a3b8;
  let title = '';

  if (type === 'spawn') {
    id = `spawn${team}`;
    color = team === 1 ? 0x60a5fa : 0xf87171;
    title = `Team ${team} Spawn (${id})`;
  } else if (type === 'spawn_ffa') {
    id = `spawn_ffa_${count}`;
    color = 0xfbbf24;
    title = `FFA Spawn (${id})`;
  } else if (type === 'flag') {
    id = `flag${team}`;
    color = team === 1 ? 0x38bdf8 : 0xfb7185;
    title = `Team ${team} Flag (${id})`;
  } else if (type === 'powerup') {
    id = `powerup${count}`;
    color = 0x34d399;
    title = `Powerup Box (${id})`;
  }

  const group = new window.THREE.Group();
  group.position.set(x, y, z);

  if (type === 'spawn' || type === 'spawn_ffa') {
    const padGeom = new window.THREE.CylinderGeometry(0.7, 0.7, 0.12, 16);
    const padMat = new window.THREE.MeshStandardMaterial({ color, metalness: 0.2 });
    const pad = new window.THREE.Mesh(padGeom, padMat);
    group.add(pad);

    const diamondGeom = new window.THREE.OctahedronGeometry(0.35, 0);
    const diamondMat = new window.THREE.MeshBasicMaterial({ color, wireframe: true });
    const diamond = new window.THREE.Mesh(diamondGeom, diamondMat);
    diamond.position.y = 0.9;
    group.add(diamond);
  } else if (type === 'flag') {
    const poleGeom = new window.THREE.CylinderGeometry(0.05, 0.05, 2.0, 8);
    const poleMat = new window.THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const pole = new window.THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 1.0;
    group.add(pole);

    const bannerGeom = new window.THREE.PlaneGeometry(0.7, 0.45);
    const bannerMat = new window.THREE.MeshStandardMaterial({ color, side: window.THREE.DoubleSide });
    const banner = new window.THREE.Mesh(bannerGeom, bannerMat);
    banner.position.set(0.35, 1.6, 0);
    group.add(banner);
  } else if (type === 'powerup') {
    const boxGeom = new window.THREE.BoxGeometry(0.75, 0.75, 0.75);
    const boxMat = new window.THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
    const box = new window.THREE.Mesh(boxGeom, boxMat);
    box.position.y = 0.45;
    group.add(box);
  }

  scene.add(group);

  const nodeData = {
    id,
    type,
    team,
    title,
    color,
    position: { x, y, z },
    mesh: group,
  };
  state.scene3d.nodes.push(nodeData);

  renderSceneInspector();
  updatePythonCoordinatesOutput();
}

export function renderSceneInspector() {
  const container = document.getElementById('scene-nodes-list');
  const countEl = document.getElementById('scene-node-count');
  if (!container) return;

  const nodes = state.scene3d.nodes;
  if (countEl) countEl.textContent = `${nodes.length} nodes`;

  if (nodes.length === 0) {
    container.innerHTML = `
      <div class="empty-node-state">
        <p>No nodes placed yet.</p>
        <span class="dim">Add spawns, flags, or drop a .bob model above.</span>
      </div>`;
    return;
  }

  container.innerHTML = '';
  nodes.forEach((node, index) => {
    const card = document.createElement('div');
    card.className = 'node-item-card';
    card.innerHTML = `
      <div class="node-item-top">
        <div class="node-item-title">
          <span>${node.title}</span>
        </div>
        <button class="btn btn-xs btn-ghost" onclick="window.BS_SceneStudio.removeSceneNode(${index})">✕</button>
      </div>
      <div class="node-coords-inputs">
        <div class="coord-box">
          <span class="coord-label">X</span>
          <input type="number" step="0.1" class="coord-val" value="${node.position.x.toFixed(1)}" onchange="window.BS_SceneStudio.updateNodeCoord(${index}, 'x', this.value)">
        </div>
        <div class="coord-box">
          <span class="coord-label">Y</span>
          <input type="number" step="0.1" class="coord-val" value="${node.position.y.toFixed(1)}" onchange="window.BS_SceneStudio.updateNodeCoord(${index}, 'y', this.value)">
        </div>
        <div class="coord-box">
          <span class="coord-label">Z</span>
          <input type="number" step="0.1" class="coord-val" value="${node.position.z.toFixed(1)}" onchange="window.BS_SceneStudio.updateNodeCoord(${index}, 'z', this.value)">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

export function updateNodeCoord(index, axis, val) {
  const node = state.scene3d.nodes[index];
  if (!node) return;
  const num = parseFloat(val) || 0;
  node.position[axis] = num;
  if (node.mesh) {
    node.mesh.position[axis] = num;
  }
  updatePythonCoordinatesOutput();
}

export function removeSceneNode(index) {
  const node = state.scene3d.nodes[index];
  if (node && node.mesh && state.scene3d.scene) {
    state.scene3d.scene.remove(node.mesh);
  }
  state.scene3d.nodes.splice(index, 1);
  renderSceneInspector();
  updatePythonCoordinatesOutput();
}

export function clearAllSceneNodes() {
  if (state.scene3d.scene) {
    state.scene3d.nodes.forEach(n => {
      if (n.mesh) state.scene3d.scene.remove(n.mesh);
    });
    if (state.scene3d.importedMesh) {
      state.scene3d.scene.remove(state.scene3d.importedMesh);
      state.scene3d.importedMesh = null;
    }
  }
  state.scene3d.nodes = [];
  renderSceneInspector();
  updatePythonCoordinatesOutput();
  showToast('Cleared 3D viewport');
}

export function resetSceneCamera() {
  if (state.scene3d.camera && state.scene3d.controls) {
    state.scene3d.camera.position.set(0, 18, 24);
    state.scene3d.controls.target.set(0, 2, 0);
    state.scene3d.controls.update();
  }
}

export function generatePythonDict() {
  const lines = ['# Ballistica Map point definitions (bascenev1.Map)', 'point_defs = {'];
  state.scene3d.nodes.forEach(n => {
    lines.push(`    '${n.id}': (${n.position.x.toFixed(2)}, ${n.position.y.toFixed(2)}, ${n.position.z.toFixed(2)}),`);
  });
  lines.push('}');
  return lines.join('\n');
}

export function updatePythonCoordinatesOutput() {
  const preview = document.getElementById('scene-python-output');
  if (preview) {
    preview.textContent = generatePythonDict();
  }
}

export function copySceneCoordinates() {
  const code = generatePythonDict();
  navigator.clipboard.writeText(code).then(() => {
    showToast('Copied coordinates to clipboard.');
  }).catch(() => {
    showToast('Could not copy.');
  });
}

export function sendCoordinatesToCodeStudio() {
  const code = generatePythonDict();
  switchStudioTab('tab-code');

  const currentCode = getStudioCode();
  const insertIndex = currentCode.indexOf('class ');
  let newCode = '';

  if (insertIndex !== -1) {
    newCode = currentCode.slice(0, insertIndex) + code + '\n\n' + currentCode.slice(insertIndex);
  } else {
    newCode = currentCode + '\n\n' + code + '\n';
  }

  setStudioCode(newCode);
  showToast('Coordinates pasted into Code Studio.');
  validateStudioCode();
}
