import type { Restaurant } from '../types/restaurant';

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

export interface CityDefinition {
  name: string;
  aliases: string[];
}

/**
 * Danh mục đầy đủ 63 tỉnh/thành phố của Việt Nam kèm các alias thông dụng
 * (tên không dấu, tên thành phố trực thuộc, tên quận/huyện/thị xã đặc trưng)
 */
export const VIETNAM_CITIES: CityDefinition[] = [
  // 5 Thành phố trực thuộc Trung ương
  {
    name: 'TP. Hồ Chí Minh',
    aliases: [
      'thanh pho ho chi minh',
      'thành phố hồ chí minh',
      'tp ho chi minh',
      'tp. ho chi minh',
      'ho chi minh',
      'hồ chí minh',
      'tp.hcm',
      'tp hcm',
      'tphcm',
      'sai gon',
      'sài gòn',
      'hcm'
    ]
  },
  {
    name: 'Hà Nội',
    aliases: [
      'ha noi',
      'hà nội',
      'thu do ha noi',
      'thủ đô hà nội',
      'hn'
    ]
  },
  {
    name: 'Đà Nẵng',
    aliases: [
      'da nang',
      'đà nẵng',
      'da năng',
      'tp da nang',
      'tp đà nẵng'
    ]
  },
  {
    name: 'Hải Phòng',
    aliases: [
      'hai phong',
      'hải phòng',
      'tp hai phong',
      'tp hải phòng'
    ]
  },
  {
    name: 'Cần Thơ',
    aliases: [
      'can tho',
      'cần thơ',
      'tp can tho',
      'tp cần thơ',
      'ninh kieu',
      'ninh kiều'
    ]
  },

  // Đồng bằng sông Hồng
  {
    name: 'Bắc Ninh',
    aliases: ['bac ninh', 'bắc ninh', 'tu son', 'từ sơn']
  },
  {
    name: 'Hà Nam',
    aliases: ['ha nam', 'hà nam', 'phu ly', 'phủ lý', 'duy tien', 'duy tiên']
  },
  {
    name: 'Hải Dương',
    aliases: ['hai duong', 'hải dương', 'chi linh', 'chí linh', 'kinh mon', 'kinh môn']
  },
  {
    name: 'Hưng Yên',
    aliases: ['hung yen', 'hưng yên', 'my hao', 'mỹ hào']
  },
  {
    name: 'Nam Định',
    aliases: ['nam dinh', 'nam định']
  },
  {
    name: 'Ninh Bình',
    aliases: ['ninh binh', 'ninh bình', 'tam diep', 'tam điệp', 'hoa lu', 'hoa lư', 'trang an', 'tràng an']
  },
  {
    name: 'Thái Bình',
    aliases: ['thai binh', 'thái bình']
  },
  {
    name: 'Vĩnh Phúc',
    aliases: ['vinh phuc', 'vĩnh phúc', 'vinh yen', 'vĩnh yên', 'phuc yen', 'phúc yên', 'tam dao', 'tam đảo']
  },

  // Đông Bắc Bộ
  {
    name: 'Hà Giang',
    aliases: ['ha giang', 'hà giang', 'dong van', 'đồng văn', 'meo vac', 'mèo vạc']
  },
  {
    name: 'Cao Bằng',
    aliases: ['cao bang', 'cao bằng', 'trung khanh', 'trùng khánh']
  },
  {
    name: 'Bắc Kạn',
    aliases: ['bac kan', 'bắc kạn', 'bac can', 'bắc cạn']
  },
  {
    name: 'Tuyên Quang',
    aliases: ['tuyen quang', 'tuyên quang']
  },
  {
    name: 'Lào Cai',
    aliases: ['lao cai', 'lào cai', 'sa pa', 'sapa', 'bac ha', 'bắc hà', 'bat xat', 'bát xát']
  },
  {
    name: 'Yên Bái',
    aliases: ['yen bai', 'yên bái', 'nghia lo', 'nghĩa lộ', 'mu cang chai', 'mù căng chải']
  },
  {
    name: 'Thái Nguyên',
    aliases: ['thai nguyen', 'thái nguyên', 'song cong', 'sông công', 'pho yen', 'phổ yên']
  },
  {
    name: 'Lạng Sơn',
    aliases: ['lang son', 'lạng sơn', 'dong dang', 'đồng đăng']
  },
  {
    name: 'Quảng Ninh',
    aliases: ['quang ninh', 'quảng ninh', 'ha long', 'hạ long', 'cam pha', 'cẩm phả', 'uong bi', 'uông bí', 'mong cai', 'móng cái']
  },
  {
    name: 'Phú Thọ',
    aliases: ['phu tho', 'phú thọ', 'viet tri', 'việt trì']
  },
  {
    name: 'Bắc Giang',
    aliases: ['bac giang', 'bắc giang', 'viet yen', 'việt yên']
  },

  // Tây Bắc Bộ
  {
    name: 'Điện Biên',
    aliases: ['dien bien', 'điện biên', 'dien bien phu', 'điện biên phủ']
  },
  {
    name: 'Lai Châu',
    aliases: ['lai chau', 'lai châu']
  },
  {
    name: 'Sơn La',
    aliases: ['son la', 'sơn la', 'moc chau', 'mộc châu']
  },
  {
    name: 'Hòa Bình',
    aliases: ['hoa binh', 'hòa bình', 'mai chau', 'mai châu', 'luong son', 'lương sơn']
  },

  // Bắc Trung Bộ
  {
    name: 'Thanh Hóa',
    aliases: ['thanh hoa', 'thanh hóa', 'sam son', 'sầm sơn', 'bim son', 'bỉm sơn', 'nghi son', 'nghi sơn']
  },
  {
    name: 'Nghệ An',
    aliases: ['nghe an', 'nghệ an', 'tp vinh', 'tp. vinh', 'vinh', 'cua lo', 'cửa lò']
  },
  {
    name: 'Hà Tĩnh',
    aliases: ['ha tinh', 'hà tĩnh', 'hong linh', 'hồng lĩnh', 'ky anh', 'kỳ anh']
  },
  {
    name: 'Quảng Bình',
    aliases: ['quang binh', 'quảng bình', 'dong hoi', 'đồng hới', 'ba don', 'ba đồn', 'phong nha']
  },
  {
    name: 'Quảng Trị',
    aliases: ['quang tri', 'quảng trị', 'dong ha', 'đông hà']
  },
  {
    name: 'Thừa Thiên Huế',
    aliases: ['thua thien hue', 'thừa thiên huế', 'tp hue', 'tp huế', 'xứ huế', 'cố đô huế', 'hue', 'huế']
  },

  // Duyên hải Nam Trung Bộ
  {
    name: 'Quảng Nam',
    aliases: ['quang nam', 'quảng nam', 'hoi an', 'hội an', 'tam ky', 'tam kỳ']
  },
  {
    name: 'Quảng Ngãi',
    aliases: ['quang ngai', 'quảng ngãi']
  },
  {
    name: 'Bình Định',
    aliases: ['binh dinh', 'bình định', 'quy nhon', 'quy nhơn', 'an nhon', 'an nhơn']
  },
  {
    name: 'Phú Yên',
    aliases: ['phu yen', 'phú yên', 'tuy hoa', 'tuy hòa', 'song cau', 'sông cầu', 'dong hoa', 'đông hòa']
  },
  {
    name: 'Khánh Hòa',
    aliases: ['khanh hoa', 'khánh hòa', 'nha trang', 'cam ranh', 'ninh hoa', 'ninh hòa']
  },
  {
    name: 'Ninh Thuận',
    aliases: ['ninh thuan', 'ninh thuận', 'phan rang', 'thap cham', 'tháp chàm']
  },
  {
    name: 'Bình Thuận',
    aliases: ['binh thuan', 'bình thuận', 'phan thiet', 'phan thiết', 'la gi', 'mũi né', 'mui ne']
  },

  // Tây Nguyên
  {
    name: 'Kon Tum',
    aliases: ['kon tum', 'kontum', 'mang den', 'măng đen']
  },
  {
    name: 'Gia Lai',
    aliases: ['gia lai', 'pleiku', 'an khe', 'an khê', 'ayun pa', 'chu prong', 'chư prông']
  },
  {
    name: 'Đắk Lắk',
    aliases: ['dak lak', 'đắk lắk', 'dac lac', 'đắc lắc', 'buon ma thuot', 'buôn ma thuột', 'bmt']
  },
  {
    name: 'Đắk Nông',
    aliases: ['dak nong', 'đắk nông', 'dac nong', 'đắc nông', 'gia nghia', 'gia nghĩa']
  },
  {
    name: 'Lâm Đồng',
    aliases: ['lam dong', 'lâm đồng', 'da lat', 'đà lạt', 'bao loc', 'bảo lộc']
  },

  // Đông Nam Bộ
  {
    name: 'Bình Phước',
    aliases: ['binh phuoc', 'bình phước', 'dong xoai', 'đồng xoài', 'binh long', 'bình long', 'phuoc long', 'phước long']
  },
  {
    name: 'Bình Dương',
    aliases: ['binh duong', 'bình dương', 'thu dau mot', 'thủ dầu một', 'thuan an', 'thuận an', 'di an', 'dĩ an']
  },
  {
    name: 'Đồng Nai',
    aliases: ['dong nai', 'đồng nai', 'bien hoa', 'biên hòa', 'long khanh', 'long khánh']
  },
  {
    name: 'Tây Ninh',
    aliases: ['tay ninh', 'tây ninh', 'trang bang', 'trảng bàng', 'hoa thanh', 'hòa thành']
  },
  {
    name: 'Bà Rịa - Vũng Tàu',
    aliases: ['ba ria vung tau', 'bà rịa vũng tàu', 'ba ria - vung tau', 'vung tau', 'vũng tàu', 'ba ria', 'bà rịa']
  },

  // Đồng bằng sông Cửu Long
  {
    name: 'Long An',
    aliases: ['long an', 'tan an', 'tân an', 'kien tuong', 'kiến tường', 'ben luc', 'bến lức']
  },
  {
    name: 'Tiền Giang',
    aliases: ['tien giang', 'tiền giang', 'my tho', 'mỹ tho', 'go cong', 'gò công', 'cai lay', 'cai lậy']
  },
  {
    name: 'Bến Tre',
    aliases: ['ben tre', 'bến tre', 'ba tri', 'mo cay', 'mỏ cày']
  },
  {
    name: 'Trà Vinh',
    aliases: ['tra vinh', 'trà vinh', 'duyen hai', 'duyên hải']
  },
  {
    name: 'Vĩnh Long',
    aliases: ['vinh long', 'vĩnh long', 'binh minh', 'bình minh']
  },
  {
    name: 'Đồng Tháp',
    aliases: ['dong thap', 'đồng tháp', 'cao lanh', 'cao lãnh', 'sa dec', 'sa đéc', 'hong ngu', 'hồng ngự']
  },
  {
    name: 'An Giang',
    aliases: ['an giang', 'long xuyen', 'long xuyên', 'chau doc', 'châu đốc', 'tri ton', 'tri tôn']
  },
  {
    name: 'Kiên Giang',
    aliases: ['kien giang', 'kiên giang', 'phu quoc', 'phú quốc', 'rach gia', 'rạch giá', 'ha tien', 'hà tiên']
  },
  {
    name: 'Hậu Giang',
    aliases: ['hau giang', 'hậu giang', 'vi thanh', 'vị thanh', 'nga bay', 'ngã bảy']
  },
  {
    name: 'Sóc Trăng',
    aliases: ['soc trang', 'sóc trăng', 'nga nam', 'ngã năm', 'vinh chau', 'vĩnh châu']
  },
  {
    name: 'Bạc Liêu',
    aliases: ['bac lieu', 'bạc liêu', 'gia rai', 'giá rai']
  },
  {
    name: 'Cà Mau',
    aliases: ['ca mau', 'cà mau', 'nam can', 'năm căn']
  }
];

