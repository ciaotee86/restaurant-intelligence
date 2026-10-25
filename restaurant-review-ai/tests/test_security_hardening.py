"""
Unit & Integration Tests nhằm xác thực các bản vá bảo mật (Security Hardening Verification):
- [SEC-03] Path Traversal tại route serve_react_spa
- [SEC-05] CORS Misconfiguration (không cho phép wildcard kết hợp credentials)
- [SEC-08] Rò rỉ thông tin lỗi nội bộ qua global_exception_handler
- [SEC-13] Port Guard an toàn không sử dụng shell=True
- [SEC-06] Anti-SSRF Redirect trong inspect_foody_via_http
- [SEC-07] Phòng thủ Prompt Injection (max_length, system_instruction, XML delimiters)
- [SEC-04] Concurrency Control (CRAWLER_SEMAPHORE)
"""

import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

CURRENT_DIR = Path(__file__).resolve().parent.parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from api_server import app, _ensure_port_available, DEFAULT_ALLOWED_ORIGINS
from routers.restaurants import AskAssistantRequest
from crawler.foody_crawler import inspect_foody_via_http, CRAWLER_SEMAPHORE as FOODY_SEMAPHORE
from routers.crawler import CRAWLER_SEMAPHORE as ROUTER_SEMAPHORE
from services.assistant_service import call_gemini_assistant_raw
from services.reply_service import call_gemini_reply

client = TestClient(app, raise_server_exceptions=False)


# =====================================================================
# 1. TEST [SEC-03] PATH TRAVERSAL
# =====================================================================
def test_path_traversal_blocked():
    """Kiểm tra việc ngăn chặn đọc file ngoài thư mục dist/ bằng Path Traversal"""
    # Thử các payload traversal phổ biến
    traversal_paths = [
        "/..%2f..%2fapi_server.py",
        "/../../api_server.py",
        "/..%5c..%5capi_server.py",
        "/....//....//api_server.py",
    ]
    for path in traversal_paths:
        res = client.get(path)
        # Không được phép trả về nội dung của mã nguồn api_server.py
        assert "FastAPI Server phục vụ REST API" not in res.text
        # Phải trả về 200 (index.html SPA fallback) hoặc 404, không bao giờ lộ file hệ thống
        assert res.status_code in (200, 404)

def test_api_route_not_intercepted_by_spa():
    """Route bắt đầu bằng api không bị SPA nuốt mà trả về 404 nếu không khớp router"""
    res = client.get("/api/non-existent-endpoint-xyz")
    assert res.status_code == 404
    data = res.json()
    assert "detail" in data


# =====================================================================
# 2. TEST [SEC-05] CORS MISCONFIGURATION
# =====================================================================
def test_cors_configuration():
    """Kiểm tra CORS không cho phép wildcard kèm credentials"""
    # Gửi request OPTIONS preflight từ origin được phép
    allowed_orig = DEFAULT_ALLOWED_ORIGINS[0]
    res = client.options(
        "/api/health",
        headers={
            "Origin": allowed_orig,
            "Access-Control-Request-Method": "GET"
        }
    )
    assert res.headers.get("access-control-allow-origin") == allowed_orig
    assert res.headers.get("access-control-allow-credentials") == "true"

    # Gửi request từ origin lạ / độc hại
    malicious_orig = "http://evil-attacker.com"
    res_bad = client.options(
        "/api/health",
        headers={
            "Origin": malicious_orig,
            "Access-Control-Request-Method": "GET"
        }
    )
    # Origin độc hại không được phép xuất hiện trong allow-origin
    assert res_bad.headers.get("access-control-allow-origin") != malicious_orig


# =====================================================================
# 3. TEST [SEC-08] RÒ RỈ THÔNG TIN LỖI NỘI BỘ
# =====================================================================
def test_global_exception_handler_masks_raw_error():
    """Exception handler không làm lộ raw traceback hay exception string ra JSON client"""
    with patch("routers.restaurants.find_restaurant", side_effect=RuntimeError("CRITICAL_DATABASE_PASSWORD_LEAK")):
        res = client.get("/api/restaurants/test-id/quick-questions")
        # Không được lộ lỗi raw ra client
        assert res.status_code == 500
        data = res.json()
        assert "CRITICAL_DATABASE_PASSWORD_LEAK" not in str(data)
        assert data.get("detail") == "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau."


