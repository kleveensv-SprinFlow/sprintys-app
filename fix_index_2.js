const fs = require('fs');
let c = fs.readFileSync('c:/Users/kleve/Sprintflow/sprintys-app/app/(coach)/index.tsx', 'utf8');
c = c.replace(/router\.push\('\/\(coach\)\/day\/' \+ \(typeof workout !== 'undefined' && workout\?\.date_prevue \? workout\.date_prevue\.split\('T'\)\[0\] : todayStr\)\)/g, 'router.push(\'/(coach)/day/\' + todayStr)');
c = c.replace(/todayWorkouts\.map\(\(workout, index\) => \([\s\S]*?router\.push\('\/\(coach\)\/day\/' \+ todayStr\)/, (match) => match.replace('todayStr', '(workout.date_prevue ? workout.date_prevue.split(\'T\')[0] : todayStr)'));
fs.writeFileSync('c:/Users/kleve/Sprintflow/sprintys-app/app/(coach)/index.tsx', c, 'utf8');
