import { expect, test, type Page } from "@playwright/test";

const convexWriteTimeout = 30_000;

async function openAppView(page: Page, name: string) {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("aside").getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
}

async function waitForWorkspaceReady(page: Page) {
  const demoButton = page.getByRole("button", { name: "Open sample workspace" });
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
  }
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible({ timeout: convexWriteTimeout });
}

test("marketing front page routes to product pages and the live app", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /The All-in-One CRM Built for Outdoor Professionals/i })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/signin");
  await expect(page.getByRole("link", { name: "Book a Demo" }).first()).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("heading", { name: "Follow a customer from first call to profitable renewal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Live Sample" })).toHaveAttribute("href", "/app?demo=established");
  await expect(page.getByRole("link", { name: "Open leads in the live sample" })).toHaveAttribute("href", "/app?demo=established&view=lead_ops");

  await page.goto("/lead-ops");
  await expect(page.getByRole("link", { name: "Open Lead Ops" })).toHaveAttribute("href", "/app?demo=established&view=lead_ops");

  await page.goto("/features");
  await expect(page.getByRole("heading", { name: /Powerful Features/i })).toBeVisible();
  await expect(page.getByText("Drag-and-drop scheduling")).toBeVisible();
  await expect(page.getByText("One-click invoicing")).toBeVisible();

  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "Sign in, then launch the workspace" })).toBeVisible();
  await expect(page.getByText("Single sign-in + Convex onboarding")).toBeVisible();
  await expect(page.getByText("10 contacts included").first()).toBeVisible();
  await expect(page.getByText("All-In Pro").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try a guided demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try Start fresh demo", exact: true })).toHaveAttribute("href", "/app?demo=new");
  await expect(page.getByRole("link", { name: "Try 10-contact starter demo", exact: true })).toHaveAttribute("href", "/app?demo=starter");
  await expect(page.getByRole("link", { name: "Try 100-contact operation demo", exact: true })).toHaveAttribute("href", "/app?demo=established");

  await page.goto("/app?demo=new");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByLabel("Demo profile")).toHaveValue("new");
  await expect(page.getByLabel("Demo guide")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Prime Time" })).toHaveCount(0);

  await page.goto("/app?demo=starter");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByLabel("Demo profile")).toHaveValue("starter");
  await expect(page.getByLabel("Demo profile")).toContainText("10-contact starter");
  await openAppView(page, "Customers");
  await expect(page.getByText("10/10 free contacts", { exact: true })).toBeVisible();
  await expect(page.getByText("Free plan contact limit reached", { exact: true })).toBeVisible();

  await page.goto("/app?demo=established");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByLabel("Demo profile")).toHaveValue("established");
  await expect(page.getByLabel("Demo profile")).toContainText("100-contact operation");
  await openAppView(page, "Customers");
  await expect(page.getByText("100 contacts", { exact: true })).toBeVisible();
  await expect(page.getByText("All-In Pro", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View plans" })).toHaveCount(0);

  await page.goto("/signup");
  await expect(page).toHaveURL("/signin");
});

