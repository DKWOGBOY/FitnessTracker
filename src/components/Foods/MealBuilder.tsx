import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { PresetItemInput } from "../../hooks/useMealPresets";
import {
  defaultServing,
  macrosForServing,
  type Food,
  type FoodInput,
  type FoodServing,
  type Meal,
  type MealPresetWithItems,
} from "../../lib/types";
import { IconArrowLeft, IconClose, IconPlus } from "../icons";
import { useEnergyUnit } from "../../context/EnergyUnitContext";
import { energyUnitLabel, formatEnergy } from "../../lib/energy";
import Energy from "../Energy";
import ProgressRing from "../Log/ProgressRing";
import FoodSearchModal from "../Log/FoodSearchModal";
import FoodForm from "./FoodForm";

interface Props {
  foods: Food[];
  servingsByFood: Map<string, FoodServing[]>;
  preset?: MealPresetWithItems;
  onClose: () => void;
  onCreateFood: (input: FoodInput) => Promise<Food>;
  onFoodCreated: (food: Food) => void;
  onSave?: (name: string, defaultMeal: Meal, items: PresetItemInput[], servingsCount: number) => Promise<void>;
  onUpdate?: (id: string, name: string, items: PresetItemInput[], servingsCount: number) => Promise<void>;
}

interface BuilderItem {
  food: Food;
  serving: FoodServing | null;
  quantity: number;
}

const DEFAULT_MEAL: Meal = "snack";

function macroPct(macroKcal: number, totalKcal: number) {
  if (totalKcal <= 0) return 0;
  return Math.round((macroKcal / totalKcal) * 100);
}

