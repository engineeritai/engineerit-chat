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
];
