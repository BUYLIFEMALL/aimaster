"""service/llm.py — 회원 본인 AI 키로 페이지 구조를 1회 분석해 셀렉터를 뽑아낸다.

원본 CLI 도구에서는 "정찰(사이트 구조 파악)"을 AI 에이전트(Claude Code)가 대화하며
판단했다. 웹 서비스에는 사람이 실시간으로 개입할 수 없으므로, 이 판단을 LLM 1회 호출로
자동화한다 — 이 파일이 web-crawler-saas Phase 1의 가장 새로운(미검증) 부분이다.

셀렉터는 Scrapling/parsel 관례(`::text`, `::attr(name)` 의사 셀렉터)로 뽑도록 프롬프트에서
강제한다 — `scripts/scrapling_reference.md`에 문서화된 것과 동일한 문법이라
`item.css(selector).get("")` 형태로 바로 사용할 수 있다.
"""
import json
import re

import httpx

_SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
MAX_HTML_CHARS = 35000


class LLMError(Exception):
    """LLM 호출/응답 파싱 실패."""


def simplify_html(html: str, max_chars: int = MAX_HTML_CHARS) -> str:
    """script/style/주석을 제거하고 길이를 제한한다 — 토큰 비용은 회원 본인 부담이라 최소화."""
    cleaned = _SCRIPT_STYLE_RE.sub("", html or "")
    cleaned = _COMMENT_RE.sub("", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n\s*\n+", "\n", cleaned)
    return cleaned[:max_chars]


_SYSTEM_PROMPT = """당신은 웹페이지 HTML을 분석해서 반복되는 목록 항목(상품/게시글/공고 등)을
수집하기 위한 CSS 셀렉터를 뽑아내는 도구입니다. 응답은 오직 JSON 객체 하나만 반환하세요.
다른 설명, 코드블록 표시(```) 없이 순수 JSON만 출력합니다.

셀렉터 문법 규칙 (Scrapling/parsel 관례를 반드시 따를 것):
- 텍스트를 추출하려면 셀렉터 끝에 `::text`를 붙입니다. 예: "h2.title::text"
- 속성(링크 등)을 추출하려면 `::attr(속성명)`을 붙입니다. 예: "a::attr(href)"
- item_selector는 ::text/::attr 없이 순수 CSS 선택자만 사용합니다 (반복되는 컨테이너 요소 자체를 가리켜야 함).
- field_selectors의 각 셀렉터는 item_selector로 선택된 요소 "내부"를 기준으로 한 상대 셀렉터입니다.

JSON 스키마:
{
  "item_selector": "<반복되는 아이템 컨테이너의 CSS 셀렉터>",
  "field_selectors": {"<요청받은 필드명 그대로>": "<::text 또는 ::attr()로 끝나는 상대 셀렉터>"},
  "next_page_selector": "<다음 페이지 링크의 ::attr(href) 셀렉터, 없으면 null>"
}

찾을 수 없는 필드는 field_selectors에서 생략하지 말고 가장 근접한 요소를 추정해서 채우세요.
페이지네이션 링크(다음/next/> 등)가 명확히 보이지 않으면 next_page_selector는 null로 두세요."""


def extract_selectors(html: str, target_fields: list[str], provider: str, api_key: str) -> dict:
    simplified = simplify_html(html)
    user_prompt = (
        f"수집하고 싶은 항목: {', '.join(target_fields)}\n\n"
        f"HTML (일부, script/style 제거됨):\n{simplified}"
    )

    callers = {
        "openai": _call_openai,
        "gemini": _call_gemini,
        "anthropic": _call_anthropic,
        "perplexity": _call_perplexity,
    }
    caller = callers.get(provider)
    if caller is None:
        raise LLMError(f"지원하지 않는 AI 제공자입니다: {provider}")
    raw = caller(_SYSTEM_PROMPT, user_prompt, api_key)

    return _parse_plan(raw)


def _parse_plan(raw: str) -> dict:
    text = raw.strip()
    # 모델이 코드블록으로 감싸는 경우가 잦아 방어적으로 벗겨낸다.
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text).rstrip("`").strip()
    try:
        plan = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMError(f"AI 응답을 JSON으로 해석하지 못했습니다: {exc}") from exc

    if not isinstance(plan, dict) or "item_selector" not in plan or "field_selectors" not in plan:
        raise LLMError("AI 응답에 필요한 필드(item_selector/field_selectors)가 없습니다.")
    if not isinstance(plan["field_selectors"], dict) or not plan["field_selectors"]:
        raise LLMError("AI가 필드 셀렉터를 하나도 찾지 못했습니다.")
    return plan


def _call_openai(system_prompt: str, user_prompt: str, api_key: str) -> str:
    try:
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise LLMError(f"OpenAI 호출 실패: {exc}") from exc

    if resp.status_code != 200:
        raise LLMError(f"OpenAI API 오류 ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMError(f"OpenAI 응답 형식이 예상과 다릅니다: {data}") from exc


def _call_anthropic(system_prompt: str, user_prompt: str, api_key: str) -> str:
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
                "temperature": 0,
            },
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise LLMError(f"Claude(Anthropic) 호출 실패: {exc}") from exc

    if resp.status_code != 200:
        raise LLMError(f"Claude API 오류 ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    try:
        return "".join(block["text"] for block in data["content"] if block.get("type") == "text")
    except (KeyError, TypeError) as exc:
        raise LLMError(f"Claude 응답 형식이 예상과 다릅니다: {data}") from exc


def _call_perplexity(system_prompt: str, user_prompt: str, api_key: str) -> str:
    # Perplexity API는 OpenAI 호환 스키마(chat/completions)를 쓴다.
    try:
        resp = httpx.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "sonar",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise LLMError(f"Perplexity 호출 실패: {exc}") from exc

    if resp.status_code != 200:
        raise LLMError(f"Perplexity API 오류 ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMError(f"Perplexity 응답 형식이 예상과 다릅니다: {data}") from exc


def _call_gemini(system_prompt: str, user_prompt: str, api_key: str) -> str:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}"
    )
    try:
        resp = httpx.post(
            url,
            json={
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
            },
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise LLMError(f"Gemini 호출 실패: {exc}") from exc

    if resp.status_code != 200:
        raise LLMError(f"Gemini API 오류 ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise LLMError(f"Gemini 응답 형식이 예상과 다릅니다: {data}") from exc
