import { MOCK_RESTAURANTS } from '../data/mockRestaurants';
import type { Restaurant, SearchFilterState, CustomerReview, AspectCategory, SentimentType } from '../types/restaurant';

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
 * Ví dụ: "Bánh xèo" -> "banh xeo", "Phở Thìn" -> "pho thin", "Cơm gà" -> "com ga"
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'Đ' ? 'D' : 'd'))
    .toLowerCase()
    .trim();
}

/**
 * Xác định API Base URL linh hoạt cho cả môi trường Development và Production Deployment
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '5173' || port === '3000') {
      return 'http://localhost:8000/api';
    }
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
    const apiData = await this.fetchFromApi<Restaurant>(`/restaurants/${identifier}`);
    if (apiData) {
      return apiData;
    }

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

  /**
   * Tìm kiếm nhà hàng thông minh:
   * 1. Hỗ trợ tìm kiếm không dấu (Bánh xèo -> banh xeo)
   * 2. Tìm kiếm theo từng từ đơn (Token-based: "Pizza time" -> tìm các quán khớp "Pizza")
   * 3. Tìm kiếm trong Tên, Ẩm thực, Địa chỉ, Thành phố, Từ khóa mẫu, và Nội dung review
   */
  public async searchRestaurants(filter: Partial<SearchFilterState>): Promise<Restaurant[]> {
    const list = await this.getAllRestaurants();
    
    return list.filter((restaurant) => {
      // 1. Lọc theo từ khóa tìm kiếm (Thông minh & Bỏ dấu)
      if (filter.query && filter.query.trim() !== '') {
        const rawQ = filter.query.trim().toLowerCase();
        const normQ = removeVietnameseAccents(filter.query);

        // Tạo chuỗi tìm kiếm tổng hợp có dấu và không dấu
        const searchableRaw = [
          restaurant.name,
          restaurant.brand,
          restaurant.cuisine,
          restaurant.cuisineCategory,
          restaurant.city,
          restaurant.address,
          ...(restaurant.aspects?.flatMap((a) => a.sampleKeywords) || []),
          ...(restaurant.reviews?.map((r) => r.text) || [])
        ].join(' ').toLowerCase();

        const searchableNorm = removeVietnameseAccents(searchableRaw);

        // Trường hợp 1: Khớp nguyên cụm từ (Exact phrase match)
        if (searchableRaw.includes(rawQ) || searchableNorm.includes(normQ)) {
          // Khớp hoàn toàn
        } else {
          // Trường hợp 2: Tách thành các từ khóa đơn (Token match)
          // Ví dụ: người dùng gõ "Pizza time" -> tách ["pizza", "time"]
          // Nếu có bất kỳ từ khóa nào có nghĩa (>2 ký tự) khớp thì coi là tìm thấy
          const tokens = normQ.split(/\s+/).filter((t) => t.length >= 2);
          const hasMatchingToken = tokens.some((tok) => searchableNorm.includes(tok));

          if (!hasMatchingToken) {
            return false;
          }
        }
      }

      // 2. Lọc theo thành phố
      if (filter.city && filter.city !== 'Tất cả địa điểm' && filter.city !== 'All Cities' && filter.city !== '') {
        const normFilterCity = removeVietnameseAccents(filter.city);
        const normResCity = removeVietnameseAccents(restaurant.city);
        if (!normResCity.includes(normFilterCity)) {
          return false;
        }
      }

      // 3. Lọc theo ẩm thực
      if (filter.cuisineCategory && filter.cuisineCategory !== 'Tất cả ẩm thực' && filter.cuisineCategory !== 'All Cuisines' && filter.cuisineCategory !== '') {
        const normFilterCuisine = removeVietnameseAccents(filter.cuisineCategory);
        const normResCuisine = removeVietnameseAccents(restaurant.cuisineCategory + ' ' + restaurant.cuisine);
        if (!normResCuisine.includes(normFilterCuisine)) {
          return false;
        }
      }

      // 4. Lọc theo điểm tối thiểu
      if (filter.minRating && filter.minRating > 0) {
        if (restaurant.rating < filter.minRating) {
          return false;
        }
      }

      // 5. Lọc theo tình trạng cảm xúc
      if (filter.sentimentHealth && filter.sentimentHealth !== 'all') {
        if (filter.sentimentHealth === 'high_positive' && restaurant.sentimentDistribution.positive < 70) {
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
      // Ưu tiên xếp quán khớp tên cao hơn
      if (filter.query && filter.query.trim()) {
        const normQ = removeVietnameseAccents(filter.query);
        const aNameNorm = removeVietnameseAccents(a.name);
        const bNameNorm = removeVietnameseAccents(b.name);
        const aExact = aNameNorm.includes(normQ);
        const bExact = bNameNorm.includes(normQ);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }

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
    const normQ = removeVietnameseAccents(query);
    const tokens = normQ.split(/\s+/).filter(t => t.length >= 2);

    return this.cachedRestaurants
      .filter((r) => {
        const resNorm = removeVietnameseAccents(r.name + ' ' + r.cuisine + ' ' + r.city);
        if (resNorm.includes(normQ)) return true;
        return tokens.some(t => resNorm.includes(t));
      })
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
        const normKw = removeVietnameseAccents(searchKeyword);
        const normText = removeVietnameseAccents(rev.text);
        const normAuthor = removeVietnameseAccents(rev.author);
        const inAspects = rev.aspects?.some((a) => removeVietnameseAccents(a.phrase).includes(normKw));
        
        if (!normText.includes(normKw) && !normAuthor.includes(normKw) && !inAspects) {
          return false;
        }
      }
      return true;
    });
  }
}

export const restaurantService = new RestaurantService();
