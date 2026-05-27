import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui";
import type { DailyTrend } from "@/types/finance";
import { formatMoney } from "@/utils/format";
import { hapticImpact } from "@/utils/haptic";

interface DailyTrendChartProps {
  trend: DailyTrend;
}

interface DayCell {
  day: number;
  expense: number;
  income: number;
  total: number;
  /** 0..4 intensity bucket for the heatmap color. */
  level: number;
  /** Row index in the flat grid. */
  row: number;
  /** Column index in the flat grid. */
  col: number;
  /** Full date string for tooltip. */
  dateLabel: string;
}

const CELL_SIZE = 36;
const CELL_GAP = 4;
const CELL_RADIUS = 8;
const COLS = 7;
const LEVELS = 5;

/**
 * Use the app's accent color at different opacities instead of GitHub-green.
 */
const LEVEL_COLORS = [
  "var(--surface-tertiary)",
  "color-mix(in srgb, var(--accent) 25%, var(--surface-tertiary))",
  "color-mix(in srgb, var(--accent) 50%, var(--surface-tertiary))",
  "color-mix(in srgb, var(--accent) 75%, var(--surface-tertiary))",
  "var(--accent)",
];

function getDaysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return 31;
  return new Date(y, m, 0).getDate();
}

function buildCells(trend: DailyTrend): DayCell[] {
  const [yearStr, monthStr] = trend.monthKey.split("-");
  const month = Number(monthStr);
  const daysInMonth = getDaysInMonth(trend.monthKey);

  const map = new Map<number, { expense: number; income: number }>();
  for (const p of trend.points) {
    map.set(p.day, { expense: p.expense, income: p.income });
  }

  const cells: DayCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const data = map.get(d) ?? { expense: 0, income: 0 };
    cells.push({
      day: d,
      expense: data.expense,
      income: data.income,
      total: data.expense + data.income,
      level: 0,
      row: Math.floor((d - 1) / COLS),
      col: (d - 1) % COLS,
      dateLabel: `${String(d).padStart(2, "0")}.${String(month).padStart(2, "0")}`,
    });
  }

  // Compute intensity levels (quartile-based on expense).
  const expenses = cells.map((c) => c.expense).filter((v) => v > 0);
  if (expenses.length > 0) {
    const sorted = [...expenses].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
    const q2 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;

    for (const cell of cells) {
      if (cell.expense <= 0) cell.level = 0;
      else if (cell.expense <= q1) cell.level = 1;
      else if (cell.expense <= q2) cell.level = 2;
      else if (cell.expense <= q3) cell.level = 3;
      else cell.level = 4;
    }
  }

  return cells;
}

export function DailyTrendChart({ trend }: DailyTrendChartProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<DayCell | null>(null);

  const cells = useMemo(() => buildCells(trend), [trend]);

  const totalExpense = useMemo(
    () => cells.reduce((sum, c) => sum + c.expense, 0),
    [cells],
  );
  const totalIncome = useMemo(
    () => cells.reduce((sum, c) => sum + c.income, 0),
    [cells],
  );

  const isEmpty = totalExpense === 0 && totalIncome === 0;
  const totalRows = cells.length > 0 ? cells[cells.length - 1]!.row + 1 : 0;

  const gridWidth = COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const gridHeight = totalRows * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  return (
    <Card variant="default">
      <CardContent className="!p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
            {t("trend.title")}
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-[var(--danger)]">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--danger)]" />
              {formatMoney(totalExpense)}
            </span>
            <span className="flex items-center gap-1 text-[var(--accent-text)]">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--accent)]" />
              {formatMoney(totalIncome)}
            </span>
          </div>
        </div>

        {isEmpty ? (
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            {t("trend.empty")}
          </p>
        ) : (
          <>
            {/* Heatmap grid */}
            <div className="mt-4 flex justify-center">
              <svg
                aria-label={t("trend.title")}
                className="block"
                height={gridHeight}
                role="img"
                width={gridWidth}
              >
                {/* Cells */}
                {cells.map((cell) => {
                  const x = cell.col * (CELL_SIZE + CELL_GAP);
                  const y = cell.row * (CELL_SIZE + CELL_GAP);
                  const isSelected = selected?.day === cell.day;

                  return (
                    <g key={cell.day} style={{ cursor: "pointer" }}>
                      <rect
                        fill={LEVEL_COLORS[cell.level]}
                        height={CELL_SIZE}
                        onClick={() => {
                          hapticImpact("light");
                          setSelected(isSelected ? null : cell);
                        }}
                        opacity={selected && !isSelected ? 0.35 : 1}
                        rx={CELL_RADIUS}
                        ry={CELL_RADIUS}
                        style={{ transition: "opacity 0.15s" }}
                        width={CELL_SIZE}
                        x={x}
                        y={y}
                      />
                      <text
                        className="pointer-events-none select-none"
                        fill={cell.level >= 3 ? "var(--accent-foreground)" : "var(--muted)"}
                        fontSize="7"
                        opacity={selected && !isSelected ? 0.35 : 0.8}
                        textAnchor="middle"
                        x={x + CELL_SIZE / 2}
                        y={y + CELL_SIZE / 2 + 2.5}
                      >
                        {cell.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-[var(--muted)]">
              <span>{t("trend.less", { defaultValue: "Меньше" })}</span>
              <div className="flex items-center gap-1">
                {LEVEL_COLORS.map((color, i) => (
                  <span
                    key={i}
                    className="inline-block h-3 w-3 rounded-[3px]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span>{t("trend.more", { defaultValue: "Больше" })}</span>
            </div>

            {/* Tooltip / detail panel */}
            {selected ? (
              <div className="mt-3 rounded-[16px] bg-[var(--surface-secondary)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
                    {selected.dateLabel}
                  </p>
                  <button
                    aria-label="Close"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-tertiary)] text-[var(--muted)] transition active:opacity-70"
                    onClick={() => setSelected(null)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="m-0 text-[11px] text-[var(--muted)]">
                      {t("trend.expense")}
                    </p>
                    <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--danger)]">
                      {formatMoney(selected.expense)}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 text-[11px] text-[var(--muted)]">
                      {t("trend.income")}
                    </p>
                    <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--accent-text)]">
                      {formatMoney(selected.income)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
