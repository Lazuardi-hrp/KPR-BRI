/** Supported locales */
export type Locale = "id" | "en"

/** The full translation dictionary shape. Every key used in the app is declared here. */
export interface Translations {
  // ── Meta / Layout ──────────────────────────────────────────────────────
  meta: {
    title: string
    description: string
  }

  // ── Global / shared ────────────────────────────────────────────────────
  common: {
    skipToContent: string
    ownYourDreamHome: string
    viewMap: string
    learnMore: string
    contactUs: string
    viewAvailableHousing: string
    close: string
    menu: string
    openMenu: string
    closeMenu: string
    loading: string
    noData: string
    startingFrom: string
    unitAvailable: string
    subsidyUnit: string
    back: string
    backToHome: string
    list: string
    search: string
    phone: string
    email: string
  }

  // ── Info Ticker ────────────────────────────────────────────────────────
  ticker: {
    segments: string[]
    ariaLabel: string
  }

  // ── Hero ────────────────────────────────────────────────────────────────
  hero: {
    badge: string
    headingKPR: string
    headingSubsidized: string
    headingBRI: string
    subtitle: string
    description: string
    viewHousingMap: string
    certified: string
    guaranteedByLPS: string
    locationPoints: string
    mappedVerified: string
    pematangSiantar: string
    /** coordinate labels */
    coordNorth: string
    coordEast: string
  }

  // ── Hero Stats ─────────────────────────────────────────────────────────
  heroStats: {
    housing: string
    housingUnits: string
    happyFamilies: string
  }

  // ── Band Stats ─────────────────────────────────────────────────────────
  bandStats: {
    registeredHousing: string
    availableUnits: string
    happyCustomers: string
  }

  // ── Chapters (kavling rail) ────────────────────────────────────────────
  chapters: {
    benefits: string
    howItWorks: string
    housing: string
    simulation: string
    getStarted: string
  }

  // ── Section 01 – Benefits ──────────────────────────────────────────────
  benefits: {
    eyebrow: string
    title: string
    description: string
    items: Array<{
      title: string
      desc: string
    }>
  }

  // ── Section 02 – How It Works ──────────────────────────────────────────
  howItWorks: {
    eyebrow: string
    title: string
    description: string
    stepLabel: string
    items: Array<{
      title: string
      desc: string
    }>
  }

  // ── Section 03 – Housing Collection ────────────────────────────────────
  housingCollection: {
    eyebrow: string
    title: string
    description: string
    viewAllOnMap: string
  }

  // ── Section 04 – Simulation teaser ─────────────────────────────────────
  simulation: {
    eyebrow: string
    title: string
    description: string
    cta: string
    /** Wajib terlihat, tidak boleh di balik tooltip — design.md §7.3. */
    disclaimer: string
    points: string[]
  }

  // ── Section 05 – CTA ───────────────────────────────────────────────────
  cta: {
    eyebrow: string
    realizeWord: string
    dreamHome: string
    yourWord: string
    description: string
  }

  // ── Sticky CTA (mobile) ────────────────────────────────────────────────
  stickyCta: {
    housing: string // "{count} perumahan"
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    tagline: string
    contact: string
    /** Label tautan WhatsApp pada blok kontak. */
    whatsapp: string
    serviceArea: string
    city: string
    copyright: string
    /** [BARU] Tautan kepatuhan — wajib tayang sebelum formulir prospek dibuka (PRD R-4). */
    privacyPolicy: string
    termsConditions: string
  }

  // ── Map Page ───────────────────────────────────────────────────────────
  mapPage: {
    title: string
    housingMap: string
    screenReaderTitle: string
    loadingMap: string
    housingList: string
    locations: string
    searchPlaceholder: string
    searchAriaLabel: string
    noHousingData: string
    noResults: string // "No housing matching '{query}'."
    closeList: string
  }

  // ── Nearest Housing Panel ──────────────────────────────────────────────
  nearestPanel: {
    title: string
    ariaLabel: string
    closePanelLabel: string
    locationPermissionInfo: string
    detectLocation: string
    detecting: string
    detectingScreenReader: string
    nearestHousing: string
    noHousingFound: string
    locationDenied: string
    locationFailed: string
  }

