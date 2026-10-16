const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../ai-task-planner/src/components/Planner.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('TaskPlannerGuideView')) {
  content = content.replace(
    'import { tasksCsv } from "@/lib/planner/csv";',
    'import { TaskPlannerGuideView } from "./TaskPlannerGuideView";\nimport { tasksCsv } from "@/lib/planner/csv";'
  );
}

const guideRegex = /\{screen === "guide" && <section className="card guide">[\s\S]*?<\/section>\}/;
if (guideRegex.test(content)) {
  content = content.replace(
    guideRegex,
    '{screen === "guide" && <TaskPlannerGuideView onStartPlanning={() => navigate("dashboard")} />}'
  );
  console.log('Successfully replaced guide view with TaskPlannerGuideView');
} else {
  console.log('Regex did not match guide view');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Planner.tsx updated successfully');
