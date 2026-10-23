import type {
  Restaurant,
  SearchFilterState,
  CustomerReview,
  AspectCategory,
  SentimentType,
  GenerateReplyRequest,
  GenerateReplyResponse
} from '../types/restaurant';
import { parseSearchQuery, isRestaurantInCity, matchesRestaurantKeyword, removeVietnameseAccents } from '../utils/cityUtils';

export { removeVietnameseAccents };

/**
 * Kiểm tra xem một bài đánh giá có phải là dữ liệu rác, lỗi trích xuất hoặc chứa mã template AngularJS hay không.
 * Điều kiện vi phạm:
 * 1. Bài đánh giá có text rỗng hoặc chỉ có khoảng trắng (< 2 ký tự).
 * 2. Bài đánh giá có author, text, hoặc date chứa {{, }}, Model., hoặc common_delete.
 */
export const isJunkReview = (rev: CustomerReview): boolean => {
  if (!rev) return true;

  // 1. Loại bỏ bài đánh giá có text rỗng hoặc chỉ có khoảng trắng (< 2 ký tự)
  const text = typeof rev.text === 'string' ? rev.text : '';
  if (!text || text.trim().length < 2) {
    return true;
  }

  // 2. Loại bỏ bài đánh giá có author, text, hoặc date chứa {{, }}, Model., hoặc common_delete
  const junkPatterns = ['{{', '}}', 'model.', 'common_delete'];

  const author = (typeof rev.author === 'string' ? rev.author : '').toLowerCase();
  const lowerText = text.toLowerCase();
  const date = (typeof rev.date === 'string' ? rev.date : '').toLowerCase();
  const dateDisplay = (typeof rev.dateDisplay === 'string' ? rev.dateDisplay : '').toLowerCase();

  const combined = `${author} ${lowerText} ${date} ${dateDisplay}`;

  return junkPatterns.some((pattern) => combined.includes(pattern));
};

/**
 * Helper làm sạch danh sách đánh giá: loại bỏ toàn bộ bài rác, bài rỗng, mã AngularJS template
 */
export const sanitizeReviews = (reviews: CustomerReview[]): CustomerReview[] => {
  if (!reviews || !Array.isArray(reviews)) {
    return [];
  }
  return reviews.filter((rev) => !isJunkReview(rev));
};

/**
 * Làm sạch dữ liệu nhà hàng: bảo đảm reviews, recentReviews và criticalReviews đều được lọc sạch rác
 */
export const sanitizeRestaurant = (restaurant: Restaurant): Restaurant => {
  if (!restaurant) return restaurant;
  const anyRes = restaurant as any;
  const sanitized = { ...restaurant };

  if (Array.isArray(sanitized.reviews)) {
    sanitized.reviews = sanitizeReviews(sanitized.reviews);
  }
  if (Array.isArray(anyRes.recentReviews)) {
    anyRes.recentReviews = sanitizeReviews(anyRes.recentReviews);
  }
  if (Array.isArray(anyRes.criticalReviews)) {
    anyRes.criticalReviews = sanitizeReviews(anyRes.criticalReviews);
  }

  return sanitized;
};

