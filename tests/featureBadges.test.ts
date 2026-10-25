import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFeatureNew, FEATURE_REGISTRY } from '../src/utils/featureBadges.ts';

describe('featureBadges - Quản lý thời hạn hiển thị nhãn MỚI', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  it('đăng ký mặc định tính năng ai-assistant-tab có thời hạn hợp lệ', () => {
    const config = FEATURE_REGISTRY['ai-assistant-tab'];
    assert.ok(config);
    assert.equal(config.id, 'ai-assistant-tab');
    assert.equal(config.releaseDate, '2026-10-24');
    assert.ok(config.durationDays && config.durationDays >= 1 && config.durationDays <= 15);
  });

  it('trả về true khi tính năng mới ra mắt trong vòng 1-15 ngày', () => {
    const releaseTime = new Date('2026-10-24T00:00:00Z').getTime();

    // 1 ngày sau khi ra mắt -> Còn mới
    const day1 = releaseTime + 1 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('ai-assistant-tab', { releaseDate: '2026-10-24', durationDays: 15 }, day1),
      true
    );

    // 10 ngày sau khi ra mắt -> Còn mới
    const day10 = releaseTime + 10 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('ai-assistant-tab', { releaseDate: '2026-10-24', durationDays: 15 }, day10),
      true
    );

    // Đúng mốc ngày thứ 15 -> Vẫn còn mới
    const day15 = releaseTime + 15 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('ai-assistant-tab', { releaseDate: '2026-10-24', durationDays: 15 }, day15),
      true
    );
  });

  it('tự động biến mất (trả về false) khi đã quá thời hạn 15 ngày', () => {
    const releaseTime = new Date('2026-10-24T00:00:00Z').getTime();

    // Ngày thứ 16 -> Đã hết hạn, nhãn tự động ẩn
    const day16 = releaseTime + 16 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('ai-assistant-tab', { releaseDate: '2026-10-24', durationDays: 15 }, day16),
      false
    );

    // Ngày thứ 30 -> Hết hạn
    const day30 = releaseTime + 30 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('ai-assistant-tab', { releaseDate: '2026-10-24', durationDays: 15 }, day30),
      false
    );
  });

  it('hỗ trợ tùy biến khoảng thời gian linh hoạt (ví dụ chỉ 3 ngày hoặc 7 ngày)', () => {
    const releaseTime = new Date('2026-10-20T00:00:00Z').getTime();

    // Cấu hình nhãn chỉ tồn tại 3 ngày
    const day2 = releaseTime + 2 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('quick-feature', { releaseDate: '2026-10-20', durationDays: 3 }, day2),
      true
    );

    const day4 = releaseTime + 4 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('quick-feature', { releaseDate: '2026-10-20', durationDays: 3 }, day4),
      false
    );
  });

  it('trả về false nếu ngày hiện tại trước ngày phát hành (tương lai)', () => {
    const releaseTime = new Date('2026-10-24T00:00:00Z').getTime();
    const beforeRelease = releaseTime - 2 * ONE_DAY_MS;
    assert.equal(
      isFeatureNew('ai-assistant-tab', { releaseDate: '2026-10-24', durationDays: 15 }, beforeRelease),
      false
    );
  });

  it('xử lý an toàn khi releaseDate không hợp lệ', () => {
    assert.equal(
      isFeatureNew('unknown-feature', { releaseDate: 'invalid-date' }),
      false
    );
  });
});
