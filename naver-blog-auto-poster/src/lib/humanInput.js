"use strict";

// 네이버 봇 탐지 회피 — 이 프로젝트의 최우선 원칙(README "절대 불변 원칙" 참고).
// 절대 fill()/evaluate()로 값을 한 번에 넣지 않는다. 실제 사람처럼 클릭 후 한 글자씩,
// 무작위 간격으로 타이핑하고, 가끔은 더 길게 쉰다.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 이미 포커스된 요소에 사람처럼 한 글자씩 입력한다. 개행 문자는 Enter 키로 처리한다.
 */
async function humanType(page, text, { minDelay = 70, maxDelay = 170, thinkChance = 0.05 } = {}) {
  for (const char of text) {
    if (char === "\n") {
      await page.keyboard.press("Enter");
    } else {
      await page.keyboard.type(char);
    }
    await sleep(randomDelay(minDelay, maxDelay));
    if (Math.random() < thinkChance) {
      await sleep(randomDelay(250, 700));
    }
  }
}

/**
 * 요소를 실제 클릭해서 포커스를 옮긴 뒤(사람이 클릭하듯 약간의 대기 포함) 타이핑한다.
 */
async function clickAndType(locator, text, options) {
  await locator.click();
  await sleep(randomDelay(250, 600));
  await humanType(locator.page(), text, options);
}

module.exports = { sleep, randomDelay, humanType, clickAndType };
