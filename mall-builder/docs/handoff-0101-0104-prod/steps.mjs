// 운영 0101~0104 묶음 단계 정의(build.mjs·check-local.mjs 공용). 원문 지문은 커밋된 파일 그대로(LF) — 다르면 생성 거부.
export const STEPS = [
  {
    id: 1, name: "0101",
    files: [{ file: "0101_messaging.sql", commit: "51b2f3e91", sha256: "546bd8dd192ae33b" }],
    records: ["mall_builder_0101_messaging"],
    needRecords: ["mall_builder_0100_cash_receipts"],
    laterRecords: ["mall_builder_0102_exchanges", "mall_builder_0103_exchange_confirmed_window", "mall_builder_0104_exchange_fee_payments"],
    needExtensions: [],
  },
  {
    id: 2, name: "0102-0103",
    files: [
      { file: "0102_exchanges.sql", commit: "a86c53dc1", sha256: "14780f43e6c5daf5" },
      { file: "0103_exchange_confirmed_window.sql", commit: "0edda8666", sha256: "05fd87eeed148ecd" },
    ],
    records: ["mall_builder_0102_exchanges", "mall_builder_0103_exchange_confirmed_window"],
    needRecords: ["mall_builder_0100_cash_receipts", "mall_builder_0101_messaging"],
    laterRecords: ["mall_builder_0104_exchange_fee_payments"],
    needExtensions: [],
  },
  {
    id: 3, name: "0104",
    files: [{ file: "0104_exchange_fee_payments.sql", commit: "37fdcabb4", sha256: "739b35e9f20b45ba" }],
    records: ["mall_builder_0104_exchange_fee_payments"],
    needRecords: ["mall_builder_0100_cash_receipts", "mall_builder_0101_messaging", "mall_builder_0102_exchanges", "mall_builder_0103_exchange_confirmed_window"],
    laterRecords: [],
    needExtensions: ["http"],
  },
];