// Danh sách món ăn truyền thống đặc biệt có chứa từ trùng địa danh nhưng bản chất là món ăn
// Nếu người dùng CHỈ gõ món này (không có tiền tố "ở", "tại" hay tên thành phố khác) thì không ép lọc thành phố
const COMPOUND_DISH_NAMES = [
  'bun bo hue',
  'bún bò huế',
  'che hue',
  'chè huế',
  'banh bot loc hue',
  'bánh bột lọc huế',
  'mi quang',
  'mì quảng',
  'banh trang tay ninh',
  'bánh tráng tây ninh',
  'che thai',
  'chè thái'
];

export interface ParsedSearchQuery {
  detectedCity: string | null;
  remainingKeyword: string;
  isOnlyCity: boolean;
  originalQuery: string;
}

/**
 * Danh sách từ khóa đệm/tiền tố nhà hàng thông dụng (stopwords)
 * Loại bỏ để không làm sai lệch bộ lọc món ăn (ví dụ "quán ăn hà nội", "nhà hàng đà nẵng", "quán phở")
 */
export const GENERIC_RESTAURANT_STOPWORDS = [
  'quán ăn', 'quan an', 'quán ngon', 'quan ngon', 'nhà hàng', 'nha hang',
  'quán', 'quan', 'tiệm', 'tiem', 'địa điểm', 'dia diem', 'chỗ ăn', 'cho an',
  'đặc sản', 'dac san', 'món ngon', 'mon ngon', 'ăn ngon', 'an ngon'
];