test("loads the operating shell and creates a lead", async ({ page }, testInfo) => {
  const runId = `${testInfo.project.name}-${Date.now()}`;
  const activitySummary = `Called board about north entrance timing ${runId}.`;
  const customerName = `Playwright Home ${runId}`;
  const serviceRequest = `Perimeter pest prevention ${runId}`;
  const repeatServiceRequest = `Repeat irrigation inspection ${runId}`;

  await page.goto("/app");
  await waitForWorkspaceReady(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Global search").fill("Brookside");
  await expect(page.getByText("Brookside HOA").first()).toBeVisible();
  await page.getByLabel("Global search").press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Customers", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brookside HOA" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer Account Workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Contacts" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Properties" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Jobs and estimates" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Invoices and payments" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Notes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Files" })).toBeVisible();
  await expect(page.getByText("Brookside HOA service agreement.pdf")).toBeVisible({ timeout: 15000 });
  await page.getByLabel("Customer activity type").selectOption("call");
  await page.getByLabel("Customer call outcome").selectOption("estimate_requested");
  await page.getByLabel("Customer opportunity impact").selectOption("increase_probability");
  await page.getByLabel("Customer activity summary").fill(activitySummary);
  await page.getByLabel("Customer create follow-up").check();
  const logActivityButton = page.getByRole("button", { name: "Log Activity" });
  await logActivityButton.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
  await expect(logActivityButton).toBeEnabled();
  await logActivityButton.evaluate((element) => (element as HTMLButtonElement).click());
  const callActivitySummary = `Call outcome: Estimate requested. ${activitySummary}`;
  await expect(page.getByText(callActivitySummary, { exact: true })).toBeVisible();
  await expect(page.getByText("Follow up: Call outcome: Estimate requested.", { exact: false })).toBeVisible();
  await page.getByLabel("Repeat service request").fill(repeatServiceRequest);
  await page.getByLabel("Repeat service line").selectOption("irrigation");
  await page.getByLabel("Repeat value").fill("650");
  await page.getByRole("button", { name: "Add Customer Service Request" }).click();
  await expect(page.getByText("Brookside HOA repeat service request added to Pipeline.")).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText(repeatServiceRequest).first()).toBeVisible({ timeout: convexWriteTimeout });

  await openAppView(page, "Customers");
  await expect(page.getByText(/Free plan|All-In Pro/)).toBeVisible();
  const createLeadForm = page.getByRole("form", { name: "Create new lead" });
  await createLeadForm.getByRole("textbox", { name: "Customer", exact: true }).fill(customerName);
  await createLeadForm.getByRole("textbox", { name: "Service request", exact: true }).fill(serviceRequest);
  await createLeadForm.getByLabel("Source").selectOption("Phone");
  await createLeadForm.getByLabel("Call outcome").selectOption("needs_callback");
  await createLeadForm.getByLabel("Call follow-up due days").fill("3");
  await expect(createLeadForm.getByLabel("Create call follow-up")).toBeChecked();
  await createLeadForm.getByLabel("Street").fill("1 Test Street");
  await createLeadForm.getByLabel("City").fill("Foxborough");
  await createLeadForm.getByLabel("Value").fill("1200");
  await createLeadForm.getByLabel("Value").press("Enter");

  await expect(page.getByText(`${customerName} was added to Customers, Leads, and Pipeline.`)).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByRole("heading", { name: customerName })).toBeVisible();
  await expect(page.getByText("Phone intake: Needs callback")).toBeVisible();
  await expect(page.getByText(`Call follow-up: ${serviceRequest}`)).toBeVisible();
  await openAppView(page, "Pipeline");
  await expect(page.getByRole("heading", { name: "Manager pipeline filters and saved views" })).toBeVisible();
  await expect(page.getByText(serviceRequest).first()).toBeVisible();
  await expect(page.getByText(repeatServiceRequest).first()).toBeVisible();
  await expect(page.getByLabel(`Service package for ${serviceRequest}`)).toBeVisible();
  await page.getByLabel(`Service package for ${serviceRequest}`).selectOption({ label: "Mosquito and tick protection package - $780" });
  await page.getByRole("button", { name: `Create quote for ${serviceRequest}` }).click();
  const quoteCreatedMessage = page.getByText(`created for ${serviceRequest} using Mosquito and tick protection package.`, { exact: false });
  await expect(quoteCreatedMessage).toBeVisible({ timeout: convexWriteTimeout });
  const quoteCreatedText = (await quoteCreatedMessage.textContent()) ?? "";
  const createdEstimateNumber = quoteCreatedText.match(/Draft quote (EST-[0-9-]+)/)?.[1];
  expect(createdEstimateNumber).toBeTruthy();
  const quotePackage = page.getByRole("region", { name: `Customer quote package ${createdEstimateNumber}` });
  await expect(quotePackage.getByText("Customer Quote Package")).toBeVisible();
  await expect(quotePackage.getByText("14 days after send")).toBeVisible();
  await expect(quotePackage.getByText("Review scope, pricing, add-ons, and expiration before sending to the customer.")).toBeVisible();
  await quotePackage.getByRole("button", { name: `Send quote ${createdEstimateNumber}` }).click();
  await expect(quotePackage.getByText(`Quote ${createdEstimateNumber} sent to customer with 14-day expiration.`)).toBeVisible({ timeout: convexWriteTimeout });
  await expect(quotePackage.getByText("Customer-facing link ready")).toBeVisible();
  await quotePackage.getByRole("button", { name: `Capture approval ${createdEstimateNumber}` }).click();
  await expect(quotePackage.getByText(`Quote ${createdEstimateNumber} accepted by customer.`)).toBeVisible({ timeout: convexWriteTimeout });
  await expect(quotePackage.getByText("Customer approved")).toBeVisible();
  await expect(quotePackage.getByText("Approved by", { exact: false })).toBeVisible();
  await quotePackage.getByRole("button", { name: `Convert estimate ${createdEstimateNumber} to job` }).click();
  await expect(quotePackage.getByText(`Job ${serviceRequest} created from ${createdEstimateNumber}.`)).toBeVisible({ timeout: convexWriteTimeout });
  await expect(quotePackage.getByText("Operations handoff ready", { exact: false })).toBeVisible();
  await quotePackage.getByRole("button", { name: `Open job ${serviceRequest}` }).click();
  await expect(page.getByRole("heading", { name: serviceRequest })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Job Workspace" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Job phase Sales handoff" })).toContainText("Sales handoff");
  await expect(page.getByRole("group", { name: "Job phase Production visit" })).toContainText("Production visit");
  await expect(page.getByText("Files + Comments")).toBeVisible();
  await expect(page.getByText("Workspace Timeline")).toBeVisible();
  await expect(page.getByRole("group", { name: /Job timeline Phase:/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm schedule and crew" })).toBeVisible();
  await expect(page.getByText("Confirm approved estimate scope").first()).toBeVisible();
  await expect(page.getByText("Record product and EPA label").first()).toBeVisible();
  const internalTaskTitle = `Order mosquito material ${runId}`;
  await page.getByLabel("Job task title").fill(internalTaskTitle);
  await page.getByLabel("Job task owner").selectOption({ label: "Justin Abrams" });
  await page.getByLabel("Job task due days").fill("3");
  await page.getByLabel("Job task priority").selectOption("high");
  await page.getByRole("button", { name: "Add Task" }).click();
  const internalTaskRow = page.getByRole("button", { name: new RegExp(internalTaskTitle) }).first();
  await expect(internalTaskRow).toBeVisible({ timeout: 15000 });
  await expect(internalTaskRow).toContainText("Justin Abrams");
  await expect(internalTaskRow).toContainText("High");
  const changeOrderTitle = `Playwright change order ${runId}`;
  await expect(page.getByRole("heading", { name: "Change Orders" })).toBeVisible();
  await page.getByLabel("Change order title").fill(changeOrderTitle);
  await page.getByLabel("Change order scope").fill("Customer added extra perimeter treatment while the job was active.");
  await page.getByLabel("Change order requested by").fill(customerName);
  await page.getByLabel("Change order revenue delta").fill("475");
  await page.getByLabel("Change order cost delta").fill("180");
  await page.getByLabel("Change order schedule impact days").fill("2");
  await page.getByRole("button", { name: "Create Change Order" }).click();
  await expect(page.getByText(`Change order ${changeOrderTitle} created for customer approval.`)).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText(changeOrderTitle).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve Change Order" }).first().click();
  await expect(page.getByText(`Change order ${changeOrderTitle} approved and scheduling task created.`)).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText(`Schedule approved change order: ${changeOrderTitle}`).first()).toBeVisible();
  await openAppView(page, "Pipeline");
  await page.getByRole("button", { name: "All Open" }).click();
  await page.getByLabel("Pipeline source filter").selectOption("Repeat customer");
  await page.getByLabel("Pipeline service filter").selectOption("irrigation");
  await page.getByLabel("Pipeline minimum value").fill("500");
  await expect(page.getByText(repeatServiceRequest).first()).toBeVisible();
  await expect(page.getByText(serviceRequest)).toHaveCount(0);
  await page.getByLabel("Pipeline source filter").selectOption("Phone");
  await page.getByLabel("Pipeline service filter").selectOption("pest_control");
  await expect(page.getByText(serviceRequest).first()).toBeVisible();
  await page.getByRole("button", { name: "Hot Estimates" }).click();
  await expect(page.getByLabel("Pipeline probability filter")).toHaveValue("high");

  await openAppView(page, "Leads");
  await page.getByPlaceholder("Lead, customer, city, source").fill(customerName);
  await expect(page.getByText(serviceRequest).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lead Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Duplicate Review Queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review duplicate" }).first()).toBeVisible();
  await expect(page.getByText("Estimate readiness")).toBeVisible();
  await expect(page.getByText("Source win rate")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stale Follow-Up Queue" })).toBeVisible();
  await page.getByRole("button", { name: "Run Stale Lead Check" }).click();
  await expect(page.getByText(/\d+ stale leads? flagged for follow-up\./)).toBeVisible();

  await expect(page.getByText("Lead Import Center")).toBeVisible();
  await page.getByLabel("Upload Lead Ops import CSV").setInputFiles({
    name: "lead-ops-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Customer,Email,Phone,Street,City,State,Zip,Service,Source",
        `Lead Ops Import ${runId},leadops-${runId}@example.com,,8 Lead Street,Foxborough,MA,02035,Lawn,CSV`,
        `Lead Ops Review ${runId},,,9 Lead Street,Mansfield,MA,02048,Pest,CSV`,
        `Lead Ops Blocked ${runId},leadops-blocked-${runId}@example.com,(508) 555-0198,10 Lead Street,Boston,MA,02108,Pest,CSV`,
      ].join("\n"),
    ),
  });
  await expect(page.getByText("lead-ops-import.csv", { exact: true })).toBeVisible();
  await expect(page.getByText(`Row 2 - Lead Ops Import ${runId}`)).toBeVisible();
  await expect(page.getByText(`Row 4 - Lead Ops Blocked ${runId}`)).toBeVisible();
  await expect(page.getByText("Outside service territory")).toBeVisible();
  await expect(page.getByText("Lead Ops import job saved", { exact: false })).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByRole("button", { name: "Commit Lead Ops Ready Rows" })).toBeEnabled();
  await page.getByRole("button", { name: "Commit Lead Ops Ready Rows" }).click();
  await expect(page.getByText("1 rows imported, 1 skipped, 1 failed.")).toBeVisible({ timeout: convexWriteTimeout });

  const webLeadName = `Web Form Lead ${runId}`;
  await expect(page.getByText("Web Form Intake")).toBeVisible();
  await page.getByLabel("Web customer").fill(webLeadName);
  await page.getByLabel("Web email").fill(`marketing@${runId}.example`);
  await page.getByLabel("Web street").fill("88 Landing Page Lane");
  await page.getByLabel("Web city").fill("Foxborough");
  await page.getByLabel("Web ZIP").fill("02035");
  await page.getByLabel("Web service").selectOption("lawn_care");
  await page.getByLabel("Web campaign").fill(`Spring PPC ${runId}`);
  await page.getByLabel("Web source detail").fill("Google Ads");
  await page.getByLabel("Web message").fill("We generate leads and you can unsubscribe from this business opportunity.");
  await page.getByRole("button", { name: "Submit Web Lead" }).click();
  await expect(page.getByText(`${webLeadName} captured from web form`, { exact: false })).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText("spam score", { exact: false })).toBeVisible();
  await page.getByPlaceholder("Lead, customer, city, source").fill(webLeadName);
  await expect(page.getByText(`Lawn care request from ${webLeadName}`).first()).toBeVisible({ timeout: convexWriteTimeout });
});