  // ── Housing Popup ──────────────────────────────────────────────────────
  popup: {
    availabilityHigh: string
    availabilityMedium: string
    availabilityLow: string
    availability: string // "Availability: {status}"
    available: string // "{percent}% Available"
    techSpecs: string
    roof: string
    wall: string
    floorFoundation: string
    housingStatus: string
    subsidy: string
    subsidySold: string
    commercial: string
    commercialSold: string
    unitsAvailable: string
    unitsSold: string
    contactAgent: string
    salesAgent: string
    callNow: string
    /** Label tombol WhatsApp pada baris tindakan popup. */
    whatsapp: string
  }

  // ── Property Verification ──────────────────────────────────────────────
  verification: {
    /** Status headline shown on the badge itself. */
    verified: string
    pending: string
    needsUpdate: string
    /** Card-sized labels. The full ones do not fit a listing card. */
    shortVerified: string
    shortPending: string
    shortNeedsUpdate: string
    /** One-line explanation under each headline. */
    verifiedNote: string
    pendingNote: string
    needsUpdateNote: string

    /** Freshness line. "{time}" is replaced with a relative time. */
    lastVerified: string      // "Last verified {time}"
    lastUpdated: string       // "Data last updated {time}"
    neverVerified: string
    staleWarning: string      // shown past the freshness window

    /** Disclosure. */
    detailsTitle: string
    showDetails: string
    hideDetails: string

    /** Per-field breakdown. */
    fieldVerified: string
    fieldChecked: string      // "Last checked {time}"
    fieldUnchecked: string
    fieldMissing: string

    /** Confidence score. */
    confidence: string
    outOf: string             // "{score} / 100"
    bandExcellent: string
    bandGood: string
    bandFair: string
    bandAttention: string
    confidenceNote: string

    /** Field names — must mirror LABEL_BIDANG in src/lib/verification.ts. */
    fields: {
      nama: string
      harga: string
      lokasi: string
      pengembang: string
      foto: string
      kontak: string
      ketersediaan_unit: string
    }
  }

  // ── Image Slideshow ────────────────────────────────────────────────────
  slideshow: {
    photoOf: string // "Photo of {title}"
    photoNofM: string // "Photo {n} of {m}"
    previousPhoto: string
    nextPhoto: string
    viewPhoto: string // "View photo {n}"
  }

  // ── Housing Map ────────────────────────────────────────────────────────
  housingMap: {
    yourLocation: string
  }

  // ── Map search — filters, reference point, marker preview ───────────────
  //
  // Angka dan istilah KPR (angsuran, band kemampuan, disclaimer) TIDAK ada di
  // sini: seluruhnya dibaca dari src/lib/kpr.ts, sama seperti /simulasi dan
  // /perumahan/[slug]. Menyalinnya ke kamus akan membuat dua tempat mengeja
  // ambang yang sama, dan yang satu akan tertinggal.
  mapSearch: {
    filters: string
    filterCount: string // "Filter ({n})"
    openFilters: string
    closeFilters: string
    reset: string
    results: string // "{n} of {m} housing"
    noMatches: string
    noMatchesHint: string
    zoomToResults: string

    district: string
    allDistricts: string
    availability: string
    minUnits: string // "At least {n} units"

    // Reference point
    distance: string
    measureFrom: string
    useMyLocation: string
    locating: string
    pickOnMap: string
    pickOnMapHint: string
    cancelPick: string
    searchAddress: string
    addressPlaceholder: string
    searching: string
    noAddressFound: string
    referencePoint: string
    clearPoint: string
    radius: string
    radiusValue: string // "Within {n} km"
    anyDistance: string

    // Budget
    budget: string
    budgetHint: string
    monthlyIncome: string
    downPayment: string
    tenor: string
    tenorYears: string // "{n} years"
    showOnly: string
    anyInstalment: string
    perMonth: string // "/month"
    estimateFrom: string // "Rates reviewed {date}"

    // Marker preview
    viewDetail: string
    closePreview: string
    unitsLeft: string // "{n} units"
    distanceAway: string // "{d} away"
  }

  // ── Language Switcher ──────────────────────────────────────────────────
  langSwitcher: {
    label: string
    switchTo: string
  }
}
