// src/Overlays/SceneryRenderer.jsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function AlpineScene({ intensity }) {
  const sun = useRef();
  useFrame(({ clock }) => {
    if (sun.current) {
      sun.current.position.x = Math.sin(clock.elapsedTime * 0.1) * intensity * 0.05;
    }
  });
  return (
    <>
      <directionalLight
        ref={sun}
        position={[10, 20, 10]}
        intensity={0.5 + intensity * 0.005}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#88ccff" />
      </mesh>
    </>
  );
}

function RainforestScene({ intensity }) {
  return (
    <>
      <directionalLight position={[5, 15, 5]} intensity={0.4 + intensity * 0.003} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
    </>
  );
}

export default function SceneryRenderer({ scene, intensity }) {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
      camera={{ position: [0, 10, 30], fov: 60 }}
    >
      {scene === 'alpine'
        ? <AlpineScene intensity={intensity} />
        : scene === 'rainforest'
          ? <RainforestScene intensity={intensity} />
          : null
      }
    </Canvas>
  );
}