test("dispatch surfaces route confidence and crew risk", async ({ page }) => {
  await page.goto("/app");
  await waitForWorkspaceReady(page);
  await openAppView(page, "Dispatch");

  await expect(page.getByText("Route confidence").first()).toBeVisible();
  await expect(page.getByText(/weather application risk|No routing warnings|Crew skill mismatch/).first()).toBeVisible();
  const brooksideCrewSelect = page.getByLabel("Assign crew for Brookside six-step season");
  await expect(brooksideCrewSelect).toBeVisible();
  await brooksideCrewSelect.selectOption({ label: "Bravo Pest" });
  await expect(brooksideCrewSelect.locator("option:checked")).toHaveText("Bravo Pest", { timeout: convexWriteTimeout });
  await page.getByRole("button", { name: "Move route stop down for Brookside six-step season" }).click();
  await expect(page.getByText("Brookside six-step season moved later in route order.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recurring Route Generator" })).toBeVisible();
  await page.getByLabel("Recurring job").selectOption({ label: "Northgate weekly maintenance" });
  await page.getByLabel("Recurring frequency").selectOption("weekly");
  await page.getByLabel("Recurring visit count").fill("3");
  await page.getByLabel("Recurring visit duration minutes").fill("180");
  await page.getByLabel("Recurring crew").selectOption({ label: "Charlie Maintenance" });
  await page.getByRole("button", { name: "Generate Recurring Route" }).click();
  await expect(page.getByText("Generated 3 Weekly visits for Northgate weekly maintenance.")).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText("Northgate weekly maintenance weekly route").first()).toBeVisible();
  await expect(page.getByText("3 generated").first()).toBeVisible();

  await openAppView(page, "Calendar");
  await expect(page.getByText("Service planner", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Day", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visit", exact: true }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule visit" });
  await expect(scheduleDialog).toBeVisible();
  await scheduleDialog.getByRole("button", { name: "Recurring", exact: true }).click();
  await scheduleDialog.getByRole("combobox", { name: "Customer job" }).selectOption({ label: "Northgate Industrial Park - Northgate weekly maintenance" });
  await scheduleDialog.getByRole("combobox", { name: "Cadence" }).selectOption("biweekly");
  await scheduleDialog.getByRole("combobox", { name: "Visits" }).selectOption("4");
  await scheduleDialog.getByRole("combobox", { name: "Crew" }).selectOption({ label: "Charlie Maintenance" });
  await scheduleDialog.getByRole("button", { name: "Create recurring visits" }).click();
  await expect(scheduleDialog.getByText("4 recurring visits added.", { exact: true })).toBeVisible({ timeout: convexWriteTimeout });
  await expect(scheduleDialog.getByLabel("Active service cadences").getByText("Every 2 weeks", { exact: true }).first()).toBeVisible();
  await scheduleDialog.getByRole("button", { name: "Close drawer" }).click();
  await expect(page.getByText("Northgate Industrial Park").first()).toBeVisible();
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("class", /bg-white/);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByText("Mon", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("button", { name: "Agenda", exact: true })).toHaveAttribute("class", /bg-white/);

  await openAppView(page, "Job costing");
  await expect(page.getByRole("heading", { name: "Service Package Picker" })).toBeVisible();
  await expect(page.getByLabel("Service package")).toBeVisible();
  await page.getByLabel("Service package").selectOption({ label: "Mosquito and tick protection package" });
  await expect(page.getByText("Seasonal barrier program with chemical", { exact: false })).toBeVisible();
  await expect(page.getByText("Labor").first()).toBeVisible();
  await expect(page.getByText("Materials").first()).toBeVisible();
  await expect(page.getByText("Equipment").first()).toBeVisible();
  await expect(page.getByText("Checklist defaults", { exact: true })).toBeVisible();
  await expect(page.getByText("Target margin").first()).toBeVisible();
  await expect(page.getByText("Package margin").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fertilization Pricing Calculator" })).toBeVisible();
  await expect(page.getByLabel("Fertilization property")).toBeVisible();
  await expect(page.getByLabel("Fertilization turf area")).toContainText("Common turf zones");
  await page.getByLabel("Fertilization turf area").selectOption({ label: "Common turf zones - 55,000 sq ft" });
  await page.getByLabel("Fertilization applications").fill("6");
  await page.getByLabel("Fertilization material rate").fill("0.008");
  await page.getByLabel("Fertilization target margin").fill("42");
  await expect(page.getByText("Recommended price")).toBeVisible();
  await expect(page.getByText("Margin Scenario Builder")).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Low close-rate scenario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Target margin scenario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Premium service scenario" })).toBeVisible();
  await page.getByRole("button", { name: "Select Premium service scenario" }).click();
  await expect(page.getByText("Estimate line-item preview")).toBeVisible();
  await expect(page.getByText("6-step fertilization program").first()).toBeVisible();
  await expect(page.getByText("Price rules", { exact: true })).toBeVisible();
  await expect(page.getByText("Large turf production complexity")).toBeVisible();
  await page.getByRole("button", { name: "Save Selected Scenario" }).click();
  await expect(page.getByText("Fertilization price session saved", { exact: false })).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByRole("heading", { name: "Estimate Approval Queue" })).toBeVisible();
  await expect(page.getByText("Approval required").first()).toBeVisible();
  await expect(page.getByText("Risk reasons").first()).toBeVisible();
  await expect(page.getByText("Low margin").first()).toBeVisible();
  const approveEstimateButton = page.getByRole("button", { name: "Approve estimate EST-1024" }).first();
  await expect(approveEstimateButton).toBeEnabled();
  await approveEstimateButton.click();
  await expect(approveEstimateButton).toBeDisabled({ timeout: convexWriteTimeout });
  await expect(page.getByLabel("Pending approvals 0")).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByRole("heading", { name: "Margin Guardrails" })).toBeVisible();
  await expect(page.getByText("Price lift needed")).toBeVisible();
  await expect(page.getByText("Guardrail").first()).toBeVisible();
});

