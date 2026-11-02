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
  displayName?: string;
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
    displayName: 'TP. Hồ Chí Minh',
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
    displayName: 'Hà Nội',
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
    displayName: 'Đà Nẵng',
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
    displayName: 'Hải Phòng',
    aliases: [
      'hai phong',
      'hải phòng',
      'tp hai phong',
      'tp hải phòng',
      'do son',
      'đồ sơn',
      'cat ba',
      'cát bà'
    ]
  },
  {
    name: 'Cần Thơ',
    displayName: 'Cần Thơ',
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
    displayName: 'Bắc Ninh',
    aliases: ['bac ninh', 'bắc ninh', 'tp bac ninh', 'tp bắc ninh', 'tu son', 'từ sơn']
  },
  {
    name: 'Hà Nam',
    displayName: 'Hà Nam',
    aliases: ['ha nam', 'hà nam', 'phu ly', 'phủ lý', 'duy tien', 'duy tiên']
  },
  {
    name: 'Hải Dương',
    displayName: 'Hải Dương',
    aliases: ['hai duong', 'hải dương', 'chi linh', 'chí linh', 'kinh mon', 'kinh môn']
  },
  {
    name: 'Hưng Yên',
    displayName: 'Hưng Yên',
    aliases: ['hung yen', 'hưng yên', 'my hao', 'mỹ hào', 'pho hien', 'phố hiến']
  },
  {
    name: 'Nam Định',
    displayName: 'Nam Định',
    aliases: ['nam dinh', 'nam định', 'tp nam dinh', 'tp nam định']
  },
  {
    name: 'Ninh Bình',
    displayName: 'Ninh Bình',
    aliases: ['ninh binh', 'ninh bình', 'tam diep', 'tam điệp', 'hoa lu', 'hoa lư', 'trang an', 'tràng an']
  },
  {
    name: 'Thái Bình',
    displayName: 'Thái Bình',
    aliases: ['thai binh', 'thái bình', 'tp thai binh', 'tp thái bình']
  },
  {
    name: 'Vĩnh Phúc',
    displayName: 'Vĩnh Phúc',
    aliases: ['vinh phuc', 'vĩnh phúc', 'vinh yen', 'vĩnh yên', 'phuc yen', 'phúc yên', 'tam dao', 'tam đảo']
  },

  // Đông Bắc Bộ
  {
    name: 'Hà Giang',
    displayName: 'Hà Giang',
    aliases: ['ha giang', 'hà giang', 'dong van', 'đồng văn', 'meo vac', 'mèo vạc', 'lung cu', 'lũng cú']
  },
  {
    name: 'Cao Bằng',
    displayName: 'Cao Bằng',
    aliases: ['cao bang', 'cao bằng', 'trung khanh', 'trùng khánh', 'ban gioc', 'bản giốc']
  },
  {
    name: 'Bắc Kạn',
    displayName: 'Bắc Kạn',
    aliases: ['bac kan', 'bắc kạn', 'bac can', 'bắc cạn', 'ba be', 'ba bể']
  },
  {
    name: 'Tuyên Quang',
    displayName: 'Tuyên Quang',
    aliases: ['tuyen quang', 'tuyên quang', 'tp tuyen quang', 'tp tuyên quang']
  },
  {
    name: 'Lào Cai',
    displayName: 'Lào Cai',
    aliases: ['lao cai', 'lào cai', 'sa pa', 'sapa', 'tp lao cai', 'tp lào cai', 'bac ha', 'bắc hà', 'bat xat', 'bát xát']
  },
  {
    name: 'Yên Bái',
    displayName: 'Yên Bái',
    aliases: ['yen bai', 'yên bái', 'nghia lo', 'nghĩa lộ', 'mu cang chai', 'mù căng chải']
  },
  {
    name: 'Thái Nguyên',
    displayName: 'Thái Nguyên',
    aliases: ['thai nguyen', 'thái nguyên', 'song cong', 'sông công', 'pho yen', 'phổ yên']
  },
  {
    name: 'Lạng Sơn',
    displayName: 'Lạng Sơn',
    aliases: ['lang son', 'lạng sơn', 'dong dang', 'đồng đăng', 'tp lang son', 'tp lạng sơn']
  },
  {
    name: 'Quảng Ninh',
    displayName: 'Quảng Ninh',
    aliases: ['quang ninh', 'quảng ninh', 'ha long', 'hạ long', 'cam pha', 'cẩm phả', 'uong bi', 'uông bí', 'mong cai', 'móng cái', 'van don', 'vân đồn']
  },
  {
    name: 'Phú Thọ',
    displayName: 'Phú Thọ',
    aliases: ['phu tho', 'phú thọ', 'viet tri', 'việt trì', 'den hung', 'đền hùng']
  },
  {
    name: 'Bắc Giang',
    displayName: 'Bắc Giang',
    aliases: ['bac giang', 'bắc giang', 'viet yen', 'việt yên', 'tp bac giang', 'tp bắc giang']
  },

  // Tây Bắc Bộ
  {
    name: 'Điện Biên',
    displayName: 'Điện Biên',
    aliases: ['dien bien', 'điện biên', 'dien bien phu', 'điện biên phủ']
  },
  {
    name: 'Lai Châu',
    displayName: 'Lai Châu',
    aliases: ['lai chau', 'lai châu', 'tp lai chau', 'tp lai châu']
  },
  {
    name: 'Sơn La',
    displayName: 'Sơn La',
    aliases: ['son la', 'sơn la', 'moc chau', 'mộc châu', 'tp son la', 'tp sơn la']
  },
  {
    name: 'Hòa Bình',
    displayName: 'Hòa Bình',
    aliases: ['hoa binh', 'hòa bình', 'mai chau', 'mai châu', 'luong son', 'lương sơn']
  },

  // Bắc Trung Bộ
  {
    name: 'Thanh Hóa',
    displayName: 'Thanh Hóa',
    aliases: ['thanh hoa', 'thanh hóa', 'sam son', 'sầm sơn', 'bim son', 'bỉm sơn', 'nghi son', 'nghi sơn', 'tp thanh hoa', 'tp thanh hóa']
  },
  {
    name: 'Nghệ An',
    displayName: 'Nghệ An',
    aliases: ['nghe an', 'nghệ an', 'tp vinh', 'tp. vinh', 'vinh', 'cua lo', 'cửa lò']
  },
  {
    name: 'Hà Tĩnh',
    displayName: 'Hà Tĩnh',
    aliases: ['ha tinh', 'hà tĩnh', 'hong linh', 'hồng lĩnh', 'ky anh', 'kỳ anh', 'tp ha tinh', 'tp hà tĩnh']
  },
  {
    name: 'Quảng Bình',
    displayName: 'Quảng Bình',
    aliases: ['quang binh', 'quảng bình', 'dong hoi', 'đồng hới', 'ba don', 'ba đồn', 'phong nha', 'phong nha ke bang', 'phong nha - kẻ bàng']
  },
  {
    name: 'Quảng Trị',
    displayName: 'Quảng Trị',
    aliases: ['quang tri', 'quảng trị', 'dong ha', 'đông hà', 'thi xa quang tri', 'thị xã quảng trị']
  },
  {
    name: 'Thừa Thiên Huế',
    displayName: 'Thừa Thiên Huế',
    aliases: ['thua thien hue', 'thừa thiên huế', 'tp hue', 'tp huế', 'xứ huế', 'cố đô huế', 'hue', 'huế']
  },

  // Duyên hải Nam Trung Bộ
  {
    name: 'Quảng Nam',
    displayName: 'Quảng Nam',
    aliases: ['quang nam', 'quảng nam', 'hoi an', 'hội an', 'tam ky', 'tam kỳ']
  },
  {
    name: 'Quảng Ngãi',
    displayName: 'Quảng Ngãi',
    aliases: ['quang ngai', 'quảng ngãi', 'tp quang ngai', 'tp quảng ngãi', 'ly son', 'lý sơn']
  },
  {
    name: 'Bình Định',
    displayName: 'Bình Định',
    aliases: ['binh dinh', 'bình định', 'quy nhon', 'quy nhơn', 'an nhon', 'an nhơn']
  },
  {
    name: 'Phú Yên',
    displayName: 'Phú Yên',
    aliases: ['phu yen', 'phú yên', 'tuy hoa', 'tuy hòa', 'song cau', 'sông cầu', 'dong hoa', 'đông hòa']
  },
  {
    name: 'Khánh Hòa',
    displayName: 'Khánh Hòa',
    aliases: ['khanh hoa', 'khánh hòa', 'nha trang', 'cam ranh', 'ninh hoa', 'ninh hòa']
  },
  {
    name: 'Ninh Thuận',
    displayName: 'Ninh Thuận',
    aliases: ['ninh thuan', 'ninh thuận', 'phan rang', 'thap cham', 'tháp chàm']
  },
  {
    name: 'Bình Thuận',
    displayName: 'Bình Thuận',
    aliases: ['binh thuan', 'bình thuận', 'phan thiet', 'phan thiết', 'la gi', 'mũi né', 'mui ne']
  },

  // Tây Nguyên
  {
    name: 'Kon Tum',
    displayName: 'Kon Tum',
    aliases: ['kon tum', 'kontum', 'mang den', 'măng đen', 'tp kon tum', 'tp kontum']
  },
  {
    name: 'Gia Lai',
    displayName: 'Gia Lai',
    aliases: ['gia lai', 'pleiku', 'an khe', 'an khê', 'ayun pa', 'chu prong', 'chư prông']
  },
  {
    name: 'Đắk Lắk',
    displayName: 'Đắk Lắk',
    aliases: ['dak lak', 'đắk lắk', 'dac lac', 'đắc lắc', 'buon ma thuot', 'buôn ma thuột', 'bmt']
  },
  {
    name: 'Đắk Nông',
    displayName: 'Đắk Nông',
    aliases: ['dak nong', 'đắk nông', 'dac nong', 'đắc nông', 'gia nghia', 'gia nghĩa', 'ta dung', 'tà đùng']
  },
  {
    name: 'Lâm Đồng',
    displayName: 'Lâm Đồng',
    aliases: ['lam dong', 'lâm đồng', 'da lat', 'đà lạt', 'bao loc', 'bảo lộc']
  },

  // Đông Nam Bộ
  {
    name: 'Bình Phước',
    displayName: 'Bình Phước',
    aliases: ['binh phuoc', 'bình phước', 'dong xoai', 'đồng xoài', 'binh long', 'bình long', 'phuoc long', 'phước long']
  },
  {
    name: 'Bình Dương',
    displayName: 'Bình Dương',
    aliases: ['binh duong', 'bình dương', 'thu dau mot', 'thủ dầu một', 'thuan an', 'thuận an', 'di an', 'dĩ an']
  },
  {
    name: 'Đồng Nai',
    displayName: 'Đồng Nai',
    aliases: ['dong nai', 'đồng nai', 'bien hoa', 'biên hòa', 'long khanh', 'long khánh']
  },
  {
    name: 'Tây Ninh',
    displayName: 'Tây Ninh',
    aliases: ['tay ninh', 'tây ninh', 'tp tay ninh', 'tp tây ninh', 'trang bang', 'trảng bàng', 'hoa thanh', 'hòa thành']
  },
  {
    name: 'Bà Rịa - Vũng Tàu',
    displayName: 'Bà Rịa - Vũng Tàu',
    aliases: ['ba ria vung tau', 'bà rịa vũng tàu', 'ba ria - vung tau', 'vung tau', 'vũng tàu', 'tp vung tau', 'tp vũng tàu', 'ba ria', 'bà rịa', 'con dao', 'côn đảo']
  },

  // Đồng bằng sông Cửu Long
  {
    name: 'Long An',
    displayName: 'Long An',
    aliases: ['long an', 'tan an', 'tân an', 'kien tuong', 'kiến tường', 'ben luc', 'bến lức']
  },
  {
    name: 'Tiền Giang',
    displayName: 'Tiền Giang',
    aliases: ['tien giang', 'tiền giang', 'my tho', 'mỹ tho', 'go cong', 'gò công', 'cai lay', 'cai lậy']
  },
  {
    name: 'Bến Tre',
    displayName: 'Bến Tre',
    aliases: ['ben tre', 'bến tre', 'tp ben tre', 'tp bến tre', 'ba tri', 'mo cay', 'mỏ cày']
  },
  {
    name: 'Trà Vinh',
    displayName: 'Trà Vinh',
    aliases: ['tra vinh', 'trà vinh', 'tp tra vinh', 'tp trà vinh', 'duyen hai', 'duyên hải']
  },
  {
    name: 'Vĩnh Long',
    displayName: 'Vĩnh Long',
    aliases: ['vinh long', 'vĩnh long', 'tp vinh long', 'tp vĩnh long', 'binh minh', 'bình minh']
  },
  {
    name: 'Đồng Tháp',
    displayName: 'Đồng Tháp',
    aliases: ['dong thap', 'đồng tháp', 'cao lanh', 'cao lãnh', 'sa dec', 'sa đéc', 'hong ngu', 'hồng ngự']
  },
  {
    name: 'An Giang',
    displayName: 'An Giang',
    aliases: ['an giang', 'long xuyen', 'long xuyên', 'chau doc', 'châu đốc', 'tri ton', 'tri tôn']
  },
  {
    name: 'Kiên Giang',
    displayName: 'Kiên Giang',
    aliases: ['kien giang', 'kiên giang', 'phu quoc', 'phú quốc', 'rach gia', 'rạch giá', 'ha tien', 'hà tiên']
  },
  {
    name: 'Hậu Giang',
    displayName: 'Hậu Giang',
    aliases: ['hau giang', 'hậu giang', 'vi thanh', 'vị thanh', 'nga bay', 'ngã bảy']
  },
  {
    name: 'Sóc Trăng',
    displayName: 'Sóc Trăng',
    aliases: ['soc trang', 'sóc trăng', 'tp soc trang', 'tp sóc trăng', 'nga nam', 'ngã năm', 'vinh chau', 'vĩnh châu']
  },
  {
    name: 'Bạc Liêu',
    displayName: 'Bạc Liêu',
    aliases: ['bac lieu', 'bạc liêu', 'tp bac lieu', 'tp bạc liêu', 'gia rai', 'giá rai']
  },
  {
    name: 'Cà Mau',
    displayName: 'Cà Mau',
    aliases: ['ca mau', 'cà mau', 'tp ca mau', 'tp cà mau', 'dat mui', 'đất mũi', 'nam can', 'năm căn']
  }
];

