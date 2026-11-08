// 스타일 프리셋 — 원본 기능을 옮김(2026-11-03). 노래 43개·연주곡 42개, 프롬프트는 ACE-Step 스타일 칸에 그대로 넣는다.
// 회원이 저장한 「내 프리셋」은 DB 표 free_music_presets(회원별 RLS)에 두고 이 목록 앞에 붙인다.
// 판정·검사는 순수 함수 — 시험 tests/presets.test.mjs.

export type PresetMode = "vocal" | "instrumental";
export type Preset = { id: string; name: string; category: string; description: string; prompt: string; mode: PresetMode };
export type UserPreset = { id: string; name: string; prompt: string; mode: PresetMode; created_at: string };

export const PRESETS_TABLE = "free_music_presets";
export const PRESET_PAGE_SIZE = 6;
export const MY_PRESET_CATEGORY = "내 프리셋";
export const PRESET_LIMITS = { name: 40, prompt: 400, perUser: 50 } as const;

export const PRESETS: readonly Preset[] = [
  {"id":"ballad","name":"Ballad","category":"발라드","description":"감정을 담은 선율과 서정적인 보컬","prompt":"Pop ballad, expressive lead vocals","mode":"vocal"},
  {"id":"rock","name":"Rock","category":"록·메탈","description":"일렉트릭 기타와 힘 있는 밴드 사운드","prompt":"Rock song, lead vocals, electric guitars","mode":"vocal"},
  {"id":"metal","name":"Heavy Metal","category":"록·메탈","description":"묵직한 기타 리프와 강렬한 보컬","prompt":"Heavy metal song, powerful lead vocals","mode":"vocal"},
  {"id":"jazz","name":"Jazz","category":"재즈·블루스","description":"유연한 보컬과 색소폰의 재즈 선율","prompt":"Jazz song, lead vocals, saxophone","mode":"vocal"},
  {"id":"funk","name":"Funk","category":"소울·펑크","description":"리듬감 있는 보컬과 탄력 있는 그루브","prompt":"Funk song, lead vocals","mode":"vocal"},
  {"id":"dance","name":"Dance Pop","category":"댄스·일렉트로닉","description":"밝은 멜로디와 경쾌한 댄스 리듬","prompt":"Dance pop, melodic female vocals","mode":"vocal"},
  {"id":"synth-pop","name":"Synth Pop","category":"댄스·일렉트로닉","description":"신스 질감과 감성적인 보컬","prompt":"Emotional synth pop, female vocals","mode":"vocal"},
  {"id":"edm","name":"EDM","category":"댄스·일렉트로닉","description":"전자 비트와 반복되는 보컬 훅","prompt":"EDM, pulsing bass, electronic drums, vocal hooks","mode":"vocal"},
  {"id":"hiphop","name":"Hip-Hop / EDM","category":"힙합·알앤비","description":"랩과 전자 비트의 강한 추진력","prompt":"Hip hop and EDM, rap vocals, bass, drums","mode":"vocal"},
  {"id":"rnb","name":"R&B","category":"힙합·알앤비","description":"부드러운 보컬과 유연한 리듬","prompt":"Pop R&B, intimate melodic vocals, synth bass","mode":"vocal"},
  {"id":"soul","name":"Soul","category":"소울·펑크","description":"진솔한 목소리와 피아노·색소폰","prompt":"Southern soul, male vocals, piano, saxophone","mode":"vocal"},
  {"id":"lofi","name":"Lo-fi Pop","category":"힙합·알앤비","description":"차분한 비트와 피아노·플루트","prompt":"Gentle female vocals, piano, flute, downtempo lo-fi beat","mode":"vocal"},
  {"id":"city-pop","name":"City Pop","category":"팝·레트로","description":"도시적인 화성과 신스 베이스","prompt":"City pop song, vocals, synth bass, electric piano","mode":"vocal"},
  {"id":"disco","name":"Disco","category":"팝·레트로","description":"탄력 있는 베이스와 춤추기 좋은 리듬","prompt":"Disco, male vocals, electric guitar, bass, synthesizer","mode":"vocal"},
  {"id":"country","name":"Country","category":"포크·어쿠스틱","description":"기타와 피들 위의 담백한 노래","prompt":"Upbeat country, male vocals, guitar, fiddle","mode":"vocal"},
  {"id":"bluegrass","name":"Bluegrass","category":"포크·어쿠스틱","description":"밴조와 피들, 밝은 그룹 화음","prompt":"Bluegrass, group harmonies, banjo, fiddle, upright bass","mode":"vocal"},
  {"id":"gospel","name":"Gospel Bluegrass","category":"포크·어쿠스틱","description":"활기찬 어쿠스틱 합주와 힘 있는 노래","prompt":"Gospel bluegrass, male lead vocal, banjo, fiddle","mode":"vocal"},
  {"id":"flamenco-pop","name":"Flamenco Fusion","category":"월드·라틴","description":"기타와 카혼, 노래와 랩의 만남","prompt":"Flamenco fusion, female singing, male rap, guitar, cajon","mode":"vocal"},
  {"id":"reggaeton","name":"Reggaeton","category":"월드·라틴","description":"리드미컬한 보컬과 라틴 댄스 그루브","prompt":"Reggaeton song, alternating vocal verses","mode":"vocal"},
  {"id":"inst-jazz-trio","name":"재즈 트리오","category":"재즈·블루스","description":"피아노·더블베이스·브러시 드럼의 여유로운 스윙","prompt":"Instrumental jazz trio, acoustic upright bass, brushed drums, warm grand piano, subtle swing, slow relaxed tempo, intimate jazz club ambience","mode":"instrumental"},
  {"id":"inst-solo-piano","name":"클래식 피아노","category":"피아노·클래식","description":"흐르는 아르페지오와 서정적인 그랜드 피아노","prompt":"Instrumental classical solo piano, expressive grand piano, gentle flowing arpeggios, lyrical piano melody, warm concert hall, 76 BPM, nuanced dynamics","mode":"instrumental"},
  {"id":"rock-ballad","name":"Rock Ballad","category":"발라드","description":"잔잔한 절에서 힘차게 터지는 록 후렴","prompt":"Rock ballad, emotional lead vocal, arpeggiated electric guitar, powerful guitar chorus, live drums and bass","mode":"vocal"},
  {"id":"acoustic","name":"Acoustic","category":"포크·어쿠스틱","description":"기타와 목소리의 가까운 울림","prompt":"Acoustic song, natural intimate lead singing, fingerpicked guitar, gentle percussion and warm bass","mode":"vocal"},
  {"id":"folk-rock","name":"Folk Rock","category":"포크·어쿠스틱","description":"이야기하는 보컬과 어쿠스틱 밴드","prompt":"Folk rock, narrative lead vocals, acoustic strumming, electric guitar, bass and steady drums","mode":"vocal"},
  {"id":"indie-folk","name":"Indie Folk","category":"포크·어쿠스틱","description":"담백한 목소리와 작은 어쿠스틱 편성","prompt":"Indie folk, understated lead singing, fingerpicked guitar, soft piano and sparse percussion","mode":"vocal"},
  {"id":"reggae","name":"Reggae","category":"월드·라틴","description":"여유로운 오프비트와 둥근 베이스","prompt":"Reggae, warm lead vocals, offbeat guitar, organ, melodic bass and relaxed one drop drums","mode":"vocal"},
  {"id":"bossa-song","name":"Bossa Nova","category":"재즈·블루스","description":"나일론 기타와 부드러운 재즈 보컬","prompt":"Bossa nova song, intimate lead singing, nylon guitar, piano, upright bass and light brushes","mode":"vocal"},
  {"id":"swing-song","name":"Swing","category":"재즈·블루스","description":"경쾌한 스윙 리듬과 선명한 보컬","prompt":"Swing jazz song, expressive lead singing, piano, upright bass, drums and bright brass responses","mode":"vocal"},
  {"id":"blues-song","name":"Blues","category":"재즈·블루스","description":"기타의 응답과 깊은 블루스 보컬","prompt":"Blues song, soulful lead singing, electric guitar responses, organ, bass and shuffle drums","mode":"vocal"},
  {"id":"neo-soul","name":"Neo Soul","category":"소울·펑크","description":"느긋한 박자와 섬세한 화성","prompt":"Neo soul, nuanced lead singing, warm electric piano, rounded bass, relaxed drums and clean guitar","mode":"vocal"},
  {"id":"motown","name":"Motown","category":"소울·펑크","description":"풍성한 화음과 활기찬 소울 리듬","prompt":"Motown soul, expressive lead singing, backing harmonies, melodic bass, tambourine, drums and brass","mode":"vocal"},
  {"id":"pop-punk","name":"Pop Punk","category":"록·메탈","description":"빠른 기타와 힘찬 멜로디","prompt":"Pop punk, energetic melodic vocals, power chord guitars, fast drums and strong bass","mode":"vocal"},
  {"id":"kpop-idol","name":"K-Pop Idol Dance","category":"K-POP","description":"강한 훅과 칼군무 같은 비트","prompt":"K-pop idol dance track, catchy chorus hook, punchy electronic drums, synth bass, group vocals, 124 BPM","mode":"vocal"},
  {"id":"kpop-girl","name":"K-Pop Girl Group","category":"K-POP","description":"밝고 상큼한 걸그룹 팝","prompt":"K-pop girl group pop, bright female group vocals, playful synths, bouncy drums, sweet catchy chorus","mode":"vocal"},
  {"id":"kpop-summer","name":"Summer K-Pop","category":"K-POP","description":"청량한 기타와 시원한 여름 분위기","prompt":"Refreshing summer K-pop, clean electric guitar, bright synths, upbeat drums, airy group vocals, 120 BPM","mode":"vocal"},
  {"id":"ost-drama","name":"Drama OST","category":"OST·뮤지컬","description":"피아노와 현악이 감싸는 드라마 주제곡","prompt":"Korean drama OST ballad, emotional lead vocal, piano, lush strings, gradual build to a soaring chorus","mode":"vocal"},
  {"id":"ost-anime","name":"Anime Theme","category":"OST·뮤지컬","description":"힘차게 달리는 애니메이션 주제가","prompt":"Anime theme song, energetic lead vocal, driving rock band, bright strings, fast tempo, uplifting chorus","mode":"vocal"},
  {"id":"musical","name":"Musical Number","category":"OST·뮤지컬","description":"이야기를 노래하는 뮤지컬 넘버","prompt":"Musical theatre number, expressive storytelling lead vocal, orchestra, piano, dynamic build, big final chorus","mode":"vocal"},
  {"id":"kids-song","name":"Children's Song","category":"동요·CCM","description":"따라 부르기 쉬운 밝은 동요","prompt":"Children's song, cheerful simple melody, bright clear vocal, ukulele, glockenspiel, light percussion","mode":"vocal"},
  {"id":"ccm-worship","name":"Worship","category":"동요·CCM","description":"잔잔하게 시작해 벅차오르는 찬양","prompt":"Contemporary worship song, warm lead vocal, piano, ambient pads, building drums, congregational chorus","mode":"vocal"},
  {"id":"gospel-choir","name":"Gospel Choir","category":"동요·CCM","description":"힘 있는 리드와 합창단의 응답","prompt":"Gospel song, powerful lead vocal, choir responses, hammond organ, piano, handclaps","mode":"vocal"},
  {"id":"alternative-rock","name":"Alternative Rock","category":"록·메탈","description":"거친 기타와 역동적인 밴드","prompt":"Alternative rock, expressive lead vocals, textured electric guitars, bass and dynamic live drums","mode":"vocal"},
  {"id":"soft-rock","name":"Soft Rock","category":"록·메탈","description":"부드러운 밴드 반주와 긴 선율","prompt":"Soft rock, warm melodic lead singing, clean guitars, piano, bass and restrained drums","mode":"vocal"},
  {"id":"hard-rock","name":"Hard Rock","category":"록·메탈","description":"강한 리프와 시원한 록 보컬","prompt":"Hard rock, powerful lead singing, driving guitar riffs, firm bass and energetic live drums","mode":"vocal"},
  {"id":"dream-pop","name":"Dream Pop","category":"팝·레트로","description":"몽환적인 기타와 넓은 신스 공간","prompt":"Dream pop, airy melodic lead vocals, shimmering guitar, warm synth pads, bass and gentle drums","mode":"vocal"},
  {"id":"retro","name":"Retro Pop","category":"팝·레트로","description":"따뜻한 건반과 풍성한 화음","prompt":"Retro pop, clear lead singing, vocal harmonies, vintage electric piano, melodic bass and live drums","mode":"vocal"},
  {"id":"pop-dance","name":"Electropop","category":"댄스·일렉트로닉","description":"선명한 신스 훅과 탄력 있는 보컬","prompt":"Electropop, catchy sung chorus, bright synthesizers, electronic drums and punchy bass","mode":"vocal"},
  {"id":"vocal-house","name":"Vocal House","category":"댄스·일렉트로닉","description":"피아노 코드와 힘 있는 댄스 보컬","prompt":"Vocal house, soulful lead singing, rhythmic piano chords, steady kick, deep bass and crisp hi hats","mode":"vocal"},
  {"id":"liquid-dnb-vocal","name":"Liquid Drum & Bass","category":"댄스·일렉트로닉","description":"빠른 드럼과 부드러운 보컬 선율","prompt":"Liquid drum and bass, flowing melodic vocals, rolling breakbeats, warm sub bass and piano","mode":"vocal"},
  {"id":"trip-hop","name":"Trip Hop","category":"힙합·알앤비","description":"느린 비트와 어두운 공간감","prompt":"Trip hop, intimate lead singing, slow breakbeats, deep bass, electric piano and atmospheric synths","mode":"vocal"},
  {"id":"latin-pop","name":"Latin Pop","category":"월드·라틴","description":"어쿠스틱 기타와 밝은 라틴 리듬","prompt":"Latin pop, melodic lead singing, acoustic guitar, warm bass, lively percussion and memorable chorus","mode":"vocal"},
  {"id":"synth-ballad","name":"Synth Ballad","category":"발라드","description":"신스 패드와 감성적인 팝 선율","prompt":"Synth pop ballad, emotional lead singing, gentle keyboard arpeggios, warm synth pads and soft drums","mode":"vocal"},
  {"id":"piano-ballad","name":"Piano Ballad","category":"발라드","description":"피아노 중심의 절제된 감정선","prompt":"Piano ballad, intimate expressive lead singing, grand piano, gentle strings and gradual dynamic build","mode":"vocal"},
  {"id":"80s-foxtrot","name":"80s Foxtrot (트로트풍)","category":"팝·레트로","description":"복고적인 리듬과 친숙한 선율","prompt":"male voice, trot, korean trot, with rock, slow tempo, 80s fox trot","mode":"vocal"},
  {"id":"inst-downtempo","name":"Downtempo Electronic","category":"일렉트로닉·비트","description":"느린 전자 비트와 따뜻한 신스","prompt":"Downtempo electronic music, relaxed breakbeat, warm electric piano, rounded bass and textured synthesizers, evolving melodic hook and a spacious controlled mix","mode":"instrumental"},
  {"id":"inst-ambient","name":"Ambient","category":"앰비언트·휴식","description":"긴 잔향과 천천히 변하는 화성","prompt":"Instrumental ambient, spacious synth pads, sparse piano notes, gentle harmonic movement and a calm ending","mode":"instrumental"},
  {"id":"inst-lofi","name":"Lo-fi Beats","category":"일렉트로닉·비트","description":"차분한 비트와 전기 피아노","prompt":"Instrumental lo-fi beats, mellow electric piano, soft drums, warm bass and subtle tape texture","mode":"instrumental"},
  {"id":"inst-synthwave","name":"Synthwave","category":"일렉트로닉·비트","description":"복고 신스와 밤의 드라이브","prompt":"Instrumental synthwave, analog lead melody, pulsing bass, electronic drums and warm synth chords","mode":"instrumental"},
  {"id":"inst-house","name":"House","category":"댄스·클럽","description":"피아노 코드와 규칙적인 킥","prompt":"Instrumental house, rhythmic piano chords, steady kick, deep bass and bright percussion","mode":"instrumental"},
  {"id":"inst-trance","name":"Trance","category":"댄스·클럽","description":"긴 신스 선율과 상승하는 에너지","prompt":"Instrumental trance, soaring synth melody, rolling bass, electronic drums and a spacious breakdown","mode":"instrumental"},
  {"id":"inst-techno","name":"Techno","category":"댄스·클럽","description":"반복되는 시퀀스와 강한 박동","prompt":"Instrumental techno, sequenced synthesizers, driving kick, pulsing bass and evolving percussion","mode":"instrumental"},
  {"id":"inst-chillout","name":"Chillout","category":"앰비언트·휴식","description":"부드러운 전자음과 여유로운 리듬","prompt":"Instrumental chillout, gentle synth melody, electric piano, relaxed bass and light electronic drums","mode":"instrumental"},
  {"id":"inst-bossa","name":"Bossa Nova","category":"재즈·블루스","description":"나일론 기타와 가벼운 브러시","prompt":"Instrumental bossa nova, nylon guitar melody, piano, upright bass and delicate brushed drums","mode":"instrumental"},
  {"id":"inst-swing","name":"Swing","category":"재즈·블루스","description":"피아노와 관악기의 경쾌한 스윙","prompt":"Instrumental swing, piano, clarinet, upright bass, brass accents and lively drums","mode":"instrumental"},
  {"id":"inst-big-band","name":"Big Band","category":"재즈·블루스","description":"풍성한 금관과 색소폰의 합주","prompt":"Instrumental big band jazz, saxophones, trumpets, trombones, piano, bass and swinging drums","mode":"instrumental"},
  {"id":"inst-blues","name":"Blues Guitar","category":"재즈·블루스","description":"블루스 기타와 느긋한 셔플","prompt":"Instrumental blues, expressive electric guitar, organ, bass and relaxed shuffle drums","mode":"instrumental"},
  {"id":"inst-funk","name":"Funk","category":"펑크·밴드","description":"리듬 기타와 베이스의 맞물림","prompt":"Instrumental funk, syncopated bass, clipped guitar chords, tight drums and brass accents","mode":"instrumental"},
  {"id":"inst-jazz-fusion","name":"Jazz Fusion","category":"재즈·블루스","description":"전기 악기와 유연한 재즈 그루브","prompt":"Instrumental jazz fusion, electric piano, melodic guitar, electric bass and syncopated live drums","mode":"instrumental"},
  {"id":"inst-smooth-jazz","name":"Smooth Jazz","category":"재즈·블루스","description":"색소폰과 부드러운 전기 피아노","prompt":"Instrumental smooth jazz, warm saxophone melody, electric piano, bass and restrained drums","mode":"instrumental"},
  {"id":"inst-jazz-waltz","name":"Jazz Waltz","category":"재즈·블루스","description":"세 박자로 흐르는 피아노 트리오","prompt":"Instrumental jazz waltz, lyrical piano, upright bass and brushed drums in flowing triple meter","mode":"instrumental"},
  {"id":"inst-strings","name":"String Ensemble","category":"피아노·클래식","description":"현악기가 주고받는 서정적인 선율","prompt":"Instrumental string ensemble, violins, viola and cello, lyrical melody and balanced harmonic development","mode":"instrumental"},
  {"id":"inst-orchestral","name":"Orchestral","category":"오케스트라·영화","description":"관현악의 폭넓은 음색과 고조","prompt":"Instrumental orchestral music, strings, woodwinds, brass and timpani, developed main theme and dynamic finale","mode":"instrumental"},
  {"id":"inst-chamber","name":"Chamber Music","category":"피아노·클래식","description":"작은 편성의 섬세한 음악적 대화","prompt":"Instrumental chamber music, piano, violin and cello, expressive melodic dialogue and natural acoustic space","mode":"instrumental"},
  {"id":"inst-piano-strings","name":"Piano & Strings","category":"피아노·클래식","description":"피아노 선율을 감싸는 현악기","prompt":"Instrumental piano and strings, lyrical grand piano, warm string accompaniment and a gentle dynamic arc","mode":"instrumental"},
  {"id":"inst-classical-guitar","name":"Classical Guitar","category":"어쿠스틱·기타","description":"나일론 기타의 맑고 깊은 울림","prompt":"Instrumental classical guitar, lyrical nylon string melody, flowing arpeggios and warm acoustic resonance","mode":"instrumental"},
  {"id":"inst-acoustic","name":"Acoustic Guitar","category":"어쿠스틱·기타","description":"스틸 기타의 담백한 선율","prompt":"Instrumental acoustic guitar, fingerpicked melody, warm bass notes and natural wooden resonance","mode":"instrumental"},
  {"id":"inst-acoustic-band","name":"Acoustic Band","category":"어쿠스틱·기타","description":"기타와 피아노의 작은 밴드","prompt":"Instrumental acoustic band, steel string guitar, gentle piano, bass and light hand percussion","mode":"instrumental"},
  {"id":"inst-folk","name":"Acoustic Folk","category":"어쿠스틱·기타","description":"포크 기타와 바이올린의 흐름","prompt":"Instrumental folk, acoustic guitar, lyrical violin, upright bass and light percussion","mode":"instrumental"},
  {"id":"inst-rock","name":"Rock Band","category":"펑크·밴드","description":"기타 리프가 이끄는 록 밴드","prompt":"Instrumental rock, melodic electric guitar, driving riffs, bass and energetic live drums","mode":"instrumental"},
  {"id":"inst-rock-ballad","name":"Rock Ballad","category":"펑크·밴드","description":"기타 선율과 점진적인 밴드 고조","prompt":"Instrumental rock ballad, expressive lead guitar, clean arpeggios, bass and drums, a powerful melodic reprise","mode":"instrumental"},
  {"id":"inst-post-rock","name":"Post Rock","category":"펑크·밴드","description":"겹쳐지는 기타와 천천히 커지는 에너지","prompt":"Instrumental post rock, interlocking guitar melodies, bass and patient drums, gradual build and resolved ending","mode":"instrumental"},
  {"id":"inst-surf-rock","name":"Surf Rock","category":"펑크·밴드","description":"리버브 기타와 빠른 리듬","prompt":"Instrumental surf rock, bright reverb guitar, energetic bass and driving live drums","mode":"instrumental"},
  {"id":"inst-reggae","name":"Reggae","category":"라틴·리듬","description":"기타 오프비트와 여유로운 베이스","prompt":"Instrumental reggae, offbeat guitar, warm organ melody, rounded bass and relaxed drums","mode":"instrumental"},
  {"id":"inst-disco","name":"Disco","category":"댄스·클럽","description":"리듬 기타와 풍성한 스트링","prompt":"Instrumental disco, rhythmic guitar, octave bass, string melodies and steady dance drums","mode":"instrumental"},
  {"id":"inst-latin","name":"Latin Band","category":"라틴·리듬","description":"피아노와 기타, 활기찬 타악기","prompt":"Instrumental Latin band, piano, acoustic guitar, melodic bass, congas and bright brass","mode":"instrumental"},
  {"id":"inst-samba","name":"Samba","category":"라틴·리듬","description":"밝은 기타와 경쾌한 타악 리듬","prompt":"Instrumental samba, acoustic guitar melody, piano, bass and lively Brazilian percussion","mode":"instrumental"},
  {"id":"inst-tango","name":"Tango","category":"라틴·리듬","description":"아코디언과 바이올린의 극적인 선율","prompt":"Instrumental tango, accordion, violin, piano and double bass, accented rhythm and lyrical contrast","mode":"instrumental"},
  {"id":"inst-cinematic","name":"Cinematic","category":"오케스트라·영화","description":"장면을 따라 전개되는 영화음악","prompt":"Instrumental cinematic score, piano, strings, brass and percussion, evolving theme and a natural dramatic resolution","mode":"instrumental"},
  {"id":"inst-epic","name":"Epic Orchestra","category":"오케스트라·영화","description":"금관과 타악기가 만드는 웅장함","prompt":"Instrumental epic orchestral score, heroic brass, sweeping strings and strong percussion, contrasting quiet passage and finale","mode":"instrumental"},
  {"id":"inst-mystery","name":"Mystery Score","category":"오케스트라·영화","description":"짧은 피아노 동기와 긴장감","prompt":"Instrumental mystery score, sparse piano, low strings, clarinet and restrained percussion, developing melodic tension","mode":"instrumental"},
  {"id":"inst-ambient-guitar","name":"Ambient Guitar","category":"앰비언트·휴식","description":"기타의 잔향과 느린 화성 변화","prompt":"Instrumental ambient guitar, clean delay melodies, soft volume swells and slowly changing harmonies","mode":"instrumental"},
  {"id":"inst-liquid-dnb","name":"Liquid Drum & Bass","category":"일렉트로닉·비트","description":"빠른 브레이크와 부드러운 멜로디","prompt":"Instrumental liquid drum and bass, fast rolling breakbeats, warm sub bass, piano and smooth synth melody","mode":"instrumental"},
  {"id":"inst-breakbeat","name":"Breakbeat","category":"일렉트로닉·비트","description":"엇박 드럼과 선명한 베이스","prompt":"Instrumental breakbeat, syncopated electronic drums, strong bass and rhythmic synthesizer motifs","mode":"instrumental"},
  {"id":"inst-piano-waltz","name":"Piano Waltz","category":"피아노·클래식","description":"세 박자의 우아한 피아노 선율","prompt":"Instrumental piano waltz, lyrical grand piano melody, flowing triple meter and expressive dynamic phrasing","mode":"instrumental"},
];