test("financials expose owner analytics and settings expose workspace controls", async ({ page }, testInfo) => {
  const inviteEmail = `invite-${testInfo.project.name}-${Date.now()}@example.com`;
  const serviceName = `Playwright pest bundle ${testInfo.project.name}-${Date.now()}`;
  const laborRole = `Playwright Crew Lead ${testInfo.project.name}-${Date.now()}`;
  const vendorName = `Playwright Supplier ${testInfo.project.name}`;
  const vendorItem = `Playwright 19-0-6 ${testInfo.project.name}-${Date.now()}`;
  const workflowLabel = `Playwright Follow-Up ${testInfo.project.name}-${Date.now()}`;

  await page.goto("/app");
  await waitForWorkspaceReady(page);

  await openAppView(page, "Financials");
  await expect(page.getByText("Owner Unit Economics")).toHaveCount(0);
  await expect(page.getByText("Churn Analysis")).toHaveCount(0);
  await expect(page.getByText("LTV by Segment")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "P&L Snapshot" })).toBeVisible();
  await expect(page.getByText("Cost Breakdown").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Service-Line Profitability" })).toBeVisible();
  const serviceLineRow = page.getByRole("group", { name: /Service line profitability/ }).first();
  await expect(serviceLineRow).toContainText("Revenue");
  await expect(serviceLineRow).toContainText("Profit");
  await expect(page.getByRole("heading", { name: "Invoice Builder" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment Entry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AR Aging Review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer Profitability Profiles" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Customer profitability/ }).first()).toContainText(/Current|Open AR|Past due/);
  await page.getByLabel("Payment amount").fill("5");
  await page.getByLabel("Payment reference").fill(`PW-${testInfo.project.name}-${Date.now()}`);
  await page.getByRole("button", { name: "Record Payment" }).click();
  await expect(page.getByText("Payment queued for", { exact: false })).toBeVisible();

  await openAppView(page, "Retention");
  await expect(page.getByText("Churn by segment").first()).toBeVisible();
  await expect(page.getByText("LTV analysis").first()).toBeVisible();

  await openAppView(page, "Cost intelligence");
  await expect(page.getByRole("heading", { name: "External weather and market signals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Labor Override" })).toHaveCount(0);

  await openAppView(page, "Settings");
  await expect(page.getByRole("heading", { name: "Labor Override" })).toBeVisible();
  await page.getByLabel("Labor rate role").fill(laborRole);
  await page.getByLabel("Labor cost per hour").fill("42");
  await page.getByLabel("Labor billable per hour").fill("92.00");
  await page.getByRole("button", { name: "Save Rate" }).click();
  await expect(page.getByText(`Labor rate ${laborRole} saved.`)).toBeVisible();
  const laborRateRow = page.getByRole("group", { name: `Labor rate ${laborRole}` });
  await expect(laborRateRow).toContainText("$42 cost", { timeout: convexWriteTimeout });
  await expect(laborRateRow).toContainText("$92 billable");
  await page.getByLabel("Vendor catalog supplier").fill(vendorName);
  await page.getByLabel("Vendor catalog item name").fill(vendorItem);
  await page.getByLabel("Vendor catalog category").selectOption("lawn_care");
  await page.getByLabel("Vendor catalog unit").fill("bag");
  await page.getByLabel("Vendor catalog cost per unit").fill("58");
  await page.getByRole("button", { name: "Save Item" }).click();
  await expect(page.getByText(`Vendor item ${vendorItem} saved.`)).toBeVisible();
  const vendorRow = page.getByRole("group", { name: `Vendor catalog item ${vendorItem}` });
  await expect(vendorRow).toContainText(vendorName, { timeout: convexWriteTimeout });
  await expect(vendorRow).toContainText("$58 / bag");

  await expect(page.getByRole("heading", { name: "Tenant settings, permissions, crews, and catalog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Owner chart pack for churn, LTV, P&L, and costs" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "P&L Snapshot" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tag Taxonomy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lead Quality Thresholds" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workflow Status Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Service Catalog" })).toBeVisible();
  const workflowStatusRow = page.getByRole("group", { name: "Workflow status follow_up" });
  await page.getByLabel("Workflow status code").selectOption("follow_up");
  await page.getByLabel("Workflow status label").fill(workflowLabel);
  await page.getByLabel("Workflow status color").fill("#0f766e");
  await page.getByLabel("Workflow status order").fill("4");
  await page.getByLabel("Workflow status terminal").uncheck();
  await page.getByLabel("Workflow status active").check();
  await page.getByRole("button", { name: "Save Workflow Status" }).click();
  await expect(page.getByText(`Workflow status ${workflowLabel} saved.`)).toBeVisible();
  await expect(workflowStatusRow).toContainText(workflowLabel, { timeout: convexWriteTimeout });
  await expect(workflowStatusRow).toContainText("order 4");
  await page.getByLabel("Audit search").fill(workflowLabel);
  await page.getByLabel("Audit entity filter").selectOption("organization");
  await expect(page.getByLabel("Audit action filter")).toContainText("workflow_status.update", { timeout: convexWriteTimeout });
  await page.getByLabel("Audit action filter").selectOption("workflow_status.update");
  const workflowAudit = page.getByRole("group", { name: `Audit event workflow_status.update Updated workflow status ${workflowLabel}` });
  await expect(workflowAudit).toContainText("Admin", { timeout: convexWriteTimeout });
  await expect(workflowAudit).toContainText("Organization", { timeout: convexWriteTimeout });
  await page.getByLabel("Catalog service name").fill(serviceName);
  await page.getByLabel("Catalog service category").selectOption("pest_control");
  await page.getByLabel("Catalog service unit").fill("quarter");
  await page.getByLabel("Catalog service price").fill("549");
  await page.getByLabel("Catalog service active").check();
  await page.getByRole("button", { name: "Create Service" }).click();
  await expect(page.getByText(`Service ${serviceName} saved to catalog.`)).toBeVisible({ timeout: convexWriteTimeout });
  const serviceRow = page.getByRole("group", { name: `Service catalog item ${serviceName}` });
  await expect(serviceRow).toContainText("Pest control");
  await expect(serviceRow).toContainText("$549");
  await page.getByLabel("Audit search").fill(serviceName);
  await page.getByLabel("Audit entity filter").selectOption("service_catalog_item");
  await expect(page.getByLabel("Audit action filter")).toContainText("demo.catalog.create", { timeout: convexWriteTimeout });
  await page.getByLabel("Audit action filter").selectOption("demo.catalog.create");
  const serviceAudit = page.getByRole("group", { name: `Audit event demo.catalog.create Created service ${serviceName}` });
  await expect(serviceAudit).toContainText("Demo/Admin", { timeout: convexWriteTimeout });
  await expect(serviceAudit).toContainText("Service Catalog Item", { timeout: convexWriteTimeout });
  await expect(serviceAudit).toContainText("System / automation", { timeout: convexWriteTimeout });
  await page.getByLabel("Invite email").fill(inviteEmail);
  await page.getByLabel("Invite name").fill("E2E Dispatcher");
  await page.getByLabel("Invite role").selectOption("dispatcher");
  await page.getByRole("button", { name: "Send Invite" }).click();
  await expect(page.getByText(`Invitation queued for ${inviteEmail}.`)).toBeVisible();

  const inviteCard = page.getByRole("group", { name: `Member ${inviteEmail}` });
  await expect(inviteCard).toContainText(inviteEmail);
  await expect(inviteCard).toContainText("invited");
  await page.getByLabel("Audit search").fill(inviteEmail);
  await page.getByLabel("Audit entity filter").selectOption("organization");
  await expect(page.getByLabel("Audit action filter")).toContainText("member.invite", { timeout: convexWriteTimeout });
  await page.getByLabel("Audit action filter").selectOption("member.invite");
  const inviteAudit = page.getByRole("group", { name: `Audit event member.invite Invited ${inviteEmail} as dispatcher` });
  await expect(inviteAudit).toContainText("Admin", { timeout: convexWriteTimeout });
  await expect(inviteAudit).toContainText("Organization", { timeout: convexWriteTimeout });
  await inviteCard.getByRole("button", { name: "Expire Invite" }).click();
  await expect(inviteCard).toContainText("expired");
  await inviteCard.getByRole("button", { name: "Revoke Invite" }).click();
  await expect(inviteCard).toContainText("revoked");
});

test("mobile field screen can complete checklist items", async ({ page }, testInfo) => {
  const issueSummary = `Quarterly mosquito upsell ${testInfo.project.name}-${Date.now()}`;
  await page.goto("/app");
  await waitForWorkspaceReady(page);
  await openAppView(page, "Field");
  const fieldScope = page.getByLabel("Field login scope");
  await expect(fieldScope).toContainText("Field technician login");
  await expect(page.getByLabel("Field session role")).toHaveValue("technician");
  await expect(fieldScope).toContainText("Assigned crew only");
  await expect(fieldScope).toContainText(/Visible visits/);
  await page.getByLabel("Field session role").selectOption("dispatcher");
  await expect(fieldScope).toContainText("All visits");
  await page.getByLabel("Field session role").selectOption("technician");
  await expect(fieldScope).toContainText("Assigned crew only");
  await expect(page.getByText("Weather application rules")).toBeVisible();
  await expect(page.getByText("Material / chemical lot")).toBeVisible();
  await expect(page.getByText("Equipment checkout")).toBeVisible();
  await expect(page.getByText("Compliance record", { exact: true })).toBeVisible();
  await expect(page.getByText("Issue capture")).toBeVisible();
  await expect(page.getByText(/Stop \d+/).first()).toBeVisible();
  await page.getByRole("button").filter({ hasText: /Scheduled|On site|En route/ }).first().click();
  await expect(page.getByText(/Route stop \d+/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Maps/ })).toHaveAttribute("href", /google\.com\/maps/);
  await expect(page.getByText("Property notes / hazards")).toBeVisible();
  await expect(page.getByText("Scope notes")).toBeVisible();
  await expect(page.getByText("Customer contact")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Visit" })).toBeEnabled();
  await page.getByRole("button", { name: "Start Visit" }).click();
  await expect(page.getByText("Visit started with manual time confirmation.")).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText("On site").first()).toBeVisible();
  await expect(page.getByLabel("Material product")).toBeVisible();
  await page.getByLabel("Material quantity").fill("1.5");
  await page.getByLabel("Material application notes").fill("Applied to target area from field workflow.");
  await page.getByRole("button", { name: "Add Material Use" }).click();
  await expect(page.getByText("material use queued", { exact: false })).toBeVisible();
  const upsellPreset = page.getByRole("button", { name: "Upsell opportunity", exact: true });
  await expect(upsellPreset).toBeVisible();
  await upsellPreset.click();
  await expect(page.getByLabel("Issue category")).toHaveValue("upsell_opportunity");
  await page.getByLabel("Issue summary").fill(issueSummary);
  await page.getByLabel("Issue details").fill("Customer asked about a quarterly mosquito and tick program from the field visit.");
  await page.getByLabel("Issue estimated value").fill("675");
  await page.getByRole("button", { name: /^Checklist / }).first().click();
  await page.getByRole("button", { name: "Submit Visit" }).click();
  await expect(page.getByText("Visit submitted with 1 material record and issue follow-up.")).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByText("Complete").first()).toBeVisible();
  await page.getByRole("button", { name: "Generate Compliance Record" }).click();
  await expect(page.getByText("Compliance record generated", { exact: false })).toBeVisible({ timeout: convexWriteTimeout });
  await expect(page.getByRole("group", { name: /Compliance record CMP-/ }).first()).toContainText(/EPA|Missing/);
  await openAppView(page, "Pipeline");
  await expect(page.getByText(`Field upsell: ${issueSummary}`).first()).toBeVisible();
});

