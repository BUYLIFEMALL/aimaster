async function check() {
  const res = await fetch('https://ai-slide-builder.buylife.xyz');
  const html = await res.text();
  const scriptMatches = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)].map(m => m[1]);
  console.log('Scripts count:', scriptMatches.length);
  let foundVersion = false;
  let foundMajin = false;
  let foundKimura = false;
  let foundGptPark = false;
  for (const src of scriptMatches) {
    const sRes = await fetch('https://ai-slide-builder.buylife.xyz' + src);
    const text = await sRes.text();
    if (text.includes('v1.05')) foundVersion = true;
    if (text.includes('Majin')) foundMajin = true;
    if (text.includes('Kimura')) foundKimura = true;
    if (text.includes('GPT PARK')) foundGptPark = true;
  }
  console.log({ foundVersion, foundMajin, foundKimura, foundGptPark });
}
check();
