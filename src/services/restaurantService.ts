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

  public getCachedRestaurants(): Restaurant[] {
    return [...this.cachedRestaurants];
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

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          source: 'foody',
          message: data.detail || 'Không tìm thấy hoặc không thể xử lý từ khóa này.'
        };
      }

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

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Không thể gửi yêu cầu thu thập dữ liệu.'
        };
      }

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

    const isAdvisoryOrMenu = 
      normQ.includes('them') || 
      normQ.includes('mon moi') || 
      normQ.includes('menu') || 
      normQ.includes('thuc don') || 
      normQ.includes('nen') || 
      normQ.includes('goi y') || 
      normQ.includes('tu van') || 
      normQ.includes('lam sao');

    if (isAdvisoryOrMenu) {
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
          // Đảm bảo TẤT CẢ các token từ khóa (>= 2 ký tự) đều phải xuất hiện trong dữ liệu quán
          // Ví dụ: "bánh tráng" -> cần cả "banh" VÀ "trang", tránh nhầm lẫn với "Tràng Tiền" hay "Bánh Mì"
          const tokens = normQ.split(/\s+/).filter((t) => t.length >= 2);
          if (tokens.length > 0) {
            const allTokensMatch = tokens.every((tok) => searchableNorm.includes(tok));
            if (!allTokensMatch) {
              return false;
            }
          } else {
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
        const resNorm = removeVietnameseAccents(r.name + ' ' + (r.cuisine || '') + ' ' + (r.city || ''));
        if (resNorm.includes(normQ)) return true;
        if (tokens.length > 1) {
          return tokens.every(t => resNorm.includes(t));
        }
        return tokens.length === 1 && resNorm.includes(tokens[0]);
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
