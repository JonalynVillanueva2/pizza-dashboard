import RestaurantCard from "./RestaurantCard.jsx";

export default function RestaurantGrid({ restaurants, onSelect, onStatusChange }) {
  if (restaurants.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🍕</div>
        <p>No restaurants match your search.</p>
      </div>
    );
  }

  return (
    <div className="restaurant-grid">
      {restaurants.map((r) => (
        <RestaurantCard
          key={r.id}
          restaurant={r}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
