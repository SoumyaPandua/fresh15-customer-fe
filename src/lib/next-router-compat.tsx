"use client";

import NextLink from "next/link";
import { usePathname, useRouter as useNextRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, ComponentType, ReactNode } from "react";

type NextLinkProps = ComponentProps<typeof NextLink>;

export type RouteConfig = {
  component?: ComponentType;
  loader?: (ctx: { params: Record<string, string> }) => Promise<unknown> | unknown;
  head?: (...args: any[]) => unknown;
  validateSearch?: unknown;
  [key: string]: unknown;
};

function resolvePath(to: string, params?: Record<string, string | number>) {
  let path = to;
  for (const [key, value] of Object.entries(params ?? {})) {
    path = path.replace(`$${key}`, encodeURIComponent(String(value)));
  }
  return path;
}

type FreshLinkProps = Omit<NextLinkProps, "href"> & {
  to: string;
  params?: Record<string, string | number>;
  search?: Record<string, string | number | undefined | null>;
  children: ReactNode;
};

export function Link({ to, params, search, children, ...props }: FreshLinkProps) {
  let href = resolvePath(to, params);
  if (search) {
    const qs = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
    });
    const query = qs.toString();
    if (query) href += `?${query}`;
  }
  return <NextLink href={href} {...props}>{children}</NextLink>;
}

export function useNavigate() {
  const router = useNextRouter();
  return (target: string | { to: string; params?: Record<string, string | number>; search?: Record<string, string | number | undefined | null> }) => {
    if (typeof target === "string") {
      router.push(target);
      return;
    }
    let href = resolvePath(target.to, target.params);
    if (target.search) {
      const qs = new URLSearchParams();
      Object.entries(target.search).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
      });
      const query = qs.toString();
      if (query) href += `?${query}`;
    }
    router.push(href);
  };
}

export function useLocation() {
  return { pathname: usePathname() ?? "" };
}

export function useRouter() {
  const router = useNextRouter();
  return {
    push: router.push,
    replace: router.replace,
    refresh: router.refresh,
    back: router.back,
    forward: router.forward,
    invalidate: router.refresh,
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  const prefix = segments[0];
  const key = prefix === "category" ? "slug" : prefix === "product" || prefix === "orders" ? "id" : undefined;
  if (key && segments[1]) params[key] = decodeURIComponent(segments[1]);
  return params as T;
}

function parseSearch(searchParams: ReturnType<typeof useSearchParams>) {
  const out: Record<string, string> = {};
  searchParams?.forEach((value, key) => { out[key] = value; });
  return out;
}

export function useSearch<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return parseSearch(useSearchParams()) as T;
}

export function useLoaderData<T>() {
  throw new Error("Route.useLoaderData is not supported in the Next.js migration layer.");
}

export function createFileRoute(_path: string) {
  return (config: RouteConfig) => {
    const route: any = { ...config, component: config.component };
    route.useParams = useParams;
    route.useSearch = useSearch;
    route.useLoaderData = useLoaderData;
    route.useRouteContext = () => ({ queryClient: undefined });
    return route;
  };
}

export const createRootRouteWithContext = createFileRoute;
export const Outlet = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const HeadContent = () => null;
export const Scripts = () => null;