# =====================================================================
# 4. TEST [SEC-13] PORT GUARD AN TOÀN
# =====================================================================
def test_ensure_port_available_safe_execution():
    """_ensure_port_available gọi lệnh an toàn, không dùng shell=True và từ chối port độc hại"""
    # Port ngoài khoảng cho phép
    _ensure_port_available(-1)
    _ensure_port_available(999999)
    # Port hợp lệ với mock subprocess
    with patch("subprocess.run") as mock_sub:
        mock_sub.return_value = MagicMock(stdout="")
        _ensure_port_available(8000)
        # Nếu có gọi subprocess thì shell=False
        for call_args in mock_sub.call_args_list:
            kwargs = call_args[1]
            assert kwargs.get("shell") is not True


# =====================================================================
# 5. TEST [SEC-06] ANTI-SSRF REDIRECT
# =====================================================================
def test_anti_ssrf_redirect_blocks_internal_and_external_hops():
    """inspect_foody_via_http ngăn chặn việc chuyển hướng sang IP nội bộ hoặc domain ngoài"""
    # Mock redirect hop sang IP nội bộ nguy hiểm
    mock_redirect_resp = MagicMock()
    mock_redirect_resp.is_redirect = True
    mock_redirect_resp.status_code = 302
    mock_redirect_resp.headers = {"Location": "http://169.254.169.254/latest/meta-data/"}
    mock_redirect_resp.url = "https://www.foody.vn/redirect"

    with patch("requests.get", return_value=mock_redirect_resp):
        res = inspect_foody_via_http("https://www.foody.vn/da-nang/quan-an-test")
        assert res is None  # Đã bị chặn ngay ở bước redirect!


# =====================================================================
# 6. TEST [SEC-07] PHÒNG THỦ PROMPT INJECTION
# =====================================================================
def test_ask_assistant_request_length_validation():
    """AskAssistantRequest từ chối câu hỏi dài hơn 500 ký tự"""
    long_question = "A" * 501
    with pytest.raises(Exception):
        AskAssistantRequest(question=long_question)

    valid_question = "A" * 500
    req = AskAssistantRequest(question=valid_question)
    assert req.question == valid_question

def test_gemini_assistant_uses_system_instruction_and_xml_delimiter():
    """call_gemini_assistant_raw phân tách system_instruction và bọc câu hỏi trong <user_question>"""
    with patch("google.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_resp = MagicMock(text="AI response")
        mock_instance.models.generate_content.return_value = mock_resp

        with patch("services.assistant_service.get_gemini_api_key", return_value="fake_api_key"):
            res = call_gemini_assistant_raw(
                restaurant_data={"name": "Quán Test", "rating": 4.5},
                question="Quán có món gì ngon?"
            )
            assert res == "AI response"
            call_kwargs = mock_instance.models.generate_content.call_args[1]
            contents = call_kwargs.get("contents", "")
            config = call_kwargs.get("config")
            
            # Kiểm tra phân tách thẻ XML
            assert "<user_question>" in contents
            assert "Quán có món gì ngon?" in contents
            assert "</user_question>" in contents

            # Kiểm tra system_instruction nằm trong config
            assert config is not None
            assert hasattr(config, "system_instruction")
            assert "Bạn là Trợ lý Thông tin Ẩm thực" in config.system_instruction

def test_gemini_reply_uses_system_instruction_and_xml_delimiter():
    """call_gemini_reply phân tách system_instruction và bọc review_text trong <review_text>"""
    with patch("google.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_resp = MagicMock(text="Thư phản hồi AI")
        mock_instance.models.generate_content.return_value = mock_resp

        with patch("services.reply_service.get_gemini_api_key", return_value="fake_api_key"):
            reply, model = call_gemini_reply(
                restaurant_name="Quán Test",
                author="Nguyễn Văn A",
                rating=5.0,
                review_text="Món ăn rất tuyệt vời!",
                overall_sentiment="positive",
                aspects=[],
                tone="gratitude"
            )
            assert reply == "Thư phản hồi AI"
            call_kwargs = mock_instance.models.generate_content.call_args[1]
            contents = call_kwargs.get("contents", "")
            config = call_kwargs.get("config")

            # Kiểm tra phân tách thẻ XML
            assert "<review_text>" in contents
            assert "Món ăn rất tuyệt vời!" in contents
            assert "</review_text>" in contents

            # Kiểm tra system_instruction nằm trong config
            assert config is not None
            assert hasattr(config, "system_instruction")


# =====================================================================
# 7. TEST [SEC-04] CONCURRENCY CONTROL (SEMAPHORE)
# =====================================================================
def test_concurrency_semaphore_initialized():
    """Kiểm tra CRAWLER_SEMAPHORE được khởi tạo với limit 2"""
    assert FOODY_SEMAPHORE._value == 2
    assert ROUTER_SEMAPHORE._value == 2
