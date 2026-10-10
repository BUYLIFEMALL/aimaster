// 티스토리 발행 설정(v1.57): 카테고리·공개 범위·댓글·홈주제·발행 시점을 BLOG(웹)에서 글마다 정해 글과 함께 확장으로 보낸다.
// 확장은 이 값대로 발행 설정창까지만 적용하고 최종 발행은 회원이 직접 누른다.
// 보호글(비밀번호)은 자동 입력에서 지원하지 않는다 — 비밀번호를 DB에 두지 않기 위해서다(2026-10-10 주인님 결정). 필요하면 티스토리에서 직접 보호로 바꾼다.

export type TistoryVisibility = 'public' | 'private'
export type TistoryComment = 'allow' | 'deny'
export type TistoryTiming = 'now' | 'reserve'

export interface TistoryPublish {
  /** 티스토리 카테고리 전체 이름(빈 문자열 = 지정 안 함, 티스토리 기본 카테고리) */
  category: string
  visibility: TistoryVisibility
  comment: TistoryComment
  /** 홈주제 이름(빈 문자열 = 선택 안 함) */
  topic: string
  timing: TistoryTiming
  /** 예약 발행일 YYYY-MM-DD(한국 시간). timing이 reserve일 때만 값이 있다. */
  reserveDate: string
  /** 예약 발행 시각 HH:MM(한국 시간) */
  reserveTime: string
}

export const DEFAULT_TISTORY_PUBLISH: TistoryPublish = {
  category: '', visibility: 'public', comment: 'allow', topic: '', timing: 'now', reserveDate: '', reserveTime: '',
}

// 홈주제 기본 목록(확장 `extension/sidepanel.js`의 DEFAULT_HOME_TOPICS와 같다). 빈 새 글에서는 티스토리가 발행 설정창을 열지 않아 실제 목록을 미리 읽을 수 없어서,
// 웹에서는 이 목록으로 고르고 확장은 입력할 때 현재 티스토리 목록과 정확히 일치하는 항목만 선택한다(없으면 선택하지 않고 안내).
export const TISTORY_HOME_TOPICS = [
  '일상', '육아', '건강', '요리', '패션·미용', '반려동물',
  '여행', '맛집', '국내여행', '해외여행',
  'TV', '스타', '영화', '음악', '책', '만화·애니', '공연·전시·축제', '창작',
  'IT·인터넷', '모바일', '게임', '과학', 'IT 제품리뷰',
  '정치', '사회', '교육', '국제', '경제', '경영·직장',
  '야구', '축구', '농구', '배구', '골프', '기타 스포츠',
] as const

const clean = (value: unknown, max: number, label: string) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new Error(`${label} 형식이 올바르지 않습니다.`)
  const text = value.normalize('NFC').replace(/[​﻿]/g, '').replace(/\s+/g, ' ').trim()
  if (text.length > max) throw new Error(`${label}이(가) 너무 깁니다.`)
  return text
}

/** 웹에서 받은 값을 검증해 정리한다. 잘못된 값이면 던진다(이유는 회원에게 그대로 보여 줄 수 있는 문장). */
export function parseTistoryPublish(value: unknown, now = Date.now()): TistoryPublish {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('발행 설정 형식이 올바르지 않습니다.')
  const item = value as Record<string, unknown>
  const visibility = item.visibility ?? 'public'
  if (visibility === 'protected') throw new Error('보호글은 자동 입력에서 지원하지 않습니다. 공개 또는 비공개로 보내고, 필요하면 티스토리에서 직접 보호로 바꿔 주세요.')
  if (visibility !== 'public' && visibility !== 'private') throw new Error('공개 범위는 공개 또는 비공개만 선택할 수 있습니다.')
  const comment = item.comment ?? 'allow'
  if (comment !== 'allow' && comment !== 'deny') throw new Error('댓글 설정이 올바르지 않습니다.')
  const timing = item.timing ?? 'now'
  if (timing !== 'now' && timing !== 'reserve') throw new Error('발행 시점이 올바르지 않습니다.')
  let reserveDate = ''
  let reserveTime = ''
  if (timing === 'reserve') {
    reserveDate = typeof item.reserveDate === 'string' ? item.reserveDate.trim() : ''
    reserveTime = typeof item.reserveTime === 'string' ? item.reserveTime.trim() : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reserveDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reserveTime)) throw new Error('예약 발행에는 날짜(YYYY-MM-DD)와 시간(HH:MM)을 모두 입력해 주세요.')
    const when = new Date(`${reserveDate}T${reserveTime}:00+09:00`).getTime()
    if (Number.isNaN(when)) throw new Error('예약 날짜 형식이 올바르지 않습니다.')
    if (when <= now) throw new Error('예약 발행 시각은 지금보다 뒤여야 합니다.')
  }
  return {
    category: clean(item.category, 120, '카테고리'),
    visibility,
    comment,
    topic: clean(item.topic, 60, '홈주제'),
    timing,
    reserveDate,
    reserveTime,
  }
}

/** DB에 저장된 값을 안전하게 읽는다. 비어 있거나 깨졌으면 기본값(공개·댓글 허용·현재 발행·카테고리 없음). 예약 시각이 이미 지났다면 현재 발행으로 본다. */
export function readTistoryPublish(value: unknown, now = Date.now()): TistoryPublish {
  if (value === null || value === undefined) return { ...DEFAULT_TISTORY_PUBLISH }
  try { return parseTistoryPublish(value, now) } catch {
    // 예약 시각이 지난 값은 나머지 설정은 살리고 현재 발행으로 낮춘다.
    try {
      const item = value as Record<string, unknown>
      return parseTistoryPublish({ ...item, timing: 'now' }, now)
    } catch { return { ...DEFAULT_TISTORY_PUBLISH } }
  }
}
