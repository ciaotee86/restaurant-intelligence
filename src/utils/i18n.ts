export type Language = 'vi' | 'en';

export const STORAGE_KEY = 'app_language';

export const translations: Record<Language, Record<string, string>> = {
  vi: {
    // Navbar
    'nav.tagline': 'Bản đồ đọc vị ẩm thực đa chiều',
    'nav.explore': 'Khám phá quán',
    'nav.methodology': 'Quy trình & Phương pháp',
    'nav.badge': 'Đánh giá thực tế & Khách quan',
    'nav.searchPlaceholder': 'Tìm quán ăn...',
    'nav.addRestaurant': '+ Khảo sát quán mới',
    'nav.addRestaurantShort': '+ Thêm quán',
    'nav.home': 'Trang chủ',
    'nav.exploreShort': 'Khám phá',
    'nav.methodologyShort': 'Quy trình',
    'nav.switchToEn': 'Switch to English (Chuyển sang Tiếng Anh)',
    'nav.switchToVi': 'Chuyển sang Tiếng Việt',
    'nav.language': 'Ngôn ngữ',

    // Footer
    'footer.description': 'Nền tảng đọc vị đánh giá ẩm thực từ thực khách thực tế. Giúp người đi ăn chọn đúng quán ngon và giúp chủ quán nắm bắt phản hồi chân thực để nâng cao chất lượng phục vụ.',
    'footer.dinerSurvey': 'Khảo sát ý kiến thực khách công khai',
    'footer.filterSpam': 'Loại bỏ nhận xét giả & quảng cáo rác',
    'footer.platform': 'Nền tảng',
    'footer.home': 'Trang chủ',
    'footer.explore': 'Khám phá nhà hàng',
    'footer.methodology': 'Quy trình & Phương pháp phân tích',
    'footer.featuredReports': 'Báo cáo tiêu biểu',
    'footer.copyright': '© 2026 Restaurant Intelligence. Phục vụ nghiên cứu và phân tích dữ liệu vận hành ẩm thực.',
    'footer.pipeline': 'Thu thập ý kiến thực khách → Sàng lọc bình luận ảo → Đánh giá theo 5 tiêu chí → Báo cáo trực quan',

    // Common & Metrics & Aspects
    'common.food': 'Món ăn & Hương vị',
    'common.price': 'Giá cả & Độ hợp lý',
    'common.service': 'Phục vụ & Thái độ',
    'common.ambience': 'Không gian & Vị trí',
    'common.hygiene': 'Vệ sinh & An toàn',
    'common.location': 'Vị trí & Địa điểm',
    'common.positive': 'Tích cực',
    'common.negative': 'Tiêu cực',
    'common.neutral': 'Trung lập',
    'common.credibility': 'Độ tin cậy',
    'common.reviews': 'đánh giá',
    'common.all': 'Tất cả',
    'common.close': 'Đóng',
    'common.cancel': 'Hủy',
    'common.cuisineFallback': 'Ẩm thực',
    'common.addressFallback': 'Đang cập nhật địa chỉ',
    'common.priceCasual': 'Bình dân',
    'common.priceMid': 'Trung bình',
    'common.priceFine': 'Cao cấp',
    'common.loading': 'Đang tải...',
    'common.back': 'Quay lại',
    'common.vs': 'VS',
    'common.requiredField': 'Trường bắt buộc',

    // Aspect names (short)
    'aspect.food': 'Món ăn',
    'aspect.service': 'Dịch vụ',
    'aspect.price': 'Giá cả',
    'aspect.ambience': 'Không gian',
    'aspect.location': 'Vị trí',
    'aspect.hygiene': 'Vệ sinh',

    // Sentiments
    'sentiment.positive': 'Tích cực',
    'sentiment.negative': 'Tiêu cực',
    'sentiment.neutral': 'Trung lập',

    // FilterBar
    'filter.title': 'Bộ lọc & Tinh chỉnh',
    'filter.reset': 'Đặt lại bộ lọc',
    'filter.location': 'Địa điểm',
    'filter.allLocations': 'Tất cả địa điểm',
    'filter.prominentDestinations': '🌟 Đô thị ẩm thực & du lịch trọng điểm',
    'filter.allProvinces': '🏛️ Tất cả 63 Tỉnh / Thành phố Việt Nam',
    'filter.cuisineType': 'Loại hình ẩm thực',
    'filter.allCuisines': 'Tất cả ẩm thực',
    'filter.minRating': 'Điểm đánh giá tối thiểu',
    'filter.allRatings': 'Tất cả điểm số',
    'filter.starsOrHigher': '★ trở lên',
    'filter.satisfaction': 'Mức độ hài lòng',
    'filter.allLevels': 'Tất cả mức độ',
    'filter.highPositive': 'Được khen nhiều (>75% hài lòng)',
    'filter.balanced': 'Bình thường',
    'filter.needsAttention': 'Nhiều phàn nàn (>12% chê)',
    'filter.sortBy': 'Sắp xếp theo:',
    'filter.sortReviews': 'Nhiều đánh giá nhất',
    'filter.sortRating': 'Điểm sao cao nhất',
    'filter.sortPositive': 'Được lòng khách nhất',
    'filter.sortName': 'Tên A - Z',

    // Cuisines
    'cuisine.all': 'Tất cả ẩm thực',
    'cuisine.italian': 'Ý',
    'cuisine.vietnamese': 'Việt Nam',
    'cuisine.dimsum': 'Dim Sum',
    'cuisine.bbq': 'Nướng BBQ',
    'cuisine.cafe': 'Cafe',
    'cuisine.streetfood': 'Đường phố',

    // Home Page
    'home.heroBadge': 'Bản đồ đọc vị ẩm thực từ thực khách thực tế',
    'home.heroTitleLine1': 'Đọc vị mọi bàn ăn.',
    'home.heroTitleLine2': 'Thấy rõ điều thực khách thực sự nghĩ.',
    'home.heroSubtitle': 'Thay vì mất 30 phút đọc hàng trăm bình luận lẫn lộn — xem ngay bức tranh toàn cảnh về Món ăn, Giá cả, Thái độ phục vụ và Không gian được bóc tách khoa học.',
    'home.searchPlaceholder': 'Tìm món ngon hoặc quán ăn (vd: Pizza 4P\'s, Phở Thìn, Cơm Gà 9 Ly)...',
    'home.diningOccasion': 'Dịp ăn uống:',
    'home.tagFamily': '👨‍👩‍👧 Bữa cơm gia đình',
    'home.tagDating': '🍷 Tiếp khách & Hẹn hò',
    'home.tagFast': '⚡ Phục vụ nhanh',
    'home.tagBudget': '💰 Ngon bình dân',
    'home.tagSpecialty': '🍜 Đặc sản vùng miền',
    'home.trustNoLogin': 'Không cần đăng nhập tài khoản',
    'home.trustFilterSpam': 'Loại bỏ nhận xét giả & đánh giá ảo',
    'home.trustFiveAspects': 'Đánh giá theo 5 tiêu chí cốt lõi',
    'home.spotlightSubtitle': 'Bóc tách trực tiếp',
    'home.spotlightTitle': 'Spotlight: Hồ sơ đọc vị tiêu biểu',
    'home.spotlightDesc': 'Xem cách hệ thống tự động bóc tách đánh giá thực khách từ dữ liệu lớn thành chỉ số trực quan.',
    'home.changeSample': 'Đổi quán mẫu:',
    'home.realReviews': '{count} đánh giá thực',
    'home.addressLabel': 'Địa chỉ: {address}',
    'home.addressUpdating': 'Đang cập nhật',
    'home.satisfactionRate': 'Hài lòng',
    'home.coreCriteriaScore': 'Thước đo 5 tiêu chí cốt lõi:',
    'home.praiseRate': 'Tỷ lệ khen ngợi',
    'home.viewFullProfile': 'Xem toàn bộ hồ sơ phân tích {name}',
    'home.preparingData': 'Đang chuẩn bị dữ liệu quán ăn...',
    'home.spamFilterTitle': 'Tách lọc nhận xét ảo',
    'home.spamFilterDesc': 'Hệ thống tự động loại trừ các bình luận quảng cáo, tài khoản mới tạo đánh giá ảo, chỉ giữ lại nhận xét từ người dùng có trải nghiệm thực tế.',
    'home.spamRemovedLabel': 'Tỷ lệ loại bỏ nhận xét ảo:',
    'home.spamRemovedValue': '~18.5% đã loại bỏ',
    'home.credibilityLabel': 'Độ tin cậy dữ liệu:',
    'home.credibilityValue': '98.2% Chuẩn xác',
    'home.continuousUpdate': 'Cập nhật liên tục',
    'home.objectiveGuaranteed': 'Khách quan 100%',
    'home.signatureAndNotes': 'Món Nên Thử & Lưu Ý',
    'home.topPraiseDish': 'Món Signature được khen nhất:',
    'home.preparationNote': 'Điểm cần chuẩn bị trước:',
    'home.peakHourNoteDefault': 'Giờ cao điểm cần đặt bàn trước',
    'home.signatureSubtitle': '* Trích xuất tự động từ lời khen và phàn nàn lặp lại nhiều nhất.',
    'home.comparisonBadge': 'Công cụ đối chiếu trực quan',
    'home.comparisonTitle': 'So sánh đối đầu: Chọn quán nào?',
    'home.comparisonDesc': 'Đặt 2 quán ăn cạnh nhau trên cùng một trục 5 tiêu chí để tìm ra lựa chọn tối ưu cho bạn.',
    'home.restaurantA': 'Quán A:',
    'home.restaurantB': 'Quán B:',
    'home.fiveCriteria': '5 Tiêu chí',
    'home.satisfiedPercent': '{percent}% hài lòng',
    'home.viewProfileArrow': 'Xem hồ sơ {name} →',
    'home.dualPerspectiveBadge': 'Ứng dụng đa chiều',
    'home.dualPerspectiveTitle': 'Được kiến tạo cho cả 2 góc nhìn',
    'home.dualPerspectiveDesc': 'Dù bạn là người đi tìm quán ăn hay người trực tiếp vận hành nhà hàng, dữ liệu đều được tinh lọc đúng mục tiêu của bạn.',
    'home.tabDiner': 'Dành cho Thực khách',
    'home.tabOwner': 'Dành cho Chủ quán & Quản lý',
    'home.dinerCard1Title': 'Biết trước món ngon signature & món nên tránh',
    'home.dinerCard1Desc': 'Xem ngay đĩa đồ ăn nào là linh hồn của quán được 90% thực khách khen nức nở, và món nào thường xuyên bị phàn nàn mặn, nguội hoặc khẩu phần ít so với giá tiền để không bị thất vọng.',
    'home.dinerCard1Benefit': 'Tránh rủi ro gọi nhầm món khi đi ăn tiệc',
    'home.dinerCard2Title': 'Nhìn thấu điểm trừ vận hành thực tế',
    'home.dinerCard2Desc': 'Biết trước quán có chỗ đỗ ô tô hay không, giờ cao điểm phải đợi bàn bao lâu và thái độ phục vụ ra sao trước khi bạn bước chân đến quán.',
    'home.dinerCard3Title': 'Mức giá & khẩu phần thực tế',
    'home.dinerCard3Desc': 'Đánh giá xem hóa đơn thanh toán có xứng đáng với chất lượng mang lại hay không dựa trên ý kiến khách quan từ hàng trăm người đã trải nghiệm.',
    'home.ownerCard1Title': 'Bắt đúng bệnh vận hành nhà hàng',
    'home.ownerCard1Desc': 'Hệ thống tự động gom các sự cố lặp lại thành cụm vấn đề (bàn dơ, thiếu điều hòa, tốc độ ra món chậm, tính tiền nhầm) để bạn điều chỉnh đúng điểm nghẽn mà không cần phỏng đoán.',
    'home.ownerCard1Benefit': 'Tiết kiệm hàng chục giờ kiểm tra camera & sổ sách',
    'home.ownerCard2Title': 'Đo lường thái độ nhân viên & dịch vụ',
    'home.ownerCard2Desc': 'Nắm bắt ngay tỷ lệ khiếu nại về thái độ nhân viên order, phục vụ hay bảo vệ dắt xe theo từng mốc thời gian cụ thể.',
    'home.ownerCard3Title': 'Theo dõi cải thiện qua từng tháng',
    'home.ownerCard3Desc': 'Sau khi đào tạo nhân viên hoặc đổi nhà cung cấp nguyên liệu, theo dõi trực tiếp xem tỷ lệ khen ngợi trên biểu đồ xu hướng có tăng trưởng hay không.',
    'home.curatedBadge': 'Tuyển tập tiêu biểu',
    'home.curatedTitle': 'Quán ăn nổi bật đã được đánh giá',
    'home.curatedDesc': 'Khám phá hồ sơ bóc tách chi tiết của các quán ăn được quan tâm nhiều nhất',
    'home.viewAllRestaurants': 'Xem toàn bộ quán ăn ({count})',
    'home.manifestoBadge': 'Minh bạch & Độc lập',
    'home.manifestoTitle': 'Restaurant Intelligence đọc vị đánh giá như thế nào?',
    'home.manifestoDesc': 'Từ hàng ngàn bài nhận xét của thực khách, hệ thống tự động loại bỏ bình luận rác và tài khoản ảo, phân loại tỷ lệ khen - chê theo 5 tiêu chí chất lượng và đưa ra bản tóm tắt trung thực chỉ trong vài giây.',
    'home.viewMethodologyCta': 'Xem cách thức hoạt động →',
    'home.defaultDinerQuote': 'Nhận xét chân thực từ thực khách thực tế.',
    'home.exploreAll': 'Khám phá tất cả nhà hàng',
    'home.howItWorks': 'Tìm hiểu phương pháp',

    // SearchBar
    'search.placeholder': 'Tìm kiếm nhà hàng...',
    'search.viewReviews': 'Xem đánh giá',
    'search.analyzedRestaurants': 'Quán ăn đã có báo cáo phân tích',
    'search.viewReviewArrow': 'Xem đánh giá →',
    'search.aggregateForQuery': 'Tìm & tổng hợp đánh giá quán "{query}"',
    'search.aggregateSubtext': 'Đọc nhanh nhận xét từ thực khách thực tế và tóm tắt mức độ hài lòng',
    'search.viewNow': 'Xem ngay →',
    'search.hint': 'Tìm theo tên món hoặc thương hiệu',
    'search.suggestionsLabel': 'Gợi ý:',
    'search.resultsCount': 'Tìm thấy {count} kết quả cho "{query}"',

    // Card
    'card.satisfaction': 'Hài lòng',
    'card.feedbackDistribution': 'Phân bổ phản hồi:',
    'card.sentimentBreakdown': '{pos}% Khen · {neu}% Ổn · {neg}% Chê',
    'card.updatingReview': 'Đang cập nhật đánh giá thực tế...',
    'card.mustTry': 'Nên gọi:',
    'card.caution': 'Lưu ý:',
    'card.viewDetailedReport': 'Xem báo cáo chi tiết',

    // Explore Page
    'explore.badge': 'Danh mục quán ăn đã đánh giá',
    'explore.title': 'Khám phá quán ăn',
    'explore.resultsFor': 'Kết quả cho "{query}"',
    'explore.subtitle': 'Tra cứu mức độ hài lòng thực tế và đánh giá chi tiết của thực khách tại các quán ăn trên toàn quốc.',
    'explore.searchPlaceholder': 'Tìm theo tên, món ăn, địa chỉ...',
    'explore.popularDishes': 'Món phổ biến:',
    'explore.categoryAll': 'Tất cả',
    'explore.categoryChickenRice': 'Cơm gà',
    'explore.categoryRicePaper': 'Bánh tráng',
    'explore.categoryQuangNoodles': 'Mì Quảng',
    'explore.categoryPho': 'Phở',
    'explore.categoryBrokenRice': 'Cơm tấm',
    'explore.categorySeafood': 'Hải sản',
    'explore.categoryBeefNoodles': 'Bún bò',
    'explore.categoryCrispyPancake': 'Bánh xèo',
    'explore.categoryCoffee': 'Cà phê',
    'explore.queueSuccess': 'Gửi yêu cầu thành công!',
    'explore.queueSuccessDesc': 'Hệ thống sẽ cập nhật quán này trong thời gian sớm nhất.',
    'explore.searching': 'Đang tìm kiếm quán ăn...',
    'explore.foundCount': 'Tìm thấy {count} quán ăn phù hợp',
    'explore.offlineMode': 'Chế độ ngoại tuyến',
    'explore.offlineTooltip': 'Đang hiển thị 6 quán mẫu ngoại tuyến do chưa kết nối máy chủ dữ liệu.',
    'explore.clearFilters': 'Xóa bộ lọc',
    'explore.offlineBannerTitle': 'Đang hiển thị dữ liệu mẫu ngoại tuyến',
    'explore.offlineBannerDesc': 'Hệ thống đang tạm thời hiển thị {count} nhà hàng mẫu ngoại tuyến do chưa kết nối được máy chủ dữ liệu trực tuyến. Bạn có thể bấm "Thử kết nối lại" để cập nhật dữ liệu mới nhất.',
    'explore.retryConnection': 'Thử kết nối lại',
    'explore.crawlingTitle': 'Đang tổng hợp đánh giá thực tế từ thực khách...',
    'explore.crawlingDesc': 'Hệ thống đang tổng hợp các nhận xét thực tế từ thực khách và lập báo cáo chất lượng. Vui lòng đợi trong giây lát (~20 - 30 giây)...',
    'explore.emptyNoServer': 'Mất kết nối tới máy chủ dữ liệu',
    'explore.emptyNoDataForQuery': 'Chưa có dữ liệu cho "{query}"',
    'explore.emptyNoDataForCity': 'Chưa có dữ liệu cho khu vực "{city}"',
    'explore.emptyNoResults': 'Không tìm thấy quán ăn nào',
    'explore.emptyDescNoServer': 'Không thể tải danh sách nhà hàng do chưa kết nối được máy chủ dữ liệu. Vui lòng bấm "Thử kết nối lại".',
    'explore.emptyDescQuery': 'Quán ăn "{query}" chưa có trong danh mục. Bạn có thể bấm nút bên dưới để hệ thống tổng hợp đánh giá và lập báo cáo ngay sau 25 giây, hoặc gửi yêu cầu cập nhật sau.',
    'explore.emptyDescCity': 'Khu vực "{city}" chưa có quán ăn trong danh mục hiện tại. Bạn có thể bấm xem ngay các quán nổi bật tại {city} hoặc chọn "Tất cả địa điểm".',
    'explore.emptyDescFilter': 'Không có quán ăn nào khớp với các thiết lập bộ lọc hiện tại của bạn.',
    'explore.directCrawlQuery': '⚡ Tổng hợp đánh giá "{query}" ngay (~25s)',
    'explore.directCrawlCity': '⚡ Xem quán nổi bật tại {city} (~25s)',
    'explore.directCrawlNew': '⚡ Tổng hợp đánh giá quán mới (~25s)',
    'explore.queueRequest': '📋 Yêu cầu thêm quán này',
    'explore.queueSubmitting': 'Đang gửi...',
    'explore.queueSubmittedBadge': '✅ Đã ghi nhận yêu cầu của bạn!',
    'explore.pasteFoodyDirect': 'Dán link Foody trực tiếp',
    'explore.viewAllInCity': 'Xem toàn bộ quán tại {city}',
    'explore.suggestedTitle': 'Gợi ý một số quán ăn nổi bật dành cho bạn:',

    // Dashboard Page
    'dashboard.loading': 'Đang chuẩn bị báo cáo đánh giá quán ăn...',
    'dashboard.notFoundTitle': 'Không tìm thấy quán ăn',
    'dashboard.notFoundDesc': 'Quán ăn bạn tìm kiếm hiện chưa có dữ liệu đánh giá hoặc đường dẫn không chính xác.',
    'dashboard.backToExplore': 'Quay lại danh sách quán',
    'dashboard.tabDiner': 'Dành cho Thực khách (Món ngon & Lưu ý)',
    'dashboard.tabOwner': 'Dành cho Quản lý & Chủ quán (Vận hành)',
    'dashboard.tabAssistant': 'Trợ lý Thông tin Nền tảng (Hỏi - Đáp)',
    'dashboard.tabReviews': 'Tất cả nhận xét gốc ({count})',
    'dashboard.ctaReviewsTitle': 'Muốn đọc chi tiết nhận xét từng khách hàng?',
    'dashboard.ctaReviewsDesc': 'Xem toàn bộ {count} đánh giá gốc đã được phân loại theo món ăn và cảm xúc.',
    'dashboard.ctaReviewsButton': 'Xem tất cả nhận xét gốc',

    // Dashboard - Hero
    'hero.back': 'Quay lại danh sách nhà hàng',
    'hero.basedOnReviews': 'Dựa trên {count} đánh giá thực tế từ thực khách',
    'hero.highCredibility': 'Độ tin cậy mẫu cao: {score}% · Đủ mẫu phân tích',
    'hero.mediumCredibility': 'Độ tin cậy mẫu khá: {score}% · Tham khảo tốt',
    'hero.lowCredibility': 'Mẫu nhỏ: {score}% · Khuyến nghị bổ sung',
    'hero.updated': 'Cập nhật: {date}',
    'hero.source': 'Nguồn: ',
    'hero.credibilityTooltip': 'Chỉ số tin cậy mẫu: {score}%',
    'hero.linkGoogleMapsBtn': '🔗 Bổ sung từ Google Maps',
    'hero.linkGoogleMapsTooltip': 'Bổ sung đánh giá từ Google Maps để làm giàu dữ liệu và nâng cao độ tin cậy mẫu',
    'hero.lowSampleWarningTitle': 'Cảnh báo cỡ mẫu nhỏ ({count} đánh giá):',
    'hero.lowSampleWarningDesc': 'Dữ liệu hiện tại chưa đủ lớn để đảm bảo độ tin cậy cao cho phân tích xu hướng. Khuyến nghị nạp thêm đánh giá từ Google Maps để tăng tính đại diện!',
    'hero.enrichNowBtn': 'Nạp từ Google Maps ngay',
    'hero.attentionNotice': 'Lưu ý từ thực khách:',
    'hero.attentionDetail': 'Có {percent}% phản hồi chưa hài lòng về {aspect} ({complaint}).',
    'hero.needsImprovementBadge': 'Tiêu chí cần cải thiện',

    // Dashboard - Metrics
    'metrics.rating': 'Điểm đánh giá',
    'metrics.ratingSub': '/ 5.0',
    'metrics.verified': 'Xác thực',
    'metrics.totalReviews': 'Tổng đánh giá',
    'metrics.analyzed': 'đã phân tích',
    'metrics.positive': 'Tích cực',
    'metrics.positiveSub': 'phản hồi hài lòng',
    'metrics.negative': 'Tiêu cực',
    'metrics.negativeSub': 'phản hồi góp ý',
    'metrics.ariaLabel': 'Chỉ số hiệu suất phân tích',

    // Dashboard - Aspects
    'aspects.badge': 'Đánh giá theo 5 tiêu chí cốt lõi',
    'aspects.title': 'Khách hàng nói gì nhiều nhất?',
    'aspects.desc': 'Mức độ quan tâm và tỷ lệ khen - chê của thực khách phân tách theo 5 chủ đề cốt lõi',
    'aspects.fiveCriteria': '5 Tiêu chí đánh giá',
    'aspects.positivePct': '{pct}% tích cực',
    'aspects.mentionRatio': 'Xuất hiện trong {pct}% bài đánh giá',
    'aspects.mentionCount': '({count} lượt nhắc)',
    'aspects.sampleKeywords': 'Từ khóa tiêu biểu:',
    'aspects.clickHint': 'Nhấp vào từng tiêu chí để xem ngay các đánh giá liên quan',

    // Dashboard - Love & Attention
    'love.title': 'Điểm khách hàng yêu thích',
    'love.footer': 'Các yếu tố nổi bật được xếp hạng theo lượng phản hồi tích cực từ khách hàng',
    'attention.title': 'Điểm cần chú ý & cải thiện',
    'attention.negativeRatio': '{pct}% đánh giá về {aspect} là tiêu cực',
    'attention.complaintLabel': '{count} đánh giá',
    'attention.complaintSub': 'phản hồi góp ý',
    'attention.commonIssues': 'Các vấn đề thường gặp nhất:',
    'attention.footer': 'Điểm nghẽn vận hành được phát hiện từ các khiếu nại lặp lại của thực khách',

    // Dashboard - Sentiment Breakdown & Trend
    'sentiment.customerSentiment': 'Cảm xúc khách hàng',
    'sentiment.trendTitle': 'Xu hướng cảm xúc theo thời gian',
    'sentiment.trendDesc': 'Biến động tỷ lệ đánh giá tích cực, trung lập và tiêu cực qua các tháng',
    'sentiment.range3m': '3 tháng',
    'sentiment.range6m': '6 tháng',
    'sentiment.range1y': '1 năm',
    'sentiment.rangeAll': 'Toàn bộ',
    'sentiment.tooltipReviews': '({count} đánh giá)',

    // Dashboard - Findings & Advice
    'findings.title': 'Phát hiện cốt lõi',
    'findings.desc': 'Tổng hợp nhận định định tính và định lượng từ dữ liệu phản hồi của khách hàng',
    'findings.badge': 'Nhận định phân tích',
    'advice.title': 'Đề xuất cải thiện vận hành dành cho quản lý',
    'advice.desc': 'Các bước hành động cụ thể được xây dựng từ quy luật phản hồi của khách hàng',
    'advice.badge': 'Cổng quản lý',
    'advice.priority': 'Mức ưu tiên',
    'advice.department': 'Bộ phận',
    'advice.issue': 'Vấn đề ghi nhận',
    'advice.impact': 'Tác động vận hành',
    'advice.solution': 'Giải pháp đề xuất',
    'advice.priorityHigh': 'Cao',
    'advice.priorityMedium': 'Trung bình',
    'advice.priorityLow': 'Thấp',

    // Dashboard - Review Explorer
    'explorer.badge': 'Nguồn dữ liệu gốc minh bạch',
    'explorer.title': 'Đánh giá từ thực khách',
    'explorer.desc': 'Đọc từng nhận xét chân thực của thực khách theo từng tiêu chí cụ thể và nguồn thu thập',
    'explorer.searchPlaceholder': 'Tìm theo món ăn hoặc từ khóa (vd: "gà giòn", "chờ lâu", "phục vụ", "view đẹp")...',
    'explorer.sentimentLabel': 'Cảm xúc:',
    'explorer.sourceLabel': 'Nguồn đánh giá:',
    'explorer.criteriaLabel': 'Tiêu chí:',
    'explorer.allCriteria': 'Tất cả tiêu chí',
    'explorer.noReviews': 'Không tìm thấy đánh giá phù hợp',
    'explorer.noReviewsHint': 'Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác',
    'explorer.resetAllFilters': 'Đặt lại tất cả bộ lọc',
    'explorer.verifiedDiner': 'Khách hàng thật',
    'explorer.composeReply': 'Soạn phản hồi',
    'explorer.extractedAspects': 'Trích xuất:',
    'explorer.guestFoody': 'Khách Foody',
    'explorer.guestGoogle': 'Khách Google',
    'explorer.guestReviewer': 'Khách đánh giá',

    // Dashboard - Review Detail Modal
    'detail.title': 'Chi tiết cảm nhận thực khách',
    'detail.idCode': 'Mã: {id}',
    'detail.verifiedVisit': 'Đã xác thực trải nghiệm',
    'detail.source': 'Nguồn: {source}',
    'detail.originalReview': 'Đánh giá gốc (Làm nổi bật ý kiến theo tiêu chí)',
    'detail.colorMeaning': 'Màu sắc phản ánh mức độ cảm xúc',
    'detail.criteriaReviewed': 'Các tiêu chí được nhận xét ({count})',
    'detail.confidence': 'Độ tin cậy: {score}%',
    'detail.satisfiedFeedback': 'Phản hồi hài lòng',
    'detail.needsImprovement': 'Phản ánh cần cải thiện',
    'detail.neutralNote': 'Ghi nhận trung lập',
    'detail.meaningTitle': 'Ý nghĩa:',
    'detail.meaningDesc': 'Đánh giá đa tiêu chí giúp làm rõ việc một bài nhận xét có thể vừa khen ngợi hương vị món ăn nhưng đồng thời chỉ ra điểm chưa hài lòng về thời gian chờ hoặc phong cách phục vụ.',

    // Dashboard - AI Assistant
    'ai.title': 'Trợ lý Thông tin Nền tảng',
    'ai.independent': 'Độc lập & Khách quan',
    'ai.analyzedCount': 'Phân tích khách quan dựa trên {count} đánh giá thực tế',
    'ai.welcome': 'Xin chào! Tôi là Trợ lý Thông tin của nền tảng **Restaurant Intelligence**. Tôi cung cấp góc nhìn phân tích độc lập, khách quan dựa trên **{count} nhận xét thực tế** của thực khách tại **{name}**. Bạn cần tra cứu món ngon, tiêu chí phục vụ, giá cả hay không gian quán?',
    'ai.refreshSession': 'Đã làm mới phiên trò chuyện. Tôi là Trợ lý Thông tin của nền tảng **Restaurant Intelligence**, sẵn sàng giải đáp và phân tích dữ liệu đánh giá thực tế của **{name}**!',
    'ai.resetConversation': 'Làm mới cuộc trò chuyện',
    'ai.instantResponse': 'Phản hồi tức thì',
    'ai.aiAssistant': 'Trợ lý AI',
    'ai.summarizing': 'Đang tổng hợp ý kiến thực khách...',
    'ai.suggestedQuestions': 'Câu hỏi gợi ý nhanh từ nền tảng:',
    'ai.inputPlaceholder': 'Tra cứu dữ liệu về {name} (ví dụ: món nào ngon, dịch vụ ra sao, số lượng đánh giá...)...',
    'ai.askButton': 'Hỏi',
    'ai.inputDisclaimer': 'Phân tích độc lập dựa trên nhận xét thực tế.',
    'ai.inputSupport': 'Hỗ trợ câu hỏi tự nhiên. Phân tích độc lập dựa trên nhận xét thực tế.',
    'ai.serverError': '> [!WARNING]\n> *Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích. Vui lòng thử lại sau giây lát.*',

    // How It Works Page
    'how.badge': 'Minh bạch & Khách quan',
    'how.title': 'Cách Restaurant Intelligence hoạt động',
    'how.subtitle': 'Làm thế nào để từ hàng trăm nhận xét rời rạc biến thành bức tranh toàn cảnh rõ ràng chỉ trong vài giây?',
    'how.step1Title': 'Thu thập đánh giá',
    'how.step1Sub': 'Ý kiến từ thực khách',
    'how.step1Desc': 'Tập hợp các nhận xét, số sao và trải nghiệm thực tế mà thực khách đã công khai chia sẻ sau khi đến quán ăn.',
    'how.step1Highlight': 'Nguồn gốc minh bạch từ người đi ăn thật.',
    'how.step2Title': 'Lọc bỏ bình luận rác',
    'how.step2Sub': 'Giữ lại thông tin thực chất',
    'how.step2Desc': 'Tự động loại bỏ các câu từ vô nghĩa, bình luận quảng cáo hoặc nhận xét giả để chỉ giữ lại những trải nghiệm ẩm thực thực tế.',
    'how.step2Highlight': 'Thông tin cô đọng, loại bỏ nội dung rác.',
    'how.step3Title': 'Đánh giá theo 5 tiêu chí',
    'how.step3Sub': 'Phân loại khen - chê chi tiết',
    'how.step3Desc': 'Phân tách rõ ràng: Khách khen món nào? Phàn nàn giá cả ra sao? Phục vụ nhanh hay chậm? Không gian có thoải mái không?',
    'how.step3Highlight': 'Đánh giá đa chiều, không bị lẫn lộn.',
    'how.step4Title': 'Bức tranh toàn cảnh',
    'how.step4Sub': 'Báo cáo tức thì',
    'how.step4Desc': 'Đưa ra bảng điểm hài lòng, danh sách món nên gọi, những điểm trừ cần lưu ý và gợi ý hữu ích cho người đi ăn.',
    'how.step4Highlight': 'Tiết kiệm thời gian, chọn đúng quán ngon.',
    'how.valuesBadge': 'Cam kết giá trị',
    'how.valuesTitle': 'Nguyên tắc phục vụ của chúng tôi',
    'how.valuesDesc': 'Chúng tôi xây dựng nền tảng này nhằm giải quyết nỗi thất vọng khi đọc phải đánh giá ảo hoặc mất hàng giờ tìm quán ăn.',
    'how.val1Title': 'Tách bạch rõ ràng khen & chê',
    'how.val1Desc': 'Một quán có thể nấu ăn rất ngon nhưng phục vụ chậm hoặc gửi xe khó. Chúng tôi phân tách từng yếu tố để bạn không bị đánh đồng.',
    'how.val2Title': 'Không thiên vị bất kỳ quán nào',
    'how.val2Desc': 'Các chỉ số được tổng hợp tự động từ nhận xét thực tế. Không nhận tiền quảng cáo để nói tốt cho quán dở.',
    'how.val3Title': 'Có thể xem lại đánh giá gốc',
    'how.val3Desc': 'Mọi kết luận về món ăn hay thái độ nhân viên đều có thể bấm vào để đọc lại chính xác bình luận nguyên bản của thực khách.',
    'how.exploreNowBtn': 'Khám phá các quán ăn đã đánh giá ngay →',

    // AnalyzeUrlModal
    'modal.title': 'Khảo sát & Phân tích Quán Ăn Mới',
    'modal.subtitle': 'Thu thập ý kiến thực khách từ Foody & Google Maps, phân tách 5 tiêu chí tự động',
    'modal.tabKeyword': 'Tìm theo tên quán / món ăn',
    'modal.tabUrl': 'Dán liên kết trang quán ăn',
    'modal.sourceLabel': 'Nguồn dữ liệu tìm kiếm',
    'modal.sourceSubtitle': 'Đồng bộ & phân tích ABSA tự động',
    'modal.sourceAuto': 'Đồng bộ kép (Ưu tiên)',
    'modal.sourceAutoDesc': 'Cào cả Foody & Google Maps',
    'modal.sourceFoody': 'Foody.vn',
    'modal.sourceFoodyDesc': 'Chỉ cào từ Foody.vn',
    'modal.sourceGoogle': 'Google Maps',
    'modal.sourceGoogleDesc': 'Chỉ cào Google Maps',
    'modal.keywordLabel': 'Tên quán ăn hoặc từ khóa món ăn',
    'modal.readyCount': '⚡ Có sẵn 230+ quán mở tức thì',
    'modal.keywordPlaceholder': 'Ví dụ: Bánh tráng Tiên Tiên, Pizza 4P\'s, Cơm gà Gia Vĩnh...',
    'modal.suggestionsTitle': 'Quán có sẵn trong hệ thống ({count}):',
    'modal.openNow': 'Mở ngay',
    'modal.autoCrawlNotice': 'Nếu quán chưa có trong hệ thống, hệ thống sẽ tự động tìm kiếm và tổng hợp đánh giá thực tế.',
    'modal.cityLabel': 'Khu vực / Thành phố',
    'modal.prominentDestinations': '🌟 Đô thị ẩm thực & du lịch trọng điểm',
    'modal.allProvinces': '🏛️ Tất cả 63 Tỉnh / Thành phố Việt Nam',
    'modal.urlLabel': 'Đường dẫn trang quán ăn',
    'modal.urlPlaceholder': 'Dán liên kết từ Foody.vn hoặc Google Maps...',
    'modal.urlInvalid': 'Hỗ trợ liên kết quán ăn từ Foody.vn hoặc Google Maps (Ví dụ: https://www.foody.vn/... hoặc https://www.google.com/maps/place/...)',
    'modal.googleMapsValid': 'Đã nhận diện liên kết Google Maps hợp lệ. Sẵn sàng cào qua Playwright và phân tích ABSA!',
    'modal.foodyValid': 'Đã nhận diện liên kết Foody.vn hợp lệ. Sẵn sàng tổng hợp và phân tích ABSA!',
    'modal.maxReviewsLabel': 'Số lượng đánh giá thu thập',
    'modal.reviewsFast': '15 đánh giá (Siêu tốc - ~5-8 giây)',
    'modal.reviewsStandard': '25 đánh giá (Tiêu chuẩn - ~12-15 giây)',
    'modal.reviewsDeep': '40 đánh giá (Chuyên sâu - ~25 giây)',
    'modal.crawlingProgress': 'Đang tổng hợp dữ liệu ({seconds}s)',
    'modal.stepCounter': 'Bước {step}/3',
    'modal.step1Gmaps': '1. Khởi tạo Playwright ẩn danh & kết nối Google Maps',
    'modal.step1Auto': '1. Tra cứu thông tin quán (Foody & Google Maps)',
    'modal.step1Foody': '1. Tra cứu thông tin địa điểm quán ăn trên Foody.vn',
    'modal.step2Gmaps': '2. Tải trang Google Maps & cuộn danh sách nhận xét',
    'modal.step2Auto': '2. Thu thập & bóc tách các bài nhận xét thực tế',
    'modal.step2Foody': '2. Thu thập bài nhận xét thực tế từ thực khách',
    'modal.step3': '3. Bóc tách cảm xúc 5 tiêu chí & tạo hồ sơ chất lượng',
    'modal.cancel': 'Hủy',
    'modal.submit': 'Khảo sát & Phân tích ngay',
    'modal.submitting': 'Đang khảo sát...',
    'modal.successTitle': 'Đã hoàn tất tổng hợp!',
    'modal.successDesc': 'Báo cáo đánh giá đã sẵn sàng. Đang chuyển hướng tới trang chi tiết...',
    'modal.errorTitle': 'Không thể tổng hợp đánh giá',
    'modal.unlockKeyword': 'Nhập tên quán (≥ 2 ký tự) để mở khóa',
    'modal.unlockUrl': 'Dán liên kết hợp lệ để mở khóa',
    'modal.submitGmaps': 'Tổng hợp từ Google Maps',
    'modal.submitFoody': 'Tổng hợp từ Foody.vn',
    'modal.submitAuto': 'Xem báo cáo đánh giá',
    'modal.submitUrl': 'Tổng hợp từ liên kết',
    'modal.sourceFoodyBadge': 'Nguồn: Foody.vn',
    'modal.sourceGoogleBadge': 'Nguồn: Google Maps',
    'modal.clearInput': 'Xóa nội dung nhập',
    'modal.clearUrl': 'Xóa đường dẫn',
    'modal.errorNotFoundKeyword': 'Không tìm thấy quán nào theo từ khóa này.',
    'modal.errorInvalidUrl': 'Không thể xử lý liên kết này.',
    'modal.errorServerConnection': 'Không thể kết nối tới máy chủ dữ liệu. Vui lòng thử lại sau.',

    // Link Google Maps Modal
    'linkModal.title': 'Bổ sung đánh giá từ Google Maps',
    'linkModal.subtitle': 'Làm giàu dữ liệu phân tích, nâng cao độ tin cậy mẫu và bóc tách cảm xúc đa nguồn',
    'linkModal.crawling': 'Đang kết nối & cào dữ liệu Google Maps ({seconds}s)',
    'linkModal.successTitle': 'Nạp dữ liệu từ Google Maps thành công!',
    'linkModal.successDesc': 'Toàn bộ bài viết mới đã được phân tích khía cạnh bằng Google Gemini ABSA.',
    'linkModal.newReviews': 'Review mới',
    'linkModal.duplicatesSkipped': 'Trùng lặp bỏ qua',
    'linkModal.totalReviews': 'Tổng đánh giá',
    'linkModal.newCredibility': 'Độ tin cậy mới',
    'linkModal.confirmBtn': 'Xác nhận & Cập nhật Dashboard',
    'linkModal.tabUrl': 'Dán đường dẫn Google Maps',
    'linkModal.tabSearch': 'Tìm kiếm tự động theo tên quán',
    'linkModal.urlLabel': 'Đường dẫn Google Maps (Place URL hoặc Share Link)',
    'linkModal.urlTip': 'Mẹo: Mở Google Maps trên trình duyệt, tìm quán và bấm nút "Chia sẻ" để copy liên kết.',
    'linkModal.syncNow': 'Bắt đầu thu thập',
    'linkModal.forRestaurant': 'Mở rộng cỡ mẫu phân tích cho {name}',
    'linkModal.collecting': 'Đang thu thập & chuẩn hóa đánh giá',
    'linkModal.dedupNote': 'Hệ thống tự động loại trừ các bài viết trùng lặp giữa Foody và Google Maps thông qua mã băm SHA-256 fingerprint, chỉ nạp đánh giá mới.',
    'linkModal.queryLabel': 'Tên quán & Địa chỉ cần tìm trên Google Maps',
    'linkModal.queryTip': 'Hệ thống sẽ dùng Playwright để tìm địa điểm chính xác nhất và trích xuất đánh giá.',
    'linkModal.sampleSize': 'Số lượng đánh giá mong muốn thu thập:',
    'linkModal.recommended': '(Khuyên dùng)',
    'linkModal.pipelineTitle': 'Quy trình xử lý dữ liệu chuẩn hóa',
    'linkModal.pipelineDesc': 'Dữ liệu sau khi thu thập bằng Playwright Headless sẽ được khử trùng lặp qua mã băm SHA-256 fingerprint, kiểm tra bộ lọc spam 11 ca và phân tích ABSA 5 khía cạnh độc lập qua Google Gemini AI.',
    'linkModal.cancel': 'Hủy bỏ',
    'linkModal.connecting': 'Đang kết nối...',
    'linkModal.elapsed': 'Thời gian hoàn tất: {seconds} giây · Nguồn: Google Maps',
    'linkModal.errorPrefix': 'Không thể hoàn tất thu thập:',
    'linkModal.errorUrlRequired': 'Vui lòng nhập đường dẫn Google Maps hợp lệ.',
    'linkModal.errorQueryRequired': 'Vui lòng nhập tên hoặc từ khóa tìm kiếm quán.',
    'linkModal.errorCrawlFailed': 'Không thể cào dữ liệu từ Google Maps. Vui lòng kiểm tra lại đường dẫn hoặc tên quán.',
    'linkModal.switchUrlTabBtn': 'Chuyển sang Dán đường dẫn Google Maps của chi nhánh này',

    // Review Reply Modal
    'replyModal.title': 'Soạn Thư Phản Hồi Thực Khách',
    'replyModal.badge': 'Hỗ trợ bởi AI',
    'replyModal.authorReview': 'Đánh giá của {author}',
    'replyModal.chooseTone': 'Chọn tông giọng phản hồi:',
    'replyModal.toneAutoHint': 'Tự động điều chỉnh theo từng tình huống',
    'replyModal.copyAll': 'Sao chép toàn bộ thư',
    'replyModal.copied': 'Đã sao chép!',
    'replyModal.toneApology': 'Chân thành & Nhận lỗi',
    'replyModal.toneApologySub': 'Xoa dịu bức xúc',
    'replyModal.toneApologyDesc': 'Thừa nhận thiếu sót, cam kết chấn chỉnh dịch vụ và cung cấp hotline hỗ trợ trực tiếp.',
    'replyModal.toneVoucher': 'Lịch sự & Tặng Voucher',
    'replyModal.toneVoucherSub': 'Đền bù ưu đãi 15%',
    'replyModal.toneVoucherDesc': 'Bày tỏ tiếc nuối và khéo léo gửi tặng mã giảm giá ưu đãi để mời thực khách quay lại.',
    'replyModal.toneGratitude': 'Tri ân & Thân thiện',
    'replyModal.toneGratitudeSub': 'Cảm ơn & Gắn kết',
    'replyModal.toneGratitudeDesc': 'Cảm ơn ấm áp, nhắc lại món ăn được khen ngợi và duy trì tình cảm thân thiết với khách quen.',
    'replyModal.toneClarification': 'Giải thích & Cầu thị',
    'replyModal.toneClarificationSub': 'Minh bạch lý do',
    'replyModal.toneClarificationDesc': 'Trình bày nhã nhặn về định lượng, quy chuẩn bếp hoặc giờ cao điểm với thái độ tôn trọng.',
    'replyModal.draftLabel': 'Bản nháp phản hồi đề xuất (Chỉnh sửa trực tiếp):',
    'replyModal.regenerate': 'Gợi ý câu khác',
    'replyModal.aspectsCaptured': 'Khía cạnh ghi nhận:',
    'replyModal.closeEsc': 'Đóng (ESC)',
    'replyModal.words': '{count} từ',
    'replyModal.chars': '{count} ký tự',
    'replyModal.cached': 'Đã lưu sẵn',
    'replyModal.suggested': 'Phản hồi gợi ý từ AI',
    'replyModal.voucherApplied': 'Mã ưu đãi đã chèn: {code} (Ưu đãi 15%)',
    'replyModal.copyVoucher': 'Chép mã',
    'replyModal.voucherCopied': 'Đã chép mã!',
    'replyModal.loadingDraft': 'Đang chuẩn bị nội dung phản hồi phù hợp...',
    'replyModal.placeholder': 'Nội dung thư phản hồi thực khách...',
    'replyModal.copyReply': 'Sao chép phản hồi',
    'replyModal.errorBannerTitle': 'Không thể tạo phản hồi tự động',
    'replyModal.errorGenerateFailed': 'Không thể tạo bản thảo phản hồi từ AI. Vui lòng bấm thử lại.',
    'replyModal.retry': 'Thử lại',

    // Pagination
    'pagination.showing': 'Hiển thị {from} - {to} trên {total}'
  },
  en: {
    // Navbar
    'nav.tagline': 'Culinary Sentiment Intelligence',
    'nav.explore': 'Explore',
    'nav.methodology': 'How It Works',
    'nav.badge': 'Authentic & Objective Reviews',
    'nav.searchPlaceholder': 'Search restaurants...',
    'nav.addRestaurant': '+ Add Restaurant',
    'nav.addRestaurantShort': '+ Add',
    'nav.home': 'Home',
    'nav.exploreShort': 'Explore',
    'nav.methodologyShort': 'How It Works',
    'nav.switchToEn': 'Switch to English',
    'nav.switchToVi': 'Chuyển sang Tiếng Việt (Switch to Vietnamese)',
    'nav.language': 'Language',

    // Footer
    'footer.description': 'AI-driven restaurant sentiment intelligence platform based on authentic diner feedback. Helping patrons choose great dining experiences and empowering managers to act on real insights.',
    'footer.dinerSurvey': 'Public diner sentiment survey',
    'footer.filterSpam': 'Filtering fake reviews & spam',
    'footer.platform': 'Platform',
    'footer.home': 'Home',
    'footer.explore': 'Explore Restaurants',
    'footer.methodology': 'Methodology & Sentiment Analysis',
    'footer.featuredReports': 'Featured Reports',
    'footer.copyright': '© 2026 Restaurant Intelligence. Dedicated to culinary analytics & operational intelligence.',
    'footer.pipeline': 'Collect diner voices → Filter fake reviews → Score across 5 aspects → Visual report',

    // Common & Metrics & Aspects
    'common.food': 'Food & Taste',
    'common.price': 'Price & Value',
    'common.service': 'Service Quality',
    'common.ambience': 'Ambience & Decor',
    'common.hygiene': 'Hygiene & Cleanliness',
    'common.location': 'Location & Access',
    'common.positive': 'Positive',
    'common.negative': 'Negative',
    'common.neutral': 'Neutral',
    'common.credibility': 'Credibility Score',
    'common.reviews': 'reviews',
    'common.all': 'All',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.cuisineFallback': 'Cuisine',
    'common.addressFallback': 'Address updating',
    'common.priceCasual': 'Casual',
    'common.priceMid': 'Moderate',
    'common.priceFine': 'Upscale',
    'common.loading': 'Loading...',
    'common.back': 'Back',
    'common.vs': 'VS',
    'common.requiredField': 'Required field',

    // Aspect names (short)
    'aspect.food': 'Food',
    'aspect.service': 'Service',
    'aspect.price': 'Price',
    'aspect.ambience': 'Ambience',
    'aspect.location': 'Location',
    'aspect.hygiene': 'Hygiene',

    // Sentiments
    'sentiment.positive': 'Positive',
    'sentiment.negative': 'Negative',
    'sentiment.neutral': 'Neutral',

    // FilterBar
    'filter.title': 'Filters & Refinement',
    'filter.reset': 'Reset filters',
    'filter.location': 'Location',
    'filter.allLocations': 'All locations',
    'filter.prominentDestinations': '🌟 Major Culinary & Travel Hubs',
    'filter.allProvinces': '🏛️ All 63 Provinces & Cities',
    'filter.cuisineType': 'Cuisine Type',
    'filter.allCuisines': 'All Cuisines',
    'filter.minRating': 'Minimum Rating',
    'filter.allRatings': 'All Ratings',
    'filter.starsOrHigher': '★ or higher',
    'filter.satisfaction': 'Satisfaction Level',
    'filter.allLevels': 'All Levels',
    'filter.highPositive': 'Highly Praised (>75% satisfied)',
    'filter.balanced': 'Balanced',
    'filter.needsAttention': 'Needs Attention (>12% complaints)',
    'filter.sortBy': 'Sort by:',
    'filter.sortReviews': 'Most Reviews',
    'filter.sortRating': 'Highest Rating',
    'filter.sortPositive': 'Highest Satisfaction',
    'filter.sortName': 'Name A - Z',

    // Cuisines
    'cuisine.all': 'All Cuisines',
    'cuisine.italian': 'Italian',
    'cuisine.vietnamese': 'Vietnamese',
    'cuisine.dimsum': 'Dim Sum',
    'cuisine.bbq': 'BBQ & Grill',
    'cuisine.cafe': 'Cafe',
    'cuisine.streetfood': 'Street Food',

    // Home Page
    'home.heroBadge': 'Culinary Sentiment Intelligence from Real Diners',
    'home.heroTitleLine1': 'Decipher Every Dining Table.',
    'home.heroTitleLine2': 'See What Diners Truly Think.',
    'home.heroSubtitle': 'Instead of spending 30 minutes reading through scattered comments — get an objective, multidimensional panorama of Food, Price, Service, and Ambience parsed scientifically.',
    'home.searchPlaceholder': 'Search dishes or restaurants (e.g. Pizza 4P\'s, Pho Thin, Chicken Rice)...',
    'home.diningOccasion': 'Dining occasion:',
    'home.tagFamily': '👨‍👩‍👧 Family Dining',
    'home.tagDating': '🍷 Business & Dating',
    'home.tagFast': '⚡ Fast Service',
    'home.tagBudget': '💰 Great Value',
    'home.tagSpecialty': '🍜 Regional Specialties',
    'home.trustNoLogin': 'No account required',
    'home.trustFilterSpam': 'Filters fake & spam reviews',
    'home.trustFiveAspects': 'Analyzed across 5 core aspects',
    'home.spotlightSubtitle': 'Live Breakdown',
    'home.spotlightTitle': 'Spotlight: Featured Intelligence Profile',
    'home.spotlightDesc': 'See how real diner reviews are distilled from big data into clear, objective indicators.',
    'home.changeSample': 'Switch sample:',
    'home.realReviews': '{count} real reviews',
    'home.addressLabel': 'Address: {address}',
    'home.addressUpdating': 'Updating',
    'home.satisfactionRate': 'Satisfaction',
    'home.coreCriteriaScore': '5 Core Criteria Measurement:',
    'home.praiseRate': 'Praise Rate',
    'home.viewFullProfile': 'View full profile for {name}',
    'home.preparingData': 'Preparing restaurant intelligence data...',
    'home.spamFilterTitle': 'Spam & Fake Review Filter',
    'home.spamFilterDesc': 'Automatically excludes promotional spam and fake bot accounts, preserving only genuine firsthand diner feedback.',
    'home.spamRemovedLabel': 'Spam review rejection rate:',
    'home.spamRemovedValue': '~18.5% eliminated',
    'home.credibilityLabel': 'Data reliability index:',
    'home.credibilityValue': '98.2% Accuracy',
    'home.continuousUpdate': 'Continuously updated',
    'home.objectiveGuaranteed': '100% Objective',
    'home.signatureAndNotes': 'Signature Dishes & Notes',
    'home.topPraiseDish': 'Most praised signature dish:',
    'home.preparationNote': 'Preparation & wait notes:',
    'home.peakHourNoteDefault': 'Reservation recommended during peak hours',
    'home.signatureSubtitle': '* Automatically extracted from top recurrent compliments and complaints.',
    'home.comparisonBadge': 'Visual Comparison Tool',
    'home.comparisonTitle': 'Head-to-Head: Which One to Choose?',
    'home.comparisonDesc': 'Compare two restaurants side-by-side on the 5 core aspects to choose the best fit for your meal.',
    'home.restaurantA': 'Restaurant A:',
    'home.restaurantB': 'Restaurant B:',
    'home.fiveCriteria': '5 Criteria',
    'home.satisfiedPercent': '{percent}% satisfied',
    'home.viewProfileArrow': 'View {name} profile →',
    'home.dualPerspectiveBadge': 'Dual Perspectives',
    'home.dualPerspectiveTitle': 'Engineered for Both Diners and Owners',
    'home.dualPerspectiveDesc': 'Whether you are seeking the perfect meal or managing a restaurant, insights are tailored to your objective.',
    'home.tabDiner': 'For Patrons',
    'home.tabOwner': 'For Restaurant Owners',
    'home.dinerCard1Title': 'Discover signature dishes & items to skip',
    'home.dinerCard1Desc': 'See which signature dish 90% of guests praise, and which dishes receive complaints regarding seasoning, temperature, or portion size.',
    'home.dinerCard1Benefit': 'Eliminate ordering regrets on important outings',
    'home.dinerCard2Title': 'Anticipate actual service & wait-time bottlenecks',
    'home.dinerCard2Desc': 'Know parking availability, peak-hour wait times, and staff responsiveness before you even arrive.',
    'home.dinerCard3Title': 'Realistic pricing & value for money',
    'home.dinerCard3Desc': 'Gauge whether the bill matches the dining experience based on hundreds of verified reviews.',
    'home.ownerCard1Title': 'Diagnose operational bottlenecks accurately',
    'home.ownerCard1Desc': 'Clusters recurrent issues (cleanliness, delayed courses, billing errors) into actionable categories without guesswork.',
    'home.ownerCard1Benefit': 'Save hours reviewing CCTV footage and logbooks',
    'home.ownerCard2Title': 'Track staff demeanor & guest service satisfaction',
    'home.ownerCard2Desc': 'Monitor complaints regarding servers, floor staff, or parking attendants across time intervals.',
    'home.ownerCard3Title': 'Track monthly improvements & operational trends',
    'home.ownerCard3Desc': 'Observe whether quality scores rise on the trendline after staff retraining or supplier upgrades.',
    'home.curatedBadge': 'Editorial Curation',
    'home.curatedTitle': 'Featured Analyzed Restaurants',
    'home.curatedDesc': 'Explore in-depth sentiment profiles of widely popular dining spots',
    'home.viewAllRestaurants': 'View all restaurants ({count})',
    'home.manifestoBadge': 'Transparent & Independent',
    'home.manifestoTitle': 'How Does Restaurant Intelligence Parse Reviews?',
    'home.manifestoDesc': 'From thousands of raw diner reviews, our engine filters out spam, isolates sentiment across 5 key quality criteria, and produces an honest summary within seconds.',
    'home.viewMethodologyCta': 'Explore Our Methodology →',
    'home.defaultDinerQuote': 'Authentic feedback from verified diners.',
    'home.exploreAll': 'Explore All Restaurants',
    'home.howItWorks': 'Learn How It Works',

    // SearchBar
    'search.placeholder': 'Search restaurants...',
    'search.viewReviews': 'View Reviews',
    'search.analyzedRestaurants': 'Analyzed Restaurants Available',
    'search.viewReviewArrow': 'View Reviews →',
    'search.aggregateForQuery': 'Search & synthesize reviews for "{query}"',
    'search.aggregateSubtext': 'Quickly read authentic diner feedback and satisfaction summary',
    'search.viewNow': 'View now →',
    'search.hint': 'Search by dish name or restaurant brand',
    'search.suggestionsLabel': 'Suggestions:',
    'search.resultsCount': 'Found {count} restaurants matching "{query}"',

    // Card
    'card.satisfaction': 'Satisfied',
    'card.feedbackDistribution': 'Sentiment Distribution:',
    'card.sentimentBreakdown': '{pos}% Praise · {neu}% Neutral · {neg}% Critic',
    'card.updatingReview': 'Updating verified reviews...',
    'card.mustTry': 'Must Try:',
    'card.caution': 'Heads Up:',
    'card.viewDetailedReport': 'View Detailed Report',

    // Explore Page
    'explore.badge': 'Directory of Analyzed Restaurants',
    'explore.title': 'Explore Restaurants',
    'explore.resultsFor': 'Results for "{query}"',
    'explore.subtitle': 'Look up genuine diner satisfaction and in-depth sentiment profiles across nationwide restaurants.',
    'explore.searchPlaceholder': 'Search by name, dish, address...',
    'explore.popularDishes': 'Popular Dishes:',
    'explore.categoryAll': 'All',
    'explore.categoryChickenRice': 'Chicken Rice',
    'explore.categoryRicePaper': 'Rice Paper',
    'explore.categoryQuangNoodles': 'Quang Noodles',
    'explore.categoryPho': 'Pho',
    'explore.categoryBrokenRice': 'Broken Rice',
    'explore.categorySeafood': 'Seafood',
    'explore.categoryBeefNoodles': 'Beef Noodles',
    'explore.categoryCrispyPancake': 'Crispy Pancake',
    'explore.categoryCoffee': 'Coffee',
    'explore.queueSuccess': 'Request submitted successfully!',
    'explore.queueSuccessDesc': 'Our system will crawl and analyze this restaurant shortly.',
    'explore.searching': 'Searching for restaurants...',
    'explore.foundCount': 'Found {count} matching restaurants',
    'explore.offlineMode': 'Offline Mode',
    'explore.offlineTooltip': 'Displaying 6 offline sample restaurants due to lack of backend connection.',
    'explore.clearFilters': 'Clear Filters',
    'explore.offlineBannerTitle': 'Currently Displaying Offline Sample Data',
    'explore.offlineBannerDesc': 'Temporarily displaying {count} offline sample restaurants. Click "Retry Connection" to reconnect to the live database.',
    'explore.retryConnection': 'Retry Connection',
    'explore.crawlingTitle': 'Synthesizing authentic diner reviews...',
    'explore.crawlingDesc': 'Our AI engine is compiling real customer feedback into a structured quality report. Please wait (~20 - 30s)...',
    'explore.emptyNoServer': 'Connection to Data Server Lost',
    'explore.emptyNoDataForQuery': 'No data yet for "{query}"',
    'explore.emptyNoDataForCity': 'No data yet for region "{city}"',
    'explore.emptyNoResults': 'No Restaurants Found',
    'explore.emptyDescNoServer': 'Unable to load restaurant directory. Please click "Retry Connection".',
    'explore.emptyDescQuery': '"{query}" is not yet in our index. Click below to crawl and analyze immediately (~25s) or queue a background request.',
    'explore.emptyDescCity': 'No indexed restaurants in "{city}" yet. Click below to discover featured spots or reset location.',
    'explore.emptyDescFilter': 'No restaurants match your current filter selections.',
    'explore.directCrawlQuery': '⚡ Analyze "{query}" on-demand (~25s)',
    'explore.directCrawlCity': '⚡ Discover top restaurants in {city} (~25s)',
    'explore.directCrawlNew': '⚡ Analyze new restaurant (~25s)',
    'explore.queueRequest': '📋 Request This Restaurant',
    'explore.queueSubmitting': 'Submitting...',
    'explore.queueSubmittedBadge': '✅ Request recorded!',
    'explore.pasteFoodyDirect': 'Paste Foody Link Directly',
    'explore.viewAllInCity': 'View all restaurants in {city}',
    'explore.suggestedTitle': 'Recommended featured restaurants for you:',

    // Dashboard Page
    'dashboard.loading': 'Preparing restaurant intelligence report...',
    'dashboard.notFoundTitle': 'Restaurant Not Found',
    'dashboard.notFoundDesc': 'The restaurant you are looking for has no available sentiment data or the link is invalid.',
    'dashboard.backToExplore': 'Back to Restaurant Directory',
    'dashboard.tabDiner': 'For Diners (Dishes & Insights)',
    'dashboard.tabOwner': 'For Owners & Managers (Operations)',
    'dashboard.tabAssistant': 'Platform Intelligence Assistant (Q&A)',
    'dashboard.tabReviews': 'All Original Reviews ({count})',
    'dashboard.ctaReviewsTitle': 'Want to read individual customer reviews?',
    'dashboard.ctaReviewsDesc': 'Explore all {count} authentic reviews categorized by dish and sentiment.',
    'dashboard.ctaReviewsButton': 'View All Original Reviews',

    // Dashboard - Hero
    'hero.back': 'Back to Restaurant List',
    'hero.basedOnReviews': 'Based on {count} verified diner reviews',
    'hero.highCredibility': 'High Sample Credibility: {score}% · Statistically sound',
    'hero.mediumCredibility': 'Moderate Credibility: {score}% · Good reference',
    'hero.lowCredibility': 'Small Sample: {score}% · More reviews recommended',
    'hero.updated': 'Updated: {date}',
    'hero.source': 'Source: ',
    'hero.credibilityTooltip': 'Sample credibility score: {score}%',
    'hero.linkGoogleMapsBtn': '🔗 Enrich from Google Maps',
    'hero.linkGoogleMapsTooltip': 'Enrich review sample from Google Maps to increase credibility',
    'hero.lowSampleWarningTitle': 'Small Sample Warning ({count} reviews):',
    'hero.lowSampleWarningDesc': 'Current data volume is low. We recommend syncing reviews from Google Maps for higher statistical confidence.',
    'hero.enrichNowBtn': 'Sync Google Maps Now',
    'hero.attentionNotice': 'Diner Notice:',
    'hero.attentionDetail': '{percent}% negative feedback regarding {aspect} ({complaint}).',
    'hero.needsImprovementBadge': 'Area for Improvement',

    // Dashboard - Metrics
    'metrics.rating': 'Overall Rating',
    'metrics.ratingSub': '/ 5.0',
    'metrics.verified': 'Verified',
    'metrics.totalReviews': 'Total Reviews',
    'metrics.analyzed': 'analyzed',
    'metrics.positive': 'Positive',
    'metrics.positiveSub': 'satisfied feedback',
    'metrics.negative': 'Negative',
    'metrics.negativeSub': 'critical feedback',
    'metrics.ariaLabel': 'Analytical performance metrics',

    // Dashboard - Aspects
    'aspects.badge': 'Analyzed across 5 Core Criteria',
    'aspects.title': 'What Do Diners Talk About Most?',
    'aspects.desc': 'Diner engagement and sentiment breakdown across 5 core pillars',
    'aspects.fiveCriteria': '5 Evaluation Pillars',
    'aspects.positivePct': '{pct}% positive',
    'aspects.mentionRatio': 'Mentioned in {pct}% of reviews',
    'aspects.mentionCount': '({count} mentions)',
    'aspects.sampleKeywords': 'Representative keywords:',
    'aspects.clickHint': 'Click on any pillar to view related customer reviews',

    // Dashboard - Love & Attention
    'love.title': 'What Customers Love',
    'love.footer': 'Highlights ranked by positive diner praise volume',
    'attention.title': 'What Needs Attention',
    'attention.negativeRatio': '{pct}% of reviews about {aspect} are critical',
    'attention.complaintLabel': '{count} reviews',
    'attention.complaintSub': 'critical feedback',
    'attention.commonIssues': 'Most frequent pain points:',
    'attention.footer': 'Operational friction points identified from recurrent diner complaints',

    // Dashboard - Sentiment Breakdown & Trend
    'sentiment.customerSentiment': 'Customer Sentiment',
    'sentiment.trendTitle': 'Sentiment Trend Over Time',
    'sentiment.trendDesc': 'Monthly trajectory of positive, neutral, and negative diner ratings',
    'sentiment.range3m': '3 months',
    'sentiment.range6m': '6 months',
    'sentiment.range1y': '1 year',
    'sentiment.rangeAll': 'All time',
    'sentiment.tooltipReviews': '({count} reviews)',

    // Dashboard - Findings & Advice
    'findings.title': 'Key Analytical Findings',
    'findings.desc': 'Qualitative and quantitative takeaways synthesized from diner feedback',
    'findings.badge': 'Intelligence Takeaway',
    'advice.title': 'Operational Action Plan for Management',
    'advice.desc': 'Concrete operational steps formulated from diner feedback patterns',
    'advice.badge': 'Manager Portal',
    'advice.priority': 'Priority',
    'advice.department': 'Department',
    'advice.issue': 'Reported Issue',
    'advice.impact': 'Operational Impact',
    'advice.solution': 'Recommended Solution',
    'advice.priorityHigh': 'High',
    'advice.priorityMedium': 'Medium',
    'advice.priorityLow': 'Low',

    // Dashboard - Review Explorer
    'explorer.badge': 'Transparent Raw Data Source',
    'explorer.title': 'Diner Reviews',
    'explorer.desc': 'Read genuine customer reviews by specific criteria and data source',
    'explorer.searchPlaceholder': 'Search dishes or keywords (e.g. "crispy chicken", "long wait", "service", "nice view")...',
    'explorer.sentimentLabel': 'Sentiment:',
    'explorer.sourceLabel': 'Review Source:',
    'explorer.criteriaLabel': 'Criteria:',
    'explorer.allCriteria': 'All Criteria',
    'explorer.noReviews': 'No matching reviews found',
    'explorer.noReviewsHint': 'Try clearing filters or searching for different keywords',
    'explorer.resetAllFilters': 'Reset All Filters',
    'explorer.verifiedDiner': 'Verified Customer',
    'explorer.composeReply': 'Draft Reply',
    'explorer.extractedAspects': 'Extracted:',
    'explorer.guestFoody': 'Foody Diner',
    'explorer.guestGoogle': 'Google Diner',
    'explorer.guestReviewer': 'Verified Diner',

    // Dashboard - Review Detail Modal
    'detail.title': 'Diner Feedback Details',
    'detail.idCode': 'ID: {id}',
    'detail.verifiedVisit': 'Verified Dining Experience',
    'detail.source': 'Source: {source}',
    'detail.originalReview': 'Original Review (Key aspects highlighted)',
    'detail.colorMeaning': 'Colors reflect sentiment intensity',
    'detail.criteriaReviewed': 'Mentioned Aspects ({count})',
    'detail.confidence': 'Confidence: {score}%',
    'detail.satisfiedFeedback': 'Satisfied feedback',
    'detail.needsImprovement': 'Needs improvement',
    'detail.neutralNote': 'Neutral feedback',
    'detail.meaningTitle': 'Methodology Note:',
    'detail.meaningDesc': 'Multi-aspect sentiment analysis decouples flavor praise from service delays or ambience critiques.',

    // Dashboard - AI Assistant
    'ai.title': 'Platform Intelligence Assistant',
    'ai.independent': 'Independent & Objective',
    'ai.analyzedCount': 'Objective analysis based on {count} authentic reviews',
    'ai.welcome': 'Hello! I am the **Restaurant Intelligence** Assistant. I provide objective, data-backed insights derived from **{count} verified diner reviews** of **{name}**. What would you like to explore regarding dishes, service, pricing, or ambience?',
    'ai.refreshSession': 'Conversation refreshed. I am your **Restaurant Intelligence** Assistant, ready to explore verified diner feedback for **{name}**!',
    'ai.resetConversation': 'Reset conversation',
    'ai.instantResponse': 'Instant cached',
    'ai.aiAssistant': 'AI Assistant',
    'ai.summarizing': 'Synthesizing diner feedback...',
    'ai.suggestedQuestions': 'Suggested Questions:',
    'ai.inputPlaceholder': 'Inquire about {name} (e.g. signature dishes, service quality, review volume)...',
    'ai.askButton': 'Ask',
    'ai.inputDisclaimer': 'Independent analysis based on authentic diner reviews.',
    'ai.inputSupport': 'Natural language queries supported. Independent analysis based on authentic reviews.',
    'ai.serverError': '> [!WARNING]\n> *Currently unable to connect to the sentiment engine. Please try again shortly.*',

    // How It Works Page
    'how.badge': 'Transparent & Objective',
    'how.title': 'How Restaurant Intelligence Works',
    'how.subtitle': 'How do hundreds of scattered customer opinions transform into a clear, multidimensional panorama in seconds?',
    'how.step1Title': 'Collect Diner Reviews',
    'how.step1Sub': 'Firsthand Patron Voices',
    'how.step1Desc': 'Aggregates authentic reviews, star ratings, and real dining experiences shared by diners.',
    'how.step1Highlight': 'Transparent origin from genuine diners.',
    'how.step2Title': 'Filter Out Spam',
    'how.step2Sub': 'Preserve Substantive Feedback',
    'how.step2Desc': 'Automatically eliminates promotional spam, bot accounts, and nonsensical text to isolate genuine dining experiences.',
    'how.step2Highlight': 'Concise insights, free from promotional clutter.',
    'how.step3Title': '5 Aspect ABSA Evaluation',
    'how.step3Sub': 'Detailed Praise & Critique Parsing',
    'how.step3Desc': 'Disentangles sentiments: Which dishes are praised? Is pricing fair? Is service prompt? Is the atmosphere welcoming?',
    'how.step3Highlight': 'Multidimensional clarity without conflation.',
    'how.step4Title': 'Holistic Panorama',
    'how.step4Sub': 'Instant Intelligence Report',
    'how.step4Desc': 'Presents a satisfaction dashboard, must-try dishes, caution points, and actionable operational insights.',
    'how.step4Highlight': 'Saves dining research time, ensures great meals.',
    'how.valuesBadge': 'Core Values',
    'how.valuesTitle': 'Our Guiding Principles',
    'how.valuesDesc': 'Built to eliminate the frustration of misleading fake reviews and endless review scanning.',
    'how.val1Title': 'Decouple Praise & Critique',
    'how.val1Desc': 'A restaurant might serve world-class flavors while struggling with parking. We evaluate each aspect individually.',
    'how.val2Title': 'Zero Bias & No Sponsored Content',
    'how.val2Desc': 'Scores are synthesized purely from authentic patron reviews without paid promotional skew.',
    'how.val3Title': 'Auditable Raw Reviews',
    'how.val3Desc': 'Every conclusion links back to the original unaltered diner review for full transparency.',
    'how.exploreNowBtn': 'Explore Analyzed Restaurants Now →',

    // AnalyzeUrlModal
    'modal.title': 'Survey & Analyze New Restaurant',
    'modal.subtitle': 'Collect authentic diner feedback from Foody & Google Maps with automated 5-aspect analysis',
    'modal.tabKeyword': 'Search by name / dish',
    'modal.tabUrl': 'Paste restaurant link',
    'modal.sourceLabel': 'Search Data Source',
    'modal.sourceSubtitle': 'Automated ABSA sentiment sync',
    'modal.sourceAuto': 'Dual Sync (Recommended)',
    'modal.sourceAutoDesc': 'Scrape both Foody & Google Maps',
    'modal.sourceFoody': 'Foody.vn',
    'modal.sourceFoodyDesc': 'Scrape from Foody only',
    'modal.sourceGoogle': 'Google Maps',
    'modal.sourceGoogleDesc': 'Scrape from Google Maps only',
    'modal.keywordLabel': 'Restaurant name or dish keyword',
    'modal.readyCount': '⚡ 230+ indexed restaurants open instantly',
    'modal.keywordPlaceholder': 'E.g.: Pizza 4P\'s, Pho Thin, Tien Tien Rice Paper...',
    'modal.suggestionsTitle': 'Indexed restaurants available ({count}):',
    'modal.openNow': 'Open Now',
    'modal.autoCrawlNotice': 'If the restaurant is not yet indexed, our engine will automatically search and analyze live reviews.',
    'modal.cityLabel': 'Region / City',
    'modal.prominentDestinations': '🌟 Major Culinary & Travel Hubs',
    'modal.allProvinces': '🏛️ All 63 Provinces & Cities',
    'modal.urlLabel': 'Restaurant Page URL',
    'modal.urlPlaceholder': 'Paste link from Foody.vn or Google Maps...',
    'modal.urlInvalid': 'Supported links: Foody.vn or Google Maps (e.g. https://www.foody.vn/... or https://www.google.com/maps/place/...)',
    'modal.googleMapsValid': 'Valid Google Maps link detected. Ready to scrape and analyze via ABSA!',
    'modal.foodyValid': 'Valid Foody.vn link detected. Ready to compile and analyze via ABSA!',
    'modal.maxReviewsLabel': 'Review Sample Size',
    'modal.reviewsFast': '15 reviews (Turbo - ~5-8s)',
    'modal.reviewsStandard': '25 reviews (Standard - ~12-15s)',
    'modal.reviewsDeep': '40 reviews (Deep Analysis - ~25s)',
    'modal.crawlingProgress': 'Compiling review data ({seconds}s)',
    'modal.stepCounter': 'Step {step}/3',
    'modal.step1Gmaps': '1. Initialize headless Playwright & connect Google Maps',
    'modal.step1Auto': '1. Look up restaurant metadata (Foody & Google Maps)',
    'modal.step1Foody': '1. Look up restaurant listing on Foody.vn',
    'modal.step2Gmaps': '2. Load Google Maps listing & scroll reviews',
    'modal.step2Auto': '2. Scrape and extract authentic diner reviews',
    'modal.step2Foody': '2. Scrape firsthand customer reviews from Foody',
    'modal.step3': '3. Parse 5-aspect sentiments & generate quality profile',
    'modal.cancel': 'Cancel',
    'modal.submit': 'Survey & Analyze Now',
    'modal.submitting': 'Analyzing...',
    'modal.successTitle': 'Analysis Complete!',
    'modal.successDesc': 'Intelligence report ready. Redirecting to details...',
    'modal.errorTitle': 'Unable to analyze reviews',
    'modal.unlockKeyword': 'Enter restaurant name (≥ 2 chars) to unlock',
    'modal.unlockUrl': 'Paste valid link to unlock',
    'modal.submitGmaps': 'Analyze from Google Maps',
    'modal.submitFoody': 'Analyze from Foody.vn',
    'modal.submitAuto': 'View Sentiment Report',
    'modal.submitUrl': 'Analyze from Link',
    'modal.sourceFoodyBadge': 'Source: Foody.vn',
    'modal.sourceGoogleBadge': 'Source: Google Maps',
    'modal.clearInput': 'Clear input',
    'modal.clearUrl': 'Clear URL',
    'modal.errorNotFoundKeyword': 'No restaurant found matching this keyword.',
    'modal.errorInvalidUrl': 'Unable to process this link.',
    'modal.errorServerConnection': 'Unable to connect to data server. Please try again later.',

    // Link Google Maps Modal
    'linkModal.title': 'Enrich Reviews from Google Maps',
    'linkModal.subtitle': 'Enrich sentiment data, raise sample credibility, and decouple multi-source feedback',
    'linkModal.crawling': 'Connecting & scraping Google Maps ({seconds}s)',
    'linkModal.successTitle': 'Google Maps data synced successfully!',
    'linkModal.successDesc': 'All new reviews have been parsed across aspects via Google Gemini ABSA.',
    'linkModal.newReviews': 'New Reviews',
    'linkModal.duplicatesSkipped': 'Duplicates Skipped',
    'linkModal.totalReviews': 'Total Reviews',
    'linkModal.newCredibility': 'New Credibility',
    'linkModal.confirmBtn': 'Confirm & Update Dashboard',
    'linkModal.tabUrl': 'Paste Google Maps URL',
    'linkModal.tabSearch': 'Auto Search by Restaurant Name',
    'linkModal.urlLabel': 'Google Maps URL (Place URL or Share Link)',
    'linkModal.urlTip': 'Tip: Open Google Maps, search the restaurant, and click "Share" to copy the link.',
    'linkModal.syncNow': 'Sync Reviews Now',
    'linkModal.forRestaurant': 'Enrich review sample for {name}',
    'linkModal.collecting': 'Collecting & normalizing reviews',
    'linkModal.dedupNote': 'The system automatically deduplicates reviews between Foody and Google Maps via SHA-256 fingerprints, ingesting only genuine new feedback.',
    'linkModal.queryLabel': 'Restaurant name & address on Google Maps',
    'linkModal.queryTip': 'System uses Playwright to locate the matching listing and extract authentic reviews.',
    'linkModal.sampleSize': 'Target review sample size:',
    'linkModal.recommended': '(Recommended)',
    'linkModal.pipelineTitle': 'Standardized Data Pipeline',
    'linkModal.pipelineDesc': 'Data collected via headless Playwright is deduplicated via SHA-256 fingerprinting, spam-filtered across 11 test cases, and independently parsed into 5 aspects via Google Gemini ABSA.',
    'linkModal.cancel': 'Cancel',
    'linkModal.connecting': 'Connecting...',
    'linkModal.elapsed': 'Completed in: {seconds}s · Source: Google Maps',
    'linkModal.errorPrefix': 'Unable to complete scrape:',
    'linkModal.errorUrlRequired': 'Please enter a valid Google Maps URL.',
    'linkModal.errorQueryRequired': 'Please enter a restaurant name or search query.',
    'linkModal.errorCrawlFailed': 'Unable to scrape Google Maps reviews. Please check the URL or restaurant name.',
    'linkModal.switchUrlTabBtn': 'Switch to Paste Google Maps link for this branch',

    // Review Reply Modal
    'replyModal.title': 'Draft Customer Reply',
    'replyModal.badge': 'AI Powered',
    'replyModal.authorReview': 'Review by {author}',
    'replyModal.chooseTone': 'Select Reply Tone:',
    'replyModal.toneAutoHint': 'Automatically tailored to customer sentiment',
    'replyModal.copyAll': 'Copy Reply',
    'replyModal.copied': 'Copied!',
    'replyModal.toneApology': 'Sincere Apology',
    'replyModal.toneApologySub': 'Soothe Frustration',
    'replyModal.toneApologyDesc': 'Acknowledge shortcomings, commit to service rectifications, and provide a direct hotline.',
    'replyModal.toneVoucher': 'Courteous & Gift Voucher',
    'replyModal.toneVoucherSub': 'Compensatory 15% discount',
    'replyModal.toneVoucherDesc': 'Express regret and offer an exclusive voucher to invite the patron back.',
    'replyModal.toneGratitude': 'Warm Appreciation',
    'replyModal.toneGratitudeSub': 'Thank & Engage',
    'replyModal.toneGratitudeDesc': 'Warm thank-you, recalling praised dishes and reinforcing guest rapport.',
    'replyModal.toneClarification': 'Respectful Clarification',
    'replyModal.toneClarificationSub': 'Transparent context',
    'replyModal.toneClarificationDesc': 'Politely clarify portion standards, kitchen prep, or peak-hour constraints.',
    'replyModal.draftLabel': 'Draft Response Proposal (Direct Edit):',
    'replyModal.regenerate': 'Regenerate Draft',
    'replyModal.aspectsCaptured': 'Captured aspects:',
    'replyModal.closeEsc': 'Close (ESC)',
    'replyModal.words': '{count} words',
    'replyModal.chars': '{count} chars',
    'replyModal.cached': 'Cached draft',
    'replyModal.suggested': 'AI generated proposal',
    'replyModal.voucherApplied': 'Voucher applied: {code} (15% discount)',
    'replyModal.copyVoucher': 'Copy code',
    'replyModal.voucherCopied': 'Code copied!',
    'replyModal.loadingDraft': 'Generating tailored response...',
    'replyModal.placeholder': 'Customer reply draft...',
    'replyModal.copyReply': 'Copy Reply',
    'replyModal.errorBannerTitle': 'Unable to generate automated reply',
    'replyModal.errorGenerateFailed': 'Unable to generate AI reply draft. Please click retry.',
    'replyModal.retry': 'Retry',

    // Pagination
    'pagination.showing': 'Showing {from} - {to} of {total}'
  }
};

