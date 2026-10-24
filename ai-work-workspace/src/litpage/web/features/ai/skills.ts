import { tx } from '../shell/i18n.ts';

// Skill definitions and prompt text are kept in sync with the server's skill catalog.

export type SkillId =
  | 'continue' | 'summarize' | 'action_items' | 'translate' | 'explain' | 'improve' | 'proofread'
  | 'shorter' | 'longer' | 'tone' | 'simplify' | 'brainstorm' | 'outline' | 'email' | 'agenda'
  | 'table' | 'flowchart' | 'reformat' | 'html' | 'custom';

export interface SkillItem {
  id: SkillId;
  label: string;
  icon: string;
  mode: 'edit' | 'generate';
  
  topic?: string;
  submenu?: 'tone' | 'language';
  keywords?: string[];
}

export const SKILL: Record<SkillId, SkillItem> = {
  continue: { id: 'continue', label: tx('Continue writing'), icon: 'pencil', mode: 'generate', keywords: ['continue', 'write more'] },
  summarize: { id: 'summarize', label: tx('Summarize'), icon: 'textJustifyLeft', mode: 'generate', keywords: ['summary', 'tldr'] },
  action_items: { id: 'action_items', label: tx('Surface action items'), icon: 'checklist', mode: 'generate', keywords: ['todo', 'tasks', 'action'] },
  translate: { id: 'translate', label: tx('Translate'), icon: 'translate', mode: 'edit', submenu: 'language', keywords: ['language'] },
  explain: { id: 'explain', label: tx('Explain'), icon: 'questionMark', mode: 'generate', keywords: ['explain this', 'what'] },
  improve: { id: 'improve', label: tx('Improve writing'), icon: 'wand', mode: 'edit', keywords: ['better', 'rewrite'] },
  proofread: { id: 'proofread', label: tx('Proofread'), icon: 'check', mode: 'edit', keywords: ['fix spelling & grammar', 'spelling', 'grammar', 'typo'] },
  shorter: { id: 'shorter', label: tx('Make shorter'), icon: 'minimize', mode: 'edit', keywords: ['shorten', 'concise'] },
  longer: { id: 'longer', label: tx('Make longer'), icon: 'maximize', mode: 'edit', keywords: ['expand', 'lengthen'] },
  tone: { id: 'tone', label: tx('Change tone'), icon: 'sliders', mode: 'edit', submenu: 'tone', keywords: ['voice', 'style'] },
  simplify: { id: 'simplify', label: tx('Simplify language'), icon: 'sparkle', mode: 'edit', keywords: ['simple', 'plain'] },
  brainstorm: { id: 'brainstorm', label: tx('Brainstorm ideas'), icon: 'lightning', mode: 'generate', topic: 'Brainstorm ideas about…' },
  outline: { id: 'outline', label: tx('Sketch an outline'), icon: 'listBullet', mode: 'generate', topic: 'Sketch an outline for…' },
  email: { id: 'email', label: tx('Compose an email'), icon: 'mail', mode: 'generate', topic: 'Compose an email about…' },
  agenda: { id: 'agenda', label: tx('Build a meeting agenda'), icon: 'calendar', mode: 'generate', topic: 'Build a meeting agenda for…' },
  table: { id: 'table', label: tx('Make a table'), icon: 'viewTable', mode: 'generate', topic: 'Make a table about…' },
  flowchart: { id: 'flowchart', label: tx('Make a flowchart'), icon: 'whaleTail', mode: 'generate', topic: 'Make a flowchart of…' },
  reformat: { id: 'reformat', label: tx('Reformat'), icon: 'textJustifyLeft', mode: 'edit', keywords: ['format', 'structure'] },
  html: { id: 'html', label: tx('Build with AI'), icon: 'code', mode: 'generate', topic: 'Describe what to build…' },
  custom: { id: 'custom', label: tx('Ask AI'), icon: 'aiFace', mode: 'generate' },
};


export function skillFromLabel(label: string | undefined | null): SkillId | null {
  if (!label) return null;
  const l = label.trim().toLowerCase();
  if ((SKILL as Record<string, SkillItem>)[l]) return l as SkillId;
  for (const s of Object.values(SKILL)) if (s.label.toLowerCase() === l || s.keywords?.includes(l)) return s.id;
  if (l === 'fix spelling and grammar' || l === 'fix spelling & grammar') return 'proofread';
  if (l === 'explain this') return 'explain';
  return null;
}


export const TONES = ['Professional', 'Casual', 'Straightforward', 'Confident', 'Friendly'];


export const LANGUAGES = [
  'English', 'Korean', 'Chinese, Simplified', 'Chinese, Traditional', 'Japanese', 'Spanish', 'Russian', 'French',
  'Portuguese', 'German', 'Italian', 'Dutch', 'Indonesian', 'Filipino', 'Vietnamese', 'Arabic', 'Hebrew',
];


export function writerSections(selection: boolean): { title: string; items: SkillId[] }[] {
  if (selection) {
    return [
      { title: tx('Edit'), items: ['improve', 'proofread', 'shorter', 'longer', 'tone', 'simplify', 'reformat'] },
      { title: tx('Think'), items: ['summarize', 'explain', 'action_items', 'translate', 'continue'] },
    ];
  }
  return [
    { title: tx('Suggested'), items: ['continue', 'summarize', 'action_items', 'translate'] },
    { title: tx('Write'), items: ['brainstorm', 'outline', 'email', 'agenda', 'table', 'flowchart'] },
  ];
}


