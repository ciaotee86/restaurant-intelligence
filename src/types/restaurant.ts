export type SentimentType = 'positive' | 'neutral' | 'negative';

export type AspectCategory = 'Món ăn' | 'Dịch vụ' | 'Giá cả' | 'Không gian' | 'Vị trí';

export interface AspectSentimentSummary {
  category: AspectCategory;
  mentionCount: number;
  mentionPercentage: number; // e.g. 84%
  positivePercentage: number; // e.g. 84%
  neutralPercentage: number;  // e.g. 10%
  negativePercentage: number; // e.g. 6%
  sampleKeywords: string[];
}

export interface HighlightSpan {
  text: string;
  aspect: AspectCategory;
  sentiment: SentimentType;
  startIndex: number;
  endIndex: number;
}

export interface ExtractedAspect {
  aspect: AspectCategory;
  sentiment: SentimentType;
  phrase: string;
  confidence: number; // e.g. 0.94
}

export interface CustomerReview {
  id: string;
  restaurantId: string;
  author: string;
  rating: number; // 1 to 5
  date: string;
  dateDisplay: string; // e.g. "20/08/2026"
  text: string;
  overallSentiment: SentimentType;
  aspects: ExtractedAspect[];
  highlightSpans: HighlightSpan[];
  sourceUrl?: string;
  source: 'Foody' | 'GoogleMaps' | string;
  googleReviewId?: string;
  verifiedVisit?: boolean;
}

export interface SentimentTimePoint {
  period: string; // e.g. "T6/2026", "T7/2026"
  positive: number; // percentage
  neutral: number;
  negative: number;
  totalReviews: number;
  averageRating: number;
}

export interface ComplaintCluster {
  aspect: AspectCategory;
  negativePercentage: number; // e.g. 31%
  complaintCount: number; // e.g. 187
  commonComplaints: string[];
  sampleReviewQuotes: string[];
  recommendedAction: string;
}

export interface StrengthCluster {
  aspect: AspectCategory;
  positivePercentage: number;
  mentionCount: number;
  title: string;
  description: string;
  sampleKeywords: string[];
}

export interface KeyFinding {
  id: string;
  number: string; // "01", "02", "03", "04"
  title: string;
  description: string;
  aspect: AspectCategory;
  sentimentTrend: 'positive' | 'negative' | 'neutral';
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  cuisine: string; // e.g. "Ý · Pizza", "Ẩm thực Việt truyền thống", "Cà phê đặc sản"
  cuisineCategory: string;
  city: string;
  address: string;
  priceRange: string; // e.g. "200.000₫ - 500.000₫"
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  rating: number; // e.g. 4.5
  totalReviews: number; // e.g. 3284
  lastAnalyzedDate: string; // e.g. "24/08/2026"
  dataSource: string; // "Foody" | "Google Maps" | "Foody + Google Maps"
  
  // Đa nguồn dữ liệu & Độ tin cậy mẫu (MOD-03 & SPEC-FEAT-06)
  googleMapsUrl?: string;
  foodyUrl?: string;
  sourceBreakdown?: {
    total: number;
    foody: number;
    googleMaps: number;
  };
  credibilityScore?: number; // 0..100 (%)
  credibilityLevel?: 'high' | 'medium' | 'low';
  sampleWarning?: string | null;
  // Tổng hợp cảm xúc
  sentimentDistribution: {
    positive: number; // 76%
    neutral: number;  // 16%
    negative: number; // 8%
  };
  sentimentSummarySentence: string;
  
  // Phân tích khía cạnh (ABSA)
  aspects: AspectSentimentSummary[];
  
  // Xu hướng theo thời gian
  trendData: {
    '3m': SentimentTimePoint[];
    '6m': SentimentTimePoint[];
    '1y': SentimentTimePoint[];
    'all': SentimentTimePoint[];
  };
  
  // Đánh giá điểm mạnh và cần chú ý
  strengths: StrengthCluster[];
  attentionAreas: ComplaintCluster[];
  keyFindings: KeyFinding[];
  
  // Danh mục đề xuất vận hành cho quản lý
  operationalChecklist: {
    priority: 'Cao' | 'Trung bình' | 'Thấp';
    area: string;
    issue: string;
    impact: string;
    suggestedFix: string;
  }[];

  // Danh sách review mẫu
  reviews: CustomerReview[];
}

export interface SearchFilterState {
  query: string;
  city: string;
  cuisineCategory: string;
  minRating: number;
  sentimentHealth: 'all' | 'high_positive' | 'balanced' | 'needs_attention';
  sortBy: 'reviews' | 'rating' | 'positive_sentiment' | 'name';
}

/** 4 Tông giọng phản hồi thực khách F&B */
export type ReplyTone = 'apology' | 'voucher' | 'gratitude' | 'clarification';

/** Yêu cầu sinh thư phản hồi gửi tới Backend / Gemini */
export interface GenerateReplyRequest {
  restaurantId?: string;
  restaurantName?: string;
  reviewId?: string;
  author: string;
  rating: number;
  overallSentiment?: 'positive' | 'neutral' | 'negative' | SentimentType;
  reviewText: string;
  aspects?: Array<{
    aspect: AspectCategory | string;
    sentiment: SentimentType | string;
  }> | ExtractedAspect[];
  tone: ReplyTone;
  includeVoucher?: boolean;
  voucherDiscountPercent?: number;
  forceRegenerate?: boolean;
}

/** Kết quả sinh phản hồi trả về từ Backend / Gemini */
export interface GenerateReplyResponse {
  replyText: string;
  toneUsed: ReplyTone;
  engineUsed: 'gemini_ai' | 'gemini_cache' | 'gemini_fallback' | string;
  responseTimeMs: number;
  generatedVoucherCode?: string;
  aspectsAddressed: string[];
  modelName: string;
}

/** Yêu cầu cào và phân tích đánh giá từ Google Maps */
export interface CrawlGoogleMapsRequest {
  restaurantId?: string;
  googleMapsUrl?: string;
  queryName?: string;
  maxReviews?: number;
}

/** Kết quả trả về sau khi cào và phân tích đánh giá Google Maps */
export interface CrawlGoogleMapsResponse {
  success: boolean;
  restaurantId: string;
  restaurantName: string;
  source: 'google_maps' | 'GoogleMaps' | string;
  newReviewsCount: number;
  duplicateReviewsSkipped: number;
  totalReviewsNow: number;
  credibilityScore?: number;
  elapsedSeconds?: number;
  message?: string;
  restaurant?: Restaurant;
}

