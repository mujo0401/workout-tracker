// MapComponents.jsx
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { usePlane } from '@react-three/cannon';
import { COURSES } from './MapData'; // Import from MapData.js

// Terrain component with course-specific generation
export function Terrain({ physicsSettings, environmentSettings, mapId }) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI/2, 0, 0], ...physicsSettings.planeProps }));
  const geomRef = useRef();

  useEffect(() => {
    const geometry = geomRef.current;
    if (!geometry || !geometry.attributes?.position) return;
    
    const course = COURSES[mapId] || COURSES.alpine; // Fallback to alpine if mapId is invalid
    const posAttr = geometry.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i); // In plane geometry, this is effectively z in world space before rotation
      
      const elevation = course.terrainFunction(x, y) * (physicsSettings.terrainHeight / 5);
      posAttr.setZ(i, elevation); // Modify the 'height' of the plane points
    }
    
    geometry.computeVertexNormals();
    posAttr.needsUpdate = true;
  }, [mapId, physicsSettings.terrainHeight, physicsSettings.planeProps]); // Added planeProps to dependencies

  const getGroundColor = () => {
    const colorMap = {
      alpine: '#8B7355',
      forest: '#2D5016',
      coastal: '#F4E4BC',
      desert: '#F4C430',
      urban: '#6C6C6C',
      tropical: '#228B22',
      island: '#DEB887',
      valley: '#9ACD32',
      snowtrack: '#FFFAFA',
      countryside: '#90EE90'
    };
    return colorMap[mapId] || environmentSettings.groundColor;
  };

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry ref={geomRef} args={[200, 200, 100, 100]} />
      <meshStandardMaterial color={getGroundColor()} />
    </mesh>
  );
}

// Course waypoint markers
export function CourseMarkers({ mapId }) {
  const course = COURSES[mapId];
  if (!course || !course.waypoints) return null;

  return (
    <group>
      {course.waypoints.map((waypoint, index) => (
        <group key={index} position={[waypoint.x, waypoint.elevation + 2, waypoint.z]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 4]} />
            <meshStandardMaterial color="#FF6B35" />
          </mesh>
          <mesh position={[0, 2.5, 0]}> {/* Adjusted flag position relative to pole top */}
            <planeGeometry args={[2, 1]} />
            <meshStandardMaterial 
              color={index === 0 ? "#00FF00" : index === course.waypoints.length - 1 ? "#FF0000" : "#FFFF00"} 
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Course-specific obstacles
export function CourseObstacles({ mapId }) {
  const course = COURSES[mapId];
  if (!course || !course.obstacles) return null;

  const getObstacleGeometry = (type, scale) => {
    switch(type) {
      case 'rock':
        return <dodecahedronGeometry args={[scale]} />;
      case 'tree':
      case 'pine':
        return <coneGeometry args={[scale * 0.5, scale * 3, 8]} />;
      case 'palm':
        return <cylinderGeometry args={[scale * 0.3, scale * 0.1, scale * 4]} />;
      case 'building':
        return <boxGeometry args={[scale * 2, scale * 3, scale * 2]} />;
      case 'cactus':
        return <cylinderGeometry args={[scale * 0.3, scale * 0.3, scale * 2]} />;
      case 'windmill':
        return <cylinderGeometry args={[scale * 0.5, scale * 0.5, scale * 4]} />;
      case 'barn':
        return <boxGeometry args={[scale * 3, scale * 2, scale * 2]} />;
      case 'fountain':
        return <cylinderGeometry args={[scale, scale * 0.8, scale * 0.5]} />;
      default:
        return <boxGeometry args={[scale, scale, scale]} />;
    }
  };

  const getObstacleColor = (type) => {
    const colorMap = {
      rock: '#666666',
      tree: '#654321',
      pine: '#0F4A0F',
      palm: '#8B4513',
      building: '#A0A0A0',
      cactus: '#228B22',
      windmill: '#8B4513',
      barn: '#8B0000',
      fountain: '#87CEEB'
    };
    return colorMap[type] || '#888888';
  };

  return (
    <group>
      {course.obstacles.map((obstacle, index) => (
        <mesh 
          key={index} 
          position={[obstacle.x, obstacle.z + obstacle.scale, obstacle.y]} // y from data is z in 3D, z from data is y in 3D (height)
          castShadow
        >
          {getObstacleGeometry(obstacle.type, obstacle.scale)}
          <meshStandardMaterial color={getObstacleColor(obstacle.type)} />
        </mesh>
      ))}
    </group>
  );
}

// Enhanced course information display
export function CourseInfo({ map, course }) { // map is from MAPS, course from COURSES
  if (!map) return null;
  return (
    <div style={{ 
      position: 'absolute', 
      top: 60, 
      left: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: 15, 
      borderRadius: 8, 
      minWidth: 250,
      zIndex: 10 
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#FFD700' }}>{map.name}</h3>
      <div style={{ fontSize: '0.9em', lineHeight: 1.4 }}>
        <div><strong>Distance:</strong> {map.distance}</div>
        <div><strong>Difficulty:</strong> 
          <span style={{ 
            color: map.difficulty === 'Easy' ? '#00FF00' : 
                   map.difficulty === 'Medium' ? '#FFA500' : '#FF4500',
            marginLeft: 5
          }}>
            {map.difficulty}
          </span>
        </div>
        <div style={{ marginTop: 8 }}>{map.description}</div>
        {course && course.waypoints && ( // Check if course and waypoints exist
          <div style={{ marginTop: 8, fontSize: '0.8em' }}>
            <strong>Waypoints:</strong> {course.waypoints.length}
          </div>
        )}
      </div>
    </div>
  );
}