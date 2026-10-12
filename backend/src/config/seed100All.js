import bcrypt from 'bcryptjs'
import { pool } from './database.js'

async function runSeed() {
  const client = await pool.connect()
  try {
    console.log('🚀 Starting Comprehensive 100-Record Database Seeder for ESB-TrackIT...')
    await client.query('BEGIN')

    // 0. Ensure Ticket Queues exist
    await client.query(`
      INSERT INTO ticket_queues (kode, nama, deskripsi) VALUES
        ('IT', 'IT Support', 'IT support, hardware, software, & network services'),
        ('HR', 'HR Support', 'Human Resources support & employee services'),
        ('GA', 'GA Support', 'General Affairs support, building & facilities')
      ON CONFLICT (kode) DO NOTHING;
    `)
    const queuesRes = await client.query(`SELECT id, kode FROM ticket_queues`)
    const queueMap = Object.fromEntries(queuesRes.rows.map(r => [r.kode, r.id]))

    // Password hash for all seeded users
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10)

    // 1. Superadmin User
    const superadminPermissions = JSON.stringify({
      dashboard: 'full',
      assets: 'full',
      assets_ga: 'full',
      assets_ops: 'full',
      my_assets: 'full',
      karyawan: 'full',
      tickets: 'full',
      submissions: 'full',
      shipments: 'full',
      users: 'full',
      knowledge_base: 'full',
      logs: 'full',
      export: 'full',
      database: 'full',
    })

    await client.query(`
      INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
      VALUES ($1, $2, $3, 'superadmin', $4::jsonb, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $3, permissions = $4::jsonb, role = 'superadmin', is_active = true
    `, ['Super Administrator', 'superadmin@admin.com', defaultPasswordHash, superadminPermissions])

    // 2. SEED KARYAWAN (100 Records)
    console.log('📦 Seeding 100 Karyawan (Employees)...')
    const firstNames = ['Budi', 'Siti', 'Agus', 'Dewi', 'Eko', 'Rina', 'Andi', 'Maya', 'Hendra', 'Nurul',
      'Rizky', 'Putri', 'Dimas', 'Lestari', 'Fajar', 'Anisa', 'Bayu', 'Ratna', 'Yoga', 'Dian',
      'Aditya', 'Wulandari', 'Arif', 'Kartika', 'Indra', 'Fitri', 'Bambang', 'Tri', 'Gunawan', 'Tari',
      'Reza', 'Sari', 'Gita', 'Wahyu', 'Novi', 'Rian', 'Mega', 'Doni', 'Siska', 'Farhan',
      'Aulia', 'Iqbal', 'Nadia', 'Bagas', 'Zahra', 'Kevin', 'Citra', 'Satria', 'Tiara', 'Ilham']
    const lastNames = ['Santoso', 'Pratama', 'Kusuma', 'Saputra', 'Wijaya', 'Setiawan', 'Hidayat', 'Nugroho',
      'Utomo', 'Wibowo', 'Firmansyah', 'Permana', 'Lestari', 'Suryono', 'Mahendra', 'Gunawan', 'Wardhana',
      'Kurniawan', 'Ramadhan', 'Anggraini', 'Susanto', 'Purnama', 'Budiman', 'Suhendra', 'Handayani']

    const departments = [
      { dept: 'Information Technology', dir: 'Technology Directorate', titles: ['Head of IT', 'Senior DevOps Engineer', 'Fullstack Developer', 'Frontend Engineer', 'Backend Engineer', 'IT Support Specialist', 'Network & Security Engineer', 'QA Automation Engineer', 'Database Administrator', 'System Administrator'] },
      { dept: 'Human Resources', dir: 'Human Capital Directorate', titles: ['HR Director', 'Talent Acquisition Manager', 'People Operations Specialist', 'HR Generalist', 'Training & Development Lead', 'Compensation & Benefits Specialist'] },
      { dept: 'General Affairs', dir: 'Finance & Admin Directorate', titles: ['GA Manager', 'Facility & Building Supervisor', 'Office Logistics Officer', 'Asset & Inventory Staff', 'Procurement Specialist'] },
      { dept: 'Operations & Outlet', dir: 'Operations Directorate', titles: ['Operations Director', 'Area Operations Manager', 'Store Manager', 'F&B Operations Supervisor', 'POS Support Officer', 'Field Quality Control'] },
      { dept: 'Finance & Accounting', dir: 'Finance & Admin Directorate', titles: ['Finance Controller', 'Senior Accounting Manager', 'Tax & Compliance Specialist', 'Treasury Officer', 'Internal Auditor', 'Payroll Specialist'] },
      { dept: 'Marketing & Growth', dir: 'Commercial Directorate', titles: ['Marketing Director', 'Brand Strategy Manager', 'Digital Marketing Lead', 'Content & Creative Specialist', 'Performance Marketer'] },
      { dept: 'Customer Support', dir: 'Operations Directorate', titles: ['Customer Care Head', 'Helpdesk Team Lead', 'Tier 2 Support Specialist', 'Customer Success Executive'] },
      { dept: 'Product & Design', dir: 'Technology Directorate', titles: ['VP of Product', 'Lead Product Manager', 'Senior UI/UX Designer', 'Product Owner', 'UX Researcher'] },
    ]

    const locations = ['HQ Jakarta', 'HQ Jakarta Lantai 2', 'HQ Jakarta Lantai 3', 'HQ Jakarta Lantai 4', 'Branch Surabaya', 'Branch Bandung', 'Branch Medan', 'Branch Bali', 'Warehouse Cikarang', 'Hub Tangerang']
    const empStatuses = ['Permanent', 'Permanent', 'Permanent', 'Contract', 'Contract', 'Intern']

    const employeeDataList = []
    let empIndex = 1

    // Seed top leadership first (for atasan links)
    const leaders = [
      { nik: 'EMP-001', name: 'Budi Santoso', title: 'Chief Technology Officer', level: 'L7', dept: 'Information Technology', dir: 'Technology Directorate', email: 'budi.santoso@esb.co.id', loc: 'HQ Jakarta', atasan: null },
      { nik: 'EMP-002', name: 'Dewi Lestari', title: 'Chief Operations Officer', level: 'L7', dept: 'Operations & Outlet', dir: 'Operations Directorate', email: 'dewi.lestari@esb.co.id', loc: 'HQ Jakarta', atasan: null },
      { nik: 'EMP-003', name: 'Hendra Wijaya', title: 'VP of Finance & Administration', level: 'L6', dept: 'Finance & Accounting', dir: 'Finance & Admin Directorate', email: 'hendra.wijaya@esb.co.id', loc: 'HQ Jakarta', atasan: null },
      { nik: 'EMP-004', name: 'Siti Nurhaliza', title: 'VP of Human Capital', level: 'L6', dept: 'Human Resources', dir: 'Human Capital Directorate', email: 'siti.nurhaliza@esb.co.id', loc: 'HQ Jakarta', atasan: null },
      { nik: 'EMP-005', name: 'Rizky Pratama', title: 'Head of IT Infrastructure & Assets', level: 'L5', dept: 'Information Technology', dir: 'Technology Directorate', email: 'rizky.pratama@esb.co.id', loc: 'HQ Jakarta', atasan: 'EMP-001' },
      { nik: 'EMP-006', name: 'Agus Setiawan', title: 'General Affairs Manager', level: 'L5', dept: 'General Affairs', dir: 'Finance & Admin Directorate', email: 'agus.setiawan@esb.co.id', loc: 'HQ Jakarta', atasan: 'EMP-003' },
      { nik: 'EMP-007', name: 'Maya Anggraini', title: 'IT Helpdesk & Support Lead', level: 'L4', dept: 'Information Technology', dir: 'Technology Directorate', email: 'maya.anggraini@esb.co.id', loc: 'HQ Jakarta', atasan: 'EMP-005' },
      { nik: 'EMP-008', name: 'Fajar Hidayat', title: 'Operations Area Manager Jabodetabek', level: 'L5', dept: 'Operations & Outlet', dir: 'Operations Directorate', email: 'fajar.hidayat@esb.co.id', loc: 'HQ Jakarta', atasan: 'EMP-002' },
      { nik: 'EMP-009', name: 'Anisa Putri', title: 'Talent Acquisition & People Lead', level: 'L4', dept: 'Human Resources', dir: 'Human Capital Directorate', email: 'anisa.putri@esb.co.id', loc: 'HQ Jakarta', atasan: 'EMP-004' },
      { nik: 'EMP-010', name: 'Dimas Nugroho', title: 'Lead Fullstack Software Engineer', level: 'L4', dept: 'Information Technology', dir: 'Technology Directorate', email: 'dimas.nugroho@esb.co.id', loc: 'HQ Jakarta', atasan: 'EMP-001' },
    ]

    for (const l of leaders) {
      employeeDataList.push({
        nik: l.nik,
        nama_karyawan: l.name,
        status: 'Active',
        title: l.title,
        job_level: l.level,
        departemen: l.dept,
        directorate: l.dir,
        tanggal_mulai_bekerja: '2020-01-15',
        employeement_status: 'Permanent',
        nik_atasan_langsung: l.atasan,
        email_kantor: l.email,
        lokasi_kerja: l.loc,
      })
      empIndex++
    }

    // Generate remaining 90 employees
    const leaderNiks = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006', 'EMP-007', 'EMP-008', 'EMP-009', 'EMP-010']
    for (let i = 11; i <= 100; i++) {
      const fn = firstNames[(i * 7) % firstNames.length]
      const ln = lastNames[(i * 13) % lastNames.length]
      const fullName = `${fn} ${ln}`
      const nik = `EMP-${String(i).padStart(3, '0')}`
      const deptObj = departments[i % departments.length]
      const title = deptObj.titles[i % deptObj.titles.length]
      const level = i % 10 === 0 ? 'L4' : i % 5 === 0 ? 'L3' : 'L2'
      const loc = locations[i % locations.length]
      const empStat = empStatuses[i % empStatuses.length]
      const year = 2021 + (i % 5)
      const month = String(1 + (i % 12)).padStart(2, '0')
      const day = String(1 + (i % 28)).padStart(2, '0')
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i > 40 ? i : ''}@esb.co.id`
      const atasan = leaderNiks[i % leaderNiks.length]
      const status = i === 95 || i === 98 ? 'Resigned' : i % 17 === 0 ? 'Outsource' : 'Active'

      employeeDataList.push({
        nik,
        nama_karyawan: fullName,
        status,
        title,
        job_level: level,
        departemen: deptObj.dept,
        directorate: deptObj.dir,
        tanggal_mulai_bekerja: `${year}-${month}-${day}`,
        employeement_status: empStat,
        nik_atasan_langsung: atasan,
        email_kantor: email,
        lokasi_kerja: loc,
      })
    }

    for (const emp of employeeDataList) {
      await client.query(`
        INSERT INTO karyawan (
          nik, nama_karyawan, status, title, job_level, departemen, directorate,
          tanggal_mulai_bekerja, employeement_status, nik_atasan_langsung, email_kantor, lokasi_kerja
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (nik) DO UPDATE SET
          nama_karyawan = EXCLUDED.nama_karyawan,
          status = EXCLUDED.status,
          title = EXCLUDED.title,
          job_level = EXCLUDED.job_level,
          departemen = EXCLUDED.departemen,
          directorate = EXCLUDED.directorate,
          tanggal_mulai_bekerja = EXCLUDED.tanggal_mulai_bekerja,
          employeement_status = EXCLUDED.employeement_status,
          nik_atasan_langsung = EXCLUDED.nik_atasan_langsung,
          email_kantor = EXCLUDED.email_kantor,
          lokasi_kerja = EXCLUDED.lokasi_kerja;
      `, [
        emp.nik, emp.nama_karyawan, emp.status, emp.title, emp.job_level, emp.departemen, emp.directorate,
        emp.tanggal_mulai_bekerja, emp.employeement_status, emp.nik_atasan_langsung, emp.email_kantor, emp.lokasi_kerja
      ])
    }

    // 3. SEED USERS (100 Users linked to Karyawan)
    console.log('👤 Seeding 100 Users...')
    const defaultUserPermissions = JSON.stringify({
      dashboard: 'read_only',
      assets: 'read_only',
      assets_ga: 'read_only',
      assets_ops: 'read_only',
      my_assets: 'full',
      karyawan: 'read_only',
      tickets: 'full',
      submissions: 'full',
      shipments: 'read_only',
      knowledge_base: 'read_only',
      logs: 'none',
      users: 'none',
      export: 'none',
      database: 'none',
    })

    const adminPermissions = JSON.stringify({
      dashboard: 'full',
      assets: 'full',
      assets_ga: 'full',
      assets_ops: 'full',
      my_assets: 'full',
      karyawan: 'full',
      tickets: 'full',
      submissions: 'full',
      shipments: 'full',
      knowledge_base: 'full',
      logs: 'full',
      users: 'full',
      export: 'full',
      database: 'none',
    })

    const createdUsers = []
    for (let i = 0; i < employeeDataList.length; i++) {
      const emp = employeeDataList[i]
      const isAdmin = i === 4 || i === 5 || i === 6 || i === 7 // IT Lead, GA Mgr, IT Helpdesk Lead, Ops Area Mgr
      const role = isAdmin ? 'admin' : 'user'
      const perms = isAdmin ? adminPermissions : defaultUserPermissions
      const isActive = emp.status !== 'Resigned'

      const userRes = await client.query(`
        INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        ON CONFLICT (email) DO UPDATE SET
          nama = EXCLUDED.nama,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          is_active = EXCLUDED.is_active
        RETURNING id, nama, email, role;
      `, [emp.nama_karyawan, emp.email_kantor, defaultPasswordHash, role, perms, isActive])

      createdUsers.push(userRes.rows[0])
    }

    // Get all users for referencing in tickets, submissions, logs
    const allUsersRes = await client.query(`SELECT id, nama, email, role FROM users WHERE is_active = true`)
    const activeUsers = allUsersRes.rows
    const adminUsers = activeUsers.filter(u => u.role === 'admin' || u.role === 'superadmin')
    const primaryAdmin = adminUsers[0] || activeUsers[0]

    // 4. SEED ASET TI (100 Records)
    console.log('💻 Seeding 100 Aset TI (IT Assets)...')
    const laptopModels = [
      { brand: 'Apple', model: 'MacBook Pro 14" M3 Pro', type: 'Laptop', spec: 'Apple M3 Pro (11-Core CPU, 14-Core GPU), 18GB Unified Memory, 512GB SSD, Liquid Retina XDR, macOS Sonoma' },
      { brand: 'Apple', model: 'MacBook Air 15" M2', type: 'Laptop', spec: 'Apple M2 8-Core CPU, 16GB RAM, 512GB SSD, Liquid Retina Display, macOS Sonoma' },
      { brand: 'Lenovo', model: 'ThinkPad T14 Gen 4', type: 'Laptop', spec: 'Intel Core i7-1365U, 32GB DDR5 RAM, 1TB SSD NVMe PCIe 4.0, 14" WUXGA IPS, Windows 11 Pro' },
      { brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 11', type: 'Laptop', spec: 'Intel Core i7-1370P, 32GB LPDDR5, 1TB SSD, 14" 2.8K OLED, Windows 11 Pro' },
      { brand: 'Dell', model: 'Latitude 5440', type: 'Laptop', spec: 'Intel Core i5-1345U, 16GB DDR5, 512GB SSD NVMe, 14" FHD Anti-Glare, Windows 11 Pro' },
      { brand: 'Dell', model: 'Precision 3581 Workstation', type: 'Laptop', spec: 'Intel Core i9-13900H, 64GB DDR5, 2TB SSD, NVIDIA RTX 2000 Ada 8GB, Windows 11 Pro' },
      { brand: 'ASUS', model: 'ExpertBook B9 B9400', type: 'Laptop', spec: 'Intel Core i7-1255U, 16GB LPDDR5, 1TB SSD NVMe, 14" FHD IPS 400nits, Windows 11 Pro' },
      { brand: 'HP', model: 'EliteBook 840 G10', type: 'Laptop', spec: 'Intel Core i7-1360P, 32GB DDR5, 1TB SSD NVMe, 14" WUXGA IPS, Windows 11 Pro' },
      { brand: 'Dell', model: 'OptiPlex 7010 Micro Desktop', type: 'Desktop PC', spec: 'Intel Core i7-13700T, 32GB DDR5, 1TB SSD, Intel UHD 770, Dual DP, Windows 11 Pro' },
      { brand: 'Apple', model: 'Mac Studio M2 Max', type: 'Workstation', spec: 'Apple M2 Max 12-Core CPU, 32GB Unified Memory, 1TB SSD, macOS Sonoma' },
      { brand: 'Dell', model: 'UltraSharp U2723QE 27" 4K', type: 'Monitor', spec: '27-inch IPS Black 4K UHD (3840x2160), USB-C Hub 90W PD, RJ45, HDR400' },
      { brand: 'Dell', model: 'PowerEdge R750 Server', type: 'Server', spec: 'Dual Intel Xeon Gold 6330 (56 Cores), 256GB ECC DDR4, 4x 1.92TB NVMe SSD RAID10, Redundant PSU' },
      { brand: 'Cisco', model: 'Catalyst C9200L-48P-4X', type: 'Network Switch', spec: '48-Port PoE+ Gigabit, 4x 10G SFP+ Uplink, Cisco IOS XE Enterprise' },
      { brand: 'Fortinet', model: 'FortiGate 100F Next-Gen Firewall', type: 'Firewall', spec: '10x GE RJ45, 2x 10GE SFP+ slots, NGFW Throughput 1 Gbps, Threat Protection' }
    ]

    const itStatuses = ['In Use', 'In Use', 'In Use', 'In Use', 'Stock', 'In Service', 'Damaged', 'Disposal']
    const itConditions = ['Normal', 'Normal', 'Baru', 'Normal', 'Rusak Ringan', 'Rusak Sedang', 'Normal']

    for (let i = 1; i <= 100; i++) {
      const modelInfo = laptopModels[(i - 1) % laptopModels.length]
      const hostname = modelInfo.type === 'Laptop' ? `LAP-ESB-${String(i).padStart(3, '0')}`
        : modelInfo.type === 'Desktop PC' ? `PC-ESB-${String(i).padStart(3, '0')}`
        : modelInfo.type === 'Workstation' ? `WS-ESB-${String(i).padStart(3, '0')}`
        : modelInfo.type === 'Monitor' ? `MON-ESB-${String(i).padStart(3, '0')}`
        : modelInfo.type === 'Server' ? `SRV-ESB-${String(i).padStart(3, '0')}`
        : `NET-ESB-${String(i).padStart(3, '0')}`

      const serialNumber = `SN-${modelInfo.brand.toUpperCase().slice(0, 3)}-${2024000 + i}-${(i * 137) % 900 + 100}`
      const status = itStatuses[(i - 1) % itStatuses.length]
      const kondisi = itConditions[(i - 1) % itConditions.length]
      const emp = status === 'In Use' ? employeeDataList[(i - 1) % employeeDataList.length] : null

      const nikPemegang = emp ? emp.nik : null
      const namaPemegang = emp ? emp.nama_karyawan : null
      const deptPemegang = emp ? emp.departemen : null
      const lokasiAsset = emp ? emp.lokasi_kerja : 'Warehouse IT Central - HQ Lt. 1'
      const note = status === 'In Use' ? `Aset diserahkan untuk operasional ${emp ? emp.title : 'Staff'}`
        : status === 'Stock' ? 'Stok cadangan siap deploy'
        : status === 'In Service' ? 'Sedang perbaikan di service center resmi'
        : status === 'Damaged' ? 'Kondisi drop baterai / layar bergaris' : 'Jadwal penghapusan aset Q4'

      await client.query(`
        INSERT INTO aset_ti (
          hostname, serial_number, spesifikasi, nik_pemegang_asset, nama_karyawan_pemegang_asset,
          departemen_pemegang_asset, lokasi_asset, tipe_perangkat, brand_merek, model, status, kondisi, note_asset
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING;
      `, [
        hostname, serialNumber, modelInfo.spec, nikPemegang, namaPemegang,
        deptPemegang, lokasiAsset, modelInfo.type, modelInfo.brand, modelInfo.model, status, kondisi, note
      ])
    }

    // 5. SEED ASET GA (100 Records)
    console.log('🪑 Seeding 100 Aset GA (General Affairs)...')
    const gaTemplates = [
      { nama: 'Kursi Kerja Ergonomis Mesh', type: 'Furniture & Ergonomi', size: 'Standar Ergonomis', detail: 'Sandaran jaring breathable, lumbar support adjustable 3D, armrest 3D, hidrolik class 4' },
      { nama: 'Meja Kerja Staff Workstation 4 Seater', type: 'Furniture & Ergonomi', size: '240 x 120 x 75 cm', detail: 'Partisi kaca frosted 30cm, kabel grommet cable management tray, finishing melamine oak' },
      { nama: 'Smart TV Meeting Room 65" 4K UHD', type: 'Perlengkapan Ruang Rapat', size: '65 Inch', detail: 'Samsung 4K UHD Smart Signage TV dengan wall mount bracket & HDMI switcher 4K' },
      { nama: 'Video Conference All-in-One Bar', type: 'Perlengkapan Ruang Rapat', size: 'Soundbar Form Factor', detail: 'Logitech Rally Bar dengan 4K Optical PTZ Camera, AI Viewfinder, beamforming mic array' },
      { nama: 'AC Split Wall Inverter 2 PK', type: 'Elektronik & HVAC', size: '2 PK (18.000 BTU)', detail: 'Daikin Premium Inverter R32, mode hening 19dB, hemat daya listrik 4 bintang' },
      { nama: 'AC Standing Floor Inverter 5 PK', type: 'Elektronik & HVAC', size: '5 PK (45.000 BTU)', detail: 'Panasonic Standing Inverter 3 Phase untuk area open space aula meeting lantai 5' },
      { nama: 'Water Purifier & Dispenser RO', type: 'Fasilitas Pantry', size: 'Standing Dispenser', detail: 'Coway Neo Plus Hot-Cold-Ambient, reverse osmosis filtration 4-stage' },
      { nama: 'Mesin Kopi Espresso Otomatis Bean-to-Cup', type: 'Fasilitas Pantry', size: 'Countertop', detail: 'Delonghi Magnifica S Smart, 15 bar pump, built-in conical burr grinder' },
      { nama: 'Whiteboard Magnetik Kaca Glassboard', type: 'Perlengkapan Kantor', size: '120 x 240 cm', detail: 'Tempered glassboard 6mm frameless magnetic, tray spidol aluminium powder coating' },
      { nama: 'Locker Karyawan Besi 12 Pintu', type: 'Penyimpanan & Keamanan', size: '180 x 90 x 45 cm', detail: 'Lion Steel Locker 12 pintu dengan kunci master dan slot ventilasi udara' },
      { nama: 'Sofa Tamu Executive 3-Seater', type: 'Furniture & Ergonomi', size: '210 x 85 x 80 cm', detail: 'Genuine leatherette upholstery, busa high density royal foam, rangka kayu mahoni solid' },
      { nama: 'Filing Cabinet 4 Laci Tahan Api', type: 'Penyimpanan & Keamanan', size: '140 x 48 x 65 cm', detail: 'VIP Steel Filing Cabinet 4 laci dengan central lock dan rel bearing heavy duty' },
      { nama: 'Brankas Dokumen Tahan Api 2 Jam', type: 'Penyimpanan & Keamanan', size: '75 x 55 x 50 cm', detail: 'Chubb Safes Fire Protection UL Class 350-2 Jam, digital keypad plus manual key' },
      { nama: 'Proyektor Laser High-Lumen WUXGA', type: 'Perlengkapan Ruang Rapat', size: 'Compact Laser Body', detail: 'Epson EB-L520U Laser Projector 5,200 Lumens WUXGA 1920x1200 dengan motorized screen 120"' }
    ]

    const gaLocations = [
      { loc: 'HQ Jakarta Lantai 1', detail: 'Lobby Utama & Receptionist' },
      { loc: 'HQ Jakarta Lantai 2', detail: 'Open Space Engineering & Product' },
      { loc: 'HQ Jakarta Lantai 3', detail: 'Finance, HR, & Legal Department' },
      { loc: 'HQ Jakarta Lantai 4', detail: 'Executive Boardroom & Director Office' },
      { loc: 'HQ Jakarta Lantai 5', detail: 'Townhall Multi-Purpose Hall & Cafeteria' },
      { loc: 'Branch Surabaya', detail: 'Area Office Graha Pena Lantai 8' },
      { loc: 'Branch Bandung', detail: 'Office Dago Heritage Lantai 2' },
      { loc: 'Warehouse Cikarang', detail: 'Gudang Logistik Blok B' }
    ]

    const gaConditions = ['Baik', 'Baik', 'Baik', 'Baik', 'Rusak Ringan', 'Baik', 'Rusak Sedang']

    for (let i = 1; i <= 100; i++) {
      const tpl = gaTemplates[(i - 1) % gaTemplates.length]
      const locObj = gaLocations[(i - 1) % gaLocations.length]
      const hostname = `GA-ESB-${String(i).padStart(3, '0')}`
      const quantity = (i % 8 === 0) ? 12 : (i % 4 === 0) ? 4 : (i % 3 === 0) ? 2 : 1
      const kondisi = gaConditions[(i - 1) % gaConditions.length]

      await client.query(`
        INSERT INTO aset_ga (
          hostname, quantity, tipe_fasilitas, nama_asset, ukuran, detail, lokasi, lokasi_detail, kondisi
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (hostname) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          tipe_fasilitas = EXCLUDED.tipe_fasilitas,
          nama_asset = EXCLUDED.nama_asset,
          ukuran = EXCLUDED.ukuran,
          detail = EXCLUDED.detail,
          lokasi = EXCLUDED.lokasi,
          lokasi_detail = EXCLUDED.lokasi_detail,
          kondisi = EXCLUDED.kondisi;
      `, [
        hostname, quantity, tpl.type, `${tpl.nama} #${i}`, tpl.size, tpl.detail, locObj.loc, locObj.detail, kondisi
      ])
    }

    // 6. SEED ASET OPS (100 Records)
    console.log('🛒 Seeding 100 Aset OPS (Operational Assets)...')
    const opsTemplates = [
      { nama: 'ESB POS All-in-One Dual Display 15.6"', kategori: 'POS Terminal Hardware', amount: 12500000 },
      { nama: 'Sunmi T2s Desktop POS Android with Printer', kategori: 'POS Terminal Hardware', amount: 9800000 },
      { nama: 'Kitchen Display System (KDS) Touch 21.5"', kategori: 'KDS Hardware', amount: 8750000 },
      { nama: 'Thermal Receipt Printer Auto-Cutter USB+LAN', kategori: 'Thermal Printer', amount: 2450000 },
      { nama: 'Kitchen Impact Dot-Matrix Ticket Printer', kategori: 'Kitchen Printer', amount: 3200000 },
      { nama: 'Maken Heavy Duty RJ11 Cash Drawer 5B8C', kategori: 'Cash Drawer', amount: 1150000 },
      { nama: 'Honeywell 2D QR Barcode Scanner with Stand', kategori: 'Scanner & Input', amount: 1850000 },
      { nama: 'Zebra ZD230 Desktop Barcode & Label Printer', kategori: 'Label Printer', amount: 3600000 },
      { nama: 'Samsung Galaxy Tab A9 Waiter Tablet Ordering', kategori: 'Waiter Tablet', amount: 3400000 },
      { nama: 'Newland Rugged Handheld Terminal Scanner Android', kategori: 'Handheld Mobile Computer', amount: 7900000 },
      { nama: 'Ingenico Move 2500 EDC Mobile 4G', kategori: 'EDC Payment Terminal', amount: 4500000 },
      { nama: 'Cisco Meraki Go Wi-Fi 6 Cloud Access Point Ops', kategori: 'Network Device Ops', amount: 3850000 },
      { nama: 'APC Smart-UPS 1500VA LCD 230V for POS Station', kategori: 'Power & Backup', amount: 6200000 },
      { nama: 'ESB Kiosk Self-Ordering Totem 32" Touchscreen', kategori: 'Self-Ordering Kiosk', amount: 28500000 }
    ]

    const opsLocations = [
      'Store Grand Indonesia - East Mall Lt. 3A',
      'Store Central Park Mall - Tribeca Park Lt. GF',
      'Store Senayan City - Food Avenue Lt. 5',
      'Store Pondok Indah Mall 3 - Main Dining Lt. 2',
      'Store Kota Kasablanka - Food Society Lt. UG',
      'Store Summarecon Mall Serpong - Downtown Walk',
      'Store Paris Van Java Bandung - Resort Level',
      'Store Tunjungan Plaza 6 Surabaya - Lt. 4',
      'Store Pakuwon Mall Surabaya - Food Society',
      'Store Beachwalk Shopping Center Bali - Lt. 2',
      'Central Kitchen Bekasi - Gudang Sentral',
      'Warehouse Cikarang Hub Logistik Ops'
    ]

    const opsStatuses = ['Aktif', 'Aktif', 'Aktif', 'Aktif', 'Maintenance', 'Aktif', 'Tidak Aktif', 'Rusak']
    const opsConditions = ['Baik', 'Baik', 'Baik', 'Rusak Ringan', 'Baik', 'Rusak Sedang', 'Baik']

    for (let i = 1; i <= 100; i++) {
      const tpl = opsTemplates[(i - 1) % opsTemplates.length]
      const loc = opsLocations[(i - 1) % opsLocations.length]
      const hostname = `OPS-ESB-${String(i).padStart(3, '0')}`
      const status = opsStatuses[(i - 1) % opsStatuses.length]
      const kondisi = opsConditions[(i - 1) % opsConditions.length]
      const picEmp = employeeDataList[(i * 3) % employeeDataList.length]
      const buyYear = 2022 + (i % 4)
      const buyMonth = String(1 + (i % 12)).padStart(2, '0')
      const buyDay = String(1 + (i % 28)).padStart(2, '0')

      await client.query(`
        INSERT INTO aset_ops (
          hostname, nama_asset, kategori, lokasi, pic, tanggal_beli, total_asset_amount, kondisi, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (hostname) DO UPDATE SET
          nama_asset = EXCLUDED.nama_asset,
          kategori = EXCLUDED.kategori,
          lokasi = EXCLUDED.lokasi,
          pic = EXCLUDED.pic,
          tanggal_beli = EXCLUDED.tanggal_beli,
          total_asset_amount = EXCLUDED.total_asset_amount,
          kondisi = EXCLUDED.kondisi,
          status = EXCLUDED.status;
      `, [
        hostname, `${tpl.nama} #${i}`, tpl.kategori, loc, picEmp.nama_karyawan,
        `${buyYear}-${buyMonth}-${buyDay}`, tpl.amount, kondisi, status
      ])
    }

    // 7. SEED TICKETS (100 Records with Comments & History)
    console.log('🎫 Seeding 100 Tickets (Helpdesk)...')
    const ticketSubjects = [
      { title: 'Permintaan Penambahan RAM 16GB ke 32GB untuk Kompilasi Build', cat: 'Hardware IT', prio: 'Medium', q: 'IT' },
      { title: 'Koneksi VPN Kantor Sering Putus Saat WFH', cat: 'Jaringan & Internet', prio: 'High', q: 'IT' },
      { title: 'Printer GA Lantai 2 Paper Jam dan Tinta Menggumpal', cat: 'Fasilitas & Gedung GA', prio: 'Medium', q: 'GA' },
      { title: 'Permintaan Keyboard Mekanikal & Mouse Wireless Logistik', cat: 'Perlengkapan Kantor', prio: 'Low', q: 'GA' },
      { title: 'Akses Email Outlook Web & Thunderbird Error SSL Handshake', cat: 'Akun & Akses', prio: 'High', q: 'IT' },
      { title: 'Layar Monitor Dell 27" Mengalami Flickering Garis Hijau', cat: 'Hardware IT', prio: 'Medium', q: 'IT' },
      { title: 'Pengajuan Surat Keterangan Kerja untuk Pengajuan KPR Bank', cat: 'Layanan HR', prio: 'Low', q: 'HR' },
      { title: 'AC Ruang Meeting Boardroom Lantai 4 Mengeluarkan Air Bocor', cat: 'Fasilitas & Gedung GA', prio: 'Critical', q: 'GA' },
      { title: 'Permintaan Setup Akun Google Workspace & Slack Karyawan Baru', cat: 'Akun & Akses', prio: 'High', q: 'IT' },
      { title: 'Klaim Asuransi Rawat Jalan Reimbursement Belum Masuk Rekening', cat: 'Layanan HR', prio: 'Medium', q: 'HR' },
      { title: 'Perbaikan Mesin Kasir POS Thermal Receipt Macet di Outlet PIM', cat: 'Operasional POS', prio: 'Critical', q: 'IT' },
      { title: 'Permintaan Lisensi JetBrains All Products Pack Software Engineer', cat: 'Software & OS', prio: 'Medium', q: 'IT' },
      { title: 'Kursi Kerja Staff Hidrolik Turun Sendiri dan Bunyi Berderit', cat: 'Perlengkapan Kantor', prio: 'Low', q: 'GA' },
      { title: 'Pembaruan Data NPWP dan Status Pajak PTKP di Portal HR', cat: 'Layanan HR', prio: 'Low', q: 'HR' },
      { title: 'SSID Wi-Fi Lantai 3 Tidak Bisa Terhubung / Full IP Pool', cat: 'Jaringan & Internet', prio: 'Critical', q: 'IT' }
    ]

    const ticketStatuses = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Open', 'In Progress', 'Resolved', 'Closed']

    for (let i = 1; i <= 100; i++) {
      const tpl = ticketSubjects[(i - 1) % ticketSubjects.length]
      const ticketNum = `TCK-2026-${String(i).padStart(4, '0')}`
      const status = ticketStatuses[(i - 1) % ticketStatuses.length]
      const reporterUser = activeUsers[(i * 3) % activeUsers.length]
      const assigneeUser = (status !== 'Open') ? (adminUsers[i % adminUsers.length] || primaryAdmin) : null
      const queueId = queueMap[tpl.q] || queueMap['IT']
      const isResolved = status === 'Resolved' || status === 'Closed'
      const resolvedAt = isResolved ? new Date(Date.now() - (100 - i) * 3600000) : null
      const resolvedBy = isResolved ? (assigneeUser ? assigneeUser.id : primaryAdmin.id) : null

      const ticketInsert = await client.query(`
        INSERT INTO tickets (
          nomor_tiket, judul, deskripsi, kategori, prioritas, status_tiket, queue_id,
          assigned_to_user_id, pelapor_user_id, attachment_count, resolved_at, resolved_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (nomor_tiket) DO UPDATE SET
          judul = EXCLUDED.judul,
          deskripsi = EXCLUDED.deskripsi,
          kategori = EXCLUDED.kategori,
          prioritas = EXCLUDED.prioritas,
          status_tiket = EXCLUDED.status_tiket,
          queue_id = EXCLUDED.queue_id,
          assigned_to_user_id = EXCLUDED.assigned_to_user_id,
          pelapor_user_id = EXCLUDED.pelapor_user_id,
          resolved_at = EXCLUDED.resolved_at,
          resolved_by_user_id = EXCLUDED.resolved_by_user_id
        RETURNING id;
      `, [
        ticketNum,
        `${tpl.title} (${i})`,
        `Detail kendala: Mohon bantuan tim ${tpl.q} terkait kendala "${tpl.title}". Masalah terjadi sejak pagi dan menghambat alur kerja tim terkait. Terima kasih.`,
        tpl.cat,
        tpl.prio,
        status,
        queueId,
        assigneeUser ? assigneeUser.id : null,
        reporterUser.id,
        (i % 3 === 0) ? 1 : 0,
        resolvedAt,
        resolvedBy
      ])

      const ticketId = ticketInsert.rows[0].id

      // Add comments if in progress or resolved
      if (status !== 'Open') {
        await client.query(`
          INSERT INTO komentar_tiket (id_tiket, pesan, user_id)
          VALUES ($1, $2, $3)
        `, [
          ticketId,
          `Halo @${reporterUser.nama}, laporan Anda telah diterima oleh tim ${tpl.q}. Sedang kami proses dan investigasi lebih lanjut.`,
          assigneeUser ? assigneeUser.id : primaryAdmin.id
        ])
      }

      if (isResolved) {
        await client.query(`
          INSERT INTO komentar_tiket (id_tiket, pesan, user_id)
          VALUES ($1, $2, $3)
        `, [
          ticketId,
          `Tiket #${ticketNum} telah berhasil diselesaikan dengan baik. Solusi dan tindakan telah diverifikasi oleh tim penanganan.`,
          resolvedBy
        ])

        // Add CASP rating
        const ratingScore = 4 + (i % 2) // 4 or 5
        await client.query(`
          INSERT INTO ticket_casp_ratings (id_tiket, reporter_user_id, assignee_user_id, rating_score, feedback)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id_tiket) DO NOTHING;
        `, [
          ticketId,
          reporterUser.id,
          assigneeUser ? assigneeUser.id : primaryAdmin.id,
          ratingScore,
          'Penanganan cepat dan komunikasi sangat ramah serta solutif!'
        ])
      }
    }

    // 8. SEED SHIPMENTS (100 Records)
    console.log('🚚 Seeding 100 Shipments (Pengiriman Aset)...')
    const couriers = ['JNE Express', 'SiCepat Reguler', 'DHL Express', 'GrabExpress Instant', 'Anteraja Sameday', 'J&T Cargo']
    const shipmentStatuses = ['Menunggu Pickup', 'Di Pickup', 'Dalam Pengiriman', 'Terkirim', 'Terkirim', 'Menunggu Pickup', 'Dalam Pengiriman', 'Terkirim', 'Dibatalkan']
    const destinations = [
      'Store Grand Indonesia, West Mall Lt. 3A, Jl. M.H. Thamrin No. 1, Jakarta Pusat',
      'Store Paris Van Java, Jl. Sukajadi No. 131-139, Cipedes, Sukajadi, Bandung 40162',
      'Store Tunjungan Plaza 6, Jl. Embong Malang No. 21-31, Kedungdoro, Tegalsari, Surabaya 60261',
      'Branch Office Medan, Graha Merah Putih Lt. 6, Jl. Putri Hijau No. 1, Medan 20111',
      'Warehouse Logistik Hub Cikarang, Kawasan Industri Jababeka V Blok C-12, Bekasi 17530',
      'Store Beachwalk Bali, Jl. Pantai Kuta, Kuta, Kabupaten Badung, Bali 80361',
      'Store Mall Ratu Indah Makassar, Jl. Dr. Ratulangi No. 35, Mamajang, Makassar 90132',
      'Store Pollux Mall Paragon Semarang, Jl. Pemuda No. 118, Sekayu, Semarang Tengah 50132'
    ]

    for (let i = 1; i <= 100; i++) {
      const courier = couriers[(i - 1) % couriers.length]
      const status = shipmentStatuses[(i - 1) % shipmentStatuses.length]
      const dest = destinations[(i - 1) % destinations.length]
      const awb = `AWB-${courier.slice(0, 3).toUpperCase()}-${20260000 + i}`
      const reqDate = `2026-0${1 + (i % 9)}-${String(1 + (i % 28)).padStart(2, '0')}`
      const recipientEmp = employeeDataList[(i * 5) % employeeDataList.length]
      const senderEmp = employeeDataList[(i * 2) % employeeDataList.length]
      const itemDesc = `Pengiriman Perangkat IT & Perlengkapan Operasional Batch #${i}`
      const itemDetail = `1x Unit Laptop ${laptopModels[i % laptopModels.length].model}, 1x Charger 65W USB-C, 1x Mouse Wireless, 1x Kabel LAN Cat6 3m.`

      await client.query(`
        INSERT INTO asset_shipments (
          request_date, sender_name, sender_address, recipient_name, recipient_address, destination,
          item_description, item_detail, tracking_number, awb_number, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING;
      `, [
        reqDate,
        `${senderEmp.nama_karyawan} (IT Logistics)`,
        'HQ ESB-TrackIT, Gedung Graha Niaga Lantai 5, Jl. Jend. Sudirman Kav. 58, Jakarta Selatan 12190',
        recipientEmp.nama_karyawan,
        dest,
        dest,
        itemDesc,
        itemDetail,
        awb,
        awb,
        status,
        primaryAdmin.id
      ])
    }

    // 9. SEED SUBMISSIONS / BAST (100 Records)
    console.log('📄 Seeding 100 Asset Submissions (BAST)...')
    const submissionStatuses = ['submitted', 'completed', 'completed', 'draft', 'submitted', 'completed', 'cancelled']
    const submissionTujuan = ['baru', 'peminjaman', 'perbaikan', 'disposal', 'lainnya']

    for (let i = 1; i <= 100; i++) {
      const subNum = `BAST-2026-${String(i).padStart(4, '0')}`
      const status = submissionStatuses[(i - 1) % submissionStatuses.length]
      const tujuan = submissionTujuan[(i - 1) % submissionTujuan.length]
      const senderEmp = employeeDataList[4] // Rizky Pratama (IT Head)
      const recipientEmp = employeeDataList[(i * 7) % employeeDataList.length]
      const laptopModel = laptopModels[(i - 1) % laptopModels.length]

      const payload = {
        nomorSurat: subNum,
        tujuan,
        tanggal: `2026-0${1 + (i % 9)}-${String(1 + (i % 28)).padStart(2, '0')}`,
        lokasi: recipientEmp.lokasi_kerja || 'HQ Jakarta',
        pemberiNama: senderEmp.nama_karyawan,
        pemberiNik: senderEmp.nik,
        pemberiJabatan: senderEmp.title,
        pemberiDirektorat: senderEmp.directorate,
        penerimaNama: recipientEmp.nama_karyawan,
        penerimaNik: recipientEmp.nik,
        penerimaJabatan: recipientEmp.title,
        penerimaDirektorat: recipientEmp.directorate,
        items: [
          {
            jenis: laptopModel.type,
            brandModel: `${laptopModel.brand} ${laptopModel.model}`,
            serialNumber: `SN-${laptopModel.brand.toUpperCase().slice(0, 3)}-${2024000 + i}`,
            kelengkapan: 'Unit Laptop, Adaptor Charger 65W Original, Backpack Laptop Anti-Air',
            kondisi: 'Baik & Berfungsi Normal',
            keterangan: `Serah terima aset untuk penunjang pekerjaan ${recipientEmp.title}`
          }
        ],
        catatan: `Dokumen Berita Acara Serah Terima Aset nomor ${subNum} sah dan mengikat sesuai kebijakan internal perusahaan.`
      }

      await client.query(`
        INSERT INTO asset_submissions (
          submission_number, payload, status, created_by, updated_by
        ) VALUES ($1, $2::jsonb, $3, $4, $5)
        ON CONFLICT (submission_number) DO UPDATE SET
          payload = EXCLUDED.payload,
          status = EXCLUDED.status,
          updated_by = EXCLUDED.updated_by;
      `, [
        subNum,
        JSON.stringify(payload),
        status,
        primaryAdmin.id,
        primaryAdmin.id
      ])
    }

    // 10. SEED KB CATEGORIES (10 Categories)
    console.log('📚 Seeding KB Categories...')
    const kbCategoryList = [
      { key: 'hardware-laptop', title: 'Hardware & Laptop Kantor', desc: 'Panduan perawatan, spesifikasi, dan troubleshooting laptop kantor', icon: 'Laptop', sort: 1 },
      { key: 'network-vpn', title: 'Jaringan, Wi-Fi & VPN', desc: 'Koneksi internet kantor, VPN remote access, dan keamanan jaringan', icon: 'Wifi', sort: 2 },
      { key: 'account-access', title: 'Akun, Email & SSO', desc: 'Pengelolaan Google Workspace, Slack, reset password, dan 2FA', icon: 'Shield', sort: 3 },
      { key: 'software-tools', title: 'Software & Lisensi', desc: 'Instalasi aplikasi standar kantor, VPN client, dan lisensi software', icon: 'Layers', sort: 4 },
      { key: 'facility-ga', title: 'Fasilitas & Layanan GA', desc: 'Permintaan fasilitas ruang meeting, AC, printer, dan inventaris GA', icon: 'Home', sort: 5 },
      { key: 'pos-operations', title: 'Sistem POS & Operasional', desc: 'SOP kasir, printer kasir thermal, KDS, dan terminal EDC', icon: 'Smartphone', sort: 6 },
      { key: 'hr-policies', title: 'HR & Kebijakan Karyawan', desc: 'Klaim asuransi kesehatan, cuti, surat keterangan, dan benefit', icon: 'Users', sort: 7 },
      { key: 'security-compliance', title: 'Keamanan Informasi & Data', desc: 'Kebijakan privasi data, enkripsi disk, dan pencegahan phishing', icon: 'Lock', sort: 8 },
      { key: 'sop-onboarding', title: 'Panduan Onboarding Baru', desc: 'Langkah pertama setup laptop dan akses akun bagi karyawan baru', icon: 'Compass', sort: 9 },
      { key: 'emergency-dr', title: 'Troubleshooting Darurat', desc: 'Prosedur eskalasi insiden kritis dan disaster recovery sistem', icon: 'AlertTriangle', sort: 10 }
    ]

    for (const cat of kbCategoryList) {
      await client.query(`
        INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
        VALUES ($1, $2, $3, $4, true, $5, 'PUBLISHED')
        ON CONFLICT (key) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          is_featured = EXCLUDED.is_featured,
          sort_order = EXCLUDED.sort_order,
          status = EXCLUDED.status;
      `, [cat.key, cat.title, cat.desc, cat.icon, cat.sort])
    }

    // 11. SEED FAQ (100 Records)
    console.log('❓ Seeding 100 FAQ Records...')
    const faqCategories = ['Hardware IT', 'Jaringan & VPN', 'Email & Akun', 'Software Kantor', 'Fasilitas GA', 'Layanan HR', 'Operasional POS', 'Keamanan Sistem']
    for (let i = 1; i <= 100; i++) {
      const cat = faqCategories[(i - 1) % faqCategories.length]
      const qText = `[FAQ-${String(i).padStart(3, '0')}] Bagaimana prosedur dan solusi penanganan ${cat.toLowerCase()} nomor ${i}?`
      const aText = `Berikut adalah langkah-langkah panduan resmi perusahaan untuk menyelesaikan kendala terkait ${cat}:
1. Pastikan perangkat atau aplikasi terhubung dengan sumber daya dan jaringan yang stabil.
2. Lakukan restart aplikasi atau perangkat jika terjadi kendala sementara.
3. Hubungi tim helpdesk melalui tiket jika kendala masih berlanjut lebih dari 15 menit.`

      const steps = JSON.stringify([
        `Langkah 1: Periksa konfigurasi awal ${cat}`,
        `Langkah 2: Ikuti protokol standar perbaikan sesuai manual`,
        `Langkah 3: Konfirmasi pengujian fungsi normal`
      ])

      await client.query(`
        INSERT INTO faq (
          question, answer, category, status, sort_order, steps, is_emergency
        ) VALUES ($1, $2, $3, 'PUBLISHED', $4, $5::jsonb, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [
        qText, aText, cat, i, steps, (i % 25 === 0)
      ])
    }

    // 12. SEED CASES / KB ARTICLES (100 Records)
    console.log('📖 Seeding 100 Cases / Knowledge Base Playbooks...')
    const caseSeverities = ['low', 'medium', 'high']
    for (let i = 1; i <= 100; i++) {
      const cat = faqCategories[(i - 1) % faqCategories.length]
      const sev = caseSeverities[(i - 1) % caseSeverities.length]
      const title = `Playbook Penanganan Standar ${cat} — Kasus #${String(i).padStart(3, '0')}`
      const summary = `Dokumentasi lengkap panduan langkah teknis dan SOP investigasi insiden untuk kategori ${cat}.`
      const contentHtml = `<h3>Ringkasan Insiden & Konteks Teknis</h3>
<p>Dokumen panduan ini menjelaskan tindakan preventif dan kuratif saat terjadi gangguan pada sistem <strong>${cat}</strong>.</p>
<h4>Langkah-langkah Penanganan:</h4>
<ol>
  <li>Lakukan diagnosis awal kode error dan log sistem.</li>
  <li>Isolasi komponen yang terindikasi mengalami degradasi performa.</li>
  <li>Terapkan hotfix atau restore konfigurasi dari checkpoint terakhir.</li>
  <li>Lakukan verifikasi integritas data dan pastikan semua metrik latency normal.</li>
</ol>
<div class="alert alert-info">Pastikan mencatat setiap perubahan konfigurasi pada log audit internal.</div>`

      const tags = JSON.stringify([cat.toLowerCase().replace(/[^a-z0-9]/g, '-'), 'sop', 'playbook', `level-${sev.toLowerCase()}`])
      const actionSteps = JSON.stringify([
        { step: 1, title: 'Investigasi Gejala', detail: 'Periksa log aktivitas dan identifikasi error code.' },
        { step: 2, title: 'Eksekusi Solusi', detail: 'Jalankan prosedur remediasi sesuai standar keamanan.' },
        { step: 3, title: 'Validasi & Monitoring', detail: 'Pantau status selama 30 menit pasca-remediasi.' }
      ])
      const dos = JSON.stringify(['Gunakan kredensial resmi dengan hak akses terotentikasi', 'Buat backup sebelum melakukan perubahan parameter konfigurasi'])
      const donts = JSON.stringify(['Jangan membagikan password atau token API kepada pihak ketiga', 'Jangan melewatkan proses pencatatan audit log'])

      await client.query(`
        INSERT INTO cases (
          title, category, severity, tags, summary, content_html, action_steps, dos, donts, snippets, status, is_custom, sort_order
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, '[]'::jsonb, 'PUBLISHED', false, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [
        title, cat, sev, tags, summary, contentHtml, actionSteps, dos, donts, i
      ])
    }

    // 13. SEED AUDIT LOGS (100 Records)
    console.log('📜 Seeding 100 System Audit Logs & Login Logs...')
    for (let i = 1; i <= 100; i++) {
      const u = activeUsers[i % activeUsers.length]
      await client.query(`
        INSERT INTO log_audit_login (user_id, email, login_time, ip_address, user_agent, status_login)
        VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '${i * 2} hours', '192.168.1.${10 + (i % 200)}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0', 'LOGIN_SUCCESS')
      `, [u.id, u.email])

      await client.query(`
        INSERT INTO system_audit_logs (module, action, entity_type, entity_id, entity_label, summary, actor_user_id, actor_name, actor_email, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        i % 3 === 0 ? 'assets' : i % 2 === 0 ? 'tickets' : 'karyawan',
        i % 4 === 0 ? 'UPDATE' : i % 3 === 0 ? 'CREATE' : 'VIEW',
        i % 3 === 0 ? 'aset_ti' : i % 2 === 0 ? 'ticket' : 'karyawan',
        String(i),
        `Item #${i}`,
        `Aktivitas audit sistem untuk entitas #${i} oleh ${u.nama}`,
        u.id,
        u.nama,
        u.email,
        `192.168.1.${10 + (i % 200)}`,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0'
      ])
    }

    await client.query('COMMIT')
    console.log('✅ All 100-record datasets successfully seeded!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Seeder failed:', err)
    throw err
  } finally {
    client.release()
  }
}

runSeed().then(async () => {
  const counts = await pool.query(`
    SELECT
      (SELECT count(*) FROM karyawan) as karyawan_count,
      (SELECT count(*) FROM users) as users_count,
      (SELECT count(*) FROM aset_ti) as aset_ti_count,
      (SELECT count(*) FROM aset_ga) as aset_ga_count,
      (SELECT count(*) FROM aset_ops) as aset_ops_count,
      (SELECT count(*) FROM tickets) as tickets_count,
      (SELECT count(*) FROM asset_shipments) as shipments_count,
      (SELECT count(*) FROM asset_submissions) as submissions_count,
      (SELECT count(*) FROM faq) as faq_count,
      (SELECT count(*) FROM cases) as cases_count
  `)
  console.log('📊 DATABASE RECORD SUMMARY:', counts.rows[0])
  await pool.end()
  process.exit(0)
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
