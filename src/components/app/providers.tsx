"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const demoConvex = new ConvexReactClient("https://turfpro-demo-placeholder.convex.cloud");

function useDisabledConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (!convex && !clerkKey) {
    return <ConvexProviderWithAuth client={demoConvex} useAuth={useDisabledConvexAuth}>{children}</ConvexProviderWithAuth>;
  }

  if (!convex && clerkKey) {
    return <ClerkProvider publishableKey={clerkKey}><ConvexProviderWithAuth client={demoConvex} useAuth={useDisabledConvexAuth}>{children}</ConvexProviderWithAuth></ClerkProvider>;
  }

  if (convex && !clerkKey) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
