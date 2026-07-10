const day = 24 * 60 * 60 * 1000;
const now = Date.now();

export const demoPortal = {
  portalUser: { id: "portal-megan", name: "Megan Walsh", email: "megan@example.com" },
  organization: { id: "org-greenline", name: "Greenline Turf & Pest", timezone: "America/New_York", phone: "(508) 555-0194", email: "care@greenlineturf.example" },
  customer: { id: "cust-walsh", name: "Megan Walsh", status: "active", balanceCents: 24300 },
  properties: [
    { id: "property-home", label: "Home", street: "42 Oak Terrace", city: "Mansfield", state: "MA", postalCode: "02048", lawnSizeSqFt: 12800, accessNotes: "Gate on the left. Text before entering the backyard.", pets: "Luna — friendly golden retriever", irrigation: "Zones run Tuesday and Friday mornings." },
    { id: "property-cottage", label: "Lake cottage", street: "8 Cedar Point Road", city: "Wrentham", state: "MA", postalCode: "02093", lawnSizeSqFt: 6400, accessNotes: "Lockbox code is on file.", pets: "No pets", irrigation: "No irrigation system." },
  ],
  estimates: [
    { id: "estimate-1048", estimateNumber: "EST-1048", title: "Seasonal mosquito & tick protection", propertyId: "property-home", status: "sent", totalCents: 78000, expiresAt: now + 8 * day, updatedAt: now - day, terms: "Six scheduled barrier treatments from May through September. Rain guarantee included.", lineItems: [
      { id: "line-1", name: "Mosquito & tick barrier", description: "Six perimeter treatments with free re-service between visits.", quantity: 6, unit: "visit", unitPriceCents: 13000, totalCents: 78000 },
    ] },
    { id: "estimate-1029", estimateNumber: "EST-1029", title: "Spring aeration & overseeding", propertyId: "property-home", status: "accepted", totalCents: 46500, acceptedAt: now - 19 * day, updatedAt: now - 19 * day, terms: "Includes seed, starter fertilizer, and watering instructions.", lineItems: [
      { id: "line-2", name: "Core aeration", description: "Double-pass core aeration.", quantity: 1, unit: "service", unitPriceCents: 22500, totalCents: 22500 },
      { id: "line-3", name: "Premium overseeding", description: "Sun-and-shade blend applied at the recommended rate.", quantity: 1, unit: "service", unitPriceCents: 24000, totalCents: 24000 },
    ] },
    { id: "estimate-998", estimateNumber: "EST-0998", title: "Foundation pest prevention", propertyId: "property-cottage", status: "declined", totalCents: 39000, updatedAt: now - 62 * day, terms: "Three exterior treatments.", lineItems: [
      { id: "line-4", name: "Exterior pest program", description: "Three seasonal foundation and entry-point treatments.", quantity: 3, unit: "visit", unitPriceCents: 13000, totalCents: 39000 },
    ] },
  ],
  visits: [
    { id: "visit-next", jobId: "job-fert", title: "Round 3 fertilization & broadleaf control", propertyId: "property-home", scheduledStart: now + 2 * day + 10 * 60 * 60 * 1000, scheduledEnd: now + 2 * day + 12 * 60 * 60 * 1000, status: "scheduled", arrivalWindow: "10:00 AM – 12:00 PM", crew: "Lawn Team 2", weather: "72°F · Low rain risk", checklist: ["Inspect turf color and density", "Apply balanced granular fertilizer", "Spot-treat broadleaf weeds"], notes: "Please keep pets off treated areas until the product is dry.", materials: [] },
    { id: "visit-previous", jobId: "job-fert", title: "Round 2 fertilizer & crabgrass prevention", propertyId: "property-home", scheduledStart: now - 24 * day, scheduledEnd: now - 24 * day + 75 * 60 * 1000, completedAt: now - 24 * day + 75 * 60 * 1000, status: "complete", arrivalWindow: "Completed 11:18 AM", crew: "Lawn Team 2", weather: "64°F · 7 mph wind · Dry", checklist: ["Turf inspection completed", "Product applied uniformly", "Treatment flags posted"], notes: "Good spring color. Light clover pressure near the rear fence was spot treated. Water in with 0.25 inch within 48 hours.", materials: [
      { id: "app-1", name: "Dimension 19-0-6", epaRegistrationNumber: "100-1234", quantity: 3.2, unit: "bags", applicationRate: "3.9 lb / 1,000 sq ft", activeIngredient: "Dithiopyr 0.10%" },
    ], photos: [
      { id: "photo-1", type: "before", caption: "Rear turf before treatment" },
      { id: "photo-2", type: "after", caption: "Treatment completed and flagged" },
    ] },
    { id: "visit-one", jobId: "job-fert", title: "Round 1 early spring fertilizer", propertyId: "property-home", scheduledStart: now - 67 * day, scheduledEnd: now - 67 * day + 70 * 60 * 1000, completedAt: now - 67 * day + 70 * 60 * 1000, status: "complete", arrivalWindow: "Completed 9:42 AM", crew: "Lawn Team 1", weather: "51°F · Calm · Dry", checklist: ["Turf inspection completed", "Fertilizer applied", "Treatment flags posted"], notes: "Lawn came through winter well. Minor vole activity noted near the shed.", materials: [
      { id: "app-2", name: "Dimension 0.15% 19-0-6", epaRegistrationNumber: "100-1234", quantity: 3.1, unit: "bags", applicationRate: "3.8 lb / 1,000 sq ft", activeIngredient: "Dithiopyr 0.15%" },
    ], photos: [] },
  ],
  invoices: [
    { id: "invoice-3018", invoiceNumber: "INV-3018", title: "Round 2 lawn treatment", status: "sent", totalCents: 24300, paidCents: 0, dueAt: now + 6 * day, createdAt: now - 8 * day },
    { id: "invoice-2987", invoiceNumber: "INV-2987", title: "Spring cleanup", status: "paid", totalCents: 68500, paidCents: 68500, dueAt: now - 31 * day, paidAt: now - 34 * day, createdAt: now - 43 * day },
    { id: "invoice-2911", invoiceNumber: "INV-2911", title: "Annual lawn program prepay", status: "paid", totalCents: 129500, paidCents: 129500, dueAt: now - 92 * day, paidAt: now - 96 * day, createdAt: now - 101 * day },
  ],
  payments: [
    { id: "payment-1", invoiceId: "invoice-2987", amountCents: 68500, method: "card", status: "posted", receivedAt: now - 34 * day, reference: "Visa •••• 4242" },
    { id: "payment-2", invoiceId: "invoice-2911", amountCents: 129500, method: "ach", status: "posted", receivedAt: now - 96 * day, reference: "Bank account •••• 2231" },
  ],
  documents: [
    { id: "document-1", fileName: "2026-lawn-care-agreement.pdf", category: "Agreement", createdAt: now - 102 * day, size: 284000 },
    { id: "document-2", fileName: "round-2-service-report.pdf", category: "Service report", createdAt: now - 24 * day, size: 419000 },
    { id: "document-3", fileName: "invoice-2987-receipt.pdf", category: "Receipt", createdAt: now - 34 * day, size: 116000 },
    { id: "document-4", fileName: "watering-and-aftercare-guide.pdf", category: "Guide", createdAt: now - 19 * day, size: 522000 },
  ],
  messages: [
    { id: "message-1", direction: "team", author: "Amy at Greenline", body: "Hi Megan — your Round 3 treatment is planned for Friday morning. The weather window looks great.", createdAt: now - 6 * 60 * 60 * 1000, read: true },
    { id: "message-2", direction: "customer", author: "You", body: "Perfect. The side gate will be unlocked and I’ll keep Luna inside.", createdAt: now - 5.4 * 60 * 60 * 1000, read: true },
    { id: "message-3", direction: "team", author: "Amy at Greenline", body: "Thank you! We’ll text again when the crew is on the way.", createdAt: now - 5 * 60 * 60 * 1000, read: true },
  ],
  serviceRequests: [
    { id: "request-1", subject: "Quote for grub prevention", kind: "new_service", status: "reviewing", detail: "Please add grub prevention options to my account.", createdAt: now - 2 * day },
  ],
  preferences: { emailNotifications: true, smsNotifications: true, serviceReminders: true, invoiceReminders: true, estimateReminders: true, marketingMessages: false },
} as const;

export type DemoPortal = typeof demoPortal;
