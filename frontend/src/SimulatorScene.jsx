// Enhanced SimulatorScene.jsx
import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment /* OrbitControls removed */ } from '@react-three/drei';
import { Physics } from '@react-three/cannon'; 

import { MAPS, COURSES } from './Simulation/MapData';
import { EnhancedMapRenderer, CourseInfo } from './Simulation/MapComponents'; 
import { Avatar } from './Simulation/Avatar'; 

// EnvironmentLighting and AtmosphereEffects components (as you provided)
function EnvironmentLighting({ mapId, environmentSettings }) {
  const map = MAPS.find(m => m.id === mapId) || MAPS[0];
  const lightingType = map.environment?.lighting || 'default';
  const lightingConfigs = { /* ...your lighting configs as previously provided... */ mountain: { ambientIntensity: 0.4, directionalIntensity: 1.5, directionalPosition: [15, 20, 10]}, forest: { ambientIntensity: 0.3, directionalIntensity: 0.8, directionalPosition: [10, 15, 5], fogColor: '#2F4F2F', fogNear: 20, fogFar: 80 }, coastal: { ambientIntensity: 0.8, directionalIntensity: 1.2, directionalPosition: [10, 20, 15] }, desert: { ambientIntensity: 0.6, directionalIntensity: 1.8, directionalPosition: [20, 25, 10] }, urban: { ambientIntensity: 0.5, directionalIntensity: 1.0, directionalPosition: [8, 12, 8] }, tropical: { ambientIntensity: 0.4, directionalIntensity: 1.1, directionalPosition: [12, 18, 8], fogColor: '#98FB98', fogNear: 30, fogFar: 100 }, snow: { ambientIntensity: 0.9, directionalIntensity: 1.4, directionalPosition: [10, 20, 10] }, default: { ambientIntensity: 0.7, directionalIntensity: 1.2, directionalPosition: environmentSettings.sunPosition?.toArray() || [10, 15, 10]} };
  const config = lightingConfigs[lightingType] || lightingConfigs.default;
  return ( <> <ambientLight intensity={config.ambientIntensity} /> <directionalLight castShadow position={config.directionalPosition} intensity={config.directionalIntensity} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={100} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} /> {config.fogColor && (<fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />)} {lightingType === 'urban' && ( <> <pointLight position={[20, 8, 20]} intensity={0.5} distance={30} color="#FFAA00" /> <pointLight position={[-20, 8, -20]} intensity={0.5} distance={30} color="#FFAA00" /> </> )} </> );
}
function AtmosphereEffects({ mapId }) {
  const map = MAPS.find(m => m.id === mapId) || MAPS[0];
  const weather = map.environment?.weather || 'clear';
  const particleGroupRef = useRef(); 
  const { positions, velocities, count } = useMemo(() => { /* ...your particle logic... */ let numParticles = 0; switch (weather) { case 'snowy': numParticles = 1000; break; case 'misty': case 'humid': numParticles = 500; break; default: return { positions: null, velocities: null, count: 0 }; } const pos = new Float32Array(numParticles * 3); const vel = new Float32Array(numParticles * 3); for (let i = 0; i < numParticles; i++) { pos[i * 3 + 0] = (Math.random() - 0.5) * 200; pos[i * 3 + 1] = Math.random() * 50; pos[i * 3 + 2] = (Math.random() - 0.5) * 200; vel[i * 3 + 0] = (Math.random() - 0.5) * (weather === 'snowy' ? 0.1 : 0.05); vel[i * 3 + 1] = -Math.random() * (weather === 'snowy' ? 0.5 : 0.2) -0.1; vel[i * 3 + 2] = (Math.random() - 0.5) * (weather === 'snowy' ? 0.1 : 0.05); } return { positions: pos, velocities: vel, count: numParticles }; }, [weather]);
  const pointsRef = useRef();
  useEffect(() => { if (!pointsRef.current || count === 0 || !positions ) return; if (!pointsRef.current.geometry) { pointsRef.current.geometry = new THREE.BufferGeometry(); } if (!pointsRef.current.geometry.getAttribute('position') || pointsRef.current.geometry.getAttribute('position').count !== count) { pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); } else { pointsRef.current.geometry.attributes.position.array = positions; } pointsRef.current.geometry.attributes.position.needsUpdate = true; }, [positions, count]);
  useEffect(() => { if (!pointsRef.current || count === 0 || !particleGroupRef.current || !velocities) return; let animFrameId; const animate = () => { if (pointsRef.current && pointsRef.current.geometry.attributes.position) { const posArray = pointsRef.current.geometry.attributes.position.array; for (let i = 0; i < count; i++) { posArray[i * 3 + 0] += velocities[i * 3 + 0]; posArray[i * 3 + 1] += velocities[i * 3 + 1]; posArray[i * 3 + 2] += velocities[i * 3 + 2]; if (posArray[i * 3 + 1] < -10) { posArray[i * 3 + 1] = 50; posArray[i * 3 + 0] = (Math.random() - 0.5) * 200; posArray[i * 3 + 2] = (Math.random() - 0.5) * 200; } if (Math.abs(posArray[i * 3 + 0]) > 100) posArray[i * 3 + 0] *= -0.99; if (Math.abs(posArray[i * 3 + 2]) > 100) posArray[i * 3 + 2] *= -0.99; } pointsRef.current.geometry.attributes.position.needsUpdate = true; } animFrameId = requestAnimationFrame(animate); }; animate(); return () => cancelAnimationFrame(animFrameId); }, [velocities, count]); 
  if (count === 0) return null;
  return ( <group ref={particleGroupRef}> <points ref={pointsRef}> <bufferGeometry attach="geometry" /> <pointsMaterial attach="material" size={weather === 'snowy' ? 0.5 : 0.3} color={weather === 'snowy' ? '#FFFFFF' : '#E0E0E0'} transparent opacity={weather === 'snowy' ? 0.8 : 0.5} sizeAttenuation={true}/> </points> </group> );
}

