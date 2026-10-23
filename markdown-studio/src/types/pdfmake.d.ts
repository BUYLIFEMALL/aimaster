declare module "pdfmake/build/pdfmake" {
  // pdfmake 0.3 브라우저 빌드는 타입 선언이 없어 최소한만 선언한다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake: any;
  export default pdfMake;
}
