import type { MealPresetWithItems } from "../../lib/types";

interface Props {
  presets: MealPresetWithItems[];
  onQuickAdd: (preset: MealPresetWithItems) => void;
  onDelete: (id: string) => void;
}

export default function PresetBar({ presets, onQuickAdd, onDelete }: Props) {
  if (presets.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-title" style={{ marginTop: 0 }}>
        Presets
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {presets.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              flexShrink: 0,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onClick={() => onQuickAdd(p)}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{p.name}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                {p.items.length} item{p.items.length === 1 ? "" : "s"}
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(p.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
