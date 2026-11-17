const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const sources = ['calendar', 'units', 'walk', 'records', 'milestones'].map(name => {
  const file = path.join(root, 'src', 'domain', name + '.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  return `"./${name}": (exports, require) => {\n${outputText}\n}`;
});
const bundle = `
const factories = { ${sources.join(',\n')} };
const modules = {};
function load(name) {
  if (!modules[name]) {
    modules[name] = {};
    factories[name](modules[name], load);
  }
  return modules[name];
}
`;
const { activeWalkTime, appendWalkFixes, emptyWalk, calculateWalkingRecords, calculateMilestones } = vm.runInNewContext(
  bundle + '({ ...load("./walk"), ...load("./records"), ...load("./milestones") })',
);

const start = Date.parse('2026-11-16T12:00:00Z');
const initialClock = { activeMs: 0, resumedAt: start };
const pausedClock = { activeMs: activeWalkTime(initialClock, start + 8000), resumedAt: null };
assert.equal(activeWalkTime(pausedClock, start + 25_000), 8000);
const resumedClock = { ...pausedClock, resumedAt: start + 25_000 };
assert.equal(activeWalkTime(resumedClock, start + 33_000), 16_000);
const offsets = [[0, 0], [1, 0], [2, 0.5], [3, 1.7], [4, 2], [4, 4], [3, 5], [2, 5.5], [1, 6], [0, 7]];
const fixes = offsets.map(([north, east], i) => ({
  latitude: 59.31 + north * 0.00009,
  longitude: 18.07 + east * 0.00018,
  accuracy: 4,
  timestamp: start + i * 8000,
}));
const blank = { progress: emptyWalk, route: [] };
const foreground = fixes.reduce((walk, fix) => appendWalkFixes(walk, [fix], start, fix.timestamp), blank);
const background = appendWalkFixes(blank, fixes, start, fixes.at(-1).timestamp);
assert.equal(JSON.stringify(background), JSON.stringify(foreground), 'Batched fixes must match foreground fixes');
assert.equal(background.route.length, fixes.length);
assert(background.progress.distanceMeters > 70);
const resumed = appendWalkFixes(
  { ...background, progress: { ...background.progress, lastFix: null } },
  [{ ...fixes[0], timestamp: start + 100_000 }], start + 100_000, start + 100_000,
);
assert.equal(resumed.progress.distanceMeters, background.progress.distanceMeters);
assert.equal(resumed.route.at(-1).startsSegment, true);

const first = { id: 'first', started_at: start, walking_distance_meters: 100, steps: null,
  elapsed_duration: 60_000, moving_duration: 50_000, average_speed: 2, maximum_speed: 2.5 };
const later = { ...first, id: 'later', started_at: start + 600_000, walking_distance_meters: 200, steps: 300 };
const nextWeek = { ...later, id: 'next', started_at: start + 7 * 86_400_000, walking_distance_meters: 250 };
const records = calculateWalkingRecords([first, later, nextWeek]);
assert.equal(records.session.distance, 250);
assert.equal(records.day.distance, 300);
assert.equal(records.week.distance, 300);
assert.equal(calculateWalkingRecords([first]).session.steps, null);
const milestones = calculateMilestones([first, later, nextWeek]);
assert.equal(calculateMilestones([]).unlocked, 0);
assert.equal(milestones.groups.day[0].progress, 2);
assert.equal(milestones.groups.week[0].progress, 2);
assert.equal(milestones.groups.week[1].progress, 1);
assert.equal(milestones.groups.lifetime.find(goal => goal.unit === 'distance').progress, 550);
assert.equal(milestones.groups.lifetime.find(goal => goal.unit === 'step').progress, 600);
assert.equal(milestones.groups.streaks[1].progress, 2);
const dstWalks = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-28']
  .map(date => ({ ...first, id: date, started_at: Date.parse(date + 'T12:00:00Z') }));
assert.equal(calculateMilestones(dstWalks).groups.streaks[0].progress, 3);
assert.equal(calculateMilestones(dstWalks.slice(2)).groups.streaks[0].progress, 1);
assert(calculateMilestones([first]).unlocked < milestones.unlocked);
console.log(`Walk replay checks passed (batched fixes, pause timer, records, and ${milestones.total} milestone tiers).`);

if (!process.argv.includes('--check')) {
  const template = fs.readFileSync(path.join(__dirname, 'walk-preview.html'), 'utf8');
  const data = '<script>\n' + bundle + '\nconst sampleFixes = ' + JSON.stringify(fixes) + ';\n</script>';
  const output = path.join(root, 'dist', 'walk-preview.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, template.replace('<!-- replay data -->', () => data));
  console.log('Open dist/walk-preview.html in a browser.');
}