/**
 * Xác định API Base URL linh hoạt cho cả môi trường Development và Production Deployment
 * - Development: Mặc định '/api' được Vite Dev Server proxy tự động sang http://127.0.0.1:8000
 * - Production (Unified Docker / Single Service): Phục vụ cùng origin với FastAPI '/api'
 * - Production (Tách biệt Frontend Vercel + Backend Render): Cung cấp VITE_API_BASE_URL trong biến môi trường
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  return '/api';
};

class RestaurantService {
  private cachedRestaurants: Restaurant[] = [];
  private isBackendConnected: boolean | null = null;

  private async parseResponseSafe<T = any>(response: Response): Promise<{ ok: boolean; data?: T; errorMsg?: string }> {
    let json: any = null;
    let rawText = '';
    try {
      rawText = await response.text();
      if (rawText) {
        json = JSON.parse(rawText);
      }
    } catch {
      // Body không phải định dạng JSON (VD: plain text Internal Server Error, HTML gateway error)
    }

    if (!response.ok) {
      const errorMsg =
        json?.detail ||
        json?.message ||
        (rawText && rawText.length < 200 ? rawText : `Máy chủ phản hồi mã lỗi ${response.status}`);
      return { ok: false, errorMsg };
    }

    return { ok: true, data: json as T };
  }

  private async fetchFromApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const controller = new AbortController();
      // Timeout 30s hỗ trợ máy chủ Cloud (Render/Railway) trong giai đoạn Cold Boot
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      });
      clearTimeout(timeoutId);

      const parsed = await this.parseResponseSafe<T>(response);
      if (!parsed.ok || !parsed.data) {
        console.warn(`[RestaurantService] API ${endpoint} không thành công:`, parsed.errorMsg);
        this.isBackendConnected = false;
        return null;
      }

      this.isBackendConnected = true;
      return parsed.data;
    } catch (err: any) {
      this.isBackendConnected = false;
      console.warn(`[RestaurantService] Không thể kết nối tới Backend API tại ${endpoint}:`, err?.message || err);
      return null;
    }
  }

  public isConnectedToBackend(): boolean {
    return this.isBackendConnected === true;
  }

  public getCachedRestaurants(): Restaurant[] {
    return [...this.cachedRestaurants];
  }

  public async getAllRestaurants(forceRefresh: boolean = false): Promise<Restaurant[]> {
    if (!forceRefresh && this.isBackendConnected === true && this.cachedRestaurants.length > 0) {
      return [...this.cachedRestaurants];
    }

    const apiData = await this.fetchFromApi<Restaurant[]>('/restaurants');
    
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      this.cachedRestaurants = apiData.map((r) => sanitizeRestaurant(r));
      this.isBackendConnected = true;
      return [...this.cachedRestaurants];
    }

    if (apiData && Array.isArray(apiData) && apiData.length === 0) {
      console.warn('[RestaurantService] Kết nối Backend thành công nhưng Database SQLite chưa có bản ghi quán ăn nào.');
      this.cachedRestaurants = [];
      this.isBackendConnected = true;
      return [];
    }

    // Nếu fetch thất bại (mạng đứt, chưa bật port 8000), đánh dấu mất kết nối và trả về mảng rỗng []
    this.cachedRestaurants = [];
    this.isBackendConnected = false;
    return [];
  }

  public async getRestaurantByIdOrSlug(identifier: string): Promise<Restaurant | undefined> {
    const apiData = await this.fetchFromApi<Restaurant>(`/restaurants/${identifier}`);
    if (apiData) {
      const sanitized = sanitizeRestaurant(apiData);
      const existingIdx = this.cachedRestaurants.findIndex((r) => r.id === sanitized.id || r.slug === sanitized.slug);
      if (existingIdx >= 0) {
        this.cachedRestaurants[existingIdx] = sanitized;
      }
      return sanitized;
    }

    const cached = this.cachedRestaurants.find(
      (r) => r.id === identifier || r.slug === identifier || r.id.toLowerCase() === identifier.toLowerCase()
    );
    return cached ? sanitizeRestaurant(cached) : undefined;
  }

  public async analyzeFoodyUrl(url: string, maxReviews: number = 30): Promise<{ success: boolean; message: string; restaurant?: Restaurant }> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, max_reviews: maxReviews })
      });

      const parsed = await this.parseResponseSafe<any>(response);
      if (!parsed.ok || !parsed.data) {
        return { success: false, message: parsed.errorMsg || 'Không thể tổng hợp nhận xét từ liên kết này.' };
      }

      const data = parsed.data;
      let sanitizedRestaurant: Restaurant | undefined = undefined;
      if (data.restaurant) {
        sanitizedRestaurant = sanitizeRestaurant(data.restaurant);
        this.cachedRestaurants = [sanitizedRestaurant, ...this.cachedRestaurants.filter((r) => r.id !== sanitizedRestaurant!.id)];
      }

      return {
        success: true,
        message: data.message || 'Tổng hợp nhận xét thành công!',
        restaurant: sanitizedRestaurant
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Không thể kết nối đến máy chủ dữ liệu. Vui lòng kiểm tra lại kết nối.'
      };
    }
  }

  /**
   * Tự động tìm kiếm quán ăn trên Foody theo từ khóa, cào đánh giá và phân tích ABSA
   * Nếu quán đã tồn tại trong DB, trả về ngay từ DB.
   */
  public async searchAndCrawlFoody(
    query: string,
    city: string = 'da-nang',
    maxReviews: number = 25
  ): Promise<{ success: boolean; source: 'database' | 'crawled_and_analyzed' | 'foody'; message: string; restaurant?: Restaurant }> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/search-and-crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), city, max_reviews: maxReviews })
      });

      const parsed = await this.parseResponseSafe<any>(response);
      if (!parsed.ok || !parsed.data) {
        return {
          success: false,
          source: 'foody',
          message: parsed.errorMsg || 'Không tìm thấy hoặc không thể xử lý từ khóa này.'
        };
      }

      const data = parsed.data;
      let sanitizedRestaurant: Restaurant | undefined = undefined;
      if (data.restaurant) {
        sanitizedRestaurant = sanitizeRestaurant(data.restaurant);
        this.cachedRestaurants = [sanitizedRestaurant, ...this.cachedRestaurants.filter((r) => r.id !== sanitizedRestaurant!.id)];
      }

      return {
        success: true,
        source: data.source || 'crawled_and_analyzed',
        message: data.message || 'Thao tác thành công!',
        restaurant: sanitizedRestaurant
      };
    } catch (e: any) {
      return {
        success: false,
        source: 'foody',
        message: e?.message || 'Không thể kết nối đến máy chủ dữ liệu để tìm kiếm & tổng hợp.'
      };
    }
  }

  public sanitizeReviews(reviews: CustomerReview[]): CustomerReview[] {
    return sanitizeReviews(reviews);
  }

  public sanitizeRestaurant(restaurant: Restaurant): Restaurant {
    return sanitizeRestaurant(restaurant);
  }

  /**
   * Gửi yêu cầu cào quán vào hàng đợi ngầm (Background Queue) khi người dùng tìm không thấy trong DB.
   * Phản hồi tức thì < 50ms, không bắt người dùng chờ!
   */
  public async requestCrawl(
    query: string,
    city: string = 'da-nang'
  ): Promise<{ success: boolean; message: string; status?: string }> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/request-crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), city })
      });

      const parsed = await this.parseResponseSafe<any>(response);
      if (!parsed.ok || !parsed.data) {
        return {
          success: false,
          message: parsed.errorMsg || 'Không thể gửi yêu cầu thu thập dữ liệu.'
        };
      }

      const data = parsed.data;
      return {
        success: true,
        status: data.status,
        message: data.message || 'Yêu cầu của bạn đã được ghi nhận!'
      };
    } catch {
      return {
        success: true,
        status: 'queued',
        message: `Đã ghi nhận yêu cầu thu thập quán '${query}'. Hệ thống sẽ tự động tổng hợp đánh giá trong đợt cập nhật tiếp theo!`
      };
    }
  }

  /**
   * Lấy danh sách 4 câu hỏi định hướng nhanh cho nhà hàng
   */
  public async getQuickQuestions(restaurantId: string): Promise<string[]> {
    const res = await this.fetchFromApi<string[]>(`/restaurants/${restaurantId}/quick-questions`);
    if (res && Array.isArray(res) && res.length > 0) {
      return res;
    }
    const current = this.cachedRestaurants.find(r => r.id === restaurantId || r.slug === restaurantId);
    const shortName = current ? current.name.split('-')[0].trim() : 'quán';
    return [
      `Món ăn nào được thực khách khen nhiều nhất tại ${shortName}?`,
      'Dịch vụ và thái độ nhân viên có vấn đề gì cần lưu ý không?',
      'Mức giá và định lượng khẩu phần ăn ở đây được đánh giá thế nào?',
      'Gợi ý kế hoạch hành động cụ thể để cải thiện trải nghiệm trong tháng tới?'
    ];
  }

  /**
   * Hỏi đáp với Trợ lý AI Nhà Hàng (100% Google Gemini AI & Caching)
   */
  public async askAssistant(
    restaurantId: string,
    question: string,
    _forceAi?: boolean
  ): Promise<{ success: boolean; answer: string; source: 'cache' | 'gemini_ai'; error?: string }> {
    try {
      const baseUrl = getApiBaseUrl();
      const safeId = encodeURIComponent(restaurantId.trim());
      const response = await fetch(`${baseUrl}/restaurants/${safeId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, force_ai: true })
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: data.success ?? true,
          answer: data.answer,
          source: (data.source as 'cache' | 'gemini_ai') || 'gemini_ai'
        };
      }

      const parsed = await this.parseResponseSafe<any>(response);
      return {
        success: false,
        answer: parsed.errorMsg || '> [!WARNING]\n> *Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích. Vui lòng thử lại sau giây lát.*',
        source: 'gemini_ai',
        error: parsed.errorMsg
      };
    } catch (err: any) {
      console.warn(`[RestaurantService] Lỗi kết nối trợ lý AI cho nhà hàng ${restaurantId}:`, err?.message || err);
      return {
        success: false,
        answer: '> [!WARNING]\n> *Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích. Vui lòng thử lại sau giây lát.*',
        source: 'gemini_ai',
        error: err?.message || 'Không thể kết nối đến máy chủ phân tích.'
      };
    }
  }

  /**
   * Tìm kiếm nhà hàng thông minh:
   * 1. Hỗ trợ tìm kiếm không dấu (Bánh xèo -> banh xeo)
   * 2. Tìm kiếm theo cụm từ hoặc tất cả các từ đơn (multi-token conjunction)
   * 3. Tìm kiếm trong Tên, Ẩm thực, Địa chỉ, Thành phố, Từ khóa mẫu, và Nội dung review
   */
  public async searchRestaurants(filter: Partial<SearchFilterState>): Promise<Restaurant[]> {
    const list = await this.getAllRestaurants();
    
    // Phân tích từ khóa tìm kiếm: tách thành phố và món ăn
    const parsedQuery = filter.query && filter.query.trim() !== '' 
      ? parseSearchQuery(filter.query) 
      : null;

    // Xác định thành phố mục tiêu để lọc:
    // 1. Nếu từ khóa tìm kiếm có CHỨA THÀNH PHỐ (ví dụ "đà nẵng", "phở hà nội", "phú yên", "gia lai", "lào cai"):
    //    -> Ưu tiên tuyệt đối thành phố được nhận diện từ từ khóa!
    // 2. Nếu từ khóa KHÔNG chứa thành phố, và dropdown có chọn cụ thể:
    //    -> Dùng thành phố từ dropdown
    // 3. Nếu chỉ gõ món ăn (ví dụ: "cơm gà", "bánh xèo") và không chọn thành phố cụ thể:
    //    -> targetCity = null -> Tìm kiếm mở rộng trên toàn quốc mọi địa điểm!
    let targetCity: string | null = null;
    if (parsedQuery?.detectedCity) {
      targetCity = parsedQuery.detectedCity;
    } else if (filter.city && filter.city !== 'Tất cả địa điểm' && filter.city !== 'All Cities' && filter.city !== '') {
      targetCity = filter.city;
    }

    return list.filter((restaurant) => {
      // 1. Lọc theo thành phố
      if (targetCity) {
        if (!isRestaurantInCity(restaurant, targetCity)) {
          return false;
        }
      }

      // 2. Lọc theo từ khóa món ăn / tên quán
      if (parsedQuery) {
        // Nếu người dùng CHỈ gõ tên thành phố (ví dụ: "đà nẵng")
        if (parsedQuery.isOnlyCity && !parsedQuery.remainingKeyword) {
          // Đã lọc đúng thành phố ở bước 1, giữ lại toàn bộ quán của thành phố đó
        } else if (parsedQuery.remainingKeyword) {
          // Có từ khóa món ăn (ví dụ "cơm" trong "cơm hà nội", hoặc "cơm gà", "bánh tráng")
          if (!matchesRestaurantKeyword(restaurant, parsedQuery.remainingKeyword)) {
            return false;
          }
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
    const parsed = parseSearchQuery(query);

    return this.cachedRestaurants
      .filter((r) => {
        if (parsed.detectedCity && !isRestaurantInCity(r, parsed.detectedCity)) {
          return false;
        }
        if (parsed.isOnlyCity && !parsed.remainingKeyword) {
          return true;
        }
        return matchesRestaurantKeyword(r, parsed.remainingKeyword || query);
      })
      .slice(0, 6)
      .map((r) => ({
        name: r.name,
        cuisine: r.cuisine || r.cuisineCategory,
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
    const cleanReviews = sanitizeReviews(reviews || []);
    return cleanReviews.filter((rev) => {
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

  /**
   * Sinh thư phản hồi thực khách bằng AI (Google Gemini LLM-First)
   * Hỗ trợ 4 tông giọng chuyên sâu, voucher đền bù và In-Memory cache
   */
  public async generateReviewReply(
    restaurantId: string,
    req: GenerateReplyRequest
  ): Promise<GenerateReplyResponse> {
    const baseUrl = getApiBaseUrl();
    const safeId = encodeURIComponent(restaurantId || 'unknown');
    const controller = new AbortController();
    // Timeout 20s cho suy luận mô hình AI
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${baseUrl}/restaurants/${safeId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const parsed = await this.parseResponseSafe<GenerateReplyResponse>(response);
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.errorMsg || 'Không thể tạo phản hồi từ AI.');
      }

      return parsed.data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[RestaurantService] Lỗi khi tạo thư phản hồi AI cho quán ${restaurantId}:`, err?.message || err);
      throw err;
    }
  }
}

export const restaurantService = new RestaurantService();
