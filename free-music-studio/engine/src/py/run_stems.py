# Stem 분리(엔진 0.6.9) — 원본 boks-music `engines/runner.py`(stems)·`multi_stems.py`·`prepare_stems.py`(MIT, © 2026 boksajang)를 옮김.
# 사용: python run_stems.py <job.json>
# job: {"mode": "two"|"multi", "audioPath", "outDir", "modelDir", "device": "cuda"|"cpu", "resultFile", "prepareOnly": bool, "singleStem": "Vocals"(가사 분석용 보컬만)}
# two  = BS-RoFormer(보컬 / 반주 2트랙, audio-separator가 처음 한 번 모델을 받음)
# multi = BS-RoFormer SW 6트랙(보컬·드럼·베이스·기타·피아노·기타 소리, 고정 판·크기·SHA-256 확인 후 받음)
# 출력: FMS_STAGE 진행 · FMS_ERROR 실패 이유 · FMS_DONE 끝(결과는 resultFile에 JSON).
import contextlib
import hashlib
import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
OUT = sys.stdout

TWO_MODEL = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
MULTI_REVISION = "2b98254b19bdab07ce225d884ec4aa9dd8aafce1"
MULTI_MODEL = "BS-Rofo-SW-Fixed.ckpt"
MULTI_CONFIG = "BS-Rofo-SW-Fixed.yaml"
MULTI_FILES = [
    (MULTI_MODEL, 699412152, "24e7d35ee9c64415673d3fd33e06a67cac2c103c5df6267ba1576459c775916e"),
    (MULTI_CONFIG, 4613, "f9fada9f94e5ba2d2e4600196299459294bc5f532b314c209cc156ac63e4329b"),
]
STEM_NAMES = ("Vocals", "Instrumental", "Drums", "Bass", "Guitar", "Piano", "Other", "No_Vocals", "Strings")


def stage(text):
    OUT.write(f"FMS_STAGE {text}\n")
    OUT.flush()


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(1024 * 1024):
            h.update(block)
    return h.hexdigest()


def ensure_multi(root):
    """6트랙 모델 — 고정 판에서 받고 크기·SHA-256이 맞을 때만 쓴다(원본 multi_stems.ensure_multi)."""
    root.mkdir(parents=True, exist_ok=True)
    for name, size, digest in MULTI_FILES:
        dest = root / name
        if dest.is_file() and dest.stat().st_size == size and sha256(dest) == digest:
            continue
        stage(f"6트랙 분리 모델 받는 중(처음 한 번) · {name}")
        partial = dest.with_suffix(dest.suffix + ".partial")
        try:
            url = f"https://huggingface.co/FractalSurfer/BS-RoFormer-SW-6stem/resolve/{MULTI_REVISION}/{name}"
            with urllib.request.urlopen(url, timeout=90) as response, partial.open("wb") as output:
                total, next_update, h = 0, 64 * 1024 * 1024, hashlib.sha256()
                while block := response.read(1024 * 1024):
                    total += len(block)
                    if total > size:
                        raise RuntimeError("6트랙 모델 크기가 올바르지 않습니다.")
                    output.write(block)
                    h.update(block)
                    if total >= next_update:
                        stage(f"6트랙 분리 모델 받는 중(처음 한 번) · {total * 100 // size}%")
                        next_update += 64 * 1024 * 1024
            if total != size or h.hexdigest() != digest:
                raise RuntimeError("6트랙 모델 확인값(SHA-256)이 맞지 않습니다.")
            partial.replace(dest)
        finally:
            partial.unlink(missing_ok=True)


def multi_separator(root, **kwargs):
    from audio_separator.separator import Separator

    class PinnedSeparator(Separator):
        def download_model_files(self, filename):
            if filename != MULTI_MODEL:
                return super().download_model_files(filename)
            self.model_friendly_name = "BS-RoFormer SW · 6 Stem"
            self.model_is_uvr_vip = False
            return filename, "MDXC", self.model_friendly_name, str(root / MULTI_MODEL), str(root / MULTI_CONFIG)

    return PinnedSeparator(model_file_dir=str(root), **kwargs)


