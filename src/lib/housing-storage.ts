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
    name: "Perumahan Green Valley",
    lat: 2.7258,
    lng: 99.1721,
    description: "Perumahan modern dengan fasilitas lengkap",
    totalUnits: 150,
    availableUnits: 45,
    priceRange: "250 - 400 juta",
    image: "/modern-house.jpg",
    facilities: ["Taman", "Kolam Renang", "Lapangan Olahraga", "Keamanan 24 Jam"],
    contactPerson: "Budi Santoso",
    phone: "0821-1234-5678",
    email: "info@greenvalley.com",
  },
  {
    id: 2,
    name: "Perumahan Sinar Indah",
    lat: 2.715,
    lng: 99.1645,
    description: "Hunian nyaman dengan lokasi strategis",
    totalUnits: 200,
    availableUnits: 78,
    priceRange: "180 - 350 juta",
    image: "/residential-area.jpg",
    facilities: ["Masjid", "Taman Bermain", "Minimarket", "Jalan Raya"],
    contactPerson: "Siti Nurhaliza",
    phone: "0812-9876-5432",
    email: "sales@sinarindah.com",
  },
  {
    id: 3,
    name: "Perumahan Bukit Sejahtera",
    lat: 2.735,
    lng: 99.18,
    description: "Perumahan premium dengan pemandangan indah",
    totalUnits: 120,
    availableUnits: 32,
    priceRange: "400 - 650 juta",
    image: "/luxury-residence.jpg",
    facilities: ["Clubhouse", "Gym", "Tenis Court", "Gate House", "Taman Eksklusif"],
    contactPerson: "Ahmad Wijaya",
    phone: "0831-5555-6666",
    email: "premium@bukitsejahtera.com",
  },
  {
    id: 4,
    name: "Perumahan Maju Jaya",
    lat: 2.71,
    lng: 99.19,
    description: "Hunian terjangkau untuk keluarga muda",
    totalUnits: 300,
    availableUnits: 125,
    priceRange: "120 - 200 juta",
    image: "/family-housing.jpg",
    facilities: ["Taman", "Sekolah Terdekat", "Pasar", "Terminal"],
    contactPerson: "Dewi Lestari",
    phone: "0856-7777-8888",
    email: "info@majujaya.com",
  },
  {
    id: 5,
    name: "Perumahan Harmoni Sentosa",
    lat: 2.728,
    lng: 99.15,
    description: "Komunitas hunian yang harmonis dan modern",
    totalUnits: 180,
    availableUnits: 60,
    priceRange: "280 - 420 juta",
    image: "/community-housing.jpg",
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
