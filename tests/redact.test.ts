import { describe, expect, it } from "vitest";

import { checkBrief, type TripExtraction } from "@/lib/extraction-schema";
import { redactForThirdParty } from "@/server/agents/redact";

describe("redactForThirdParty", () => {
  it("masks email addresses", () => {
    const { text, redactions } = redactForThirdParty(
      "Mail priya.nair+trips@acme-corp.co.in the plan",
    );
    expect(text).toBe("Mail [EMAIL] the plan");
    expect(redactions).toBe(1);
  });

  it("masks Indian mobile numbers in common spellings", () => {
    for (const phone of [
      "9876543210",
      "98765 43210",
      "+91 98765 43210",
      "+919876543210",
      "91-9876543210",
    ]) {
      expect(redactForThirdParty(`call ${phone} today`).text, phone).toBe("call [PHONE] today");
    }
  });

  it("masks numbers written with another country code", () => {
    expect(redactForThirdParty("ring +44 20 7946 0958 after").text).toBe("ring [PHONE] after");
  });

  it("masks a GSTIN and a separate PAN, each under its own label", () => {
    const { text, redactions } = redactForThirdParty(
      "invoice for 29ABCDE1234F1Z5 and PAN ABCDE1234F",
    );
    expect(text).toBe("invoice for [GSTIN] and PAN [PAN]");
    expect(redactions).toBe(2);
  });

  it("masks twelve-digit Aadhaar numbers", () => {
    expect(redactForThirdParty("id 1234 5678 9012 ok").text).toBe("id [ID NUMBER] ok");
  });

  it("leaves a trip request alone: cities, venues, dates and money survive", () => {
    const request =
      "Client review at Infosys campus Mysuru from 12 Oct to 14 Oct 2026, budget Rs 45000, 2026-10-12, 3 nights";
    expect(redactForThirdParty(request)).toEqual({ text: request, redactions: 0 });
  });

  it("does not eat a date that follows a phone number", () => {
    expect(redactForThirdParty("+91 98765 43210 12 Oct").text).toBe("[PHONE] 12 Oct");
  });
});

describe("checkBrief", () => {
  const brief: TripExtraction = {
    destinationCity: "Mysuru",
    startDate: "2026-11-12",
    endDate: "2026-11-14",
    purpose: "Client review",
    meetingVenue: "Infosys campus",
    title: "Client review — Mysuru",
    weightTime: 40,
    weightComfort: 25,
    weightCost: 35,
    notes: "",
    missingFields: [],
  };

  it("returns a good brief as it is", () => {
    expect(checkBrief(brief)).toBe(brief);
  });

  it("accepts a full timestamp, as the rest of the app only reads its date part", () => {
    expect(checkBrief({ ...brief, startDate: "2026-11-12T00:00:00Z" })).toEqual({
      ...brief,
      startDate: "2026-11-12T00:00:00Z",
    });
  });

  it("accepts an empty date, which the card already flags as missing", () => {
    expect(checkBrief({ ...brief, endDate: "" })).toEqual({ ...brief, endDate: "" });
  });

  it("blanks a date that is not a real yyyy-mm-dd and lists it as missing", () => {
    for (const bad of ["next Tuesday", "12/11/2026", "2026-02-30", "2026-13-01", "  "]) {
      const next = checkBrief({ ...brief, startDate: bad, missingFields: ["meetingVenue"] });
      expect(next.startDate, bad).toBe("");
      expect(next.endDate).toBe("2026-11-14");
      expect(next.missingFields).toEqual(["meetingVenue", "startDate"]);
    }
  });

  it("does not list a field twice", () => {
    const next = checkBrief({ ...brief, startDate: "soon", missingFields: ["startDate"] });
    expect(next.missingFields).toEqual(["startDate"]);
  });
});
