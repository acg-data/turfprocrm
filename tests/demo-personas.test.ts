import { describe, expect, it } from "vitest";
import { demoPersonaOptions, getDemoPersonaOption, parseDemoPersona } from "@/data/demo-personas";
import { getDemoWorkspaceForPersona } from "@/data/demo-workspace";

describe("guided demo personas", () => {
  it("exposes the three demo profiles with clear operating limits", () => {
    expect(demoPersonaOptions.map((option) => option.id)).toEqual(["new", "starter", "established"]);
    expect(getDemoPersonaOption("starter").contactCount).toBe(10);
    expect(getDemoPersonaOption("established").contactCount).toBe(100);
  });

  it("parses only supported demo query values", () => {
    expect(parseDemoPersona("new")).toBe("new");
    expect(parseDemoPersona("starter")).toBe("starter");
    expect(parseDemoPersona("established")).toBe("established");
    expect(parseDemoPersona("production")).toBeNull();
    expect(parseDemoPersona(undefined)).toBeNull();
  });

  it("keeps each synthetic workspace isolated at the requested scale", () => {
    const empty = getDemoWorkspaceForPersona("new");
    const starter = getDemoWorkspaceForPersona("starter");
    const established = getDemoWorkspaceForPersona("established");

    expect(empty.contacts).toHaveLength(0);
    expect(empty.customers).toHaveLength(0);
    expect(empty.jobs).toHaveLength(0);
    expect(starter.contacts).toHaveLength(10);
    expect(established.contacts).toHaveLength(100);
    expect(new Set(starter.contacts.map((contact) => contact.customerId)).size).toBe(starter.customers.length);
    expect(starter.invoices.every((invoice) => starter.customers.some((customer) => customer.id === invoice.customerId))).toBe(true);
    expect(established.organization.id).not.toBe(starter.organization.id);
  });
});
