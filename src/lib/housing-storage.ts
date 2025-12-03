// Utility untuk menyimpan dan mengambil data perumahan dari localStorage

export interface Housing {
  id: number
  name: string
  lat: number
  lng: number
  description: string
  totalUnits: number
  availableUnits: number
  priceRange: string
  image?: string
  facilities: string[]
  contactPerson: string
  phone: string
  email: string
}

const STORAGE_KEY = "housing_data"

export const getInitialHousingData = (): Housing[] => [
  {
    id: 1,
    name: "Perumahan Innara Residence 2",
    lat: 2.997136,
    lng: 99.065307,
    description: "JALAN SISINGAMANGARAJA no. 75 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Sitalasari, Bukit Sofa",
    totalUnits: 150,
    availableUnits: 45,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/mutiara.jpg",
    facilities: ["Taman", "Kolam Renang", "Lapangan Olahraga", "Keamanan 24 Jam"],
    contactPerson: "Budi Santoso",
    phone: "0821-1234-5678",
    email: "info@greenvalley.com",
  },
  {
    id: 2,
    name: "Perumahan Mutiara Abadi Residence",
    lat: 2.990070,
    lng: 99.093158,
    description: "Kelurahan sumber jaya kec.siantar martoba kota pematangsiantar no. 1 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Martoba, Sumber Jaya",
    totalUnits: 200,
    availableUnits: 78,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/mutiara.jpg",
    facilities: ["Masjid", "Taman Bermain", "Minimarket", "Jalan Raya"],
    contactPerson: "Siti Nurhaliza",
    phone: "0812-9876-5432",
    email: "sales@sinarindah.com",
  },
  {
    id: 3,
    name: "MOGAKOVI PERMATA",
    lat: 2.961727,
    lng: 99.053849,
    description: "JL. BATU PERMATA 6 no. 6 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Sitalasari, Bah Kapul",
    totalUnits: 120,
    availableUnits: 32,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/magakovii.jpg",
    facilities: ["Clubhouse", "Gym", "Tenis Court", "Gate House", "Taman Eksklusif"],
    contactPerson: "Ahmad Wijaya",
    phone: "0831-5555-6666",
    email: "premium@bukitsejahtera.com",
  },
  {
    id: 4,
    name: "SENAYAN FIVE STAR",
    lat: 3.011513,
    lng: 99.076415,
    description: "Jalan cipto no. 22 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Selatan, Simalungun",
    totalUnits: 300,
    availableUnits: 125,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/sfs.jpg",
    facilities: ["Taman", "Sekolah Terdekat", "Pasar", "Terminal"],
    contactPerson: "Dewi Lestari",
    phone: "0856-7777-8888",
    email: "info@majujaya.com",
  },
  {
    id: 5,
    name: "PERUMAHAN SUMBAWA MADANI",
    lat: 2.961946,
    lng: 99.054264,
    description: "Jl. Sibatu-batu Blok I no. 1 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Sitalasari, Bah Kapul",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/sumbawa.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id: 6,
    name: "PURI SETIA NEGARA",
    lat: 2.946931,
    lng: 99.037881,
    description: "Jalan Antara, Kelurahan Setia Negara, Kecamatan Siantar Sitalasari, Kota Pematang Siantar. no. - SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Sitalasari, Setia Negara",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/puri.jpeg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id: 7,
    name: "EVA REGENCY",
    lat: 3.008113,
    lng: 99.073257,
    description: "JL. ARTELERI no. 24 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Sitalasari, Bukit Sofa",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/eva.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id: 8,
    name: "GRIYA PRIMA LESTARI",
    lat: 2.980541,
    lng: 99.037384,
    description: "JLN. ARU no. 6 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Barat, Bantan",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/prima.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id:9,
    name: "GRIYA AL-FALAH IV",
    lat: 3.011792,
    lng: 99.096234,
    description: "Jalan Aru no. 6 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Barat, Bantan",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/al-falah.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
    {
    id:10,
    name: "RAB RESIDENCE VIYATA YUDHA",
    lat: 2.959112,
    lng: 99.034894,
    description: "Jalan Hj Ulakma Sinaga, Ruko Graha Harmoni no. 1 SUMATERA UTARA, KAB SIMALUNGUN, Siantar, Rambung Merah",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/viyata.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
    {
    id:11,
    name: "RAB RESIDENCE SIMPANG KERANG",
    lat: 2.984882,
    lng: 99.087295,
    description: "JL Sutomo Ruko Siantar Blok BC no. B17 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Timur, Pahlawan",
    totalUnits: 87,
    availableUnits: 87,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/kerang.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
      {
    id:12,
    name: "PERUMAHAN MUTIARA RINGROAD RESIDENCE",
    lat: 3.006688,
    lng: 99.078130,
    description: "Jln Medan outer Ringroad no. D-1 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Martoba, Tanjung Tongah",
    totalUnits: 64,
    availableUnits: 52,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/ringroad.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id:13,
    name: "MODERN LUXURY SUMBERJAYA",
    lat: 2.991784,
    lng: 99.089907,
    description: "JALAN SUMBER JAYA II, BLOK GADUNG no. - SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Martoba, Sumber Jaya",
    totalUnits: 76,
    availableUnits: 76,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/luxury.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id:14,
    name: "DIMENSI VIYATA",
    lat: 2.985247,
    lng: 99.089722,
    description: "Jalan Sangnawaluh no. 5 B SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Timur, Siopat Suhu",
    totalUnits: 76,
    availableUnits: 76,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/dimensi.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  {
    id:15,
    name: "GRAHA ASIDO 7 TAHAP II",
    lat: 3.011792,
    lng: 99.096234,
    description: "JL. COKLAT RAYA no. 18 SUMATERA UTARA, KOTA PEMATANGSIANTAR, Siantar Martoba, Sumber Jaya",
    totalUnits: 76,
    availableUnits: 76,
    priceRange: "Rp 166.000.000",
    image: "/kpr-assets/asido.jpg",
    facilities: ["Taman Komunitas", "Ruang Serbaguna", "Perpustakaan", "Jogging Track"],
    contactPerson: "Roni Handoko",
    phone: "0821-2222-3333",
    email: "contact@harmonisent.com",
  },
  
]

export const loadHousingData = (): Housing[] => {
  if (typeof window === "undefined") {
    return getInitialHousingData()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Error loading housing data from localStorage:", error)
  }

  return getInitialHousingData()
}

export const saveHousingData = (data: Housing[]): void => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving housing data to localStorage:", error)
  }
}

export const resetHousingData = (): Housing[] => {
  const initial = getInitialHousingData()
  saveHousingData(initial)
  return initial
}
