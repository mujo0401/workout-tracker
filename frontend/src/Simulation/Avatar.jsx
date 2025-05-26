// Avatar.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import BikeModel from './BikeModel';
import CyclistModel from './CyclistModel';

// Define materials once, possibly outside if they are truly global or pass them down
const createMaterials = () => ({
    redJerseyMaterial: new THREE.MeshStandardMaterial({ color: '#c0392b' }),
    whiteMaterial: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
    blackMaterial: new THREE.MeshStandardMaterial({ color: '#2c3e50' }),
    skinMaterial: new THREE.MeshStandardMaterial({ color: '#f3c5ab' }),
    hairMaterial: new THREE.MeshStandardMaterial({ color: '#4a3b31' }),
    bikeAccentMaterial: new THREE.MeshStandardMaterial({ color: '#3498db' }),
    tireMaterial: new THREE.MeshStandardMaterial({ color: '#333333' }),
    spokeMaterial: new THREE.MeshStandardMaterial({ color: '#c0c0c0', side: THREE.DoubleSide }),
    chainMaterial: new THREE.MeshStandardMaterial({ color: '#666666' }),
    gearMaterial: new THREE.MeshStandardMaterial({ color: '#888888' }),
    carbonFiberMaterial: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.3 }),
    aluminumMaterial: new THREE.MeshStandardMaterial({ color: '#b8b8b8', metalness: 0.8, roughness: 0.2 }),
    brakeMaterial: new THREE.MeshStandardMaterial({ color: '#444444', metalness: 0.7 }),
    discBrakeMaterial: new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.9, roughness: 0.1 }),
});


