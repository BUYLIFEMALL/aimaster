export interface Named { id: string; name: string; prompt: string }

/** 처리 방식(복수 선택). 업스케일은 별도 파이프라인(AI 선명화 + 서버 확대)이다. */
export const PROCESSES: Named[] = [
  { id: "restore", name: "복원", prompt: "Restore this image to high quality, fixing any scratches, noise or imperfections." },
  { id: "colorize", name: "컬러화", prompt: "Colorize this black and white image with realistic and vibrant colors." },
  { id: "sketchcolor", name: "채색하기(스케치전용)", prompt: "Colorize this sketch or line drawing with vibrant and fitting colors, bringing it to life as a full-color illustration." },
  { id: "upscale", name: "업스케일", prompt: "Dramatically enhance the sharpness, resolution, and all fine details of this image. Redraw it with extreme clarity, making every texture crisp as if it were shot with a professional, super-high-resolution camera." },
];

/** 스타일 변환 20종 */
export const STYLES: Named[] = [
  { id: "figure", name: "피규어", prompt: "Recreate the entire scene as a photograph of a detailed plastic toy figure diorama." },
  { id: "diorama", name: "디오라마", prompt: "Recreate the entire scene as a hyper-realistic, handcrafted diorama." },
  { id: "miniature", name: "미니어처", prompt: "Recreate the entire scene as a miniature tilt-shift style photograph, making it look like a tiny model world." },
  { id: "pixel", name: "픽셀 아트", prompt: "Convert the entire image into a detailed 16-bit pixel art style, preserving the composition." },
  { id: "wool", name: "양모 인형", prompt: "Recreate the entire scene and its subjects as if they were made from felted wool in a doll diorama." },
  { id: "clay", name: "클레이메이션", prompt: "Recreate the entire scene as a high-quality stop-motion claymation still." },
  {
    id: "realistic", name: "실사화",
    prompt: `[SYSTEM COMMAND: CINEMATIC REALISM TRANSFORMATION]
[TASK] You are a VFX artist tasked with converting a 2D illustration (webtoon, anime) into a photorealistic, live-action film scene.
[PRIMARY DIRECTIVE] Your absolute priority is to PRESERVE the original image's core elements while completely REPLACING the artistic style.
[RULES OF PRESERVATION - WHAT YOU MUST KEEP]
- Composition & Framing: The layout of the scene must remain identical.
- Characters & Poses: The subjects' positions, poses, and expressions must be perfectly replicated.
- Mood & Atmosphere: The emotional tone of the original scene must be maintained.
[RULES OF TRANSFORMATION - WHAT YOU MUST CHANGE]
- ART STYLE (DESTROY & REPLACE): Completely discard the original art style (line art, cell-shading, cartoon features). The output MUST NOT look like a drawing.
- RENDERING (REPLACE WITH REALISM): Re-render every element with photorealistic textures, complex real-world lighting, and natural physics. The final output must look like a high-resolution still frame from a professionally shot movie.
[FAILURE CONDITION] Any output that retains a "drawn" or "illustrated" look is a complete failure of the task.`,
  },
  { id: "paper", name: "페이퍼 아트", prompt: "Recreate the entire image as an intricate, multi-layered paper art craft scene." },
  { id: "sticker", name: "스티커", prompt: "Create a die-cut sticker of the main subject from the image. The sticker should have a thick white vinyl border and a slight glossy effect. The art style should be simplified and cute (chibi if applicable). The background MUST be solid white." },
  { id: "logo", name: "로고", prompt: "Transform the primary subject of the image into a modern, minimalist vector logo. The design must be simple, clean, and iconic, suitable for branding. Use a limited color palette. The final logo must be centered on a solid white background." },
  { id: "minimal", name: "미니멀리스트", prompt: "Recreate the entire image in an extreme minimalist art style. Use a very limited and muted color palette, simple geometric shapes, and a significant amount of negative space to represent the scene. Focus only on the most essential forms." },
  { id: "stained", name: "스테인드글라스", prompt: "Recreate the entire scene as a vibrant stained glass window with thick black lead lines." },
  { id: "embroidery", name: "자수", prompt: "Transform the entire image into a detailed embroidery piece, emphasizing the texture of the thread and fabric." },
  { id: "blueprint", name: "청사진", prompt: "Convert the entire scene into a classic blueprint-style technical drawing on blue paper with white lines." },
  { id: "mosaic", name: "모자이크", prompt: "Recreate the entire scene as a detailed mosaic made of small, colorful ceramic tiles." },
  { id: "voxel", name: "복셀 아트", prompt: "Transform the entire image into a 3D voxel art style, as if built from colorful cubes." },
  { id: "oil", name: "유화", prompt: "Recreate the entire scene as a classical oil painting with rich textures and visible brushstrokes." },
  { id: "pencil", name: "연필 스케치", prompt: "Convert the entire image into a detailed, hand-drawn pencil sketch on textured paper." },
  { id: "neon", name: "네온사인", prompt: "Transform the main subjects of the image into glowing neon signs against a dark brick wall background." },
  { id: "sumuk", name: "한국수묵화", prompt: "Recreate the entire scene in the style of traditional Korean ink wash painting (Sumukhwa), emphasizing minimalist composition and expressive brushstrokes on Hanji paper." },
];

