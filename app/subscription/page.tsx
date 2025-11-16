"use client";

import { useState } from "react";
import { plans } from "@/lib/subscriptions";

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  async function selectPlan(planId: string) {
    setLoading(true);
    setSelectedPlan(planId);

    await fetch("/api/subscription/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: planId }),
    });

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-6">
      <h1 className="text-3xl font-semibold">Engineerit Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`
                relative border rounded-2xl p-6 transition-all
                ${plan.active ? "border-blue-500" : "border-gray-400 opacity-60"}
                ${isSelected ? "bg-blue-50 border-blue-600 shadow-lg" : ""}
              `}
            >
              {/* COMING SOON OVERLAY */}
              {!plan.active && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <span className="bg-white/90 text-gray-800 px-4 py-1 rounded-lg text-sm font-semibold shadow">
                    COMING SOON
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="text-gray-600">{plan.description}</p>

              <p className="mt-4 text-2xl font-bold">
                {plan.price === 0 ? "Free" : `${plan.price} SAR / mo`}
              </p>

              {plan.active ? (
                <button
                  onClick={() => selectPlan(plan.id)}
                  className={`
                    mt-4 w-full py-2 rounded-xl text-white transition
                    ${loading && isSelected ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}
                  `}
                >
                  {loading && isSelected ? "Saving..." : isSelected ? "Selected ✓" : "Select"}
                </button>
              ) : (
                <button
                  disabled
                  className="mt-4 w-full bg-gray-400 text-white py-2 rounded-xl cursor-not-allowed"
                >
                  Coming Soon
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