export function Avatar({ speed, cadenceStream, physicsSettings, onAchievement }) {
  const wheelRadius = 0.35;
  const [physicsBodyRef, api] = useBox(() => ({
        mass: physicsSettings.avatarMass + 10, // Bike + rider
        position: [0, 0.5, 0], // Initial position
        args: [0.5, 1, 1.5], // Approx. bounding box of rider + bike
    }));

  const avatarGroupRef = useRef(new THREE.Group()); // This group will contain bike and cyclist
  const bikePartsRef = useRef(null);
  const cyclistPartsRef = useRef(null);
  
  // Memoize materials to prevent recreation on every render
  const materials = useMemo(() => createMaterials(), []);

  // For positioning the cyclist model correctly on the bike
  // This is a simplified way; a more robust solution might involve getting this from BikeModel
  const seatTubeTopPosForCyclist = useMemo(() => new THREE.Vector3(-0.3, 0.8, 0), []);


  const [steeringInput, setSteeringInput] = useState(0);
  const [currentSteerAngle, setCurrentSteerAngle] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const lastPositionRef = useRef(null);
  const achievementDataRef = useRef({
      distance: physicsSettings.achievementDistance,
      step: physicsSettings.achievementStep,
  });
  const currentVelocityRef = useRef([0, 0, 0]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setSteeringInput(-1);
      else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setSteeringInput(1);
    };
    const handleKeyUp = (event) => {
      if (((event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') && steeringInput === -1) ||
          ((event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') && steeringInput === 1)) {
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

  useEffect(() => {
    if (api && api.velocity) {
      const unsubscribe = api.velocity.subscribe((v) => currentVelocityRef.current = v);
      return unsubscribe;
    }
  }, [api]);

  // Effect to assemble bike and cyclist into the avatarGroupRef
  useEffect(() => {
    const group = avatarGroupRef.current;
    const bike = bikePartsRef.current?.bikeGroup;
    const cyclist = cyclistPartsRef.current?.cyclistGroup;

    if (group && bike && cyclist) {
        // Clear previous children if any (though BikeModel/CyclistModel handle their own internals)
        while(group.children.length > 0){ group.remove(group.children[0]); }
        group.add(bike);
        group.add(cyclist);
    }
    // Ensure cyclist is positioned correctly relative to the bike model's coordinate system
    if (cyclist) {
        // The CyclistModel positions itself based on seatTubeTopPos,
        // which is relative to the bike's origin (0,0,0) within its own group.
        // So, no major adjustments might be needed here if BikeModel and CyclistModel origins are aligned.
    }

  }, [bikePartsRef.current, cyclistPartsRef.current]);


  useFrame((state, delta) => {
    const bikeParts = bikePartsRef.current;
    const cyclistParts = cyclistPartsRef.current;

    if (!bikeParts || !cyclistParts || !physicsBodyRef.current) return;

    const cadence = cadenceStream.latest || 0;
    const rotationPerFrame = (cadence / 60) * (2 * Math.PI) * delta;

    // === Animations ===
    if (bikeParts.frontWheel) bikeParts.frontWheel.rotation.z -= rotationPerFrame * 2.5;
    if (bikeParts.backWheel) bikeParts.backWheel.rotation.z -= rotationPerFrame * 2.5;
    
    if (bikeParts.crankSet) {
      bikeParts.crankSet.rotation.z -= rotationPerFrame;
      const crankAngle = bikeParts.crankSet.rotation.z;
      if (cyclistParts.leftUpperLeg) cyclistParts.leftUpperLeg.rotation.x = Math.sin(crankAngle) * 0.6 - Math.PI / 4;
      if (cyclistParts.rightUpperLeg) cyclistParts.rightUpperLeg.rotation.x = Math.sin(crankAngle + Math.PI) * 0.6 - Math.PI / 4;
    }
    
    if (bikeParts.largeChainring) bikeParts.largeChainring.rotation.z -= rotationPerFrame;
    if (bikeParts.smallChainring) bikeParts.smallChainring.rotation.z -= rotationPerFrame;
    if (bikeParts.cassette) bikeParts.cassette.rotation.z -= rotationPerFrame * 2.5;
    if (bikeParts.upperJockeyWheel) bikeParts.upperJockeyWheel.rotation.z -= rotationPerFrame * 4;
    if (bikeParts.lowerJockeyWheel) bikeParts.lowerJockeyWheel.rotation.z -= rotationPerFrame * 4;
    
    if (bikeParts.chainGroup) {
      bikeParts.chainGroup.children.forEach((link, index) => {
        const offset = (rotationPerFrame * 15 + index * 0.08) % (Math.PI * 2);
        link.position.y += Math.sin(offset) * 0.0008; // Subtle chain movement
        link.rotation.z += rotationPerFrame * 0.1;
      });
    }
    
    if (bikeParts.rearDerailleur && speed > 1) {
      bikeParts.rearDerailleur.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }

    // Steering visual update
    const MAX_STEER_ANGLE = Math.PI / 5;
    const STEER_LERP_FACTOR = 0.1;
    const targetSteerAngle = steeringInput * MAX_STEER_ANGLE * (speed > 0.1 ? 1 : 0);
    
    const newCurrentSteerAngle = THREE.MathUtils.lerp(currentSteerAngle, targetSteerAngle, STEER_LERP_FACTOR);
    setCurrentSteerAngle(newCurrentSteerAngle);

    if (bikeParts.steeringAssembly) {
      bikeParts.steeringAssembly.rotation.y = newCurrentSteerAngle;
    }

    // === Physics body update ===
    const physicsBodyObject3D = physicsBodyRef.current;
    const currentSpeed = speed; // Use the speed prop

    if (currentSpeed > 0.1) {
        const TURN_SENSITIVITY_BASE = 1.0;
        const speedFactor = Math.max(0.1, 1 - (currentSpeed / (physicsSettings.maxSpeed * 1.5)));
        const turnRate = -newCurrentSteerAngle * currentSpeed * TURN_SENSITIVITY_BASE * speedFactor * delta;

        const currentQuaternionTHREE = new THREE.Quaternion();
        physicsBodyObject3D.getWorldQuaternion(currentQuaternionTHREE);
        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnRate);
        const newBodyQuaternionTHREE = currentQuaternionTHREE.multiply(deltaRotation);
        api.quaternion.copy(newBodyQuaternionTHREE); // Apply to physics body
    }

    const bodyQuaternionForVelocity = new THREE.Quaternion();
    physicsBodyObject3D.getWorldQuaternion(bodyQuaternionForVelocity);
    const forwardDirection = new THREE.Vector3(1, 0, 0); // Assuming bike model faces +X initially
    forwardDirection.applyQuaternion(bodyQuaternionForVelocity);
    
    const yVelocity = currentVelocityRef.current[1]; // Maintain current Y velocity for gravity/jumps
    api.velocity.set(forwardDirection.x * currentSpeed, yVelocity, forwardDirection.z * currentSpeed);
    
    // Sync visual group to physics body
    if (avatarGroupRef.current && physicsBodyObject3D) {
        const bodyPosition = new THREE.Vector3();
        physicsBodyObject3D.getWorldPosition(bodyPosition);

        avatarGroupRef.current.position.copy(bodyPosition);
        // Adjust Y so wheels are on the ground, depends on bike model's origin.
        // Assuming bike's origin is at bottom bracket, and physics body center is avatar center.
        avatarGroupRef.current.position.y = (bodyPosition.y - 0.5) + wheelRadius; 
        avatarGroupRef.current.quaternion.copy(bodyQuaternionForVelocity);
    }

    // Distance and Achievement Tracking
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
  });

  return (
    <>
      {/* Invisible physics body */}
      <mesh ref={physicsBodyRef}>
         {/* <boxGeometry args={[0.5, 1, 1.5]} /> 
         <meshStandardMaterial wireframe color="rgba(0,0,0,0.1)" transparent opacity={0.2} /> */}
      </mesh>
      
      {/* Bike and Cyclist Model Components (these don't render directly but populate refs) */}
      <BikeModel ref={bikePartsRef} materials={materials} />
      <CyclistModel ref={cyclistPartsRef} materials={materials} seatTubeTopPos={seatTubeTopPosForCyclist} />

      {/* The actual visual group that gets rendered and moved */}
      <primitive object={avatarGroupRef.current} />
    </>
  );
}