/** 스타일별 재질·질감 지침(프롬프트 제안용) */
export const MATERIALS: Record<string, string> = {
  figure: "Describe the entire scene as a diorama composed of detailed 'plastic', 'PVC', or 'die-cast alloy' action figures. Include textures like smooth or matte surfaces, seam lines, joints, and meticulous paintwork.",
  diorama: "Emphasize that everything is a hyper-realistic, handcrafted diorama. Meticulously describe the textures of real materials like moss, soil, grass, wood, and fabric to maximize the feel of a miniature world.",
  miniature: "Describe it as if shot with a tilt-shift lens, making the real world look like a toy model. Express extremely shallow depth of field and increase saturation to give it a 'plastic' toy feel.",
  wool: "Describe the scene as a puppet show set made of 'wool felt'. Emphasize the soft, fuzzy fiber texture and the slightly clumsy silhouette created by needle felting.",
  paper: "Describe the scene as an intricate papercraft (quilling art) made by cutting, folding, and rolling multiple layers of colored paper or cardstock. Emphasize the 3D feel through paper cut edges and depth from shadows.",
  sticker: "Make the subject a die-cut sticker made of shiny vinyl with a thick white border. Describe its glossy surface along with a simplified graphic style.",
  clay: "Describe the entire scene as a still from a stop-motion animation made of polymer clay or plasticine. Include handmade traces like fingerprints or tool marks.",
  stained: "Describe the scene as a vibrant stained glass window. Emphasize the thick black lead lines separating color fields and the luminous, translucent quality of the glass with light shining through it.",
  embroidery: "Describe the scene as a detailed embroidery piece on a fabric canvas. Emphasize the texture of thread, using terms like satin stitch, cross-stitch, and french knots.",
  blueprint: "Convert the scene into a technical blueprint. The background MUST be blue paper, and all elements precise white lines and schematics, with technical annotations or measurement lines.",
  mosaic: "Recreate the scene as a mosaic made from small distinct tiles (tesserae) of ceramic or glass. Emphasize the grid-like pattern and the grout between the tiles.",
  voxel: "Transform the entire scene into a 3D world made of voxels (3D cubes). Describe all objects and characters as constructed from blocks, with a geometric, pixelated 3D look.",
  oil: "Describe the scene as a classical oil painting on canvas. Emphasize rich textures, visible brushstrokes, and the glossy impasto effect. The lighting should be dramatic, like a Rembrandt painting.",
  pencil: "Convert the scene into a hand-drawn pencil sketch on textured paper. Describe shading techniques like cross-hatching, stippling, and blending, with different graphite pencils for line weights.",
  neon: "Transform the main subjects into glowing neon light tubes. Describe vibrant luminous colors and the glow against a dark brick wall at night.",
  sumuk: "Recreate the scene in the style of traditional Korean ink wash painting (Sumukhwa) with a brush and black ink on Hanji paper. Describe minimalist composition, empty space (yeobaek), expressive calligraphic brushstrokes, and subtle gradations of ink tone (meok).",
};