export const CHAT_SKILL_PROMPTS = [
  { label: tx('Summarize'), icon: 'textJustifyLeft', prompt: 'Give me a brief of this page.' },
  { label: tx('Surface action items'), icon: 'checklist', prompt: 'List the action items on this page.' },
  { label: tx('Translate'), icon: 'translate', prompt: 'Rewrite this page in another language into English.' },
  { label: tx('Improve writing'), icon: 'wand', prompt: 'Suggest how to improve the writing on this page.' },
  { label: tx('Brainstorm ideas'), icon: 'lightning', prompt: 'Brainstorm ideas about ' },
  { label: tx('Sketch an outline'), icon: 'listBullet', prompt: 'Sketch an outline for ' },
];



export const PAGE_SUGGESTIONS = [
  { label: tx('Give me a brief of this page'), icon: 'aiSummarize', prompt: 'Give me a brief of this page' },
  { label: tx('Rewrite this page in another language'), icon: 'translate', prompt: 'Rewrite this page in another language' },
  { label: tx('Spot useful patterns'), icon: 'aiAnalyze', prompt: 'Spot useful patterns in this page' },
  { label: tx('Build a task tracker'), icon: 'aiTaskTracker', prompt: 'Build a task tracker from this page' },
];


export const PROMPT_PILLS: { label: string; icon: string; header: string; items: { label: string; prompt: string }[] }[] = [
  {
    label: tx('Create Slides'), icon: 'squareGrid2X2', header: "Build polished slide decks", items: [
      { label: tx('Build a leadership brief'), prompt: "Build an executive update deck from my workspace. Ask which page, database, or date range to use when I have not said. Ask at most two follow-up questions." },
      { label: tx('Convert meeting notes into a deck'), prompt: "Turn selected meeting notes into a slide deck. Ask which notes and takeaway to use when missing. Ask at most two follow-up questions." },
      { label: tx('Shape a launch pitch deck'), prompt: "Shape a pitch deck for a new product idea. Ask for the idea and audience when missing, with no more than two follow-up questions." },
      { label: tx('Build a project progress deck'), prompt: "Assemble a project progress deck from the right workspace material. Ask for the project source and audience when missing, with up to two follow-up questions." },
      { label: tx('Prepare a customer proposal'), prompt: "Prepare a sales proposal deck. Ask for the customer and source material when missing, with up to two follow-up questions." },
    ],
  },
  {
    label: tx('Spreadsheets'), icon: 'viewTable', header: "Build and analyze spreadsheets", items: [
      { label: tx('Spot useful patterns'), prompt: "Analyze the attached spreadsheet for useful patterns. Ask for a CSV or Excel upload when none is attached, then ask up to two clarifying questions." },
      { label: tx('Tidy inconsistent data'), prompt: "Clean and standardize the data. Ask for a CSV or Excel upload if needed, then ask up to two clarifying questions." },
      { label: tx('Export a database to a spreadsheet'), prompt: "Export a Workspace database to a tidy spreadsheet. Ask me to choose the database and view when missing, then ask up to two clarifying questions." },
      { label: tx('Chart spreadsheet data'), prompt: "Create charts from spreadsheet data. Ask for a CSV or Excel upload when needed and ask about chart style or interactivity only if necessary." },
      { label: tx('Populate a Workspace database'), prompt: "Populate a Workspace database from a spreadsheet and map its fields. Ask for a CSV or Excel upload when missing, then ask up to two clarifying questions." },
    ],
  },
  {
    label: tx('Research'), icon: 'docTextMagnifyingGlass', header: "Research your workspace and the web", items: [
      { label: tx('Review a company before a decision'), prompt: "Research a company for due diligence. Ask for its name or source page when missing, then ask up to two clarifying questions." },
      { label: tx('Get ready for a customer conversation'), prompt: "Prepare a customer call brief. Ask for the account and call goal when missing, then ask up to two clarifying questions." },
      { label: tx('Map a market landscape'), prompt: "Research a market landscape. Ask which market or category to cover when missing, then ask up to two clarifying questions." },
      { label: tx('Bring me up to speed on a project'), prompt: "Summarize the latest project context. Ask which project, page, or database to review when missing, then ask up to two clarifying questions." },
      { label: tx('Research and report on a topic'), prompt: "Write a research report on a topic. Ask for the topic and source material when missing, then ask up to two clarifying questions." },
    ],
  },
  {
    label: tx('Visualize'), icon: 'cursorClick', header: "Build interactive HTML views", items: [
      { label: tx('Assemble a data dashboard'), prompt: "Build an interactive HTML dashboard. Ask which database, spreadsheet, file, or metrics to use when missing, then ask up to two clarifying questions." },
      { label: tx('Draw a process flow'), prompt: "Build an interactive HTML flow chart. Ask which process, page, or notes to use when missing, then ask up to two clarifying questions." },
      { label: tx('Build an interactive explainer'), prompt: "Build an interactive HTML explainer. Ask for the topic, audience, and detail level when missing, then ask up to two clarifying questions." },
      { label: tx('Build an interactive summary'), prompt: "Build an interactive HTML summary report. Ask which page, database, file, or notes to summarize when missing, then ask up to two clarifying questions." },
      { label: tx('Sketch an interface prototype'), prompt: "Build an interactive HTML interface prototype. Ask whether to start from an idea, document, file, or workflow, then ask up to two clarifying questions." },
    ],
  },
];
