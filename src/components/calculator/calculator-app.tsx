"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  Download,
  PieChart,
  PiggyBank,
  ShoppingCart,
  Save,
  Trash2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CALCULATOR_MAIN, CALCULATOR_SECTIONS } from "@/data/calculator-copy";
import { FREEMIUM, PRODUCT } from "@/data/content";
import {
  computeFinance,
  buildBreakdown,
  buildPlanViewModel,
  formatPlanViewText,
  parseBudgetInput,
  parsePurchaseInput,
  normalizeSavingsGoalInput,
} from "@/lib/finance";
import {
  applyUiFlagsForCompute,
  useDemoStorage,
} from "@/hooks/use-demo-storage";
import { useCalcHistory } from "@/hooks/use-calc-history";
import { downloadPlanXlsx } from "@/lib/export-xlsx";
import { PlanInputs } from "@/components/calculator/plan-inputs";
import { PlanPresets } from "@/components/calculator/plan-presets";
import { GoalSectionContent } from "@/components/calculator/goal-section";
import { PurchaseTab } from "@/components/calculator/purchase-tab";
import { VerifyCalculationPanel } from "@/components/calculator/verify-calculation-panel";
import { ScenarioCompare } from "@/components/calculator/scenario-compare";
import { WhatIfTweaks } from "@/components/calculator/what-if-tweaks";
import { AdvancedSettings } from "@/components/calculator/advanced-settings";
import { PrimaryAnswer } from "@/components/calculator/primary-answer";
import { AllocationTab } from "@/components/calculator/allocation-tab";
import { MonthlyTradeoff } from "@/components/calculator/monthly-tradeoff";
import { DonutChart } from "@/components/calculator/charts";
import { LockedFeature } from "@/components/calculator/locked-feature";
import { cn, formatRub } from "@/lib/utils";

const lock = (key: keyof typeof FREEMIUM.lock) =>
  FREEMIUM.lock[key].replace("{price}", String(PRODUCT.price));

type TabKey = "split" | "save" | "buy";

const TABS: { key: TabKey; label: string; icon: typeof PieChart }[] = [
  { key: "split", label: "Распределить", icon: PieChart },
  { key: "save", label: "Накопить", icon: PiggyBank },
  { key: "buy", label: "Купить", icon: ShoppingCart },
];

