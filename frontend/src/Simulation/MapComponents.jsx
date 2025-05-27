// Enhanced MapComponents.jsx - Detailed 3D map rendering with roads, terrain, vegetation, and infrastructure
import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { usePlane } from '@react-three/cannon'; // useBox was imported but not used
import { COURSES } from './MapData'; // TERRAIN_TEXTURES, ROAD_MARKINGS were imported but not used

// Enhanced Terrain component with multiple texture support
export function Terrain({ physicsSettings, environmentSettings, mapId }) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI/2, 0, 0], ...physicsSettings.planeProps }));
  const geomRef = useRef();
  const materialRef = useRef(); // This ref is assigned but not directly used to change material properties post-creation in this version

  useEffect(() => {
    const geometry = geomRef.current;
    if (!geometry || !geometry.attributes?.position) return;
    
    const course = COURSES[mapId] || COURSES.alpine;
    const posAttr = geometry.attributes.position;
    
    if (!geometry.attributes.color) {
      const colors = new Float32Array(posAttr.count * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    const colors = geometry.attributes.color;
    // Ensure course.terrain exists before trying to access its properties
    const baseColorValue = course.terrain?.baseColor || environmentSettings.groundColor;
    const grassColorValue = course.terrain?.grassColor || '#228B22';
    const rockColorValue = course.terrain?.rockColor || '#696969';
    const sandColorValue = course.terrain?.sandColor || '#F4A460';

    const baseColor = new THREE.Color(baseColorValue);
    const grassColor = new THREE.Color(grassColorValue);
    const rockColor = new THREE.Color(rockColorValue);
    const sandColor = new THREE.Color(sandColorValue);
    
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      
      const elevation = course.terrainFunction(x, y) * (physicsSettings.terrainHeight / 5);
      posAttr.setZ(i, elevation);
      
      let terrainColor = baseColor.clone(); 
      if (elevation > 15) {
        terrainColor.copy(rockColor); 
      } else if (elevation > 5) {
        terrainColor.copy(grassColor); 
      } else if (elevation < 1) {
        terrainColor.copy(sandColor); 
      }
      
      const variation = (Math.random() - 0.5) * 0.1;
      terrainColor.r = Math.max(0, Math.min(1, terrainColor.r + variation));
      terrainColor.g = Math.max(0, Math.min(1, terrainColor.g + variation));
      terrainColor.b = Math.max(0, Math.min(1, terrainColor.b + variation));
      
      colors.setXYZ(i, terrainColor.r, terrainColor.g, terrainColor.b);
    }
    
    geometry.computeVertexNormals();
    posAttr.needsUpdate = true;
    colors.needsUpdate = true;
  }, [mapId, physicsSettings.terrainHeight, physicsSettings.planeProps, environmentSettings.groundColor]);

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry ref={geomRef} args={[200, 200, 100, 100]} />
      <meshStandardMaterial 
        ref={materialRef}
        vertexColors={true}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

// Road Network Renderer
export function RoadNetwork({ mapId, physicsSettings }) { 
  const course = COURSES[mapId];
  if (!course || !course.roads) return null;

  return (
    <group>
      {course.roads.map((road, index) => (
        <RoadSegment key={road.id || index} road={road} courseTerrainFunction={course.terrainFunction} physicsSettings={physicsSettings} />
      ))}
    </group>
  );
}

function RoadSegment({ road, courseTerrainFunction, physicsSettings }) {
  const points = road.points || [];
  if (points.length < 2) return null;

  const roadMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: road.color || '#404040',
      roughness: road.type === 'dirt' ? 0.9 : 0.7,
      metalness: road.type === 'paved' ? 0.1 : 0.0,
      polygonOffset: true, 
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -4.0
    });
  }, [road.color, road.type]);
  
  const roadShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-road.width / 2, 0);
    shape.lineTo(road.width / 2, 0);
    shape.lineTo(road.width / 2, 0.1); 
    shape.lineTo(-road.width / 2, 0.1);
    shape.closePath();
    return shape;
  }, [road.width]);

  const roadCurve = useMemo(() => {
     return new THREE.CatmullRomCurve3(
        points.map(p => {
            let yPos = 0.1; 
            if (courseTerrainFunction && physicsSettings && typeof physicsSettings.terrainHeight === 'number') {
                yPos = courseTerrainFunction(p.x, p.z) * (physicsSettings.terrainHeight / 5) + 0.05; 
            }
            return new THREE.Vector3(p.x, yPos, p.z);
        })
    );
  }, [points, courseTerrainFunction, physicsSettings]);


  const roadGeometry = useMemo(() => {
    if (!roadCurve || roadCurve.points.length < 2) return null;
    return new THREE.ExtrudeGeometry(roadShape, {
        steps: points.length * 3, 
        bevelEnabled: false,
        extrudePath: roadCurve
    });
  }, [roadShape, roadCurve, points.length]);

  if (!roadGeometry) return null;

  return (
    <group>
      <mesh geometry={roadGeometry} material={roadMaterial} receiveShadow castShadow />
      {road.markings && (
        <RoadMarkings road={road} roadCurve={roadCurve} />
      )}
    </group>
  );
}

