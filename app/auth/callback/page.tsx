"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    // Handle OAuth callback without Supabase
    // Since we're using MySQL-based auth, redirect to login with appropriate message
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      setError("Authentication failed. Please try again.");
      setTimeout(() => router.push("/login"), 3000);
      return;
    }

    if (code) {
      // If we get an OAuth code, we would normally process it here
      // For now, redirect to login with success message
      router.push("/login?message=Please log in with your credentials");
      return;
    }

    // No parameters means direct access - redirect to login
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7F6]">
      {error ? (
        <div className="text-red-600 font-bold p-4 bg-red-100 rounded-lg max-w-sm text-center">
          {error}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#005914] mb-4" />
          <p className="text-[#005914] font-medium text-lg">Processing authentication...</p>
        </div>
      )}
    </div>
  );
}
