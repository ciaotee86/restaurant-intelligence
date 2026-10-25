/**
 * Quản lý vòng đời hiển thị của các huy hiệu "MỚI" (New Badges):
 * - Nhãn "MỚI" chỉ nên tồn tại trong một khoảng thời gian giới hạn (ví dụ: 1 đến 15 ngày).
 * - Hỗ trợ cả 2 cơ chế tính thời gian:
 *   1. Dựa trên ngày phát hành tính năng (Release Date - mặc định): tính từ ngày phát hành toàn hệ thống.
 *   2. Dựa trên lần đầu người dùng nhìn thấy (First Seen): lưu timestamp vào localStorage khi người dùng lần đầu truy cập.
 * - Sau khi hết hạn (ví dụ sau 14-15 ngày), nhãn sẽ tự động biến mất mà không cần can thiệp code.
 */

export interface FeatureBadgeConfig {
  /** Mã định danh tính năng */
  id: string;
  /** Ngày phát hành tính năng (ISO YYYY-MM-DD hoặc ISO string) */
  releaseDate?: string;
  /** Thời gian tồn tại tối đa của nhãn (số ngày, mặc định 14 ngày, ví dụ trong khoảng 1-15 ngày) */
  durationDays?: number;
  /** Sử dụng ngày người dùng nhìn thấy lần đầu (localStorage) thay vì ngày phát hành toàn cầu */
  useFirstSeen?: boolean;
}

/**
 * Đăng ký ngày phát hành của các tính năng mới trong hệ thống
 */
export const FEATURE_REGISTRY: Record<string, FeatureBadgeConfig> = {
  'ai-assistant-tab': {
    id: 'ai-assistant-tab',
    releaseDate: '2026-10-24', // Ngày ra mắt tab Trợ lý AI nền tảng
    durationDays: 14, // Nhãn tồn tại tối đa 14 ngày kể từ ngày ra mắt
  },
};

/**
 * Kiểm tra xem một tính năng có còn được coi là "MỚI" hay không.
 *
 * @param featureId Hoặc mã định danh đã đăng ký, hoặc object cấu hình tùy chỉnh
 * @param customConfig Tùy chọn ghi đè cấu hình
 * @param nowTime Tùy chọn truyền thời gian hiện tại để hỗ trợ test
 * @returns boolean true nếu nhãn còn hiệu lực, false nếu đã quá hạn (> durationDays)
 */
export function isFeatureNew(
  featureId: string,
  customConfig?: Partial<FeatureBadgeConfig>,
  nowTime: number = Date.now()
): boolean {
  const baseConfig = FEATURE_REGISTRY[featureId] || { id: featureId };
  const config: FeatureBadgeConfig = {
    ...baseConfig,
    ...customConfig,
  };

  const durationDays = Math.max(1, Math.min(config.durationDays ?? 14, 30));

  // 1. Chế độ tính theo lần đầu người dùng tiếp cận (First-seen per device)
  if (config.useFirstSeen && typeof window !== 'undefined' && window.localStorage) {
    try {
      const storageKey = `ri_feature_badge_${config.id}_first_seen`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        localStorage.setItem(storageKey, String(nowTime));
        return true;
      }
      const firstSeenTime = parseInt(stored, 10);
      if (isNaN(firstSeenTime)) {
        localStorage.setItem(storageKey, String(nowTime));
        return true;
      }
      const daysElapsed = (nowTime - firstSeenTime) / (1000 * 60 * 60 * 24);
      return daysElapsed >= 0 && daysElapsed <= durationDays;
    } catch {
      // Fallback sang releaseDate nếu localStorage bị chặn
    }
  }

  // 2. Chế độ tính theo ngày phát hành tính năng (Release Date)
  if (config.releaseDate) {
    const releaseTime = new Date(config.releaseDate).getTime();
    if (isNaN(releaseTime)) {
      return false;
    }
    const daysElapsed = (nowTime - releaseTime) / (1000 * 60 * 60 * 24);
    // Nhãn hợp lệ từ ngày ra mắt và không vượt quá số ngày quy định (1-15 ngày)
    return daysElapsed >= 0 && daysElapsed <= durationDays;
  }

  // 3. Fallback tự động: nếu không chỉ định releaseDate, sử dụng first-seen
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storageKey = `ri_feature_badge_${config.id}_first_seen`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        localStorage.setItem(storageKey, String(nowTime));
        return true;
      }
      const firstSeenTime = parseInt(stored, 10);
      if (isNaN(firstSeenTime)) {
        localStorage.setItem(storageKey, String(nowTime));
        return true;
      }
      const daysElapsed = (nowTime - firstSeenTime) / (1000 * 60 * 60 * 24);
      return daysElapsed >= 0 && daysElapsed <= durationDays;
    } catch {
      return false;
    }
  }

  return false;
}
