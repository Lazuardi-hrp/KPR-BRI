import type { Translations } from "./types"

export const en: Translations = {
  // ── Meta / Layout ──────────────────────────────────────────────────────
  meta: {
    title: "BRI Subsidized Mortgage — Housing in Pematang Siantar",
    description:
      "Interactive housing search platform in Pematang Siantar. Find your dream home with BRI's affordable subsidized mortgage program.",
  },

  // ── Global / shared ────────────────────────────────────────────────────
  common: {
    skipToContent: "Skip to main content",
    ownYourDreamHome: "OWN YOUR DREAM HOME",
    viewMap: "View Map",
    learnMore: "Learn More",
    contactUs: "Contact Us",
    viewAvailableHousing: "View Available Housing",
    close: "Close",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    loading: "Loading…",
    noData: "No data",
    startingFrom: "Starting from",
    unitAvailable: "units available",
    subsidyUnit: "subsidy units",
    back: "Back",
    backToHome: "Back to Home",
    list: "List",
    search: "Search",
    phone: "Phone",
    email: "Email",
  },

  // ── Info Ticker ────────────────────────────────────────────────────────
  ticker: {
    segments: [
      "BRI SUBSIDIZED MORTGAGE INFO",
      "FIND HOUSING IN PEMATANG SIANTAR",
      "CHECK LOCATIONS & UNIT INFO →",
    ],
    ariaLabel: "BRI Subsidized Mortgage Information",
  },

  // ── Hero ────────────────────────────────────────────────────────────────
  hero: {
    badge: "OWN YOUR DREAM HOME",
    headingKPR: "KPR",
    headingSubsidized: "Subsidized",
    headingBRI: "BRI",
    subtitle: "Comfortable home, affordable installments, for your family's future.",
    description:
      "Find your dream home in Pematang Siantar with an affordable subsidized mortgage program. Easy, fast, and trusted process.",
    viewHousingMap: "View Housing Map",
    certified: "Certified",
    guaranteedByLPS: "Guaranteed by LPS",
    locationPoints: "location points",
    mappedVerified: "Mapped & verified",
    pematangSiantar: "Pematang Siantar",
    coordNorth: "N",
    coordEast: "E",
  },

  // ── Hero Stats ─────────────────────────────────────────────────────────
  heroStats: {
    housing: "Housing",
    housingUnits: "Housing Units",
    happyFamilies: "Happy Families",
  },

  // ── Band Stats ─────────────────────────────────────────────────────────
  bandStats: {
    registeredHousing: "Registered Housing",
    availableUnits: "Available Units",
    happyCustomers: "Happy Customers",
  },

  // ── Chapters (kavling rail) ────────────────────────────────────────────
  chapters: {
    benefits: "Benefits",
    howItWorks: "How It Works",
    housing: "Housing",
    simulation: "Simulation",
    getStarted: "Get Started",
  },

  // ── Section 01 – Benefits ──────────────────────────────────────────────
  benefits: {
    eyebrow: "Benefits",
    title: "Why choose BRI Subsidized Mortgage",
    description: "Make your dream home a reality with exclusive benefits.",
    items: [
      {
        title: "Low Down Payment",
        desc: "Make your first home a reality with an affordable and accessible down payment for everyone.",
      },
      {
        title: "Low Interest Rate",
        desc: "Competitive interest rates from BRI, affordable and suited to your capacity throughout the installment period.",
      },
      {
        title: "Safe & Trusted",
        desc: "Easy, transparent, and trusted process backed by Indonesia's leading bank.",
      },
    ],
  },

  // ── Section 02 – How It Works ──────────────────────────────────────────
  howItWorks: {
    eyebrow: "How It Works",
    title: "Steps to get your mortgage",
    description: "Three simple steps, from application to key handover.",
    stepLabel: "Step",
    items: [
      {
        title: "Government Subsidy",
        desc: "Make your first home a reality with official government subsidy support.",
      },
      {
        title: "Fixed Installments",
        desc: "Affordable and stable installments, suited to your family's budget.",
      },
      {
        title: "Easy Process",
        desc: "Simple requirements, fast processing, guided by BRI experts at every step.",
      },
    ],
  },

  // ── Section 03 – Housing Collection ────────────────────────────────────
  housingCollection: {
    eyebrow: "Housing Collection",
    title: "Housing options in Pematang Siantar",
    description: "Explore selected subsidized housing, complete with locations on an interactive map.",
    viewAllOnMap: "View all on map",
  },

  // ── Section 04 – Simulation teaser ─────────────────────────────────────
  simulation: {
    eyebrow: "Simulation",
    title: "Estimate your instalment and housing budget",
    description:
      "Enter your income and current monthly commitments, then see your estimated monthly instalment, how much of your income it takes, and which housing fits your budget.",
    cta: "Open the simulator",
    disclaimer:
      "All results are estimates based on figures you enter yourself — not an offer, not an application, and not credit approval from BRI.",
    points: [
      "Monthly instalment and total interest",
      "Share of your monthly income",
      "Housing that fits your budget",
    ],
  },

  // ── Section 05 – CTA ───────────────────────────────────────────────────
  cta: {
    eyebrow: "04 · Get Started Today",
    realizeWord: "Realize",
    dreamHome: "your dream home",
    yourWord: "today",
    description: "Get the best subsidized mortgage solution from BRI for your family's future.",
  },

  // ── Sticky CTA (mobile) ────────────────────────────────────────────────
  stickyCta: {
    housing: "housing",
  },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    tagline:
      "Trusted subsidized mortgage solution to make Indonesian families' dream homes a reality.",
    contact: "Contact",
    serviceArea: "Service Area",
    city: "Pematangsiantar City & Simalungun Regency",
    copyright: "KPR BRI Pematang Siantar. BRI is a participant in the LPS guarantee program. All rights reserved.",
    privacyPolicy: "Privacy Policy",
    termsConditions: "Terms & Conditions",
  },

  // ── Map Page ───────────────────────────────────────────────────────────
  mapPage: {
    title: "Housing Map",
    housingMap: "Housing Map",
    screenReaderTitle: "Subsidized housing map in Pematang Siantar",
    loadingMap: "Loading map…",
    housingList: "Housing List",
    locations: "locations",
    searchPlaceholder: "Search housing name or district…",
    searchAriaLabel: "Search housing name or district",
    noHousingData: "No housing data available to display.",
    noResults: "No housing matching \u201c{query}\u201d.",
    closeList: "Close housing list",
  },

  // ── Nearest Housing Panel ──────────────────────────────────────────────
  nearestPanel: {
    title: "Find nearest housing",
    ariaLabel: "Find nearest housing",
    closePanelLabel: "Close nearest search panel",
    locationPermissionInfo:
      "We will request location access from your browser. Your location is only used to calculate distance and is not stored.",
    detectLocation: "Detect Location",
    detecting: "Detecting…",
    detectingScreenReader: "Finding your location…",
    nearestHousing: "Nearest Housing",
    noHousingFound: "No housing found",
    locationDenied: "Location access denied. Please enable location in your browser.",
    locationFailed: "Failed to get your location",
  },

  // ── Housing Popup ──────────────────────────────────────────────────────
  popup: {
    availabilityHigh: "High",
    availabilityMedium: "Medium",
    availabilityLow: "Low",
    availability: "Availability",
    available: "Available",
    techSpecs: "Technical Specifications",
    roof: "Roof",
    wall: "Wall",
    floorFoundation: "Floor & Foundation",
    housingStatus: "Housing Status",
    subsidy: "Subsidy",
    subsidySold: "Subsidy Sold",
    commercial: "Commercial",
    commercialSold: "Commercial Sold",
    unitsAvailable: "Units available",
    unitsSold: "Units sold",
    contactAgent: "Contact Sales Agent",
    salesAgent: "Sales Agent",
    callNow: "Call Now",
  },

  // ── Property Verification ──────────────────────────────────────────────
  verification: {
    verified: "Verified Property",
    pending: "Verification In Progress",
    needsUpdate: "Information Needs Update",
    shortVerified: "Verified",
    shortPending: "Not yet verified",
    shortNeedsUpdate: "Needs update",
    verifiedNote:
      "This property's information has been reviewed by our staff and is considered current.",
    pendingNote:
      "This property is listed in our system, but its information has not finished review yet.",
    needsUpdateNote:
      "Some information has changed or is not yet confirmed, and is awaiting review.",

    lastVerified: "Verified {time}",
    lastUpdated: "Data updated {time}",
    neverVerified: "Never verified",
    staleWarning:
      "The last review was a while ago. Please confirm with the marketing contact before making a decision.",

    detailsTitle: "Property information status",
    showDetails: "See details",
    hideDetails: "Hide details",

    fieldVerified: "Verified",
    fieldChecked: "Last checked {time}",
    fieldUnchecked: "Not yet checked",
    fieldMissing: "No data yet",

    confidence: "Information Confidence",
    outOf: "out of 100",
    bandExcellent: "Excellent",
    bandGood: "Good",
    bandFair: "Fair",
    bandAttention: "Needs attention",
    confidenceNote:
      "This score reflects how complete and how recent the information is \u2014 not the quality of the property or its credit eligibility.",

    fields: {
      nama: "Property name",
      harga: "Property price",
      lokasi: "Property location",
      pengembang: "Developer",
      foto: "Property images",
      kontak: "Contact information",
      ketersediaan_unit: "Unit availability",
    },
  },

  // ── Image Slideshow ────────────────────────────────────────────────────
  slideshow: {
    photoOf: "Photo of",
    photoNofM: "Photo {n} of {m}",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    viewPhoto: "View photo {n}",
  },

  // ── Housing Map ────────────────────────────────────────────────────────
  housingMap: {
    yourLocation: "Your Location",
  },

  // ── Language Switcher ──────────────────────────────────────────────────
  langSwitcher: {
    label: "Language",
    switchTo: "Ganti ke Bahasa Indonesia",
  },
}
