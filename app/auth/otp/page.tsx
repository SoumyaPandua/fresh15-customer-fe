"use client";
import { Suspense } from "react";
import { Route } from "@/routes/auth.otp";

function OtpRoute() { return <Route.component />; }
export default function Page() {
  return <Suspense fallback={<div className="min-h-[45vh]" />}><OtpRoute /></Suspense>;
}
