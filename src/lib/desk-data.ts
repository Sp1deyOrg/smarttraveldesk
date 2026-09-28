import type { Escalation, PolicyException } from "./types";

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const COMPANY_GSTIN = "29AABCT1234F1ZP";
export const DESK_USER = "Anita Rao (Travel Desk)";
export const MONTH_BUDGET_INR = 4_200_000;
export const MONTH_SPEND_BASE_INR = 2_870_000;

export const INITIAL_ESCALATIONS: Escalation[] = [
  {
    id: "esc-1",
    tripId: "TRV-2503",
    kind: "fare",
    title: "Fare jumped above policy",
    detail: "IndiGo 6E-2134 rose from ₹7,450 to ₹11,900 after the hold expired. The cheapest compliant flight lands after the 10:00 meeting.",
    createdAt: minsAgo(35),
    slaMins: 120,
    status: "open",
  },
  {
    id: "esc-2",
    tripId: "TRV-2516",
    kind: "hotel",
    title: "No hotel under the ₹6,000 cap near Salt Lake Sector V",
    detail: "Conference week in Kolkata. Nearest compliant room is 14 km away; closest option is ₹7,200/night.",
    createdAt: minsAgo(90),
    slaMins: 240,
    status: "open",
  },
  {
    id: "esc-3",
    tripId: "TRV-2492",
    kind: "booking",
    title: "Hotel booking failed at Novotel HICC",
    detail: "Payment gateway timed out twice. Room is on a 45-minute soft hold.",
    createdAt: minsAgo(50),
    slaMins: 60,
    status: "open",
  },
  {
    id: "esc-4",
    tripId: "TRV-2481",
    kind: "assistance",
    title: "Special assistance at Mumbai T2",
    detail: "Traveller requested meet-and-assist and a front-row seat for a back injury. Airline needs a manual request.",
    createdAt: minsAgo(20),
    slaMins: 180,
    status: "open",
  },
  {
    id: "esc-5",
    tripId: "TRV-2510",
    kind: "sameday",
    title: "Same-day change: return moved to 17:30",
    detail: "Client shortened the plant walkthrough. Agent cannot change a non-refundable fare without desk override.",
    createdAt: minsAgo(10),
    slaMins: 45,
    status: "open",
  },
];

export const INITIAL_EXCEPTIONS: PolicyException[] = [
  {
    id: "x-1",
    tripId: "TRV-2503",
    title: "Taj Palace New Delhi at ₹10,400/night (cap ₹8,000)",
    justification: "The client offsite is hosted inside Taj Palace. Compliant hotels are 7+ km away through Diplomatic Enclave traffic.",
    policyCostINR: 16000,
    requestedCostINR: 20800,
    recommendation: "Approve: saves about 2 hours of commuting over two days; ₹4,800 over policy.",
    agentRecommends: "approve",
    createdAt: minsAgo(140),
    status: "pending",
  },
  {
    id: "x-2",
    tripId: "TRV-2510",
    title: "Booking 3 days before departure (policy: 5 days)",
    justification: "The client confirmed the plant walkthrough date only yesterday.",
    policyCostINR: 14200,
    requestedCostINR: 16800,
    recommendation: "Approve: late notice was caused by the client; fare is the lowest available now.",
    agentRecommends: "approve",
    createdAt: minsAgo(65),
    status: "pending",
  },
  {
    id: "x-3",
    tripId: "TRV-2516",
    title: "SUV cab for Kolkata airport transfers",
    justification: "Carrying demo equipment in two large cases.",
    policyCostINR: 2400,
    requestedCostINR: 3900,
    recommendation: "Reject: a sedan with a large boot fits two cases; the agent can book Sedan XL for ₹2,700.",
    agentRecommends: "reject",
    createdAt: minsAgo(30),
    status: "pending",
  },
];

export interface Invoice {
  id: string;
  invoiceNo: string;
  vendor: string;
  type: "Airline" | "Hotel" | "Cab";
  tripId: string;
  bookingRef: string;
  bookedINR: number;
  invoicedINR: number;
  gstINR: number;
  gstin: string | null;
}

