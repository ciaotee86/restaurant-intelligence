"""
Module Quản lý Task Bất Đồng Bộ (Async Task Manager)
Hỗ trợ Background Processing và Real-time Progress Tracking cho Crawler và Gemini Analyzer.

Đặc tính:
- Thread-safe với threading.Lock để đảm bảo an toàn truy xuất đa luồng.
- Bộ nhớ nhẹ (in-memory), dọn dẹp định kỳ sau TTL (mặc định 1 giờ / 3600s) chống rò rỉ RAM cho server 512MB.
- Theo dõi trạng thái tiến trình chi tiết từ 0% đến 100% cho Frontend Polling hoặc Live Status.
"""

import threading
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List


class TaskManager:
    """
    Quản lý hàng đợi và trạng thái các tác vụ cào & phân tích dữ liệu ngầm.
    """

    def __init__(self, ttl_seconds: int = 3600):
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._ttl_seconds = ttl_seconds

    def cleanup_expired_tasks(self, max_age_seconds: Optional[int] = None) -> int:
        """
        Dọn dẹp các task đã hoàn thành hoặc thất bại vượt quá thời gian lưu giữ (TTL).
        Mặc định dọn dẹp các task không hoạt động > 1 giờ (3600 giây).
        """
        max_age = max_age_seconds if max_age_seconds is not None else self._ttl_seconds
        cutoff = time.time() - max_age
        removed_count = 0

        with self._lock:
            expired_ids = [
                task_id
                for task_id, task in self._tasks.items()
                if task.get("_updated_at_ts", 0) < cutoff
            ]
            for task_id in expired_ids:
                del self._tasks[task_id]
                removed_count += 1

        return removed_count

    def create_task(
        self,
        task_type: str = "crawl",
        metadata: Optional[Dict[str, Any]] = None,
        initial_message: str = "Đã tiếp nhận yêu cầu cào dữ liệu."
    ) -> str:
        """
        Khởi tạo một task mới với UUID4 và trạng thái ban đầu là 'pending'.
        """
        # Tự động dọn dẹp task cũ khi tạo mới để tránh phình to bộ nhớ
        self.cleanup_expired_tasks()

        task_id = str(uuid.uuid4())
        now_ts = time.time()
        now_iso = datetime.now().isoformat()

        task_record: Dict[str, Any] = {
            "task_id": task_id,
            "task_type": task_type,
            "status": "pending",  # 'pending' | 'crawling' | 'analyzing' | 'completed' | 'failed'
            "progress": 0,        # 0 -> 100
            "message": initial_message,
            "reviews_count": 0,
            "restaurant_id": None,
            "restaurant": None,
            "error": None,
            "created_at": now_iso,
            "updated_at": now_iso,
            "_created_at_ts": now_ts,
            "_updated_at_ts": now_ts,
            "metadata": metadata or {}
        }

        with self._lock:
            # Ngăn chặn flood request tràn RAM: Giới hạn tối đa 150 tasks in-memory
            if len(self._tasks) >= 150:
                sorted_by_age = sorted(self._tasks.items(), key=lambda kv: kv[1].get("_updated_at_ts", 0))
                for old_id, _ in sorted_by_age[:30]:
                    del self._tasks[old_id]
            self._tasks[task_id] = task_record

        return task_id

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Lấy thông tin chi tiết của task theo task_id.
        Trả về bản sao dữ liệu (loại bỏ các trường timestamp nội bộ có tiền tố '_').
        """
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return None
            return {k: v for k, v in task.items() if not k.startswith("_")}

    def update_task(
        self,
        task_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        reviews_count: Optional[int] = None,
        restaurant_id: Optional[Any] = None,
        restaurant: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Cập nhật trạng thái và tiến trình của một task cụ thể.
        Thread-safe và cập nhật tự động updated_at timestamp.
        """
        now_ts = time.time()
        now_iso = datetime.now().isoformat()

        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False

            if status is not None:
                task["status"] = status
            if progress is not None:
                task["progress"] = max(0, min(100, int(progress)))
            if message is not None:
                task["message"] = str(message)
            if reviews_count is not None:
                task["reviews_count"] = int(reviews_count)
            if restaurant_id is not None:
                task["restaurant_id"] = restaurant_id
            if restaurant is not None:
                task["restaurant"] = restaurant
            if error is not None:
                task["error"] = str(error)
            if metadata is not None:
                if "metadata" not in task or not isinstance(task["metadata"], dict):
                    task["metadata"] = {}
                task["metadata"].update(metadata)

            task["updated_at"] = now_iso
            task["_updated_at_ts"] = now_ts
            return True

    def list_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Liệt kê danh sách các task hiện tại trong bộ nhớ (mới nhất xếp trước)."""
        with self._lock:
            sorted_tasks = sorted(
                self._tasks.values(),
                key=lambda x: x.get("_updated_at_ts", 0),
                reverse=True
            )
            return [
                {k: v for k, v in t.items() if not k.startswith("_")}
                for t in sorted_tasks[:limit]
            ]

    def clear_all(self) -> None:
        """Xóa toàn bộ tasks trong bộ nhớ (dùng cho test suite hoặc reset)."""
        with self._lock:
            self._tasks.clear()


# Singleton instance toàn cục cho toàn bộ backend application
task_manager = TaskManager()

# Export các hàm helper tiện ích
create_task = task_manager.create_task
get_task = task_manager.get_task
update_task = task_manager.update_task
cleanup_expired_tasks = task_manager.cleanup_expired_tasks
