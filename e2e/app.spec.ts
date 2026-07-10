import { expect, test, type Page } from "@playwright/test";

async function openAppView(page: Page, name: string) {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("aside").getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("marketing front page routes to product pages and the live app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /All-in-One CRM Built for/i })).toBeVisible();
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await expect(page.locator("header").getByRole("link", { name: "Get Started" }).first()).toHaveAttribute("href", "/signin");

  await page.goto("/features");
  await expect(page.getByRole("heading", { name: /Powerful Features/i })).toBeVisible();
  await expect(page.getByText("Smarter Routes. Happier Customers.")).toBeVisible();
  await expect(page.getByText("Get Paid Faster. Without the Hassle.")).toBeVisible();

  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "One account. Your entire operation." })).toBeVisible();
  await expect(page.getByText("Secure account setup")).toBeVisible();
  await expect(page.getByText("10 contacts included").first()).toBeVisible();
  await expect(page.getByText("All-In Pro").first()).toBeVisible();

  await page.goto("/signup");
  await expect(page).toHaveURL("/signin");

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
});

test("loads the operating shell and creates a lead", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Global search").fill("Brookside");
  await expect(page.getByText("Brookside HOA").first()).toBeVisible();
  await page.getByLabel("Global search").press("Enter");
  await expect(page.getByRole("heading", { name: "CRM", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brookside HOA" })).toBeVisible();
  await page.getByLabel("Customer activity summary").fill("Called board about north entrance treatment timing.");
  await page.getByLabel("Customer create follow-up").check();
  await page.getByRole("button", { name: "Log Activity" }).click();
  await expect(page.getByText("Called board about north entrance treatment timing.", { exact: true })).toBeVisible();
  await expect(page.getByText("Follow up: Called board about north entrance treatment timing.")).toBeVisible();

  await openAppView(page, "Prime Time");
  await expect(page.getByRole("heading", { name: "Top 100 updates to make this sellable as a real SaaS" })).toBeVisible();
  await expect(page.getByText("P0 Open Items")).toBeVisible();
  await expect(page.getByText("Stripe checkout").first()).toBeVisible();

  await openAppView(page, "CRM");
  await page.getByRole("textbox", { name: "Customer", exact: true }).fill("Playwright Home");
  await page.getByLabel("Service request").fill("Perimeter pest prevention");
  await page.getByLabel("Street").fill("1 Test Street");
  await page.getByLabel("City").fill("Foxborough");
  await page.getByLabel("Value").fill("1200");
  await page.getByLabel("Value").press("Enter");

  await expect(page.getByRole("heading", { name: "Playwright Home" })).toBeVisible();
  await openAppView(page, "Pipeline");
  await expect(page.getByText("Perimeter pest prevention").first()).toBeVisible();

  await openAppView(page, "Lead Ops");
  await page.getByPlaceholder("Lead, customer, city, source").fill("Playwright Home");
  await expect(page.getByText("Perimeter pest prevention").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lead Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Duplicate Review Queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review duplicate" }).first()).toBeVisible();
  await expect(page.getByText("Estimate readiness")).toBeVisible();
  await expect(page.getByText("Source win rate")).toBeVisible();
});

test("dispatch surfaces route confidence and crew risk", async ({ page }) => {
  await page.goto("/app");
  await openAppView(page, "Dispatch");

  await expect(page.getByText("Route confidence").first()).toBeVisible();
  await expect(page.getByText(/weather application risk|No routing warnings|Crew skill mismatch/).first()).toBeVisible();

  await openAppView(page, "Costing");
  await expect(page.getByRole("heading", { name: "Margin Guardrails" })).toBeVisible();
  await expect(page.getByText("Price lift needed")).toBeVisible();
  await expect(page.getByText("Guardrail").first()).toBeVisible();
});

test("profit and admin expose owner analytics", async ({ page }) => {
  await page.goto("/app");

  await openAppView(page, "Profit");
  await expect(page.getByText("Owner Unit Economics")).toBeVisible();
  await expect(page.getByText("Churn Analysis").first()).toBeVisible();
  await expect(page.getByText("LTV by Segment").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "P&L Snapshot" })).toBeVisible();
  await expect(page.getByText("Cost Breakdown").first()).toBeVisible();

  await openAppView(page, "Admin");
  await expect(page.getByRole("heading", { name: "Owner chart pack for churn, LTV, P&L, and costs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tag Taxonomy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer Segments" })).toBeVisible();
});

test("mobile field screen can complete checklist items", async ({ page }) => {
  await page.goto("/app");
  await openAppView(page, "Field");
  await expect(page.getByText("Weather application rules")).toBeVisible();
  await expect(page.getByText("Material / chemical lot")).toBeVisible();
  await expect(page.getByText("Equipment checkout")).toBeVisible();
  await page.getByRole("button", { name: /Post treatment flags|Mow front lawn|Confirm property access|Complete service scope/ }).first().click();
  await expect(page.getByRole("button", { name: "Submit Visit" })).toBeVisible();
});

test("client onboarding previews a new tenant provisioning flow", async ({ page }) => {
  await page.goto("/app");
  await openAppView(page, "Onboarding");

  await page.getByLabel("Company").fill("Acme Turf and Pest");
  await page.getByLabel("Owner email").fill("owner@acmeturf.example");
  await page.getByLabel("Seats").fill("8");
  await page.getByRole("button", { name: "Create Client Workspace" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Create Client Workspace" }).click();

  await expect(page.getByText("Acme Turf and Pest")).toBeVisible();
  await expect(page.getByText("/acme-turf-and-pest - owner@acmeturf.example")).toBeVisible();
  await expect(page.getByText("Lead statuses and saved views")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Import QA Preview" })).toBeVisible();
  await expect(page.getByText("Outside service territory")).toBeVisible();
});
