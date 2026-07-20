"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import GoogleAnalyticsUserTracker from "@/components/google-analytics-user-tracker";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <GoogleAnalyticsUserTracker />
      {children}
    </GoogleOAuthProvider>
  );
}