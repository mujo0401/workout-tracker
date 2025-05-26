// MapData.js
export const MAPS = [
  {
    id: 'alpine',
    name: 'Alpine Pass',
    category: 'mountain',
    preset: 'park',
    difficulty: 'Hard',
    distance: '12.5km',
    description: 'Challenging mountain climb with steep switchbacks'
  },
  {
    id: 'forest',
    name: 'Dark Forest',
    category: 'forest',
    preset: 'forest',
    difficulty: 'Medium',
    distance: '8.2km',
    description: 'Winding forest trail with rolling hills'
  },
  {
    id: 'coastal',
    name: 'Coastal Breeze',
    category: 'coastal',
    preset: 'city',
    difficulty: 'Easy',
    distance: '15.7km',
    description: 'Flat coastal route with ocean views'
  },
  {
    id: 'desert',
    name: 'Desert Dunes',
    category: 'desert',
    preset: 'sunset',
    difficulty: 'Medium',
    distance: '10.3km',
    description: 'Sandy terrain with moderate undulations'
  },
  {
    id: 'urban',
    name: 'City Streets',
    category: 'urban',
    preset: 'studio',
    difficulty: 'Easy',
    distance: '6.8km',
    description: 'Urban circuit with short climbs'
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    category: 'forest',
    preset: 'apartment',
    difficulty: 'Medium',
    distance: '11.2km',
    description: 'Jungle trail with river crossings'
  },
  {
    id: 'island',
    name: 'Island Loop',
    category: 'coastal',
    preset: 'lobby',
    difficulty: 'Hard',
    distance: '9.6km',
    description: 'Challenging island circuit with clifftop sections'
  },
  {
    id: 'valley',
    name: 'Green Valley',
    category: 'mountain',
    preset: 'park',
    difficulty: 'Easy',
    distance: '14.1km',
    description: 'Gentle valley ride through farmland'
  },
  {
    id: 'snowtrack',
    name: 'Snow Track',
    category: 'snow',
    preset: 'dawn',
    difficulty: 'Hard',
    distance: '7.9km',
    description: 'Winter wonderland with icy conditions'
  },
  {
    id: 'countryside',
    name: 'Countryside',
    category: 'rural',
    preset: 'city',
    difficulty: 'Easy',
    distance: '13.4km',
    description: 'Rolling countryside with farmhouse views'
  }
];