/**
 * Replace placeholders like `{count}` or `{query}` in template strings.
 */
export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params || typeof params !== 'object') {
    return text;
  }
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, paramName) => {
    if (Object.prototype.hasOwnProperty.call(params, paramName)) {
      return String(params[paramName]);
    }
    return match;
  });
}

/**
 * Pure translation function supporting key lookup, variable interpolation, and fallbacks.
 */
export function translate(
  lang: Language,
  key: string,
  paramsOrFallback?: Record<string, string | number> | string,
  fallback?: string
): string {
  if (!key || typeof key !== 'string') {
    return '';
  }

  let params: Record<string, string | number> | undefined;
  let customFallback: string | undefined;

  if (typeof paramsOrFallback === 'string') {
    customFallback = paramsOrFallback;
  } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
    params = paramsOrFallback;
    customFallback = fallback;
  } else {
    customFallback = fallback;
  }

  const dict = translations[lang];
  let rawText: string | undefined;

  if (dict && key in dict) {
    rawText = dict[key];
  } else if (customFallback !== undefined) {
    rawText = customFallback;
  } else if (translations.vi && key in translations.vi) {
    // Fallback to Vietnamese dictionary
    rawText = translations.vi[key];
  } else {
    rawText = key;
  }

  return interpolate(rawText, params);
}

