// v1.22 맥 「영상 만들기」 느림 대책(PLAN_20261024_EDIT_RENDER_SPEED.md §8) — @remotion/media는 디코더 하드웨어 설정을 넘길 방법이 없어,
// 렌더하는 동안만 브라우저 VideoDecoder.configure를 감싸 소프트웨어 디코딩을 요청한다. 돌려놓는 함수를 돌려준다(렌더 끝에 꼭 부른다).
export function preferSoftwareDecoding(): () => void {
  if (typeof VideoDecoder === "undefined") return () => {};
  const proto = VideoDecoder.prototype;
  const original = proto.configure;
  proto.configure = function (this: VideoDecoder, config: VideoDecoderConfig) {
    return original.call(this, { ...config, hardwareAcceleration: "prefer-software" });
  };
  return () => {
    proto.configure = original;
  };
}
