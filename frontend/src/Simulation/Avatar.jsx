// src/Simulation/Avatar.jsx
import React, { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import BikeModel from './BikeModel';
import CyclistModel from './CyclistModel';

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

const Avatar = forwardRef(({ speed, cadenceStream, physicsSettings, onAchievement }, ref) => {
  const wheelRadius = 0.35;
  
  const [physicsBodyCannonRef, api] = useBox(() => ({
        mass: physicsSettings.avatarMass + 10, 
        position: [0, 0.5, 0], 
        args: [0.5, 1, 1.5], 
  }));

  const avatarVisualGroupRef = useRef(new THREE.Group()); 
  const bikePartsRef = useRef(null);
  const cyclistPartsRef = useRef(null);
  
  const materials = useMemo(() => createMaterials(), []);
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

  // Expose the physics body's Object3D ref (from useBox)
  useImperativeHandle(ref, () => ({
    physicsBodyRef: physicsBodyCannonRef 
  }));

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

  useEffect(() => {
    const group = avatarVisualGroupRef.current;
    const bike = bikePartsRef.current?.bikeGroup;
    const cyclist = cyclistPartsRef.current?.cyclistGroup;

    if (group && bike && cyclist) {
        while(group.children.length > 0){ group.remove(group.children[0]); }
        group.add(bike);
        group.add(cyclist);
    }
  }, [bikePartsRef.current, cyclistPartsRef.current]);


  useFrame((state, delta) => {
    const bikeParts = bikePartsRef.current;
    const cyclistParts = cyclistPartsRef.current;

    // Ensure physicsBodyCannonRef.current (the Object3D from useBox) is available
    if (!bikeParts || !cyclistParts || !physicsBodyCannonRef.current) return;

    const cadence = cadenceStream.latest || 0;
    const rotationPerFrame = (cadence / 60) * (2 * Math.PI) * delta;

    // === Animations ===
    if (bikeParts.frontWheel) bikeParts.frontWheel.rotation.z -= rotationPerFrame * 2.5 * (speed > 0 ? Math.sign(speed) : 1);
    if (bikeParts.backWheel) bikeParts.backWheel.rotation.z -= rotationPerFrame * 2.5 * (speed > 0 ? Math.sign(speed) : 1);
    
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
        link.position.y += Math.sin(offset) * 0.0008;
        link.rotation.z += rotationPerFrame * 0.1;
      });
    }
    
    if (bikeParts.rearDerailleur && Math.abs(speed) > 1) {
      bikeParts.rearDerailleur.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }

    const MAX_STEER_ANGLE = Math.PI / 6;
    const STEER_LERP_FACTOR = 0.15;
    const targetSteerAngle = steeringInput * MAX_STEER_ANGLE * (Math.abs(speed) > 0.1 ? 1 : 0);
    const newCurrentSteerAngle = THREE.MathUtils.lerp(currentSteerAngle, targetSteerAngle, STEER_LERP_FACTOR);
    setCurrentSteerAngle(newCurrentSteerAngle);

    if (bikeParts.steeringAssembly) {
      bikeParts.steeringAssembly.rotation.y = newCurrentSteerAngle;
    }

    const physicsBodyObject3D = physicsBodyCannonRef.current;
    const currentSpeed = speed; 

    if (Math.abs(currentSpeed) > 0.01) {
        const TURN_SENSITIVITY_BASE = 0.8; 
        const effectiveSpeedForTurning = Math.min(Math.abs(currentSpeed), physicsSettings.maxSpeed / 2); 
        const speedFactor = Math.max(0.1, 1 - (effectiveSpeedForTurning / (physicsSettings.maxSpeed * 1.0)));
        const turnRate = -newCurrentSteerAngle * TURN_SENSITIVITY_BASE * speedFactor * delta * 25;

        const currentQuaternionTHREE = new THREE.Quaternion();
        physicsBodyObject3D.getWorldQuaternion(currentQuaternionTHREE);
        
        const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnRate);
        const newBodyQuaternionTHREE = currentQuaternionTHREE.multiply(deltaRotation);
        api.quaternion.copy(newBodyQuaternionTHREE); 
    }

    const bodyQuaternionForVelocity = new THREE.Quaternion();
    physicsBodyObject3D.getWorldQuaternion(bodyQuaternionForVelocity);
    const forwardDirection = new THREE.Vector3(1, 0, 0); 
    forwardDirection.applyQuaternion(bodyQuaternionForVelocity);
    
    const yVelocity = currentVelocityRef.current[1]; 
    api.velocity.set(forwardDirection.x * currentSpeed, yVelocity, forwardDirection.z * currentSpeed);
    
    if (avatarVisualGroupRef.current && physicsBodyObject3D) {
        const bodyPosition = new THREE.Vector3();
        physicsBodyObject3D.getWorldPosition(bodyPosition);
        avatarVisualGroupRef.current.position.copy(bodyPosition);
        avatarVisualGroupRef.current.position.y = bodyPosition.y - (physicsSettings.avatarMass > 50 ? 0.5 : 0.25) + wheelRadius; // Simplified Y offset logic
        avatarVisualGroupRef.current.quaternion.copy(bodyQuaternionForVelocity);
    }

    const currentPosVec = new THREE.Vector3();
    physicsBodyObject3D.getWorldPosition(currentPosVec);
    if (lastPositionRef.current) {
        const distMovedThisFrame = currentPosVec.distanceTo(lastPositionRef.current);
        const newTotalDistance = totalDistance + distMovedThisFrame;
        setTotalDistance(newTotalDistance);

        if (newTotalDistance >= achievementDataRef.current.distance) {
            if(onAchievement) onAchievement(`Reached ${(achievementDataRef.current.distance / 1000).toFixed(1)}km`);
            achievementDataRef.current.distance += achievementDataRef.current.step;
        }
    }
    lastPositionRef.current = currentPosVec.clone();
  });

  return (
    <>
      {/* This mesh is the physics body, it doesn't need visual geometry itself if avatarVisualGroupRef is used for visuals. */}
      <mesh ref={physicsBodyCannonRef}>
         {/* <boxGeometry args={[0.5, 1, 1.5]} />  // Can be removed if physics box is just for collision shape
         <meshBasicMaterial visible={false} /> */}
      </mesh>
      
      <BikeModel ref={bikePartsRef} materials={materials} />
      <CyclistModel ref={cyclistPartsRef} materials={materials} seatTubeTopPos={seatTubeTopPosForCyclist} />

      <primitive object={avatarVisualGroupRef.current} />
    </>
  );
});

export { Avatar };