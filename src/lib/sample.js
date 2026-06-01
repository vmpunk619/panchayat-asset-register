// A small set of illustrative assets across blocks / sectors / years so the
// map and dashboard are not empty on first run. Coordinates are approximate
// and for demonstration only. Loaded on demand via the "Load sample data" button.

export const SAMPLE_ASSETS = [
  {
    name: 'Sub-Centre Building, Salap', sector: 'Healthcare',
    level: 'Gram Panchayat (GP)', block: 'Domjur', gp: 'Salap', village: 'Salap',
    department: 'Health & Family Welfare', fundName: '15th Finance Commission (Tied)', amount: 1850000,
    startDate: '2023-05-10', endDate: '2024-02-20',
    geometry: 'point', lat: 22.625, lng: 88.190, address: 'Salap More, NH-16, Domjur',
    notes: 'New ANM sub-centre with waiting hall.',
  },
  {
    name: 'Primary School Boundary Wall', sector: 'Education',
    level: 'Gram Panchayat (GP)', block: 'Jagatballavpur', gp: 'Maju', village: 'Maju',
    department: 'School Education', fundName: 'MGNREGA (100 Days Work)', amount: 620000,
    startDate: '2022-11-01', endDate: '2023-03-15',
    geometry: 'point', lat: 22.560, lng: 88.060, address: 'Maju Primary School, Jagatballavpur',
    notes: '',
  },
  {
    name: 'Solid Waste Segregation Shed', sector: 'Solid Waste Mgmt (SWM)',
    level: 'Gram Panchayat (GP)', block: 'Bally Jagachha', gp: 'Chamrail', village: 'Chamrail',
    department: 'Panchayat & Rural Development (P&RD)', fundName: 'SBM-G (Swachh Bharat Mission)', amount: 980000,
    startDate: '2024-01-08', endDate: '2024-06-30',
    geometry: 'point', lat: 22.650, lng: 88.340, address: 'Chamrail, Bally Jagachha',
    notes: 'MRF with composting pits.',
  },
  {
    name: 'Rural Road: Bagnan Bazar–Station link', sector: 'Roads & Bridges',
    level: 'Panchayat Samiti (Block)', block: 'Bagnan-I', gp: 'Bagnan', village: 'Bagnan',
    department: 'Public Works Department (PWD)', fundName: 'PMGSY (Rural Roads)', amount: 4200000,
    startDate: '2023-08-12', endDate: '2024-04-18',
    geometry: 'line',
    path: [[22.4205, 87.9700], [22.4218, 87.9735], [22.4236, 87.9768], [22.4252, 87.9802]],
    lat: 22.4236, lng: 87.9768, address: 'Bagnan Bazar to Station Road',
    notes: '1.8 km bituminous road traced as a route.',
  },
  {
    name: 'Piped Water Supply Scheme', sector: 'Water Supply',
    level: 'Zilla Parishad (District)', block: 'Amta-II', gp: 'Amta', village: 'Amta',
    department: 'Public Health Engineering (PHE)', fundName: 'Jal Jeevan Mission', amount: 15600000,
    startDate: '2022-06-01', endDate: '2024-05-25',
    geometry: 'point', lat: 22.603, lng: 87.920, address: 'Amta-II PHE overhead reservoir',
    notes: 'Functional household tap connections.',
  },
  {
    name: 'Drainage & Culvert, Shyampur', sector: 'Drainage',
    level: 'Gram Panchayat (GP)', block: 'Shyampur-I', gp: 'Shyampur', village: 'Shyampur',
    department: 'Panchayat & Rural Development (P&RD)', fundName: '15th Finance Commission (Untied)', amount: 1120000,
    startDate: '2024-02-15', endDate: '2024-09-10',
    geometry: 'line',
    path: [[22.3500, 88.0520], [22.3512, 88.0535], [22.3525, 88.0548]],
    lat: 22.3512, lng: 88.0535, address: 'Shyampur main road drain',
    notes: 'Roadside pucca drain.',
  },
  {
    name: 'Anganwadi Centre Building', sector: 'ICDS / Anganwadi',
    level: 'Gram Panchayat (GP)', block: 'Uluberia-I', gp: 'Kulgachia', village: 'Kulgachia',
    department: 'Women & Child Dev. & Social Welfare (ICDS)', fundName: '15th Finance Commission (Tied)', amount: 740000,
    startDate: '2023-12-01', endDate: '2024-07-05',
    geometry: 'point', lat: 22.475, lng: 88.108, address: 'Kulgachia, Uluberia-I',
    notes: '',
  },
  {
    name: 'Irrigation Check Dam', sector: 'Irrigation',
    level: 'Panchayat Samiti (Block)', block: 'Udaynarayanpur', gp: 'Udaynarayanpur', village: 'Pearapur',
    department: 'Irrigation & Waterways', fundName: 'MGNREGA (100 Days Work)', amount: 2300000,
    startDate: '2021-10-20', endDate: '2022-05-30',
    geometry: 'point', lat: 22.653, lng: 87.902, address: 'Damodar embankment, Udaynarayanpur',
    notes: 'Lift irrigation command area ~120 ha.',
  },
]
