// BikeModel.jsx
import React, { useEffect, forwardRef } from 'react';
import * as THREE from 'three';

const BikeModel = forwardRef((props, ref) => {
  const { materials } = props;

  useEffect(() => {
    const m = {}; // To store parts, similar to original structure

    m.bikeGroup = new THREE.Group();

    // === FRAME GEOMETRY ===
    const bottomBracketPos = new THREE.Vector3(0, 0.35, 0);
    m.bottomBracket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), materials.aluminumMaterial);
    m.bottomBracket.position.copy(bottomBracketPos);
    m.bikeGroup.add(m.bottomBracket);

    const headTubePosition = new THREE.Vector3(0.7, 0.75, 0);
    const seatTubeTopPos = new THREE.Vector3(-0.3, 0.8, 0);
    const rearDropoutPos = new THREE.Vector3(-0.65, 0.35, 0);

    const topTubeLength = headTubePosition.distanceTo(seatTubeTopPos);
    m.topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, topTubeLength, 8), materials.carbonFiberMaterial);
    m.topTube.position.lerpVectors(headTubePosition, seatTubeTopPos, 0.5);
    m.topTube.lookAt(seatTubeTopPos);
    m.topTube.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.topTube);

    const downTubeLength = headTubePosition.distanceTo(bottomBracketPos);
    m.downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, downTubeLength, 8), materials.carbonFiberMaterial);
    m.downTube.position.lerpVectors(headTubePosition, bottomBracketPos, 0.5);
    m.downTube.lookAt(bottomBracketPos);
    m.downTube.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.downTube);
    
    const seatTubeLength = bottomBracketPos.distanceTo(seatTubeTopPos);
    m.seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, seatTubeLength, 8), materials.carbonFiberMaterial);
    m.seatTube.position.lerpVectors(bottomBracketPos, seatTubeTopPos, 0.5);
    m.seatTube.lookAt(seatTubeTopPos);
    m.seatTube.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.seatTube);

    const headTubeRotationZ = -Math.PI / 12;
    m.headTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.15, 8), materials.carbonFiberMaterial);
    m.headTube.position.copy(headTubePosition);
    m.headTube.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(m.headTube);

    m.headsetTop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), materials.aluminumMaterial);
    m.headsetTop.position.copy(headTubePosition);
    m.headsetTop.position.y += 0.08;
    m.headsetTop.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(m.headsetTop);

    m.headsetBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), materials.aluminumMaterial);
    m.headsetBottom.position.copy(headTubePosition);
    m.headsetBottom.position.y -= 0.08;
    m.headsetBottom.rotation.z = headTubeRotationZ;
    m.bikeGroup.add(m.headsetBottom);

    const chainStayLength = bottomBracketPos.distanceTo(rearDropoutPos);
    m.leftChainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, chainStayLength, 8), materials.carbonFiberMaterial);
    m.leftChainStay.position.lerpVectors(bottomBracketPos, rearDropoutPos, 0.5);
    m.leftChainStay.position.z = -0.08;
    m.leftChainStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, -0.08));
    m.leftChainStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.leftChainStay);

    m.rightChainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, chainStayLength, 8), materials.carbonFiberMaterial);
    m.rightChainStay.position.lerpVectors(bottomBracketPos, rearDropoutPos, 0.5);
    m.rightChainStay.position.z = 0.08;
    m.rightChainStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, 0.08));
    m.rightChainStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.rightChainStay);

    const seatStayLength = seatTubeTopPos.distanceTo(rearDropoutPos);
    m.leftSeatStay = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, seatStayLength, 8), materials.carbonFiberMaterial);
    m.leftSeatStay.position.lerpVectors(seatTubeTopPos, rearDropoutPos, 0.5);
    m.leftSeatStay.position.z = -0.08;
    m.leftSeatStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, -0.08));
    m.leftSeatStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.leftSeatStay);

    m.rightSeatStay = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, seatStayLength, 8), materials.carbonFiberMaterial);
    m.rightSeatStay.position.lerpVectors(seatTubeTopPos, rearDropoutPos, 0.5);
    m.rightSeatStay.position.z = 0.08;
    m.rightSeatStay.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, 0.08));
    m.rightSeatStay.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.rightSeatStay);

    m.seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), materials.aluminumMaterial);
    m.seatPost.position.copy(seatTubeTopPos);
    m.seatPost.position.y += 0.1;
    m.bikeGroup.add(m.seatPost);

    m.saddle = new THREE.Group();
    const saddleBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.12), materials.blackMaterial);
    const saddleNose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), materials.blackMaterial);
    saddleNose.position.set(0.12, 0, 0);
    saddleNose.rotation.z = Math.PI / 2;
    m.saddle.add(saddleBase, saddleNose);
    m.saddle.position.copy(seatTubeTopPos);
    m.saddle.position.y += 0.22;
    m.bikeGroup.add(m.saddle);

    // === FORK AND STEERING ===
    m.fork = new THREE.Group();
    m.forkCrown = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), materials.aluminumMaterial);
    m.forkCrown.position.set(0, -0.05, 0);
    m.fork.add(m.forkCrown);

    const forkRakeAngle = Math.PI / 5;
    const forkLength = 0.4;
    
    m.leftForkLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, forkLength, 12), materials.aluminumMaterial);
    m.leftForkLeg.position.set(Math.sin(forkRakeAngle) * (forkLength/2), -Math.cos(forkRakeAngle) * (forkLength/2), -0.08);
    m.leftForkLeg.rotation.z = forkRakeAngle;
    m.fork.add(m.leftForkLeg);

    m.rightForkLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, forkLength, 12), materials.aluminumMaterial);
    m.rightForkLeg.position.set(Math.sin(forkRakeAngle) * (forkLength/2), -Math.cos(forkRakeAngle) * (forkLength/2), 0.08);
    m.rightForkLeg.rotation.z = forkRakeAngle;
    m.fork.add(m.rightForkLeg);

    m.steererTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12), materials.aluminumMaterial);
    m.steererTube.position.set(0, 0.1, 0);
    m.fork.add(m.steererTube);

    m.steeringAssembly = new THREE.Group();
    m.steeringAssembly.position.copy(headTubePosition);
    m.steeringAssembly.rotation.z = headTubeRotationZ;
    m.steeringAssembly.add(m.fork);
    m.bikeGroup.add(m.steeringAssembly);

    const stemHeight = 0.08;
    m.stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), materials.aluminumMaterial);
    m.stem.position.set(0.06, 0.15, 0);
    m.steeringAssembly.add(m.stem);

    m.handlebars = new THREE.Group();
    const handlebarLength = 0.42;
    m.handlebarMain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, handlebarLength, 12), materials.aluminumMaterial);
    m.handlebarMain.rotation.z = Math.PI / 2;
    m.handlebars.add(m.handlebarMain);

    m.leftDrop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 16), materials.aluminumMaterial);
    m.leftDrop.position.set(0, 0, -0.18);
    m.leftDrop.rotation.x = Math.PI / 2;
    m.handlebars.add(m.leftDrop);

    m.rightDrop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 16), materials.aluminumMaterial);
    m.rightDrop.position.set(0, 0, 0.18);
    m.rightDrop.rotation.x = Math.PI / 2;
    m.handlebars.add(m.rightDrop);

    m.leftBrakeShifter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), materials.blackMaterial);
    m.leftBrakeShifter.position.set(0.04, -0.02, -0.15);
    m.handlebars.add(m.leftBrakeShifter);

    m.rightBrakeShifter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), materials.blackMaterial);
    m.rightBrakeShifter.position.set(0.04, -0.02, 0.15);
    m.handlebars.add(m.rightBrakeShifter);

    m.handlebars.position.set(0.12, 0.15 + stemHeight, 0);
    m.steeringAssembly.add(m.handlebars);

    // === WHEELS WITH DISC BRAKES ===
    const wheelRadiusGeo = 0.35;
    const wheelThickness = 0.04;
    const rimGeo = new THREE.TorusGeometry(wheelRadiusGeo, wheelThickness, 16, 32);
    const rimAccentGeo = new THREE.TorusGeometry(wheelRadiusGeo - wheelThickness*0.7, wheelThickness * 0.5, 16, 32);

    const createWheelWithDiscBrake = () => {
        const wheelGrp = new THREE.Group();
        wheelGrp.add(new THREE.Mesh(rimGeo, materials.tireMaterial));
        wheelGrp.add(new THREE.Mesh(rimAccentGeo, materials.bikeAccentMaterial));
        
        const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16);
        const hub = new THREE.Mesh(hubGeo, materials.aluminumMaterial);
        hub.rotation.z = Math.PI / 2;
        wheelGrp.add(hub);
        
        const rotorRadius = 0.08;
        const rotorGeo = new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.002, 32);
        const discRotor = new THREE.Mesh(rotorGeo, materials.discBrakeMaterial); // Renamed to avoid conflict with m.discRotor
        discRotor.rotation.z = Math.PI / 2;
        discRotor.position.z = -0.06;
        
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.01, 8), materials.aluminumMaterial);
            bolt.position.set(Math.cos(angle) * (rotorRadius * 0.7), Math.sin(angle) * (rotorRadius * 0.7), -0.06);
            bolt.rotation.z = Math.PI / 2;
            wheelGrp.add(bolt);
        }
        
        const vaneCount = 24;
        for (let i = 0; i < vaneCount; i++) {
            const angle = (i / vaneCount) * Math.PI * 2;
            const vane = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.02, 0.002), materials.discBrakeMaterial);
            vane.position.set(Math.cos(angle) * (rotorRadius * 0.8), Math.sin(angle) * (rotorRadius * 0.8), -0.06);
            vane.rotation.z = angle;
            wheelGrp.add(vane);
        }
        wheelGrp.add(discRotor);
        
        const brakeCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), materials.brakeMaterial); // Renamed
        brakeCaliper.position.set(0, -rotorRadius - 0.02, -0.06);
        wheelGrp.add(brakeCaliper);
        
        const brakePadInner = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), materials.blackMaterial); // Renamed
        brakePadInner.position.set(0, -rotorRadius - 0.02, -0.065);
        wheelGrp.add(brakePadInner);
        
        const brakePadOuter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), materials.blackMaterial); // Renamed
        brakePadOuter.position.set(0, -rotorRadius - 0.02, -0.055);
        wheelGrp.add(brakePadOuter);
        
        const spokeCount = 28;
        const spokeRadius = 0.002;
        const spokeLength = wheelRadiusGeo - 0.06;
        for (let i = 0; i < spokeCount; i++) {
            const angle = (i / spokeCount) * Math.PI * 2;
            const spokeGeo = new THREE.CylinderGeometry(spokeRadius, spokeRadius, spokeLength, 6);
            const spoke = new THREE.Mesh(spokeGeo, materials.spokeMaterial);
            const spokeX = Math.cos(angle) * (spokeLength / 2 + 0.06);
            const spokeY = Math.sin(angle) * (spokeLength / 2 + 0.06);
            spoke.position.set(spokeX, spokeY, 0);
            spoke.rotation.z = angle + Math.PI / 2;
            wheelGrp.add(spoke);
        }
        return wheelGrp;
    };
    
    m.frontWheel = createWheelWithDiscBrake();
    m.frontWheel.position.set(0.85, wheelRadiusGeo, 0);
    m.bikeGroup.add(m.frontWheel);

    m.backWheel = createWheelWithDiscBrake();
    m.backWheel.position.copy(rearDropoutPos);
    m.backWheel.position.y = wheelRadiusGeo;
    m.bikeGroup.add(m.backWheel);

    // === DRIVETRAIN ===
    m.crankSet = new THREE.Group();
    m.leftCrankArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.17, 0.02), materials.aluminumMaterial);
    m.leftCrankArm.position.y = 0.085;
    m.rightCrankArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.17, 0.02), materials.aluminumMaterial);
    m.rightCrankArm.position.y = -0.085;
    
    m.leftPedal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.05), materials.blackMaterial);
    m.leftPedal.position.set(0.04, 0.085, 0);
    m.rightPedal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.05), materials.blackMaterial);
    m.rightPedal.position.set(0.04, -0.085, 0);
    
    const largeChainringRadius = 0.11;
    const smallChainringRadius = 0.085;
    m.largeChainring = new THREE.Mesh(new THREE.TorusGeometry(largeChainringRadius, 0.006, 8, 48), materials.aluminumMaterial);
    m.largeChainring.rotation.z = Math.PI / 2;
    m.largeChainring.position.z = -0.01;
    m.smallChainring = new THREE.Mesh(new THREE.TorusGeometry(smallChainringRadius, 0.005, 8, 40), materials.aluminumMaterial);
    m.smallChainring.rotation.z = Math.PI / 2;
    m.smallChainring.position.z = 0.01;
    
    const addChainringTeeth = (chainring, radius, toothCount, zOffset) => {
        for (let i = 0; i < toothCount; i++) {
            const angle = (i / toothCount) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.015, 0.008), materials.aluminumMaterial);
            tooth.position.set(Math.cos(angle) * (radius + 0.008), Math.sin(angle) * (radius + 0.008), zOffset);
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
    const cassetteGears = [0.09, 0.085, 0.08, 0.075, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045, 0.04];
    cassetteGears.forEach((radius, index) => {
        const gearGeo = new THREE.TorusGeometry(radius, 0.004, 8, Math.floor(radius * 200));
        const gear = new THREE.Mesh(gearGeo, materials.gearMaterial);
        gear.rotation.z = Math.PI / 2;
        gear.position.z = -0.05 - (index * 0.006);
        const gearToothCount = Math.floor(radius * 120);
        for (let i = 0; i < gearToothCount; i++) {
            const angle = (i / gearToothCount) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.012, 0.005), materials.gearMaterial);
            tooth.position.set(Math.cos(angle) * (radius + 0.006), Math.sin(angle) * (radius + 0.006), 0);
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
    m.frontDerailleur = new THREE.Group();
    m.frontDerailerBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), materials.blackMaterial);
    m.frontDerailerBody.position.set(-0.02, 0, 0);
    m.frontDerailerCage = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.06), materials.blackMaterial);
    m.frontDerailerCage.position.set(0.04, 0, 0);
    m.frontDerailleur.add(m.frontDerailerBody, m.frontDerailerCage);
    m.frontDerailleur.position.set(-0.05, 0.5, 0);
    m.bikeGroup.add(m.frontDerailleur);

    m.rearDerailleur = new THREE.Group();
    m.rearDerailerBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), materials.blackMaterial);
    m.upperJockeyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), materials.aluminumMaterial);
    m.upperJockeyWheel.rotation.z = Math.PI / 2;
    m.upperJockeyWheel.position.set(0, 0.04, 0);
    m.lowerJockeyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), materials.aluminumMaterial);
    m.lowerJockeyWheel.rotation.z = Math.PI / 2;
    m.lowerJockeyWheel.position.set(0, -0.04, 0);
    m.rearDerailerCage = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), materials.blackMaterial);
    m.rearDerailerCage.position.set(0, 0, -0.02);
    m.rearDerailleur.add(m.rearDerailerBody, m.upperJockeyWheel, m.lowerJockeyWheel, m.rearDerailerCage);
    m.rearDerailleur.position.copy(rearDropoutPos);
    m.rearDerailleur.position.y = 0.2;
    m.rearDerailleur.position.z = -0.1;
    m.bikeGroup.add(m.rearDerailleur);

    // === ENHANCED BIKE CHAIN ===
    m.chainGroup = new THREE.Group();
    const chainRadius = largeChainringRadius;
    const cassetteRadiusChain = 0.07; // Use a distinct variable name
    const chainSegments = 80;
    const chainStart = bottomBracketPos.clone();
    const chainEnd = rearDropoutPos.clone();
    chainEnd.y = wheelRadiusGeo;
    for (let i = 0; i <= chainSegments; i++) {
        const t = i / chainSegments;
        let linkPos;
        if (t < 0.25) {
            const angle = (t / 0.25) * Math.PI;
            linkPos = new THREE.Vector3(chainStart.x + Math.cos(angle + Math.PI) * chainRadius, chainStart.y + Math.sin(angle + Math.PI) * chainRadius, 0);
        } else if (t > 0.75) {
            const angle = ((t - 0.75) / 0.25) * Math.PI * 1.5;
            linkPos = new THREE.Vector3(chainEnd.x + Math.cos(angle) * cassetteRadiusChain, chainEnd.y + Math.sin(angle) * cassetteRadiusChain, 0);
        } else {
            const straightT = (t - 0.25) / 0.5;
            if (straightT < 0.5) {
                linkPos = new THREE.Vector3().lerpVectors(new THREE.Vector3(chainStart.x - chainRadius, chainStart.y, 0), new THREE.Vector3(chainEnd.x + cassetteRadiusChain, chainEnd.y, 0), straightT * 2);
            } else {
                const bottomT = (straightT - 0.5) * 2;
                const jockeyPos = new THREE.Vector3(chainEnd.x, 0.2, 0); // Simplified jockey position for chain routing
                if (bottomT < 0.5) {
                    linkPos = new THREE.Vector3().lerpVectors(new THREE.Vector3(chainEnd.x, chainEnd.y - cassetteRadiusChain, 0), jockeyPos, bottomT * 2);
                } else {
                    linkPos = new THREE.Vector3().lerpVectors(jockeyPos, new THREE.Vector3(chainStart.x - chainRadius, chainStart.y - chainRadius, 0), (bottomT - 0.5) * 2);
                }
            }
        }
        const linkGeo = new THREE.BoxGeometry(0.006, 0.002, 0.003);
        const link = new THREE.Mesh(linkGeo, materials.chainMaterial);
        link.position.copy(linkPos);
        m.chainGroup.add(link);
    }
    m.bikeGroup.add(m.chainGroup);

    // === BRAKE CABLES AND HOUSING ===
    m.frontBrakeCable = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.6, 8), materials.blackMaterial);
    m.frontBrakeCable.position.lerpVectors(headTubePosition, new THREE.Vector3(0.65, 0.35, -0.06), 0.5);
    m.frontBrakeCable.lookAt(new THREE.Vector3(0.65, 0.35, -0.06));
    m.frontBrakeCable.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.frontBrakeCable);

    m.rearBrakeCable = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.0, 8), materials.blackMaterial);
    m.rearBrakeCable.position.lerpVectors(headTubePosition, rearDropoutPos, 0.5);
    m.rearBrakeCable.position.z = 0.1; // Offset to be visible
    m.rearBrakeCable.lookAt(new THREE.Vector3(rearDropoutPos.x, rearDropoutPos.y, 0.1));
    m.rearBrakeCable.rotateX(Math.PI / 2);
    m.bikeGroup.add(m.rearBrakeCable);

    // Assign to ref
    if (ref) {
      ref.current = {
        bikeGroup: m.bikeGroup,
        frontWheel: m.frontWheel,
        backWheel: m.backWheel,
        crankSet: m.crankSet,
        largeChainring: m.largeChainring,
        smallChainring: m.smallChainring,
        cassette: m.cassette,
        chainGroup: m.chainGroup,
        upperJockeyWheel: m.upperJockeyWheel,
        lowerJockeyWheel: m.lowerJockeyWheel,
        rearDerailleur: m.rearDerailleur,
        frontDerailleur: m.frontDerailleur,
        steeringAssembly: m.steeringAssembly,
        // Add other parts if they need to be accessed for animation/logic
      };
    }

    // Cleanup function for when the component unmounts or dependencies change
    return () => {
        Object.values(m).forEach(part => {
            if (part instanceof THREE.Group) {
                part.children.forEach(child => {
                    child.geometry?.dispose();
                    // child.material?.dispose(); // Materials are shared, dispose them in Avatar if not needed elsewhere
                });
            } else if (part.geometry) {
                part.geometry.dispose();
                // part.material?.dispose();
            }
        });
        if (ref && ref.current) ref.current = null;
    };

  }, [materials, ref]); // Rerun if materials or ref changes

  // This component doesn't render directly to the canvas, but populates the ref
  return null; 
});

export default BikeModel;