/**
 * Aspect mappings for bidirectional conversion between Vietnamese and English.
 */
interface AspectInfo {
  shortVi: string;
  fullVi: string;
  shortEn: string;
  fullEn: string;
  aliasesVi?: string[];
}

const ASPECT_MAP: AspectInfo[] = [
  { shortVi: 'Món ăn', fullVi: 'Món ăn & Hương vị', shortEn: 'Food', fullEn: 'Food & Taste' },
  { shortVi: 'Dịch vụ', fullVi: 'Phục vụ & Thái độ', shortEn: 'Service', fullEn: 'Service Quality', aliasesVi: ['phục vụ', 'phuc vu'] },
  { shortVi: 'Giá cả', fullVi: 'Giá cả & Độ hợp lý', shortEn: 'Price', fullEn: 'Price & Value' },
  { shortVi: 'Không gian', fullVi: 'Không gian & Vị trí', shortEn: 'Ambience', fullEn: 'Ambience & Decor' },
  { shortVi: 'Vị trí', fullVi: 'Vị trí & Địa điểm', shortEn: 'Location', fullEn: 'Location & Access' },
  { shortVi: 'Vệ sinh', fullVi: 'Vệ sinh & An toàn', shortEn: 'Hygiene', fullEn: 'Hygiene & Cleanliness' }
];

