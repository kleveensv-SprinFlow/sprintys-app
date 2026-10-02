const fs = require('fs');
let code = fs.readFileSync('src/features/calendar/components/RunWorkoutBuilder.tsx', 'utf8');

// Remove the target variable block
code = code.replace(/let target:\s*ExerciseTarget[\s\S]*?target\s*=\s*\{\s*type:\s*'athlete'[\s\S]*?\}/m, "");

// Replace target, with targets: blockTargets, in both identical mode and varied mode blocks
code = code.replace(/target,/g, "targets: blockTargets,");
code = code.replace(/target:\s*target/g, "targets: blockTargets");

fs.writeFileSync('src/features/calendar/components/RunWorkoutBuilder.tsx', code);
console.log('Fixed target in RunWorkoutBuilder');
