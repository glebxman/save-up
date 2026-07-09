import { useDeferredValue, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  Input,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  Select,
  Spinner,
} from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import { useToastStore } from "@/stores/ui.store";
import { SUBSCRIPTION_PLANS, type AdminUserListItem, type SubscriptionPlanId } from "@/types/finance";
import { formatDate, formatDateTime } from "@/utils/format";
import * as api from "@/api/methods";

const PAGE_SIZE = 12;
const SUBSCRIPTION_DURATIONS = [
  { months: 1, planId: "monthly" },
  { months: 3, planId: "quarterly" },
  { months: 6, planId: "half_year" },
  { months: 12, planId: "yearly" },
] as const satisfies readonly { months: number; planId: SubscriptionPlanId }[];

export function Admin() {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const { status, statusQuery } = useFinance();
  const pushToast = useToastStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<AdminUserListItem | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = useState<AdminUserListItem | null>(null);
  const [subscriptionMonths, setSubscriptionMonths] = useState<number>(1);
  const deferredSearch = useDeferredValue(search.trim());
  const isAllowed = !!status?.user.isAdmin;

  const usersQuery = useQuery({
    queryKey: ["adminUsers", deferredSearch, page] as const,
    enabled: !!initData && isAllowed,
    queryFn: () => api.listAdminUsers(initData, {
      page,
      pageSize: PAGE_SIZE,
      search: deferredSearch || undefined,
    }),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const setAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => api.setAdminAccess(initData, userId, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["status"] }).catch(() => undefined);
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: (userId: string) => api.resetUserPin(initData, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["status"] }).catch(() => undefined);
      pushToast({ tone: "success", message: t("admin.resetPinSuccess") });
      setResetTarget(null);
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        message: error instanceof Error ? error.message : t("feedback.genericError"),
      });
    },
  });

  const setSubscriptionMutation = useMutation({
    mutationFn: ({
      userId,
      planId,
      durationMonths,
    }: {
      userId: string;
      planId: SubscriptionPlanId;
      durationMonths: number;
    }) => api.setUserSubscription(initData, userId, planId, durationMonths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["status"] }).catch(() => undefined);
      pushToast({ tone: "success", message: t("admin.subscriptionSaved") });
      setSubscriptionTarget(null);
      setSubscriptionMonths(1);
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        message: error instanceof Error ? error.message : t("feedback.genericError"),
      });
    },
  });

  if (statusQuery.isPending && !status) {
    return (
      <Card variant="default">
        <CardContent>
          <div className="flex items-center gap-3 py-3">
            <Spinner />
            <span>{t("admin.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAllowed) {
    return (
      <Card variant="default">
        <CardContent>
          <div className="space-y-2 py-2">
            <p className="m-0 text-sm text-[var(--muted)]">{t("admin.accessCaption")}</p>
            <p className="m-0 text-xl font-semibold text-[var(--foreground)]">{t("admin.accessDenied")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = usersQuery.data?.stats;
  const selectedDuration =
    SUBSCRIPTION_DURATIONS.find((duration) => duration.months === subscriptionMonths) ??
    SUBSCRIPTION_DURATIONS[0];
  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedDuration.planId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="m-0 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t("admin.title")}
        </h1>
        <p className="m-0 text-sm text-[var(--muted)]">
          {t("admin.description")}
        </p>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label={t("admin.totalUsers")} value={String(stats.totalUsers)} />
          <StatCard label={t("admin.totalAdmins")} value={String(stats.totalAdmins)} />
        </div>
      ) : null}

      <Card variant="default">
        <CardContent>
          <div className="flex flex-col gap-4">
            <Input
              fullWidth
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("admin.searchPlaceholder")}
              value={search}
              variant="secondary"
            />

            {usersQuery.isPending ? (
              <div className="flex items-center gap-3 py-4">
                <Spinner />
                <span className="text-sm text-[var(--muted)]">{t("admin.loading")}</span>
              </div>
            ) : usersQuery.isError ? (
              <p className="m-0 text-sm text-[var(--danger)]">{usersQuery.error.message}</p>
            ) : usersQuery.data?.items.length ? (
              <div className="space-y-3">
                {usersQuery.data.items.map((item) => (
                  <AdminUserCard
                    key={item.id}
                    item={item}
                    isPending={setAdminMutation.isPending && setAdminMutation.variables?.userId === item.id}
                    isResetPending={resetPinMutation.isPending && resetPinMutation.variables === item.id}
                    isSubscriptionPending={
                      setSubscriptionMutation.isPending &&
                      setSubscriptionMutation.variables?.userId === item.id
                    }
                    onSetAdmin={(userId, isAdmin) => {
                      void setAdminMutation.mutateAsync({ userId, isAdmin });
                    }}
                    onResetPin={() => setResetTarget(item)}
                    onSetSubscription={() => setSubscriptionTarget(item)}
                  />
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-[var(--muted)]">{t("admin.empty")}</p>
            )}

            {usersQuery.data && usersQuery.data.totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-sm text-[var(--muted)]">
                  {t("admin.pageInfo", {
                    page: usersQuery.data.page,
                    totalPages: usersQuery.data.totalPages,
                    totalItems: usersQuery.data.totalItems,
                  })}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    isDisabled={usersQuery.data.page <= 1}
                    onPress={() => setPage((current) => Math.max(current - 1, 1))}
                    size="sm"
                    variant="secondary"
                  >
                    {t("admin.prevPage")}
                  </Button>
                  <Button
                    isDisabled={usersQuery.data.page >= usersQuery.data.totalPages}
                    onPress={() => setPage((current) => current + 1)}
                    size="sm"
                    variant="secondary"
                  >
                    {t("admin.nextPage")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ConfirmActionModal
        cancelLabel={t("common.cancel")}
        confirmLabel={t("admin.resetPin")}
        description={
          resetTarget
            ? t("admin.resetPinDescription", { name: resetTarget.displayName })
            : undefined
        }
        isOpen={!!resetTarget}
        isPending={resetPinMutation.isPending}
        onClose={() => {
          if (!resetPinMutation.isPending) setResetTarget(null);
        }}
        onConfirm={() => {
          if (resetTarget) {
            void resetPinMutation.mutateAsync(resetTarget.id);
          }
        }}
        question={t("admin.resetPinConfirm")}
        title={t("admin.resetPin")}
      />

      <ModalBackdrop
        isOpen={!!subscriptionTarget}
        onOpenChange={(open) => {
          if (!open && !setSubscriptionMutation.isPending) {
            setSubscriptionTarget(null);
            setSubscriptionMonths(1);
          }
        }}
      >
        <ModalContainer size="sm">
          <ModalDialog>
            <ModalHeader>
              <ModalHeading>{t("admin.subscriptionModalTitle")}</ModalHeading>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <p className="m-0 text-sm text-[var(--muted)]">
                  {subscriptionTarget
                    ? t("admin.subscriptionModalDescription", {
                        name: subscriptionTarget.displayName,
                      })
                    : null}
                </p>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {t("admin.subscriptionDuration")}
                  </span>
                  <Select
                    fullWidth
                    onChange={(event) => setSubscriptionMonths(Number(event.target.value))}
                    value={String(subscriptionMonths)}
                    variant="secondary"
                  >
                    {SUBSCRIPTION_DURATIONS.map((duration) => (
                      <option key={duration.months} value={duration.months}>
                        {t(`subscription.plans.${duration.planId}`)}
                      </option>
                    ))}
                  </Select>
                </label>

                {subscriptionTarget?.subscription.expiresAt ? (
                  <p className="m-0 text-xs text-[var(--muted)]">
                    {t("admin.currentSubscriptionUntil", {
                      date: formatDate(subscriptionTarget.subscription.expiresAt),
                    })}
                  </p>
                ) : null}

                {selectedPlan ? (
                  <p className="m-0 text-xs text-[var(--muted)]">
                    {t("admin.subscriptionPlanHint", {
                      months: selectedPlan.months,
                    })}
                  </p>
                ) : null}
              </div>
            </ModalBody>
            <ModalFooter className="flex gap-2">
              <Button
                fullWidth
                isDisabled={setSubscriptionMutation.isPending}
                onPress={() => {
                  setSubscriptionTarget(null);
                  setSubscriptionMonths(1);
                }}
                variant="secondary"
              >
                {t("common.cancel")}
              </Button>
              <Button
                fullWidth
                isDisabled={setSubscriptionMutation.isPending || !subscriptionTarget}
                onPress={() => {
                  if (!subscriptionTarget) return;
                  setSubscriptionMutation.mutate({
                    userId: subscriptionTarget.id,
                    planId: selectedDuration.planId,
                    durationMonths: selectedDuration.months,
                  });
                }}
                variant="primary"
              >
                {setSubscriptionMutation.isPending ? "..." : t("admin.subscriptionGrant")}
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="secondary">
      <CardContent>
        <p className="m-0 text-xs text-[var(--muted)]">{label}</p>
        <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
      </CardContent>
    </Card>
  );
}

function AdminUserCard({
  item,
  isPending,
  isResetPending,
  isSubscriptionPending,
  onSetAdmin,
  onResetPin,
  onSetSubscription,
}: {
  item: AdminUserListItem;
  isPending?: boolean;
  isResetPending?: boolean;
  isSubscriptionPending?: boolean;
  onSetAdmin: (userId: string, isAdmin: boolean) => void;
  onResetPin: () => void;
  onSetSubscription: () => void;
}) {
  const { t } = useTranslation();
  const avatarFallback = item.displayName.trim().charAt(0).toUpperCase() || "U";
  const usernameLine = item.username && item.displayName !== `@${item.username}` ? `@${item.username}` : null;
  const nextAdminState = !item.isAdmin;
  const subscription = item.subscription;

  return (
    <div className="rounded-[24px] bg-[var(--surface-secondary)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="flex h-12 w-12 shrink-0 items-center justify-center bg-[var(--surface-tertiary)] text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
            {item.photoUrl ? (
              <Avatar.Image alt={item.displayName} src={item.photoUrl} />
            ) : (
              <span>{avatarFallback}</span>
            )}
          </Avatar>

          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0 truncate text-sm font-semibold text-[var(--foreground)]">{item.displayName}</p>
              {item.isAdmin ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface))] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--accent-foreground)]">
                  {t("admin.adminBadge")}
                </span>
              ) : null}
              {item.hasPinConfigured ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--danger)_16%,var(--surface))] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--danger)]">
                  🔒 {t("admin.hasPin")}
                </span>
              ) : null}
              <span
                className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
                  subscription.active
                    ? "bg-[color-mix(in_srgb,var(--success)_18%,var(--surface))] text-[var(--success)]"
                    : "bg-[var(--surface-tertiary)] text-[var(--muted)]"
                }`}
              >
                {subscription.active ? t("admin.subscriptionActive") : t("admin.subscriptionInactive")}
              </span>
            </div>
            {usernameLine ? (
              <p className="m-0 truncate text-xs text-[var(--foreground)] opacity-80">{usernameLine}</p>
            ) : null}
            <p className="m-0 text-xs text-[var(--muted)]">
              {t("admin.userMeta", {
                telegramId: item.telegramIdMasked,
                createdAt: formatDateTime(item.createdAt),
              })}
            </p>
            {subscription.expiresAt ? (
              <p className="m-0 text-xs text-[var(--muted)]">
                {t("admin.subscriptionUntil", {
                  date: formatDate(subscription.expiresAt),
                })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            isDisabled={isPending || isResetPending || isSubscriptionPending}
            onPress={onSetSubscription}
            size="sm"
            variant="secondary"
          >
            {subscription.active ? t("admin.subscriptionExtend") : t("admin.subscriptionGrant")}
          </Button>
          {item.hasPinConfigured ? (
            <Button
              isDisabled={isPending || isResetPending || isSubscriptionPending}
              onPress={onResetPin}
              size="sm"
              variant="danger-soft"
            >
              {t("admin.resetPin")}
            </Button>
          ) : null}
          <Button
            isDisabled={isPending || isResetPending || isSubscriptionPending}
            onPress={() => onSetAdmin(item.id, nextAdminState)}
            size="sm"
            variant={item.isAdmin ? "danger-soft" : "primary"}
          >
            {item.isAdmin ? t("admin.revokeAdmin") : t("admin.grantAdmin")}
          </Button>
        </div>
      </div>
    </div>
  );
}