export interface Category { id: string; name: string; template: string }

/** 이미지 생성 카테고리 11종: 프롬프트 제안 템플릿 */
export const CATEGORIES: Category[] = [
  { id: "default", name: "기본", template: "" },
  { id: "realistic", name: "사실적인 사진", template: "You are a world-class photographer and prompt engineer. Follow the 'Realistic Photo Template': A realistic [Shot Type] of [Subject], [Action or Expression], in [Environment]. The scene is lit with [Lighting Description], creating a [Mood/Atmosphere]. Shot on a [Camera/Lens Details], highlighting [Key Textures and Details]." },
  { id: "food", name: "음식 사진", template: "You are a top food photographer. Follow the 'Food Photo Template': Dramatic close-up shot of [Food], [Cooked State]. Placed in [Setting/Plating], with [Specific Ingredient] emphasized. Lit with [Lighting Style] to accentuate [Texture]. Shot on a professional DSLR, macro lens." },
  { id: "architecture", name: "건축 사진", template: "You are a renowned architectural photographer. Follow the 'Architectural Photo Template': Dramatic wide-angle shot of a [Building Type] at [Time of Day], in a [Architectural Style] style. Located in [Environment]. [Key Architectural Element] is highlighted under [Lighting Conditions]. Shot on a professional camera, wide-angle lens, long exposure." },
  { id: "fantasy", name: "판타지 아트", template: "You are a digital fantasy artist. Follow the 'Fantasy Art Template': An epic digital painting of [Subject], in a [Mood/Atmosphere] mood. They are [Key Action] against a backdrop of [Background]. Featuring a [Color Palette] and [Magical Effects]. Highly detailed, cinematic." },
  { id: "watercolor", name: "수채화", template: "You are a watercolor artist. Follow the 'Watercolor Template': A delicate watercolor painting of [Subject], [Style]. Soft [Colors] bleed onto the paper. Wet-on-wet technique, loose and expressive brushstrokes. Textured watercolor paper background." },
  { id: "3d", name: "3D 렌더", template: "You are a 3D rendering artist. Follow the '3D Render Template': A realistic 3D render of [Subject], [Style]. Featuring [Materials] and [Textures]. Rendered under [Lighting Setup]. Octane render, Cinema 4D, highly detailed and photorealistic." },
  { id: "vector", name: "벡터 일러스트", template: "You are a professional vector illustrator. Follow the 'Vector Illustration Template': A flat vector illustration of [Subject], [Style]. Using [Key Features] and a limited [Color Palette]. Clean lines, geometric shapes, no shadows. Adobe Illustrator style." },
  { id: "sticker", name: "스티커", template: "You are a professional sticker designer. Follow the 'Sticker Design Template': A [Style] sticker of [Subject], featuring [Key Features] and a [Color Palette]. The design should have [Line Style] and [Shading Style]. The background should be white." },
  { id: "logo", name: "로고", template: "You are a branding expert and logo designer. Follow the 'Logo Design Template': Create a [Image Type] for [Brand/Concept]. The text \"[Text to Render]\" should be displayed in a [Font Style]. The design should be [Style Description], using a [Color Scheme]. Clearly instruct the text rendering." },
  { id: "minimalist", name: "미니멀리스트", template: "You are a minimalist design expert. Follow the 'Minimalist Design Template': A minimalist composition with a single [Subject] placed in the [bottom right/top left/etc.] of the frame. The background is a vast, empty [Color] canvas, creating significant negative space. Soft, subtle lighting." },
];

export function processById(id: string): Named | undefined { return PROCESSES.find((p) => p.id === id); }
export function styleById(id: string): Named | undefined { return STYLES.find((s) => s.id === id); }
export function categoryById(id: string): Category { return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]; }
