# 모델 받기 — 엔진(pyengines.mjs)이 그 모델의 실행 환경 파이썬으로 띄운다.
# 사용: python fms_download.py <weights.json>
# weights.json: [{"repo": "...", "revision": "고정 판", "dir": "받을 폴더(없으면 HF_HOME 보관 폴더)", "allow": ["받을 파일 무늬"(없으면 전부)]}]
# 회원 본인 Hugging Face 토큰이 필요하면 엔진이 HF_TOKEN 환경 변수로 넘긴다(우리 서버로 보내지 않음).
import json
import os
import sys

from huggingface_hub import snapshot_download


def stage(text):
    print(f"FMS_STAGE {text}", flush=True)


def main():
    with open(sys.argv[1], encoding="utf-8") as fp:
        items = json.load(fp)
    token = os.environ.get("HF_TOKEN") or None
    for i, w in enumerate(items, 1):
        stage(f"모델 받는 중 {i}/{len(items)} · {w['repo']}")
        kwargs = {"repo_id": w["repo"], "revision": w["revision"], "token": token}
        if w.get("dir"):
            kwargs["local_dir"] = w["dir"]
        if w.get("allow"):
            kwargs["allow_patterns"] = w["allow"]  # 필요한 파일만(MiniMax Music 3: diffusers용 구성만)
        try:
            snapshot_download(**kwargs)
        except Exception as e:  # 잠긴 모델(약관 동의 전)·토큰 오류를 한국어로 알린다
            msg = str(e)
            if "401" in msg or "403" in msg or "gated" in msg.lower() or "restricted" in msg.lower():
                print(f"FMS_ERROR 모델을 받을 권한이 없습니다. Hugging Face에서 {w['repo']} 약관에 동의했는지, 토큰이 맞는지 확인해 주세요.", flush=True)
                sys.exit(3)
            raise
        if not w.get("dir"):
            # 고정 판으로 받으면 보관 폴더에 「main」 표시가 없다 — 원본 코드는 판 없이(main) 찾으므로,
            # 오프라인 실행(HF_HUB_OFFLINE)에서도 이 판을 찾게 main을 이 판으로 적어 둔다.
            from huggingface_hub import constants

            refs = os.path.join(constants.HF_HUB_CACHE, "models--" + w["repo"].replace("/", "--"), "refs")
            os.makedirs(refs, exist_ok=True)
            with open(os.path.join(refs, "main"), "w", encoding="utf-8") as fp:
                fp.write(w["revision"])
    print("FMS_DONE", flush=True)


if __name__ == "__main__":
    main()
