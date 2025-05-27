// Enhanced MapData.js - Detailed map backgrounds with roads, terrain, vegetation, and infrastructure
export const MAPS = [
  {
    id: 'alpine',
    name: 'Alpine Pass',
    category: 'mountain',
    preset: 'park',
    difficulty: 'Hard',
    distance: '12.5km',
    description: 'Challenging mountain climb with steep switchbacks',
    environment: {
      lighting: 'mountain',
      weather: 'clear',
      timeOfDay: 'morning'
    }
  },
  {
    id: 'forest',
    name: 'Dark Forest',
    category: 'forest',
    preset: 'forest',
    difficulty: 'Medium',
    distance: '8.2km',
    description: 'Winding forest trail with rolling hills',
    environment: {
      lighting: 'forest',
      weather: 'misty',
      timeOfDay: 'afternoon'
    }
  },
  {
    id: 'coastal',
    name: 'Coastal Breeze',
    category: 'coastal',
    preset: 'city',
    difficulty: 'Easy',
    distance: '15.7km',
    description: 'Flat coastal route with ocean views',
    environment: {
      lighting: 'coastal',
      weather: 'sunny',
      timeOfDay: 'morning'
    }
  },
  {
    id: 'desert',
    name: 'Desert Dunes',
    category: 'desert',
    preset: 'sunset',
    difficulty: 'Medium',
    distance: '10.3km',
    description: 'Sandy terrain with moderate undulations',
    environment: {
      lighting: 'desert',
      weather: 'hot',
      timeOfDay: 'sunset'
    }
  },
  {
    id: 'urban',
    name: 'City Streets',
    category: 'urban',
    preset: 'studio',
    difficulty: 'Easy',
    distance: '6.8km',
    description: 'Urban circuit with short climbs',
    environment: {
      lighting: 'urban',
      weather: 'clear',
      timeOfDay: 'day'
    }
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    category: 'forest',
    preset: 'apartment',
    difficulty: 'Medium',
    distance: '11.2km',
    description: 'Jungle trail with river crossings',
    environment: {
      lighting: 'tropical',
      weather: 'humid',
      timeOfDay: 'afternoon'
    }
  },
  {
    id: 'island',
    name: 'Island Loop',
    category: 'coastal',
    preset: 'lobby',
    difficulty: 'Hard',
    distance: '9.6km',
    description: 'Challenging island circuit with clifftop sections',
    environment: {
      lighting: 'island',
      weather: 'windy',
      timeOfDay: 'morning'
    }
  },
  {
    id: 'valley',
    name: 'Green Valley',
    category: 'mountain',
    preset: 'park',
    difficulty: 'Easy',
    distance: '14.1km',
    description: 'Gentle valley ride through farmland',
    environment: {
      lighting: 'valley',
      weather: 'clear',
      timeOfDay: 'morning'
    }
  },
  {
    id: 'snowtrack',
    name: 'Snow Track',
    category: 'snow',
    preset: 'dawn',
    difficulty: 'Hard',
    distance: '7.9km',
    description: 'Winter wonderland with icy conditions',
    environment: {
      lighting: 'snow',
      weather: 'snowy',
      timeOfDay: 'dawn'
    }
  },
  {
    id: 'countryside',
    name: 'Countryside',
    category: 'rural',
    preset: 'city',
    difficulty: 'Easy',
    distance: '13.4km',
    description: 'Rolling countryside with farmhouse views',
    environment: {
      lighting: 'countryside',
      weather: 'clear',
      timeOfDay: 'afternoon'
    }
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
    // Enhanced terrain features
    terrain: {
      baseColor: '#8B7355',
      grassColor: '#5d7c47',
      rockColor: '#6B6B6B',
      snowColor: '#FFFFFF',
      dirtColor: '#8B4513',
      textures: ['grass', 'rock', 'snow', 'dirt']
    },
    // Road network
    roads: [
      {
        id: 'main_road',
        type: 'paved',
        width: 6,
        color: '#404040',
        points: [
          { x: 0, z: 0 }, { x: 15, z: 12 }, { x: 30, z: 25 }, 
          { x: 50, z: 35 }, { x: 70, z: 25 }, { x: 85, z: 0 }, { x: 100, z: -50 }
        ],
        markings: {
          centerLine: true,
          sidelines: true,
          arrows: true
        }
      },
      {
        id: 'switchback_1',
        type: 'gravel',
        width: 4,
        color: '#8B7355',
        points: [
          { x: 45, z: 30 }, { x: 55, z: 35 }, { x: 65, z: 32 }, { x: 70, z: 25 }
        ]
      }
    ],
    // Water features
    waterFeatures: [
      {
        type: 'stream',
        points: [
          { x: 25, z: 5 }, { x: 35, z: 15 }, { x: 45, z: 25 }, { x: 55, z: 35 }
        ],
        width: 3,
        color: '#4682B4'
      },
      {
        type: 'lake',
        center: { x: 85, z: -20 },
        radius: 15,
        color: '#1E90FF'
      }
    ],
    // Vegetation
    vegetation: [
      {
        type: 'pine_forest',
        density: 'high',
        area: { x: 10, z: 5, width: 25, height: 20 },
        treeTypes: ['pine', 'spruce', 'fir'],
        treeCount: 150,
        undergrowth: true
      },
      {
        type: 'alpine_meadow',
        density: 'medium',
        area: { x: 40, z: 15, width: 30, height: 25 },
        grassHeight: 0.3,
        flowers: ['alpine_forget_me_not', 'mountain_daisy']
      },
      {
        type: 'scattered_trees',
        density: 'low',
        area: { x: 70, z: -40, width: 40, height: 30 },
        treeTypes: ['birch', 'aspen'],
        treeCount: 25
      }
    ],
    // Infrastructure
    infrastructure: [
      {
        type: 'bridge',
        position: { x: 35, z: 15 },
        rotation: 45,
        length: 12,
        width: 8,
        material: 'stone'
      },
      {
        type: 'sign',
        position: { x: 0, z: 0 },
        text: 'Alpine Pass Trail - 12.5km',
        style: 'wooden'
      },
      {
        type: 'sign',
        position: { x: 65, z: 20 },
        text: 'Summit - 2,450m',
        style: 'metal'
      },
      {
        type: 'guard_rail',
        points: [
          { x: 45, z: 30 }, { x: 55, z: 35 }, { x: 65, z: 32 }
        ],
        material: 'metal'
      },
      {
        type: 'rest_area',
        position: { x: 45, z: 30 },
        facilities: ['bench', 'waste_bin', 'info_board']
      }
    ],
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
    terrain: {
      baseColor: '#2D5016',
      grassColor: '#228B22',
      mossColor: '#32CD32',
      dirtColor: '#8B4513',
      textures: ['forest_floor', 'moss', 'fallen_leaves', 'dirt']
    },
    roads: [
      {
        id: 'forest_trail',
        type: 'dirt',
        width: 3,
        color: '#8B4513',
        points: [
          { x: 0, z: 0 }, { x: 10, z: 15 }, { x: 0, z: 30 }, 
          { x: -15, z: 25 }, { x: -20, z: 0 }, { x: 0, z: -35 }
        ],
        markings: {
          footprints: true,
          tire_tracks: true
        }
      }
    ],
    waterFeatures: [
      {
        type: 'stream',
        points: [
          { x: -25, z: 25 }, { x: -20, z: 15 }, { x: -15, z: 5 }, { x: -10, z: -5 }
        ],
        width: 2,
        color: '#4682B4'
      }
    ],
    vegetation: [
      {
        type: 'dense_forest',
        density: 'very_high',
        area: { x: -50, z: -20, width: 100, height: 80 },
        treeTypes: ['oak', 'maple', 'birch', 'pine'],
        treeCount: 500,
        undergrowth: true,
        canopyCover: 0.85
      },
      {
        type: 'forest_clearing',
        density: 'low',
        area: { x: -10, z: 35, width: 20, height: 15 },
        grassHeight: 0.4,
        wildflowers: true
      },
      {
        type: 'fern_patches',
        density: 'medium',
        scattered: true,
        count: 50
      }
    ],
    infrastructure: [
      {
        type: 'wooden_bridge',
        position: { x: -22, z: 15 },
        rotation: 30,
        length: 8,
        width: 4,
        material: 'wood'
      },
      {
        type: 'trail_marker',
        position: { x: 0, z: 0 },
        text: 'Forest Trail - 8.2km',
        style: 'wooden_post'
      },
      {
        type: 'trail_marker',
        position: { x: 15, z: 20 },
        text: 'Deep Woods ← 2km',
        style: 'wooden_post'
      },
      {
        type: 'picnic_table',
        position: { x: -10, z: 35 }
      }
    ],
    obstacles: [
      { x: 10, y: 15, z: 7, type: 'tree', scale: 2 },
      { x: -5, y: 25, z: 9, type: 'tree', scale: 1.8 },
      { x: -15, y: 10, z: 8, type: 'tree', scale: 2.2 },
      { x: 5, y: 0, z: 3, type: 'fallen_log', scale: 1.5 }
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
    terrain: {
      baseColor: '#F4E4BC',
      sandColor: '#F4A460',
      grassColor: '#9ACD32',
      rockColor: '#696969',
      textures: ['sand', 'beach_grass', 'rock', 'shells']
    },
    roads: [
      {
        id: 'coastal_road',
        type: 'paved',
        width: 6,
        color: '#404040',
        points: [
          { x: 0, z: 0 }, { x: 25, z: 2 }, { x: 55, z: -2 }, 
          { x: 75, z: -15 }, { x: 65, z: -35 }, { x: 35, z: -45 }, { x: 0, z: -45 }
        ],
        markings: {
          centerLine: true,
          sidelines: true,
          bicycle_lane: true
        }
      },
      {
        id: 'beach_boardwalk',
        type: 'wooden',
        width: 3,
        color: '#DEB887',
        points: [
          { x: 0, z: -5 }, { x: 30, z: 0 }, { x: 60, z: -10 }
        ]
      }
    ],
    waterFeatures: [
      {
        type: 'ocean',
        bounds: { x: -50, z: -100, width: 200, height: 50 },
        color: '#006994',
        waves: true,
        foam: true
      },
      {
        type: 'tidal_pool',
        center: { x: 80, z: -20 },
        radius: 5,
        color: '#4682B4'
      }
    ],
    vegetation: [
      {
        type: 'palm_grove',
        density: 'medium',
        area: { x: 25, z: 5, width: 15, height: 10 },
        treeTypes: ['coconut_palm', 'date_palm'],
        treeCount: 20
      },
      {
        type: 'beach_grass',
        density: 'high',
        area: { x: 0, z: -10, width: 100, height: 20 },
        grassHeight: 0.6
      },
      {
        type: 'dune_vegetation',
        density: 'low',
        scattered: true,
        plants: ['sea_oats', 'beach_morning_glory']
      }
    ],
    infrastructure: [
      {
        type: 'lighthouse',
        position: { x: 60, z: -5 },
        height: 25,
        style: 'classic'
      },
      {
        type: 'pier',
        position: { x: 30, z: 5 },
        length: 15,
        width: 4,
        material: 'wood'
      },
      {
        type: 'beach_access',
        position: { x: 0, z: 0 },
        facilities: ['parking', 'restrooms', 'showers']
      },
      {
        type: 'sign',
        position: { x: 0, z: 0 },
        text: 'Coastal Breeze Route - 15.7km',
        style: 'beach'
      }
    ],
    obstacles: [
      { x: 35, y: 8, z: 3, type: 'palm', scale: 1.5 },
      { x: 65, y: -8, z: 4, type: 'rock', scale: 1 },
      { x: 45, y: -35, z: 3, type: 'palm', scale: 1.8 },
      { x: 75, y: -18, z: 2, type: 'driftwood', scale: 1.2 }
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
    terrain: {
      baseColor: '#F4C430',
      sandColor: '#F4A460',
      rockColor: '#A0522D',
      oasisColor: '#228B22',
      textures: ['sand', 'rock', 'dried_grass', 'salt_flat']
    },
    roads: [
      {
        id: 'desert_track',
        type: 'sand',
        width: 4,
        color: '#D2B48C',
        points: [
          { x: 0, z: 0 }, { x: 20, z: 18 }, { x: 45, z: 8 }, 
          { x: 35, z: -18 }, { x: 10, z: -30 }, { x: -10, z: -20 }
        ],
        markings: {
          tire_tracks: true,
          wind_erosion: true
        }
      }
    ],
    waterFeatures: [
      {
        type: 'oasis',
        center: { x: 0, z: 0 },
        radius: 8,
        color: '#00CED1'
      },
      {
        type: 'mirage',
        center: { x: 30, z: 15 },
        radius: 12,
        ephemeral: true
      }
    ],
    vegetation: [
      {
        type: 'oasis_palms',
        density: 'high',
        area: { x: -5, z: -5, width: 10, height: 10 },
        treeTypes: ['date_palm'],
        treeCount: 15
      },
      {
        type: 'desert_scrub',
        density: 'very_low',
        scattered: true,
        plants: ['sagebrush', 'creosote', 'barrel_cactus'],
        count: 30
      },
      {
        type: 'cactus_garden',
        density: 'low',
        area: { x: 15, z: -30, width: 20, height: 15 },
        plants: ['saguaro', 'prickly_pear', 'cholla']
      }
    ],
    infrastructure: [
      {
        type: 'well',
        position: { x: 0, z: 0 }
      },
      {
        type: 'desert_shelter',
        position: { x: 25, z: 20 },
        style: 'adobe'
      },
      {
        type: 'sign',
        position: { x: 0, z: 0 },
        text: 'Desert Dunes Trail - 10.3km',
        style: 'weathered_metal'
      },
      {
        type: 'mile_marker',
        positions: [
          { x: 12, z: 10 }, { x: 35, z: 5 }, { x: 25, z: -25 }
        ]
      }
    ],
    obstacles: [
      { x: 20, y: 15, z: 8, type: 'cactus', scale: 1 },
      { x: 35, y: -10, z: 6, type: 'rock', scale: 1.5 },
      { x: 10, y: -25, z: 5, type: 'cactus', scale: 1.2 },
      { x: 45, y: 5, z: 4, type: 'sand_dune', scale: 2 }
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
    terrain: {
      baseColor: '#6C6C6C',
      asphaltColor: '#404040',
      concreteColor: '#C0C0C0',
      grassColor: '#32CD32',
      textures: ['asphalt', 'concrete', 'grass', 'brick']
    },
    roads: [
      {
        id: 'main_street',
        type: 'paved',
        width: 8,
        color: '#404040',
        points: [
          { x: 0, z: 0 }, { x: 12, z: 8 }, { x: 25, z: 3 }, 
          { x: 32, z: -12 }, { x: 18, z: -22 }, { x: 0, z: -20 }
        ],
        markings: {
          centerLine: true,
          sidelines: true,
          crosswalks: true,
          traffic_lights: true,
          bike_lane: true
        }
      },
      {
        id: 'side_streets',
        type: 'paved',
        width: 6,
        color: '#505050',
        network: 'grid',
        spacing: 15
      }
    ],
    waterFeatures: [
      {
        type: 'river',
        points: [
          { x: 30, z: -20 }, { x: 25, z: -15 }, { x: 20, z: -25 }, { x: 10, z: -30 }
        ],
        width: 8,
        color: '#4682B4'
      }
    ],
    vegetation: [
      {
        type: 'city_park',
        density: 'high',
        area: { x: 25, z: 0, width: 15, height: 15 },
        treeTypes: ['oak', 'maple', 'linden'],
        treeCount: 40,
        facilities: ['playground', 'benches', 'fountains']
      },
      {
        type: 'street_trees',
        density: 'medium',
        pattern: 'linear',
        spacing: 10,
        treeTypes: ['street_maple', 'london_plane']
      }
    ],
    infrastructure: [
      {
        type: 'office_building',
        position: { x: 5, z: 5 },
        floors: 12,
        style: 'modern'
      },
      {
        type: 'apartment_complex',
        position: { x: -10, z: 8 },
        floors: 6,
        style: 'residential'
      },
      {
        type: 'bridge',
        position: { x: 35, z: -15 },
        length: 20,
        width: 10,
        material: 'steel'
      },
      {
        type: 'traffic_light',
        positions: [
          { x: 0, z: 0 }, { x: 15, z: 10 }, { x: 30, z: 5 }
        ]
      },
      {
        type: 'bus_stop',
        positions: [
          { x: 8, z: 4 }, { x: 22, z: 1 }, { x: 12, z: -18 }
        ]
      }
    ],
    obstacles: [
      { x: 10, y: 8, z: 4, type: 'building', scale: 1 },
      { x: 25, y: -5, z: 3, type: 'building', scale: 1.5 },
      { x: 15, y: -20, z: 2, type: 'fountain', scale: 1 },
      { x: 32, y: -15, z: 4, type: 'bridge_pillar', scale: 2 }
    ]
  }
  
  // Add similar enhanced data for tropical, island, valley, snowtrack, and countryside...
};

// Terrain texture definitions
export const TERRAIN_TEXTURES = {
  grass: { color: '#228B22', roughness: 0.8, metalness: 0.0 },
  rock: { color: '#696969', roughness: 0.9, metalness: 0.1 },
  sand: { color: '#F4A460', roughness: 0.7, metalness: 0.0 },
  snow: { color: '#FFFAFA', roughness: 0.3, metalness: 0.0 },
  dirt: { color: '#8B4513', roughness: 0.9, metalness: 0.0 },
  asphalt: { color: '#404040', roughness: 0.8, metalness: 0.0 },
  concrete: { color: '#C0C0C0', roughness: 0.7, metalness: 0.0 },
  water: { color: '#4682B4', roughness: 0.1, metalness: 0.0 },
  forest_floor: { color: '#2F4F2F', roughness: 0.9, metalness: 0.0 },
  moss: { color: '#228B22', roughness: 0.8, metalness: 0.0 }
};

// Road marking definitions
export const ROAD_MARKINGS = {
  centerLine: { color: '#FFFF00', width: 0.1, dashed: true },
  sideLine: { color: '#FFFFFF', width: 0.15, solid: true },
  crosswalk: { color: '#FFFFFF', width: 0.3, striped: true },
  bikeLA: { color: '#00FF00', width: 1.0, symbols: true }
};