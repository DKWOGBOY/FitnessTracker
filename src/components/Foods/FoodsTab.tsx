import { useMemo, useState } from "react";
import { useFoods } from "../../hooks/useFoods";
import type { Food } from "../../lib/types";
import FoodForm from "./FoodForm";

export default function FoodsTab() {
  const { foods, loading, addFood, updateFood, deleteFood, toggleFrequent } = useFoods();
  const [query, setQuery] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }, [foods, query]);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Foods</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add
        </button>
      </div>

      <input
        type="text"
        placeholder="Search foods..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", marginBottom: 14 }}
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="empty-state">No foods yet. Add one, or search for foods from the Log tab.</p>
      ) : (
        <div className="card">
          {filtered.map((f) => (
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
                  {f.is_frequent ? "⭐" : "☆"}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditingFood(f)}>
                  Edit
                </button>
                <button className="btn btn-ghost" onClick={() => deleteFood(f.id)}>
                  ✕
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
    </div>
  );
}
