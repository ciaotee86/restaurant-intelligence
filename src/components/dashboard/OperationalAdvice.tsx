import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { ClipboardList, ArrowUpRight } from 'lucide-react';

interface OperationalAdviceProps {
  restaurant: Restaurant;
}

export const OperationalAdvice: React.FC<OperationalAdviceProps> = ({ restaurant }) => {
  if (!restaurant.operationalChecklist || restaurant.operationalChecklist.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-orange-50 text-[#C2410C] flex items-center justify-center">
            <ClipboardList className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
              Đề xuất cải thiện vận hành dành cho quản lý
            </h2>
            <p className="text-xs text-[#71717A]">
              Các bước hành động cụ thể được xây dựng từ quy luật phản hồi của khách hàng
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#C2410C] bg-orange-50 px-2.5 py-1 rounded border border-orange-200">
          Cổng quản lý
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[#71717A]">
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider w-24">Mức ưu tiên</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider w-40">Bộ phận</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Vấn đề ghi nhận</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Tác động vận hành</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Giải pháp đề xuất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {restaurant.operationalChecklist.map((item, idx) => {
              let priorityClass = 'bg-red-50 text-red-700 border-red-200';
              if (item.priority === 'Trung bình') priorityClass = 'bg-amber-50 text-amber-700 border-amber-200';
              if (item.priority === 'Thấp') priorityClass = 'bg-zinc-100 text-zinc-700 border-zinc-200';

              return (
                <tr key={idx} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] border ${priorityClass}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-[#18181B]">
                    {item.area}
                  </td>
                  <td className="py-3 px-3 text-[#52525B]">
                    {item.issue}
                  </td>
                  <td className="py-3 px-3 text-red-700 font-medium">
                    {item.impact}
                  </td>
                  <td className="py-3 px-3 text-[#18181B] bg-orange-50/30 font-medium">
                    <div className="flex items-start gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#C2410C] shrink-0 mt-0.5" />
                      <span>{item.suggestedFix}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
