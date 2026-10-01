/** FIGlet "standard" glyphs for the countdown: digits and the colon, 5 rows each. */
const GLYPHS: Record<string, string[]> = {
  '0': ['  ___  ', ' / _ \\ ', '| | | |', '| |_| |', ' \\___/ '],
  '1': [' _ ', '/ |', '| |', '| |', '|_|'],
  '2': [' ____  ', '|___ \\ ', '  __) |', ' / __/ ', '|_____|'],
  '3': [' _____ ', '|___ / ', '  |_ \\ ', ' ___) |', '|____/ '],
  '4': [' _  _   ', '| || |  ', '| || |_ ', '|__   _|', '   |_|  '],
  '5': [' ____  ', '| ___| ', '|___ \\ ', ' ___) |', '|____/ '],
  '6': ['  __   ', ' / /_  ', "| '_ \\ ", '| (_) |', ' \\___/ '],
  '7': [' _____ ', '|___  |', '   / / ', '  / /  ', ' /_/   '],
  '8': ['  ___  ', ' ( _ ) ', ' / _ \\ ', '| (_) |', ' \\___/ '],
  '9': ['  ___  ', ' / _ \\ ', '| (_) |', ' \\__, |', '   /_/ '],
  ':': ['   ', ' _ ', '(_)', ' _ ', '(_)'],
};

/** Render `text` as five lines of FIGlet art. Unknown characters are skipped. */
export function figlet(text: string): string {
  const rows = ['', '', '', '', ''];
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) continue;
    for (let r = 0; r < 5; r++) rows[r] += g[r];
  }
  return rows.join('\n');
}
