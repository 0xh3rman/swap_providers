// packages/types/src/index.ts

/**
 * Represents a user within the system.
 */
export interface User {
    id: string; // Unique identifier for the user
    name: string; // User's full name
    email?: string; // Optional email address
}

/**
 * Represents the result of a swap operation.
 */
export type SwapResult = {
    success: boolean; // Indicates if the swap was successful
    message: string; // A message describing the outcome
}

// Add any other shared types needed across your monorepo here.
// For example:
// export type Product = { sku: string; price: number; };
