const w1 = {
  group_assignment_id: 'group1',
  blocks: [{ id: 'block-group1', name: 'Corps de séance', exercises: [{id: 'ex1'}] }],
  exercises: [{id: 'ex1'}]
};
const w2 = {
  group_assignment_id: 'group1',
  blocks: [{ id: 'block-group1', name: 'Corps de séance', exercises: [{id: 'ex2'}] }],
  exercises: [{id: 'ex2'}]
};
const data = [w1, w2];
const groupedMap = new Map();
for (const w of (data || [])) {
  const key = w.group_assignment_id || w.id;
  const wBlocks = [...w.blocks];
  const wExercises = [...w.exercises];
  if (!groupedMap.has(key)) {
    groupedMap.set(key, { ...w, blocks: wBlocks, exercises: wExercises });
  } else {
    const existing = groupedMap.get(key);
    const existingBlockKeys = new Set((existing.blocks || []).map((b) => b.id || b.name));
    for (const blk of wBlocks) {
      const blkKey = blk.id || blk.name;
      if (!existingBlockKeys.has(blkKey)) {
        existingBlockKeys.add(blkKey);
        existing.blocks.push(blk);
      }
    }
    const existingExKeys = new Set((existing.exercises || []).map((e) => e.id || e.name));
    for (const ex of wExercises) {
      const exKey = ex.id || ex.name;
      if (!existingExKeys.has(exKey)) {
        existingExKeys.add(exKey);
        existing.exercises.push(ex);
      }
    }
  }
}
for (const merged of groupedMap.values()) {
  const allBlockExKeys = new Set(
    (merged.blocks || []).flatMap((b) => (b.exercises || []).map((e) => e.id || e.name))
  );
  const missingExercises = (merged.exercises || []).filter(
    (e) => !allBlockExKeys.has(e.id || e.name)
  ).map((e) => ({ ...e, sets: e.sets || [{ reps: 1 }] }));
  if (missingExercises.length > 0) {
    if (!merged.blocks) merged.blocks = [];
    merged.blocks.unshift({
      id: missing-block-extra,
      name: 'Bloc 1',
      exercises: missingExercises,
    });
  }
}
console.log(JSON.stringify(Array.from(groupedMap.values())[0].blocks, null, 2));