test("tenant navigation hides platform provisioning and supports module deep links", async ({ page }) => {
  await page.goto("/app");
  await waitForWorkspaceReady(page);
  await expect(page.getByRole("button", { name: "Company setup" })).toHaveCount(0);

  await page.goto("/app?demo=established&view=estimates");
  await expect(page.getByRole("heading", { name: "Estimates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estimate workbench" })).toBeVisible();

  await page.goto("/app?demo=established&view=lead_ops");
  await expect(page.getByRole("heading", { name: "Leads", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lead command table" })).toBeVisible();
  await page.getByRole("button", { name: "Prepare Estimate" }).click();
  await expect(page.getByRole("heading", { name: "Estimates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer estimate workbench" })).toBeVisible();
});

test("book a demo submits a simple request form", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Book a Turf Pro CRM demo" })).toBeVisible();
  await page.getByLabel("Your name").fill("Jordan Green");
  await page.getByLabel("Company").fill("Greenline Services");
  await page.getByLabel("Work email").fill("jordan@example.com");
  await page.getByLabel("Primary business").selectOption({ label: "Multi-service" });
  await page.getByLabel("Team size").selectOption({ label: "6-20 people" });
  await page.getByRole("button", { name: "Submit demo request" }).click();
  await expect(page.getByRole("heading", { name: "Request submitted" })).toBeVisible();
  await expect(page.getByText("Thanks, Jordan Green.")).toBeVisible();
});
