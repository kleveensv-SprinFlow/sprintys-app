const fs = require('fs');

let code = fs.readFileSync('src/features/calendar/components/RunWorkoutBuilder.tsx', 'utf8');

// 1. Add missing import for MultiTargetSelectorModal
if (!code.includes("import { MultiTargetSelectorModal, MultiTarget }")) {
  code = code.replace(
    "import { RestTimePickerModal } from './RestTimePickerModal';",
    "import { RestTimePickerModal } from './RestTimePickerModal';\nimport { MultiTargetSelectorModal, MultiTarget } from '../../../shared/components/MultiTargetSelectorModal';"
  );
}

// 2. Fix handleAddBlock (reset targets)
code = code.replace(
  "setBlockTargetScope('inherit');\n    setBlockTargetSubgroupId(subgroups[0]?.id || null);\n    setBlockTargetAthleteId(approvedMembers[0]?.user_id || null);",
  "setBlockTargets({ subgroups: [], athletes: [] });"
);

// 3. Fix handleStartEdit (load targets)
// Old code:
// if (block.target?.type === 'subgroup') {
//   setBlockTargetScope('subgroup');
//   setBlockTargetSubgroupId(block.target.id || null);
// } else if (block.target?.type === 'athlete') { ...
code = code.replace(/if\s*\(block\.target\?\.type\s*===\s*'subgroup'\)\s*{[\s\S]*?\} else \{\s*setBlockTargetScope\('inherit'\);\s*\}/, 
"setBlockTargets(block.targets || { subgroups: [], athletes: [] });");

// 4. Fix handleSaveBlock (save targets into block)
// Old code:
// let target: ExerciseTarget = { type: 'all' };
// if (blockTargetScope === 'subgroup' && blockTargetSubgroupId) { ... }
code = code.replace(/let target:\s*ExerciseTarget\s*=\s*\{\s*type:\s*'all'\s*\};[\s\S]*?\}\s*const\s*newBlock:\s*RunBlockItem\s*=\s*\{/m, 
"const newBlock: RunBlockItem = {");

// We also need to fix `target: target,` inside newBlock to be `targets: blockTargets,`
code = code.replace(
  "id: String(uuid.v4()),\n      name: blockName,\n      mode: blockMode,\n      distance: parseInt(manualDistanceText) || 0,\n      repsCount,\n      intensity: Math.round(intensityValue),\n      runs: variedRuns,\n      restReps,\n      restBlock,\n      target: target,",
  "id: String(uuid.v4()),\n      name: blockName,\n      mode: blockMode,\n      distance: parseInt(manualDistanceText) || 0,\n      repsCount,\n      intensity: Math.round(intensityValue),\n      runs: variedRuns,\n      restReps,\n      restBlock,\n      targets: blockTargets,"
);

// Edit existing block
code = code.replace(
  "b.id === editingBlockId\n            ? { ...b, name: blockName, mode: blockMode, distance: parseInt(manualDistanceText) || 0, repsCount, intensity: Math.round(intensityValue), runs: variedRuns, restReps, restBlock, target: target }",
  "b.id === editingBlockId\n            ? { ...b, name: blockName, mode: blockMode, distance: parseInt(manualDistanceText) || 0, repsCount, intensity: Math.round(intensityValue), runs: variedRuns, restReps, restBlock, targets: blockTargets }"
);

// Fix sheetSectionHeader to sectionHeader inside the Modal (around line 1388)
code = code.replace(/styles\.sheetSectionHeader/g, "styles.sectionHeader");
code = code.replace(/styles\.sheetSectionTitle/g, "styles.sectionTitle");
code = code.replace(/styles\.settingRow/g, "styles.settingRow"); // Wait, does settingRow exist?
code = code.replace(/styles\.settingLabel/g, "styles.settingLabel");

fs.writeFileSync('src/features/calendar/components/RunWorkoutBuilder.tsx', code);
console.log('Patched RunWorkoutBuilder');