function ChaseCamera({ avatarForwardRef }) { // Changed prop name for clarity
  const { camera } = useThree();
  const cameraOffset = useMemo(() => new THREE.Vector3(0, 3, -7), []); // x, y (height), z (distance behind avatar's local Z)
  const lookAtOffset = useMemo(() => new THREE.Vector3(0, 1.2, 0), []); // Point camera slightly above avatar's base/center

  useFrame(() => {
    // avatarForwardRef.current should now be the object from useImperativeHandle,
    // which has a getPhysicsRef method that returns the physics body (Object3D).
    const avatarPhysicsObject = avatarForwardRef.current?.getPhysicsRef ? avatarForwardRef.current.getPhysicsRef() : null;
    
    if (avatarPhysicsObject) {
      const avatarPosition = new THREE.Vector3();
      avatarPhysicsObject.getWorldPosition(avatarPosition);

      const avatarQuaternion = new THREE.Quaternion();
      avatarPhysicsObject.getWorldQuaternion(avatarQuaternion);

      // Calculate desired camera position based on avatar's orientation
      const desiredCameraPosition = avatarPosition.clone().add(
        cameraOffset.clone().applyQuaternion(avatarQuaternion)
      );
      
      // Smoothly interpolate camera position
      camera.position.lerp(desiredCameraPosition, 0.075); // Adjust lerp factor for smoothness

      // Calculate desired lookAt target based on avatar's orientation
      const lookAtTarget = avatarPosition.clone().add(
        lookAtOffset.clone().applyQuaternion(avatarQuaternion) 
      );
      
      camera.lookAt(lookAtTarget);
      camera.updateProjectionMatrix(); // Important if fov or aspect changes, good practice
    }
  });

  return null;
}

