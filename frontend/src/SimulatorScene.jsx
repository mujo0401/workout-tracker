import React, { useRef, useEffect, useState, Suspense } from 'react';
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
  // Ensure ref.current exists before trying to use it for the mesh
  // This check might be better placed to conditionally render the mesh
  if (!ref.current && typeof window !== 'undefined') { 
    // Conditional rendering or placeholder if ref is not yet available
    // This typically resolves itself quickly in React's render cycle
  }
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  );
}

function Avatar({ speed, cadenceStream, physicsSettings, onAchievement }) {
  const wheelRadius = 0.35;
  const [ref, api] = useBox(() => ({
        mass: physicsSettings.avatarMass + 10, // Mass for cyclist + bike
        position: [0, 0.5, 0], // Start on the ground
        args: [0.5, 1, 1.5], // Approx bounding box: width, height, length (X, Y, Z)
    }));

  const avatarGroupRef = useRef();
  const parts = useRef({});

  // Steering state
  const [steeringInput, setSteeringInput] = useState(0); // -1 left, 0 none, 1 right
  const [currentSteerAngle, setCurrentSteerAngle] = useState(0);

  // Achievement distance tracking
  const [totalDistance, setTotalDistance] = useState(0);
  const lastPositionRef = useRef(null);
  const achievementDataRef = useRef({
      distance: physicsSettings.achievementDistance,
      step: physicsSettings.achievementStep,
  });

  // Store current velocity from physics engine
  const currentVelocityRef = useRef([0, 0, 0]);

  // Materials
  const redJerseyMaterial = new THREE.MeshStandardMaterial({ color: '#c0392b' });
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const blackMaterial = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#f3c5ab' });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#4a3b31' });
  const bikeAccentMaterial = new THREE.MeshStandardMaterial({ color: '#3498db' });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: '#333333' });
  const spokeMaterial = new THREE.MeshStandardMaterial({ color: '#c0c0c0', side: THREE.DoubleSide });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        setSteeringInput(-1);
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        setSteeringInput(1);
      }
    };
    const handleKeyUp = (event) => {
      if ((event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') && steeringInput === -1) {
        setSteeringInput(0);
      } else if ((event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') && steeringInput === 1) {
        setSteeringInput(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [steeringInput]);

  // Subscribe to physics body's velocity
  useEffect(() => {
    if (api && api.velocity) {
      const unsubscribe = api.velocity.subscribe((velocityArray) => {
        currentVelocityRef.current = velocityArray;
      });
      return () => unsubscribe();
    }
  }, [api]);


  useEffect(() => {
    const m = {}; 

    m.bikeGroup = new THREE.Group();

    const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), blackMaterial);
    mainTube.rotation.z = Math.PI / 2;
    mainTube.position.set(0, 0.4, 0);
    m.bikeGroup.add(mainTube);

    const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), blackMaterial);
    seatTube.position.set(-0.35, 0.6, 0);
    seatTube.rotation.x = Math.PI / 10;
    m.bikeGroup.add(seatTube);

    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), blackMaterial);
    downTube.position.set(0.05, 0.25, 0);
    downTube.rotation.z = Math.PI / 3;
    m.bikeGroup.add(downTube);

    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), blackMaterial);
    topTube.position.set(-0.05, 0.8, 0);
    topTube.rotation.z = Math.PI / 2 + Math.PI/15;
    m.bikeGroup.add(topTube);

    const headTubeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), blackMaterial);
    const headTubePosition = new THREE.Vector3(0.25, 0.75, 0); 
    const headTubeRotationZ = -Math.PI / 3; 
    headTubeMesh.position.copy(headTubePosition);
    headTubeMesh.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(headTubeMesh);

    // --- Steering Assembly ---
    m.steeringAssembly = new THREE.Group();
    m.steeringAssembly.position.copy(headTubePosition); // Pivot at head tube center
    m.steeringAssembly.rotation.z = headTubeRotationZ; // Align with head tube tilt
    m.bikeGroup.add(m.steeringAssembly);

    // Handlebar Stem (vertical post)
    const stemHeight = 0.15;
    const stemRadius = 0.03;
    m.stem = new THREE.Mesh(new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 8), blackMaterial);
    m.stem.position.set(0, 0.15 + (stemHeight / 2), 0); 
    m.steeringAssembly.add(m.stem);

    // Handlebars
    const handlebarLength = 0.5;
    const handlebarRadius = 0.03;
    m.handlebars = new THREE.Mesh(new THREE.CylinderGeometry(handlebarRadius, handlebarRadius, handlebarLength, 8), blackMaterial);
    m.handlebars.position.set(0, 0.15 + stemHeight, 0); 
    m.handlebars.rotation.z = Math.PI / 2; 
    m.steeringAssembly.add(m.handlebars);

    m.seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.15), blackMaterial);
    m.seat.position.set(-0.4, 0.85, 0);
    m.bikeGroup.add(m.seat);

    const wheelRadiusGeo = 0.35; 
    const wheelThickness = 0.04;
    const rimGeo = new THREE.TorusGeometry(wheelRadiusGeo, wheelThickness, 16, 32); 
    const rimAccentGeo = new THREE.TorusGeometry(wheelRadiusGeo - wheelThickness*0.7, wheelThickness * 0.5, 16, 32);

    const spokeCount = 12; 
    const spokeLength = wheelRadiusGeo * 0.9; 
    const spokeRadius = 0.005;
    const spokeGeo = new THREE.CylinderGeometry(spokeRadius, spokeRadius, spokeLength, 6);

    const createWheelAssembly = () => {
        const wheelGrp = new THREE.Group();
        wheelGrp.add(new THREE.Mesh(rimGeo, tireMaterial));
        wheelGrp.add(new THREE.Mesh(rimAccentGeo, bikeAccentMaterial));
        for (let i = 0; i < spokeCount; i++) {
          const spoke = new THREE.Mesh(spokeGeo, spokeMaterial);
          const angle = (i / spokeCount) * Math.PI * 2;
          spoke.position.set(
            Math.cos(angle) * spokeLength / 2,
            Math.sin(angle) * spokeLength / 2,
            0 
          );
          spoke.rotation.z = angle; 
          wheelGrp.add(spoke);
        }
        return wheelGrp;
    };
    
    m.frontWheel = createWheelAssembly();
    m.frontWheel.position.set(0.45, wheelRadiusGeo, 0); 
    m.bikeGroup.add(m.frontWheel);

    m.backWheel = createWheelAssembly();
    m.backWheel.position.set(-0.65, wheelRadiusGeo, 0);
    m.bikeGroup.add(m.backWheel);
    
    m.pedalCrank = new THREE.Group();
    const crankArmGeo = new THREE.BoxGeometry(0.03, 0.18, 0.03);
    const pedalGeo = new THREE.BoxGeometry(0.1, 0.02, 0.06);

    m.leftCrankArm = new THREE.Mesh(crankArmGeo, blackMaterial);
    m.rightCrankArm = new THREE.Mesh(crankArmGeo, blackMaterial);
    m.leftPedal = new THREE.Mesh(pedalGeo, blackMaterial);
    m.rightPedal = new THREE.Mesh(pedalGeo, blackMaterial);

    m.leftCrankArm.position.y = 0.09; 
    m.rightCrankArm.position.y = -0.09;
    m.leftPedal.position.y = 0.09;  
    m.leftPedal.position.x = 0.05;  
    m.rightPedal.position.y = -0.09;
    m.rightPedal.position.x = 0.05;

    m.leftCrankArm.add(m.leftPedal);
    m.rightCrankArm.add(m.rightPedal);
    m.pedalCrank.add(m.leftCrankArm, m.rightCrankArm);
    m.pedalCrank.position.set(-0.1, 0.4, 0); 
    m.bikeGroup.add(m.pedalCrank);

    m.cyclistGroup = new THREE.Group();
    m.cyclistGroup.position.set(-0.05, 0.82, 0); 

    m.torso = new THREE.Group();
    const torsoMainGeo = new THREE.CylinderGeometry(0.22, 0.20, 0.6, 16);
    const torsoMain = new THREE.Mesh(torsoMainGeo, redJerseyMaterial);
    const torsoStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.15, 16), whiteMaterial);
    torsoStripe.position.y = 0.05;
    m.torso.add(torsoMain, torsoStripe);
    m.torso.rotation.x = Math.PI / 7; 
    m.cyclistGroup.add(m.torso);

    m.head = new THREE.Group();
    m.head.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMaterial)); 
    const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.3, 8), hairMaterial);
    ponytail.position.set(0, -0.08, -0.15);
    ponytail.rotation.x = -Math.PI / 5;
    m.head.add(ponytail);
    m.head.position.set(0, 0.45, 0.05); 
    m.cyclistGroup.add(m.head);

    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8);
    m.leftArm = new THREE.Mesh(armGeo, redJerseyMaterial);
    m.leftArm.position.set(-0.25, 0.2, 0.1);
    m.leftArm.rotation.set(Math.PI / 2.5, -Math.PI / 6, -Math.PI / 5);
    m.cyclistGroup.add(m.leftArm);

    m.rightArm = new THREE.Mesh(armGeo, redJerseyMaterial);
    m.rightArm.position.set(0.25, 0.2, 0.1);
    m.rightArm.rotation.set(Math.PI / 2.5, Math.PI / 6, Math.PI / 5);
    m.cyclistGroup.add(m.rightArm);

    const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
    m.leftHand = new THREE.Mesh(handGeo, blackMaterial); 
    m.leftHand.position.set(-0.20, -0.15, 0.15); 
    m.leftArm.add(m.leftHand);

    m.rightHand = new THREE.Mesh(handGeo, blackMaterial);
    m.rightHand.position.set(0.20, -0.15, 0.15);
    m.rightArm.add(m.rightHand);

    const legUpperGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 8);
    const legLowerGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8);
    const footGeo = new THREE.BoxGeometry(0.08, 0.05, 0.15);

    m.leftUpperLeg = new THREE.Mesh(legUpperGeo, blackMaterial); 
    m.leftUpperLeg.position.set(-0.15, -0.3, 0);
    m.cyclistGroup.add(m.leftUpperLeg);

    m.leftLowerLeg = new THREE.Mesh(legLowerGeo, skinMaterial);
    m.leftLowerLeg.position.y = -0.35; 
    m.leftUpperLeg.add(m.leftLowerLeg);

    m.leftFoot = new THREE.Mesh(footGeo, whiteMaterial); 
    m.leftFoot.position.y = -0.19; 
    m.leftFoot.position.z = 0.05; 
    m.leftLowerLeg.add(m.leftFoot);

    m.rightUpperLeg = new THREE.Mesh(legUpperGeo, blackMaterial);
    m.rightUpperLeg.position.set(0.15, -0.3, 0);
    m.cyclistGroup.add(m.rightUpperLeg);

    m.rightLowerLeg = new THREE.Mesh(legLowerGeo, skinMaterial);
    m.rightLowerLeg.position.y = -0.35;
    m.rightUpperLeg.add(m.rightLowerLeg);

    m.rightFoot = new THREE.Mesh(footGeo, whiteMaterial);
    m.rightFoot.position.y = -0.19;
    m.rightFoot.position.z = 0.05;
    m.rightLowerLeg.add(m.rightFoot);
    
    parts.current = m;

    if (avatarGroupRef.current) {
        avatarGroupRef.current.add(m.bikeGroup);
        avatarGroupRef.current.add(m.cyclistGroup);
    }
  }, [api]); // Added api to dependency array for the effect that uses it, though not strictly necessary if api instance is stable.

  useFrame((state, delta) => {
    const { frontWheel, backWheel, pedalCrank, leftUpperLeg, rightUpperLeg, steeringAssembly } = parts.current;
    const cadence = cadenceStream.latest || 0; 
    const rotationPerFrame = (cadence / 60) * (2 * Math.PI) * delta;

    // Wheel and pedal animations
    if (frontWheel) frontWheel.rotation.z -= rotationPerFrame * 2.5; 
    if (backWheel) backWheel.rotation.z -= rotationPerFrame * 2.5;
    if (pedalCrank) {
      pedalCrank.rotation.z -= rotationPerFrame;
      const crankAngle = pedalCrank.rotation.z;
      if (leftUpperLeg) {
        leftUpperLeg.rotation.x = Math.sin(crankAngle) * 0.6 - Math.PI / 4;
      }
      if (rightUpperLeg) {
        rightUpperLeg.rotation.x = Math.sin(crankAngle + Math.PI) * 0.6 - Math.PI / 4;
      }
    }

    // Steering visual update
    const MAX_STEER_ANGLE = Math.PI / 5; 
    const STEER_LERP_FACTOR = 0.1;
    const targetSteerAngle = steeringInput * MAX_STEER_ANGLE * (speed > 0.1 ? 1 : 0); 
    
    const newCurrentSteerAngle = THREE.MathUtils.lerp(currentSteerAngle, targetSteerAngle, STEER_LERP_FACTOR);
    setCurrentSteerAngle(newCurrentSteerAngle);

    if (steeringAssembly) {
      steeringAssembly.rotation.y = newCurrentSteerAngle;
    }

    // Physics body update
    const physicsBodyObject3D = ref.current; // This is the THREE.Object3D associated with the physics body
    if (!physicsBodyObject3D) return;

    const currentSpeed = speed; 

    // Update physics body rotation (yaw) based on steering
    if (currentSpeed > 0.1) { 
        const TURN_SENSITIVITY_BASE = 1.0; 
        const speedFactor = Math.max(0.1, 1 - (currentSpeed / (physicsSettings.maxSpeed * 1.5))); 
        const turnRate = -newCurrentSteerAngle * currentSpeed * TURN_SENSITIVITY_BASE * speedFactor * delta;

        const currentQuaternionTHREE = new THREE.Quaternion();
        physicsBodyObject3D.getWorldQuaternion(currentQuaternionTHREE); // Get world quaternion of the THREE object

        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnRate);
        
        const newBodyQuaternionTHREE = currentQuaternionTHREE.multiply(deltaRotation);
        api.quaternion.copy(newBodyQuaternionTHREE); // Apply to physics body via API
    }

    // Update physics body velocity based on new orientation
    const bodyQuaternionForVelocity = new THREE.Quaternion();
    // It's generally safer to get the quaternion directly from the physics state if possible,
    // or ensure the THREE object (ref.current) is perfectly synced *before* this calculation.
    // For now, using the THREE object's quaternion which should have been updated by api.quaternion.copy above,
    // or by cannon's internal sync if that's how it's set up with the mesh.
    // Let's use the api.quaternion if we subscribed to it, otherwise ref.current.quaternion
    // For simplicity, assuming ref.current's quaternion is accurate enough after api.quaternion.copy()
    // or by cannon.js internal updates before next frame.
    // A more robust way for physics-derived direction is to use the physics body's quaternion.
    // Since we use api.quaternion.copy(), the ref.current (THREE.Object3D) should sync from that.
    physicsBodyObject3D.getWorldQuaternion(bodyQuaternionForVelocity);


    const forwardDirection = new THREE.Vector3(1, 0, 0); 
    forwardDirection.applyQuaternion(bodyQuaternionForVelocity);

    const yVelocity = currentVelocityRef.current[1]; // Get Y velocity from the ref updated by subscription

    api.velocity.set(
        forwardDirection.x * currentSpeed,
        yVelocity, // Preserve Y velocity for gravity/terrain
        forwardDirection.z * currentSpeed
    );
    
    // Sync visual group to physics body
    if (avatarGroupRef.current && physicsBodyObject3D) {
        const bodyPosition = new THREE.Vector3();
        physicsBodyObject3D.getWorldPosition(bodyPosition); 

        avatarGroupRef.current.position.copy(bodyPosition);
        avatarGroupRef.current.position.y = (bodyPosition.y - 0.5) + wheelRadius; 
        avatarGroupRef.current.quaternion.copy(bodyQuaternionForVelocity); // Sync visual rotation
    }

    // Distance and Achievement Tracking
    if (physicsBodyObject3D) {
        const currentPosVec = new THREE.Vector3();
        physicsBodyObject3D.getWorldPosition(currentPosVec);

        if (lastPositionRef.current) {
            const distMovedThisFrame = currentPosVec.distanceTo(lastPositionRef.current);
            const newTotalDistance = totalDistance + distMovedThisFrame;
            setTotalDistance(newTotalDistance);

            if (newTotalDistance >= achievementDataRef.current.distance) {
                onAchievement(`Reached ${(achievementDataRef.current.distance / 1000).toFixed(1)}km`);
                achievementDataRef.current.distance += achievementDataRef.current.step;
            }
        }
        lastPositionRef.current = currentPosVec.clone();
    }

  });

  return (
    <>
      <mesh ref={ref}> 
        {/* Optional: Visual representation of the physics body for debugging */}
        {/* <boxGeometry args={[0.5, 1, 1.5]} /> 
        <meshStandardMaterial wireframe color="rgba(0,0,0,0.1)" transparent opacity={0.2} /> */}
      </mesh>
      <group ref={avatarGroupRef} />
    </>
  );
}