def ensure_ffmpeg():
    """audio-separator는 PATH의 ffmpeg를 쓴다 — 엔진 도구 폴더에 없으면 imageio-ffmpeg 것을 실행 환경에 둔다(원본 prepare_stems)."""
    if shutil.which("ffmpeg"):
        return
    import imageio_ffmpeg

    binary_dir = Path(sys.executable).parent
    target = binary_dir / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if not target.exists():
        shutil.copy2(imageio_ffmpeg.get_ffmpeg_exe(), target)
    os.environ["PATH"] = str(binary_dir) + os.pathsep + os.environ.get("PATH", "")


def main():
    with open(sys.argv[1], encoding="utf-8") as fp:
        job = json.load(fp)
    mode = job.get("mode", "two")
    if mode not in ("two", "multi"):
        raise RuntimeError("알 수 없는 Stem 분리 방식입니다.")
    model_dir = Path(job["modelDir"]).resolve()
    model_dir.mkdir(parents=True, exist_ok=True)
    if job.get("device") == "cpu":
        os.environ["CUDA_VISIBLE_DEVICES"] = ""
    # 다른 라이브러리의 print가 진행 줄을 망치지 않게
    with contextlib.redirect_stdout(sys.stderr):
        ensure_ffmpeg()
        import torch

        device = "cuda" if job.get("device") == "cuda" and torch.cuda.is_available() else "cpu"
        from audio_separator.separator import Separator

        out = Path(job.get("outDir") or model_dir / "_prepare").resolve()
        out.mkdir(parents=True, exist_ok=True)
        stage("6트랙 분리 모델 준비 중" if mode == "multi" else "보컬 / 반주 분리 모델 준비 중")
        if mode == "multi":
            ensure_multi(model_dir)
            separator = multi_separator(model_dir, output_dir=str(out), output_format="WAV", use_soundfile=True, mdxc_params={"batch_size": 1, "segment_size": 256, "override_model_segment_size": True})
            model = MULTI_MODEL
        else:
            # 가사 분석은 보컬만 필요 — 다른 트랙은 쓰지 않는다(원본 singleStem)
            single = job.get("singleStem")
            if single not in (None, "Vocals", "Instrumental"):
                raise RuntimeError("알 수 없는 Stem 출력 지정입니다.")
            separator = Separator(output_dir=str(out), output_format="WAV", model_file_dir=str(model_dir), output_single_stem=single)
            model = TWO_MODEL
        # load_model이 실제 구조를 만들기 전에 장치를 정한다(원본 configure_separator_device)
        separator.torch_device = torch.device(device)
        separator.torch_device_cpu = torch.device("cpu")
        separator.torch_device_mps = None
        separator.onnx_execution_provider = ["CUDAExecutionProvider"] if device == "cuda" else ["CPUExecutionProvider"]
        if device == "cuda":
            torch.cuda.reset_peak_memory_stats()
        separator.load_model(model_filename=model)
        if job.get("prepareOnly"):
            result = dict(prepared=True, mode=mode, device=device)
        else:
            stage(("보컬·악기 6트랙 분리 중" if mode == "multi" else "보컬 / 반주 분리 중") + (" (CPU — 곡 길이에 따라 몇 분 걸림)" if device == "cpu" else ""))
            try:
                # 짧은 이름(윈도우 경로 260자) — 「(이름)」이 트랙 이름표가 된다
                files = separator.separate(job["audioPath"], {name: f"stem_({name})" for name in STEM_NAMES})
            except torch.cuda.OutOfMemoryError as exc:
                raise RuntimeError("그래픽 메모리가 부족해 분리하지 못했습니다. 다른 그래픽 작업을 끝내고 다시 해 주세요.") from exc
            paths = [str((out / f).resolve()) for f in files]
            if len(paths) != (6 if mode == "multi" else 1 if job.get("singleStem") else 2) or not all(Path(x).is_file() for x in paths):
                raise RuntimeError("분리 결과 파일이 완전하지 않습니다.")
            peak = round(torch.cuda.max_memory_allocated() / 2**20) if device == "cuda" else 0
            result = dict(stems=paths, model=model, mode=mode, device=device, peakCudaMB=peak)
    Path(job["resultFile"]).write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print("FMS_DONE", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # 한국어 이유를 엔진 창·대기열에 보인다
        import traceback

        traceback.print_exc(file=sys.stderr)
        msg = "필요한 분리 패키지가 없습니다. 엔진을 다시 켜 주세요." if isinstance(exc, ModuleNotFoundError) else str(exc)
        print(f"FMS_ERROR {msg}", flush=True)
        sys.exit(1)
