import { MOCK_RESTAURANTS } from '../data/mockRestaurants';
import type { Restaurant, SearchFilterState, CustomerReview, AspectCategory, SentimentType } from '../types/restaurant';

/**
 * Xác định API Base URL linh hoạt cho cả môi trường Development và Production Deployment
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    // Khi chạy local dev với Vite (port 5173) -> gọi sang FastAPI backend (port 8000)
    if (port === '5173' || port === '3000') {
      return 'http://localhost:8000/api';
    }
    // Khi đã deploy website thật (FastAPI phục vụ cả web và API trên cùng domain)
    return '/api';
  }
  return '/api';
};

class RestaurantService {
  private cachedRestaurants: Restaurant[] = [...MOCK_RESTAURANTS];
  private isBackendConnected: boolean | null = null;

  private async fetchFromApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      this.isBackendConnected = true;
      return await response.json();
    } catch {
      // Backend offline hoặc lỗi mạng -> fallback mượt mà
      this.isBackendConnected = false;
      return null;
    }
  }

  public isConnectedToBackend(): boolean {
    return this.isBackendConnected === true;
  }

  public async getAllRestaurants(): Promise<Restaurant[]> {
    const apiData = await this.fetchFromApi<Restaurant[]>('/restaurants');
    
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      // Hợp nhất dữ liệu từ SQLite thật và danh mục mẫu tiêu chuẩn
      const existingIds = new Set(apiData.map(r => r.id));
      const merged = [...apiData];
      for (const m of MOCK_RESTAURANTS) {
        if (!existingIds.has(m.id)) {
          merged.push(m);
        }
      }
      this.cachedRestaurants = merged;
      return merged;
    }

    return [...this.cachedRestaurants];
  }

  public async getRestaurantByIdOrSlug(identifier: string): Promise<Restaurant | undefined> {
    // Thử lấy từ Backend API
    const apiData = await this.fetchFromApi<Restaurant>(`/restaurants/${identifier}`);
    if (apiData) {
      return apiData;
    }

    // Fallback tìm trong cache / mock data
    return this.cachedRestaurants.find(
      (r) => r.id === identifier || r.slug === identifier || r.id.toLowerCase() === identifier.toLowerCase()
    );
  }

  public async analyzeFoodyUrl(url: string, maxReviews: number = 30): Promise<{ success: boolean; message: string; restaurant?: Restaurant }> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, max_reviews: maxReviews })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.detail || 'Không thể cào và phân tích URL này.' };
      }

      if (data.restaurant) {
        // Cập nhật vào danh sách hiển thị tức thì
        this.cachedRestaurants = [data.restaurant, ...this.cachedRestaurants.filter(r => r.id !== data.restaurant.id)];
      }

      return {
        success: true,
        message: data.message || 'Phân tích thành công!',
        restaurant: data.restaurant
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Không thể kết nối đến máy chủ phân tích AI. Vui lòng kiểm tra backend server.'
      };
    }
  }

  public async searchRestaurants(filter: Partial<SearchFilterState>): Promise<Restaurant[]> {
    const list = await this.getAllRestaurants();
    
    return list.filter((restaurant) => {
      // Lọc theo từ khóa tìm kiếm
      if (filter.query && filter.query.trim() !== '') {
        const q = filter.query.toLowerCase().trim();
        const matchesName = restaurant.name.toLowerCase().includes(q);
        const matchesCuisine = restaurant.cuisine.toLowerCase().includes(q);
        const matchesCity = restaurant.city.toLowerCase().includes(q);
        const matchesKeywords = restaurant.aspects?.some((a) =>
          a.sampleKeywords.some((k) => k.toLowerCase().includes(q))
        );
        if (!matchesName && !matchesCuisine && !matchesCity && !matchesKeywords) {
          return false;
        }
      }

      // Lọc theo thành phố
      if (filter.city && filter.city !== 'Tất cả địa điểm' && filter.city !== 'All Cities' && filter.city !== '') {
        if (restaurant.city.toLowerCase() !== filter.city.toLowerCase()) {
          return false;
        }
      }

      // Lọc theo ẩm thực
      if (filter.cuisineCategory && filter.cuisineCategory !== 'Tất cả ẩm thực' && filter.cuisineCategory !== 'All Cuisines' && filter.cuisineCategory !== '') {
        if (restaurant.cuisineCategory.toLowerCase() !== filter.cuisineCategory.toLowerCase()) {
          return false;
        }
      }

      // Lọc theo điểm tối thiểu
      if (filter.minRating && filter.minRating > 0) {
        if (restaurant.rating < filter.minRating) {
          return false;
        }
      }

      // Lọc theo tình trạng cảm xúc
      if (filter.sentimentHealth && filter.sentimentHealth !== 'all') {
        if (filter.sentimentHealth === 'high_positive' && restaurant.sentimentDistribution.positive < 75) {
          return false;
        }
        if (filter.sentimentHealth === 'needs_attention' && restaurant.sentimentDistribution.negative < 12) {
          return false;
        }
        if (filter.sentimentHealth === 'balanced') {
          if (restaurant.sentimentDistribution.positive >= 75 || restaurant.sentimentDistribution.negative >= 15) {
            return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      if (filter.sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (filter.sortBy === 'positive_sentiment') {
        return b.sentimentDistribution.positive - a.sentimentDistribution.positive;
      }
      if (filter.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return b.totalReviews - a.totalReviews;
    });
  }

  public getSearchSuggestions(query: string): { name: string; cuisine: string; city: string; id: string }[] {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return this.cachedRestaurants
      .filter((r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q))
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        cuisine: r.cuisine,
        city: r.city,
        id: r.id
      }));
  }

  public filterReviews(
    reviews: CustomerReview[],
    sentimentFilter: 'all' | SentimentType,
    aspectFilter: 'all' | AspectCategory,
    searchKeyword: string
  ): CustomerReview[] {
    return (reviews || []).filter((rev) => {
      if (sentimentFilter !== 'all' && rev.overallSentiment !== sentimentFilter) {
        return false;
      }
      if (aspectFilter !== 'all') {
        const hasAspect = rev.aspects?.some((a) => a.aspect === aspectFilter);
        if (!hasAspect) return false;
      }
      if (searchKeyword && searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase().trim();
        const inText = rev.text.toLowerCase().includes(kw);
        const inAspects = rev.aspects?.some((a) => a.phrase.toLowerCase().includes(kw));
        if (!inText && !inAspects) return false;
      }
      return true;
    });
  }
}

export const restaurantService = new RestaurantService();