export default function SimulatorScene({ powerStream, cadenceStream, onAchievement }) {
  const [avatarSpeed, setAvatarSpeed] = useState(0);
  const [category, setCategory] = useState('all');
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);

  const physicsSettings = {
    gravityMultiplier: 1,
    maxSpeed: 12, 
    ftp: 200,
    avatarMass: 65, 
    timeScale: 0.02, 
    achievementDistance: 1000, 
    achievementStep: 1000,     
    planeProps: { restitution: 0.1, friction: 0.9 },
    terrainHeight: 5
  };
  const environmentSettings = {
    groundColor: '#78a355', 
    sunPosition: [8, 12, 5]
  };

  useEffect(() => {
    if (!powerStream?.subscribe) return;
    const unsub = powerStream.subscribe(p => {
      const calculatedSpeed = (p / physicsSettings.ftp) * physicsSettings.maxSpeed * 0.8;
      const finalSpeed = Math.min(calculatedSpeed, physicsSettings.maxSpeed);
      setAvatarSpeed(finalSpeed > 0.05 ? finalSpeed : 0); 
    });
    return unsub;
  }, [powerStream, physicsSettings.maxSpeed, physicsSettings.ftp]);

  const filtered = category === 'all'
    ? MAPS
    : MAPS.filter(m => m.category === category);
  const map = MAPS.find(m => m.id === selectedMap) || MAPS[0];
  const preset = ['sunset','dawn','night','warehouse','forest','apartment','studio','city','park','lobby'].includes(map.preset)
    ? map.preset
    : 'forest';

  const obstacles = useRef([]);
  useEffect(() => {
    obstacles.current = Array.from({ length: 15 }, () => [ 
      Math.random() * 150 - 75,
      0.5, 
      Math.random() * 150 - 75
    ]);
  }, [selectedMap]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ padding: 10, background: 'rgba(255,255,255,0.8)', display: 'flex', gap: 10, flexWrap: 'wrap', position: 'absolute', top: 0, left: 0, zIndex: 10, borderRadius:'0 0 5px 0' }}>
        <label>
          Category:
          <select value={category} onChange={e => setCategory(e.target.value)} style={{marginLeft: '5px'}}>
            <option value='all'>All</option>
            {[...new Set(MAPS.map(m => m.category))].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </label>
        <label>
          Map:
          <select value={selectedMap} onChange={e => setSelectedMap(e.target.value)} style={{marginLeft: '5px'}}>
            {filtered.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <div style={{fontSize: '0.8em', alignSelf: 'center', marginLeft: '10px', color: '#555'}}>
            Use Arrow Keys or A/D to Steer
        </div>
      </div>
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
          </Suspense>
        </Physics>
        <Environment preset={preset} background={false}/> 
        <OrbitControls enableZoom minDistance={2.5} maxDistance={20} target={[0, 0.8, 0]}/>
      </Canvas>
    </div>
  );
}