/**
 * Translate aspect names between Vietnamese and English.
 * Supports short ('Food', 'Món ăn') and full ('Food & Taste', 'Món ăn & Hương vị').
 */
export function translateAspect(
  aspect: string,
  lang: Language,
  format?: 'short' | 'full'
): string {
  if (!aspect || typeof aspect !== 'string') return aspect;

  const trimmed = aspect.trim();
  const lower = trimmed.toLowerCase();

  const found = ASPECT_MAP.find(
    (item) =>
      item.shortVi.toLowerCase() === lower ||
      item.fullVi.toLowerCase() === lower ||
      item.shortEn.toLowerCase() === lower ||
      item.fullEn.toLowerCase() === lower ||
      (item.aliasesVi && item.aliasesVi.includes(lower))
  );

  if (!found) {
    return aspect;
  }

  if (lang === 'vi') {
    if (format === 'full') {
      return found.fullVi;
    }
    return found.shortVi;
  } else {
    // en
    if (format === 'short' || trimmed === found.shortVi || (found.aliasesVi && found.aliasesVi.includes(lower))) {
      return format === 'full' ? found.fullEn : found.shortEn;
    }
    if (format === 'full' || lower === found.shortVi.toLowerCase() || lower === found.fullVi.toLowerCase()) {
      return found.fullEn;
    }
    return found.shortEn;
  }
}