/** 이 모드(노래·연주곡)에서 보일 프리셋 — 내 프리셋이 맨 앞 */
export function presetsFor(mode: PresetMode, mine: UserPreset[] = []): Preset[] {
  const own = mine
    .filter((p) => p.mode === mode)
    .map((p) => ({ id: `my:${p.id}`, name: p.name, category: MY_PRESET_CATEGORY, description: "내가 저장한 스타일", prompt: p.prompt, mode: p.mode }));
  return [...own, ...PRESETS.filter((p) => p.mode === mode)];
}

/** 나온 순서대로 분류 이름 */
export function presetCategories(list: Preset[]): string[] {
  return [...new Set(list.map((p) => p.category))];
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PRESET_PAGE_SIZE));
}

/** 내 프리셋 저장 입력 검사 */
export function parsePresetInput(body: unknown): { ok: true; value: { name: string; prompt: string; mode: PresetMode } } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  const mode: PresetMode = b.mode === "instrumental" ? "instrumental" : "vocal";
  if (!name) return { ok: false, error: "프리셋 이름을 적어 주세요." };
  if (name.length > PRESET_LIMITS.name) return { ok: false, error: `프리셋 이름은 ${PRESET_LIMITS.name}자까지 쓸 수 있습니다.` };
  if (!prompt) return { ok: false, error: "저장할 스타일이 비어 있습니다. 스타일 칸을 먼저 채워 주세요." };
  if (prompt.length > PRESET_LIMITS.prompt) return { ok: false, error: `스타일은 ${PRESET_LIMITS.prompt}자까지 저장할 수 있습니다.` };
  return { ok: true, value: { name, prompt, mode } };
}

