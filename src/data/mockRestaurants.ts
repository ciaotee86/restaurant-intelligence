import type { Restaurant } from '../types/restaurant';

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'pizza-4ps-trang-tien',
    slug: 'pizza-4ps-trang-tien-hanoi',
    name: "Pizza 4P's",
    brand: "Pizza 4P's Vietnam",
    cuisine: "Ý · Pizza",
    cuisineCategory: "Ý",
    city: "Hà Nội",
    address: "43 Tràng Tiền, Hoàn Kiếm, Hà Nội",
    priceRange: "200.000₫ - 500.000₫",
    priceLevel: "$$$",
    rating: 4.5,
    totalReviews: 3284,
    lastAnalyzedDate: "24/08/2026",
    dataSource: "Foody",
    
    sentimentDistribution: {
      positive: 76,
      neutral: 16,
      negative: 8
    },
    sentimentSummarySentence: "Phần lớn khách hàng có trải nghiệm tổng thể rất tích cực, phản hồi tiêu cực chỉ chiếm một tỷ lệ tương đối nhỏ trong toàn bộ đánh giá.",
    
    aspects: [
      {
        category: "Món ăn",
        mentionCount: 2758,
        mentionPercentage: 84,
        positivePercentage: 84,
        neutralPercentage: 11,
        negativePercentage: 5,
        sampleKeywords: ["phô mai burrata", "mỳ ý sốt cua", "pizza 4 loại phô mai", "nguyên liệu tươi", "đế bánh nướng củi"]
      },
      {
        category: "Không gian",
        mentionCount: 2561,
        mentionPercentage: 78,
        positivePercentage: 78,
        neutralPercentage: 16,
        negativePercentage: 6,
        sampleKeywords: ["bếp mở", "ánh sáng ấm cúng", "bài trí thoáng đãng", "không khí lãng mạn", "thiết kế hiện đại"]
      },
      {
        category: "Dịch vụ",
        mentionCount: 2003,
        mentionPercentage: 61,
        positivePercentage: 61,
        neutralPercentage: 18,
        negativePercentage: 21,
        sampleKeywords: ["tiếp đón đặt bàn", "thời gian chờ món", "sự chu đáo của nhân viên", "tốc độ phục vụ", "dọn bàn"]
      },
      {
        category: "Giá cả",
        mentionCount: 1740,
        mentionPercentage: 53,
        positivePercentage: 53,
        neutralPercentage: 32,
        negativePercentage: 15,
        sampleKeywords: ["tương xứng chất lượng", "giá cao", "khẩu phần ăn", "đáng tiền", "phí dịch vụ"]
      },
      {
        category: "Vị trí",
        mentionCount: 1576,
        mentionPercentage: 48,
        positivePercentage: 72,
        neutralPercentage: 18,
        negativePercentage: 10,
        sampleKeywords: ["trung tâm Hà Nội", "gần Nhà hát Lớn", "phố Tràng Tiền", "chỗ gửi xe"]
      }
    ],

    trendData: {
      '3m': [
        { period: "T6/2026", positive: 74, neutral: 17, negative: 9, totalReviews: 245, averageRating: 4.4 },
        { period: "T7/2026", positive: 77, neutral: 15, negative: 8, totalReviews: 280, averageRating: 4.5 },
        { period: "T8/2026", positive: 76, neutral: 16, negative: 8, totalReviews: 298, averageRating: 4.5 }
      ],
      '6m': [
        { period: "T3/2026", positive: 73, neutral: 18, negative: 9, totalReviews: 230, averageRating: 4.4 },
        { period: "T4/2026", positive: 75, neutral: 17, negative: 8, totalReviews: 260, averageRating: 4.5 },
        { period: "T5/2026", positive: 72, neutral: 18, negative: 10, totalReviews: 275, averageRating: 4.3 },
        { period: "T6/2026", positive: 74, neutral: 17, negative: 9, totalReviews: 245, averageRating: 4.4 },
        { period: "T7/2026", positive: 77, neutral: 15, negative: 8, totalReviews: 280, averageRating: 4.5 },
        { period: "T8/2026", positive: 76, neutral: 16, negative: 8, totalReviews: 298, averageRating: 4.5 }
      ],
      '1y': [
        { period: "T9/2025", positive: 78, neutral: 15, negative: 7, totalReviews: 220, averageRating: 4.6 },
        { period: "T11/2025", positive: 75, neutral: 17, negative: 8, totalReviews: 240, averageRating: 4.5 },
        { period: "T1/2026", positive: 71, neutral: 19, negative: 10, totalReviews: 310, averageRating: 4.3 },
        { period: "T3/2026", positive: 73, neutral: 18, negative: 9, totalReviews: 230, averageRating: 4.4 },
        { period: "T5/2026", positive: 72, neutral: 18, negative: 10, totalReviews: 275, averageRating: 4.3 },
        { period: "T8/2026", positive: 76, neutral: 16, negative: 8, totalReviews: 298, averageRating: 4.5 }
      ],
      'all': [
        { period: "2023", positive: 81, neutral: 13, negative: 6, totalReviews: 950, averageRating: 4.7 },
        { period: "2024", positive: 79, neutral: 14, negative: 7, totalReviews: 1100, averageRating: 4.6 },
        { period: "2025", positive: 75, neutral: 17, negative: 8, totalReviews: 1020, averageRating: 4.5 },
        { period: "2026 (Nay)", positive: 76, neutral: 16, negative: 8, totalReviews: 834, averageRating: 4.5 }
      ]
    },

    strengths: [
      {
        aspect: "Món ăn",
        positivePercentage: 84,
        mentionCount: 2316,
        title: "Chất lượng món ăn",
        description: "Thường xuyên được khách hàng khen ngợi về phô mai burrata thủ công tự làm, nêm nếm hài hòa và độ giòn thơm của đế bánh nướng củi.",
        sampleKeywords: ["phô mai burrata", "phô mai tươi", "đế bánh giòn", "mỳ ý sốt cua"]
      },
      {
        aspect: "Không gian",
        positivePercentage: 78,
        mentionCount: 1997,
        title: "Không gian nhà hàng",
        description: "Khách hàng thường xuyên nhắc đến không gian quán một cách tích cực, nhấn mạnh ánh sáng dễ chịu và phong cách bài trí sang trọng.",
        sampleKeywords: ["ánh sáng ấm cúng", "bếp lò nướng mở", "bàn ghế rộng rãi"]
      },
      {
        aspect: "Món ăn",
        positivePercentage: 88,
        mentionCount: 1420,
        title: "Độ tươi của nguyên liệu",
        description: "Rau thơm hữu cơ tươi, các loại phô mai tự sản xuất và hải sản tươi ngon được liên tục đánh giá cao trong các bài viết tích cực.",
        sampleKeywords: ["rau rocket tươi", "lá quế tươi", "nguyên liệu organic", "nông trại đến bàn ăn"]
      }
    ],

    attentionAreas: [
      {
        aspect: "Dịch vụ",
        negativePercentage: 31,
        complaintCount: 187,
        commonComplaints: [
          "Thời gian chờ món lâu trong các khung giờ cao điểm tối cuối tuần",
          "Tốc độ ra món pizza chính bị chậm so với món khai vị",
          "Nhân viên phản hồi chậm khi khách yêu cầu thêm nước hoặc dụng cụ ăn"
        ],
        sampleReviewQuotes: [
          "Pizza thì tuyệt vời nhưng chúng tôi phải đợi gần 40 phút trước khi món được mang ra bàn.",
          "Dù đã đặt bàn trước qua ứng dụng nhưng vẫn phải đứng chờ ở sảnh 15 phút mới được xếp chỗ."
        ],
        recommendedAction: "Tối ưu hóa lịch nướng lò trong khung giờ 19:30-21:00 và tăng cường nhân sự hỗ trợ tiếp nước khu vực tầng lửng."
      },
      {
        aspect: "Giá cả",
        negativePercentage: 24,
        complaintCount: 94,
        commonComplaints: [
          "Giá đồ uống và rượu vang được đánh giá là tương đối cao",
          "Khẩu phần một số món mỳ ý đặc biệt hơi ít so với tầm giá"
        ],
        sampleReviewQuotes: [
          "Đồ ăn ngon nhưng món tráng miệng và mocktail giá khá chát.",
          "Đĩa mỳ ý cua năm nay cảm giác khẩu phần nhỏ hơn lần trước."
        ],
        recommendedAction: "Cung cấp các set combo hoặc thông tin minh bạch về nguồn gốc nguyên liệu thủ công để tăng cảm nhận giá trị."
      }
    ],

    keyFindings: [
      {
        id: "kf-1",
        number: "01",
        title: "Món ăn là điểm mạnh vượt trội nhất",
        description: "Khách hàng liên tục khen ngợi chất lượng món ăn và độ tươi ngon của các loại phô mai thủ công trên toàn bộ tập dữ liệu.",
        aspect: "Món ăn",
        sentimentTrend: "positive"
      },
      {
        id: "kf-2",
        number: "02",
        title: "Dịch vụ là điểm yếu vận hành chính",
        description: "Các phản hồi tiêu cực tập trung chủ yếu vào thời gian chờ món, tốc độ phục vụ và xếp bàn vào giờ cao điểm.",
        aspect: "Dịch vụ",
        sentimentTrend: "negative"
      },
      {
        id: "kf-3",
        number: "03",
        title: "Không gian duy trì phong độ tốt",
        description: "Khách hàng thường xuyên đánh giá cao trải nghiệm không gian, góc nhìn bếp lò củi và thiết kế nội thất ấm áp.",
        aspect: "Không gian",
        sentimentTrend: "positive"
      },
      {
        id: "kf-4",
        number: "04",
        title: "Tỷ lệ giữ chân khách hàng rất cao",
        description: "Tỷ lệ 76% cảm xúc tích cực khẳng định sự yêu mến của khách hàng; xử lý nút thắt tốc độ ra món sẽ gia tăng đáng kể đánh giá 5 sao.",
        aspect: "Giá cả",
        sentimentTrend: "neutral"
      }
    ],

    operationalChecklist: [
      {
        priority: "Cao",
        area: "Bếp & Điều phối lò nướng",
        issue: "Độ trễ giữa món khai vị và món pizza chính trung bình 25-40 phút vào cuối tuần",
        impact: "Chiếm 64% tổng số đánh giá 1 sao và 2 sao",
        suggestedFix: "Áp dụng cảnh báo công suất lò trên POS và giới hạn số lượng đơn nướng dồn vào cùng một thời điểm."
      },
      {
        priority: "Trung bình",
        area: "Lễ tân & Đón tiếp",
        issue: "Khách có đặt bàn trước vẫn phải chờ 15 phút trong khung giờ 19:30 thứ Bảy",
        impact: "Gây ức chế ban đầu trước khi khách ngồi vào bàn",
        suggestedFix: "Điều chỉnh thời gian xoay vòng bàn lên 105 phút thay vì 90 phút cho các bàn từ 4 người trở lên."
      },
      {
        priority: "Thấp",
        area: "Phục vụ sảnh",
        issue: "Tốc độ châm nước chưa đều tại khu vực tầng lửng",
        impact: "Xuất hiện trong các phản hồi trung lập",
        suggestedFix: "Phân công riêng 1 nhân viên chạy bàn chuyên trách tiếp nước đồ uống cho tầng lửng."
      }
    ],

    reviews: [
      {
        id: "rev-4p-101",
        restaurantId: "pizza-4ps-trang-tien",
        author: "Minh Trang N.",
        rating: 4,
        date: "2026-08-20T19:40:00Z",
        dateDisplay: "20/08/2026",
        text: "Pizza thì tuyệt vời nhưng chúng tôi phải đợi gần 40 phút trước khi món được mang ra bàn. Không gian ở đây rất ấm cúng và lịch sự.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Pizza thì tuyệt vời", confidence: 0.96 },
          { aspect: "Dịch vụ", sentiment: "negative", phrase: "đợi gần 40 phút trước khi món được mang ra bàn", confidence: 0.92 },
          { aspect: "Không gian", sentiment: "positive", phrase: "Không gian ở đây rất ấm cúng và lịch sự", confidence: 0.94 }
        ],
        highlightSpans: [
          { text: "Pizza thì tuyệt vời", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 18 },
          { text: "đợi gần 40 phút trước khi món được mang ra bàn", aspect: "Dịch vụ", sentiment: "negative", startIndex: 44, endIndex: 91 },
          { text: "Không gian ở đây rất ấm cúng và lịch sự", aspect: "Không gian", sentiment: "positive", startIndex: 93, endIndex: 132 }
        ],
        source: "Foody",
        verifiedVisit: true
      },
      {
        id: "rev-4p-102",
        restaurantId: "pizza-4ps-trang-tien",
        author: "Hoàng Long",
        rating: 5,
        date: "2026-08-18T13:15:00Z",
        dateDisplay: "18/08/2026",
        text: "Pizza phô mai Burrata trứ danh đỉnh cao ở Hà Nội. Nguyên liệu rất tươi, đế bánh nướng củi thơm giòn. Giá hơi cao nhưng hoàn toàn xứng đáng từng đồng.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Pizza phô mai Burrata trứ danh đỉnh cao", confidence: 0.98 },
          { aspect: "Món ăn", sentiment: "positive", phrase: "Nguyên liệu rất tươi, đế bánh nướng củi thơm giòn", confidence: 0.95 },
          { aspect: "Giá cả", sentiment: "neutral", phrase: "Giá hơi cao nhưng hoàn toàn xứng đáng từng đồng", confidence: 0.88 }
        ],
        highlightSpans: [
          { text: "Pizza phô mai Burrata trứ danh đỉnh cao ở Hà Nội", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 48 },
          { text: "Nguyên liệu rất tươi, đế bánh nướng củi thơm giòn", aspect: "Món ăn", sentiment: "positive", startIndex: 50, endIndex: 99 },
          { text: "Giá hơi cao nhưng hoàn toàn xứng đáng từng đồng", aspect: "Giá cả", sentiment: "positive", startIndex: 101, endIndex: 148 }
        ],
        source: "Foody",
        verifiedVisit: true
      },
      {
        id: "rev-4p-103",
        restaurantId: "pizza-4ps-trang-tien",
        author: "Thu Hà Vũ",
        rating: 2,
        date: "2026-08-15T20:10:00Z",
        dateDisplay: "15/08/2026",
        text: "Đặt bàn lúc 7:30 tối nhưng nhân viên tiếp đón thiếu chu đáo và phải đứng ở sảnh 20 phút. Món mỳ ý cua khi mang ra đã bị nguội.",
        overallSentiment: "negative",
        aspects: [
          { aspect: "Dịch vụ", sentiment: "negative", phrase: "nhân viên tiếp đón thiếu chu đáo và phải đứng ở sảnh 20 phút", confidence: 0.95 },
          { aspect: "Món ăn", sentiment: "negative", phrase: "Món mỳ ý cua khi mang ra đã bị nguội", confidence: 0.89 }
        ],
        highlightSpans: [
          { text: "nhân viên tiếp đón thiếu chu đáo và phải đứng ở sảnh 20 phút", aspect: "Dịch vụ", sentiment: "negative", startIndex: 24, endIndex: 84 },
          { text: "Món mỳ ý cua khi mang ra đã bị nguội", aspect: "Món ăn", sentiment: "negative", startIndex: 86, endIndex: 122 }
        ],
        source: "Foody",
        verifiedVisit: true
      },
      {
        id: "rev-4p-104",
        restaurantId: "pizza-4ps-trang-tien",
        author: "Alexandre Mercier",
        rating: 5,
        date: "2026-08-12T12:00:00Z",
        dateDisplay: "12/08/2026",
        text: "Ý tưởng nhà hàng xuất sắc. Khu bếp mở tạo cảm giác sống động. Pizza 4 loại phô mai rưới mật ong không đâu sánh bằng. Dịch vụ buổi trưa nhanh và lịch sự.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Không gian", sentiment: "positive", phrase: "Khu bếp mở tạo cảm giác sống động", confidence: 0.91 },
          { aspect: "Món ăn", sentiment: "positive", phrase: "Pizza 4 loại phô mai rưới mật ong không đâu sánh bằng", confidence: 0.97 },
          { aspect: "Dịch vụ", sentiment: "positive", phrase: "Dịch vụ buổi trưa nhanh và lịch sự", confidence: 0.94 }
        ],
        highlightSpans: [
          { text: "Khu bếp mở tạo cảm giác sống động", aspect: "Không gian", sentiment: "positive", startIndex: 27, endIndex: 60 },
          { text: "Pizza 4 loại phô mai rưới mật ong không đâu sánh bằng", aspect: "Món ăn", sentiment: "positive", startIndex: 62, endIndex: 115 },
          { text: "Dịch vụ buổi trưa nhanh và lịch sự", aspect: "Dịch vụ", sentiment: "positive", startIndex: 117, endIndex: 151 }
        ],
        source: "Foody",
        verifiedVisit: true
      },
      {
        id: "rev-4p-105",
        restaurantId: "pizza-4ps-trang-tien",
        author: "Đặng Tiến Dũng",
        rating: 3,
        date: "2026-08-08T21:00:00Z",
        dateDisplay: "08/08/2026",
        text: "Món ăn vẫn ngon như thường lệ, nhưng vị trí phố Tràng Tiền gửi xe máy quá đông và nhân viên không hướng dẫn chỗ đỗ cụ thể.",
        overallSentiment: "neutral",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Món ăn vẫn ngon như thường lệ", confidence: 0.90 },
          { aspect: "Vị trí", sentiment: "negative", phrase: "vị trí phố Tràng Tiền gửi xe máy quá đông", confidence: 0.88 },
          { aspect: "Dịch vụ", sentiment: "negative", phrase: "nhân viên không hướng dẫn chỗ đỗ cụ thể", confidence: 0.85 }
        ],
        highlightSpans: [
          { text: "Món ăn vẫn ngon như thường lệ", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 29 },
          { text: "vị trí phố Tràng Tiền gửi xe máy quá đông", aspect: "Vị trí", sentiment: "negative", startIndex: 36, endIndex: 77 },
          { text: "nhân viên không hướng dẫn chỗ đỗ cụ thể", aspect: "Dịch vụ", sentiment: "negative", startIndex: 81, endIndex: 120 }
        ],
        source: "Foody",
        verifiedVisit: true
      },
      {
        id: "rev-4p-106",
        restaurantId: "pizza-4ps-trang-tien",
        author: "Ngọc Mai Lê",
        rating: 5,
        date: "2026-08-02T18:45:00Z",
        dateDisplay: "02/08/2026",
        text: "Gia đình mình đến ăn sinh nhật. Nhân viên bất ngờ chuẩn bị đĩa tráng miệng cắm nến rất chu đáo. Rất hài lòng về thái độ phục vụ và đồ ăn ngon.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Dịch vụ", sentiment: "positive", phrase: "Nhân viên bất ngờ chuẩn bị đĩa tráng miệng cắm nến rất chu đáo", confidence: 0.96 },
          { aspect: "Món ăn", sentiment: "positive", phrase: "đồ ăn ngon", confidence: 0.93 }
        ],
        highlightSpans: [
          { text: "Nhân viên bất ngờ chuẩn bị đĩa tráng miệng cắm nến rất chu đáo", aspect: "Dịch vụ", sentiment: "positive", startIndex: 32, endIndex: 94 },
          { text: "đồ ăn ngon", aspect: "Món ăn", sentiment: "positive", startIndex: 132, endIndex: 142 }
        ],
        source: "Foody",
        verifiedVisit: true
      }
    ]
  },
  {
    id: 'pho-thin-lo-duc',
    slug: 'pho-thin-lo-duc-hanoi',
    name: "Phở Thìn Lò Đúc",
    brand: "Phở Thìn",
    cuisine: "Việt Nam · Phở truyền thống",
    cuisineCategory: "Việt Nam",
    city: "Hà Nội",
    address: "13 Lò Đúc, Hai Bà Trưng, Hà Nội",
    priceRange: "70.000₫ - 100.000₫",
    priceLevel: "$$",
    rating: 4.2,
    totalReviews: 1840,
    lastAnalyzedDate: "24/08/2026",
    dataSource: "Foody",
    
    sentimentDistribution: {
      positive: 68,
      neutral: 18,
      negative: 14
    },
    sentimentSummarySentence: "Khách hàng đánh giá rất cao hương vị nước dùng đậm đà và thịt bò tái lăn ngập hành lá đặc trưng, dù mức giá tăng và không gian chật chội nhận nhiều ý kiến trái chiều.",
    
    aspects: [
      {
        category: "Món ăn",
        mentionCount: 1690,
        mentionPercentage: 92,
        positivePercentage: 88,
        neutralPercentage: 7,
        negativePercentage: 5,
        sampleKeywords: ["bò tái lăn", "ngập hành hoa", "nước béo đậm đà", "quẩy giòn", "giấm tỏi ớt"]
      },
      {
        category: "Giá cả",
        mentionCount: 1250,
        mentionPercentage: 68,
        positivePercentage: 42,
        neutralPercentage: 20,
        negativePercentage: 38,
        sampleKeywords: ["tăng giá", "90k một bát", "đắt so với phở truyền thống", "giá cho khách du lịch"]
      },
      {
        category: "Dịch vụ",
        mentionCount: 980,
        mentionPercentage: 53,
        positivePercentage: 52,
        neutralPercentage: 24,
        negativePercentage: 24,
        sampleKeywords: ["trả tiền trước", "bưng phở nhanh", "thu ngân lạnh lùng", "tự phục vụ gia vị"]
      },
      {
        category: "Không gian",
        mentionCount: 890,
        mentionPercentage: 48,
        positivePercentage: 45,
        neutralPercentage: 27,
        negativePercentage: 28,
        sampleKeywords: ["chỗ ngồi chật", "sàn trơn mỡ", "phong cách quán bình dân", "bếp khói", "nóng mùa hè"]
      },
      {
        category: "Vị trí",
        mentionCount: 710,
        mentionPercentage: 39,
        positivePercentage: 65,
        neutralPercentage: 22,
        negativePercentage: 13,
        sampleKeywords: ["phố Lò Đúc", "dễ tìm", "đỗ xe máy khó", "quận Hai Bà Trưng"]
      }
    ],

    trendData: {
      '3m': [
        { period: "T6/2026", positive: 67, neutral: 18, negative: 15, totalReviews: 120, averageRating: 4.1 },
        { period: "T7/2026", positive: 69, neutral: 17, negative: 14, totalReviews: 145, averageRating: 4.2 },
        { period: "T8/2026", positive: 68, neutral: 18, negative: 14, totalReviews: 150, averageRating: 4.2 }
      ],
      '6m': [
        { period: "T3/2026", positive: 70, neutral: 17, negative: 13, totalReviews: 110, averageRating: 4.3 },
        { period: "T4/2026", positive: 68, neutral: 18, negative: 14, totalReviews: 130, averageRating: 4.2 },
        { period: "T5/2026", positive: 66, neutral: 19, negative: 15, totalReviews: 140, averageRating: 4.1 },
        { period: "T6/2026", positive: 67, neutral: 18, negative: 15, totalReviews: 120, averageRating: 4.1 },
        { period: "T7/2026", positive: 69, neutral: 17, negative: 14, totalReviews: 145, averageRating: 4.2 },
        { period: "T8/2026", positive: 68, neutral: 18, negative: 14, totalReviews: 150, averageRating: 4.2 }
      ],
      '1y': [
        { period: "T9/2025", positive: 71, neutral: 16, negative: 13, totalReviews: 135, averageRating: 4.3 },
        { period: "T11/2025", positive: 69, neutral: 17, negative: 14, totalReviews: 150, averageRating: 4.2 },
        { period: "T1/2026", positive: 65, neutral: 19, negative: 16, totalReviews: 180, averageRating: 4.0 },
        { period: "T3/2026", positive: 70, neutral: 17, negative: 13, totalReviews: 110, averageRating: 4.3 },
        { period: "T5/2026", positive: 66, neutral: 19, negative: 15, totalReviews: 140, averageRating: 4.1 },
        { period: "T8/2026", positive: 68, neutral: 18, negative: 14, totalReviews: 150, averageRating: 4.2 }
      ],
      'all': [
        { period: "2023", positive: 74, neutral: 16, negative: 10, totalReviews: 480, averageRating: 4.4 },
        { period: "2024", positive: 70, neutral: 17, negative: 13, totalReviews: 540, averageRating: 4.3 },
        { period: "2025", positive: 67, neutral: 18, negative: 15, totalReviews: 490, averageRating: 4.1 },
        { period: "2026 (Nay)", positive: 68, neutral: 18, negative: 14, totalReviews: 330, averageRating: 4.2 }
      ]
    },

    strengths: [
      {
        aspect: "Món ăn",
        positivePercentage: 88,
        mentionCount: 1487,
        title: "Hương vị bò xào lăn & nước dùng độc đáo",
        description: "Thịt bò xào lăn lửa lớn ngập hành hoa tươi cùng nước dùng xương hầm béo ngậy tạo nên nét đặc trưng hiếm có tại Hà Nội.",
        sampleKeywords: ["mùi thơm khói chảo", "bò mềm ngọt", "hành hoa thơm", "nước dùng béo"]
      },
      {
        aspect: "Món ăn",
        positivePercentage: 82,
        mentionCount: 940,
        title: "Thương hiệu phở truyền thống lâu đời",
        description: "Được công nhận là một trong những biểu tượng ẩm thực Hà Nội gắn liền với nhiều thế hệ thực khách.",
        sampleKeywords: ["phở gia truyền", "thương hiệu Hà Nội", "hương vị đặc trưng"]
      }
    ],

    attentionAreas: [
      {
        aspect: "Giá cả",
        negativePercentage: 38,
        complaintCount: 162,
        commonComplaints: [
          "Mức giá 90.000₫/bát bị đánh giá là khá cao so với mặt bằng chung quán phở truyền thống",
          "Không có các lựa chọn size bát nhỏ hơn cho người ăn ít"
        ],
        sampleReviewQuotes: [
          "90.000₫ một bát phở đường phố có phần hơi quá đắt.",
          "Phở ngon nhưng mức giá tăng liên tục khiến nó không còn là bữa sáng bình dân mỗi ngày."
        ],
        recommendedAction: "Giữ vững định lượng thịt bò tiêu chuẩn cho mỗi bát để khách cảm nhận rõ sự tương xứng giá tiền."
      },
      {
        aspect: "Không gian",
        negativePercentage: 28,
        complaintCount: 96,
        commonComplaints: [
          "Sàn nhà trơn trượt vào những ngày mưa ẩm",
          "Bàn ghế san sát, nhiệt độ trong quán khá nóng vào buổi trưa mùa hè"
        ],
        sampleReviewQuotes: [
          "Ngồi ăn mà cùi chỏ chạm sát người phía sau.",
          "Quán vào giờ trưa mùa hè rất oi bức và nhiều khói."
        ],
        recommendedAction: "Tăng cường tần suất lau sàn chống trơn và lắp thêm hệ thống quạt hút khói công suất lớn."
      }
    ],

    keyFindings: [
      {
        id: "kf-pt-1",
        number: "01",
        title: "Hương vị phở giữ vững bản sắc ẩm thực",
        description: "88% đánh giá về món ăn ca ngợi thịt bò xào lăn và nước dùng béo hành hoa là không thể thay thế.",
        aspect: "Món ăn",
        sentimentTrend: "positive"
      },
      {
        id: "kf-pt-2",
        number: "02",
        title: "Độ nhạy cảm về giá là rào cản lớn nhất",
        description: "38% ý kiến về giá là tiêu cực, chiếm tỷ trọng không hài lòng cao nhất trong các khía cạnh.",
        aspect: "Giá cả",
        sentimentTrend: "negative"
      },
      {
        id: "kf-pt-3",
        number: "03",
        title: "Mô hình phục vụ nhanh trả tiền trước",
        description: "Thực khách chấp nhận mô hình trả tiền lấy số để đổi lấy tốc độ ra bát nhanh, dù giao tiếp quầy thu ngân còn lạnh lùng.",
        aspect: "Dịch vụ",
        sentimentTrend: "neutral"
      }
    ],

    operationalChecklist: [
      {
        priority: "Cao",
        area: "Vệ sinh & Cơ sở vật chất",
        issue: "Sàn nhà gần thùng rác giấy ăn trơn trượt giờ cao điểm trưa",
        impact: "Gây ra 52% đánh giá tiêu cực về không gian quán",
        suggestedFix: "Thực hiện quy trình lau sàn khô định kỳ mỗi 45 phút trong khung giờ 11:30 - 13:30."
      },
      {
        priority: "Trung bình",
        area: "Không khí & Nhiệt độ",
        issue: "Nhiệt độ phòng phía trong cao khi nấu liên tục buổi trưa hè",
        impact: "Giảm sự thoải mái của khách ăn tại chỗ",
        suggestedFix: "Lắp thêm 2 quạt hút gió công nghiệp phía sau để hút hơi nóng ra ngoài."
      }
    ],

    reviews: [
      {
        id: "rev-pt-201",
        restaurantId: "pho-thin-lo-duc",
        author: "Bảo Trâm",
        rating: 4,
        date: "2026-08-22T08:30:00Z",
        dateDisplay: "22/08/2026",
        text: "Nước dùng cực kỳ đậm đà và thịt bò tái lăn ngập hành hoa thơm lừng. Tuy nhiên 90k là khá đắt so với phở bình dân và chỗ ngồi rất chật.",
        overallSentiment: "neutral",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Nước dùng cực kỳ đậm đà và thịt bò tái lăn ngập hành hoa thơm lừng", confidence: 0.97 },
          { aspect: "Giá cả", sentiment: "negative", phrase: "90k là khá đắt so với phở bình dân", confidence: 0.91 },
          { aspect: "Không gian", sentiment: "negative", phrase: "chỗ ngồi rất chật", confidence: 0.88 }
        ],
        highlightSpans: [
          { text: "Nước dùng cực kỳ đậm đà và thịt bò tái lăn ngập hành hoa thơm lừng", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 67 },
          { text: "90k là khá đắt so với phở bình dân", aspect: "Giá cả", sentiment: "negative", startIndex: 79, endIndex: 113 },
          { text: "chỗ ngồi rất chật", aspect: "Không gian", sentiment: "negative", startIndex: 117, endIndex: 134 }
        ],
        source: "Foody",
        verifiedVisit: true
      },
      {
        id: "rev-pt-202",
        restaurantId: "pho-thin-lo-duc",
        author: "Kenji Sato",
        rating: 5,
        date: "2026-08-19T10:15:00Z",
        dateDisplay: "19/08/2026",
        text: "Trải nghiệm ăn phở tuyệt vời nhất tại Việt Nam! Hương thơm xào chảo ngập tràn trong thịt bò, phục vụ siêu nhanh ngay sau khi trả tiền ở quầy.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Hương thơm xào chảo ngập tràn trong thịt bò", confidence: 0.95 },
          { aspect: "Dịch vụ", sentiment: "positive", phrase: "phục vụ siêu nhanh ngay sau khi trả tiền ở quầy", confidence: 0.92 }
        ],
        highlightSpans: [
          { text: "Trải nghiệm ăn phở tuyệt vời nhất tại Việt Nam! Hương thơm xào chảo ngập tràn trong thịt bò", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 91 },
          { text: "phục vụ siêu nhanh ngay sau khi trả tiền ở quầy", aspect: "Dịch vụ", sentiment: "positive", startIndex: 93, endIndex: 140 }
        ],
        source: "Foody",
        verifiedVisit: true
      }
    ]
  },
  {
    id: 'the-coffee-house-nguyen-trai',
    slug: 'the-coffee-house-nguyen-trai-hcmc',
    name: "The Coffee House",
    brand: "The Coffee House",
    cuisine: "Cafe · Cà phê đặc sản & Bánh ngọt",
    cuisineCategory: "Cafe",
    city: "TP. Hồ Chí Minh",
    address: "86-88 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh",
    priceRange: "45.000₫ - 85.000₫",
    priceLevel: "$$",
    rating: 4.4,
    totalReviews: 2120,
    lastAnalyzedDate: "24/08/2026",
    dataSource: "Foody",
    
    sentimentDistribution: {
      positive: 79,
      neutral: 14,
      negative: 7
    },
    sentimentSummarySentence: "Được học sinh, sinh viên và người làm việc từ xa yêu thích nhờ wifi ổn định tốc độ cao, bàn ghế làm việc thoải mái và nhân viên pha chế thân thiện.",
    
    aspects: [
      {
        category: "Không gian",
        mentionCount: 1823,
        mentionPercentage: 86,
        positivePercentage: 86,
        neutralPercentage: 9,
        negativePercentage: 5,
        sampleKeywords: ["học bài làm việc", "nhiều ổ cắm", "máy lạnh mát", "bàn làm việc rộng", "ánh sáng tự nhiên"]
      },
      {
        category: "Vị trí",
        mentionCount: 1738,
        mentionPercentage: 82,
        positivePercentage: 82,
        neutralPercentage: 12,
        negativePercentage: 6,
        sampleKeywords: ["trung tâm Quận 1", "phố mua sắm Nguyễn Trãi", "đón xe grab tiện", "giữ xe tầng hầm"]
      },
      {
        category: "Món ăn",
        mentionCount: 1653,
        mentionPercentage: 78,
        positivePercentage: 78,
        neutralPercentage: 15,
        negativePercentage: 7,
        sampleKeywords: ["trà đào cam sả", "bánh mì chà bông trứng muối", "cà phê cold brew", "phin sữa đá"]
      },
      {
        category: "Dịch vụ",
        mentionCount: 1568,
        mentionPercentage: 74,
        positivePercentage: 74,
        neutralPercentage: 18,
        negativePercentage: 8,
        sampleKeywords: ["nhân viên lễ phép", "đặt qua app tiện", "rót nước lọc miễn phí", "chào đón niềm nở"]
      },
      {
        category: "Giá cả",
        mentionCount: 1484,
        mentionPercentage: 70,
        positivePercentage: 70,
        neutralPercentage: 22,
        negativePercentage: 8,
        sampleKeywords: ["hợp lý với không gian ngồi", "tích điểm thành viên tốt", "combo tiết kiệm"]
      }
    ],

    trendData: {
      '3m': [
        { period: "T6/2026", positive: 78, neutral: 15, negative: 7, totalReviews: 180, averageRating: 4.3 },
        { period: "T7/2026", positive: 80, neutral: 13, negative: 7, totalReviews: 210, averageRating: 4.4 },
        { period: "T8/2026", positive: 79, neutral: 14, negative: 7, totalReviews: 195, averageRating: 4.4 }
      ],
      '6m': [
        { period: "T3/2026", positive: 76, neutral: 16, negative: 8, totalReviews: 170, averageRating: 4.3 },
        { period: "T4/2026", positive: 79, neutral: 14, negative: 7, totalReviews: 190, averageRating: 4.4 },
        { period: "T5/2026", positive: 77, neutral: 15, negative: 8, totalReviews: 185, averageRating: 4.3 },
        { period: "T6/2026", positive: 78, neutral: 15, negative: 7, totalReviews: 180, averageRating: 4.3 },
        { period: "T7/2026", positive: 80, neutral: 13, negative: 7, totalReviews: 210, averageRating: 4.4 },
        { period: "T8/2026", positive: 79, neutral: 14, negative: 7, totalReviews: 195, averageRating: 4.4 }
      ],
      '1y': [
        { period: "T9/2025", positive: 81, neutral: 13, negative: 6, totalReviews: 160, averageRating: 4.5 },
        { period: "T11/2025", positive: 79, neutral: 14, negative: 7, totalReviews: 175, averageRating: 4.4 },
        { period: "T1/2026", positive: 75, neutral: 17, negative: 8, totalReviews: 220, averageRating: 4.3 },
        { period: "T3/2026", positive: 76, neutral: 16, negative: 8, totalReviews: 170, averageRating: 4.3 },
        { period: "T5/2026", positive: 77, neutral: 15, negative: 8, totalReviews: 185, averageRating: 4.3 },
        { period: "T8/2026", positive: 79, neutral: 14, negative: 7, totalReviews: 195, averageRating: 4.4 }
      ],
      'all': [
        { period: "2023", positive: 82, neutral: 12, negative: 6, totalReviews: 550, averageRating: 4.5 },
        { period: "2024", positive: 80, neutral: 13, negative: 7, totalReviews: 620, averageRating: 4.4 },
        { period: "2025", positive: 78, neutral: 15, negative: 7, totalReviews: 580, averageRating: 4.4 },
        { period: "2026 (Nay)", positive: 79, neutral: 14, negative: 7, totalReviews: 370, averageRating: 4.4 }
      ]
    },

    strengths: [
      {
        aspect: "Không gian",
        positivePercentage: 86,
        mentionCount: 1567,
        title: "Không gian làm việc & học tập",
        description: "Khách hàng liên tục nhắc đến bàn làm việc rộng, bố trí ổ cắm điện đầy đủ và máy lạnh mát mẻ.",
        sampleKeywords: ["tiện dùng laptop", "ổ cắm điện sẵn", "nhạc nền êm dịu"]
      },
      {
        aspect: "Món ăn",
        positivePercentage: 84,
        mentionCount: 1289,
        title: "Trà đào trứ danh & bánh ngọt",
        description: "Trà Đào Cam Sả và Bánh mì chà bông trứng muối luôn là những món được gọi nhiều nhất và khen ngợi nhất.",
        sampleKeywords: ["miếng đào giòn", "bánh mềm thơm", "vị trà thanh mát"]
      }
    ],

    attentionAreas: [
      {
        aspect: "Không gian",
        negativePercentage: 18,
        complaintCount: 54,
        commonComplaints: [
          "Độ ồn tăng cao vào chiều cuối tuần do nhiều nhóm họp mặt trò chuyện lớn tiếng",
          "Tình trạng giữ bàn bằng đồ đạc trong giờ cao điểm"
        ],
        sampleReviewQuotes: [
          "Khó tìm chỗ ngồi sau 2 giờ chiều Chủ Nhật vì nhiều người để cặp chiếm ghế.",
          "Các nhóm nói chuyện khá ồn ào ở khu vực tầng 1."
        ],
        recommendedAction: "Quy hoạch phân khu yên tĩnh làm việc tại tầng 2 và khu giao lưu trò chuyện tại tầng trệt."
      }
    ],

    keyFindings: [
      {
        id: "kf-tch-1",
        number: "01",
        title: "Điểm đến hàng đầu cho làm việc từ xa",
        description: "86% đánh giá tích cực về không gian khẳng định vị thế quán quen của giới văn phòng và sinh viên.",
        aspect: "Không gian",
        sentimentTrend: "positive"
      },
      {
        id: "kf-tch-2",
        number: "02",
        title: "Chất lượng đồ uống và bánh đồng đều",
        description: "78% mức độ hài lòng ở nhóm món ăn, đồ uống với rất ít khiếu nại về chất lượng pha chế.",
        aspect: "Món ăn",
        sentimentTrend: "positive"
      },
      {
        id: "kf-tch-3",
        number: "03",
        title: "Cần điều tiết công suất chỗ ngồi cuối tuần",
        description: "Tình trạng đông đúc vào các buổi chiều đôi khi gây khó chịu cho khách đến sau.",
        aspect: "Không gian",
        sentimentTrend: "neutral"
      }
    ],

    operationalChecklist: [
      {
        priority: "Trung bình",
        area: "Quản lý chỗ ngồi",
        issue: "Khách bỏ đồ đạc giữ bàn không người ngồi quá 30 phút trong giờ trưa",
        impact: "Khiến khách hàng mới phải quay về vì hết chỗ",
        suggestedFix: "Áp dụng quy định nhắc nhở lịch sự và thu dọn đồ đạc để bàn quá 30 phút không người."
      }
    ],

    reviews: [
      {
        id: "rev-tch-301",
        restaurantId: "the-coffee-house-nguyen-trai",
        author: "Huy Hoàng Đặng",
        rating: 5,
        date: "2026-08-21T14:20:00Z",
        dateDisplay: "21/08/2026",
        text: "Không gian làm việc với laptop cực kỳ lý tưởng! Wifi mạnh, nhiều ổ cắm điện và nhân viên rất lễ phép. Trà đào cam sả lúc nào cũng tươi mát.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Không gian", sentiment: "positive", phrase: "Không gian làm việc với laptop cực kỳ lý tưởng! Wifi mạnh, nhiều ổ cắm điện", confidence: 0.97 },
          { aspect: "Dịch vụ", sentiment: "positive", phrase: "nhân viên rất lễ phép", confidence: 0.94 },
          { aspect: "Món ăn", sentiment: "positive", phrase: "Trà đào cam sả lúc nào cũng tươi mát", confidence: 0.96 }
        ],
        highlightSpans: [
          { text: "Không gian làm việc với laptop cực kỳ lý tưởng! Wifi mạnh, nhiều ổ cắm điện", aspect: "Không gian", sentiment: "positive", startIndex: 0, endIndex: 78 },
          { text: "nhân viên rất lễ phép", aspect: "Dịch vụ", sentiment: "positive", startIndex: 82, endIndex: 103 },
          { text: "Trà đào cam sả lúc nào cũng tươi mát", aspect: "Món ăn", sentiment: "positive", startIndex: 105, endIndex: 141 }
        ],
        source: "Foody",
        verifiedVisit: true
      }
    ]
  },
  {
    id: 'dim-tu-tac-dong-du',
    slug: 'dim-tu-tac-dong-du-hcmc',
    name: "Dim Tu Tac",
    brand: "Dim Tu Tac",
    cuisine: "Quảng Đông · Dim Sum cao cấp",
    cuisineCategory: "Dim Sum",
    city: "TP. Hồ Chí Minh",
    address: "55 Đông Du, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    priceRange: "300.000₫ - 800.000₫",
    priceLevel: "$$$",
    rating: 4.6,
    totalReviews: 2890,
    lastAnalyzedDate: "24/08/2026",
    dataSource: "Foody",
    
    sentimentDistribution: {
      positive: 83,
      neutral: 12,
      negative: 5
    },
    sentimentSummarySentence: "Đạt điểm xuất sắc về kỹ thuật chế biến món ăn và phong cách tiệc Quảng Đông chuẩn mực, là lựa chọn tin cậy cho tiệc gia đình và tiếp khách đối tác.",
    
    aspects: [
      {
        category: "Món ăn",
        mentionCount: 2630,
        mentionPercentage: 91,
        positivePercentage: 91,
        neutralPercentage: 6,
        negativePercentage: 3,
        sampleKeywords: ["há cảo tôm tươi", "vịt quay bắc kinh", "bánh trứng nướng", "tiểu long bao", "bánh cuốn tôm"]
      },
      {
        category: "Không gian",
        mentionCount: 2427,
        mentionPercentage: 84,
        positivePercentage: 84,
        neutralPercentage: 12,
        negativePercentage: 4,
        sampleKeywords: ["sảnh tiệc sang trọng", "phòng VIP riêng tư", "ánh sáng ấm áp", "bàn ăn sạch sẽ"]
      },
      {
        category: "Dịch vụ",
        mentionCount: 2312,
        mentionPercentage: 80,
        positivePercentage: 80,
        neutralPercentage: 14,
        negativePercentage: 6,
        sampleKeywords: ["châm trà chu đáo", "nhân viên am hiểu menu", "thay đĩa nhanh", "chào hỏi lịch sự"]
      },
      {
        category: "Giá cả",
        mentionCount: 1850,
        mentionPercentage: 64,
        positivePercentage: 64,
        neutralPercentage: 24,
        negativePercentage: 12,
        sampleKeywords: ["giá cao cấp", "set menu giá trị", "đã gồm phí dịch vụ"]
      },
      {
        category: "Vị trí",
        mentionCount: 1647,
        mentionPercentage: 57,
        positivePercentage: 88,
        neutralPercentage: 8,
        negativePercentage: 4,
        sampleKeywords: ["phố Đông Du đắc địa", "có nhân viên đỗ xe hộ", "trung tâm Quận 1"]
      }
    ],

    trendData: {
      '3m': [
        { period: "T6/2026", positive: 82, neutral: 13, negative: 5, totalReviews: 240, averageRating: 4.6 },
        { period: "T7/2026", positive: 84, neutral: 11, negative: 5, totalReviews: 260, averageRating: 4.7 },
        { period: "T8/2026", positive: 83, neutral: 12, negative: 5, totalReviews: 255, averageRating: 4.6 }
      ],
      '6m': [
        { period: "T3/2026", positive: 81, neutral: 14, negative: 5, totalReviews: 220, averageRating: 4.5 },
        { period: "T4/2026", positive: 83, neutral: 12, negative: 5, totalReviews: 240, averageRating: 4.6 },
        { period: "T5/2026", positive: 82, neutral: 13, negative: 5, totalReviews: 250, averageRating: 4.6 },
        { period: "T6/2026", positive: 82, neutral: 13, negative: 5, totalReviews: 240, averageRating: 4.6 },
        { period: "T7/2026", positive: 84, neutral: 11, negative: 5, totalReviews: 260, averageRating: 4.7 },
        { period: "T8/2026", positive: 83, neutral: 12, negative: 5, totalReviews: 255, averageRating: 4.6 }
      ],
      '1y': [
        { period: "T9/2025", positive: 85, neutral: 11, negative: 4, totalReviews: 230, averageRating: 4.7 },
        { period: "T11/2025", positive: 83, neutral: 12, negative: 5, totalReviews: 245, averageRating: 4.6 },
        { period: "T1/2026", positive: 80, neutral: 14, negative: 6, totalReviews: 320, averageRating: 4.5 },
        { period: "T3/2026", positive: 81, neutral: 14, negative: 5, totalReviews: 220, averageRating: 4.5 },
        { period: "T5/2026", positive: 82, neutral: 13, negative: 5, totalReviews: 250, averageRating: 4.6 },
        { period: "T8/2026", positive: 83, neutral: 12, negative: 5, totalReviews: 255, averageRating: 4.6 }
      ],
      'all': [
        { period: "2023", positive: 85, neutral: 11, negative: 4, totalReviews: 820, averageRating: 4.7 },
        { period: "2024", positive: 84, neutral: 11, negative: 5, totalReviews: 910, averageRating: 4.6 },
        { period: "2025", positive: 82, neutral: 13, negative: 5, totalReviews: 870, averageRating: 4.6 },
        { period: "2026 (Nay)", positive: 83, neutral: 12, negative: 5, totalReviews: 290, averageRating: 4.6 }
      ]
    },

    strengths: [
      {
        aspect: "Món ăn",
        positivePercentage: 91,
        mentionCount: 2393,
        title: "Đỉnh cao nghệ thuật Dim Sum",
        description: "Vỏ há cảo mỏng trong suốt chuẩn mực, nhân tôm nguyên con giòn ngọt và thịt vịt quay da giòn đậm đà.",
        sampleKeywords: ["da vịt giòn rụm", "vỏ há cảo trong", "hải sản tươi sống"]
      },
      {
        aspect: "Dịch vụ",
        positivePercentage: 80,
        mentionCount: 1850,
        title: "Phục vụ nhà hàng tiệc chuyên nghiệp",
        description: "Đội ngũ phục vụ đào tạo bài bản, châm trà nóng liên tục và điều phối dọn đĩa rất nhịp nhàng.",
        sampleKeywords: ["nhân viên nhã nhặn", "châm trà liên tục", "tốc độ phục vụ chuẩn"]
      }
    ],

    attentionAreas: [
      {
        aspect: "Giá cả",
        negativePercentage: 20,
        complaintCount: 68,
        commonComplaints: [
          "Mức chi tiêu tối thiểu (minimum spend) khi đặt phòng VIP riêng vào cuối tuần khá cao",
          "Giá các món hải sản tươi sống biến động theo thời giá"
        ],
        sampleReviewQuotes: [
          "Món ăn rất ngon nhưng chi tiêu phòng VIP hơi cao cho gia đình ít người."
        ],
        recommendedAction: "Xác nhận rõ ràng đơn giá hải sản theo từng lạng trước khi chế biến cho khách."
      }
    ],

    keyFindings: [
      {
        id: "kf-dtt-1",
        number: "01",
        title: "Dẫn đầu chất lượng ẩm thực Quảng Đông",
        description: "Tỷ lệ 91% hài lòng về món ăn thuộc nhóm cao nhất trong toàn bộ cơ sở dữ liệu phân tích ẩm thực phía Nam.",
        aspect: "Món ăn",
        sentimentTrend: "positive"
      },
      {
        id: "kf-dtt-2",
        number: "02",
        title: "Độ ổn định cao trong mọi khung giờ",
        description: "Rất ít khi ghi nhận sự suy giảm chất lượng dịch vụ ngay cả vào các dịp lễ tết đông đúc.",
        aspect: "Dịch vụ",
        sentimentTrend: "positive"
      }
    ],

    operationalChecklist: [
      {
        priority: "Thấp",
        area: "Dịch vụ đỗ xe",
        issue: "Thời gian chờ nhận xe ô tô tại sảnh lúc 21:00 hơi lâu",
        impact: "Chờ đợi 5-10 phút sau bữa ăn",
        suggestedFix: "Báo trước cho nhân viên lấy xe qua hệ thống in hóa đơn POS."
      }
    ],

    reviews: [
      {
        id: "rev-dtt-401",
        restaurantId: "dim-tu-tac-dong-du",
        author: "Victoria Tran",
        rating: 5,
        date: "2026-08-23T12:45:00Z",
        dateDisplay: "23/08/2026",
        text: "Vịt quay Bắc Kinh làm 2 món xuất sắc với da giòn tan và bánh tráng thơm. Há cảo tôm nhân đầy ắp giòn sần sật. Dịch vụ chuyên nghiệp suốt bữa ăn.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Vịt quay Bắc Kinh làm 2 món xuất sắc với da giòn tan", confidence: 0.98 },
          { aspect: "Món ăn", sentiment: "positive", phrase: "Há cảo tôm nhân đầy ắp giòn sần sật", confidence: 0.96 },
          { aspect: "Dịch vụ", sentiment: "positive", phrase: "Dịch vụ chuyên nghiệp suốt bữa ăn", confidence: 0.95 }
        ],
        highlightSpans: [
          { text: "Vịt quay Bắc Kinh làm 2 món xuất sắc với da giòn tan", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 52 },
          { text: "Há cảo tôm nhân đầy ắp giòn sần sật", aspect: "Món ăn", sentiment: "positive", startIndex: 72, endIndex: 107 },
          { text: "Dịch vụ chuyên nghiệp suốt bữa ăn", aspect: "Dịch vụ", sentiment: "positive", startIndex: 109, endIndex: 142 }
        ],
        source: "Foody",
        verifiedVisit: true
      }
    ]
  },
  {
    id: 'gogi-house-vincom',
    slug: 'gogi-house-vincom-hanoi',
    name: "Gogi House",
    brand: "Golden Gate Group",
    cuisine: "Nướng BBQ · Nướng Hàn Quốc",
    cuisineCategory: "Nướng BBQ",
    city: "Hà Nội",
    address: "Tầng 5, Vincom Center Bà Triệu, Hai Bà Trưng, Hà Nội",
    priceRange: "350.000₫ - 550.000₫",
    priceLevel: "$$$",
    rating: 4.1,
    totalReviews: 1450,
    lastAnalyzedDate: "24/08/2026",
    dataSource: "Foody",
    
    sentimentDistribution: {
      positive: 64,
      neutral: 18,
      negative: 18
    },
    sentimentSummarySentence: "Được ưa chuộng nhờ thịt sườn bò ướp sốt đậm đà và panchan phong phú, tuy nhiên khói nướng ám mùi và tốc độ tiếp đồ ăn kèm chậm làm giảm điểm đánh giá chung.",
    
    aspects: [
      {
        category: "Món ăn",
        mentionCount: 1145,
        mentionPercentage: 79,
        positivePercentage: 79,
        neutralPercentage: 13,
        negativePercentage: 8,
        sampleKeywords: ["dẻ sườn bò ướp", "canh kim chi", "panchan chuẩn vị", "tokbokki phô mai", "rau xà lách tươi"]
      },
      {
        category: "Không gian",
        mentionCount: 1044,
        mentionPercentage: 72,
        positivePercentage: 72,
        neutralPercentage: 14,
        negativePercentage: 14,
        sampleKeywords: ["mùi khói thịt nướng", "phong cách gạch mộc Hàn", "nhạc kpop hơi to", "tiện ích trung tâm thương mại"]
      },
      {
        category: "Dịch vụ",
        mentionCount: 841,
        mentionPercentage: 58,
        positivePercentage: 58,
        neutralPercentage: 20,
        negativePercentage: 22,
        sampleKeywords: ["thay vỉ nướng chậm", "châm panchan lâu", "nhân viên hỗ trợ nướng", "quá tải giờ ăn"]
      },
      {
        category: "Giá cả",
        mentionCount: 783,
        mentionPercentage: 54,
        positivePercentage: 54,
        neutralPercentage: 28,
        negativePercentage: 18,
        sampleKeywords: ["giá buffet", "tiền nước tính riêng", "thuế VAT"]
      },
      {
        category: "Vị trí",
        mentionCount: 652,
        mentionPercentage: 45,
        positivePercentage: 76,
        neutralPercentage: 16,
        negativePercentage: 8,
        sampleKeywords: ["Vincom Bà Triệu", "tầng rạp chiếu phim", "hầm gửi xe rộng"]
      }
    ],

    trendData: {
      '3m': [
        { period: "T6/2026", positive: 63, neutral: 19, negative: 18, totalReviews: 95, averageRating: 4.0 },
        { period: "T7/2026", positive: 65, neutral: 18, negative: 17, totalReviews: 115, averageRating: 4.1 },
        { period: "T8/2026", positive: 64, neutral: 18, negative: 18, totalReviews: 110, averageRating: 4.1 }
      ],
      '6m': [
        { period: "T3/2026", positive: 65, neutral: 18, negative: 17, totalReviews: 88, averageRating: 4.1 },
        { period: "T4/2026", positive: 63, neutral: 19, negative: 18, totalReviews: 102, averageRating: 4.0 },
        { period: "T5/2026", positive: 62, neutral: 20, negative: 18, totalReviews: 105, averageRating: 4.0 },
        { period: "T6/2026", positive: 63, neutral: 19, negative: 18, totalReviews: 95, averageRating: 4.0 },
        { period: "T7/2026", positive: 65, neutral: 18, negative: 17, totalReviews: 115, averageRating: 4.1 },
        { period: "T8/2026", positive: 64, neutral: 18, negative: 18, totalReviews: 110, averageRating: 4.1 }
      ],
      '1y': [
        { period: "T9/2025", positive: 66, neutral: 18, negative: 16, totalReviews: 98, averageRating: 4.2 },
        { period: "T11/2025", positive: 64, neutral: 19, negative: 17, totalReviews: 110, averageRating: 4.1 },
        { period: "T1/2026", positive: 61, neutral: 20, negative: 19, totalReviews: 140, averageRating: 3.9 },
        { period: "T3/2026", positive: 65, neutral: 18, negative: 17, totalReviews: 88, averageRating: 4.1 },
        { period: "T5/2026", positive: 62, neutral: 20, negative: 18, totalReviews: 105, averageRating: 4.0 },
        { period: "T8/2026", positive: 64, neutral: 18, negative: 18, totalReviews: 110, averageRating: 4.1 }
      ],
      'all': [
        { period: "2023", positive: 68, neutral: 17, negative: 15, totalReviews: 380, averageRating: 4.3 },
        { period: "2024", positive: 65, neutral: 18, negative: 17, totalReviews: 420, averageRating: 4.1 },
        { period: "2025", positive: 63, neutral: 19, negative: 18, totalReviews: 390, averageRating: 4.0 },
        { period: "2026 (Nay)", positive: 64, neutral: 18, negative: 18, totalReviews: 260, averageRating: 4.1 }
      ]
    },

    strengths: [
      {
        aspect: "Món ăn",
        positivePercentage: 79,
        mentionCount: 904,
        title: "Dẻ sườn bò sốt Galbi & nước chấm",
        description: "Khách hàng rất thích hương vị ướp mặn ngọt đậm đà của sườn bò và các món panchan kim chi ăn kèm.",
        sampleKeywords: ["sườn bò mọng nước", "sốt chấm thơm", "kim chi giòn cay"]
      }
    ],

    attentionAreas: [
      {
        aspect: "Dịch vụ",
        negativePercentage: 22,
        complaintCount: 78,
        commonComplaints: [
          "Thay vỉ nướng cháy bị chậm khi quán đông khách",
          "Phải nhắc nhiều lần khi gọi thêm rau xà lách và panchan"
        ],
        sampleReviewQuotes: [
          "Gọi thêm xà lách 3 lần mới mang ra.",
          "Vỉ bị cháy đen và khói nhiều nhưng nhân viên không chủ động thay."
        ],
        recommendedAction: "Thiết lập chu kỳ kiểm tra và thay vỉ nướng chủ động mỗi 15 phút cho từng khu vực bàn."
      },
      {
        aspect: "Không gian",
        negativePercentage: 14,
        complaintCount: 52,
        commonComplaints: [
          "Hệ thống hút khói bị quá tải khi quán kín bàn dẫn đến ám mùi quần áo"
        ],
        sampleReviewQuotes: [
          "Ăn xong bước ra ngoài quần áo tóc tai ám mùi khói nướng rất nồng."
        ],
        recommendedAction: "Bảo dưỡng và vệ sinh lưới lọc hút mùi định kỳ 2 tuần một lần."
      }
    ],

    keyFindings: [
      {
        id: "kf-gg-1",
        number: "01",
        title: "Chất lượng thịt và nước ướp ổn định",
        description: "79% phản hồi tích cực về thịt bò ướp sốt giúp nhà hàng giữ chân lượng lớn khách hàng quen.",
        aspect: "Món ăn",
        sentimentTrend: "positive"
      },
      {
        id: "kf-gg-2",
        number: "02",
        title: "Cần cải thiện tốc độ thay vỉ và tiếp đồ ăn kèm",
        description: "Khiếu nại về dịch vụ chủ yếu phát sinh từ độ trễ khi khách yêu cầu thay vỉ nướng và châm rau.",
        aspect: "Dịch vụ",
        sentimentTrend: "negative"
      }
    ],

    operationalChecklist: [
      {
        priority: "Cao",
        area: "Phục vụ tại bàn",
        issue: "Vỉ nướng bị đen cháy không được thay kịp thời làm thịt bị đắng và bốc khói",
        impact: "Trực tiếp dẫn đến các đánh giá 1 sao về dịch vụ",
        suggestedFix: "Gắn kẹp màu đánh dấu thời gian lên cột hút khói để nhân viên chạy bàn chủ động thay vỉ."
      }
    ],

    reviews: [
      {
        id: "rev-gg-501",
        restaurantId: "gogi-house-vincom",
        author: "Tuấn Anh",
        rating: 3,
        date: "2026-08-16T19:30:00Z",
        dateDisplay: "16/08/2026",
        text: "Dẻ sườn bò ướp rất mềm và ngon miệng, nhưng gọi thêm rau xà lách 3 lần mới mang ra và thay vỉ nướng cháy rất lâu. Trong quán khá nhiều khói.",
        overallSentiment: "neutral",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Dẻ sườn bò ướp rất mềm và ngon miệng", confidence: 0.95 },
          { aspect: "Dịch vụ", sentiment: "negative", phrase: "gọi thêm rau xà lách 3 lần mới mang ra và thay vỉ nướng cháy rất lâu", confidence: 0.93 },
          { aspect: "Không gian", sentiment: "negative", phrase: "Trong quán khá nhiều khói", confidence: 0.89 }
        ],
        highlightSpans: [
          { text: "Dẻ sườn bò ướp rất mềm và ngon miệng", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 37 },
          { text: "gọi thêm rau xà lách 3 lần mới mang ra và thay vỉ nướng cháy rất lâu", aspect: "Dịch vụ", sentiment: "negative", startIndex: 44, endIndex: 111 },
          { text: "Trong quán khá nhiều khói", aspect: "Không gian", sentiment: "negative", startIndex: 113, endIndex: 138 }
        ],
        source: "Foody",
        verifiedVisit: true
      }
    ]
  },
  {
    id: 'banh-mi-huynh-hoa',
    slug: 'banh-mi-huynh-hoa-hcmc',
    name: "Bánh Mì Huỳnh Hoa",
    brand: "Huỳnh Hoa",
    cuisine: "Đường phố · Bánh mì Sài Gòn",
    cuisineCategory: "Đường phố",
    city: "TP. Hồ Chí Minh",
    address: "26 Lê Thị Riêng, Bến Thành, Quận 1, TP. Hồ Chí Minh",
    priceRange: "65.000₫ - 80.000₫",
    priceLevel: "$$",
    rating: 4.3,
    totalReviews: 3650,
    lastAnalyzedDate: "24/08/2026",
    dataSource: "Foody",
    
    sentimentDistribution: {
      positive: 71,
      neutral: 14,
      negative: 15
    },
    sentimentSummarySentence: "Nổi tiếng với nhân thịt chả ngập tràn và lớp pate béo ngậy đặc trưng, tuy nhiên cảnh xếp hàng dài chen chúc và giá thành cao so với bánh mì vỉa hè tạo nên hai luồng ý kiến rõ rệt.",
    
    aspects: [
      {
        category: "Món ăn",
        mentionCount: 3358,
        mentionPercentage: 92,
        positivePercentage: 92,
        neutralPercentage: 5,
        negativePercentage: 3,
        sampleKeywords: ["lớp pate dày béo", "chả lụa thịt nguội ngập", "bánh mì giòn rụm", "bơ nhà làm", "đồ chua chống ngấy"]
      },
      {
        category: "Giá cả",
        mentionCount: 2263,
        mentionPercentage: 62,
        positivePercentage: 48,
        neutralPercentage: 22,
        negativePercentage: 30,
        sampleKeywords: ["đắt so với bánh mì", "68k một ổ", "ổ bánh nặng 2 người ăn", "đáng thử một lần"]
      },
      {
        category: "Dịch vụ",
        mentionCount: 1825,
        mentionPercentage: 50,
        positivePercentage: 50,
        neutralPercentage: 20,
        negativePercentage: 30,
        sampleKeywords: ["xếp hàng dài", "đóng gói nhanh", "thu ngân gắt gỏng", "tài xế app chen chúc"]
      },
      {
        category: "Vị trí",
        mentionCount: 1387,
        mentionPercentage: 38,
        positivePercentage: 62,
        neutralPercentage: 20,
        negativePercentage: 18,
        sampleKeywords: ["đường Lê Thị Riêng", "vỉa hè đông đúc", "khó tấp xe máy"]
      },
      {
        category: "Không gian",
        mentionCount: 1095,
        mentionPercentage: 30,
        positivePercentage: 48,
        neutralPercentage: 30,
        negativePercentage: 22,
        sampleKeywords: ["quán mua mang về", "không khí nhộn nhịp phố phường"]
      }
    ],

    trendData: {
      '3m': [
        { period: "T6/2026", positive: 70, neutral: 15, negative: 15, totalReviews: 280, averageRating: 4.2 },
        { period: "T7/2026", positive: 72, neutral: 14, negative: 14, totalReviews: 310, averageRating: 4.3 },
        { period: "T8/2026", positive: 71, neutral: 14, negative: 15, totalReviews: 295, averageRating: 4.3 }
      ],
      '6m': [
        { period: "T3/2026", positive: 73, neutral: 14, negative: 13, totalReviews: 260, averageRating: 4.4 },
        { period: "T4/2026", positive: 70, neutral: 15, negative: 15, totalReviews: 290, averageRating: 4.2 },
        { period: "T5/2026", positive: 69, neutral: 16, negative: 15, totalReviews: 300, averageRating: 4.2 },
        { period: "T6/2026", positive: 70, neutral: 15, negative: 15, totalReviews: 280, averageRating: 4.2 },
        { period: "T7/2026", positive: 72, neutral: 14, negative: 14, totalReviews: 310, averageRating: 4.3 },
        { period: "T8/2026", positive: 71, neutral: 14, negative: 15, totalReviews: 295, averageRating: 4.3 }
      ],
      '1y': [
        { period: "T9/2025", positive: 74, neutral: 13, negative: 13, totalReviews: 270, averageRating: 4.4 },
        { period: "T11/2025", positive: 72, neutral: 14, negative: 14, totalReviews: 310, averageRating: 4.3 },
        { period: "T1/2026", positive: 68, neutral: 16, negative: 16, totalReviews: 380, averageRating: 4.1 },
        { period: "T3/2026", positive: 73, neutral: 14, negative: 13, totalReviews: 260, averageRating: 4.4 },
        { period: "T5/2026", positive: 69, neutral: 16, negative: 15, totalReviews: 300, averageRating: 4.2 },
        { period: "T8/2026", positive: 71, neutral: 14, negative: 15, totalReviews: 295, averageRating: 4.3 }
      ],
      'all': [
        { period: "2023", positive: 75, neutral: 13, negative: 12, totalReviews: 980, averageRating: 4.5 },
        { period: "2024", positive: 72, neutral: 14, negative: 14, totalReviews: 1150, averageRating: 4.3 },
        { period: "2025", positive: 70, neutral: 15, negative: 15, totalReviews: 1040, averageRating: 4.2 },
        { period: "2026 (Nay)", positive: 71, neutral: 14, negative: 15, totalReviews: 480, averageRating: 4.3 }
      ]
    },

    strengths: [
      {
        aspect: "Món ăn",
        positivePercentage: 92,
        mentionCount: 3089,
        title: "Độ đầy đặn của nhân thịt & pate",
        description: "Khắp nơi đều biết đến ổ bánh mì 'nửa ký' ngập tràn chả lụa, thịt nguội thượng hạng và lớp pate gan béo bùi đậm đà.",
        sampleKeywords: ["bánh mì nửa ký", "pate béo ngậy", "bánh nóng giòn"]
      }
    ],

    attentionAreas: [
      {
        aspect: "Dịch vụ",
        negativePercentage: 30,
        complaintCount: 195,
        commonComplaints: [
          "Điều phối xếp hàng chưa tốt giữa khách mua lẻ trực tiếp và tài xế giao hàng công nghệ",
          "Nhân viên bán hàng đôi lúc thiếu kiên nhẫn vào giờ đông khách"
        ],
        sampleReviewQuotes: [
          "Đứng đợi 25 phút dưới nắng bên cạnh hàng chục tài xế giao hàng.",
          "Thu ngân khá vội vàng và gắt gỏng khi khách xin thêm túi nilon riêng."
        ],
        recommendedAction: "Phân luồng riêng giữa quầy nhận đơn khách mua mang đi và cửa sổ nhận hàng của tài xế app."
      },
      {
        aspect: "Giá cả",
        negativePercentage: 30,
        complaintCount: 142,
        commonComplaints: [
          "Mức giá (68.000₫ - 80.000₫) bị coi là khá cao so với một món ăn sáng đường phố thông thường"
        ],
        sampleReviewQuotes: [
          "Một ổ đủ cho 2 người ăn, nhưng với bánh mì vỉa hè thì giá này không hề rẻ."
        ],
        recommendedAction: "Ghi rõ trọng lượng thực của nhân thịt (350g+) trên bảng giá để giải thích giá trị."
      }
    ],

    keyFindings: [
      {
        id: "kf-hh-1",
        number: "01",
        title: "Vị thế hương vị bánh mì không đối thủ",
        description: "92% sự hài lòng về hương vị và độ hào phóng của nhân giữ cho quán luôn tấp nập người mua mỗi ngày.",
        aspect: "Món ăn",
        sentimentTrend: "positive"
      },
      {
        id: "kf-hh-2",
        number: "02",
        title: "Áp lực xếp hàng và cạnh tranh không gian vỉa hè",
        description: "Việc chen chúc giữa khách du lịch và tài xế giao hàng công nghệ là nguyên nhân chính gây ra 30% đánh giá tiêu cực về dịch vụ.",
        aspect: "Dịch vụ",
        sentimentTrend: "negative"
      }
    ],

    operationalChecklist: [
      {
        priority: "Cao",
        area: "Hạ tầng xếp hàng",
        issue: "Khách bộ hành bị che chắn bởi hàng dài xe máy của tài xế giao hàng",
        impact: "Gây khó chịu lớn trong đánh giá về dịch vụ và vị trí",
        suggestedFix: "Bố trí khu vực nhận hàng riêng cho tài xế giao hàng cách cửa hàng chính 10 mét."
      }
    ],

    reviews: [
      {
        id: "rev-hh-601",
        restaurantId: "banh-mi-huynh-hoa",
        author: "Thanh Tùng",
        rating: 4,
        date: "2026-08-17T17:10:00Z",
        dateDisplay: "17/08/2026",
        text: "Pate ở đây béo bùi đậm đà không đâu có và ổ bánh kẹp ngập tràn thịt chả. Nhưng cảnh xếp hàng khá lộn xộn và giá 68k là khá đắt.",
        overallSentiment: "positive",
        aspects: [
          { aspect: "Món ăn", sentiment: "positive", phrase: "Pate ở đây béo bùi đậm đà không đâu có và ổ bánh kẹp ngập tràn thịt chả", confidence: 0.98 },
          { aspect: "Dịch vụ", sentiment: "negative", phrase: "cảnh xếp hàng khá lộn xộn", confidence: 0.90 },
          { aspect: "Giá cả", sentiment: "negative", phrase: "giá 68k là khá đắt", confidence: 0.88 }
        ],
        highlightSpans: [
          { text: "Pate ở đây béo bùi đậm đà không đâu có và ổ bánh kẹp ngập tràn thịt chả", aspect: "Món ăn", sentiment: "positive", startIndex: 0, endIndex: 72 },
          { text: "cảnh xếp hàng khá lộn xộn", aspect: "Dịch vụ", sentiment: "negative", startIndex: 83, endIndex: 108 },
          { text: "giá 68k là khá đắt", aspect: "Giá cả", sentiment: "negative", startIndex: 112, endIndex: 130 }
        ],
        source: "Foody",
        verifiedVisit: true
      }
    ]
  }
];