function RoadMarkings({ road, roadCurve }) {
  const markings = road.markings;
  if (!markings || !roadCurve || roadCurve.points.length < 2) return null;

  const markingMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: markings.centerLineColor || "#FFFF00", // Ensure markings object and centerLineColor exist
    polygonOffset: true,
    polygonOffsetFactor: -2.0, 
    polygonOffsetUnits: -8.0
  }), [markings.centerLineColor]);
  
  const markingPoints = useMemo(() => 
    roadCurve.getPoints(road.points.length * 10).map(p => new THREE.Vector3(p.x, p.y + 0.02, p.z)),
  [roadCurve, road.points.length]);

  const markingCurve = useMemo(() => new THREE.CatmullRomCurve3(markingPoints), [markingPoints]);

  if (markingCurve.points.length < 2) return null;

  return (
    <group>
      {markings.centerLine && (
        <mesh>
          <tubeGeometry args={[markingCurve, markingPoints.length, 0.05, 4, false]} />
          <primitive object={markingMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}


// Water Features Renderer
export function WaterFeatures({ mapId, physicsSettings }) { 
  const course = COURSES[mapId];
  if (!course || !course.waterFeatures) return null;

  return (
    <group>
      {course.waterFeatures.map((water, index) => (
        <WaterFeature key={`${water.type}-${index}`} water={water} courseTerrainFunction={course.terrainFunction} physicsSettings={physicsSettings}/>
      ))}
    </group>
  );
}

function WaterFeature({ water, courseTerrainFunction, physicsSettings }) {
  const waterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: water.color || '#4682B4',
      transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.0, side: THREE.DoubleSide,
    });
  }, [water.color]);

  const getWaterY = (x, z) => {
    let yPos = 0.01; 
    if (courseTerrainFunction && physicsSettings && typeof physicsSettings.terrainHeight === 'number') {
        yPos = courseTerrainFunction(x, z) * (physicsSettings.terrainHeight / 5) - 0.1; 
    }
    return yPos;
  };

  if (water.type === 'stream' || water.type === 'river') {
    if (!water.points || water.points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(
      water.points.map(p => new THREE.Vector3(p.x, getWaterY(p.x, p.z), p.z))
    );
    if (curve.points.length < 2) return null;
    return ( <mesh> <tubeGeometry args={[curve, water.points.length * 2, water.width / 2, 8, false]} /> <primitive object={waterMaterial} attach="material"/> </mesh> );
  }
  
  if (water.type === 'lake' || water.type === 'oasis' || water.type === 'tidal_pool') {
    if(!water.center) return null;
    return ( <mesh position={[water.center.x, getWaterY(water.center.x, water.center.z), water.center.z]} rotation={[-Math.PI / 2, 0, 0]}> <circleGeometry args={[water.radius, 32]} /> <primitive object={waterMaterial} attach="material"/> </mesh> );
  }
  
  if (water.type === 'ocean') {
    if(!water.bounds) return null;
    return ( <mesh position={[water.bounds.x + water.bounds.width/2, getWaterY(water.bounds.x + water.bounds.width/2, water.bounds.z + water.bounds.height/2), water.bounds.z + water.bounds.height/2]} rotation={[-Math.PI / 2, 0, 0]}> <planeGeometry args={[water.bounds.width, water.bounds.height]} /> <primitive object={waterMaterial} attach="material"/> </mesh> );
  }
  
  return null;
}

// Vegetation System
export function VegetationSystem({ mapId, physicsSettings }) { 
  const course = COURSES[mapId];
  if (!course || !course.vegetation) return null;

  return (
    <group>
      {course.vegetation.map((vegetation, index) => (
        <VegetationPatch key={`vegetation-${index}`} vegetation={vegetation} courseTerrainFunction={course.terrainFunction} physicsSettings={physicsSettings} />
      ))}
    </group>
  );
}

