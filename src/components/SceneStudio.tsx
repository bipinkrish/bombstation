import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parseBobToArray, parseCobToArray, buildThreeGeometry } from '../services/bobCobParser';
import { api } from '../services/api';

interface SceneStudioProps {
  onSendToCodeStudio: (codeSnippet: string) => void;
  showToast: (msg: string) => void;
}

interface SceneNode {
  id: string;
  type: 'spawn' | 'spawn_ffa' | 'flag' | 'powerup';
  team: number;
  title: string;
  position: { x: number; y: number; z: number };
  mesh: THREE.Group;
}

export const SceneStudio: React.FC<SceneStudioProps> = ({
  onSendToCodeStudio,
  showToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const arenaMeshRef = useRef<THREE.Group | null>(null);
  const importedMeshRef = useRef<THREE.Mesh | null>(null);

  const [preset, setPreset] = useState<'diorama' | 'rampage' | 'football' | 'crag'>('diorama');
  const [nodes, setNodes] = useState<SceneNode[]>([]);
  const nodeCounters = useRef<{ [k: string]: number }>({ spawn: 0, flag: 0, powerup: 0, ffa: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08090c);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(12, 25, 15);
    scene.add(dirLight);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    buildArena(preset);

    // Add initial nodes
    addNode('spawn', 1, -4.5, 2.5, 0);
    addNode('spawn', 2, 4.5, 2.5, 0);
    addNode('flag', 1, -6.5, 2.5, 0);
    addNode('flag', 2, 6.5, 2.5, 0);
    addNode('powerup', 1, 0, 3.2, 0);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const buildArena = (arenaPreset: 'diorama' | 'rampage' | 'football' | 'crag') => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (arenaMeshRef.current) {
      scene.remove(arenaMeshRef.current);
      arenaMeshRef.current = null;
    }

    const group = new THREE.Group();

    if (arenaPreset === 'diorama') {
      const geom = new THREE.BoxGeometry(18, 1.8, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.7, metalness: 0.1 });
      const box = new THREE.Mesh(geom, mat);
      box.position.y = 0.9;
      group.add(box);

      const grid = new THREE.GridHelper(16, 16, 0x4a5568, 0x1f2433);
      grid.position.y = 1.82;
      group.add(grid);
    } else if (arenaPreset === 'rampage') {
      const geom = new THREE.CylinderGeometry(9, 6, 2.5, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.8 });
      const cyl = new THREE.Mesh(geom, mat);
      cyl.position.y = 1.25;
      group.add(cyl);

      const grid = new THREE.GridHelper(12, 12, 0x4a5568, 0x1f2433);
      grid.position.y = 2.52;
      group.add(grid);
    } else if (arenaPreset === 'football') {
      const geom = new THREE.BoxGeometry(22, 1.2, 14);
      const mat = new THREE.MeshStandardMaterial({ color: 0x142e20, roughness: 0.8 });
      const pitch = new THREE.Mesh(geom, mat);
      pitch.position.y = 0.6;
      group.add(pitch);

      const grid = new THREE.GridHelper(20, 10, 0xffffff, 0x244230);
      grid.position.y = 1.22;
      group.add(grid);
    } else if (arenaPreset === 'crag') {
      const geom = new THREE.BoxGeometry(16, 1.5, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1b1c24, roughness: 0.9 });
      const base = new THREE.Mesh(geom, mat);
      base.position.y = 0.75;
      group.add(base);

      const grid = new THREE.GridHelper(14, 14, 0x4a5568, 0x22232e);
      grid.position.y = 1.52;
      group.add(grid);
    }

    const ringGeom = new THREE.RingGeometry(18, 18.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4b5563, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    scene.add(group);
    arenaMeshRef.current = group;
  };

  const handlePresetChange = (newPreset: 'diorama' | 'rampage' | 'football' | 'crag') => {
    setPreset(newPreset);
    buildArena(newPreset);
    showToast(`Loaded arena preset: ${newPreset}`);
  };

  const addNode = (
    type: 'spawn' | 'spawn_ffa' | 'flag' | 'powerup',
    team: number = 1,
    x: number = 0,
    y: number = 2.5,
    z: number = 0
  ) => {
    const scene = sceneRef.current;
    if (!scene) return;

    nodeCounters.current[type] = (nodeCounters.current[type] || 0) + 1;
    const count = nodeCounters.current[type];

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

    const group = new THREE.Group();
    group.position.set(x, y, z);

    if (type === 'spawn' || type === 'spawn_ffa') {
      const padGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 16);
      const padMat = new THREE.MeshStandardMaterial({ color, metalness: 0.2 });
      group.add(new THREE.Mesh(padGeom, padMat));

      const diamondGeom = new THREE.OctahedronGeometry(0.35, 0);
      const diamondMat = new THREE.MeshBasicMaterial({ color, wireframe: true });
      const diamond = new THREE.Mesh(diamondGeom, diamondMat);
      diamond.position.y = 0.9;
      group.add(diamond);
    } else if (type === 'flag') {
      const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 1.0;
      group.add(pole);

      const bannerGeom = new THREE.PlaneGeometry(0.7, 0.45);
      const bannerMat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
      const banner = new THREE.Mesh(bannerGeom, bannerMat);
      banner.position.set(0.35, 1.6, 0);
      group.add(banner);
    } else if (type === 'powerup') {
      const boxGeom = new THREE.BoxGeometry(0.75, 0.75, 0.75);
      const boxMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
      const box = new THREE.Mesh(boxGeom, boxMat);
      box.position.y = 0.45;
      group.add(box);
    }

    scene.add(group);

    const newNode: SceneNode = {
      id,
      type,
      team,
      title,
      position: { x, y, z },
      mesh: group,
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const removeNode = (index: number) => {
    const node = nodes[index];
    if (node && sceneRef.current) {
      sceneRef.current.remove(node.mesh);
    }
    setNodes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateNodeCoord = (index: number, axis: 'x' | 'y' | 'z', val: number) => {
    setNodes((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.position = { ...target.position, [axis]: val };
      target.mesh.position[axis] = val;
      copy[index] = target;
      return copy;
    });
  };

  const renderMesh = (parsed: any, filename: string, isCollision: boolean = false) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (importedMeshRef.current) {
      scene.remove(importedMeshRef.current);
      importedMeshRef.current = null;
    }

    const geometry = buildThreeGeometry(parsed);
    let material: THREE.Material;

    if (isCollision) {
      material = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        roughness: 0.5,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 2.0, 0);
    scene.add(mesh);
    importedMeshRef.current = mesh;

    showToast(
      `Rendered ${isCollision ? '.cob Collision Hull' : '.bob Model'}: ${filename} (${parsed.vertex_count} vertices, ${parsed.face_count} faces)`
    );
  };

  const handleFileUpload = async (file: File) => {
    const name = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    try {
      if (name.endsWith('.cob')) {
        const parsed = parseCobToArray(arrayBuffer);
        renderMesh(parsed, file.name, true);
      } else if (name.endsWith('.bob')) {
        const parsed = parseBobToArray(arrayBuffer);
        renderMesh(parsed, file.name, false);
      } else {
        showToast('Please select a valid .bob or .cob file.');
      }
    } catch (err: any) {
      showToast(`Parse error: ${err.message}`);
    }
  };

  const loadSample = async (type: 'bob' | 'cob') => {
    showToast(`Loading sample .${type}...`);
    try {
      const data = await api.getSampleAsset(type);
      renderMesh(data, `sample_${type}.${type}`, type === 'cob');
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const generatePythonDict = () => {
    const lines = ['# Ballistica Map point definitions (bascenev1.Map)', 'point_defs = {'];
    nodes.forEach((n) => {
      lines.push(
        `    '${n.id}': (${n.position.x.toFixed(2)}, ${n.position.y.toFixed(2)}, ${n.position.z.toFixed(2)}),`
      );
    });
    lines.push('}');
    return lines.join('\n');
  };

  return (
    <div className="scene-studio-container">
      <div className="scene-canvas-container">
        <div ref={containerRef} className="scene-three-viewport" />

        {/* Frosted Glass Floating HUD */}
        <div className="scene-floating-hud">
          <div className="hud-group">
            <span className="hud-label">Arena</span>
            <select
              className="macos-toolbar-select mini"
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as any)}
            >
              <option value="diorama">Diorama Base</option>
              <option value="rampage">Floating Rock</option>
              <option value="football">Stadium Pitch</option>
              <option value="crag">Castle Crag</option>
            </select>
          </div>

          <div className="hud-divider" />

          <div className="hud-group">
            <input
              ref={fileInputRef}
              type="file"
              accept=".bob,.cob"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <button
              className="hud-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Import Ballistica 3D Mesh (.bob) or Collision Mesh (.cob)"
            >
              <span>Import .bob / .cob</span>
            </button>
            <button className="hud-btn ghost" onClick={() => loadSample('bob')}>
              Sample .bob
            </button>
            <button className="hud-btn ghost" onClick={() => loadSample('cob')}>
              Sample .cob
            </button>
          </div>

          <div className="hud-divider" />

          <div className="hud-group">
            <button className="hud-btn" onClick={() => addNode('spawn', 1)}>
              + Spawn 1
            </button>
            <button className="hud-btn" onClick={() => addNode('spawn', 2)}>
              + Spawn 2
            </button>
            <button className="hud-btn" onClick={() => addNode('spawn_ffa')}>
              + FFA
            </button>
            <button className="hud-btn" onClick={() => addNode('flag', 1)}>
              + Flag 1
            </button>
            <button className="hud-btn" onClick={() => addNode('flag', 2)}>
              + Flag 2
            </button>
            <button className="hud-btn" onClick={() => addNode('powerup')}>
              + Powerup
            </button>
          </div>
        </div>

        <div className="scene-floating-hint">
          Left Drag: Orbit • Right Drag: Pan • Scroll: Zoom • Drag &amp; drop .bob/.cob onto arena
        </div>
      </div>

      {/* Xcode/Figma-Style Inspector Sidebar */}
      <aside className="macos-card scene-inspector-dock">
        <div className="inspector-dock-header">
          <div className="card-title-group">
            <h4 className="card-title">Scene Hierarchy</h4>
          </div>
          <span className="card-counter-pill">{nodes.length} markers</span>
        </div>

        <div className="inspector-dock-content custom-scroll">
          {nodes.map((node, index) => (
            <div key={index} className="inspector-node-card">
              <div className="node-card-top">
                <span className="node-card-title mono-text">{node.title}</span>
                <button
                  className="node-delete-btn"
                  onClick={() => removeNode(index)}
                  title="Remove marker"
                  aria-label="Remove node"
                >
                  ✕
                </button>
              </div>
              <div className="node-axes-grid">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis} className="axis-box">
                    <span className={`axis-tag ${axis}`}>{axis.toUpperCase()}</span>
                    <input
                      type="number"
                      step="0.1"
                      className="axis-input mono-text"
                      value={node.position[axis]}
                      onChange={(e) =>
                        updateNodeCoord(index, axis, parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="empty-inspector-state">
              <p>No markers placed.</p>
              <span>Add team spawns, flags, or drop a Ballistica asset into the scene.</span>
            </div>
          )}
        </div>

        <div className="inspector-export-dock">
          <div className="export-dock-header">
            <span className="export-heading">Python Dict Preview</span>
            <div className="export-dock-buttons">
              <button
                className="macos-secondary-btn mini-btn"
                onClick={() => {
                  navigator.clipboard.writeText(generatePythonDict());
                  showToast('Copied coordinates to clipboard');
                }}
              >
                Copy
              </button>
              <button
                className="macos-btn macos-btn-primary mini-btn"
                onClick={() => onSendToCodeStudio(generatePythonDict())}
              >
                Send to Code
              </button>
            </div>
          </div>
          <pre className="export-code-box mono-text custom-scroll">{generatePythonDict()}</pre>
        </div>
      </aside>
    </div>
  );
};
