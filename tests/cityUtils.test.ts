import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROMINENT_DESTINATIONS,
  getCitySlug,
  isRestaurantInCity,
  parseSearchQuery
} from '../src/utils/cityUtils.ts';
import type { Restaurant } from '../src/types/restaurant.ts';

describe('cityUtils - Phương án 2: Đô thị ẩm thực & du lịch trọng điểm', () => {
  it('định nghĩa đầy đủ 22 đô thị trọng điểm trong PROMINENT_DESTINATIONS', () => {
    assert.equal(PROMINENT_DESTINATIONS.length, 22);

    const slugs = PROMINENT_DESTINATIONS.map((d) => d.slug);
    assert.ok(slugs.includes('hoi-an'));
    assert.ok(slugs.includes('tam-ky'));
    assert.ok(slugs.includes('nha-trang'));
    assert.ok(slugs.includes('cam-ranh'));
    assert.ok(slugs.includes('da-lat'));
    assert.ok(slugs.includes('bao-loc'));
    assert.ok(slugs.includes('vung-tau'));
    assert.ok(slugs.includes('con-dao'));
    assert.ok(slugs.includes('phu-quoc'));
    assert.ok(slugs.includes('rach-gia'));
    assert.ok(slugs.includes('ha-long'));
    assert.ok(slugs.includes('cam-pha'));
    assert.ok(slugs.includes('phan-thiet'));
    assert.ok(slugs.includes('mui-ne'));
    assert.ok(slugs.includes('sa-pa'));
    assert.ok(slugs.includes('buon-ma-thuot'));
  });

  it('ánh xạ chính xác slug con trong getCitySlug mà không bị nuốt bởi tên tỉnh', () => {
    assert.equal(getCitySlug('Hội An'), 'hoi-an');
    assert.equal(getCitySlug('Tam Kỳ'), 'tam-ky');
    assert.equal(getCitySlug('Nha Trang'), 'nha-trang');
    assert.equal(getCitySlug('Cam Ranh'), 'cam-ranh');
    assert.equal(getCitySlug('Đà Lạt'), 'da-lat');
    assert.equal(getCitySlug('Bảo Lộc'), 'bao-loc');
    assert.equal(getCitySlug('Côn Đảo'), 'con-dao');
    assert.equal(getCitySlug('Phú Quốc'), 'phu-quoc');
    assert.equal(getCitySlug('Sa Pa'), 'sa-pa');
    assert.equal(getCitySlug('Buôn Ma Thuột'), 'buon-ma-thuot');

    // Tỉnh vẫn giữ slug chuẩn của tỉnh
    assert.equal(getCitySlug('Quảng Nam'), 'quang-nam');
    assert.equal(getCitySlug('Khánh Hòa'), 'khanh-hoa');
    assert.equal(getCitySlug('Lâm Đồng'), 'lam-dong');
  });

  it('isRestaurantInCity nhận diện chính xác đô thị con và quan hệ với tỉnh', () => {
    const hoiAnRestaurant: Restaurant = {
      id: 'res-1',
      name: 'Cơm Gà Bà Buội',
      city: 'Quảng Nam',
      address: '22 Phan Châu Trinh, Phường Minh An, Hội An, Quảng Nam',
      cuisine: 'Cơm gà',
      rating: 4.5,
      reviewCount: 120,
      priceRange: '50k - 100k',
      overallSentiment: { positive: 85, neutral: 10, negative: 5 }
    };

    const tamKyRestaurant: Restaurant = {
      id: 'res-2',
      name: 'Cơm Gà Tam Duyên',
      city: 'Quảng Nam',
      address: '576 Phan Châu Trinh, Phường An Mỹ, Tam Kỳ, Quảng Nam',
      cuisine: 'Cơm gà',
      rating: 4.3,
      reviewCount: 50,
      priceRange: '40k - 80k',
      overallSentiment: { positive: 80, neutral: 15, negative: 5 }
    };

    // Khi lọc theo Hội An
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'Hội An'), true);
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'hoi-an'), true);
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'Tp. Hội An (Quảng Nam)'), true);
    assert.equal(isRestaurantInCity(tamKyRestaurant, 'Hội An'), false);

    // Khi lọc theo Tam Kỳ
    assert.equal(isRestaurantInCity(tamKyRestaurant, 'Tam Kỳ'), true);
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'Tam Kỳ'), false);

    // Khi lọc theo tỉnh Quảng Nam: Cả 2 quán đều hiển thị
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'Quảng Nam'), true);
    assert.equal(isRestaurantInCity(tamKyRestaurant, 'Quảng Nam'), true);

    // Khi lọc theo thành phố khác
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'Đà Nẵng'), false);
    assert.equal(isRestaurantInCity(hoiAnRestaurant, 'Tất cả địa điểm'), true);
  });

  it('parseSearchQuery nhận diện chính xác các đô thị trọng điểm', () => {
    const parsed1 = parseSearchQuery('cơm gà hội an');
    assert.equal(parsed1.detectedCity, 'Hội An');
    assert.equal(parsed1.remainingKeyword, 'cơm gà');

    const parsed2 = parseSearchQuery('hội an');
    assert.equal(parsed2.detectedCity, 'Hội An');
    assert.equal(parsed2.isOnlyCity, true);

    const parsed3 = parseSearchQuery('bún bò huế');
    assert.equal(parsed3.detectedCity, null);
    assert.equal(parsed3.remainingKeyword, 'bún bò huế');
  });
});
