"use client";
import { Suspense } from "react";
import { Route } from "@/routes/search";

function SearchRoute() { return <Route.component />; }
export default function Page() {
  return <Suspense fallback={<div className="min-h-[45vh]" />}><SearchRoute /></Suspense>;
}
