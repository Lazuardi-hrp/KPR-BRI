// Utility untuk menghitung jarak dan merekomendasikan perumahan terdekat

export interface Coordinates {
  lat: number
  lng: number
}

export interface HousingDistance {
  housing: any
  distance: number // dalam kilometer
}

// Menghitung jarak antara dua koordinat menggunakan formula Haversine
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371 // Radius bumi dalam km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Mendapatkan perumahan terdekat
export const getNearestHousing = (userLocation: Coordinates, housingList: any[], limit: number = 5): HousingDistance[] => {
  const distances = housingList.map((housing) => ({
    housing,
    distance: calculateDistance(userLocation, {
      lat: housing.lat,
      lng: housing.lng,
    }),
  }))

  return distances.sort((a, b) => a.distance - b.distance).slice(0, limit)
}

// Request geolokasi pengguna
export const requestUserLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung di browser ini"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        reject(error)
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
      },
    )
  })
}
