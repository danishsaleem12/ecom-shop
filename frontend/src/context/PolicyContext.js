'use client';

// src/context/PolicyContext.js
// Gives every client component the live shipping / return numbers (loaded once by the root layout from GET /api/config).
//   const { freeShippingThreshold, shippingFee, returnWindowDays } = usePolicy();
import { createContext, useContext } from 'react';
import { POLICY } from '@/lib/policy';

const PolicyContext = createContext(POLICY);

export function PolicyProvider({ value, children }) {
  return <PolicyContext.Provider value={value || POLICY}>{children}</PolicyContext.Provider>;
}

export const usePolicy = () => useContext(PolicyContext);
