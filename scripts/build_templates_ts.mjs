import fs from 'node:fs';

const items = JSON.parse(fs.readFileSync('scripts/banana_full_templates.json', 'utf8'));

// TypeScript 파일로 변환
const tsContent = `// AI 올인원 그래픽 자동화 123종 전문 템플릿 데이터베이스
export interface TemplateField {
  id: string;
  label: string;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

export interface GraphicTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  template: string;
  fields: TemplateField[];
  usage: string;
  defaultStyle: string;
}

export const GRAPHIC_TEMPLATES: GraphicTemplate[] = ${JSON.stringify(items, null, 2)};
`;

fs.writeFileSync('allinone-graphic/src/lib/templates.ts', tsContent, 'utf8');
console.log('Generated allinone-graphic/src/lib/templates.ts with', items.length, 'templates');