function VegetationPatch({ vegetation, courseTerrainFunction, physicsSettings }) {
  const trees = useMemo(() => {
    const treeInstances = [];
    const { area, treeCount = 10, density = 'medium' } = vegetation;
    
    if (area) {
      const densityMultiplier = { 'very_low': 0.3, 'low': 0.5, 'medium': 1.0, 'high': 1.5, 'very_high': 2.0 }[density] || 1.0;
      const actualTreeCount = Math.floor(treeCount * densityMultiplier);
      
      for (let i = 0; i < actualTreeCount; i++) {
        const x = area.x + (Math.random() - 0.5) * area.width;
        const z = area.z + (Math.random() - 0.5) * area.height;
        let yPos = 0;
        if(courseTerrainFunction && physicsSettings && typeof physicsSettings.terrainHeight === 'number'){
            yPos = courseTerrainFunction(x,z) * (physicsSettings.terrainHeight / 5);
        }
        const scale = 0.8 + Math.random() * 0.4; 
        const rotation = Math.random() * Math.PI * 2;
        
        treeInstances.push({ position: [x, yPos, z], scale: [scale, scale, scale], rotation: [0, rotation, 0], type: vegetation.treeTypes ? vegetation.treeTypes[Math.floor(Math.random() * vegetation.treeTypes.length)] : 'generic' });
      }
    }
    return treeInstances;
  }, [vegetation, courseTerrainFunction, physicsSettings]);

  return (
    <group>
      {trees.map((tree, index) => ( <Tree key={`tree-${index}`} position={tree.position} scale={tree.scale} rotation={tree.rotation} treeType={tree.type}/> ))}
      {vegetation.grassHeight && ( <GrassArea vegetation={vegetation} courseTerrainFunction={courseTerrainFunction} physicsSettings={physicsSettings}/> )}
    </group>
  );
}