export const COURSES = {
  alpine: {
    waypoints: [
      { x: 0, z: 0, elevation: 0, marker: 'Start' },
      { x: 20, z: 15, elevation: 8, marker: 'Checkpoint 1' },
      { x: 45, z: 30, elevation: 18, marker: 'Summit Approach' },
      { x: 65, z: 20, elevation: 25, marker: 'Alpine Summit' },
      { x: 80, z: -10, elevation: 20, marker: 'Descent Start' },
      { x: 90, z: -30, elevation: 10, marker: 'Valley Return' },
      { x: 100, z: -50, elevation: 0, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const ridgePattern = Math.sin(x * 0.02) * 15 + Math.cos(y * 0.015) * 10;
      const peakPattern = Math.exp(-((x-65)**2 + (y-20)**2) / 800) * 20;
      return ridgePattern + peakPattern + Math.random() * 2;
    },
    obstacles: [
      { x: 25, y: 12, z: 18, type: 'rock', scale: 2 },
      { x: 50, y: 25, z: 28, type: 'rock', scale: 3 },
      { x: 70, y: 15, z: 32, type: 'rock', scale: 1.5 }
    ]
  },
  forest: {
    waypoints: [
      { x: 0, z: 0, elevation: 2, marker: 'Forest Entry' },
      { x: 15, z: 20, elevation: 5, marker: 'Deep Woods' },
      { x: -10, z: 35, elevation: 8, marker: 'Hill Crest' },
      { x: -25, z: 15, elevation: 6, marker: 'Stream Crossing' },
      { x: -20, z: -15, elevation: 3, marker: 'Forest Edge' },
      { x: 0, z: -35, elevation: 1, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const rolling = Math.sin(x * 0.05) * 4 + Math.cos(y * 0.04) * 3;
      const valleys = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 6;
      return rolling + valleys + Math.random() * 1.5;
    },
    obstacles: [
      { x: 10, y: 15, z: 7, type: 'tree', scale: 2 },
      { x: -5, y: 25, z: 9, type: 'tree', scale: 1.8 },
      { x: -15, y: 10, z: 8, type: 'tree', scale: 2.2 }
    ]
  },
  coastal: {
    waypoints: [
      { x: 0, z: 0, elevation: 1, marker: 'Beach Start' },
      { x: 30, z: 5, elevation: 1, marker: 'Pier' },
      { x: 60, z: -5, elevation: 2, marker: 'Lighthouse' },
      { x: 80, z: -20, elevation: 1, marker: 'Rocky Point' },
      { x: 70, z: -40, elevation: 1, marker: 'Bay View' },
      { x: 40, z: -50, elevation: 1, marker: 'Return' },
      { x: 0, z: -45, elevation: 1, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const waves = Math.sin(y * 0.1) * 0.5;
      const dunes = Math.sin(x * 0.03) * 2;
      return waves + dunes + 0.5;
    },
    obstacles: [
      { x: 35, y: 8, z: 3, type: 'palm', scale: 1.5 },
      { x: 65, y: -8, z: 4, type: 'rock', scale: 1 },
      { x: 45, y: -35, z: 3, type: 'palm', scale: 1.8 }
    ]
  },
  desert: {
    waypoints: [
      { x: 0, z: 0, elevation: 2, marker: 'Oasis' },
      { x: 25, z: 20, elevation: 6, marker: 'Dune Ridge' },
      { x: 50, z: 10, elevation: 4, marker: 'Sand Valley' },
      { x: 40, z: -20, elevation: 8, marker: 'High Dune' },
      { x: 15, z: -35, elevation: 3, marker: 'Rocky Outcrop' },
      { x: -10, z: -20, elevation: 2, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const dunes = Math.sin(x * 0.02) * 6 + Math.cos(y * 0.025) * 4;
      const variation = Math.sin(x * 0.08) * Math.cos(y * 0.06) * 3;
      return dunes + variation + 2;
    },
    obstacles: [
      { x: 20, y: 15, z: 8, type: 'cactus', scale: 1 },
      { x: 35, y: -10, z: 6, type: 'rock', scale: 1.5 },
      { x: 10, y: -25, z: 5, type: 'cactus', scale: 1.2 }
    ]
  },
  urban: {
    waypoints: [
      { x: 0, z: 0, elevation: 0, marker: 'City Center' },
      { x: 15, z: 10, elevation: 3, marker: 'Hill District' },
      { x: 30, z: 5, elevation: 2, marker: 'Park Loop' },
      { x: 35, z: -15, elevation: 4, marker: 'Bridge' },
      { x: 20, z: -25, elevation: 1, marker: 'Waterfront' },
      { x: 0, z: -20, elevation: 0, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const streets = Math.floor(x / 10) * 0.5 + Math.floor(y / 10) * 0.5;
      const hills = Math.sin(x * 0.03) * 3 + Math.cos(y * 0.04) * 2;
      return streets + hills;
    },
    obstacles: [
      { x: 10, y: 8, z: 4, type: 'building', scale: 1 },
      { x: 25, y: -5, z: 3, type: 'building', scale: 1.5 },
      { x: 15, y: -20, z: 2, type: 'fountain', scale: 1 }
    ]
  },
  tropical: {
    waypoints: [
      { x: 0, z: 0, elevation: 1, marker: 'Jungle Entry' },
      { x: 20, z: 15, elevation: 4, marker: 'Canopy Bridge' },
      { x: 10, z: 30, elevation: 6, marker: 'Waterfall' },
      { x: -15, z: 25, elevation: 3, marker: 'River Bend' },
      { x: -25, z: 5, elevation: 2, marker: 'Bamboo Grove' },
      { x: -10, z: -20, elevation: 1, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const jungle = Math.sin(x * 0.04) * 4 + Math.cos(y * 0.035) * 3;
      const rivers = Math.sin((x + y) * 0.02) * 2;
      return jungle + rivers + 1 + Math.random() * 2;
    },
    obstacles: [
      { x: 15, y: 20, z: 6, type: 'tree', scale: 3 },
      { x: -5, y: 18, z: 5, type: 'rock', scale: 1 },
      { x: -20, y: 8, z: 4, type: 'tree', scale: 2.5 }
    ]
  },
  island: {
    waypoints: [
      { x: 0, z: 0, elevation: 2, marker: 'Harbor' },
      { x: 25, z: 15, elevation: 12, marker: 'Cliff Road' },
      { x: 40, z: -5, elevation: 15, marker: 'Peak View' },
      { x: 30, z: -25, elevation: 8, marker: 'Cave Entrance' },
      { x: 5, z: -30, elevation: 4, marker: 'Beach Path' },
      { x: -15, z: -10, elevation: 2, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const cliffPattern = Math.exp(-((x-35)**2 + (y+5)**2) / 400) * 18;
      const coastline = Math.sin(Math.atan2(y, x) * 3) * 2;
      return cliffPattern + coastline + 2;
    },
    obstacles: [
      { x: 30, y: 10, z: 18, type: 'rock', scale: 2 },
      { x: 20, y: -20, z: 12, type: 'palm', scale: 1.5 },
      { x: -5, y: -25, z: 6, type: 'rock', scale: 1 }
    ]
  },
  valley: {
    waypoints: [
      { x: 0, z: 0, elevation: 3, marker: 'Farm Gate' },
      { x: 20, z: 10, elevation: 2, marker: 'Orchard' },
      { x: 40, z: 5, elevation: 1, marker: 'River Bridge' },
      { x: 50, z: -15, elevation: 2, marker: 'Mill' },
      { x: 30, z: -30, elevation: 3, marker: 'Pasture' },
      { x: 10, z: -25, elevation: 4, marker: 'Barn' },
      { x: 0, z: -10, elevation: 3, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const gentle = Math.sin(x * 0.02) * 2 + Math.cos(y * 0.025) * 1.5;
      const farmland = Math.sin(x * 0.1) * 0.5;
      return gentle + farmland + 2;
    },
    obstacles: [
      { x: 15, y: 8, z: 4, type: 'tree', scale: 1.5 },
      { x: 35, y: -10, z: 3, type: 'barn', scale: 1 },
      { x: 25, y: -25, z: 5, type: 'tree', scale: 1.8 }
    ]
  },
  snowtrack: {
    waypoints: [
      { x: 0, z: 0, elevation: 5, marker: 'Lodge' },
      { x: 20, z: 20, elevation: 12, marker: 'Pine Forest' },
      { x: 35, z: 10, elevation: 18, marker: 'Snow Bowl' },
      { x: 25, z: -15, elevation: 15, marker: 'Ice Lake' },
      { x: 5, z: -25, elevation: 8, marker: 'Descent' },
      { x: -10, z: -10, elevation: 5, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const snowdrifts = Math.sin(x * 0.03) * 6 + Math.cos(y * 0.02) * 4;
      const slopes = Math.sin((x + y) * 0.01) * 8;
      return snowdrifts + slopes + 5;
    },
    obstacles: [
      { x: 18, y: 18, z: 16, type: 'pine', scale: 2 },
      { x: 30, y: 5, z: 20, type: 'rock', scale: 1.5 },
      { x: 10, y: -20, z: 12, type: 'pine', scale: 1.8 }
    ]
  },
  countryside: {
    waypoints: [
      { x: 0, z: 0, elevation: 2, marker: 'Village' },
      { x: 25, z: 15, elevation: 4, marker: 'Windmill Hill' },
      { x: 45, z: 0, elevation: 3, marker: 'Stone Bridge' },
      { x: 50, z: -25, elevation: 5, marker: 'Church Tower' },
      { x: 25, z: -40, elevation: 2, marker: 'Meadow' },
      { x: 0, z: -30, elevation: 2, marker: 'Finish' }
    ],
    terrainFunction: (x, y) => {
      const rolling = Math.sin(x * 0.025) * 3 + Math.cos(y * 0.02) * 2;
      const fields = Math.sin(x * 0.05) * Math.cos(y * 0.04) * 1;
      return rolling + fields + 2;
    },
    obstacles: [
      { x: 20, y: 12, z: 6, type: 'windmill', scale: 1 },
      { x: 40, y: -20, z: 7, type: 'tree', scale: 2 },
      { x: 15, y: -35, z: 4, type: 'barn', scale: 1.2 }
    ]
  }
};