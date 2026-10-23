// Registers every block renderer and database view. Any file named *.block.tsx (blocks) or *.view.tsx
// (database views) under src/features is picked up automatically — add new types without editing this file.
// Non-text blocks live in editor/blocks/*.block.tsx.
import './icons.tsx';
import './blocks.css';
import './TextBlocks.tsx';
import '../../database/DatabaseBlock.tsx';
import '../atoms.ts';

// 이식판: 원본의 import.meta.glob 두 줄 대신, 빌드 전에 scripts/gen-registry.mjs가 같은 목록을 만든다.
import './registry.generated.ts';
