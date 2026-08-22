import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Heart,
  Star,
  Shield,
  Truck,
  ChevronLeft,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductArt } from "@/components/common/ProductArt";
import { ProductCard } from "@/components/common/ProductCard";
import { QuantityStepper } from "@/components/common/QuantityStepper";
import { ProductAlertCard } from "@/components/common/ProductAlertCard";
import { Skeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { useWishlistBook } from "@/lib/hooks/use-wishlist-book";
import { useRecent } from "@/lib/store/recent";
import { useAuth } from "@/lib/store/auth";
import { reviewApi } from "@/lib/review-api";
import { orderApi } from "@/lib/order-api";
import { inr, pct } from "@/lib/format";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — Fresh15" },
      {
        name: "description",
        content: "Shop fresh groceries on Fresh15.",
      },
      {
        property: "og:title",
        content: "Product — Fresh15",
      },
      {
        property: "og:description",
        content: "Shop fresh groceries on Fresh15.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
    enabled: Boolean(id),
  });

  if (productQuery.isLoading) {
    return (
      <AppLayout>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-3xl" />

          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4 rounded-xl" />
            <Skeleton className="h-6 w-1/3 rounded-xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <AppLayout>
        <EmptyState
          emoji="🔎"
          title="Product not found"
          description="This product may have been removed or is temporarily unavailable."
          cta={{
            to: "/",
            label: "Browse groceries",
          }}
        />
      </AppLayout>
    );
  }

  return <ProductDetails product={productQuery.data} />;
}

