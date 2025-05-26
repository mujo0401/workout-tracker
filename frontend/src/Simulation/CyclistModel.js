// CyclistModel.jsx
import React, { useEffect, forwardRef } from 'react';
import * as THREE from 'three';

const CyclistModel = forwardRef((props, ref) => {
  const { materials, seatTubeTopPos } = props; // seatTubeTopPos is needed for positioning

  useEffect(() => {
    if (!seatTubeTopPos) return; // Don't build if base position is not ready

    const m = {}; // To store parts

    m.cyclistGroup = new THREE.Group();
    m.cyclistGroup.position.copy(seatTubeTopPos);
    m.cyclistGroup.position.y += 0.25; // Initial offset from seat tube top
    m.cyclistGroup.rotation.y = 0; 

    // === CYCLIST COMPONENTS ===
    // Enhanced torso
    m.torso = new THREE.Group();
    const upperChestGeo = new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const upperChest = new THREE.Mesh(upperChestGeo, materials.redJerseyMaterial);
    upperChest.position.y = 0.15;
    upperChest.scale.set(1, 0.8, 0.7);
    const midTorsoGeo = new THREE.SphereGeometry(0.20, 16, 12);
    const midTorso = new THREE.Mesh(midTorsoGeo, materials.redJerseyMaterial);
    midTorso.position.y = -0.05;
    midTorso.scale.set(1, 1.2, 0.8);
    const lowerTorsoGeo = new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, materials.redJerseyMaterial);
    lowerTorso.position.y = -0.25;
    lowerTorso.scale.set(1, 0.9, 0.7);
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), materials.redJerseyMaterial);
    leftShoulder.position.set(-0.20, 0.20, 0);
    leftShoulder.scale.set(1.2, 0.8, 0.8);
    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), materials.redJerseyMaterial);
    rightShoulder.position.set(0.20, 0.20, 0);
    rightShoulder.scale.set(1.2, 0.8, 0.8);
    const torsoStripe = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), materials.whiteMaterial);
    torsoStripe.position.y = 0.05;
    torsoStripe.scale.set(1, 0.4, 0.8);
    const chestLogo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.01), materials.whiteMaterial);
    chestLogo.position.set(0, 0.15, 0.18);
    m.torso.add(upperChest, midTorso, lowerTorso, leftShoulder, rightShoulder, torsoStripe, chestLogo);
    m.torso.rotation.x = Math.PI / 4;
    m.cyclistGroup.add(m.torso);

    // Enhanced head
    m.head = new THREE.Group();
    m.neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12), materials.skinMaterial);
    m.neck.position.set(0, -0.06, 0);
    m.head.add(m.neck);
    const headShape = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), materials.skinMaterial); // Renamed from 'head' to avoid conflict
    headShape.scale.set(1, 1.1, 0.9);
    m.head.add(headShape);
    
    const leftEye = new THREE.Group();
    const leftEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), materials.whiteMaterial);
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshStandardMaterial({ color: '#2c3e50' }));
    leftPupil.position.set(0, 0, 0.01);
    leftEye.add(leftEyeball, leftPupil);
    leftEye.position.set(-0.08, 0.05, 0.15); // Position group instead of individual parts if they move together

    const rightEye = new THREE.Group();
    const rightEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), materials.whiteMaterial);
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshStandardMaterial({ color: '#2c3e50' }));
    rightPupil.position.set(0, 0, 0.01);
    rightEye.add(rightEyeball, rightPupil);
    rightEye.position.set(0.08, 0.05, 0.15);
    m.head.add(leftEye, rightEye);

    const leftEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), materials.hairMaterial);
    leftEyebrow.position.set(-0.08, 0.08, 0.15);
    leftEyebrow.rotation.z = -0.1;
    const rightEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), materials.hairMaterial);
    rightEyebrow.position.set(0.08, 0.08, 0.15);
    rightEyebrow.rotation.z = 0.1;
    m.head.add(leftEyebrow, rightEyebrow);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 8), materials.skinMaterial);
    nose.position.set(0, 0.02, 0.17);
    nose.rotation.x = Math.PI / 2;
    m.head.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), new THREE.MeshStandardMaterial({ color: '#8b4513' }));
    mouth.position.set(0, -0.02, 0.16);
    m.head.add(mouth);
    const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), materials.skinMaterial);
    leftEar.position.set(-0.16, 0.02, 0.02);
    leftEar.scale.set(0.6, 1, 1.2);
    const rightEar = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), materials.skinMaterial);
    rightEar.position.set(0.16, 0.02, 0.02);
    rightEar.scale.set(0.6, 1, 1.2);
    m.head.add(leftEar, rightEar);
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), materials.hairMaterial);
    beard.position.set(0, -0.08, 0.12);
    beard.scale.set(1, 0.8, 0.6);
    m.head.add(beard);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), materials.hairMaterial);
    hair.position.y = 0.01;
    m.head.add(hair);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), materials.whiteMaterial);
    helmet.position.set(0, 0.08, -0.02);
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.02), materials.blackMaterial);
        vent.position.set(Math.cos(angle) * 0.17, 0.08, Math.sin(angle) * 0.17);
        helmet.add(vent);
    }
    m.head.add(helmet); // Add helmet before straps that attach to it or the head

    const helmetStrap = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.01), materials.blackMaterial);
    helmetStrap.position.set(-0.14, -0.05, 0.08);
    helmetStrap.rotation.z = -0.3;
    m.head.add(helmetStrap);
    const helmetStrap2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.01), materials.blackMaterial);
    helmetStrap2.position.set(0.14, -0.05, 0.08);
    helmetStrap2.rotation.z = 0.3;
    m.head.add(helmetStrap2);
    
    const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.3, 8), materials.hairMaterial);
    ponytail.position.set(0, -0.08, -0.15);
    ponytail.rotation.x = -Math.PI / 5;
    m.head.add(ponytail);
    
    m.head.position.set(0, 0.45, 0.05);
    m.head.rotation.x = -Math.PI / 6;
    m.cyclistGroup.add(m.head);

    // Enhanced arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8);
    m.leftArm = new THREE.Mesh(armGeo, materials.redJerseyMaterial);
    m.leftArm.position.set(-0.25, 0.2, 0.15);
    m.leftArm.rotation.set(Math.PI / 2, -Math.PI / 8, -Math.PI / 4);
    m.cyclistGroup.add(m.leftArm);

    m.rightArm = new THREE.Mesh(armGeo, materials.redJerseyMaterial);
    m.rightArm.position.set(0.25, 0.2, 0.15);  
    m.rightArm.rotation.set(Math.PI / 2, Math.PI / 8, Math.PI / 4);
    m.cyclistGroup.add(m.rightArm);

    const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
    m.leftHand = new THREE.Mesh(handGeo, materials.blackMaterial);
    m.leftHand.position.set(-0.15, -0.18, 0.18); // This should be relative to the arm's end if arm is rotated
    m.leftArm.add(m.leftHand); // Add hand to arm for easier relative positioning

    m.rightHand = new THREE.Mesh(handGeo, materials.blackMaterial);
    m.rightHand.position.set(0.15, -0.18, 0.18); // This should be relative to the arm's end
    m.rightArm.add(m.rightHand); // Add hand to arm

    // Enhanced legs
    const legUpperGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 8);
    const legLowerGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8);
    const cyclingShoeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.18);

    m.leftUpperLeg = new THREE.Mesh(legUpperGeo, materials.blackMaterial);
    m.leftUpperLeg.position.set(-0.15, -0.3, 0);
    m.cyclistGroup.add(m.leftUpperLeg);

    m.leftLowerLeg = new THREE.Mesh(legLowerGeo, materials.skinMaterial);
    m.leftLowerLeg.position.y = -0.35; // Relative to upper leg
    m.leftUpperLeg.add(m.leftLowerLeg);

    m.leftFoot = new THREE.Mesh(cyclingShoeGeo, materials.blackMaterial);
    m.leftFoot.position.y = -0.19; // Relative to lower leg
    m.leftFoot.position.z = 0.05;
    const leftCleat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.06), materials.aluminumMaterial);
    leftCleat.position.y = -0.02; // Relative to foot
    m.leftFoot.add(leftCleat);
    m.leftLowerLeg.add(m.leftFoot);

    m.rightUpperLeg = new THREE.Mesh(legUpperGeo, materials.blackMaterial);
    m.rightUpperLeg.position.set(0.15, -0.3, 0);
    m.cyclistGroup.add(m.rightUpperLeg);

    m.rightLowerLeg = new THREE.Mesh(legLowerGeo, materials.skinMaterial);
    m.rightLowerLeg.position.y = -0.35; // Relative to upper leg
    m.rightUpperLeg.add(m.rightLowerLeg);

    m.rightFoot = new THREE.Mesh(cyclingShoeGeo, materials.blackMaterial);
    m.rightFoot.position.y = -0.19; // Relative to lower leg
    m.rightFoot.position.z = 0.05;
    const rightCleat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.06), materials.aluminumMaterial);
    rightCleat.position.y = -0.02; // Relative to foot
    m.rightFoot.add(rightCleat);
    m.rightLowerLeg.add(m.rightFoot);

    // Assign to ref
    if (ref) {
      ref.current = {
        cyclistGroup: m.cyclistGroup,
        leftUpperLeg: m.leftUpperLeg,
        rightUpperLeg: m.rightUpperLeg,
        // Add other parts if they need to be accessed for animation/logic
        // e.g., head for looking around, arms for steering animation if desired
      };
    }
    
    // Cleanup
    return () => {
        Object.values(m).forEach(part => {
            if (part instanceof THREE.Group) {
                part.children.forEach(child => {
                    child.geometry?.dispose();
                });
            } else if (part.geometry) {
                part.geometry.dispose();
            }
        });
        if (ref && ref.current) ref.current = null;
    };

  }, [materials, seatTubeTopPos, ref]);

  return null; 
});

export default CyclistModel;