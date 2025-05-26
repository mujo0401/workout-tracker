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
        mass: physicsSettings.avatarMass + 10,
        position: [0, 0.5, 0],
        args: [0.5, 1, 1.5],
    }));

  const avatarGroupRef = useRef();
  const parts = useRef({});

  // Steering state
  const [steeringInput, setSteeringInput] = useState(0);
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

  // Enhanced Materials
  const redJerseyMaterial = new THREE.MeshStandardMaterial({ color: '#c0392b' });
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const blackMaterial = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#f3c5ab' });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#4a3b31' });
  const bikeAccentMaterial = new THREE.MeshStandardMaterial({ color: '#3498db' });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: '#333333' });
  const spokeMaterial = new THREE.MeshStandardMaterial({ color: '#c0c0c0', side: THREE.DoubleSide });
  const chainMaterial = new THREE.MeshStandardMaterial({ color: '#666666' });
  const gearMaterial = new THREE.MeshStandardMaterial({ color: '#888888' });
  const carbonFiberMaterial = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.3 });
  const aluminumMaterial = new THREE.MeshStandardMaterial({ color: '#b8b8b8', metalness: 0.8, roughness: 0.2 });
  const brakeMaterial = new THREE.MeshStandardMaterial({ color: '#444444', metalness: 0.7 });
  const discBrakeMaterial = new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.9, roughness: 0.1 });

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

    // === FRAME GEOMETRY ===
    // Bottom Bracket (center of bike frame)
    const bottomBracketPos = new THREE.Vector3(0, 0.35, 0);
    
    m.bottomBracket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), aluminumMaterial);
    m.bottomBracket.position.copy(bottomBracketPos);
    m.bikeGroup.add(m.bottomBracket);

    // Key frame positions for proper bike geometry - increased front end reach
    const headTubePosition = new THREE.Vector3(0.7, 0.75, 0);
    const seatTubeTopPos = new THREE.Vector3(-0.3, 0.8, 0);
    const rearDropoutPos = new THREE.Vector3(-0.65, 0.35, 0);

   // Top Tube - connects head tube to seat tube (longer for more aggressive geometry)
    const topTubeLength = headTubePosition.distanceTo(seatTubeTopPos);
    m.topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, topTubeLength, 8), carbonFiberMaterial);
    m.topTube.position.lerpVectors(headTubePosition, seatTubeTopPos, 0.5);
    m.topTube.lookAt(seatTubeTopPos);
    m.topTube.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.topTube);

    // Down Tube - from head tube to bottom bracket (longer and more aggressive)
    const downTubeLength = headTubePosition.distanceTo(bottomBracketPos);
    m.downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, downTubeLength, 8), carbonFiberMaterial);
    m.downTube.position.lerpVectors(headTubePosition, bottomBracketPos, 0.5);
    m.downTube.lookAt(bottomBracketPos);
    m.downTube.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.downTube);
    
    // Seat Tube - from bottom bracket to seat post
    const seatTubeLength = bottomBracketPos.distanceTo(seatTubeTopPos);
    m.seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, seatTubeLength, 8), carbonFiberMaterial);
    m.seatTube.position.lerpVectors(bottomBracketPos, seatTubeTopPos, 0.5);
    m.seatTube.lookAt(seatTubeTopPos);
    m.seatTube.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.seatTube);

    // Head Tube - steerer tube housing
    const headTubeRotationZ = -Math.PI / 12; // More subtle angle
    m.headTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.15, 8), carbonFiberMaterial);
    m.headTube.position.copy(headTubePosition);
    m.headTube.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(m.headTube);

    // Headset (top and bottom bearing cups)
    m.headsetTop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), aluminumMaterial);
    m.headsetTop.position.copy(headTubePosition);
    m.headsetTop.position.y += 0.08;
    m.headsetTop.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(m.headsetTop);

    m.headsetBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), aluminumMaterial);
    m.headsetBottom.position.copy(headTubePosition);
    m.headsetBottom.position.y -= 0.08;
    m.headsetBottom.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(m.headsetBottom);

    // Chain Stays - from bottom bracket to rear dropouts
    const chainStayLength = bottomBracketPos.distanceTo(rearDropoutPos);
    m.leftChainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, chainStayLength, 8), carbonFiberMaterial);
    m.leftChainStay.position.lerpVectors(bottomBracketPos, rearDropoutPos, 0.5);
    m.leftChainStay.position.z = -0.08;
    m.leftChainStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, -0.08));
    m.leftChainStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.leftChainStay);

    m.rightChainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, chainStayLength, 8), carbonFiberMaterial);
    m.rightChainStay.position.lerpVectors(bottomBracketPos, rearDropoutPos, 0.5);
    m.rightChainStay.position.z = 0.08;
    m.rightChainStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, 0.08));
    m.rightChainStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.rightChainStay);

    // Seat Stays - from seat tube to rear dropouts
    const seatStayLength = seatTubeTopPos.distanceTo(rearDropoutPos);
    m.leftSeatStay = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, seatStayLength, 8), carbonFiberMaterial);
    m.leftSeatStay.position.lerpVectors(seatTubeTopPos, rearDropoutPos, 0.5);
    m.leftSeatStay.position.z = -0.08;
    m.leftSeatStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, -0.08));
    m.leftSeatStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.leftSeatStay);

    m.rightSeatStay = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, seatStayLength, 8), carbonFiberMaterial);
    m.rightSeatStay.position.lerpVectors(seatTubeTopPos, rearDropoutPos, 0.5);
    m.rightSeatStay.position.z = 0.08;
    m.rightSeatStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, 0.08));
    m.rightSeatStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.rightSeatStay);

    // Seat Post - adjustable post for saddle
    m.seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), aluminumMaterial);
    m.seatPost.position.copy(seatTubeTopPos);
    m.seatPost.position.y += 0.1;
    m.bikeGroup.add(m.seatPost);

    // Saddle - realistic bike seat
    m.saddle = new THREE.Group();
    const saddleBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.12), blackMaterial);
    const saddleNose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), blackMaterial);
    saddleNose.position.set(0.12, 0, 0);
    saddleNose.rotation.z = Math.PI / 2;
    m.saddle.add(saddleBase, saddleNose);
    m.saddle.position.copy(seatTubeTopPos);
    m.saddle.position.y += 0.22;
    m.bikeGroup.add(m.saddle);

    // === FORK AND STEERING ===
    // Fork - front suspension/rigid fork with proper rake angle
    m.fork = new THREE.Group();
    
    // Fork crown
    m.forkCrown = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), aluminumMaterial);
    m.forkCrown.position.set(0, -0.05, 0);
    m.fork.add(m.forkCrown);

    // Fork legs - angled forward with proper rake (typically 43-45mm forward offset)
    const forkRakeAngle = Math.PI / 5; // ~15 degrees forward rake
    const forkLength = 0.4;
    
    m.leftForkLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, forkLength, 12), aluminumMaterial);
    m.leftForkLeg.position.set(Math.sin(forkRakeAngle) * (forkLength/2), -Math.cos(forkRakeAngle) * (forkLength/2), -0.08);
    m.leftForkLeg.rotation.z = forkRakeAngle;
    m.fork.add(m.leftForkLeg);

    m.rightForkLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, forkLength, 12), aluminumMaterial);
    m.rightForkLeg.position.set(Math.sin(forkRakeAngle) * (forkLength/2), -Math.cos(forkRakeAngle) * (forkLength/2), 0.08);
    m.rightForkLeg.rotation.z = forkRakeAngle;
    m.fork.add(m.rightForkLeg);

    // Steerer tube - remains vertical within the head tube
    m.steererTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12), aluminumMaterial);
    m.steererTube.position.set(0, 0.1, 0);
    m.fork.add(m.steererTube);

    // === STEERING ASSEMBLY ===
    m.steeringAssembly = new THREE.Group();
    m.steeringAssembly.position.copy(headTubePosition);
    m.steeringAssembly.rotation.z = headTubeRotationZ;
    m.steeringAssembly.add(m.fork);
    m.bikeGroup.add(m.steeringAssembly);

    // Stem - connects handlebars to steerer
    const stemHeight = 0.08;
    m.stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), aluminumMaterial);
    m.stem.position.set(0.06, 0.15, 0);
    m.steeringAssembly.add(m.stem);

    // Handlebars - drop bars positioned correctly
    m.handlebars = new THREE.Group();
    
    // Main handlebar tube
    const handlebarLength = 0.42;
    m.handlebarMain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, handlebarLength, 12), aluminumMaterial);
    m.handlebarMain.rotation.z = Math.PI / 2;
    m.handlebars.add(m.handlebarMain);

    // Drop sections
    m.leftDrop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 16), aluminumMaterial);
    m.leftDrop.position.set(0, 0, -0.18);
    m.leftDrop.rotation.x = Math.PI / 2;
    m.handlebars.add(m.leftDrop);

    m.rightDrop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 16), aluminumMaterial);
    m.rightDrop.position.set(0, 0, 0.18);
    m.rightDrop.rotation.x = Math.PI / 2;
    m.handlebars.add(m.rightDrop);

    // Brake/Shift Levers
    m.leftBrakeShifter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), blackMaterial);
    m.leftBrakeShifter.position.set(0.04, -0.02, -0.15);
    m.handlebars.add(m.leftBrakeShifter);

    m.rightBrakeShifter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), blackMaterial);
    m.rightBrakeShifter.position.set(0.04, -0.02, 0.15);
    m.handlebars.add(m.rightBrakeShifter);

    m.handlebars.position.set(0.12, 0.15 + stemHeight, 0);
    m.steeringAssembly.add(m.handlebars);

    // === WHEELS WITH DISC BRAKES ===
    const wheelRadiusGeo = 0.35;
    const wheelThickness = 0.04;
    const rimGeo = new THREE.TorusGeometry(wheelRadiusGeo, wheelThickness, 16, 32);
    const rimAccentGeo = new THREE.TorusGeometry(wheelRadiusGeo - wheelThickness*0.7, wheelThickness * 0.5, 16, 32);

    const createWheelWithDiscBrake = (isRear = false) => {
        const wheelGrp = new THREE.Group();
        
        // Tire and rim
        wheelGrp.add(new THREE.Mesh(rimGeo, tireMaterial));
        wheelGrp.add(new THREE.Mesh(rimAccentGeo, bikeAccentMaterial));
        
        // Hub with realistic proportions
        const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16);
        const hub = new THREE.Mesh(hubGeo, aluminumMaterial);
        hub.rotation.z = Math.PI / 2;
        wheelGrp.add(hub);
        
        // Disc Brake Rotor - realistic 160mm rotor
        const rotorRadius = 0.08;
        const rotorGeo = new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.002, 32);
        m.discRotor = new THREE.Mesh(rotorGeo, discBrakeMaterial);
        m.discRotor.rotation.z = Math.PI / 2;
        m.discRotor.position.z = -0.06; // Offset from hub
        
        // Rotor mounting bolts
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.01, 8), aluminumMaterial);
            bolt.position.set(
                Math.cos(angle) * (rotorRadius * 0.7),
                Math.sin(angle) * (rotorRadius * 0.7),
                -0.06
            );
            bolt.rotation.z = Math.PI / 2;
            wheelGrp.add(bolt);
        }
        
        // Rotor cooling vanes (realistic pattern)
        const vaneCount = 24;
        for (let i = 0; i < vaneCount; i++) {
            const angle = (i / vaneCount) * Math.PI * 2;
            const vane = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.02, 0.002), discBrakeMaterial);
            vane.position.set(
                Math.cos(angle) * (rotorRadius * 0.8),
                Math.sin(angle) * (rotorRadius * 0.8),
                -0.06
            );
            vane.rotation.z = angle;
            wheelGrp.add(vane);
        }
        
        wheelGrp.add(m.discRotor);
        
        // Disc Brake Caliper
        m.brakeCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), brakeMaterial);
        m.brakeCaliper.position.set(0, -rotorRadius - 0.02, -0.06);
        wheelGrp.add(m.brakeCaliper);
        
        // Brake pads (visible inside caliper)
        m.brakePadInner = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), blackMaterial);
        m.brakePadInner.position.set(0, -rotorRadius - 0.02, -0.065);
        wheelGrp.add(m.brakePadInner);
        
        m.brakePadOuter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), blackMaterial);
        m.brakePadOuter.position.set(0, -rotorRadius - 0.02, -0.055);
        wheelGrp.add(m.brakePadOuter);
        
        // Enhanced spokes - 28 spokes for road bike
        const spokeCount = 28;
        const spokeRadius = 0.002;
        const spokeLength = wheelRadiusGeo - 0.06;
        
        for (let i = 0; i < spokeCount; i++) {
            const angle = (i / spokeCount) * Math.PI * 2;
            const spokeGeo = new THREE.CylinderGeometry(spokeRadius, spokeRadius, spokeLength, 6);
            const spoke = new THREE.Mesh(spokeGeo, spokeMaterial);
            
            const spokeX = Math.cos(angle) * (spokeLength / 2 + 0.06);
            const spokeY = Math.sin(angle) * (spokeLength / 2 + 0.06);
            
            spoke.position.set(spokeX, spokeY, 0);
            spoke.rotation.z = angle + Math.PI / 2;
            
            wheelGrp.add(spoke);
        }
        
        return wheelGrp;
    };
    
    m.frontWheel = createWheelWithDiscBrake(false);
    m.frontWheel.position.set(0.85, wheelRadiusGeo, 0);
    m.bikeGroup.add(m.frontWheel);

    m.backWheel = createWheelWithDiscBrake(true);
    m.backWheel.position.copy(rearDropoutPos);
    m.backWheel.position.y = wheelRadiusGeo;
    m.bikeGroup.add(m.backWheel);

    // === DRIVETRAIN ===
    // Crank Arms and Bottom Bracket
    m.crankSet = new THREE.Group();
    
    m.leftCrankArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.17, 0.02), aluminumMaterial);
    m.leftCrankArm.position.y = 0.085;
    
    m.rightCrankArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.17, 0.02), aluminumMaterial);
    m.rightCrankArm.position.y = -0.085;
    
    // Pedals
    m.leftPedal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.05), blackMaterial);
    m.leftPedal.position.set(0.04, 0.085, 0);
    
    m.rightPedal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.05), blackMaterial);
    m.rightPedal.position.set(0.04, -0.085, 0);
    
    // Chainrings - compact double setup
    const largeChainringRadius = 0.11;
    const smallChainringRadius = 0.085;
    
    m.largeChainring = new THREE.Mesh(new THREE.TorusGeometry(largeChainringRadius, 0.006, 8, 48), aluminumMaterial);
    m.largeChainring.rotation.z = Math.PI / 2;
    m.largeChainring.position.z = -0.01;
    
    m.smallChainring = new THREE.Mesh(new THREE.TorusGeometry(smallChainringRadius, 0.005, 8, 40), aluminumMaterial);
    m.smallChainring.rotation.z = Math.PI / 2;
    m.smallChainring.position.z = 0.01;
    
    // Chainring teeth
    const addChainringTeeth = (chainring, radius, toothCount, zOffset) => {
        for (let i = 0; i < toothCount; i++) {
            const angle = (i / toothCount) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.015, 0.008), aluminumMaterial);
            tooth.position.set(
                Math.cos(angle) * (radius + 0.008),
                Math.sin(angle) * (radius + 0.008),
                zOffset
            );
            tooth.rotation.z = angle;
            chainring.add(tooth);
        }
    };
    
    addChainringTeeth(m.largeChainring, largeChainringRadius, 50, 0);
    addChainringTeeth(m.smallChainring, smallChainringRadius, 34, 0);
    
    m.crankSet.add(m.leftCrankArm, m.rightCrankArm, m.leftPedal, m.rightPedal, m.largeChainring, m.smallChainring);
    m.crankSet.position.copy(bottomBracketPos);
    m.bikeGroup.add(m.crankSet);

    // === REAR CASSETTE ===
    m.cassette = new THREE.Group();
    const cassetteGears = [0.09, 0.085, 0.08, 0.075, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045, 0.04]; // 11-speed cassette
    
    cassetteGears.forEach((radius, index) => {
        const gearGeo = new THREE.TorusGeometry(radius, 0.004, 8, Math.floor(radius * 200));
        const gear = new THREE.Mesh(gearGeo, gearMaterial);
        gear.rotation.z = Math.PI / 2;
        gear.position.z = -0.05 - (index * 0.006);
        
        // Add realistic gear teeth
        const gearToothCount = Math.floor(radius * 120);
        for (let i = 0; i < gearToothCount; i++) {
            const angle = (i / gearToothCount) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.012, 0.005), gearMaterial);
            tooth.position.set(
                Math.cos(angle) * (radius + 0.006),
                Math.sin(angle) * (radius + 0.006),
                0
            );
            tooth.rotation.z = angle;
            gear.add(tooth);
        }
        
        m.cassette.add(gear);
    });
    
    m.cassette.position.copy(rearDropoutPos);
    m.cassette.position.y = wheelRadiusGeo;
    m.cassette.position.z = -0.05;
    m.bikeGroup.add(m.cassette);

    // === DERAILLEURS ===
    // Front Derailleur
    m.frontDerailleur = new THREE.Group();
    
    m.frontDerailerBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), blackMaterial);
    m.frontDerailerBody.position.set(-0.02, 0, 0);
    
    m.frontDerailerCage = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.06), blackMaterial);
    m.frontDerailerCage.position.set(0.04, 0, 0);
    
    m.frontDerailleur.add(m.frontDerailerBody, m.frontDerailerCage);
    m.frontDerailleur.position.set(-0.05, 0.5, 0);
    m.bikeGroup.add(m.frontDerailleur);

    // Rear Derailleur with Jockey Wheels
    m.rearDerailleur = new THREE.Group();
    
    m.rearDerailerBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), blackMaterial);
    
    // Upper Jockey Wheel
    m.upperJockeyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), aluminumMaterial);
    m.upperJockeyWheel.rotation.z = Math.PI / 2;
    m.upperJockeyWheel.position.set(0, 0.04, 0);
    
    // Lower Jockey Wheel
    m.lowerJockeyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), aluminumMaterial);
    m.lowerJockeyWheel.rotation.z = Math.PI / 2;
    m.lowerJockeyWheel.position.set(0, -0.04, 0);
    
    // Derailleur cage
    m.rearDerailerCage = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), blackMaterial);
    m.rearDerailerCage.position.set(0, 0, -0.02);
    
    m.rearDerailleur.add(m.rearDerailerBody, m.upperJockeyWheel, m.lowerJockeyWheel, m.rearDerailerCage);
    m.rearDerailleur.position.copy(rearDropoutPos);
    m.rearDerailleur.position.y = 0.2;
    m.rearDerailleur.position.z = -0.1;
    m.bikeGroup.add(m.rearDerailleur);

    // === ENHANCED BIKE CHAIN ===
    m.chainGroup = new THREE.Group();
    
    const chainRadius = largeChainringRadius;
    const cassetteRadius = 0.07;
    const chainSegments = 80;
    const chainStart = bottomBracketPos.clone();
    const chainEnd = rearDropoutPos.clone();
    chainEnd.y = wheelRadiusGeo;
    
    // Create more realistic chain with proper routing through derailleurs
    for (let i = 0; i <= chainSegments; i++) {
        const t = i / chainSegments;
        let linkPos;
        
        if (t < 0.25) {
            // Around chainring
            const angle = (t / 0.25) * Math.PI;
            linkPos = new THREE.Vector3(
                chainStart.x + Math.cos(angle + Math.PI) * chainRadius,
                chainStart.y + Math.sin(angle + Math.PI) * chainRadius,
                0
            );
        } else if (t > 0.75) {
            // Around cassette, through rear derailleur
            const angle = ((t - 0.75) / 0.25) * Math.PI * 1.5;
            linkPos = new THREE.Vector3(
                chainEnd.x + Math.cos(angle) * cassetteRadius,
                chainEnd.y + Math.sin(angle) * cassetteRadius,
                0
            );
        } else {
            // Straight segments with derailleur routing
            const straightT = (t - 0.25) / 0.5;
            if (straightT < 0.5) {
                // Top segment
                linkPos = new THREE.Vector3().lerpVectors(
                    new THREE.Vector3(chainStart.x - chainRadius, chainStart.y, 0),
                    new THREE.Vector3(chainEnd.x + cassetteRadius, chainEnd.y, 0),
                    straightT * 2
                );
            } else {
                // Bottom segment through rear derailleur
                const bottomT = (straightT - 0.5) * 2;
                const jockeyPos = new THREE.Vector3(chainEnd.x, 0.2, 0);
                if (bottomT < 0.5) {
                    linkPos = new THREE.Vector3().lerpVectors(
                        new THREE.Vector3(chainEnd.x, chainEnd.y - cassetteRadius, 0),
                        jockeyPos,
                        bottomT * 2
                    );
                } else {
                    linkPos = new THREE.Vector3().lerpVectors(
                        jockeyPos,
                        new THREE.Vector3(chainStart.x - chainRadius, chainStart.y - chainRadius, 0),
                        (bottomT - 0.5) * 2
                    );
                }
            }
        }
        
        const linkGeo = new THREE.BoxGeometry(0.006, 0.002, 0.003);
        const link = new THREE.Mesh(linkGeo, chainMaterial);
        link.position.copy(linkPos);
        m.chainGroup.add(link);
    }
    
    m.bikeGroup.add(m.chainGroup);

    // === BRAKE CABLES AND HOUSING ===
    // Brake cable from brake lever to front caliper
    m.frontBrakeCable = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.6, 8), blackMaterial);
    m.frontBrakeCable.position.lerpVectors(headTubePosition, new THREE.Vector3(0.65, 0.35, -0.06), 0.5);
    m.frontBrakeCable.lookAt(new THREE.Vector3(0.65, 0.35, -0.06));
    m.frontBrakeCable.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.frontBrakeCable);

    // Brake cable from brake lever to rear caliper
    m.rearBrakeCable = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.0, 8), blackMaterial);
    m.rearBrakeCable.position.lerpVectors(headTubePosition, rearDropoutPos, 0.5);
    m.rearBrakeCable.position.z = 0.1;
    m.rearBrakeCable.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, 0.1));
    m.rearBrakeCable.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.rearBrakeCable);

    // === CYCLIST COMPONENTS ===
    m.cyclistGroup = new THREE.Group();
    m.cyclistGroup.position.copy(seatTubeTopPos);
    m.cyclistGroup.position.y += 0.25;
    
    // Orient cyclist to face forward (towards handlebars/front wheel)
    m.cyclistGroup.rotation.y = 0; // Face forward along bike direction

    // Enhanced torso with realistic human body shape
    m.torso = new THREE.Group();
    
    // Create a more realistic torso using multiple shapes
    // Upper chest/shoulders - broader and more muscular
    const upperChestGeo = new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const upperChest = new THREE.Mesh(upperChestGeo, redJerseyMaterial);
    upperChest.position.y = 0.15;
    upperChest.scale.set(1, 0.8, 0.7); // Flatten slightly and make more human proportions
    
    // Middle torso - slightly tapered
    const midTorsoGeo = new THREE.SphereGeometry(0.20, 16, 12);
    const midTorso = new THREE.Mesh(midTorsoGeo, redJerseyMaterial);
    midTorso.position.y = -0.05;
    midTorso.scale.set(1, 1.2, 0.8); // Elongate vertically, compress front-to-back
    
    // Lower torso/waist - narrower
    const lowerTorsoGeo = new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, redJerseyMaterial);
    lowerTorso.position.y = -0.25;
    lowerTorso.scale.set(1, 0.9, 0.7);
    
    // Shoulder definition
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), redJerseyMaterial);
    leftShoulder.position.set(-0.20, 0.20, 0);
    leftShoulder.scale.set(1.2, 0.8, 0.8);
    
    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), redJerseyMaterial);
    rightShoulder.position.set(0.20, 0.20, 0);
    rightShoulder.scale.set(1.2, 0.8, 0.8);
    
    // Jersey details
    const torsoStripe = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), whiteMaterial);
    torsoStripe.position.y = 0.05;
    torsoStripe.scale.set(1, 0.4, 0.8); // Thin horizontal stripe
    
    // Jersey sponsor logos (simple geometric shapes)
    const chestLogo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.01), whiteMaterial);
    chestLogo.position.set(0, 0.15, 0.18);
    
    m.torso.add(upperChest, midTorso, lowerTorso, leftShoulder, rightShoulder, torsoStripe, chestLogo);
    m.torso.rotation.x = Math.PI / 4; // Lean forward more towards handlebars (45 degrees)
    m.cyclistGroup.add(m.torso);

    // Enhanced head with realistic facial features
    m.head = new THREE.Group();
    
    // Neck - connects head to torso
    m.neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12), skinMaterial);
    m.neck.position.set(0, -0.06, 0);
    m.head.add(m.neck);
    
    // Main head shape - slightly more oval
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMaterial);
    head.scale.set(1, 1.1, 0.9); // Make slightly more human proportions
    m.head.add(head);
    
    // Eyes
    const leftEye = new THREE.Group();
    const rightEye = new THREE.Group();
    
    // Eyeballs
    const leftEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), whiteMaterial);
    const rightEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), whiteMaterial);
    leftEyeball.position.set(-0.08, 0.05, 0.15);
    rightEyeball.position.set(0.08, 0.05, 0.15);
    
    // Pupils/Iris
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshStandardMaterial({ color: '#2c3e50' }));
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshStandardMaterial({ color: '#2c3e50' }));
    leftPupil.position.set(0, 0, 0.01);
    rightPupil.position.set(0, 0, 0.01);
    
    leftEye.add(leftEyeball, leftPupil);
    rightEye.add(rightEyeball, rightPupil);
    leftEye.position.copy(leftEyeball.position);
    rightEye.position.copy(rightEyeball.position);
    m.head.add(leftEye, rightEye);
    
    // Eyebrows
    const leftEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), hairMaterial);
    leftEyebrow.position.set(-0.08, 0.08, 0.15);
    leftEyebrow.rotation.z = -0.1;
    
    const rightEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), hairMaterial);
    rightEyebrow.position.set(0.08, 0.08, 0.15);
    rightEyebrow.rotation.z = 0.1;
    
    m.head.add(leftEyebrow, rightEyebrow);
    
    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 8), skinMaterial);
    nose.position.set(0, 0.02, 0.17);
    nose.rotation.x = Math.PI / 2;
    m.head.add(nose);
    
    // Mouth
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), new THREE.MeshStandardMaterial({ color: '#8b4513' }));
    mouth.position.set(0, -0.02, 0.16);
    m.head.add(mouth);
    
    // Ears
    const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), skinMaterial);
    leftEar.position.set(-0.16, 0.02, 0.02);
    leftEar.scale.set(0.6, 1, 1.2);
    
    const rightEar = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), skinMaterial);
    rightEar.position.set(0.16, 0.02, 0.02);
    rightEar.scale.set(0.6, 1, 1.2);
    
    m.head.add(leftEar, rightEar);
    
    // Beard/Facial hair
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), hairMaterial);
    beard.position.set(0, -0.08, 0.12);
    beard.scale.set(1, 0.8, 0.6);
    m.head.add(beard);
    
    // Hair on top of head (visible under helmet)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMaterial);
    hair.position.y = 0.01;
    m.head.add(hair);
    
    // Cycling helmet - positioned to not cover face
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), whiteMaterial);
    helmet.position.set(0, 0.08, -0.02); // Higher up and slightly back to avoid covering face
    
    // Helmet vents
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.02), blackMaterial);
        vent.position.set(
            Math.cos(angle) * 0.17,
            0.08,
            Math.sin(angle) * 0.17
        );
        helmet.add(vent);
    }
    
    // Helmet strap
    const helmetStrap = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.01), blackMaterial);
    helmetStrap.position.set(-0.14, -0.05, 0.08);
    helmetStrap.rotation.z = -0.3;
    m.head.add(helmetStrap);
    
    const helmetStrap2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.01), blackMaterial);
    helmetStrap2.position.set(0.14, -0.05, 0.08);
    helmetStrap2.rotation.z = 0.3;
    m.head.add(helmetStrap2);
    
    m.head.add(helmet);
    
    const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.3, 8), hairMaterial);
    ponytail.position.set(0, -0.08, -0.15);
    ponytail.rotation.x = -Math.PI / 5;
    m.head.add(ponytail);
    
    m.head.position.set(0, 0.45, 0.05);
    // Tilt head up to look forward while body is leaned down towards handlebars
    m.head.rotation.x = -Math.PI / 6; // Tilt head up about 30 degrees to compensate for forward lean
    m.cyclistGroup.add(m.head);

    // Enhanced arms with cycling position - reaching forward to handlebars
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8);
    m.leftArm = new THREE.Mesh(armGeo, redJerseyMaterial);
    m.leftArm.position.set(-0.25, 0.2, 0.15); // Move slightly forward
    m.leftArm.rotation.set(Math.PI / 2, -Math.PI / 8, -Math.PI / 4); // More forward reach
    m.cyclistGroup.add(m.leftArm);

    m.rightArm = new THREE.Mesh(armGeo, redJerseyMaterial);
    m.rightArm.position.set(0.25, 0.2, 0.15); // Move slightly forward  
    m.rightArm.rotation.set(Math.PI / 2, Math.PI / 8, Math.PI / 4); // More forward reach
    m.cyclistGroup.add(m.rightArm);

    // Cycling gloves - positioned to grab handlebars
    const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
    m.leftHand = new THREE.Mesh(handGeo, blackMaterial);
    m.leftHand.position.set(-0.15, -0.18, 0.18); // Forward reach to handlebars
    m.leftArm.add(m.leftHand);

    m.rightHand = new THREE.Mesh(handGeo, blackMaterial);
    m.rightHand.position.set(0.15, -0.18, 0.18); // Forward reach to handlebars
    m.rightArm.add(m.rightHand);

    // Enhanced legs with cycling shorts and shoes
    const legUpperGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 8);
    const legLowerGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8);
    const cyclingShoeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.18);

    m.leftUpperLeg = new THREE.Mesh(legUpperGeo, blackMaterial);
    m.leftUpperLeg.position.set(-0.15, -0.3, 0);
    m.cyclistGroup.add(m.leftUpperLeg);

    m.leftLowerLeg = new THREE.Mesh(legLowerGeo, skinMaterial);
    m.leftLowerLeg.position.y = -0.35;
    m.leftUpperLeg.add(m.leftLowerLeg);

    m.leftFoot = new THREE.Mesh(cyclingShoeGeo, blackMaterial);
    m.leftFoot.position.y = -0.19;
    m.leftFoot.position.z = 0.05;
    
    // Cleats on cycling shoes
    const leftCleat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.06), aluminumMaterial);
    leftCleat.position.y = -0.02;
    m.leftFoot.add(leftCleat);
    
    m.leftLowerLeg.add(m.leftFoot);

    m.rightUpperLeg = new THREE.Mesh(legUpperGeo, blackMaterial);
    m.rightUpperLeg.position.set(0.15, -0.3, 0);
    m.cyclistGroup.add(m.rightUpperLeg);

    m.rightLowerLeg = new THREE.Mesh(legLowerGeo, skinMaterial);
    m.rightLowerLeg.position.y = -0.35;
    m.rightUpperLeg.add(m.rightLowerLeg);

    m.rightFoot = new THREE.Mesh(cyclingShoeGeo, blackMaterial);
    m.rightFoot.position.y = -0.19;
    m.rightFoot.position.z = 0.05;
    
    const rightCleat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.06), aluminumMaterial);
    rightCleat.position.y = -0.02;
    m.rightFoot.add(rightCleat);
    
    m.rightLowerLeg.add(m.rightFoot);

    // Store all parts
    parts.current = m;

    if (avatarGroupRef.current) {
        // Clear previous bike and cyclist before adding new ones if this useEffect runs multiple times
        while(avatarGroupRef.current.children.length > 0){
            avatarGroupRef.current.remove(avatarGroupRef.current.children[0]);
        }
        avatarGroupRef.current.add(m.bikeGroup);
        avatarGroupRef.current.add(m.cyclistGroup);
    }
}, [api]); 

  useFrame((state, delta) => {
    const { 
      frontWheel, backWheel, crankSet, leftUpperLeg, rightUpperLeg, steeringAssembly, 
      largeChainring, smallChainring, cassette, chainGroup, upperJockeyWheel, lowerJockeyWheel,
      rearDerailleur, frontDerailleur
    } = parts.current;
    
    const cadence = cadenceStream.latest || 0;
    const rotationPerFrame = (cadence / 60) * (2 * Math.PI) * delta;

    // Wheel animations
    if (frontWheel) frontWheel.rotation.z -= rotationPerFrame * 2.5;
    if (backWheel) backWheel.rotation.z -= rotationPerFrame * 2.5;
    
    // Drivetrain animations
    if (crankSet) {
      crankSet.rotation.z -= rotationPerFrame;
      const crankAngle = crankSet.rotation.z;
      
      // Leg pedaling animation
      if (leftUpperLeg) {
        leftUpperLeg.rotation.x = Math.sin(crankAngle) * 0.6 - Math.PI / 4;
      }
      if (rightUpperLeg) {
        rightUpperLeg.rotation.x = Math.sin(crankAngle + Math.PI) * 0.6 - Math.PI / 4;
      }
    }
    
    // Chainring animations
    if (largeChainring) largeChainring.rotation.z -= rotationPerFrame;
    if (smallChainring) smallChainring.rotation.z -= rotationPerFrame;
    
    // Cassette animation
    if (cassette) {
      cassette.rotation.z -= rotationPerFrame * 2.5;
    }
    
    // Jockey wheel animations
    if (upperJockeyWheel) upperJockeyWheel.rotation.z -= rotationPerFrame * 4;
    if (lowerJockeyWheel) lowerJockeyWheel.rotation.z -= rotationPerFrame * 4;
    
    // Chain movement animation
    if (chainGroup) {
      chainGroup.children.forEach((link, index) => {
        const offset = (rotationPerFrame * 15 + index * 0.08) % (Math.PI * 2);
        link.position.y += Math.sin(offset) * 0.0008;
        link.rotation.z += rotationPerFrame * 0.1;
      });
    }
    
    // Derailleur subtle movement
    if (rearDerailleur && speed > 1) {
      rearDerailleur.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.02;
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
    const physicsBodyObject3D = ref.current;
    if (!physicsBodyObject3D) return;

    const currentSpeed = speed;

    // Update physics body rotation (yaw) based on steering
    if (currentSpeed > 0.1) {
        const TURN_SENSITIVITY_BASE = 1.0;
        const speedFactor = Math.max(0.1, 1 - (currentSpeed / (physicsSettings.maxSpeed * 1.5)));
        const turnRate = -newCurrentSteerAngle * currentSpeed * TURN_SENSITIVITY_BASE * speedFactor * delta;

        const currentQuaternionTHREE = new THREE.Quaternion();
        physicsBodyObject3D.getWorldQuaternion(currentQuaternionTHREE);

        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnRate);
        
        const newBodyQuaternionTHREE = currentQuaternionTHREE.multiply(deltaRotation);
        api.quaternion.copy(newBodyQuaternionTHREE);
    }

    // Update physics body velocity based on new orientation
    const bodyQuaternionForVelocity = new THREE.Quaternion();
    physicsBodyObject3D.getWorldQuaternion(bodyQuaternionForVelocity);

    const forwardDirection = new THREE.Vector3(1, 0, 0);
    forwardDirection.applyQuaternion(bodyQuaternionForVelocity);

    const yVelocity = currentVelocityRef.current[1];

    api.velocity.set(
        forwardDirection.x * currentSpeed,
        yVelocity,
        forwardDirection.z * currentSpeed
    );
    
    // Sync visual group to physics body
    if (avatarGroupRef.current && physicsBodyObject3D) {
        const bodyPosition = new THREE.Vector3();
        physicsBodyObject3D.getWorldPosition(bodyPosition);

        avatarGroupRef.current.position.copy(bodyPosition);
        avatarGroupRef.current.position.y = (bodyPosition.y - 0.5) + wheelRadius;
        avatarGroupRef.current.quaternion.copy(bodyQuaternionForVelocity);
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