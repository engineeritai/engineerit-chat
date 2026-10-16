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
    description: "Full professional suite for consultants",
    price: 79,         // 79 SAR / month
    active: true,
  },
  {
    id: "team",
    name: "Team",
    description: "5 seats with Consultant-tier access. Extra seat SAR 69 / month.",
    price: 349,
    active: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "From SAR 2,500 / month. Quoted, then paid with Moyasar.",
    price: 2500,
    active: true,
  },
];
