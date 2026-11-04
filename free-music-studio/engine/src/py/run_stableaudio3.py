# Stable Audio 3 Medium(Stability AI Community License) 연주곡 만들기 — 원본 stable-audio-3 77e0398 StableAudioModel.generate.
# 사용: python run_stableaudio3.py <job.json>
# job.json: {"style", "durationSec", "seed", "out"} — 모델은 HF_HOME 보관 폴더에서 읽는다(엔진이 먼저 받아 둠).
# Flash Attention이 없으면 원본이 스스로 SDPA로 계산한다(윈도우).
import json
import math
import sys

import soundfile as sf
import torch

from stable_audio_3 import StableAudioModel


def stage(text):
    print(f"FMS_STAGE {text}", flush=True)


def main():
    with open(sys.argv[1], encoding="utf-8") as fp:
        job = json.load(fp)
    seed = int(job.get("seed") or 0) or torch.seed() % (2**31)
    duration = float(min(max(float(job.get("durationSec") or 120), 10), 380))
    prompt = str(job.get("style") or "").strip() or "Instrumental music"

    stage("Stable Audio 3 · 모델 올리는 중")
    model = StableAudioModel.from_pretrained("medium")
    sr = model.model.sample_rate
    stage("Stable Audio 3 · 음악 만드는 중")
    # 기본 sample_size는 약 2분이라, 긴 곡은 길이(+여유 6초)만큼 넉넉히 준다 — 원본이 정확한 크기로 다시 맞춘다
    sample_size = max(5292032, int(math.ceil((duration + 16) * sr)))
    audio = model.generate(prompt=prompt, duration=duration, seed=seed, sample_size=sample_size)
    stage("Stable Audio 3 · 저장 중")
    wav = audio[0].to(torch.float32).cpu().numpy().T  # (샘플, 채널)
    sf.write(job["out"], wav, sr, subtype="PCM_24")
    print(json.dumps({"seed": seed, "sampleRate": sr}), flush=True)
    print("FMS_DONE", flush=True)


if __name__ == "__main__":
    main()
