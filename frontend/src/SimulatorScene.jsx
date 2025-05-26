// SimulatorScene.jsx
import React, { useRef, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { Physics, useBox } from '@react-three/cannon'; 

import { MAPS, COURSES } from './Simulation/MapData';
import { Terrain, CourseMarkers, CourseObstacles, CourseInfo } from './Simulation/MapComponents'; 
import { Avatar } from './Simulation/Avatar'; 

// Generic Obstacle for random placement if course doesn't define specific ones
function Obstacle({ position }) {
  const [ref] = useBox(() => ({ mass: 0, position, args: [1, 1, 1] })); // Re-add useBox here
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  );
}

export default function SimulatorScene({ powerStream, cadenceStream, onAchievement }) {
  const [avatarSpeed, setAvatarSpeed] = useState(0);
  const [category, setCategory] = useState('all');
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id); // Store ID

  const physicsSettings = {
    gravityMultiplier: 1,
    maxSpeed: 12,
    ftp: 200,
    avatarMass: 65, // Rider mass, bike mass is handled in Avatar or BikeModel if needed for physics
    timeScale: 0.02, // This seems unused, consider removing or implementing if it's for slow-mo etc.
    achievementDistance: 1000, // in meters
    achievementStep: 1000, // in meters
    planeProps: { restitution: 0.1, friction: 0.9 }, // For terrain physics
    terrainHeight: 5 // Multiplier for terrain elevation
  };
  const environmentSettings = {
    groundColor: '#78a355', // Default ground color if map specific is not found
    sunPosition: new THREE.Vector3(8, 12, 5) // Use THREE.Vector3 for sunPosition
  };

  useEffect(() => {
    if (!powerStream?.subscribe) return;
    const unsub = powerStream.subscribe(p => {
      const calculatedSpeed = (p / physicsSettings.ftp) * physicsSettings.maxSpeed * 0.8;
      const finalSpeed = Math.min(calculatedSpeed, physicsSettings.maxSpeed);
      setAvatarSpeed(finalSpeed > 0.05 ? finalSpeed : 0); // Threshold to prevent micro-movements
    });
    return unsub;
  }, [powerStream, physicsSettings.maxSpeed, physicsSettings.ftp]);

  const currentMap = MAPS.find(m => m.id === selectedMapId) || MAPS[0];
  const currentCourse = COURSES[selectedMapId]; // This can be undefined if mapId has no course

  const filteredMaps = category === 'all'
    ? MAPS
    : MAPS.filter(m => m.category === category);
  
  const environmentPreset = ['sunset','dawn','night','warehouse','forest','apartment','studio','city','park','lobby'].includes(currentMap.preset)
    ? currentMap.preset
    : 'forest'; // Default preset

  // Obstacles for maps that don't define their own (fallback)
  const randomObstacles = useRef([]);
  useEffect(() => {
    if (!currentCourse || !currentCourse.obstacles) { // Only generate if no course obstacles
      randomObstacles.current = Array.from({ length: 15 }, () => [
        Math.random() * 150 - 75,
        0.5, // y position for the base of the obstacle
        Math.random() * 150 - 75
      ]);
    } else {
      randomObstacles.current = []; // Clear if course has its own obstacles
    }
  }, [selectedMapId, currentCourse]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ 
        padding: 15, background: 'rgba(0,0,0,0.8)', display: 'flex', 
        gap: 15, flexWrap: 'wrap', position: 'absolute', 
        top: 0, left: 0, zIndex: 10, borderRadius:'0 0 10px 0', minWidth: 300
      }}>
        <label style={{ color: 'white', fontSize: '0.9em' }}>
          Category:
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white' }}
          >
            <option value='all'>All Courses</option>
            {[...new Set(MAPS.map(m => m.category))].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </label>
        <label style={{ color: 'white', fontSize: '0.9em' }}>
          Course:
          <select 
            value={selectedMapId} 
            onChange={e => setSelectedMapId(e.target.value)} 
            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white' }}
          >
            {filteredMaps.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <div style={{ fontSize: '0.8em', alignSelf: 'center', marginLeft: '10px', color: '#bbb' }}>
          Use Arrow Keys or A/D to Steer
        </div>
      </div>

      <CourseInfo map={currentMap} course={currentCourse} />

      <Canvas shadows camera={{ position: [0, 1.8, 7], fov: 55 }} style={{ background: '#ace6f0', height: '100%', width: '100%' }}>
        <Sky sunPosition={environmentSettings.sunPosition} distance={1000}/>
        <ambientLight intensity={0.7} />
        <directionalLight
            castShadow
            position={[10, 15, 10]}
            intensity={1.2}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={70}
            shadow-camera-left={-35}
            shadow-camera-right={35}
            shadow-camera-top={35}
            shadow-camera-bottom={-35}
        />
        <Physics gravity={[0, -9.81 * physicsSettings.gravityMultiplier, 0]} defaultContactMaterial={{ friction: 0.1, restitution: 0.2 }}>
          <Suspense fallback={null}>
            <Terrain
              physicsSettings={physicsSettings}
              environmentSettings={environmentSettings}
              mapId={selectedMapId}
            />
            <Avatar
              speed={avatarSpeed}
              cadenceStream={cadenceStream}
              physicsSettings={physicsSettings}
              onAchievement={onAchievement}
            />
            <CourseMarkers mapId={selectedMapId} />
            {/* Render course-specific obstacles if they exist, otherwise random ones */}
            {currentCourse && currentCourse.obstacles ? (
                <CourseObstacles mapId={selectedMapId} />
            ) : (
                randomObstacles.current.map((pos, i) => <Obstacle key={i} position={pos} />)
            )}
          </Suspense>
        </Physics>
        <Environment preset={environmentPreset} background={false}/>
        <OrbitControls enableZoom minDistance={2.5} maxDistance={20} target={[0, 0.8, 0]}/>
      </Canvas>
    </div>
  );
}