# HeartMuLa 3B(Apache 2.0) 곡 만들기 — 원본 heartlib 5858ca8 examples/run_music_generation.py와 같은 호출.
# 사용: python run_heartmula.py <job.json>
# job.json: {"style", "lyrics", "durationSec", "seed", "out", "modelDir", "vramGb"}
# 윈도우에서 바꾼 점: torch.compile 끔(triton 없음), 저장은 soundfile로 24bit WAV(torchaudio 저장 백엔드에 기대지 않음).
import json
import sys

import soundfile as sf
import torch

import heartlib.pipelines.music_generation as mg
from heartlib import HeartMuLaGenPipeline


def stage(text):
    print(f"FMS_STAGE {text}", flush=True)


def progress(iterable):
    total = len(iterable)
    for i, x in enumerate(iterable):
        if i % 25 == 0:
            stage(f"HeartMuLa · 음악 만드는 중 {round(i * 100 / total)}%")
        yield x


def main():
    with open(sys.argv[1], encoding="utf-8") as fp:
        job = json.load(fp)
    seed = int(job.get("seed") or 0) or torch.seed() % (2**31)
    torch.manual_seed(seed)

    mg.tqdm = progress
    HeartMuLaGenPipeline._apply_compile = lambda self, model: None

    def save(self, model_outputs, save_path):
        frames = model_outputs["frames"].to(self.codec_device)
        wav = self.codec.detokenize(frames)
        self._unload()
        sf.write(save_path, wav.to(torch.float32).cpu().numpy().T, 48000, subtype="PCM_24")

    HeartMuLaGenPipeline.postprocess = save

    vram = float(job.get("vramGb") or 0)
    stage("HeartMuLa · 모델 올리는 중")
    pipe = HeartMuLaGenPipeline.from_pretrained(
        job["modelDir"],
        device={"mula": torch.device("cuda"), "codec": torch.device("cuda")},
        dtype={"mula": torch.bfloat16, "codec": torch.float32},
        version="3B",
        # 16GB 그래픽카드는 두 모델을 차례로 올린다(함께 올리면 약 13.5GB + 계산 공간)
        lazy_load=vram < 20,
    )
    lyrics = str(job.get("lyrics") or "").strip() or "[instrumental]"
    tags = str(job.get("style") or "").strip() or "pop"
    max_ms = int(min(max(float(job.get("durationSec") or 120), 30), 240) * 1000)
    with torch.no_grad():
        pipe({"lyrics": lyrics, "tags": tags}, max_audio_length_ms=max_ms, save_path=job["out"], topk=50, temperature=1.0, cfg_scale=1.5)
    print(json.dumps({"seed": seed}), flush=True)
    print("FMS_DONE", flush=True)


if __name__ == "__main__":
    main()