export interface ProminentDestination {
  slug: string;
  name: string;
  province: string;
  displayName: string;
  aliases: string[];
}

/**
 * Danh sách 22 Đô thị ẩm thực & du lịch trọng điểm của Việt Nam
 * Mỗi đô thị được tách thành 1 mục độc lập, có slug riêng và ánh xạ chính xác về tỉnh quản lý
 */
export const PROMINENT_DESTINATIONS: ProminentDestination[] = [
  {
    slug: 'da-nang',
    name: 'Đà Nẵng',
    province: 'Đà Nẵng',
    displayName: 'Đà Nẵng',
    aliases: ['da nang', 'đà nẵng', 'da năng', 'tp da nang', 'tp đà nẵng']
  },
  {
    slug: 'ho-chi-minh',
    name: 'TP. Hồ Chí Minh',
    province: 'TP. Hồ Chí Minh',
    displayName: 'TP. Hồ Chí Minh',
    aliases: ['ho chi minh', 'hồ chí minh', 'sai gon', 'sài gòn', 'tphcm', 'tp hcm', 'tp.hcm', 'hcm']
  },
  {
    slug: 'ha-noi',
    name: 'Hà Nội',
    province: 'Hà Nội',
    displayName: 'Hà Nội',
    aliases: ['ha noi', 'hà nội', 'thu do ha noi', 'thủ đô hà nội', 'hn']
  },
  {
    slug: 'hai-phong',
    name: 'Hải Phòng',
    province: 'Hải Phòng',
    displayName: 'Hải Phòng',
    aliases: ['hai phong', 'hải phòng', 'tp hai phong', 'tp hải phòng']
  },
  {
    slug: 'can-tho',
    name: 'Cần Thơ',
    province: 'Cần Thơ',
    displayName: 'Cần Thơ',
    aliases: ['can tho', 'cần thơ', 'tp can tho', 'tp cần thơ', 'ninh kieu', 'ninh kiều']
  },
  {
    slug: 'hue',
    name: 'Huế',
    province: 'Thừa Thiên Huế',
    displayName: 'Tp. Huế (Thừa Thiên Huế)',
    aliases: ['hue', 'huế', 'tp hue', 'tp huế', 'thanh pho hue', 'thành phố huế', 'co do hue', 'cố đô huế', 'xứ huế']
  },
  {
    slug: 'hoi-an',
    name: 'Hội An',
    province: 'Quảng Nam',
    displayName: 'Tp. Hội An (Quảng Nam)',
    aliases: ['hoi an', 'hội an', 'tp hoi an', 'tp hội an', 'thanh pho hoi an', 'thành phố hội an', 'pho co hoi an', 'phố cổ hội an']
  },
  {
    slug: 'tam-ky',
    name: 'Tam Kỳ',
    province: 'Quảng Nam',
    displayName: 'Tp. Tam Kỳ (Quảng Nam)',
    aliases: ['tam ky', 'tam kỳ', 'tp tam ky', 'tp tam kỳ', 'thanh pho tam ky', 'thành phố tam kỳ']
  },
  {
    slug: 'nha-trang',
    name: 'Nha Trang',
    province: 'Khánh Hòa',
    displayName: 'Tp. Nha Trang (Khánh Hòa)',
    aliases: ['nha trang', 'tp nha trang', 'tp. nha trang', 'thanh pho nha trang', 'thành phố nha trang']
  },
  {
    slug: 'cam-ranh',
    name: 'Cam Ranh',
    province: 'Khánh Hòa',
    displayName: 'Tp. Cam Ranh (Khánh Hòa)',
    aliases: ['cam ranh', 'tp cam ranh', 'thanh pho cam ranh', 'thành phố cam ranh']
  },
  {
    slug: 'da-lat',
    name: 'Đà Lạt',
    province: 'Lâm Đồng',
    displayName: 'Tp. Đà Lạt (Lâm Đồng)',
    aliases: ['da lat', 'đà lạt', 'tp da lat', 'tp đà lạt', 'thanh pho da lat', 'thành phố đà lạt']
  },
  {
    slug: 'bao-loc',
    name: 'Bảo Lộc',
    province: 'Lâm Đồng',
    displayName: 'Tp. Bảo Lộc (Lâm Đồng)',
    aliases: ['bao loc', 'bảo lộc', 'tp bao loc', 'tp bảo lộc', 'thanh pho bao loc', 'thành phố bảo lộc']
  },
  {
    slug: 'vung-tau',
    name: 'Vũng Tàu',
    province: 'Bà Rịa - Vũng Tàu',
    displayName: 'Tp. Vũng Tàu (Bà Rịa - Vũng Tàu)',
    aliases: ['vung tau', 'vũng tàu', 'tp vung tau', 'tp vũng tàu', 'thanh pho vung tau', 'thành phố vũng tàu']
  },
  {
    slug: 'con-dao',
    name: 'Côn Đảo',
    province: 'Bà Rịa - Vũng Tàu',
    displayName: 'Côn Đảo (Bà Rịa - Vũng Tàu)',
    aliases: ['con dao', 'côn đảo', 'huyen con dao', 'huyện côn đảo', 'dao con dao']
  },
  {
    slug: 'phu-quoc',
    name: 'Phú Quốc',
    province: 'Kiên Giang',
    displayName: 'Tp. Phú Quốc (Kiên Giang)',
    aliases: ['phu quoc', 'phú quốc', 'tp phu quoc', 'tp phú quốc', 'thanh pho phu quoc', 'thành phố phú quốc', 'dao ngoc']
  },
  {
    slug: 'rach-gia',
    name: 'Rạch Giá',
    province: 'Kiên Giang',
    displayName: 'Tp. Rạch Giá (Kiên Giang)',
    aliases: ['rach gia', 'rạch giá', 'tp rach gia', 'tp rạch giá', 'thanh pho rach gia', 'thành phố rach gia']
  },
  {
    slug: 'ha-long',
    name: 'Hạ Long',
    province: 'Quảng Ninh',
    displayName: 'Tp. Hạ Long (Quảng Ninh)',
    aliases: ['ha long', 'hạ long', 'tp ha long', 'tp hạ long', 'thanh pho ha long', 'thành phố hạ long', 'vinh ha long']
  },
  {
    slug: 'cam-pha',
    name: 'Cẩm Phả',
    province: 'Quảng Ninh',
    displayName: 'Tp. Cẩm Phả (Quảng Ninh)',
    aliases: ['cam pha', 'cẩm phả', 'tp cam pha', 'tp cẩm phả', 'thanh pho cam pha', 'thành phố cẩm phả']
  },
  {
    slug: 'phan-thiet',
    name: 'Phan Thiết',
    province: 'Bình Thuận',
    displayName: 'Tp. Phan Thiết (Bình Thuận)',
    aliases: ['phan thiet', 'phan thiết', 'tp phan thiet', 'tp phan thiết', 'thanh pho phan thiet', 'thành phố phan thiết']
  },
  {
    slug: 'mui-ne',
    name: 'Mũi Né',
    province: 'Bình Thuận',
    displayName: 'Mũi Né (Bình Thuận)',
    aliases: ['mui ne', 'mũi né', 'phuong mui ne', 'phường mũi né']
  },
  {
    slug: 'sa-pa',
    name: 'Sa Pa',
    province: 'Lào Cai',
    displayName: 'Thị xã Sa Pa (Lào Cai)',
    aliases: ['sa pa', 'sapa', 'thi xa sa pa', 'thị xã sa pa', 'tx sa pa', 'tx. sa pa']
  },
  {
    slug: 'buon-ma-thuot',
    name: 'Buôn Ma Thuột',
    province: 'Đắk Lắk',
    displayName: 'Tp. Buôn Ma Thuột (Đắk Lắk)',
    aliases: ['buon ma thuot', 'buôn ma thuột', 'bmt', 'tp buon ma thuot', 'tp buôn ma thuột', 'thanh pho buon ma thuot', 'thành phố buôn ma thuột']
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

  // Sắp xếp các thành phố và đô thị theo độ dài alias giảm dần (match cụm từ dài nhất trước)
  const flattenedAliases: { cityName: string; alias: string; normAlias: string }[] = [];
  for (const dest of PROMINENT_DESTINATIONS) {
    for (const a of dest.aliases) {
      flattenedAliases.push({
        cityName: dest.name,
        alias: a,
        normAlias: removeVietnameseAccents(a).toLowerCase()
      });
    }
  }
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

  const normTarget = removeVietnameseAccents(targetCity).toLowerCase().trim();
  const normAddr = removeVietnameseAccents(restaurant.address || '').toLowerCase();
  const resCityRaw = restaurant.city || '';
  const normResCity = removeVietnameseAccents(resCityRaw).toLowerCase().trim();

  // 1. Kiểm tra xem targetCity có tương ứng với một PROMINENT_DESTINATIONS không
  const targetDest = PROMINENT_DESTINATIONS.find(
    (d) =>
      d.slug === targetCity ||
      removeVietnameseAccents(d.slug).toLowerCase() === normTarget ||
      removeVietnameseAccents(d.name).toLowerCase() === normTarget ||
      removeVietnameseAccents(d.displayName).toLowerCase() === normTarget ||
      d.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normTarget)
  );

  if (targetDest) {
    const normDestName = removeVietnameseAccents(targetDest.name).toLowerCase();
    const normProvince = removeVietnameseAccents(targetDest.province).toLowerCase();

    // A. Quán ghi trực tiếp tên đô thị này ở trường city (ví dụ city = 'Hội An', 'Nha Trang')
    if (normResCity === normDestName || targetDest.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normResCity)) {
      return true;
    }

    // B. Trường hợp đô thị là thành phố trực thuộc TW (Đà Nẵng, Hà Nội, TP.HCM,...)
    if (normDestName === normProvince && normResCity === normProvince) {
      return true;
    }

    // C. Quán ghi tên tỉnh ở trường city hoặc Toàn quốc -> kiểm tra trên địa chỉ theo alias đô thị
    if (normResCity === normProvince || !resCityRaw || resCityRaw === 'Toàn quốc' || resCityRaw === 'Tất cả địa điểm') {
      const isMatchedInAddr = targetDest.aliases.some((alias) => {
        const normAlias = removeVietnameseAccents(alias).toLowerCase();
        const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|\\s|,|-)${escaped}(?:$|\\s|,|-)`, 'i');
        return regex.test(normAddr);
      });
      if (isMatchedInAddr) return true;
    }

    // D. Kiểm tra tên quán có chứa tên đô thị nếu chưa xác định city
    if (!resCityRaw || resCityRaw === 'Toàn quốc') {
      const normName = removeVietnameseAccents(restaurant.name || '').toLowerCase();
      if (normName.includes(normDestName)) return true;
    }

    return false;
  }

  // 2. targetCity là Tỉnh / Thành phố trong VIETNAM_CITIES (ví dụ: "Quảng Nam", "Khánh Hòa")
  const targetDef = VIETNAM_CITIES.find(
    (c) =>
      getCitySlug(c.name) === targetCity ||
      removeVietnameseAccents(c.name).toLowerCase() === normTarget ||
      c.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normTarget)
  );

  if (targetDef) {
    const normTargetDefName = removeVietnameseAccents(targetDef.name).toLowerCase();

    // A. Quán có city xác định
    if (normResCity && normResCity !== 'toan quoc' && normResCity !== 'tat ca dia diem') {
      if (normResCity === normTargetDefName) return true;

      // Quán ghi tên đô thị con trực thuộc tỉnh này (ví dụ quán ghi 'Hội An' thuộc tỉnh 'Quảng Nam')
      const destOfCity = PROMINENT_DESTINATIONS.find(
        (d) =>
          removeVietnameseAccents(d.name).toLowerCase() === normResCity ||
          d.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normResCity)
      );
      if (destOfCity && removeVietnameseAccents(destOfCity.province).toLowerCase() === normTargetDefName) {
        return true;
      }

      // Check qua aliases của tỉnh
      const resDef = VIETNAM_CITIES.find(
        (c) =>
          removeVietnameseAccents(c.name).toLowerCase() === normResCity ||
          c.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === normResCity)
      );
      if (resDef && resDef.name === targetDef.name) {
        return true;
      }

      return false;
    }

    // B. Quán chưa có city hoặc Toàn quốc -> kiểm tra trên địa chỉ theo aliases của tỉnh
    return targetDef.aliases.some((alias) => {
      const normAlias = removeVietnameseAccents(alias).toLowerCase();
      const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s|,|-)${escaped}(?:$|\\s|,|-)`, 'i');
      return regex.test(normAddr);
    });
  }

  // 3. Fallback chuỗi đơn thuần
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

  // 1. Kiểm tra chính xác theo PROMINENT_DESTINATIONS
  const matchedDest = PROMINENT_DESTINATIONS.find(
    (d) =>
      d.slug === norm ||
      removeVietnameseAccents(d.name).toLowerCase() === norm ||
      removeVietnameseAccents(d.displayName).toLowerCase() === norm ||
      d.aliases.some((a) => removeVietnameseAccents(a).toLowerCase() === norm)
  );
  if (matchedDest) {
    return matchedDest.slug;
  }

  // 2. Kiểm tra các đô thị cụ thể trước (tránh bị nuốt bởi tên tỉnh)
  if (norm.includes('hoi an')) return 'hoi-an';
  if (norm.includes('tam ky')) return 'tam-ky';
  if (norm.includes('nha trang')) return 'nha-trang';
  if (norm.includes('cam ranh')) return 'cam-ranh';
  if (norm.includes('da lat')) return 'da-lat';
  if (norm.includes('bao loc')) return 'bao-loc';
  if (norm.includes('con dao')) return 'con-dao';
  if (norm.includes('vung tau')) return 'vung-tau';
  if (norm.includes('phu quoc')) return 'phu-quoc';
  if (norm.includes('rach gia')) return 'rach-gia';
  if (norm.includes('ha long')) return 'ha-long';
  if (norm.includes('cam pha')) return 'cam-pha';
  if (norm.includes('phan thiet')) return 'phan-thiet';
  if (norm.includes('mui ne')) return 'mui-ne';
  if (norm.includes('sa pa') || norm === 'sapa') return 'sa-pa';
  if (norm.includes('buon ma thuot') || norm === 'bmt') return 'buon-ma-thuot';
  if (norm.includes('hue') && !norm.includes('thua thien')) return 'hue';

  // 3. 5 Thành phố trực thuộc Trung ương
  if (norm.includes('ho chi minh') || norm.includes('sai gon') || norm === 'hcm') return 'ho-chi-minh';
  if (norm.includes('ha noi') || norm === 'hn') return 'ha-noi';
  if (norm.includes('da nang')) return 'da-nang';
  if (norm.includes('hai phong')) return 'hai-phong';
  if (norm.includes('can tho')) return 'can-tho';

  // 4. Các tỉnh
  if (norm.includes('khanh hoa')) return 'khanh-hoa';
  if (norm.includes('thua thien')) return 'thua-thien-hue';
  if (norm.includes('lam dong')) return 'lam-dong';
  if (norm.includes('ba ria')) return 'ba-ria-vung-tau';
  if (norm.includes('quang nam')) return 'quang-nam';
  if (norm.includes('kien giang')) return 'kien-giang';
  if (norm.includes('quang ninh')) return 'quang-ninh';
  if (norm.includes('binh thuan')) return 'binh-thuan';
  if (norm.includes('lao cai')) return 'lao-cai';
  if (norm.includes('dak lak') || norm.includes('dac lac')) return 'dak-lak';
  if (norm.includes('binh duong')) return 'binh-duong';
  if (norm.includes('dong nai')) return 'dong-nai';

  return norm.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

