// TypeScript types for Favorites API responses

// Відповідь для GET /favorites - список улюблених properties
export interface FavoritesListResponse {
  success: boolean;
  data: any[]; // Property[] - масив properties з усіма relations
}

// Відповідь для POST /favorites/:propertyId - додавання в улюблені
export interface AddFavoriteResponse {
  success: boolean;
  data: {
    message: string;
    propertyId: string;
  };
}

// Відповідь для DELETE /favorites/:propertyId - видалення з улюблених
export interface RemoveFavoriteResponse {
  success: boolean;
  data: {
    message: string;
    propertyId: string;
  };
}

// Відповідь для перевірки статусу favorite
export interface FavoriteStatusResponse {
  success: boolean;
  data: {
    isFavorite: boolean;
    propertyId: string;
  };
}

// Відповідь для GET /favorites/ids - тільки ID
export interface FavoriteIdsResponse {
  success: boolean;
  data: {
    favoriteIds: string[];
  };
}

