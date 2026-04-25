import { useDeferredValue, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Avatar, Button, Card, CardContent, Input, Spinner } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import type { AdminUserListItem } from "@/types/finance";
import { formatDateTime } from "@/utils/format";
import * as api from "@/api/methods";

const PAGE_SIZE = 12;

export function Admin() {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const { status, statusQuery } = useFinance();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
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
                    onSetAdmin={(userId, isAdmin) => {
                      void setAdminMutation.mutateAsync({ userId, isAdmin });
                    }}
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
  onSetAdmin,
}: {
  item: AdminUserListItem;
  isPending?: boolean;
  onSetAdmin: (userId: string, isAdmin: boolean) => void;
}) {
  const { t } = useTranslation();
  const avatarFallback = item.displayName.trim().charAt(0).toUpperCase() || "U";
  const usernameLine = item.username && item.displayName !== `@${item.username}` ? `@${item.username}` : null;
  const nextAdminState = !item.isAdmin;

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
              <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-foreground)]">
                {t("admin.adminBadge")}
              </span>
            ) : null}
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
          </div>
        </div>

        <Button
          isDisabled={isPending}
          onPress={() => onSetAdmin(item.id, nextAdminState)}
          size="sm"
          variant={item.isAdmin ? "danger-soft" : "primary"}
        >
          {item.isAdmin ? t("admin.revokeAdmin") : t("admin.grantAdmin")}
        </Button>
      </div>
    </div>
  );
}
