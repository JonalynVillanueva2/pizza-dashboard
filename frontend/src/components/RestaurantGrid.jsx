import { useState } from "react";
import RestaurantCard from "./RestaurantCard.jsx";

export default function RestaurantGrid({
  restaurants,
  pins, flags, viewMode,
  onSelect, onStatusChange,
  onTogglePin, onToggleFlag,
  onReorder, onSaveOrder,
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = (id) => setDraggedId(id);

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
      onReorder(draggedId, id);
    }
  };

  const handleDrop = () => {
    setDraggedId(null);
    setDragOverId(null);
    onSaveOrder();
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (restaurants.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🍕</div>
        <p>No restaurants match your search.</p>
      </div>
    );
  }

  const compact = viewMode === "list";

  return (
    <>
      {!compact && (
        <div className="drag-hint">☰ Drag cards to reorder</div>
      )}
      <div className={`restaurant-grid${compact ? " compact" : ""}`}>
        {restaurants.map((r) => (
          <RestaurantCard
            key={r.id}
            restaurant={r}
            pinned={pins.has(r.id)}
            flagged={flags.has(r.id)}
            compact={compact}
            onSelect={onSelect}
            onStatusChange={onStatusChange}
            onTogglePin={onTogglePin}
            onToggleFlag={onToggleFlag}
            isDragging={draggedId === r.id}
            isDragOver={dragOverId === r.id}
            onDragStart={() => handleDragStart(r.id)}
            onDragOver={(e) => handleDragOver(e, r.id)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </>
  );
}