export default function SimulatorScene({ powerStream, cadenceStream, onAchievement }) {
  const [avatarSpeed, setAvatarSpeed] = useState(0);
  const [category, setCategory] = useState('all');
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id);
  const avatarRefForCamera = useRef(); // This ref is passed to Avatar

  const physicsSettings = { /* ...your physics settings... */ gravityMultiplier: 1, maxSpeed: 12, ftp: 200, avatarMass: 65, timeScale: 0.02, achievementDistance: 1000, achievementStep: 1000, planeProps: { restitution: 0.1, friction: 0.9 }, terrainHeight: 5 };
  const environmentSettings = { /* ...your environment settings... */ groundColor: '#78a355', sunPosition: new THREE.Vector3(8, 12, 5) };

   useEffect(() => {
    if (!powerStream?.subscribe) return;
    const unsub = powerStream.subscribe(p => {
      const calculatedSpeed = (p / physicsSettings.ftp) * physicsSettings.maxSpeed * 0.8;
      const finalSpeed = Math.min(calculatedSpeed, physicsSettings.maxSpeed);
      setAvatarSpeed(finalSpeed > 0.05 ? finalSpeed : 0);
    });
    return unsub;
  }, [powerStream, physicsSettings.ftp, physicsSettings.maxSpeed]);

  const currentMap = MAPS.find(m => m.id === selectedMapId) || MAPS[0];
  const currentCourse = COURSES[selectedMapId];
  const filteredMaps = category === 'all' ? MAPS : MAPS.filter(m => m.category === category);
  const environmentPreset = ['sunset','dawn','night','warehouse','forest','apartment','studio','city','park','lobby'].includes(currentMap.preset)
    ? currentMap.preset : 'forest';
  const skyConfig = useMemo(() => {
    const timeOfDay = currentMap.environment?.timeOfDay || 'morning';
    const configs = { /* ...your sky configs... */ morning: { turbidity: 8, rayleigh: 2, mieCoefficient: 0.005, mieDirectionalG: 0.7, elevation: 15, azimuth: 180 }, afternoon: { turbidity: 6, rayleigh: 1, mieCoefficient: 0.003, mieDirectionalG: 0.8, elevation: 45, azimuth: 25 }, sunset: { turbidity: 10, rayleigh: 0.5, mieCoefficient: 0.002, mieDirectionalG: 0.95, elevation: 2, azimuth: 180 }, dawn: { turbidity: 9, rayleigh: 1.5, mieCoefficient: 0.004, mieDirectionalG: 0.85, elevation: 5, azimuth: 90 }, night: {turbidity: 1, rayleigh: 0.01, mieCoefficient: 0.001, mieDirectionalG: 0.7, elevation: 2, azimuth: 180, sunPosition: [0,-1,0]} };
    let config = configs[timeOfDay] || configs.morning;
    if(timeOfDay === 'night' && config.sunPosition) {
        return {...config, customSunPosition: new THREE.Vector3(...config.sunPosition)};
    }
    return config;
  }, [currentMap.environment]);


  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ padding: 12, background: 'rgba(20,20,30,0.85)', /* ... rest of UI styles ... */ zIndex:100, display: 'flex', gap: 15, flexWrap: 'wrap', position: 'absolute', top: 0, left: 0, right: 0 }}>
         <label style={{ color: '#EAEAEA', fontSize: '14px', fontWeight: '500' }}>Category:
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ marginLeft: '8px', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#EAEAEA' }}>
            <option value='all' style={{color: 'black'}}>All Courses</option>
            {[...new Set(MAPS.map(m => m.category))].map(c => (<option key={c} value={c} style={{color: 'black'}}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
          </select>
        </label>
        <label style={{ color: '#EAEAEA', fontSize: '14px', fontWeight: '500' }}>Course:
          <select value={selectedMapId} onChange={e => setSelectedMapId(e.target.value)} style={{ marginLeft: '8px', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#EAEAEA', minWidth: '180px' }}>
            {filteredMaps.map(m => (<option key={m.id} value={m.id} style={{color: 'black'}}>{m.name} ({m.distance})</option>))}
          </select>
        </label>
        <div style={{ fontSize: '13px', alignSelf: 'center', color: '#B0B0B0', fontStyle: 'italic' }}>Use Arrow Keys or A/D to Steer</div>
      </div>
      <CourseInfo map={currentMap} course={currentCourse} />

      <Canvas
        shadows
        camera={{ position: [0, 3, 7], fov: 60 }} // Initial camera position, will be managed by ChaseCamera
        style={{ background: '#000000', height: '100%', width: '100%' }}
        dpr={[1, 1.5]}
      >
        <Sky 
          sunPosition={skyConfig.customSunPosition || environmentSettings.sunPosition}
          distance={1000}
          turbidity={skyConfig.turbidity} rayleigh={skyConfig.rayleigh}
          mieCoefficient={skyConfig.mieCoefficient} mieDirectionalG={skyConfig.mieDirectionalG}
          elevation={skyConfig.elevation} azimuth={skyConfig.azimuth}
        />
        <EnvironmentLighting mapId={selectedMapId} environmentSettings={environmentSettings}/>
        
        <Suspense fallback={null}>
            <AtmosphereEffects mapId={selectedMapId} />
        </Suspense>
        
        <Physics gravity={[0, -9.81 * physicsSettings.gravityMultiplier, 0]} defaultContactMaterial={{ friction: 0.1, restitution: 0.2 }}>
          <Suspense fallback={null}>
            <EnhancedMapRenderer mapId={selectedMapId} physicsSettings={physicsSettings} environmentSettings={environmentSettings}/>
            {/* Pass the ref to Avatar */}
            <Avatar ref={avatarRefForCamera} speed={avatarSpeed} cadenceStream={cadenceStream} physicsSettings={physicsSettings} onAchievement={onAchievement}/>
          </Suspense>
        </Physics>
        <Environment preset={environmentPreset} background={false} blur={0.5}/>
        
        {/* ChaseCamera component now manages the main camera */}
        <ChaseCamera avatarForwardRef={avatarRefForCamera} /> {/* Pass the ref here */}
        
      </Canvas>
    </div>
  );
}