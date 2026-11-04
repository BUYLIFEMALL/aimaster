# LeVo 2 / SongGeneration 2(학술·연구·교육용) 곡 만들기 — 원본 levo-demo/LeVo 653cbcf generate.sh와 같은 환경으로 generate.py를 띄운다.
# 사용: python run_levo2.py <job.json>
# job.json: {"gtLyric"(엔진이 LeVo 형식으로 바꾼 가사), "descriptions", "bgm", "out", "srcDir", "modelDir", "vramGb"}
# 모델 폴더 이름은 원본 검사(지원 이름 4개)를 지나도록 songgeneration_base_full — v2-medium과 그래픽 메모리 조건이 같다(12GB/18GB).
import json
import os
import shutil
import subprocess
import sys
import tempfile


def stage(text):
    print(f"FMS_STAGE {text}", flush=True)


def main():
    with open(sys.argv[1], encoding="utf-8") as fp:
        job = json.load(fp)
    src = job["srcDir"]
    work = tempfile.mkdtemp(prefix="fms-levo2-")
    try:
        item = {"idx": "song", "gt_lyric": job["gtLyric"]}
        if job.get("descriptions"):
            item["descriptions"] = job["descriptions"]
        jsonl = os.path.join(work, "input.jsonl")
        with open(jsonl, "w", encoding="utf-8") as fp:
            fp.write(json.dumps(item, ensure_ascii=False) + "\n")
        env = dict(os.environ)
        sep = os.pathsep
        paths = [os.path.join(src, "codeclm", "tokenizer"), src, os.path.join(src, "codeclm", "tokenizer", "Flow1dVAE")]
        env["PYTHONPATH"] = sep.join(paths + [env.get("PYTHONPATH", "")])
        env["TRANSFORMERS_CACHE"] = os.path.join(src, "third_party", "hub")
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        env["OMP_NUM_THREADS"] = "1"
        env["MKL_NUM_THREADS"] = "1"
        # PyTorch 2.6부터 torch.load 기본이 weights_only=True라 원본의 tools/new_prompt.pt가 「Weights only load failed」로 막힌다
        # (2026-11-04 마스터PC). 이 파일은 판을 고정한 공식 lglg666/SongGeneration-Runtime에서 받은 것이라, LeVo 2 실행에서만 예전 방식으로 연다.
        env["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = "1"
        # 원본은 경로를 「/」로 잘라 모델 이름을 읽는다
        args = [sys.executable, "generate.py", "--ckpt_path", job["modelDir"].replace("\\", "/"), "--input_jsonl", jsonl, "--save_dir", os.path.join(work, "out"), "--generate_type", "bgm" if job.get("bgm") else "mixed"]
        if float(job.get("vramGb") or 0) < 24:
            args.append("--low_mem")
        stage("LeVo 2 · 곡 만드는 중")
        p = subprocess.Popen(args, cwd=src, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        for line in p.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
        if p.wait() != 0:
            print(f"FMS_ERROR LeVo 2가 곡을 만들지 못했습니다(코드 {p.returncode}).", flush=True)
            sys.exit(p.returncode or 1)
        made = os.path.join(work, "out", "audios", "song.flac")
        if not os.path.isfile(made):
            print("FMS_ERROR LeVo 2 결과 파일을 찾지 못했습니다.", flush=True)
            sys.exit(4)
        shutil.move(made, job["out"])
        print("FMS_DONE", flush=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