export function CalculatorApp({ paid = false }: { paid?: boolean }) {
  const {
    budget,
    purchase,
    savingsGoal,
    ui,
    activePresetId,
    setBudget,
    setPurchase,
    setSavingsGoal,
    applyPreset,
    applySnapshot,
  } = useDemoStorage();

  const history = useCalcHistory();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<TabKey>("split");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaveState("saving");
    setSaveError(null);
    try {
      await history.save({
        free: fullResult.core.remainingAfterMandatory,
        budget,
        purchase,
        savingsGoal,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const computed = useMemo(
    () => applyUiFlagsForCompute({ budget, purchase, savingsGoal, ui }),
    [budget, purchase, savingsGoal, ui],
  );

  const fullResult = useMemo(
    () => computeFinance(computed.budget, computed.purchase, computed.savingsGoal),
    [computed],
  );

  const breakdown = useMemo(
    () =>
      buildBreakdown(
        computed.budget,
        fullResult.core,
        fullResult.goalContributionApplied,
      ),
    [computed.budget, fullResult],
  );

  const viewOptions = useMemo(
    () => ({
      buying: ui.buying,
      saving: ui.saving,
      purchasePrice: ui.buying ? purchase.price : 0,
    }),
    [ui.buying, ui.saving, purchase.price],
  );

  const planView = useMemo(
    () =>
      buildPlanViewModel(computed.budget, fullResult, computed.savingsGoal, viewOptions, {
        purchaseInput: computed.purchase,
      }),
    [computed, fullResult, viewOptions],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatPlanViewText(planView));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allocation = fullResult.allocation;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* 1. Ввод */}
      <PlanInputs
        budget={budget}
        onBudgetChange={(next) => setBudget(parseBudgetInput(next))}
      />
      <PlanPresets onSelect={applyPreset} activeId={activePresetId} />

      {/* 2. Главный ответ — бесплатно для всех */}
      <PrimaryAnswer budget={budget} result={fullResult} />

      {paid ? (
        <>
          {/* 3. Вкладки — что делать дальше */}
          <div className="soft-card overflow-hidden">
            <div className="flex border-b border-border/60">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium transition-colors",
                    tab === key
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">{label}</span>
                </button>
              ))}
            </div>
            <div key={tab} className="animate-float-in p-5 sm:p-6">
              {tab === "split" && (
                <AllocationTab
                  base={fullResult.core.remainingAfterMandatory}
                  categories={budget.categories ?? []}
                  onCategoriesChange={(cats) =>
                    setBudget(parseBudgetInput({ ...budget, categories: cats }))
                  }
                />
              )}
              {tab === "save" && (
                <div className="space-y-4">
                  <p className="rounded-xl surface-success border px-3.5 py-2.5 text-sm">
                    Откладывать можно из свободных{" "}
                    <span className="font-semibold">
                      {formatRub(fullResult.core.remainingAfterMandatory)} в месяц
                    </span>{" "}
                    (доход минус обязательные траты).
                  </p>
                  <GoalSectionContent
                    goal={savingsGoal}
                    result={fullResult}
                    onChange={(next) => setSavingsGoal(normalizeSavingsGoalInput(next))}
                  />
                  {fullResult.savingsGoal &&
                    savingsGoal.targetAmount > 0 &&
                    fullResult.savingsGoal.effectiveContribution > 0 && (
                      <MonthlyTradeoff
                        setAside={fullResult.savingsGoal.effectiveContribution}
                        freeBudget={fullResult.core.remainingAfterMandatory}
                      />
                    )}
                </div>
              )}
              {tab === "buy" && (
                <PurchaseTab
                  purchase={purchase}
                  result={fullResult}
                  onChange={(next) => setPurchase(parsePurchaseInput(next))}
                />
              )}
            </div>
          </div>

          {/* Подробно — свёрнуто */}
          <Accordion type="multiple" className="soft-card px-5 sm:px-6">
            <AccordionItem value="whatif">
              <AccordionTrigger>{CALCULATOR_MAIN.whatIfTitle}</AccordionTrigger>
              <AccordionContent className="space-y-5">
                <WhatIfTweaks
                  budget={budget}
                  onApply={(next) => setBudget(parseBudgetInput(next))}
                />
                <ScenarioCompare
                  budget={computed.budget}
                  result={fullResult}
                  goal={computed.savingsGoal}
                  options={viewOptions}
                  purchaseInput={{ purchaseInput: computed.purchase }}
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="verify">
              <AccordionTrigger>{CALCULATOR_MAIN.verifyTitle}</AccordionTrigger>
              <AccordionContent className="space-y-5">
                <VerifyCalculationPanel budget={computed.budget} result={fullResult} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="expert">
              <AccordionTrigger>{CALCULATOR_SECTIONS.expert.title}</AccordionTrigger>
              <AccordionContent>
                <p className="pb-3 text-xs text-muted-foreground">
                  {CALCULATOR_SECTIONS.expert.subtitle}
                </p>
                <AdvancedSettings result={fullResult} breakdown={breakdown} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Сохранить / экспорт */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveState === "saving"}
            >
              {saveState === "saved" ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Сохранено
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {saveState === "saving" ? "Сохраняем…" : "Сохранить расчёт"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadPlanXlsx(budget, fullResult, { savingsGoal, purchase })}
            >
              <Download className="mr-2 h-4 w-4" />
              Скачать таблицу (Excel)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Скопировать план
                </>
              )}
            </Button>
          </div>
          {saveState === "error" && (
            <p className="text-xs text-[hsl(var(--danger))]">
              Не удалось сохранить в аккаунт: {saveError}. Расчёт сохранён на этом устройстве.
            </p>
          )}

          {/* Мои расчёты — история */}
          {history.items.length > 0 && (
            <div className="soft-card p-5 sm:p-6">
              <p className="font-semibold">Мои сохранённые расчёты</p>
              <ul className="mt-3 space-y-2">
                {history.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatRub(item.free)} свободно</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySnapshot(item)}
                      >
                        Открыть
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Удалить"
                        onClick={() => history.remove(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        /* Бесплатно: что в полной версии (paywall) */
        <LockedFeature unlocked={false} description={`${lock("allocation")} · ${lock("hints")}`}>
          <div className="soft-card space-y-4 p-5 sm:p-6">
            <p className="font-semibold">Что делать с этими деньгами</p>
            <DonutChart
              segments={
                allocation.allocations.length > 0
                  ? allocation.allocations.map((a) => ({ label: a.label, value: a.amount }))
                  : [
                      { label: "Продукты", value: 29750 },
                      { label: "Транспорт", value: 12750 },
                      { label: "Здоровье", value: 8500 },
                      { label: "Развлечения", value: 8500 },
                      { label: "Прочее", value: 25500 },
                    ]
              }
              centerValue={formatRub(fullResult.core.remainingAfterMandatory)}
              centerLabel="на жизнь"
            />
            <p className="text-sm text-muted-foreground">
              Распределение по категориям, план накоплений и решение о покупке — в полной версии.
            </p>
          </div>
        </LockedFeature>
      )}
    </div>
  );
}
