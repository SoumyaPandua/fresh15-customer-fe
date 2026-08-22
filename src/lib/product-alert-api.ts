import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authedRequest } from "./cart-api";
import { useAuth } from "./store/auth";

export type ProductAlert = {
  _id: string;
  userId: string;
  productId:
    | string
    | {
        _id: string;
        name?: string;
        slug?: string;
        images?: string[];
        sellingPrice?: number;
        mrp?: number;
        stock?: number;
        unit?: string;
        sku?: string;
      };
  backInStock: boolean;
  priceDrop: boolean;
  targetPrice: number | null;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  lastNotifiedPrice?: number | null;
  lastPriceDropNotifiedAt?: string | null;
  backInStockNotifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductAlertInput = {
  backInStock: boolean;
  priceDrop: boolean;
  targetPrice?: number | null;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

const alertKeys = {
  all: ["product-alerts"] as const,
  list: ["product-alerts", "list"] as const,
  product: (productId: string) =>
    ["product-alerts", "product", productId] as const,
};

async function getProductAlert(
  token: string | null,
  productId: string,
): Promise<ProductAlert | null> {
  const response = await authedRequest<ProductAlert | null>(
    `/api/product-alerts/product/${productId}`,
    { method: "GET" },
    token,
  );

  return response.data ?? null;
}

async function listProductAlerts(
  token: string | null,
): Promise<ProductAlert[]> {
  const response = await authedRequest<ProductAlert[]>(
    "/api/product-alerts",
    { method: "GET" },
    token,
  );

  return Array.isArray(response.data) ? response.data : [];
}

async function saveProductAlert(
  token: string | null,
  productId: string,
  input: ProductAlertInput,
): Promise<ProductAlert> {
  const response = await authedRequest<ProductAlert>(
    `/api/product-alerts/product/${productId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
    token,
  );

  return response.data;
}

async function deleteProductAlert(
  token: string | null,
  productId: string,
): Promise<void> {
  await authedRequest(
    `/api/product-alerts/product/${productId}`,
    { method: "DELETE" },
    token,
  );
}

export function useProductAlert(productId: string) {
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();

  const alertQuery = useQuery({
    queryKey: alertKeys.product(productId),
    queryFn: () => getProductAlert(token, productId),
    enabled: Boolean(token && productId),
    staleTime: 30_000,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (input: ProductAlertInput) =>
      saveProductAlert(token, productId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        alertKeys.product(productId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: alertKeys.list,
      });
      toast.success("Product alerts updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      deleteProductAlert(token, productId),
    onSuccess: () => {
      queryClient.setQueryData(
        alertKeys.product(productId),
        null,
      );
      void queryClient.invalidateQueries({
        queryKey: alertKeys.list,
      });
      toast.success("Product alerts removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    alert: alertQuery.data ?? null,
    isLoading: Boolean(token) && alertQuery.isLoading,
    save,
    remove,
  };
}

export function useProductAlerts() {
  const token = useAuth((state) => state.token);

  return useQuery({
    queryKey: alertKeys.list,
    queryFn: () => listProductAlerts(token),
    enabled: Boolean(token),
    staleTime: 30_000,
    retry: false,
  });
}

export function useRemoveProductAlert(productId: string) {
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      deleteProductAlert(token, productId),
    onSuccess: () => {
      queryClient.setQueryData(
        alertKeys.product(productId),
        null,
      );
      void queryClient.invalidateQueries({
        queryKey: alertKeys.list,
      });
      toast.success("Product alert removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function productIdOfAlert(
  alert: ProductAlert,
): string {
  return typeof alert.productId === "string"
    ? alert.productId
    : alert.productId._id;
}

export function productSnapshotOfAlert(
  alert: ProductAlert,
) {
  return typeof alert.productId === "string"
    ? null
    : alert.productId;
}