export function cleanRestaurantStopwords(text: string): string {
  let cleaned = (text || '').trim();
  for (const sw of GENERIC_RESTAURANT_STOPWORDS) {
    const normClean = removeVietnameseAccents(cleaned);
    const normSw = removeVietnameseAccents(sw);
    if (normClean === normSw) {
      return '';
    }
    const escaped = normSw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'gi');
    if (rx.test(normClean)) {
      cleaned = normClean.replace(rx, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return cleaned;
}

/**
 * Phân tích từ khóa tìm kiếm:
 * - Tách thành phố nếu người dùng gõ địa danh (ví dụ: "đà nẵng", "cơm hà nội", "bánh xèo đà nẵng", "phú yên", "gia lai")
 * - Bóc tách từ đệm ("quán ăn", "nhà hàng", "ở", "tại") để giữ lại món ăn cốt lõi (ví dụ "quán phở hà nội" -> món "phở", city "Hà Nội")
 * - Giữ nguyên từ khóa món ăn khi người dùng chỉ gõ món (ví dụ: "cơm gà", "bún bò", "bánh tráng")
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return {
      detectedCity: null,
      remainingKeyword: '',
      isOnlyCity: false,
      originalQuery: ''
    };
  }

  const normQuery = removeVietnameseAccents(trimmed).toLowerCase();

  // Kiểm tra nếu query là món ăn phức hợp nổi tiếng (ví dụ "bún bò huế", "mì quảng") đứng một mình
  const isCompoundDish = COMPOUND_DISH_NAMES.some(
    (dish) => removeVietnameseAccents(dish).toLowerCase() === normQuery
  );
  if (isCompoundDish) {
    return {
      detectedCity: null,
      remainingKeyword: trimmed,
      isOnlyCity: false,
      originalQuery: trimmed
    };
  }

  // Sắp xếp các thành phố theo độ dài alias giảm dần (match cụm từ dài nhất trước)
  const flattenedAliases: { cityName: string; alias: string; normAlias: string }[] = [];
  for (const city of VIETNAM_CITIES) {
    for (const a of city.aliases) {
      flattenedAliases.push({
        cityName: city.name,
        alias: a,
        normAlias: removeVietnameseAccents(a).toLowerCase()
      });
    }
  }
  flattenedAliases.sort((a, b) => b.normAlias.length - a.normAlias.length);

  for (const { cityName, normAlias } of flattenedAliases) {
    // Trường hợp 1: Từ khóa chính xác là tên thành phố (ví dụ "đà nẵng", "hà nội", "phú yên", "gia lai", "lào cai")
    if (normQuery === normAlias) {
      return {
        detectedCity: cityName,
        remainingKeyword: '',
        isOnlyCity: true,
        originalQuery: trimmed
      };
    }

    // Trường hợp 2: Thành phố nằm trong từ khóa (ví dụ "cơm hà nội", "phở ở đà nẵng", "hà nội cơm gà", "bánh hỏi phú yên")
    const escapedAlias = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)(?:o|tai|khu vuc)?\\s*(${escapedAlias})(?:\\s+|$)`, 'i');
    const match = normQuery.match(regex);

    if (match) {
      // Trích xuất các từ món ăn từ query gốc (giữ nguyên dấu)
      const wordsInOriginal = trimmed.split(/\s+/);
      const filteredWords = wordsInOriginal.filter((w) => {
        const normW = removeVietnameseAccents(w).toLowerCase();
        return !normAlias.includes(normW) && !['ở', 'tai', 'tại', 'o', 'khu', 'vực', 'vuc'].includes(normW);
      });

      let cleanRemaining = filteredWords.join(' ').trim();
      cleanRemaining = cleanRestaurantStopwords(cleanRemaining);

      return {
        detectedCity: cityName,
        remainingKeyword: cleanRemaining,
        isOnlyCity: !cleanRemaining,
        originalQuery: trimmed
      };
    }
  }

  // Không chứa thành phố nào -> Kiểm tra loại bỏ stopwords thuần nếu có (ví dụ: "quán ăn ngon")
  const cleanedGeneric = cleanRestaurantStopwords(trimmed);

  return {
    detectedCity: null,
    remainingKeyword: cleanedGeneric || trimmed,
    isOnlyCity: false,
    originalQuery: trimmed
  };
}

/**
 * Kiểm tra xem một quán ăn có thuộc về thành phố được chỉ định hay không.
 * - So khớp chặt chẽ theo danh mục tỉnh/thành phố chuẩn (VIETNAM_CITIES).
 * - Tuyệt đối không cho phép tên đường (VD: "Đường Hải Phòng", "Đường Hà Nội") ở Đà Nẵng làm sai lệch thành phố của quán!
 */
export function isRestaurantInCity(restaurant: Restaurant, targetCity: string): boolean {
  if (!targetCity || targetCity === 'Tất cả địa điểm' || targetCity === 'All Cities') {
    return true;
  }

  const normTarget = removeVietnameseAccents(targetCity).toLowerCase();
  
  // 1. Nếu quán đã có trường city chuẩn từ Backend
  if (restaurant.city && restaurant.city !== 'Toàn quốc' && restaurant.city !== 'Tất cả địa điểm') {
    const normResCity = removeVietnameseAccents(restaurant.city).toLowerCase();
    if (normResCity === normTarget) {
      return true;
    }

    // Tra cứu danh mục chuẩn để đảm bảo tính đồng nhất
    const targetDef = VIETNAM_CITIES.find(
      (c) => removeVietnameseAccents(c.name).toLowerCase() === normTarget ||
             c.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normTarget)
    );
    const resDef = VIETNAM_CITIES.find(
      (c) => removeVietnameseAccents(c.name).toLowerCase() === normResCity ||
             c.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normResCity)
    );

    if (targetDef && resDef) {
      return targetDef.name === resDef.name;
    }

    // Nếu quán đã có thành phố xác định nhưng KHÔNG thuộc targetCity -> trả về false luôn!
    return false;
  }

  // 2. Nếu quán chưa có city hoặc là 'Toàn quốc', kiểm tra trên địa chỉ theo alias có ranh giới từ
  const normAddr = removeVietnameseAccents(restaurant.address || '').toLowerCase();
  const cityDef = VIETNAM_CITIES.find(
    (c) => removeVietnameseAccents(c.name).toLowerCase() === normTarget ||
           c.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normTarget)
  );

  if (cityDef) {
    return cityDef.aliases.some((alias) => {
      const normAlias = removeVietnameseAccents(alias).toLowerCase();
      const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s|,|-)${escaped}(?:$|\\s|,|-)`, 'i');
      return regex.test(normAddr);
    });
  }

  return normAddr.includes(normTarget);
}

/**
 * Kiểm tra xem quán ăn có khớp với từ khóa món ăn / tên quán hay không.
 * Triệt tiêu hoàn toàn rò rỉ kết quả sai:
 * 1. KHÔNG so khớp từ khóa món ăn vào địa chỉ nhà hàng (địa chỉ là vị trí, không phải món ăn).
 * 2. KHÔNG so khớp từ khóa món ăn vào nội dung bình luận khách hàng (tránh việc khách so sánh "hôm qua ăn phở" làm quán bánh tráng hiện ra).
 * 3. Phân biệt rõ "phở" (món ăn) vs "phố" (Hải Sản Phố, Phố Cổ).
 */
export function matchesRestaurantKeyword(restaurant: Restaurant, keyword: string): boolean {
  const cleanKeyword = (keyword || '').trim();
  if (!cleanKeyword) return true;

  const rawQ = cleanKeyword.toLowerCase();
  const normQ = removeVietnameseAccents(cleanKeyword).toLowerCase();
  const hasAccents = rawQ !== normQ;

  // 1. So khớp tên quán & thương hiệu (Ưu tiên cao nhất)
  const nameRaw = (restaurant.name + ' ' + (restaurant.brand || '')).toLowerCase();
  const nameNorm = removeVietnameseAccents(nameRaw);

  // 2. So khớp loại hình ẩm thực (Cuisine / Category)
  const cuisineRaw = ((restaurant.cuisine || '') + ' ' + (restaurant.cuisineCategory || '')).toLowerCase();
  const cuisineNorm = removeVietnameseAccents(cuisineRaw);

  // 3. So khớp từ khóa đặc trưng khía cạnh (aspects sample keywords)
  const keywordsRaw = (restaurant.aspects?.flatMap((a) => a.sampleKeywords) || []).join(' ').toLowerCase();
  const keywordsNorm = removeVietnameseAccents(keywordsRaw);

  // Xử lý loại trừ nghiêm ngặt "phở" vs "phố"
  if (normQ === 'pho' || rawQ === 'phở') {
    const isPhoInNameOrCuisine = (nameRaw + ' ' + cuisineRaw).includes('phở');
    if (!isPhoInNameOrCuisine) {
      return false;
    }
  }

  // A. Trường hợp người dùng gõ từ khóa CÓ DẤU: Bắt buộc khớp có dấu
  if (hasAccents) {
    if (nameRaw.includes(rawQ) || cuisineRaw.includes(rawQ) || keywordsRaw.includes(rawQ)) {
      return true;
    }
    const rawTokens = rawQ.split(/\s+/).filter((t) => t.length >= 2);
    if (rawTokens.length > 0) {
      const coreSearchableRaw = `${nameRaw} ${cuisineRaw} ${keywordsRaw}`;
      if (rawTokens.every((tok) => coreSearchableRaw.includes(tok))) {
        return true;
      }
    }
    return false;
  }

  // B. Trường hợp người dùng gõ KHÔNG DẤU: Khớp linh hoạt trên chuỗi đã bỏ dấu
  if (nameNorm.includes(normQ) || cuisineNorm.includes(normQ) || keywordsNorm.includes(normQ)) {
    return true;
  }

  const normTokens = normQ.split(/\s+/).filter((t) => t.length >= 2);
  if (normTokens.length > 0) {
    const coreSearchableNorm = `${nameNorm} ${cuisineNorm} ${keywordsNorm}`;
    if (normTokens.every((tok) => coreSearchableNorm.includes(tok))) {
      return true;
    }
  }

  return false;
}

/**
 * Chuyển đổi tên tỉnh/thành phố sang slug chuẩn (dùng cho Foody URL / crawler)
 */
export function getCitySlug(cityName: string): string {
  const norm = removeVietnameseAccents(cityName).toLowerCase().trim();
  if (norm.includes('ho chi minh') || norm.includes('sai gon') || norm === 'hcm') return 'ho-chi-minh';
  if (norm.includes('ha noi') || norm === 'hn') return 'ha-noi';
  if (norm.includes('da nang')) return 'da-nang';
  if (norm.includes('hai phong')) return 'hai-phong';
  if (norm.includes('can tho')) return 'can-tho';
  if (norm.includes('nha trang') || norm.includes('khanh hoa')) return 'khanh-hoa';
  if (norm.includes('hue') || norm.includes('thua thien')) return 'hue';
  if (norm.includes('da lat') || norm.includes('lam dong')) return 'lam-dong';
  if (norm.includes('vung tau') || norm.includes('ba ria')) return 'vung-tau';
  if (norm.includes('quang nam') || norm.includes('hoi an')) return 'quang-nam';
  if (norm.includes('phu quoc') || norm.includes('kien giang')) return 'kien-giang';
  if (norm.includes('quang ninh') || norm.includes('ha long')) return 'quang-ninh';
  if (norm.includes('binh duong')) return 'binh-duong';
  if (norm.includes('dong nai')) return 'dong-nai';
  return norm.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

