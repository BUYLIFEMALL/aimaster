# MiniMax Music 3(MiniMax-Music3 커뮤니티 라이선스, 상업용 조건부) 곡 만들기 — diffusers 0.41.0 문서(docs/.../pipelines/minimax_music3.md) 예제와 같은 호출. 결과는 44.1kHz 스테레오.
# 사용: python run_minimax3.py <job.json>
# job.json: {"style", "lyrics", "durationSec", "seed", "out", "repo", "vramGb"}
# 모델은 엔진이 HF_HOME 보관 폴더에 받아 두고(refs/main = 고정 판), 만드는 동안은 인터넷에 묻지 않는다(HF_HUB_OFFLINE).
# 그래픽 메모리: 24GB 이상은 통째로, 그 아래는 공식 「Low VRAM」 방식 — 자동 CPU 오프로딩, 22GB 미만은 언어 모델을 층마다 올리기(느림).
import json
import re
import sys

import soundfile as sf
import torch
from diffusers import ComponentsManager, ModularPipeline
from diffusers.hooks.group_offloading import apply_group_offloading

TAG = re.compile(r"^\s*\[([^\]]+)\]\s*$")
VOCAL_WORDS = re.compile(r"vocal|voice|singer|sing|보컬|목소리|가수|노래", re.I)


def model_lyrics(text):
    """구간 표시는 소문자로 한 줄에 하나(diffusers 0.41.0 문서 Tips — 같은 줄 글자는 버려짐). 가사 없으면 연주곡."""
    lines = []
    for raw in str(text or "").replace("\r", "").split("\n"):
        m = TAG.match(raw)
        lines.append(f"[{m.group(1).strip().lower()}]" if m else raw.rstrip())
    out = "\n".join(lines).strip()
    return out or "[instrumental]"


def model_prompt(style, lyrics):
    """노래인데 설명에 목소리가 없으면 연주곡으로 흐를 수 있어(문서 Tips) 리드 보컬을 덧붙인다."""
    prompt = str(style or "").strip() or "pop song"
    if lyrics != "[instrumental]" and not VOCAL_WORDS.search(prompt):
        prompt += ". Vocals: clear expressive lead vocal singing the lyrics."
    return prompt


def stage(text):
    print(f"FMS_STAGE {text}", flush=True)


def main():
    with open(sys.argv[1], encoding="utf-8") as fp:
        job = json.load(fp)
    if not torch.cuda.is_available():
        print("FMS_ERROR MiniMax Music 3는 NVIDIA 그래픽카드(CUDA)가 있어야 합니다.", flush=True)
        sys.exit(2)
    seed = int(job.get("seed") or 0) or torch.seed() % (2**31)
    vram = float(job.get("vramGb") or 0)
    repo = job["repo"]

    stage("MiniMax Music 3 · 모델 올리는 중")
    if vram >= 24:
        pipe = ModularPipeline.from_pretrained(repo)
        pipe.load_components(dtype=torch.bfloat16)
        pipe.to("cuda")
    else:
        manager = ComponentsManager()
        manager.enable_auto_cpu_offload(device="cuda")
        pipe = ModularPipeline.from_pretrained(repo, components_manager=manager)
        pipe.load_components(dtype=torch.bfloat16)
        if vram < 22:
            apply_group_offloading(pipe.language_model, onload_device=torch.device("cuda"), offload_type="leaf_level", use_stream=True)

    lyrics = model_lyrics(job.get("lyrics"))
    prompt = model_prompt(job.get("style"), lyrics)
    duration = float(min(max(float(job.get("durationSec") or 120), 10), 300))
    stage(f"MiniMax Music 3 · 음악 만드는 중({'나눠 올리기라 오래 걸릴 수 있음' if vram < 24 else '잠시만 기다려 주세요'})")
    with torch.no_grad():
        audio = pipe(
            prompt=prompt,
            lyrics=lyrics,
            audio_duration=duration,
            generator=torch.Generator("cuda").manual_seed(seed),
            output="audios",
        )[0]
    sf.write(job["out"], audio.T.float().cpu().numpy(), pipe.sampling_rate, subtype="PCM_16")
    print(json.dumps({"seed": seed}), flush=True)
    print("FMS_DONE", flush=True)


if __name__ == "__main__":
    main()
