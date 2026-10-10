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

export const VIETNAM_CITIES: CityDefinition[] = [
  {
    name: 'TP. Hồ Chí Minh',
    aliases: [
      'thanh pho ho chi minh',
      'tp ho chi minh',
      'tp. ho chi minh',
      'ho chi minh',
      'tp.hcm',
      'tp hcm',
      'tphcm',
      'sai gon',
      'sài gòn'
    ]
  },
  {
    name: 'Hà Nội',
    aliases: ['ha noi', 'hà nội', 'thu do ha noi']
  },
  {
    name: 'Đà Nẵng',
    aliases: ['da nang', 'đà nẵng', 'da năng']
  },
  {
    name: 'Hải Phòng',
    aliases: ['hai phong', 'hải phòng']
  },
  {
    name: 'Cần Thơ',
    aliases: ['can tho', 'cần thơ']
  },
  {
    name: 'Bình Dương',
    aliases: ['binh duong', 'bình dương', 'thu dau mot', 'thuan an', 'di an']
  },
  {
    name: 'Đồng Nai',
    aliases: ['dong nai', 'đồng nai', 'bien hoa', 'biên hòa', 'long khanh']
  },
  {
    name: 'Khánh Hòa',
    aliases: ['khanh hoa', 'khánh hòa', 'nha trang', 'cam ranh']
  },
  {
    name: 'Lâm Đồng',
    aliases: ['lam dong', 'lâm đồng', 'da lat', 'đà lạt', 'bao loc']
  },
  {
    name: 'Quảng Nam',
    aliases: ['quang nam', 'quảng nam', 'hoi an', 'hội an', 'tam ky']
  },
  {
    name: 'Thừa Thiên Huế',
    aliases: ['thua thien hue', 'thừa thiên huế', 'tp hue', 'tp huế', 'xứ huế', 'cố đô huế', 'hue', 'huế']
  },
  {
    name: 'Bà Rịa - Vũng Tàu',
    aliases: ['ba ria vung tau', 'bà rịa vũng tàu', 'ba ria - vung tau', 'vung tau', 'vũng tàu', 'ba ria', 'bà rịa']
  },
  {
    name: 'Kiên Giang',
    aliases: ['kien giang', 'kiên giang', 'phu quoc', 'phú quốc', 'rach gia', 'ha tien']
  },
  {
    name: 'Quảng Ninh',
    aliases: ['quang ninh', 'quảng ninh', 'ha long', 'hạ long', 'cam pha', 'uong bi']
  },
  {
    name: 'Ninh Bình',
    aliases: ['ninh binh', 'ninh bình', 'tam diep', 'hoa lu']
  },
  {
    name: 'Nghệ An',
    aliases: ['nghe an', 'nghệ an', 'tp vinh', 'tp. vinh', 'vinh', 'cua lo']
  },
  {
    name: 'Bình Định',
    aliases: ['binh dinh', 'bình định', 'quy nhon', 'quy nhơn', 'an nhon']
  },
  {
    name: 'Đắk Lắk',
    aliases: ['dak lak', 'đắk lắk', 'dac lac', 'đắc lắc', 'buon ma thuot', 'buôn ma thuột']
  },
  {
    name: 'An Giang',
    aliases: ['an giang', 'long xuyen', 'chau doc']
  },
  {
    name: 'Tây Ninh',
    aliases: ['tay ninh', 'tây ninh', 'trang bang']
  },
  {
    name: 'Cà Mau',
    aliases: ['ca mau', 'cà mau', 'nam can']
  },
  {
    name: 'Sóc Trăng',
    aliases: ['soc trang', 'sóc trăng']
  },
  {
    name: 'Bình Thuận',
    aliases: ['binh thuan', 'bình thuận', 'phan thiet', 'phan thiết']
  },
  {
    name: 'Phú Yên',
    aliases: ['phu yen', 'phú yên', 'tuy hoa', 'tuy hòa']
  },
  {
    name: 'Lào Cai',
    aliases: ['lao cai', 'lào cai', 'sa pa', 'sapa']
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
 * Phân tích từ khóa tìm kiếm:
 * - Tách thành phố nếu người dùng gõ địa danh (ví dụ: "đà nẵng", "cơm hà nội", "bánh xèo đà nẵng")
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
    // Trường hợp 1: Từ khóa chính xác là tên thành phố (ví dụ "đà nẵng", "hà nội")
    if (normQuery === normAlias) {
      return {
        detectedCity: cityName,
        remainingKeyword: '',
        isOnlyCity: true,
        originalQuery: trimmed
      };
    }

    // Trường hợp 2: Thành phố nằm trong từ khóa (ví dụ "cơm hà nội", "phở ở đà nẵng", "hà nội cơm gà")
    // Tạo regex tìm alias đứng riêng theo word boundaries
    const escapedAlias = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)(?:o|tai|khu vuc)?\\s*(${escapedAlias})(?:\\s+|$)`, 'i');
    const match = normQuery.match(regex);

    if (match) {
      // Loại bỏ cụm từ thành phố và các từ đệm ("ở", "tại", "khu vực") khỏi query gốc
      const removeRegex = new RegExp(`(?:\\b(?:ở|tai|tại|khu vực|khu vuc|o)\\s+)?${escapedAlias}\\b`, 'gi');
      
      // Xóa trên cả chuỗi đã chuẩn hóa để lấy phần từ khóa món ăn còn lại
      let remaining = normQuery.replace(removeRegex, ' ').replace(/\s+/g, ' ').trim();

      // Nếu còn lại từ khóa món ăn (ví dụ "cơm", "bánh xèo", "hải sản")
      // Lấy từ khóa tương ứng từ chuỗi gốc nếu có
      if (!remaining) {
        return {
          detectedCity: cityName,
          remainingKeyword: '',
          isOnlyCity: true,
          originalQuery: trimmed
        };
      }

      // Trích xuất các từ món ăn từ query gốc
      const wordsInOriginal = trimmed.split(/\s+/);
      const filteredWords = wordsInOriginal.filter((w) => {
        const normW = removeVietnameseAccents(w).toLowerCase();
        return !normAlias.includes(normW) && !['ở', 'tai', 'tại', 'o', 'khu', 'vực', 'vuc'].includes(normW);
      });

      const cleanRemaining = filteredWords.join(' ').trim() || remaining;

      return {
        detectedCity: cityName,
        remainingKeyword: cleanRemaining,
        isOnlyCity: false,
        originalQuery: trimmed
      };
    }
  }

  // Không chứa thành phố nào -> Đây là từ khóa món ăn hoặc tên quán
  return {
    detectedCity: null,
    remainingKeyword: trimmed,
    isOnlyCity: false,
    originalQuery: trimmed
  };
}

/**
 * Kiểm tra xem một quán ăn có thuộc về thành phố được chỉ định hay không
 */
export function isRestaurantInCity(restaurant: Restaurant, targetCity: string): boolean {
  if (!targetCity || targetCity === 'Tất cả địa điểm' || targetCity === 'All Cities') {
    return true;
  }

  const normTarget = removeVietnameseAccents(targetCity).toLowerCase();
  const normResCity = removeVietnameseAccents(restaurant.city || '').toLowerCase();

  // Khớp chính xác tên thành phố
  if (normResCity === normTarget || normResCity.includes(normTarget) || normTarget.includes(normResCity)) {
    return true;
  }

  // Kiểm tra thêm địa chỉ quán ăn
  const normAddr = removeVietnameseAccents(restaurant.address || '').toLowerCase();
  
  // Tìm city def tương ứng để kiểm tra các quận/huyện/alias của thành phố đó
  const cityDef = VIETNAM_CITIES.find(
    (c) => removeVietnameseAccents(c.name).toLowerCase() === normTarget
  );

  if (cityDef) {
    return cityDef.aliases.some((alias) => {
      const normAlias = removeVietnameseAccents(alias).toLowerCase();
      return normAddr.includes(normAlias);
    });
  }

  return normAddr.includes(normTarget);
}

/**
 * Kiểm tra xem quán ăn có khớp với từ khóa món ăn / tên quán hay không
 * Sử dụng so khớp cụm từ (phrase match) và so khớp từ hoàn chỉnh (word match),
 * loại trừ triệt để false positive từ việc so khớp chuỗi con bừa bãi trong review.
 */
export function matchesRestaurantKeyword(restaurant: Restaurant, keyword: string): boolean {
  const cleanKeyword = (keyword || '').trim();
  if (!cleanKeyword) return true;

  const rawQ = cleanKeyword.toLowerCase();
  const normQ = removeVietnameseAccents(cleanKeyword).toLowerCase();

  // 1. So khớp tên quán & thương hiệu (Ưu tiên cao nhất)
  const nameRaw = (restaurant.name + ' ' + (restaurant.brand || '')).toLowerCase();
  const nameNorm = removeVietnameseAccents(nameRaw);
  if (nameRaw.includes(rawQ) || nameNorm.includes(normQ)) {
    return true;
  }

  // 2. So khớp loại hình ẩm thực (Cuisine / Category)
  const cuisineRaw = ((restaurant.cuisine || '') + ' ' + (restaurant.cuisineCategory || '')).toLowerCase();
  const cuisineNorm = removeVietnameseAccents(cuisineRaw);
  if (cuisineRaw.includes(rawQ) || cuisineNorm.includes(normQ)) {
    return true;
  }

  // 3. So khớp từ khóa đặc trưng khía cạnh (aspects sample keywords)
  const keywordsRaw = (restaurant.aspects?.flatMap((a) => a.sampleKeywords) || []).join(' ').toLowerCase();
  const keywordsNorm = removeVietnameseAccents(keywordsRaw);
  if (keywordsRaw.includes(rawQ) || keywordsNorm.includes(normQ)) {
    return true;
  }

  // 4. So khớp theo các từ đơn lẻ (Token match) trên Tên & Ẩm thực
  const coreSearchableNorm = `${nameNorm} ${cuisineNorm} ${keywordsNorm}`;
  const coreWords = new Set(coreSearchableNorm.split(/[\s,./\-+()]+/).filter((w) => w.length > 0));

  const queryTokens = normQ.split(/\s+/).filter((t) => t.length >= 2);
  if (queryTokens.length > 0) {
    const allTokensInCore = queryTokens.every((tok) => {
      // Khớp từ chính xác hoặc từ bắt đầu bằng token
      return coreWords.has(tok) || Array.from(coreWords).some((w) => w.startsWith(tok));
    });
    if (allTokensInCore) {
      return true;
    }
  }

  // 5. So khớp địa chỉ cụ thể (tên đường / phường)
  const addrNorm = removeVietnameseAccents(restaurant.address || '').toLowerCase();
  if (addrNorm.includes(normQ)) {
    return true;
  }

  // 6. So khớp review: CHỈ khi nguyên cụm từ món ăn (phrase match) xuất hiện trong review
  if (cleanKeyword.length >= 3 && restaurant.reviews && restaurant.reviews.length > 0) {
    const hasPhraseInReviews = restaurant.reviews.some((r) => {
      const rNorm = removeVietnameseAccents(r.text || '').toLowerCase();
      return rNorm.includes(normQ);
    });
    if (hasPhraseInReviews) {
      return true;
    }
  }

  return false;
}
