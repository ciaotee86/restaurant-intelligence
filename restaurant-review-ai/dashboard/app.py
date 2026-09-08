"""
Dashboard Streamlit - query trực tiếp từ SQLite, không gọi lại Gemini API.
Chạy: streamlit run dashboard/app.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from sqlalchemy import text
from database.db import engine

st.set_page_config(page_title="Phân tích đánh giá nhà hàng", page_icon="🍜", layout="wide")

# ---------- Load dữ liệu ----------
restaurants_df = pd.read_sql("SELECT * FROM restaurants", engine)

if restaurants_df.empty:
    st.warning("Chưa có dữ liệu. Chạy `python main.py` trước để cào và phân tích review.")
    st.stop()

st.sidebar.title("🍜 Chọn quán")
selected_name = st.sidebar.selectbox("Nhà hàng", restaurants_df["name"].tolist())
restaurant = restaurants_df[restaurants_df["name"] == selected_name].iloc[0]

# ---------- Query dữ liệu review + phân tích của quán đã chọn ----------
query = text("""
    SELECT r.id as review_id, r.author, r.rating, r.text, r.review_date,
           a.aspect, a.sentiment, a.confidence, a.is_urgent
    FROM reviews r
    LEFT JOIN review_analysis a ON a.review_id = r.id
    WHERE r.restaurant_id = :rid
""")
df = pd.read_sql(query, engine, params={"rid": int(restaurant["id"])})

# ---------- Header ----------
st.title(selected_name)
col1, col2, col3 = st.columns(3)
col1.metric("Điểm trung bình", f"{restaurant['overall_rating'] or 0:.1f}")
col2.metric("Số review đã cào", df["review_id"].nunique())
col3.metric("Cảnh báo khẩn", int(df[df["is_urgent"] == 1]["review_id"].nunique()))

st.divider()

left, right = st.columns([1, 1])

# ---------- Radar chart theo khía cạnh ----------
with left:
    st.subheader("Điểm theo khía cạnh (ABSA)")
    sentiment_score = {"positive": 1, "neutral": 0, "negative": -1}
    aspect_df = df.dropna(subset=["aspect"]).copy()

    if not aspect_df.empty:
        aspect_df["score"] = aspect_df["sentiment"].map(sentiment_score)
        agg = aspect_df.groupby("aspect")["score"].mean().reset_index()

        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(
            r=agg["score"], theta=agg["aspect"], fill="toself", name="Điểm TB"
        ))
        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[-1, 1])),
            showlegend=False, height=380,
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Chưa có dữ liệu phân tích cho quán này. Chạy `python main.py` để phân tích thêm.")

# ---------- Cảnh báo khẩn ----------
with right:
    st.subheader("🚨 Cảnh báo khẩn")
    urgent_df = df[df["is_urgent"] == 1].drop_duplicates(subset=["review_id"])
    if urgent_df.empty:
        st.success("Không có cảnh báo nào.")
    else:
        for _, row in urgent_df.iterrows():
            st.error(f"**{row['rating']}★** — {row['text'][:200]}")

st.divider()

# ---------- Bảng review chi tiết ----------
st.subheader("Danh sách review")
display_df = df.drop_duplicates(subset=["review_id"])[["author", "rating", "text", "review_date"]]
st.dataframe(display_df, use_container_width=True, hide_index=True)