function Tree({ position, scale, rotation, treeType }) {
    const treeConfig = {
        pine: { trunkHeight: 2 * scale[1], crownHeight: 4 * scale[1], crownRadius: 1.5 * scale[0], trunkColor: '#654321', crownColor: '#2E8B57' },
        oak: { trunkHeight: 1.5 * scale[1], crownHeight: 3 * scale[1], crownRadius: 2 * scale[0], trunkColor: '#8B4513', crownColor: '#556B2F' },
        palm: { trunkHeight: 4 * scale[1], crownHeight: 1.5 * scale[1], crownRadius: 2 * scale[0], trunkColor: '#DAA520', crownColor: '#228B22' },
        birch: { trunkHeight: 3 * scale[1], crownHeight: 2.5 * scale[1], crownRadius: 1.2 * scale[0], trunkColor: '#F5F5DC', crownColor: '#90EE90' },
        generic: { trunkHeight: 2 * scale[1], crownHeight: 3 * scale[1], crownRadius: 1.5 * scale[0], trunkColor: '#8B4513', crownColor: '#228B22' }
    };
    const config = treeConfig[treeType] || treeConfig.generic;
  
  return (
    <group position={position} rotation={rotation}> 
      <mesh position={[0, config.trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.2 * scale[0], 0.3 * scale[0], config.trunkHeight, 8]} />
        <meshStandardMaterial color={config.trunkColor} />
      </mesh>
      <mesh position={[0, config.trunkHeight + config.crownHeight / 2, 0]} castShadow>
        {treeType === 'pine' ? ( <coneGeometry args={[config.crownRadius, config.crownHeight, 8]} /> ) 
        : treeType === 'palm' ? ( <sphereGeometry args={[config.crownRadius, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /> ) 
        : ( <sphereGeometry args={[config.crownRadius, 8, 8]} /> )}
        <meshStandardMaterial color={config.crownColor} />
      </mesh>
    </group>
  );
}

function GrassArea({ vegetation, courseTerrainFunction, physicsSettings }) {
  const grassMaterial = useMemo(() => { return new THREE.MeshStandardMaterial({ color: '#34A853', roughness: 0.9, metalness: 0.0, side:THREE.DoubleSide }); }, []);
  if (!vegetation.area) return null;
  let yPos = vegetation.grassHeight / 2;
  if(courseTerrainFunction && physicsSettings && typeof physicsSettings.terrainHeight === 'number'){
      yPos = courseTerrainFunction(vegetation.area.x, vegetation.area.z) * (physicsSettings.terrainHeight/5) + (vegetation.grassHeight / 2);
  }
  return ( <mesh position={[vegetation.area.x, yPos, vegetation.area.z]} rotation={[-Math.PI / 2, 0, 0]}> <planeGeometry args={[vegetation.area.width, vegetation.area.height]} /> <primitive object={grassMaterial} attach="material"/> </mesh> );
}

// Infrastructure System
export function InfrastructureSystem({ mapId, physicsSettings }) { 
  const course = COURSES[mapId];
  if (!course || !course.infrastructure) return null;

  return (
    <group>
      {course.infrastructure.map((structure, index) => {
        if (structure.positions && Array.isArray(structure.positions)) {
          return structure.positions.map((pos, posIndex) => ( <InfrastructureElement key={`infrastructure-${index}-${posIndex}`} structure={{...structure, position: pos}} courseTerrainFunction={course.terrainFunction} physicsSettings={physicsSettings}/> ));
        }
        return ( <InfrastructureElement key={`infrastructure-${index}`} structure={structure} courseTerrainFunction={course.terrainFunction} physicsSettings={physicsSettings}/> );
      })}
    </group>
  );
}

function InfrastructureElement({ structure, courseTerrainFunction, physicsSettings }) {
  if (!structure.position || typeof structure.position.x === 'undefined' || typeof structure.position.z === 'undefined') { return null; }
  
  let yPos = (structure.height || 2) / 2; 
  if(courseTerrainFunction && physicsSettings && typeof physicsSettings.terrainHeight === 'number' && typeof structure.position.yOffset === 'undefined'){ 
      yPos = courseTerrainFunction(structure.position.x, structure.position.z) * (physicsSettings.terrainHeight / 5) + ((structure.height || 2) / 2);
  } else if (courseTerrainFunction && physicsSettings && typeof physicsSettings.terrainHeight === 'number' && typeof structure.position.yOffset === 'number'){ 
      yPos = courseTerrainFunction(structure.position.x, structure.position.z) * (physicsSettings.terrainHeight / 5) + structure.position.yOffset + ((structure.height || 2) / 2);
  }
  const worldPosition = [structure.position.x, yPos, structure.position.z];

  switch (structure.type) {
    case 'bridge': return <Bridge structure={structure} worldPosition={worldPosition}/>;
    case 'building': case 'office_building': case 'apartment_complex': return <Building structure={structure} worldPosition={worldPosition}/>;
    case 'sign': case 'trail_marker': return <Sign structure={structure} worldPosition={worldPosition}/>;
    case 'lighthouse': return <Lighthouse structure={structure} worldPosition={worldPosition}/>;
    case 'pier': return <Pier structure={structure} worldPosition={worldPosition}/>;
    case 'traffic_light': return <TrafficLight structure={structure} worldPosition={worldPosition}/>;
    case 'bus_stop': return <BusStop structure={structure} worldPosition={worldPosition}/>;
    case 'rest_area': return <RestArea structure={structure} worldPosition={worldPosition}/>;
    case 'mile_marker': return <MileMarker structure={structure} worldPosition={worldPosition}/>;
    default: return <GenericStructure structure={structure} worldPosition={worldPosition}/>;
  }
}

function Bridge({ structure, worldPosition }) {
  const bridgeMaterial = useMemo(() => { const materialMap = { stone: '#778899', wood: '#A0522D', steel: '#B0C4DE', concrete: '#D3D3D3' }; return new THREE.MeshStandardMaterial({ color: materialMap[structure.material] || '#888888', roughness: structure.material === 'steel' ? 0.3 : 0.8, metalness: structure.material === 'steel' ? 0.7 : 0.1 }); }, [structure.material]);
  return ( <group position={worldPosition} rotation={[0, (structure.rotation || 0) * Math.PI / 180, 0]}> <mesh position={[0, 0, 0]} castShadow> <boxGeometry args={[structure.length || 10, 0.3, structure.width || 3]} /> <primitive object={bridgeMaterial} attach="material"/> </mesh> <mesh position={[0, 0.75, (structure.width || 3) / 2 - 0.1]} castShadow> <boxGeometry args={[structure.length || 10, 1.2, 0.2]} /> <primitive object={bridgeMaterial} attach="material"/> </mesh> <mesh position={[0, 0.75, -(structure.width || 3) / 2 + 0.1]} castShadow> <boxGeometry args={[structure.length || 10, 1.2, 0.2]} /> <primitive object={bridgeMaterial} attach="material"/> </mesh> </group> );
}

function Building({ structure, worldPosition }) {
  const floors = structure.floors || 3;
  const buildingHeight = floors * (structure.floorHeight || 3);
  const buildingMaterial = useMemo(() => { const styleColors = { modern: '#B0B0B0', residential: '#D2B48C', office: '#A9A9A9', industrial: '#708090' }; return new THREE.MeshStandardMaterial({ color: styleColors[structure.style] || '#C0C0C0', roughness: 0.7, metalness: 0.1 }); }, [structure.style]);
  const windowMaterial = useMemo(() => new THREE.MeshStandardMaterial({color: "#87CEFA", transparent: true, opacity: 0.6}), []);
  const basePosition = [worldPosition[0], worldPosition[1] - buildingHeight/2 + (structure.heightAdjustment || 0) , worldPosition[2]];

  return (
    <group position={basePosition}> 
      <mesh castShadow position={[0, buildingHeight/2, 0]}> 
        <boxGeometry args={[structure.width || 8, buildingHeight, structure.depth || 8]} />
        <primitive object={buildingMaterial} attach="material"/>
      </mesh>
      {Array.from({ length: floors }).map((_, floorIndex) => 
         Array.from({length: 4}).map((_, sideIndex) => { 
            const sideWidth = sideIndex % 2 === 0 ? structure.width || 8 : structure.depth || 8;
            const windowCount = Math.floor(sideWidth / 2); 
            return Array.from({length: windowCount}).map((__, windowIndex) => (
                <mesh 
                    key={`f${floorIndex}_s${sideIndex}_w${windowIndex}`}
                    position={[
                        sideIndex % 2 === 0 ? (windowIndex - (windowCount-1)/2) * 2 : (sideIndex === 1 ? (structure.width || 8)/2 + 0.01 : -(structure.width || 8)/2 - 0.01), 
                        (floorIndex + 0.5) * (structure.floorHeight || 3), 
                        sideIndex % 2 !== 0 ? (windowIndex - (windowCount-1)/2) * 2 : (sideIndex === 0 ? (structure.depth || 8)/2 + 0.01 : -(structure.depth || 8)/2 - 0.01)  
                    ]}
                    rotation={[0, sideIndex * Math.PI/2, 0]}
                >
                    <planeGeometry args={[1.5, structure.floorHeight ? (structure.floorHeight * 0.6) : 1.8 ]} />
                    <primitive object={windowMaterial} attach="material"/>
                </mesh>
            ))
         })
      )}
    </group>
  );
}

function Sign({ structure, worldPosition }) {
  const signMaterial = useMemo(() => { const materialMap = { wooden: '#8B4513', metal: '#A9A9A9', beach: '#F0E68C', weathered_metal: '#778899' }; return new THREE.MeshStandardMaterial({ color: materialMap[structure.style] || '#996633' }); }, [structure.style]);
  const textMaterial = useMemo(() => new THREE.MeshStandardMaterial({color: structure.textColor || "#FFFFFF"}), [structure.textColor]);
  const basePosition = [worldPosition[0], worldPosition[1] - (structure.height || 1.5)/2 + (structure.postHeight || 1.5)/2, worldPosition[2]];

  return (
    <group position={basePosition} rotation={[0, (structure.rotation || 0) * Math.PI / 180, 0]}>
      <mesh position={[0, -(structure.postHeight || 1.5)/2 + 0.75, 0]} castShadow> <cylinderGeometry args={[0.05, 0.05, structure.postHeight || 1.5, 8]} /> <primitive object={signMaterial} attach="material"/> </mesh>
      <mesh position={[0, (structure.boardHeight || 0.8)/2 , 0]} castShadow> <boxGeometry args={[structure.boardWidth || 2, structure.boardHeight || 0.8, 0.1]} /> <primitive object={signMaterial} attach="material"/> </mesh>
      {structure.text && <mesh position={[0, (structure.boardHeight || 0.8)/2, 0.055]}> <planeGeometry args={[(structure.boardWidth || 2)*0.9, (structure.boardHeight || 0.8)*0.8]} /> <primitive object={textMaterial} attach="material"/> </mesh>}
    </group>
  );
}

export function CourseMarkers({ mapId }) {
  console.log('[MapComponents.jsx] Attempting to render SIMPLIFIED CourseMarkers for mapId:', mapId);
  // Return a very simple, visible mesh to confirm the component can be referenced and rendered.
  return (
    <group>
      <mesh position={[0, 10, 0]} scale={[2, 2, 2]}> {/* Placed high and scaled up for visibility */}
        <boxGeometry />
        <meshStandardMaterial color="purple" emissive="purple" emissiveIntensity={0.5} wireframe={false} />
      </mesh>
      <primitive object={new THREE.AxesHelper(5)} /> {/* Adds XYZ axes at the group origin for reference */}
    </group>
  );
}

function Lighthouse({ structure, worldPosition }) { return <mesh position={worldPosition}><boxGeometry /><meshStandardMaterial color="yellow"/></mesh>; }
function Pier({ structure, worldPosition }) { return <mesh position={worldPosition}><boxGeometry args={[1,0.2,5]}/><meshStandardMaterial color="brown"/></mesh>;  }
function TrafficLight({ structure, worldPosition }) { return <mesh position={worldPosition}><boxGeometry args={[0.5,1.5,0.5]}/><meshStandardMaterial color="darkgrey"/></mesh>; }
function BusStop({ structure, worldPosition }) { return <mesh position={worldPosition}><boxGeometry args={[3,2,1.5]}/><meshStandardMaterial color="lightblue"/></mesh>; }
function RestArea({ structure, worldPosition }) { return <mesh position={worldPosition}><boxGeometry args={[4,0.5,3]}/><meshStandardMaterial color="tan"/></mesh>; }
function MileMarker({ structure, worldPosition }) { return <mesh position={worldPosition}><cylinderGeometry args={[0.1,0.1,1]}/><meshStandardMaterial color="white"/></mesh>; }
function GenericStructure({ structure, worldPosition }) { return ( <mesh position={worldPosition} castShadow> <boxGeometry args={[structure.scale || 1, structure.scale || 1, structure.scale || 1]} /> <meshStandardMaterial color={structure.color || "#A0A0A0"} /> </mesh> ); }

// Main map renderer that combines all components
export function EnhancedMapRenderer({ mapId, physicsSettings, environmentSettings }) {
  return (
    <group>
      <Terrain physicsSettings={physicsSettings} environmentSettings={environmentSettings} mapId={mapId}/>
      <RoadNetwork mapId={mapId} physicsSettings={physicsSettings} />
      <WaterFeatures mapId={mapId} physicsSettings={physicsSettings} />
      <VegetationSystem mapId={mapId} physicsSettings={physicsSettings} />
      <InfrastructureSystem mapId={mapId} physicsSettings={physicsSettings} />
      <CourseMarkers mapId={mapId} /> 
      {/* CourseObstacles can be integrated into InfrastructureSystem or VegetationSystem if specific logic is needed,
          or rendered separately if they are distinct dynamic/interactive elements.
          For now, assuming basic obstacles are part of the above systems based on type.
      */}
      {/* <CourseObstacles mapId={mapId} physicsSettings={physicsSettings} /> */} 
    </group>
  );
}

export function CourseInfo({ map, course }) {
  if (!map) return null;
  return (
    <div style={{ 
      position: 'absolute', top: 60, left: 10, background: 'rgba(0,0,0,0.8)', 
      color: 'white', padding: 15, borderRadius: 8, minWidth: 250, zIndex: 10,
      backdropFilter: 'blur(10px)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#FFD700' }}>{map.name}</h3>
      <div style={{ fontSize: '0.9em', lineHeight: 1.4 }}>
        <div><strong>Distance:</strong> {map.distance}</div>
        <div><strong>Difficulty:</strong> 
          <span style={{ 
            color: map.difficulty === 'Easy' ? '#00FF00' : map.difficulty === 'Medium' ? '#FFA500' : '#FF4500',
            marginLeft: 5
          }}>{map.difficulty}</span>
        </div>
        <div style={{ marginTop: 8 }}>{map.description}</div>
        {course && course.waypoints && (
          <div style={{ marginTop: 8, fontSize: '0.8em' }}>
            <strong>Waypoints:</strong> {course.waypoints.length}
          </div>
        )}
        {map.environment && (
          <div style={{ marginTop: 8, fontSize: '0.8em' }}>
            <strong>Environment:</strong> {map.environment.weather}, {map.environment.timeOfDay}
          </div>
        )}
      </div>
    </div>
  );
}