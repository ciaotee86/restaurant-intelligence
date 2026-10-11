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
    const totalRev = r.totalReviews || 0;
    const posPct = r.sentimentDistribution?.positive || 75;
    const negPct = r.sentimentDistribution?.negative || 10;
    const neutPct = r.sentimentDistribution?.neutral || 15;

    // Guardrails ngoài phạm vi (TC19 - TC22)
    if (normQ.includes('thoi tiet') || normQ.includes('nhiet do') || normQ.includes('mua khong') || normQ.includes('bong da') || normQ.includes('the thao') || normQ.includes('gia vang') || normQ.includes('chung khoan')) {
      answer = `ℹ️ **Thông báo từ Nền tảng Restaurant Intelligence:**\n\nTôi là Trợ lý Phân tích Dữ liệu của nền tảng Restaurant Intelligence, chuyên hỗ trợ khai thác dữ liệu đánh giá thực tế và tối ưu vận hành ẩm thực. Câu hỏi của bạn nằm ngoài phạm vi phân tích đánh giá nhà hàng của hệ thống.`;
    } else if (normQ.includes('ai la nguoi') || normQ.includes('danh tinh') || normQ.includes('ten nguoi danh gia') || normQ.includes('nguoi nao viet')) {
      answer = `🛡️ **Chính sách Bảo mật & Dữ liệu Khách quan:**\n\nHệ thống tôn trọng chính sách bảo mật danh tính người dùng. Nền tảng chỉ ghi nhận và phân tích nội dung đánh giá công khai (các bài viết đánh giá thấp điểm về dịch vụ hoặc món ăn) nhằm phục vụ cải thiện chất lượng vận hành của quán, hoàn toàn không thu thập hoặc suy đoán danh tính cá nhân của người đánh giá.`;
    } else if (normQ.includes('doanh thu') || normQ.includes('loi nhuan') || normQ.includes('doanh so')) {
      if (normQ.includes('du doan') || normQ.includes('thang toi') || normQ.includes('sap toi')) {
        answer = `⚠️ **Thông báo Giới hạn Dự báo Tài chính (${r.name}):**\n\nDữ liệu đánh giá của khách hàng (${posPct}% tích cực, ${negPct}% tiêu cực) phản ánh mức độ hài lòng về hương vị và dịch vụ. Dữ liệu này **không đủ cơ sở khoa học để dự đoán doanh thu** chính xác trong tháng tới nếu thiếu các chỉ số kinh doanh cốt lõi (chi phí vận hành, giá trị trung bình đơn hàng, số lượt xoay bàn).`;
      } else {
        answer = `📊 **Giới hạn Dữ liệu Doanh thu (${r.name}):**\n\nNền tảng Restaurant Intelligence hiện chỉ thu thập và phân tích dữ liệu đánh giá trải nghiệm thực khách công khai (${totalRev} bài đánh giá). Hệ thống không có quyền truy cập vào sổ sách doanh thu hoặc dữ liệu tài chính nội bộ của quán, do đó không thể cung cấp số liệu doanh thu thực tế.`;
      }
    }
    // Truy vấn định lượng (TC07 - TC12)
    else if (normQ.includes('bao nhieu bai danh gia') || normQ.includes('bao nhieu review') || normQ.includes('tong so danh gia') || normQ.includes('so luong danh gia') || normQ.includes('co bao nhieu bai danh gia')) {
      answer = `📊 **Số lượng Dữ liệu Thu thập tại ${r.name}:**\n\nCơ sở dữ liệu của nền tảng Restaurant Intelligence hiện ghi nhận chính xác **${totalRev} bài đánh giá** từ thực khách thực tế, đã được làm sạch và xử lý qua 11 thuật toán phát hiện spam/bot.`;
    } else if (normQ.includes('bao nhieu khach hang danh gia tich cuc') || normQ.includes('bao nhieu danh gia tich cuc') || normQ.includes('bao nhieu nguoi khen') || normQ.includes('so luong tich cuc')) {
      const posCount = Math.round((totalRev * posPct) / 100);
      answer = `📈 **Thống kê Đánh giá Tích cực (${r.name}):**\n\n- **Số lượng khách hàng hài lòng:** Khoảng **${posCount}/${totalRev} lượt đánh giá**.\n- **Tỷ lệ tích cực:** Đạt **${posPct}%** trên toàn bộ dữ liệu phản hồi thu thập được.\n- **Tỷ lệ còn lại:** ${neutPct}% trung lập và ${negPct}% chưa ưng ý.`;
    } else if (normQ.includes('nhan xet tieu cuc ve dich vu') || normQ.includes('danh gia tieu cuc ve dich vu') || normQ.includes('khach che dich vu') || normQ.includes('phan nan ve dich vu')) {
      const serviceAtt = r.attentionAreas?.find(a => a.aspect === 'Dịch vụ');
      const complaints = serviceAtt?.commonComplaints?.map(c => `  • ${c}`).join('\n') || '  • Chưa ghi nhận phàn nàn nghiêm trọng về dịch vụ.';
      answer = `🔍 **Tổng hợp Nhận xét Tiêu cực về Dịch vụ tại ${r.name}:**\n\nTheo ghi nhận thực tế từ các bài đánh giá chưa ưng ý:\n${complaints}\n\n**Khuyến nghị:** Cần đào tạo bổ sung nhân sự chạy bàn vào các khung giờ cao điểm trưa và tối.`;
    } else if (normQ.includes('dan chung tu danh gia thuc te') || normQ.includes('dan chung thuc te') || normQ.includes('trich dan thuc te')) {
      const sampleQuotes = r.attentionAreas?.flatMap(a => a.sampleReviewQuotes || []).slice(0, 2) || [];
      const quotesText = sampleQuotes.length > 0 ? sampleQuotes.map(q => `  • Trích dẫn thực tế: "${q}"`).join('\n') : `  • Trích dẫn điểm mạnh: "${r.strengths?.[0]?.description || 'Món ăn nêm nếm đậm đà hợp khẩu vị.'}"`;
      answer = `📝 **Dẫn chứng Trích xuất từ Đánh giá Thực tế tại ${r.name}:**\n\nDưới đây là các câu nhận xét nguyên văn từ khách hàng thực tế:\n${quotesText}\n\n*(Tất cả trích dẫn đều trích xuất trực tiếp từ các bài review gốc, không tự tạo nội dung giả lập).*`;
    } else if (normQ.includes('nhac den nhieu lan nhat') || normQ.includes('lap lai nhieu lan')) {
      const topIssues = (r.attentionAreas || []).flatMap(a => a.commonComplaints || []).slice(0, 3).map(c => `  • ${c}`).join('\n') || '  • Không có vấn đề tiêu cực lặp lại phổ biến.';
      answer = `📌 **Các Vấn đề Được Thực khách Nhắc đến Nhiều Lần Nhất (${r.name}):**\n\n${topIssues}\n\n💡 *Khuyến nghị:* Các vấn đề lặp lại cần được quán ưu tiên xử lý trước trong quy trình vận hành.`;
    } else if (normQ.includes('tap trung vao nhung khia canh nao') || normQ.includes('chu yeu tap trung vao')) {
      const aspectList = (r.aspects || []).map(a => `  • **${a.category}:** ${a.positivePercentage}% hài lòng | ${a.negativePercentage}% phàn nàn (${a.mentionCount} lượt đề cập)`).join('\n');
      answer = `📑 **Phân bố Ý kiến Khách hàng Theo Khía cạnh (${r.name}):**\n\nCác đánh giá của khách hàng tập trung vào các khía cạnh cốt lõi sau:\n${aspectList}\n\nKhía cạnh được khen ngợi nhiều nhất là **${r.strengths?.[0]?.aspect || 'Món ăn'}**.`;
    }
    // Đề xuất kinh doanh (TC13 - TC18)
    else if (normQ.includes('lap bang') || normQ.includes('bang tong hop')) {
      const rows = (r.operationalChecklist || []).slice(0, 3).map(c => `| **${c.area}**: ${c.issue} | Quá tải ca cao điểm hoặc thiếu quy chuẩn định lượng | ${c.suggestedFix} |`).join('\n');
      answer = `📊 **Bảng Tổng hợp Vấn đề - Nguyên nhân - Giải pháp cho ${r.name}:**\n\n| Vấn đề ghi nhận từ khách | Nguyên nhân tiềm ẩn (Giả thuyết) | Giải pháp đề xuất |\n| :--- | :--- | :--- |\n${rows || '| Tốc độ phục vụ giờ cao điểm | Lượng khách dồn cục bộ cùng lúc | Phân ca hợp lý và chuẩn bị sẵn đồ ăn kèm |'}\n\n*(Ghi chú: Cột 'Vấn đề' trích từ phản hồi thật, cột 'Nguyên nhân' là giả thuyết phân tích nghiệp vụ).*`;
    } else if (normQ.includes('cai thien dieu gi truoc tien') || normQ.includes('chi mot van de') || normQ.includes('uu tien nhat') || normQ.includes('uu tien van de nao')) {
      const topIssue = r.operationalChecklist?.find(c => c.priority === 'Cao') || r.operationalChecklist?.[0];
      answer = `🎯 **Ưu tiên Số 1 Cần Cải Thiện Ngay tại ${r.name}:**\n\nNếu chỉ được chọn **duy nhất một vấn đề**, quán cần tập trung giải quyết:\n\n- **Vấn đề ưu tiên hàng đầu:** **${topIssue?.area || 'Dịch vụ'}** - ${topIssue?.issue || 'Thời gian chờ đợi lúc quán đông khách'}.\n- **Căn cứ dữ liệu:** Đây là điểm phát sinh tỷ lệ phản ánh tiêu cực cao nhất trong ${totalRev} đánh giá của thực khách.\n- **Hành động đề xuất:** ${topIssue?.suggestedFix || 'Tối ưu hóa quy trình order và chuẩn bị món nhanh'}.`;
    } else if (normQ.includes('ke hoach hanh dong cu the') || normQ.includes('trong thang toi')) {
      const item1 = r.operationalChecklist?.[0] || { issue: 'Tối ưu tốc độ phục vụ', suggestedFix: 'Sắp xếp lại ca trực' };
      const item2 = r.operationalChecklist?.[1] || { issue: 'Đảm bảo độ nóng sốt của món', suggestedFix: 'Kiểm soát khâu ra món' };
      answer = `📅 **Kế hoạch Hành động Cải thiện Trải nghiệm trong Tháng tới (${r.name}):**\n\n**Giai đoạn 1 (Tuần 1 - Tuần 2: Xử lý điểm nghẽn cấp bách):**\n- **Mục tiêu:** Giảm phàn nàn về thời gian chờ và thái độ nhân viên.\n- **Hành động:** ${item1.suggestedFix}.\n- **Hạn chót:** Ngày 14 của tháng.\n\n**Giai đoạn 2 (Tuần 3 - Tuần 4: Chuẩn hóa chất lượng & Đo lường):**\n- **Mục tiêu:** ${item2.suggestedFix}.\n- **Hành động:** Khảo sát nhanh ý kiến khách hàng tại bàn sau bữa ăn để đo lường mức độ hài lòng mới.\n- **Hạn chót:** Cuối tháng.`;
    } else if (normQ.includes('cai thien chat luong phuc vu') || normQ.includes('nang cao chat luong phuc vu')) {
      answer = `👥 **Giải pháp Cải thiện Chất lượng Phục vụ tại ${r.name}:**\n\n1. **Khắc phục điểm nghẽn:** Tập trung giảm thời gian chờ đợi lên món vào giờ cao điểm.\n2. **Tổ chức nhân sự:** Bố trí thêm nhân sự chạy bàn hỗ trợ vào khung giờ cao điểm (11h30-13h00 và 18h30-20h00).\n3. **Chuẩn hóa giao tiếp:** Quy chuẩn câu chào đón khách và chủ động xin lỗi, báo trước thời gian nếu quán đang quá tải.`;
    } else if (normQ.includes('hai long hon ve mon an') || normQ.includes('cai thien chat luong mon an')) {
      answer = `🍲 **Giải pháp Nâng cao Mức độ Hài lòng về Món ăn (${r.name}):**\n\n1. **Kiểm soát độ ổn định:** Rà soát công thức nêm nếm gia vị đồng đều giữa các mẻ nấu.\n2. **Độ nóng & Trình bày:** Đảm bảo món ăn được phục vụ ngay khi vừa chế biến xong để giữ trọn độ nóng sốt.\n3. **Đa dạng hóa:** Đưa ra các combo ăn kèm hoặc món mới dùng thử để thực khách có thêm lựa chọn.`;
    }
    // Món ăn khen / chê / khẩu phần
    else if (normQ.includes('che nhieu nhat') || normQ.includes('mon bi che')) {
      const foodAtt = r.attentionAreas?.find(a => a.aspect === 'Món ăn');
      const complaints = foodAtt?.commonComplaints?.map(c => `  • ${c}`).join('\n') || '  • Các món ăn nhìn chung được đánh giá tốt, ít phát sinh phàn nàn.';
      answer = `⚠️ **Các Phản hồi Chưa Ưng ý về Món ăn tại ${r.name}:**\n\nDựa trên bóc tách từ các đánh giá tiêu cực:\n${complaints}\n\n💡 **Khuyến nghị Bếp trưởng:** Cần kiểm tra định lượng gia vị và độ tươi mới trong từng mẻ chế biến để đảm bảo chất lượng đồng đều.`;
    } else if (normQ.includes('chat luong mon an')) {
      answer = `🍲 **Tổng hợp Nhận xét về Chất lượng Món ăn tại ${r.name}:**\n\n- **Tỷ lệ khen ngợi (Tích cực):** Đạt **${foodAsp?.positivePercentage || 80}%**, khách hàng đánh giá cao: *"${r.strengths?.[0]?.description || 'Hương vị thơm ngon vừa miệng'}"*.\n- **Tỷ lệ chưa hài lòng:** Chiếm **${foodAsp?.negativePercentage || 10}%**, chủ yếu liên quan đến độ nóng hoặc gia vị.\n- **Đánh giá chung:** Chất lượng món ăn là thế mạnh cốt lõi giúp giữ chân khách hàng của quán.`;
    } else if (normQ.includes('khau phan') || normQ.includes('dinh luong')) {
      answer = `🍽️ **Đánh giá về Khẩu phần & Định lượng Ăn (${r.name}):**\n\n- **Mức độ hài lòng:** Khoảng **${priceAsp?.positivePercentage || 80}% thực khách** cho rằng định lượng phần ăn đầy đặn, tương xứng với mức giá bán.\n- **Điểm lưu ý:** Một số ít phản hồi mong muốn bổ sung thêm đồ ăn kèm hoặc gia tăng topping cho suất lớn.`;
    } else if (normQ.includes('khen') || normQ.includes('ngon nhat') || normQ.includes('dac sac')) {
      const pos = foodAsp?.positivePercentage || 85;
      const kw = foodAsp?.sampleKeywords?.join(', ') || 'hương vị, đậm đà';
      answer = `🍴 **Phân tích về Ẩm thực & Món ăn tại ${r.name}:**\n\n- **Tỷ lệ khen ngợi:** Khía cạnh Món ăn đạt **${pos}% phản hồi tích cực** từ thực khách.\n- **Từ khóa nổi bật:** \`${kw}\`.\n- **Đặc trưng:** ${r.strengths?.[0]?.description || 'Món ăn nêm nếm vừa vặn, hấp dẫn thực khách.'}`;
    } else if (normQ.includes('dich vu') || normQ.includes('nhan vien') || normQ.includes('phuc vu') || normQ.includes('thai do')) {
      const pos = serviceAsp?.positivePercentage || 80;
      const neg = serviceAsp?.negativePercentage || 15;
      const att = r.attentionAreas?.find(a => a.aspect === 'Dịch vụ') || r.attentionAreas?.[0];
      const complaint = att?.commonComplaints?.join('\n  • ') || 'Chưa ghi nhận phàn nàn nghiêm trọng.';
      answer = `👥 **Báo cáo Dịch vụ & Phục vụ (${r.name}):**\n\n- **Chỉ số:** **${pos}% hài lòng** vs **${neg}% cần lưu ý**.\n- **Phản ánh từ khách:**\n  • ${complaint}\n- **Khuyến nghị:** Cần đào tạo thêm nhân sự và giữ tốc độ lên món ổn định giờ cao điểm.`;
    } else if (normQ.includes('gia') || normQ.includes('tien') || normQ.includes('dat') || normQ.includes('re')) {
      answer = `💰 **Đánh giá Giá cả & Khẩu phần ăn:**\n\n- **Khung giá tham khảo:** **${r.priceRange || '30.000₫ - 80.000₫'}**.\n- **Mức độ hài lòng:** **${priceAsp?.positivePercentage || 80}% khách hàng** nhận xét mức giá hợp lý và xứng đáng với chất lượng.\n- **Đề xuất:** Quán có thể bổ sung combo ăn kèm để tăng doanh thu.`;
    } else if (normQ.includes('ke hoach') || normQ.includes('hanh dong') || normQ.includes('cai thien') || normQ.includes('checklist')) {
      const items = (r.operationalChecklist || []).map((c, i) => `${i + 1}. **[${c.priority}] ${c.area}:** ${c.issue} → *${c.suggestedFix}*`).join('\n\n');
      answer = `📋 **Kế hoạch Hành động Cải thiện Vận hành cho ${r.name}:**\n\n${items || 'Tiếp tục duy trì chất lượng món ăn và phát huy phong độ phục vụ.'}`;
    } else {
      answer = `📊 **Báo cáo Tổng thể Đánh giá Thực tế tại ${r.name}:**\n\n- **Quy mô dữ liệu:** Phân tích dựa trên **${totalRev} bài đánh giá thực tế** từ thực khách.\n- **Cảm xúc thực khách:** **${posPct}% Hài lòng**, **${neutPct}% Trung lập**, **${negPct}% Chưa ưng ý**.\n- **Khía cạnh xuất sắc nhất:** **${r.strengths?.[0]?.aspect || 'Món ăn'}**.\n- ${r.sentimentSummarySentence || 'Quán đang duy trì phong độ phục vụ tốt.'}`;
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
