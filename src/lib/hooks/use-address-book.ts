import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addressApi,
  mapAddress,
  toAddressInput,
  type AddressInput,
} from "@/lib/address-api";
import { useAuth } from "@/lib/store/auth";
import { useLocation } from "@/lib/store/location";
import type { Address } from "@/lib/types";

export function useAddressBook() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const local = useLocation();

  const isAuthed = Boolean(token);

  const query = useQuery({
    queryKey: ["addresses"],
    queryFn: async () =>
      (await addressApi.list(token)).data.map(mapAddress),
    enabled: isAuthed,
    staleTime: 30_000,
  });

  const remote = query.data ?? [];

  const addresses: Address[] = isAuthed
    ? remote
    : local.addresses;

  const activeAddressId = isAuthed
    ? remote.find((a) => a.isDefault)?.id ??
      remote[0]?.id ??
      ""
    : local.activeAddressId;

  const addressReady = !isAuthed || !query.isLoading;

  const activeAddress =
    addresses.find((a) => a.id === activeAddressId) ?? null;

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: ["addresses"],
    });

  const createM = useMutation({
    mutationFn: (input: AddressInput) =>
      addressApi.create(token, input),
    onSuccess: invalidate,
  });

  const updateM = useMutation({
    mutationFn: (vars: {
      id: string;
      input: AddressInput;
    }) => addressApi.update(token, vars.id, vars.input),
    onSuccess: invalidate,
  });

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      addressApi.remove(token, id),
    onSuccess: invalidate,
  });

  const defaultM = useMutation({
    mutationFn: (id: string) =>
      addressApi.setDefault(token, id),

    onMutate: async (id: string) => {
      await qc.cancelQueries({
        queryKey: ["addresses"],
      });

      const previous =
        qc.getQueryData<Address[]>(["addresses"]);

      if (previous) {
        qc.setQueryData<Address[]>(
          ["addresses"],
          previous.map((address) => ({
            ...address,
            isDefault: address.id === id,
          })),
        );
      }

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        qc.setQueryData<Address[]>(
          ["addresses"],
          context.previous,
        );
      }
    },

    onSettled: () => {
      void invalidate();
    },
  });

  return {
    isAuthed,
    addressReady,
    addresses,
    activeAddressId,
    activeAddress,

    isLoading:
      isAuthed && query.isLoading,

    error:
      query.error instanceof Error
        ? query.error.message
        : null,

    refetch: query.refetch,

    busy:
      createM.isPending ||
      updateM.isPending ||
      deleteM.isPending ||
      defaultM.isPending,

    async create(form: Omit<Address, "id">) {
      if (!isAuthed) {
        local.addAddress(form);
        return "Address added";
      }

      const res =
        await createM.mutateAsync(
          toAddressInput(
            form,
            addresses.length === 0,
          ),
        );

      return res.message;
    },

    async update(
      id: string,
      form: Omit<Address, "id">,
    ) {
      if (!isAuthed) {
        local.updateAddress(id, form);
        return "Address updated";
      }

      const res =
        await updateM.mutateAsync({
          id,
          input: toAddressInput(
            form,
            form.isDefault ?? false,
          ),
        });

      return res.message;
    },

    async remove(id: string) {
      if (!isAuthed) {
        local.deleteAddress(id);
        return "Address removed";
      }

      const res =
        await deleteM.mutateAsync(id);

      return res.message;
    },

    async setActive(id: string) {
      if (!isAuthed) {
        local.setActive(id);
        return "Active address updated";
      }

      const res =
        await defaultM.mutateAsync(id);

      return res.message;
    },
  };
}