/**
 * Translate sentiment labels between Vietnamese and English.
 */
export function translateSentiment(sentiment: string, lang: Language): string {
  if (!sentiment || typeof sentiment !== 'string') return sentiment;

  const lower = sentiment.trim().toLowerCase();

  const isPositive = lower === 'positive' || lower === 'tích cực';
  const isNegative = lower === 'negative' || lower === 'tiêu cực';
  const isNeutral = lower === 'neutral' || lower === 'trung lập';

  if (lang === 'vi') {
    if (isPositive) return 'Tích cực';
    if (isNegative) return 'Tiêu cực';
    if (isNeutral) return 'Trung lập';
    return sentiment;
  } else {
    if (isPositive) return 'Positive';
    if (isNegative) return 'Negative';
    if (isNeutral) return 'Neutral';
    return sentiment;
  }
}

export interface SimpleStorage {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
}

/**
 * Resolve initial language from localStorage or fallback to Vietnamese.
 */
export function getInitialLanguage(storage?: SimpleStorage): Language {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (target && typeof target.getItem === 'function') {
      const saved = target.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'vi') {
        return saved;
      }
    }
  } catch {
    // Restricted environment (e.g. sandboxed iframe)
  }
  return 'vi';
}

/**
 * Save selected language to storage safely.
 */
export function saveLanguage(lang: Language, storage?: SimpleStorage): boolean {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (target && typeof target.setItem === 'function') {
      target.setItem(STORAGE_KEY, lang);
      return true;
    }
  } catch {
    // Ignore write errors
  }
  return false;
}
