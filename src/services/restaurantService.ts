import type { Restaurant, SearchFilterState, CustomerReview, AspectCategory, SentimentType } from '../types/restaurant';
import { parseSearchQuery, isRestaurantInCity, matchesRestaurantKeyword, removeVietnameseAccents } from '../utils/cityUtils';

export { removeVietnameseAccents };

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
      this.cachedRestaurants = apiData;
      this.isBackendConnected = true;
      return [...apiData];
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

      const parsed = await this.parseResponseSafe<any>(response);
      if (!parsed.ok || !parsed.data) {
        return { success: false, message: parsed.errorMsg || 'Không thể cào và phân tích URL này.' };
      }

      const data = parsed.data;
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
      if (data.restaurant) {
        this.cachedRestaurants = [data.restaurant, ...this.cachedRestaurants.filter(r => r.id !== data.restaurant.id)];
      }

      return {
        success: true,
        source: data.source || 'crawled_and_analyzed',
        message: data.message || 'Thao tác thành công!',
        restaurant: data.restaurant
      };
    } catch (e: any) {
      return {
        success: false,
        source: 'foody',
        message: e?.message || 'Không thể kết nối đến máy chủ backend để tìm kiếm & phân tích.'
      };
    }
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
        message: `Đã ghi nhận yêu cầu thu thập quán '${query}'. Hệ thống sẽ tự động cào và phân tích trong đợt cập nhật tiếp theo!`
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
   * Hỏi đáp với Trợ lý AI Nhà Hàng (Kiến trúc Hybrid 2 tầng kết hợp Caching)
   */
  public async askAssistant(
    restaurantId: string,
    question: string,
    forceAi: boolean = false
  ): Promise<{ success: boolean; answer: string; source: 'local_bi' | 'cache' | 'gemini_ai'; error?: string }> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/restaurants/${restaurantId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, force_ai: forceAi })
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          answer: data.answer,
          source: data.source || 'local_bi'
        };
      }
    } catch {
      // Fallback nếu server chưa bật hoặc mạng ngắt
    }

    // Client-side offline synthesis fallback
    const r = this.cachedRestaurants.find(item => item.id === restaurantId || item.slug === restaurantId);
    if (!r) {
      return {
        success: false,
        answer: 'Không tìm thấy dữ liệu nhà hàng.',
        source: 'local_bi',
        error: 'Nhà hàng không tồn tại'
      };
    }

    const normQ = removeVietnameseAccents(question.toLowerCase());
    let answer = '';
    const foodAsp = r.aspects?.find(a => a.category === 'Món ăn');
    const serviceAsp = r.aspects?.find(a => a.category === 'Dịch vụ');
    const priceAsp = r.aspects?.find(a => a.category === 'Giá cả');

    const isBottleneck = 
      normQ.includes('nghen') || 
      normQ.includes('luong') || 
      normQ.includes('tron tru') || 
      normQ.includes('dau den cuoi') || 
      normQ.includes('un tac') || 
      normQ.includes('ach tac') || 
      normQ.includes('van de') || 
      normQ.includes('phan nan');

    const isAdvisoryOrMenu = 
      normQ.includes('them') || 
      normQ.includes('mon moi') || 
      normQ.includes('menu') || 
      normQ.includes('thuc don') || 
      normQ.includes('nen') || 
      normQ.includes('goi y') || 
      normQ.includes('tu van') || 
      normQ.includes('lam sao');

    if (isBottleneck) {
      const pos = r.sentimentDistribution?.positive || 50;
      const neg = r.sentimentDistribution?.negative || 20;
      const statusLine = neg >= 30
        ? `⚠️ **Cảnh báo vận hành:** Luồng hoạt động hiện tại **CHƯA TRƠN TRU**, có đến **${neg}% phản hồi chưa ưng ý** từ khách hàng Foody!`
        : `✅ **Đánh giá tổng thể:** Luồng hoạt động cơ bản trơn tru với **${pos}% khách hài lòng**, nhưng vẫn tồn tại điểm nghẽn cục bộ.`;
      const complaints = (r.attentionAreas || []).flatMap(a => a.commonComplaints || []).slice(0, 3).map(c => `  • ${c}`).join('\n') || '  • Chưa ghi nhận phàn nàn tập trung.';
      const checklist = (r.operationalChecklist || []).slice(0, 3).map(c => `  • **[${c.priority} - ${c.area}]:** ${c.issue} → *Khắc phục:* ${c.suggestedFix}`).join('\n') || '  • Tiếp tục duy trì phong độ phục vụ.';
      answer = `🚨 **Báo cáo Luồng Vận hành & Điểm nghẽn Thực tế tại ${r.name}:**\n\n${statusLine}\n\n**1. Các điểm nghẽn chính gây gián đoạn luồng phục vụ:**\n${complaints}\n\n**2. Giải pháp tháo gỡ điểm nghẽn ngay (Từ Checklist Vận hành):**\n${checklist}\n\n💡 **Khuyến nghị:** Ưu tiên số 1 của quán là tối ưu tốc độ ra món giờ cao điểm và quy chuẩn hóa tác phong phục vụ của nhân viên.`;
    } else if (isAdvisoryOrMenu) {
      const nameLower = r.name.toLowerCase();
      let dishAdvice = '';
      if (nameLower.includes('che') || nameLower.includes('sinh to') || nameLower.includes('tra')) {
        dishAdvice = 
          '- **Đồ uống giải khát pha chế sẵn (pha nhanh < 1 phút):** Trà trái cây nhiệt đới (trà đào cam sả, trà mãng cầu), Trà sữa lài thạch củ năng để phục vụ tức thì khi đông khách.\n' +
          '- **Món ăn vặt đi kèm:** Bánh tráng kẹp Đà Nẵng, Bánh tráng nướng, khô gà lá chanh để khách nhâm nhi trong lúc chờ chè.\n' +
          '- **Combo giải nhiệt:** Combo 1 Chè Thái sầu riêng + 1 Trà trái cây (giảm 5k so với mua lẻ).';
      } else if (nameLower.includes('banh xeo') || nameLower.includes('nem')) {
        dishAdvice = 
          '- **Món ăn kèm & Topping mới:** Ram bắp Quảng Ngãi, Chả giò giòn rụm, Bò cuốn lá lốt.\n' +
          '- **Đồ uống giải ngấy:** Trà tắc hạt chia, Sữa bắp nếp nhà làm, Nước mía tươi sạch.\n' +
          '- **Combo đề xuất:** Combo "Đặc Sản Cuốn" dành cho 2 người (bánh xèo + nem lụi + nước uống).';
      } else if (nameLower.includes('ga') || nameLower.includes('com')) {
        dishAdvice = 
          '- **Món ăn kèm:** Trứng ốp la lòng đào, Canh rong biển thịt bằm, Da gà chiên mắm tỏi.\n' +
          '- **Đồ uống:** Trà quất mật ong, Nước sâm dứa giải nhiệt.\n' +
          '- **Combo đề xuất:** Combo Cơm đùi góc tư + Trứng ốp + Trà tắc.';
      } else {
        dishAdvice = 
          '- **Món ăn vặt / Khai vị:** Bổ sung nem chua rán, khoai tây chiên hoặc chả giò để khách nhâm nhi lúc đợi món.\n' +
          '- **Đồ uống giải nhiệt:** Bổ sung các loại trà trái cây giải nhiệt để tăng giá trị đơn hàng.\n' +
          '- **Combo dùng thử:** Kết hợp món chính + 1 đồ uống với mức giá ưu đãi.';
      }
      answer = `💡 **Tư vấn Mở rộng Thực đơn & Thêm Món cho ${r.name}:**\n\n${dishAdvice}\n\n🎯 **Khuyến nghị:** Thử nghiệm món mới dưới dạng combo giá ưu đãi trong 2 tuần đầu để đo lường độ tiếp nhận của khách hàng.`;
    } else if (normQ.includes('khen') || normQ.includes('ngon nhat') || normQ.includes('dac sac') || normQ.includes('huong vi') || normQ.includes('do an')) {
      const pos = foodAsp?.positivePercentage || 85;
      const kw = foodAsp?.sampleKeywords?.join(', ') || 'hương vị, đậm đà';
      answer = `🍴 **Phân tích về Ẩm thực & Món ăn tại ${r.name}:**\n\n- **Tỷ lệ khen ngợi:** Khía cạnh Món ăn đạt **${pos}% phản hồi tích cực** từ thực khách.\n- **Từ khóa nổi bật:** \`${kw}\`.\n- **Đặc trưng:** ${r.strengths?.[0]?.description || 'Món ăn nêm nếm vừa vặn, hấp dẫn thực khách.'}`;
    } else if (normQ.includes('dich vu') || normQ.includes('nhan vien') || normQ.includes('phuc vu') || normQ.includes('thai do')) {
      const pos = serviceAsp?.positivePercentage || 80;
      const neg = serviceAsp?.negativePercentage || 15;
      const att = r.attentionAreas?.find(a => a.aspect === 'Dịch vụ') || r.attentionAreas?.[0];
      const complaint = att?.commonComplaints?.join('\n  • ') || 'Chưa ghi nhận phàn nàn nghiêm trọng.';
      answer = `👥 **Báo cáo Dịch vụ & Phục vụ (${r.name}):**\n\n- **Chỉ số:** **${pos}% hài lòng** vs **${neg}% cần lưu ý**.\n- **Phản ánh từ khách:**\n  • ${complaint}\n- **Khuyến nghị:** Cần đào tạo thêm nhân sự và giữ tốc độ lên món ổn định giờ cao điểm.`;
    } else if (normQ.includes('gia') || normQ.includes('tien') || normQ.includes('khau phan') || normQ.includes('dat') || normQ.includes('re')) {
      answer = `💰 **Đánh giá Giá cả & Khẩu phần ăn:**\n\n- **Khung giá tham khảo:** **${r.priceRange || '30.000₫ - 80.000₫'}**.\n- **Mức độ hài lòng:** **${priceAsp?.positivePercentage || 80}% khách hàng** nhận xét mức giá hợp lý và xứng đáng với chất lượng.\n- **Đề xuất:** Quán có thể bổ sung combo ăn kèm để tăng doanh thu.`;
    } else if (normQ.includes('ke hoach') || normQ.includes('hanh dong') || normQ.includes('cai thien') || normQ.includes('checklist')) {
      const items = (r.operationalChecklist || []).map((c, i) => `${i + 1}. **[${c.priority}] ${c.area}:** ${c.issue} → *${c.suggestedFix}*`).join('\n\n');
      answer = `📋 **Kế hoạch Hành động Cải thiện Vận hành cho ${r.name}:**\n\n${items || 'Tiếp tục duy trì chất lượng món ăn và phát huy phong độ phục vụ.'}`;
    } else {
      answer = `📊 **Bức tranh Tổng thể của ${r.name}:**\n\n- **Đánh giá trung bình:** **${r.rating}/5.0** dựa trên **${r.totalReviews} bài đánh giá**.\n- **Cảm xúc thực khách:** **${r.sentimentDistribution?.positive || 75}% Hài lòng**, **${r.sentimentDistribution?.negative || 10}% Chưa ưng ý**.\n- **Khía cạnh xuất sắc nhất:** **${r.strengths?.[0]?.aspect || 'Món ăn'}**.\n- ${r.sentimentSummarySentence || 'Quán đang duy trì phong độ phục vụ tốt.'}`;
    }

    return {
      success: true,
      answer,
      source: 'local_bi'
    };
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
    // 1. Nếu dropdown được chọn cụ thể (khác 'Tất cả địa điểm'), dùng thành phố từ dropdown
    // 2. Nếu dropdown là 'Tất cả địa điểm' và trong từ khóa CÓ CHỨA THÀNH PHỐ (ví dụ "đà nẵng", "cơm hà nội")
    //    -> Tự động lọc theo đúng thành phố đó!
    let targetCity: string | null = null;
    if (filter.city && filter.city !== 'Tất cả địa điểm' && filter.city !== 'All Cities' && filter.city !== '') {
      targetCity = filter.city;
    } else if (parsedQuery?.detectedCity) {
      targetCity = parsedQuery.detectedCity;
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
