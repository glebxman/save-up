import { useQuery } from "@tanstack/react-query";

import * as api from "@/api/methods";

import { useFinanceContext } from "./_internal";

interface UseReportsOptions {
  monthKey?: string;
}

/**
 * Reports & analytics queries. Only enabled on Report page so the Dashboard
 * doesn't pay for them.
 */
export function useReports({ monthKey }: UseReportsOptions = {}) {
  const { initData, reportBaseKey, breakdownBaseKey, dailyTrendBaseKey } = useFinanceContext();

  const reportKey = [...reportBaseKey, monthKey ?? null] as const;
  const breakdownKey = [...breakdownBaseKey, monthKey ?? null] as const;
  const dailyTrendKey = [...dailyTrendBaseKey, monthKey ?? null] as const;

  const reportQuery = useQuery({
    queryKey: reportKey,
    enabled: !!initData && !!monthKey,
    queryFn: () => api.getReport(initData, monthKey),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const breakdownQuery = useQuery({
    queryKey: breakdownKey,
    enabled: !!initData && !!monthKey,
    queryFn: () => api.getCategoryBreakdown(initData, monthKey),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const dailyTrendQuery = useQuery({
    queryKey: dailyTrendKey,
    enabled: !!initData && !!monthKey,
    queryFn: () => api.getDailyTrend(initData, monthKey),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return {
    reportQuery,
    breakdownQuery,
    dailyTrendQuery,
    report: reportQuery.data,
    breakdown: breakdownQuery.data,
    dailyTrend: dailyTrendQuery.data,
  };
}
