// lib/subscriptions.ts

export const plans = [
  {
    id: "assistant",
    name: "Assistant Engineer",
    description: "Basic access to Engineerit AI",
    price: 0,          // Free
    active: true,
  },
  {
    id: "engineer",
    name: "Engineer",
    description: "More AI power and extended limits",
    price: 19,         // 19 SAR / month
    active: true,
  },
  {
    id: "pro",
    name: "Professional Engineer",
    description: "Advanced AI tools and design checks",
    price: 41,         // 41 SAR / month
    active: true,
  },
  {
    id: "consultant",
    name: "Consultant Engineer",
    description: "Full professional suite for consultants. PMO Advisor included.",
    price: 99,         // 99 SAR / month
    active: true,
  },
  {
    id: "team",
    name: "Team",
    description: "5 seats with Consultant-tier tools. Extra seat SAR 89 / month. PMO and Program Assurance included.",
    price: 499,
    active: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "SAR 3,900 / month for 10 seats. Extra seat SAR 299 / month. All four advisors included. Paid with Moyasar.",
    price: 3900,
    active: true,
  },
];
