// Reference data for Howrah District, West Bengal.
// Blocks (Panchayat Samiti) are an accurate fixed list of 14.
// Approximate block-HQ coordinates are provided only to centre the map /
// pre-fill a marker; the user can drag/click to set the precise location.

export const DISTRICT = {
  name: 'Howrah',
  center: [22.49, 88.05],
  zoom: 10,
}

// The three tiers of the Panchayati Raj system.
export const LEVELS = [
  'Gram Panchayat (GP)',
  'Panchayat Samiti (Block)',
  'Zilla Parishad (District)',
]

// 14 Community Development Blocks / Panchayat Samitis of Howrah district.
// `center` is approximate (block HQ) — used only as a sensible map default.
export const BLOCKS = [
  { name: 'Bally Jagachha', subdivision: 'Howrah Sadar', center: [22.648, 88.343] },
  { name: 'Domjur', subdivision: 'Howrah Sadar', center: [22.621, 88.183] },
  { name: 'Sankrail', subdivision: 'Howrah Sadar', center: [22.554, 88.205] },
  { name: 'Panchla', subdivision: 'Howrah Sadar', center: [22.502, 88.151] },
  { name: 'Jagatballavpur', subdivision: 'Howrah Sadar', center: [22.553, 88.054] },
  { name: 'Uluberia-I', subdivision: 'Uluberia', center: [22.473, 88.110] },
  { name: 'Uluberia-II', subdivision: 'Uluberia', center: [22.430, 88.050] },
  { name: 'Bagnan-I', subdivision: 'Uluberia', center: [22.423, 87.973] },
  { name: 'Bagnan-II', subdivision: 'Uluberia', center: [22.451, 87.930] },
  { name: 'Shyampur-I', subdivision: 'Uluberia', center: [22.350, 88.052] },
  { name: 'Shyampur-II', subdivision: 'Uluberia', center: [22.301, 88.020] },
  { name: 'Amta-I', subdivision: 'Uluberia', center: [22.578, 87.971] },
  { name: 'Amta-II', subdivision: 'Uluberia', center: [22.603, 87.918] },
  { name: 'Udaynarayanpur', subdivision: 'Uluberia', center: [22.652, 87.900] },
]

export const BLOCK_NAMES = BLOCKS.map((b) => b.name)

export function blockCenter(name) {
  const b = BLOCKS.find((x) => x.name === name)
  return b ? b.center : DISTRICT.center
}

// Sectors with a stable colour + icon used for map markers, chips and charts.
export const SECTORS = [
  { name: 'Healthcare', color: '#e11d48', icon: '🏥' },
  { name: 'Education', color: '#2563eb', icon: '🏫' },
  { name: 'Solid Waste Mgmt (SWM)', color: '#65a30d', icon: '♻️' },
  { name: 'Roads & Bridges', color: '#78716c', icon: '🛣️' },
  { name: 'Water Supply', color: '#0891b2', icon: '🚰' },
  { name: 'Sanitation', color: '#7c3aed', icon: '🚻' },
  { name: 'Irrigation', color: '#0ea5e9', icon: '💧' },
  { name: 'Drainage', color: '#0d9488', icon: '🌊' },
  { name: 'Electrification', color: '#f59e0b', icon: '💡' },
  { name: 'Agriculture', color: '#16a34a', icon: '🌾' },
  { name: 'Livelihood / SHG', color: '#db2777', icon: '🤝' },
  { name: 'ICDS / Anganwadi', color: '#d97706', icon: '🧒' },
  { name: 'Sports & Culture', color: '#9333ea', icon: '🏆' },
  { name: 'Building / Admin', color: '#475569', icon: '🏢' },
  { name: 'Other', color: '#6b7280', icon: '📌' },
]

export const SECTOR_NAMES = SECTORS.map((s) => s.name)

const SECTOR_COLOR = Object.fromEntries(SECTORS.map((s) => [s.name, s.color]))
export function sectorColor(name) {
  return SECTOR_COLOR[name] || '#6b7280'
}

const SECTOR_ICON = Object.fromEntries(SECTORS.map((s) => [s.name, s.icon]))
export function sectorIcon(name) {
  return SECTOR_ICON[name] || '📌'
}

// Sanctioning departments — the administrative head under which a fund is
// sanctioned for the work (e.g. Health, Education, PWD, Panchayat Dept).
export const DEPARTMENTS = [
  'Panchayat & Rural Development (P&RD)',
  'Health & Family Welfare',
  'School Education',
  'Public Works Department (PWD)',
  'Public Health Engineering (PHE)',
  'Irrigation & Waterways',
  'Water Resources Investigation & Dev.',
  'Women & Child Dev. & Social Welfare (ICDS)',
  'Agriculture',
  'Power',
  'Forest',
  'Fisheries',
  'Backward Classes Welfare & Tribal Dev.',
  'Minority Affairs & Madrasah Education',
  'Sports & Youth Services',
  'Disaster Management & Civil Defence',
  'Other',
]

// Common funding schemes under which panchayat assets are created.
export const FUNDS = [
  '15th Finance Commission (Tied)',
  '15th Finance Commission (Untied)',
  'MGNREGA (100 Days Work)',
  'PMAY-G (Awaas Yojana)',
  'SBM-G (Swachh Bharat Mission)',
  'Jal Jeevan Mission',
  'PMGSY (Rural Roads)',
  'State Finance Commission',
  'Own Source Revenue (OSR)',
  'BEUP / MLA LAD',
  'MPLADS',
  'Other',
]
