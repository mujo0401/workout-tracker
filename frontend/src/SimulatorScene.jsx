import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { Physics, usePlane, useBox } from '@react-three/cannon';

// Predefined map options
const MAPS = [
  { id: 'alpine',      name: 'Alpine Pass',       category: 'mountain', preset: 'park' },
  { id: 'forest',      name: 'Dark Forest',       category: 'forest',   preset: 'forest' },
  { id: 'coastal',     name: 'Coastal Breeze',    category: 'coastal',  preset: 'city' },
  { id: 'desert',      name: 'Desert Dunes',      category: 'desert',   preset: 'sunset' },
  { id: 'urban',       name: 'City Streets',      category: 'urban',    preset: 'studio' },
  { id: 'tropical',    name: 'Tropical Paradise', category: 'forest',   preset: 'apartment' },
  { id: 'island',      name: 'Island Loop',       category: 'coastal',  preset: 'lobby' },
  { id: 'valley',      name: 'Green Valley',      category: 'mountain', preset: 'park' },
  { id: 'snowtrack',   name: 'Snow Track',        category: 'snow',     preset: 'dawn' },
  { id: 'countryside', name: 'Countryside',       category: 'rural',    preset: 'city' }
];

function noise(x, y) {
  return (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 0.5;
}

function Terrain({ physicsSettings, environmentSettings, mapId }) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI/2, 0, 0], ...physicsSettings.planeProps }));
  const geomRef = useRef();

  useEffect(() => {
    const geometry = geomRef.current;
    if (!geometry || !geometry.attributes?.position) return;
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const elevation = noise(
        x + mapId.length * 10,
        y + mapId.charCodeAt(0) * 5
      ) * physicsSettings.terrainHeight;
      posAttr.setZ(i, elevation);
    }
    geometry.computeVertexNormals();
    posAttr.needsUpdate = true;
  }, [mapId, physicsSettings.terrainHeight]);

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry ref={geomRef} args={[200, 200, 100, 100]} />
      <meshStandardMaterial color={environmentSettings.groundColor} />
    </mesh>
  );
}

function Obstacle({ position }) {
  const [ref] = useBox(() => ({ mass: 0, position, args: [1, 1, 1] }));
  if (!ref.current) return null;
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  );
}

function Avatar({ speed, cadenceStream, physicsSettings, onAchievement }) {
  const [ref] = useBox(() => ({ mass: physicsSettings.avatarMass, position: [0, 2, 0], args: [1, 2, 1] }));
  const parts = useRef({ frame: null, wheel1: null, wheel2: null, body: null, head: null });

  useEffect(() => {
    const m = parts.current;
    m.frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 0.75),
      new THREE.MeshStandardMaterial({ color: 'blue' })
    );
    const wheelGeo = new THREE.TorusGeometry(0.5, 0.1, 16, 32);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 'black' });
    m.wheel1 = new THREE.Mesh(wheelGeo, wheelMat);
    m.wheel1.rotation.x = Math.PI / 2;
    m.wheel2 = m.wheel1.clone();
    m.body = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshStandardMaterial({ color: 'lightblue' })
    );
    m.body.position.set(0, 1, 0);
    m.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({ color: 'peachpuff' })
    );
    m.head.position.set(0, 1.5, 0);
  }, []);

  useFrame((_, delta) => {
    const { wheel1, wheel2 } = parts.current;
    const cadence = cadenceStream.latest || 0;
    const rotAmt = (delta * cadence) / 60 * Math.PI * 2;
    if (wheel1) wheel1.rotation.z -= rotAmt;
    if (wheel2) wheel2.rotation.z -= rotAmt;
  });

  useFrame(() => {
    const current = ref.current;
    if (!current) return;
    current.position.x += speed * physicsSettings.timeScale;
    if (current.position.x > physicsSettings.achievementDistance) {
      onAchievement(`Reached ${(current.position.x / 1000).toFixed(1)}km`);
      physicsSettings.achievementDistance += physicsSettings.achievementStep;
    }
  });

  const { frame, wheel1, wheel2, body, head } = parts.current;
  return (
    <group ref={ref}>
      {frame && <primitive object={frame} castShadow />}
      {wheel1 && <primitive object={wheel1} position={[-0.75, -0.25, 0]} castShadow />}
      {wheel2 && <primitive object={wheel2} position={[0.75, -0.25, 0]} castShadow />}
      {body && <primitive object={body} />}
      {head && <primitive object={head} />}
    </group>
  );
}

export default function SimulatorScene({ powerStream, cadenceStream, onAchievement }) {
  const [avatarSpeed, setAvatarSpeed] = useState(0);
  const [category, setCategory] = useState('all');
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);

  const physicsSettings = {
    gravityMultiplier: 1,
    maxSpeed: 10,
    ftp: 200,
    avatarMass: 5,
    timeScale: 0.02,
    achievementDistance: 1000,
    achievementStep: 1000,
    planeProps: {},
    terrainHeight: 5
  };
  const environmentSettings = {
    groundColor: '#8ccf45',
    sunPosition: [5, 10, 2]
  };

  useEffect(() => {
    if (!powerStream?.subscribe) return;
    const unsub = powerStream.subscribe(p => {
      const speed = Math.min(physicsSettings.maxSpeed * p / physicsSettings.ftp, physicsSettings.maxSpeed);
      setAvatarSpeed(speed);
    });
    return unsub;
  }, [powerStream]);

  const filtered = category === 'all'
    ? MAPS
    : MAPS.filter(m => m.category === category);
  const map = MAPS.find(m => m.id === selectedMap) || MAPS[0];
  const preset = ['sunset','dawn','night','warehouse','forest','apartment','studio','city','park','lobby'].includes(map.preset)
    ? map.preset
    : 'forest';

  const obstacles = useRef([]);
  useEffect(() => {
    obstacles.current = Array.from({ length: 10 }, () => [
      Math.random() * 100 - 50,
      1,
      Math.random() * 100 - 50
    ]);
  }, [selectedMap]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ padding: 10, background: '#fff', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label>
          Category:
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value='all'>All</option>
            {[...new Set(MAPS.map(m => m.category))].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Map:
          <select value={selectedMap} onChange={e => setSelectedMap(e.target.value)}>
            {filtered.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
      </div>
      <Canvas shadows camera={{ position: [0, 10, 20], fov: 60 }} style={{ height: 'calc(100% - 50px)' }}>
        <Sky sunPosition={environmentSettings.sunPosition} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={1.2} />
        <Physics gravity={[0, -9.81 * physicsSettings.gravityMultiplier, 0]}> 
          <Terrain
            physicsSettings={physicsSettings}
            environmentSettings={environmentSettings}
            mapId={selectedMap}
          />
          <Avatar
            speed={avatarSpeed}
            cadenceStream={cadenceStream}
            physicsSettings={physicsSettings}
            onAchievement={onAchievement}
          />
          {obstacles.current.map((pos, i) => (
            <Obstacle key={i} position={pos} />
          ))}
        </Physics>
        <Environment preset={preset} />
        <OrbitControls enableZoom />
      </Canvas>
    </div>
  );
}
