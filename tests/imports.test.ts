import { describe, expect, it } from "vitest";
import { parseLeadImportCsv } from "@/domain/imports";

describe("lead import CSV parser", () => {
  it("maps common CSV headers and accepts ready lead rows", () => {
    const rows = parseLeadImportCsv(
      [
        "Customer,Email,Phone,Street,City,State,Zip,Service,Source",
        '"Brookside HOA","board@brookside.example","(508) 555-0148","18 Brookside Way","Foxborough","MA","02035","Mosquito","CSV"',
      ].join("\n"),
      { serviceTerritory: ["Foxborough"], currentContactCount: 0, freeContactLimit: 10 },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      customerName: "Brookside HOA",
      serviceLine: "pest_control",
      mappedEntity: "lead + customer + property",
      status: "ready",
    });
  });

  it("flags duplicates, missing contact data, territory misses, and unknown services", () => {
    const rows = parseLeadImportCsv(
      [
        "Name,Email,Phone,Address,City,Service",
        'Megan Walsh,,,"12 Oak Lane, suite 1",Foxborough,Lawn care',
        "Out of Area Office,office@example.com,(781) 555-0199,44 Long Road,Boston,Unknown thing",
      ].join("\n"),
      {
        serviceTerritory: ["Foxborough"],
        existingContacts: [{ name: "Megan Walsh", phone: "(508) 555-0188" }],
      },
    );

    expect(rows[0].status).toBe("needs_review");
    expect(rows[0].issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["Missing contact method", "Possible duplicate"]));
    expect(rows[1].status).toBe("blocked");
    expect(rows[1].issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["Outside service territory", "Unknown service line"]));
  });

  it("blocks rows that would exceed the free contact cap", () => {
    const rows = parseLeadImportCsv(
      [
        "Customer,Phone,Street,City,Service",
        "Lead 1,(508) 555-0001,1 Test Lane,Foxborough,Lawn",
        "Lead 2,(508) 555-0002,2 Test Lane,Foxborough,Lawn",
      ].join("\n"),
      { currentContactCount: 9, freeContactLimit: 10, serviceTerritory: ["Foxborough"] },
    );

    expect(rows.map((row) => row.status)).toEqual(["ready", "blocked"]);
    expect(rows[1].issues.map((issue) => issue.message)).toContain("Free plan contact cap");
  });
});
