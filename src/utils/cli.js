const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const symbols = {
  watching: '●',
  processing: '◐',
  done: '✓',
  error: '✗',
  info: 'ℹ',
  arrow: '→',
};

const isTTY = process.stdout.isTTY;

function colorize(color, text) {
  if (!isTTY) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

export function banner(config) {
  if (!isTTY) return;
  console.log();
  console.log(colorize('cyan', colorize('bold', '  pdf-remove-wm')));
  console.log(colorize('gray', '  ─────────────────────────────────'));
  console.log(`  ${colorize('gray', 'input:')}  ${config.watcher.inputDir}`);
  console.log(`  ${colorize('gray', 'output:')} ${config.watcher.outputDir}`);
  console.log(`  ${colorize('gray', 'done:')}   ${config.watcher.moveProcessed ? config.watcher.doneDir : '(disabled)'}`);
  console.log();
}

export function watching() {
  if (!isTTY) return;
  console.log(colorize('cyan', `  ${symbols.watching} Watching for new .md files...`));
  console.log();
}

export function processing(fileName) {
  if (!isTTY) return;
  process.stdout.write(colorize('yellow', `  ${symbols.processing} Processing ${fileName} `));
}

export function processingStep(step) {
  if (!isTTY) return;
  process.stdout.write(colorize('dim', `${symbols.arrow} ${step} `));
}

export function done(fileName, durationMs) {
  if (!isTTY) return;
  const duration = durationMs < 1000
    ? `${durationMs}ms`
    : `${(durationMs / 1000).toFixed(1)}s`;
  console.log();
  console.log(colorize('green', `  ${symbols.done} ${fileName} ${colorize('dim', `(${duration})`)}`));
}

export function fail(fileName, error) {
  if (!isTTY) return;
  console.log();
  console.log(colorize('red', `  ${symbols.error} ${fileName}: ${error}`));
}

export function info(message) {
  if (!isTTY) return;
  console.log(colorize('blue', `  ${symbols.info} ${message}`));
}
