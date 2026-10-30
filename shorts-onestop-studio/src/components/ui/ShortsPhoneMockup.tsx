"use client";
import React from "react";

interface ShortsPhoneMockupProps {
  title?: string;
  narration?: string;
  bgUrl?: string;
  author?: string;
  likes?: string;
  comments?: string;
  currentTime?: string;
  totalTime?: string;
}

export function ShortsPhoneMockup({
  title = "2026 직장인 연봉 2배 AI 도구",
  narration = "아직도 엑셀 수작업 하세요? 이번 달 연봉 앞자리가 바뀌는 AI 실무 툴 5가지!",
  bgUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  author = "@AI_Shorts_Studio",
  likes = "4.8만",
  comments = "1,230",
  currentTime = "00:03",
  totalTime = "00:48"
}: ShortsPhoneMockupProps) {
  return (
    <div className="shorts-mockup-deck">
      {/* 스마트폰 프레임 (260 x 462, 9:16 비율) */}
      <div className="shorts-phone-device">
        {/* 상단 노치 */}
        <div className="shorts-phone-notch" />

        {/* 배경 이미지 & 비네팅 그라데이션 */}
        <img
          src={bgUrl}
          alt="Shorts Preview"
          className="shorts-phone-bg"
        />
        <div className="shorts-phone-gradient" />

        {/* 상단 유튜브 쇼츠 헤더 */}
        <div className="shorts-phone-top">
          <div className="shorts-phone-logo">
            <span className="shorts-phone-play-badge">▶</span>
            <span>Shorts</span>
          </div>
          <span className="shorts-phone-time">
            {currentTime} / {totalTime}
          </span>
        </div>

        {/* 중앙 하이라이트 자막 오버레이 */}
        <div className="shorts-phone-caption">
          <div className="shorts-phone-hook-tag">
            🔥 {title}
          </div>
          <p className="shorts-phone-narration">
            "{narration}"
          </p>
        </div>

        {/* 우측 쇼츠 인터랙션 열 (좋아요, 댓글, 공유, 오디오 디스크) */}
        <div className="shorts-phone-actions">
          <div className="shorts-phone-action-btn">
            <div className="shorts-phone-action-icon">👍</div>
            <span className="shorts-phone-action-count">{likes}</span>
          </div>
          <div className="shorts-phone-action-btn">
            <div className="shorts-phone-action-icon">💬</div>
            <span className="shorts-phone-action-count">{comments}</span>
          </div>
          <div className="shorts-phone-action-btn">
            <div className="shorts-phone-action-icon">↗</div>
            <span className="shorts-phone-action-count">공유</span>
          </div>
          <div className="shorts-phone-disc">
            <img src={bgUrl} alt="Audio" />
          </div>
        </div>

        {/* 하단 크리에이터 정보 및 프로그레스 바 */}
        <div className="shorts-phone-bottom">
          <div className="shorts-phone-creator">
            <div className="shorts-phone-avatar">YT</div>
            <span className="shorts-phone-author">{author}</span>
            <button type="button" className="shorts-phone-sub-btn">구독</button>
          </div>
          <div className="shorts-phone-tags">
            #Shorts #유튜브쇼츠 #AI스튜디오
          </div>
          <div className="shorts-phone-progress-bg">
            <div className="shorts-phone-progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
