import { useMemo, useState } from "react";
import { useFoods } from "../../hooks/useFoods";
import { useMealPresets } from "../../hooks/useMealPresets";
import type { Food, MealPresetWithItems } from "../../lib/types";
import FoodForm from "./FoodForm";
import MealBuilder from "./MealBuilder";
import { IconCheck, IconClose, IconPlus, IconStar } from "../icons";
import Energy from "../Energy";
import SwipeableRow from "../Log/SwipeableRow";

type View = "foods" | "meals";

export default function FoodsTab() {
  const {
    foods,
    servingsByFood,
    loading,
    addFood,
    updateFood,
    deleteFood,
    toggleFrequent,
    refresh: refreshFoods,
  } = useFoods();
  const { presets, loading: presetsLoading, savePreset, updatePreset, deletePreset } = useMealPresets();
  const [view, setView] = useState<View>("foods");
  const [query, setQuery] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);
  const [editingPreset, setEditingPreset] = useState<MealPresetWithItems | null>(null);

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }, [foods, query]);

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((p) => p.name.toLowerCase().includes(q));
  }, [presets, query]);

  return (
    <div className="tab-page page-transition-in">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Foods</h2>
        <button
          className="btn btn-primary"
          onClick={() => (view === "foods" ? setShowAdd(true) : setShowMealBuilder(true))}
        >
          <IconPlus className="icon" /> {view === "foods" ? "Add" : "Create meal"}
        </button>
      </div>

      <div className="range-toggle" style={{ marginBottom: 14 }}>
        <button className={view === "foods" ? "active" : ""} onClick={() => setView("foods")}>
          Foods
        </button>
        <button className={view === "meals" ? "active" : ""} onClick={() => setView("meals")}>
          Meals
        </button>
      </div>

      <input
        type="text"
        placeholder={view === "foods" ? "Search foods..." : "Search meals..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", marginBottom: 14 }}
      />

      {view === "foods" ? (
        loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : filteredFoods.length === 0 ? (
          <p className="empty-state">No foods yet. Add one, or search for foods from the Log tab.</p>
        ) : (
          <div className="card">
            {filteredFoods.map((f) => (
              <SwipeableRow key={f.id} onTap={() => setEditingFood(f)} onDelete={() => deleteFood(f.id)}>
                <div className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">{f.name}</div>
                    <div className="list-row-sub">
                      <Energy kcal={f.calories} /> /100{f.base_unit === "ml" ? "ml" : "g"} · P{" "}
                      {Math.round(f.protein_g)}g C {Math.round(f.carbs_g)}g F {Math.round(f.fat_g)}g
                      {(f.fiber_g != null || f.sugar_g != null || f.sodium_mg != null) && (
                        <>
                          {" "}
                          · {f.fiber_g != null && `Fiber ${Math.round(f.fiber_g)}g `}
                          {f.sugar_g != null && `Sugar ${Math.round(f.sugar_g)}g `}
                          {f.sodium_mg != null && `Sodium ${Math.round(f.sodium_mg)}mg`}
                        </>
                      )}
                      {f.is_verified && (
                        <span
                          className="verified-badge"
                          title="Verified: curated macros + real household portions"
                        >
                          <IconCheck className="icon" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <button
                      className="btn btn-ghost"
                      title={f.is_frequent ? "Remove from frequent" : "Mark as frequent"}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFrequent(f.id, !f.is_frequent);
                      }}
                    >
                      <IconStar className={f.is_frequent ? "icon icon-star" : "icon"} filled={f.is_frequent} />
                    </button>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )
      ) : presetsLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <div className="spinner" />
        </div>
      ) : filteredPresets.length === 0 ? (
        <p className="empty-state">
          No meals yet. Build one from multiple foods and it'll show up here and in the Log tab's add screen.
        </p>
      ) : (
        <div className="card">
          {filteredPresets.map((p) => (
            <div className="list-row" style={{ cursor: "pointer" }} key={p.id} onClick={() => setEditingPreset(p)}>
              <div className="list-row-main">
                <div className="list-row-title">{p.name}</div>
                <div className="list-row-sub">
                  {p.items.length} item{p.items.length === 1 ? "" : "s"}
                  {p.food && (
                    <>
                      {" · "}
                      <Energy kcal={p.food.calories} /> · P {Math.round(p.food.protein_g)}g C{" "}
                      {Math.round(p.food.carbs_g)}g F {Math.round(p.food.fat_g)}g
                    </>
                  )}
                </div>
              </div>
              <div className="list-row-actions">
                <button
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(p.id);
                  }}
                >
                  <IconClose className="icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <FoodForm
          food={null}
          onClose={() => setShowAdd(false)}
          onSave={(input, extraServings) => addFood(input, extraServings).then(() => {})}
        />
      )}
      {editingFood && (
        <FoodForm
          food={editingFood}
          existingServings={servingsByFood.get(editingFood.id) ?? []}
          onClose={() => setEditingFood(null)}
          onSave={(input, extraServings) => updateFood(editingFood.id, input, extraServings)}
        />
      )}
      {showMealBuilder && (
        <MealBuilder
          foods={foods}
          servingsByFood={servingsByFood}
          onClose={() => setShowMealBuilder(false)}
          onCreateFood={addFood}
          onFoodCreated={() => refreshFoods()}
          onSave={async (name, defaultMeal, items, servingsCount) => {
            await savePreset(name, defaultMeal, items, servingsCount);
            setShowMealBuilder(false);
          }}
        />
      )}
      {editingPreset && (
        <MealBuilder
          foods={foods}
          servingsByFood={servingsByFood}
          preset={editingPreset}
          onClose={() => setEditingPreset(null)}
          onCreateFood={addFood}
          onFoodCreated={() => refreshFoods()}
          onUpdate={async (id, name, items, servingsCount) => {
            await updatePreset(id, name, items, servingsCount);
            setEditingPreset(null);
          }}
        />
      )}
    </div>
  );
}