export default function MealBuilder({
  foods,
  servingsByFood,
  preset,
  onClose,
  onCreateFood,
  onFoodCreated,
  onSave,
  onUpdate,
}: Props) {
  const { energyUnit } = useEnergyUnit();
  const [name, setName] = useState(preset?.name ?? "");
  const [servingsCount, setServingsCount] = useState(preset?.servings_count ?? 1);
  const [items, setItems] = useState<BuilderItem[]>(
    () => preset?.items.map((i) => ({ food: i.food, serving: i.serving, quantity: i.quantity })) ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const totals = items.reduce(
    (acc, i) => {
      const m = macrosForServing(i.food, i.serving?.grams_equivalent ?? 100, i.quantity);
      return {
        calories: acc.calories + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const perServingDivisor = servingsCount > 0 ? servingsCount : 1;
  const perServing = {
    calories: totals.calories / perServingDivisor,
    protein_g: totals.protein_g / perServingDivisor,
    carbs_g: totals.carbs_g / perServingDivisor,
    fat_g: totals.fat_g / perServingDivisor,
  };

  const carbsKcal = perServing.carbs_g * 4;
  const fatKcal = perServing.fat_g * 9;
  const proteinKcal = perServing.protein_g * 4;

  function addItem(food: Food, serving: FoodServing | null, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.food.id === food.id);
      if (existing) {
        return prev.map((i) => (i.food.id === food.id ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { food, serving, quantity }];
    });
  }

  function updateQuantity(foodId: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.food.id === foodId ? { ...i, quantity } : i)));
  }

  function removeItem(foodId: string) {
    setItems((prev) => prev.filter((i) => i.food.id !== foodId));
  }

  async function handleSave() {
    if (!name.trim() || items.length === 0) return;
    setSaving(true);
    try {
      const itemInputs: PresetItemInput[] = items.map((i) => ({
        foodId: i.food.id,
        servingId: i.serving?.id ?? null,
        quantity: i.quantity,
      }));
      if (preset) {
        await onUpdate?.(preset.id, name.trim(), itemInputs, servingsCount);
      } else {
        await onSave?.(name.trim(), DEFAULT_MEAL, itemInputs, servingsCount);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16 }}>{preset ? "Edit meal" : "New meal"}</h3>
      </div>

      <div className="screen-body">
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Meal title</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Servings</label>
            <input
              type="number"
              step="1"
              min="1"
              value={servingsCount}
              onChange={(e) => setServingsCount(Math.max(1, parseFloat(e.target.value) || 1))}
            />
          </div>
        </div>

        <p className="text-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
          {servingsCount > 1
            ? `Makes ${servingsCount} servings - macros below are per serving.`
            : "Makes 1 serving."}
        </p>

        <div className="card meal-totals-card">
          <div className="ring-wrap" style={{ width: 76, height: 76 }}>
            <ProgressRing pct={0} color="var(--color-primary)" trackColor="var(--color-bg-alt)" size={76} thickness={8} />
            <div className="ring-center">
              <span className="meal-totals-kcal">{formatEnergy(perServing.calories, energyUnit)}</span>
              <span className="meal-totals-kcal-unit">{energyUnitLabel(energyUnit)}</span>
            </div>
          </div>
          <div className="meal-totals-cols">
            <div className="meal-totals-col">
              <span className="meal-totals-pct" style={{ color: "var(--color-carbs)" }}>
                {macroPct(carbsKcal, perServing.calories)}%
              </span>
              <span className="meal-totals-g">{Math.round(perServing.carbs_g)} g</span>
              <span className="meal-totals-label">Carbs</span>
            </div>
            <div className="meal-totals-col">
              <span className="meal-totals-pct" style={{ color: "var(--color-fat)" }}>
                {macroPct(fatKcal, perServing.calories)}%
              </span>
              <span className="meal-totals-g">{Math.round(perServing.fat_g)} g</span>
              <span className="meal-totals-label">Fat</span>
            </div>
            <div className="meal-totals-col">
              <span className="meal-totals-pct" style={{ color: "var(--color-protein)" }}>
                {macroPct(proteinKcal, perServing.calories)}%
              </span>
              <span className="meal-totals-g">{Math.round(perServing.protein_g)} g</span>
              <span className="meal-totals-label">Protein</span>
            </div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Items
        </div>
        {items.length === 0 ? (
          <p className="empty-state">No foods added yet.</p>
        ) : (
          items.map((item) => {
            const m = macrosForServing(item.food, item.serving?.grams_equivalent ?? 100, item.quantity);
            return (
              <div className="list-row" key={item.food.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{item.food.name}</div>
                  <div className="list-row-sub">
                    {item.serving?.label ?? `100 ${item.food.base_unit}`} · <Energy kcal={m.calories} /> · P{" "}
                    {Math.round(m.protein_g)}g C {Math.round(m.carbs_g)}g F {Math.round(m.fat_g)}g
                  </div>
                </div>
                <div className="list-row-actions" style={{ gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.food.id, parseFloat(e.target.value) || 0)}
                    style={{ width: 56, padding: "4px 6px" }}
                  />
                  <button className="btn btn-ghost" onClick={() => removeItem(item.food.id)}>
                    <IconClose className="icon" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary btn-block" onClick={() => setPickerOpen(true)}>
            <IconPlus className="icon" /> Add food
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowCustomForm(true)}>
            <IconPlus className="icon" /> Custom macros
          </button>
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 20 }}
          onClick={handleSave}
          disabled={saving || !name.trim() || items.length === 0}
        >
          {saving ? "Saving..." : preset ? "Save changes" : "Save meal"}
        </button>
      </div>

      {pickerOpen && (
        <FoodSearchModal
          mode="picker"
          foods={foods}
          servingsByFood={servingsByFood}
          onClose={() => setPickerOpen(false)}
          onPick={(food, serving, qty) => addItem(food, serving, qty)}
          onFoodCreated={onFoodCreated}
          onCreateFood={onCreateFood}
        />
      )}

      {showCustomForm && (
        <FoodForm
          food={null}
          onClose={() => setShowCustomForm(false)}
          onSave={async (input) => {
            const food = await onCreateFood(input);
            const { data } = await supabase.from("food_servings").select("*").eq("food_id", food.id);
            const serving = defaultServing((data ?? []) as FoodServing[]);
            addItem(food, serving);
            setShowCustomForm(false);
          }}
        />
      )}
    </div>
  );
}
