// 구글폼 연결용 Apps Script(v2) 스니펫 생성 — CRM U3(2026-11-18). 화면(SourceCard)이 그대로 보여 주고 회원이 복사한다.
//
// 보내는 본문(서버 파서 lib/crm/dedupe.ts와 같은 형식):
//   폼에 붙인 스크립트(양식 제출 이벤트에 e.response 있음): { v: 2, kind: "form", eventKey: <실제 응답 ID>, values }
//   시트에 붙인 스크립트(e.range 있음): 문서 ID·시트 ID·행 번호·그 행 첫 칸의 실제 Date(ms가 양수 숫자 13자리 — 서버와 같은 조건)가 **모두** 있을 때만
//     { v: 2, kind: "sheet", eventKey: "<문서ID>:<시트ID>:<행>:<ms>", values }
//   그 밖(필수 값 하나라도 없음·첫 칸이 Date가 아님·형식이 다름·도중 오류): 구버전 본문 { values } — **중복 보호 없음**.
//     임의 UUID나 본문 해시로 v2를 흉내 내지 않는다(예전 스니펫의 Utilities.getUuid() 제거).
// 한계(화면·문서 안내): 시트 행을 지우거나 정렬해 같은 행 번호·같은 제출 시각이 다시 쓰이면 오판 가능, 시트를 다른 파일로
//   복사하면 문서 ID가 바뀌어 같은 응답도 다른 키, 첫 칸(타임스탬프) 값을 사람이 고치면 키가 바뀜.
// 개인정보: 스크립트는 로그를 남기지 않는다(Logger·console 0). 웹훅 주소(토큰 포함)는 회원 화면에만 보인다.

export function appsScriptSnippet(webhookUrl: string): string {
  const url = JSON.stringify(webhookUrl);
  return `function onFormSubmit(e) {
  var payload = crmPayload_(e);
  UrlFetchApp.fetch(${url}, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// 중복 접수 방지용 식별값을 만든다. 조건이 하나라도 맞지 않으면 보호 없는 기존 형식으로 보낸다.
function crmPayload_(e) {
  var values = (e && e.namedValues) || {};
  try {
    // 폼에 직접 붙인 경우: 구글폼이 주는 실제 응답 ID
    if (e && e.response && typeof e.response.getId === "function") {
      // 질문 제목이 __proto__·constructor 같은 이름이어도 자기 키로 남도록 원형 없는 객체에 직접 정의한다.
      var formValues = Object.create(null);
      var items = e.response.getItemResponses();
      for (var i = 0; i < items.length; i++) {
        Object.defineProperty(formValues, String(items[i].getItem().getTitle()), {
          value: [String(items[i].getResponse())], enumerable: true, writable: true, configurable: true
        });
      }
      var rid = e.response.getId();
      if (typeof rid === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(rid)) {
        return { v: 2, kind: "form", eventKey: rid, values: formValues };
      }
      return { values: formValues };
    }
    // 시트에 붙인 경우: 문서·시트·행과 그 행 첫 칸(구글폼이 적는 제출 시각)
    if (e && e.range && typeof e.range.getRow === "function") {
      var sheet = e.range.getSheet();
      var fileId = sheet.getParent().getId();
      var sheetId = sheet.getSheetId();
      var row = e.range.getRow();
      var first = sheet.getRange(row, 1).getValue();
      var ms = (first instanceof Date) ? first.getTime() : NaN;
      if (typeof fileId === "string" && /^[A-Za-z0-9_-]{20,100}$/.test(fileId) &&
          typeof sheetId === "number" && sheetId >= 0 && sheetId <= 9999999999 && Math.floor(sheetId) === sheetId &&
          typeof row === "number" && row >= 1 && row <= 9999999 && Math.floor(row) === row &&
          isFinite(ms) && /^[0-9]{13}$/.test(String(ms))) {
        return { v: 2, kind: "sheet", eventKey: fileId + ":" + sheetId + ":" + row + ":" + ms, values: values };
      }
    }
  } catch (err) {
    // 식별값을 만들다 오류가 나면 보호 없는 기존 형식으로 보낸다(오류 내용은 남기지 않음).
  }
  return { values: values };
}`;
}