function ProductDetails({ product }: { product: Product }) {
  const similar = useQuery({
    queryKey: ["similar", product.id],
    queryFn: () => api.getSimilar(product.id),
    enabled: Boolean(product.id),
  });

  const { token, user, isGuest } = useAuth();

  const qc = useQueryClient();

  const ordersQ = useQuery({
    queryKey: ["orders", token ?? "guest"],
    queryFn: () => orderApi.list(token),
    enabled: Boolean(token),
    retry: false,
  });

  const cart = useCartBook();
  const wishlist = useWishlistBook();

  const view = useRecent((state) => state.viewProduct);

  const reviewsQ = useQuery({
    queryKey: ["reviews", product.id],
    queryFn: () => reviewApi.listForProduct(product.id),
    retry: false,
  });

  const productReviews = reviewsQ.data ?? [];

  const reviewSummary = useMemo(() => {
    if (reviewsQ.isSuccess) {
      const count = productReviews.length;

      const average =
        count > 0
          ? productReviews.reduce(
              (sum, review) => sum + review.rating,
              0,
            ) / count
          : 0;

      return {
        average,
        count,
      };
    }

    return {
      average: product.rating,
      count: product.reviews,
    };
  }, [
    product.rating,
    product.reviews,
    productReviews,
    reviewsQ.isSuccess,
  ]);

  const qty = cart.qtyOf(product.id);
  const inW = wishlist.has(product.id);

  /*
   * Important:
   *
   * The product API exposes the current stock.
   * We use that value as the source of truth for the
   * product-page purchase CTA.
   *
   * stock <= 0:
   *   - Do not allow ADD
   *   - Do not show Go to cart
   *   - ProductAlertCard remains available
   *
   * stock > 0:
   *   - Normal cart functionality is available
   */
  const isOutOfStock = product.stock <= 0;

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    product.images?.[0] ?? product.image,
  );

  const [variantIdx, setVariantIdx] = useState(0);

  const variant = product.variants?.[variantIdx];

  const discount = pct(
    variant?.mrp ?? product.mrp,
    variant?.price ?? product.price,
  );

  const userId = user?.id ?? (isGuest ? "guest" : "");

  /*
   * A review must be tied to a delivered order
   * that actually contained this product.
   */
  const deliveredOrderId = useMemo(() => {
    const match = ordersQ.data?.find(
      (order) =>
        order.status === "delivered" &&
        order.items.some(
          (item) => item.productId === product.id,
        ),
    );

    return match?.id;
  }, [ordersQ.data, product.id]);

  const hasPurchased = Boolean(deliveredOrderId);

  const myReview = userId
    ? productReviews.find(
        (review) => review.userId === userId,
      )
    : undefined;

  const alreadyReviewed = Boolean(myReview);

  const canReview =
    Boolean(user) &&
    hasPurchased &&
    !alreadyReviewed;

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const refreshReviews = () => {
    void qc.invalidateQueries({
      queryKey: ["reviews", product.id],
    });

    void qc.invalidateQueries({
      queryKey: ["product", product.id],
    });
  };

  const createReview = useMutation({
    mutationFn: (input: {
      rating: number;
      comment: string;
      orderId: string;
    }) =>
      reviewApi.create(token, {
        productId: product.id,
        ...input,
      }),

    onSuccess: () => {
      setReviewText("");
      setRating(5);
      refreshReviews();
      toast.success("Thanks for your review!");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteReview = useMutation({
    mutationFn: (reviewId: string) =>
      reviewApi.remove(token, reviewId),

    onSuccess: () => {
      refreshReviews();
      toast.success("Review deleted");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    setSelectedImage(
      product.images?.[0] ?? product.image,
    );
  }, [product.id, product.images, product.image]);

  useEffect(() => {
    view(product.id);
  }, [product.id, view]);

  function submitReview() {
    if (!user || !deliveredOrderId) {
      return;
    }

    if (!reviewText.trim()) {
      toast.error("Please write a short review");
      return;
    }

    createReview.mutate({
      rating,
      comment: reviewText.trim(),
      orderId: deliveredOrderId,
    });
  }

  return (
    <AppLayout>
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product images */}
        <div className="space-y-3">
          <ProductArt
            emoji={product.emoji}
            src={selectedImage}
            alt={product.name}
            gradient={product.gradient}
            size="xl"
            className="aspect-square w-full"
          />

          {(product.images?.length ?? 0) > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images!.map(
                (image: string, index: number) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() =>
                      setSelectedImage(image)
                    }
                    className={
                      "overflow-hidden rounded-xl border transition " +
                      (image === selectedImage
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary")
                    }
                    aria-label={`View ${product.name} image ${
                      index + 1
                    }`}
                    aria-pressed={
                      image === selectedImage
                    }
                  >
                    <ProductArt
                      emoji={product.emoji}
                      src={image}
                      alt={`${product.name} image ${
                        index + 1
                      }`}
                      gradient={product.gradient}
                      size="sm"
                      className="aspect-square w-full cursor-pointer"
                    />
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* Product information */}
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {product.brand && (
              <span className="font-semibold text-foreground">
                {product.brand}
              </span>
            )}

            {product.brand && <span>·</span>}

            <div className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {product.etaMinutes} min delivery
            </div>
          </div>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-1 text-sm text-muted-foreground">
            {product.unit}
          </div>

          {/* Rating + stock */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
              <Star className="h-3.5 w-3.5 fill-success" />
              {reviewSummary.average.toFixed(1)}
            </div>

            <div className="text-xs text-muted-foreground">
              {reviewSummary.count}{" "}
              {reviewSummary.count === 1
                ? "rating"
                : "ratings"}
            </div>

            {isOutOfStock ? (
              <Badge variant="destructive">
                Out of stock
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-success/10 text-success hover:bg-success/10"
              >
                In stock
              </Badge>
            )}
          </div>

          {/* Variants */}
          {product.variants && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select unit
              </div>

              <div className="flex flex-wrap gap-2">
                {product.variants.map(
                  (
                    variantItem: NonNullable<
                      typeof product.variants
                    >[number],
                    index: number,
                  ) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        setVariantIdx(index)
                      }
                      className={
                        "rounded-xl border px-4 py-2 text-left text-sm transition " +
                        (index === variantIdx
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:bg-muted")
                      }
                    >
                      <div className="font-semibold">
                        {variantItem.label}
                      </div>

                      <div className="text-xs">
                        <span className="font-bold text-foreground">
                          {inr(variantItem.price)}
                        </span>

                        <span className="ml-1.5 text-muted-foreground line-through">
                          {inr(variantItem.mrp)}
                        </span>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="mt-5 flex items-end gap-3">
            <div>
              <div className="text-3xl font-black text-foreground">
                {inr(
                  variant?.price ?? product.price,
                )}
              </div>

              {discount > 0 && (
                <div className="mt-0.5 text-sm">
                  <span className="text-muted-foreground line-through">
                    {inr(
                      variant?.mrp ?? product.mrp,
                    )}
                  </span>

                  <span className="ml-2 font-semibold text-success">
                    {discount}% off
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cart / wishlist */}
          <div className="mt-5 flex gap-2">
            {isOutOfStock ? (
              /*
               * IMPORTANT:
               *
               * Never expose ADD or Go to cart while the
               * product has zero stock.
               *
               * ProductAlertCard below handles:
               * - back-in-stock subscription
               * - price-drop subscription
               * - existing subscription state
               */
              <div className="flex-1 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                <div className="text-sm font-semibold text-foreground">
                  Currently unavailable
                </div>

                <div className="mt-0.5 text-xs text-muted-foreground">
                  We'll let you know when this product is available again.
                </div>
              </div>
            ) : (
              <>
                <QuantityStepper
                  qty={qty}
                  size="md"
                  onAdd={() => {
                    void cart
                      .add(product)
                      .then(() =>
                        toast.success(
                          "Added to cart",
                        ),
                      );
                  }}
                  onInc={() =>
                    void cart.inc(product.id)
                  }
                  onDec={() =>
                    void cart.dec(product.id)
                  }
                  className="flex-1 sm:flex-none"
                />

                <Link
                  to="/cart"
                  className="inline-flex flex-1 items-center justify-center rounded-full border bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted sm:flex-none"
                >
                  Go to cart
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() =>
                void wishlist.toggle(product.id)
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-surface-elevated hover:bg-muted"
              aria-label={
                inW
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
              aria-pressed={inW}
            >
              <Heart
                className={
                  "h-4 w-4 " +
                  (inW
                    ? "fill-destructive text-destructive"
                    : "")
                }
              />
            </button>
          </div>

          {/* Product alerts */}
          <ProductAlertCard product={product} />

          {/* Service benefits */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              {
                icon: Truck,
                label: "Free delivery",
                sub: "Orders ₹199+",
              },
              {
                icon: Clock,
                label: `${product.etaMinutes} min`,
                sub: "Fastest ETA",
              },
              {
                icon: Shield,
                label: "Fresh assured",
                sub: "Or full refund",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl border bg-surface p-3 text-center"
              >
                <feature.icon className="mx-auto h-4 w-4 text-primary" />

                <div className="mt-1 text-xs font-semibold text-foreground">
                  {feature.label}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  {feature.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mt-6 rounded-2xl border bg-surface p-4">
            <h3 className="text-sm font-bold text-foreground">
              About this product
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          {/* Reviews */}
          <div className="mt-4 rounded-2xl border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Customer reviews
              </h3>

              {hasPurchased && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified buyer
                </span>
              )}
            </div>

            {/* Write review */}
            {canReview && (
              <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs font-semibold text-foreground">
                  Write a review
                </div>

                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setRating(star)
                        }
                        aria-label={`Rate ${star} star`}
                      >
                        <Star
                          className={
                            "h-5 w-5 " +
                            (star <= rating
                              ? "fill-warning text-warning"
                              : "text-muted-foreground")
                          }
                        />
                      </button>
                    ),
                  )}
                </div>

                <Textarea
                  value={reviewText}
                  onChange={(event) =>
                    setReviewText(
                      event.target.value,
                    )
                  }
                  placeholder="How was the product? Freshness, packaging, delivery…"
                  className="mt-2 min-h-20 bg-background"
                />

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={
                    createReview.isPending
                  }
                  className="mt-2 inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  Submit review
                </button>
              </div>
            )}

            {!user && (
              <div className="mb-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                <Link
                  to="/auth/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Log in
                </Link>{" "}
                to review products you've
                purchased.
              </div>
            )}

            {user && !hasPurchased && (
              <div className="mb-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                Only verified buyers can review
                this product. Order it once and
                share your experience.
              </div>
            )}

            {user &&
              hasPurchased &&
              alreadyReviewed && (
                <div className="mb-4 rounded-xl bg-success/10 p-3 text-xs text-success">
                  You've already reviewed this
                  product. Thanks!
                </div>
              )}

            {/* Review list */}
            <div className="space-y-3">
              {reviewsQ.isLoading ? (
                <div className="space-y-2">
                  {Array.from({
                    length: 2,
                  }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-20 w-full rounded-xl"
                    />
                  ))}
                </div>
              ) : productReviews.length ===
                0 ? (
                <div className="rounded-xl bg-background p-4 text-center text-xs text-muted-foreground">
                  No reviews yet. Be the first
                  to share your experience.
                </div>
              ) : (
                productReviews.map(
                  (review) => (
                    <div
                      key={review.id}
                      className="rounded-xl bg-background p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold">
                            {review.userName}
                          </div>

                          {review.verifiedPurchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold text-success">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Verified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-0.5 text-xs text-warning">
                            {Array.from({
                              length: review.rating,
                            }).map(
                              (_, index) => (
                                <Star
                                  key={index}
                                  className="h-3 w-3 fill-warning"
                                />
                              ),
                            )}
                          </div>

                          {userId &&
                            review.userId ===
                              userId && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteReview.mutate(
                                    review.id,
                                  )
                                }
                                disabled={
                                  deleteReview.isPending
                                }
                                aria-label="Delete my review"
                                className="text-muted-foreground hover:text-destructive disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                        </div>
                      </div>

                      {review.title && (
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {review.title}
                        </div>
                      )}

                      <div className="mt-1 text-sm text-muted-foreground">
                        {review.comment}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar products */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">
          Similar products
        </h2>

        {similar.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({
              length: 5,
            }).map((_, index) => (
              <Skeleton
                key={index}
                className="aspect-[3/4] w-full rounded-2xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {similar.data?.map(
              (similarProduct) => (
                <ProductCard
                  key={similarProduct.id}
                  product={similarProduct}
                />
              ),
            )}
          </div>
        )}
      </section>
    </AppLayout>
  );
}