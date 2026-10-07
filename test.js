const blocks1 = [{ id: 'id1', name: 'Bloc 1: 3 - 20m' }];
const blocks2 = [{ id: 'id2', name: 'Bloc 1: 3 - 20m' }];
const existing = { blocks: [...blocks1] };
const existingBlockKeys = new Set(existing.blocks.map(b => b.id || b.name));
for (const blk of blocks2) {
  const blkKey = blk.id || blk.name;
  if (!existingBlockKeys.has(blkKey)) {
    existingBlockKeys.add(blkKey);
    existing.blocks.push(blk);
  }
}
console.log(existing.blocks);
