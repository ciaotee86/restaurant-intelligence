import React, { useState } from 'react';
import type { Restaurant, SentimentTimePoint } from '../../types/restaurant';

interface SentimentTrendChartProps {
  restaurant: Restaurant;
}

type TimeRange = '3m' | '6m' | '1y' | 'all';

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ restaurant }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [activePoint, setActivePoint] = useState<SentimentTimePoint | null>(null);

  const data: SentimentTimePoint[] = restaurant.trendData[timeRange] || restaurant.trendData['6m'];

  // Kích thước SVG
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 25, bottom: 35, left: 35 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / 100) * plotHeight;
  };

  const createPath = (key: 'positive' | 'neutral' | 'negative') => {
    if (data.length === 0) return '';
    return data.reduce((acc, pt, i) => {
      const x = getX(i);
      const y = getY(pt[key]);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const positivePath = createPath('positive');
  const neutralPath = createPath('neutral');
  const negativePath = createPath('negative');

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
      {/* Header & Bộ lọc thời gian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
            Xu hướng cảm xúc theo thời gian
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Biến động tỷ lệ đánh giá tích cực, trung lập và tiêu cực qua các tháng
          </p>
        </div>

        {/* Nút lọc thời gian */}
        <div className="inline-flex bg-zinc-100 p-0.5 rounded-md self-start sm:self-auto border border-zinc-200">
          {(['3m', '6m', '1y', 'all'] as TimeRange[]).map((range) => {
            const labels: Record<TimeRange, string> = {
              '3m': '3 tháng',
              '6m': '6 tháng',
              '1y': '1 năm',
              'all': 'Toàn bộ'
            };
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-white text-[#18181B] shadow-2xs font-semibold'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56 select-none overflow-visible"
        >
          {/* Đường lưới */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = getY(val);
            return (
              <g key={`grid-${val}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#F4F4F5"
                  strokeWidth="1"
                  strokeDasharray={val === 0 || val === 100 ? '' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#A1A1AA"
                  className="font-mono"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Đường Tích cực (Xanh lá) */}
          <path
            d={positivePath}
            fill="none"
            stroke="#16A34A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Đường Trung lập (Vàng cam) */}
          <path
            d={neutralPath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Đường Tiêu cực (Đỏ) */}
          <path
            d={negativePath}
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Điểm dữ liệu & tương tác */}
          {data.map((pt, i) => {
            const x = getX(i);
            const isHovered = activePoint?.period === pt.period;
            return (
              <g key={`point-col-${i}`} className="cursor-pointer">
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke="#D4D4D8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Điểm tích cực */}
                <circle
                  cx={x}
                  cy={getY(pt.positive)}
                  r={isHovered ? 5 : 3.5}
                  fill="#16A34A"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Điểm trung lập */}
                <circle
                  cx={x}
                  cy={getY(pt.neutral)}
                  r={isHovered ? 4.5 : 3}
                  fill="#D97706"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Điểm tiêu cực */}
                <circle
                  cx={x}
                  cy={getY(pt.negative)}
                  r={isHovered ? 4.5 : 3}
                  fill="#DC2626"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Nhãn trục X */}
                <text
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill={isHovered ? '#18181B' : '#71717A'}
                  fontWeight={isHovered ? '600' : 'normal'}
                >
                  {pt.period}
                </text>

                {/* Vùng cảm ứng hover */}
                <rect
                  x={x - (plotWidth / data.length) / 2}
                  y={padding.top}
                  width={plotWidth / data.length}
                  height={plotHeight + 25}
                  fill="transparent"
                  onMouseEnter={() => setActivePoint(pt)}
                  onMouseLeave={() => setActivePoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip khi di chuột */}
        {activePoint && (
          <div className="absolute top-2 right-2 bg-zinc-900/90 backdrop-blur-xs text-white p-2.5 rounded text-xs shadow-md border border-zinc-700 pointer-events-none transition-all">
            <div className="font-semibold border-b border-zinc-700 pb-1 mb-1 text-zinc-200">
              {activePoint.period} ({activePoint.totalReviews} đánh giá)
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <span className="text-emerald-400 font-medium">Tích cực: {activePoint.positive}%</span>
              <span className="text-amber-400 font-medium">Trung lập: {activePoint.neutral}%</span>
              <span className="text-red-400 font-medium">Tiêu cực: {activePoint.negative}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Chú thích biểu đồ */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-zinc-100 text-xs text-[#52525B]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-emerald-600 rounded-full" />
          <span>Tích cực</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-amber-500 rounded-full" />
          <span>Trung lập</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-red-600 rounded-full" />
          <span>Tiêu cực</span>
        </div>
      </div>
    </div>
  );
};
