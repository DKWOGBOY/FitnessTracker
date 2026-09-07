import { useMemo, useState } from "react";
import { useFoods } from "../../hooks/useFoods";
import { useMealPresets } from "../../hooks/useMealPresets";
import type { Food } from "../../lib/types";
import FoodForm from "./FoodForm";
import MealBuilder from "./MealBuilder";
import { IconClose, IconStar } from "../icons";

type View = "foods" | "meals";

export default function FoodsTab() {
  const { foods, loading, addFood, updateFood, deleteFood, toggleFrequent } = useFoods();
  const { presets, loading: presetsLoading, savePreset, deletePreset } = useMealPresets();
  const [view, setView] = useState<View>("foods");
  const [query, setQuery] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);

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
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Foods</h2>
        <button
          className="btn btn-primary"
          onClick={() => (view === "foods" ? setShowAdd(true) : setShowMealBuilder(true))}
        >
          + {view === "foods" ? "Add" : "Create meal"}
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
              <div className="list-row" key={f.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{f.name}</div>
                  <div className="list-row-sub">
                    {Math.round(f.calories)} kcal /100{f.serving_unit === "ml" ? "ml" : "g"} · P{" "}
                    {Math.round(f.protein_g)}g C {Math.round(f.carbs_g)}g F {Math.round(f.fat_g)}g ·{" "}
                    <span className="badge-muted badge">{f.source}</span>
                  </div>
                </div>
                <div className="list-row-actions">
                  <button
                    className="btn btn-ghost"
                    title={f.is_frequent ? "Remove from frequent" : "Mark as frequent"}
                    onClick={() => toggleFrequent(f.id, !f.is_frequent)}
                  >
                    <IconStar className={f.is_frequent ? "icon icon-star" : "icon"} filled={f.is_frequent} />
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditingFood(f)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost" onClick={() => deleteFood(f.id)}>
                    <IconClose className="icon" />
                  </button>
                </div>
              </div>
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
            <div className="list-row" key={p.id}>
              <div className="list-row-main">
                <div className="list-row-title">{p.name}</div>
                <div className="list-row-sub">
                  {p.items.length} item{p.items.length === 1 ? "" : "s"}
                  {p.food
                    ? ` · ${Math.round(p.food.calories)} kcal · P ${Math.round(p.food.protein_g)}g C ${Math.round(
                        p.food.carbs_g,
                      )}g F ${Math.round(p.food.fat_g)}g`
                    : ""}
                </div>
              </div>
              <div className="list-row-actions">
                <button className="btn btn-ghost" onClick={() => deletePreset(p.id)}>
                  <IconClose className="icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <FoodForm food={null} onClose={() => setShowAdd(false)} onSave={(input) => addFood(input).then(() => {})} />
      )}
      {editingFood && (
        <FoodForm
          food={editingFood}
          onClose={() => setEditingFood(null)}
          onSave={(input) => updateFood(editingFood.id, input)}
        />
      )}
      {showMealBuilder && (
        <MealBuilder
          foods={foods}
          onClose={() => setShowMealBuilder(false)}
          onCreateFood={addFood}
          onSave={async (name, defaultMeal, items) => {
            await savePreset(name, defaultMeal, items);
            setShowMealBuilder(false);
          }}
        />
      )}
    </div>
  );
}
