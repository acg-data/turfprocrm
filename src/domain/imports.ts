import { serviceCategories, type ServiceCategory } from "./workflow";

export type LeadImportIssueSeverity = "review" | "block";

export type LeadImportIssue = {
  code:
    | "missing_name"
    | "missing_contact"
    | "missing_address"
    | "duplicate"
    | "unknown_service_line"
    | "outside_service_territory"
    | "free_plan_limit";
  severity: LeadImportIssueSeverity;
  message: string;
};

export type LeadImportPreviewRow = {
  rowNumber: number;
  customerName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  serviceLine?: ServiceCategory;
  source?: string;
  mappedEntity: "lead + customer + property" | "customer + property" | "lead";
  status: "ready" | "needs_review" | "blocked";
  issues: LeadImportIssue[];
};

export type LeadImportOptions = {
  currentContactCount?: number;
  freeContactLimit?: number;
  serviceTerritory?: string[];
  existingContacts?: Array<{ name: string; email?: string; phone?: string }>;
};

const headerAliases: Record<string, keyof Omit<LeadImportPreviewRow, "rowNumber" | "status" | "issues" | "mappedEntity" | "serviceLine"> | "serviceLine"> = {
  account: "customerName",
  address: "street",
  city: "city",
  company: "customerName",
  customer: "customerName",
  customer_name: "customerName",
  email: "email",
  name: "customerName",
  phone: "phone",
  postal: "postalCode",
  postal_code: "postalCode",
  service: "serviceLine",
  service_line: "serviceLine",
  source: "source",
  state: "state",
  street: "street",
  zip: "postalCode",
  zipcode: "postalCode",
};

const serviceAliases: Record<string, ServiceCategory> = {
  fertilization: "lawn_care",
  irrigation: "irrigation",
  landscape: "landscaping",
  landscaping: "landscaping",
  lawn: "lawn_care",
  lawncare: "lawn_care",
  maintenance: "maintenance",
  mosquito: "pest_control",
  pest: "pest_control",
  pestcontrol: "pest_control",
  snow: "snow",
  tree: "tree_shrub",
  treeshrub: "tree_shrub",
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeComparable(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function normalizePhone(value?: string) {
  return value?.replace(/\D/g, "") ?? "";
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function serviceLineFromImport(value?: string) {
  if (!value?.trim()) return undefined;
  const normalized = normalizeKey(value).replace(/_/g, "");
  if ((serviceCategories as readonly string[]).includes(normalized)) return normalized as ServiceCategory;
  return serviceAliases[normalized];
}

function isDuplicate(row: Pick<LeadImportPreviewRow, "customerName" | "email" | "phone">, existingContacts: LeadImportOptions["existingContacts"]) {
  return (existingContacts ?? []).some((contact) => {
    const sameEmail = row.email && contact.email && normalizeComparable(row.email) === normalizeComparable(contact.email);
    const samePhone = normalizePhone(row.phone).length >= 10 && normalizePhone(row.phone) === normalizePhone(contact.phone);
    const sameName = row.customerName && normalizeComparable(row.customerName) === normalizeComparable(contact.name);
    return sameEmail || samePhone || sameName;
  });
}

export function parseLeadImportCsv(csv: string, options: LeadImportOptions = {}) {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => headerAliases[normalizeKey(header)]).map((header) => header ?? null);
  const serviceTerritory = new Set((options.serviceTerritory ?? []).map((city) => normalizeComparable(city)).filter(Boolean));
  const freeContactLimit = options.freeContactLimit ?? 10;
  const currentContactCount = options.currentContactCount ?? 0;
  let acceptedContactRows = 0;

  return rows.slice(1).map<LeadImportPreviewRow>((values, rowIndex) => {
    const raw: Record<string, string> = {};
    headers.forEach((field, index) => {
      if (!field) return;
      raw[field] = values[index]?.trim() ?? "";
    });

    const serviceLine = serviceLineFromImport(raw.serviceLine);
    const issues: LeadImportIssue[] = [];
    const customerName = raw.customerName?.trim() ?? "";
    const email = raw.email?.trim() || undefined;
    const phone = raw.phone?.trim() || undefined;
    const street = raw.street?.trim() || undefined;
    const city = raw.city?.trim() || undefined;
    const state = raw.state?.trim() || undefined;
    const postalCode = raw.postalCode?.trim() || undefined;

    if (!customerName) issues.push({ code: "missing_name", severity: "block", message: "Missing customer name" });
    if (!email && !phone) issues.push({ code: "missing_contact", severity: "review", message: "Missing contact method" });
    if (!street || !city) issues.push({ code: "missing_address", severity: "review", message: "Missing address" });
    if (raw.serviceLine && !serviceLine) issues.push({ code: "unknown_service_line", severity: "block", message: "Unknown service line" });
    if (serviceTerritory.size > 0 && city && !serviceTerritory.has(normalizeComparable(city))) {
      issues.push({ code: "outside_service_territory", severity: "block", message: "Outside service territory" });
    }
    if (isDuplicate({ customerName, email, phone }, options.existingContacts)) {
      issues.push({ code: "duplicate", severity: "review", message: "Possible duplicate" });
    }
    if (currentContactCount + acceptedContactRows >= freeContactLimit) {
      issues.push({ code: "free_plan_limit", severity: "block", message: "Free plan contact cap" });
    }

    const blocked = issues.some((issue) => issue.severity === "block");
    if (!blocked) acceptedContactRows += 1;

    return {
      rowNumber: rowIndex + 2,
      customerName,
      email,
      phone,
      street,
      city,
      state,
      postalCode,
      serviceLine,
      source: raw.source?.trim() || undefined,
      mappedEntity: street && city ? "lead + customer + property" : "lead",
      status: blocked ? "blocked" : issues.length > 0 ? "needs_review" : "ready",
      issues,
    };
  });
}
