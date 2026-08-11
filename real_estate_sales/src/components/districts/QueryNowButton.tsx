"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { queryDistrictsAction } from "@/lib/actions/query";
import { Button } from "@/components/ui/Button";

export function QueryNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const result = await queryDistrictsAction();
      if (result.error) {
        setIsError(true);
        setMessage(result.error);
        return;
      }
      if (!result.newListings) {
        setMessage(`${result.queriedDistricts}개 지역을 조회했지만 새로운 실거래는 없었어요.`);
      } else {
        const telegramPart = result.telegramLinked
          ? `텔레그램으로 ${result.notified}건 발송했어요.`
          : "텔레그램이 연동되어 있지 않아 발송은 건너뛰었어요 (설정에서 연동해주세요).";
        setMessage(
          `${result.queriedDistricts}개 지역에서 새 실거래 ${result.newListings}건을 발견해서 AI 분석 후 ${telegramPart}`,
        );
      }
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("조회 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={handleClick} disabled={loading}>
        {loading ? "조회 중... (최대 1~2분 소요될 수 있어요)" : "지금 조회하기"}
      </Button>
      {message && (
        <p className={`mt-2 text-sm ${isError ? "text-red-400" : "text-neutral-300"}`}>{message}</p>
      )}
    </div>
  );
}
