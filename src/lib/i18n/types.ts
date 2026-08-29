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

  // ── Section 04 – CTA ───────────────────────────────────────────────────
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
    navigation: string
    housingMap: string
    contact: string
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

  // ── Language Switcher ──────────────────────────────────────────────────
  langSwitcher: {
    label: string
    switchTo: string
  }
}