export const INVOICES: Invoice[] = [
  { id: "i1", invoiceNo: "6E/24/88213", vendor: "IndiGo", type: "Airline", tripId: "TRV-2481", bookingRef: "PNR K7Q2LM", bookedINR: 9850, invoicedINR: 9850, gstINR: 492, gstin: COMPANY_GSTIN },
  { id: "i2", invoiceNo: "TJ-MUM-5521", vendor: "Taj Lands End", type: "Hotel", tripId: "TRV-2481", bookingRef: "TAJ-77120", bookedINR: 15600, invoicedINR: 15600, gstINR: 1872, gstin: COMPANY_GSTIN },
  { id: "i3", invoiceNo: "NOV-HYD-0932", vendor: "Novotel HICC", type: "Hotel", tripId: "TRV-2492", bookingRef: "NOV-44810", bookedINR: 13800, invoicedINR: 14700, gstINR: 1764, gstin: COMPANY_GSTIN },
  { id: "i4", invoiceNo: "UBR-IN-77412", vendor: "Uber for Business", type: "Cab", tripId: "TRV-2492", bookingRef: "CAB-2201", bookedINR: 1180, invoicedINR: 1180, gstINR: 59, gstin: COMPANY_GSTIN },
  { id: "i5", invoiceNo: "UBR-IN-77412", vendor: "Uber for Business", type: "Cab", tripId: "TRV-2492", bookingRef: "CAB-2201", bookedINR: 1180, invoicedINR: 1180, gstINR: 59, gstin: COMPANY_GSTIN },
  { id: "i6", invoiceNo: "HYT-CHN-3310", vendor: "Hyatt Regency Chennai", type: "Hotel", tripId: "TRV-2455", bookingRef: "HYT-90213", bookedINR: 12400, invoicedINR: 12400, gstINR: 1488, gstin: null },
  { id: "i7", invoiceNo: "AI/24/551902", vendor: "Air India", type: "Airline", tripId: "TRV-2455", bookingRef: "PNR Z3RT8K", bookedINR: 7650, invoicedINR: 7650, gstINR: 383, gstin: COMPANY_GSTIN },
  { id: "i8", invoiceNo: "SAV-5519", vendor: "Savaari", type: "Cab", tripId: "TRV-2455", bookingRef: "CAB-1893", bookedINR: 1050, invoicedINR: 1350, gstINR: 68, gstin: COMPANY_GSTIN },
];

export interface OtherTraveller {
  id: string;
  name: string;
  department: string;
  city: string;
  lat: number;
  lng: number;
  status: string;
  alert?: string;
}

export const OTHER_TRAVELLERS: OtherTraveller[] = [
  { id: "t1", name: "Arjun Mehta", department: "Sales", city: "Delhi NCR", lat: 28.5562, lng: 77.1, status: "Landed at IGI T3 · cab en route", },
  { id: "t2", name: "Kavya Iyer", department: "Engineering", city: "Chennai", lat: 12.9941, lng: 80.1709, status: "Flight AI-543 cancelled", alert: "Flight cancelled · rebooking needed on next departure" },
  { id: "t3", name: "Rohan Das", department: "Consulting", city: "Hyderabad", lat: 17.4435, lng: 78.3772, status: "At client site, HITEC City" },
  { id: "t4", name: "Neha Kulkarni", department: "Finance", city: "Pune", lat: 18.5793, lng: 73.9089, status: "Boarding 6E-512 to Bengaluru" },
];

export const DEPARTMENT_SPEND: { department: string; spendINR: number; budgetINR: number }[] = [
  { department: "Sales", spendINR: 980000, budgetINR: 1300000 },
  { department: "Engineering", spendINR: 640000, budgetINR: 900000 },
  { department: "Consulting", spendINR: 720000, budgetINR: 1000000 },
  { department: "Finance", spendINR: 310000, budgetINR: 500000 },
  { department: "HR", spendINR: 220000, budgetINR: 500000 },
];