/**
 * 프리셋을 누르기 전에 물어볼지(2026-11-09 주인님 「그렇게 물어보게 고쳐줘」) — 스타일 칸에 글이 있고,
 * 그 글이 어떤 프리셋 글과도 같지 않으면(직접 쓰거나 고친 글) 덮어쓰기 전에 묻는다. 프리셋끼리 바꿀 때는 묻지 않는다.
 */
export function needsStyleConfirm(style: string, list: readonly Pick<Preset, "prompt">[]): boolean {
  const s = style.trim();
  return !!s && !list.some((p) => p.prompt.trim() === s);
}

/**
 * 프리셋 글 끝에 위에서 고른 태그(세부 장르·분위기·빠르기·목소리)를 붙인다(2026-11-09 주인님 「그렇게 자동으로 붙이게 고쳐줘」).
 * 이미 들어 있는 태그는 다시 붙이지 않고, 한도(max)를 넘으면 뒤쪽 태그부터 뺀다.
 */
export function withTags(prompt: string, tags: string, max: number): string {
  const base = prompt.trim();
  const have = base.toLowerCase();
  const add = [...new Set(tags.split(",").map((t) => t.trim()).filter(Boolean))].filter((t) => !have.includes(t.toLowerCase()));
  while (add.length) {
    const out = `${base}, ${add.join(", ")}`;
    if (out.length <= max) return out;
    add.pop();
  }
  return base.slice(0, max);
}
