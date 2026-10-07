import AsciiHistory from './ascii/History';
import AsciiTimer from './ascii/Timer';
import BackroomsHistory from './backrooms/History';
import BackroomsTimer from './backrooms/Timer';
import DoomHistory from './doom/History';
import DoomTimer from './doom/Timer';
import EcamHistory from './ecam/History';
import EcamTimer from './ecam/Timer';
import EinkHistory from './eink/History';
import EinkTimer from './eink/Timer';
import EmberHistory from './ember/History';
import EmberTimer from './ember/Timer';
import GameboyHistory from './gameboy/History';
import GameboyTimer from './gameboy/Timer';
import JournalHistory from './journal/History';
import JournalTimer from './journal/Timer';
import MineHistory from './mine/History';
import MineTimer from './mine/Timer';
import NixieHistory from './nixie/History';
import NixieTimer from './nixie/Timer';
import SplitflapHistory from './splitflap/History';
import StarsHistory from './stars/History';
import StarsTimer from './stars/Timer';
import SplitflapTimer from './splitflap/Timer';
import TerminalHistory from './terminal/History';
import TerminalTimer from './terminal/Timer';
import type { Theme } from './types';
import './ascii/ascii.css';
import './backrooms/backrooms.css';
import './doom/doom.css';
import './ecam/ecam.css';
import './eink/eink.css';
import './ember/ember.css';
import './gameboy/gameboy.css';
import './journal/journal.css';
import './mine/mine.css';
import './nixie/nixie.css';
import './splitflap/splitflap.css';
import './stars/stars.css';
import './terminal/terminal.css';
import '@fontsource-variable/oswald';

export const THEMES: Theme[] = [
  {
    id: 'ember',
    name: 'Ember',
    blurb: 'Warm glow, Time Timer dial',
    swatch: ['#0c0a0b', '#ff5e3a'],
    Timer: EmberTimer,
    History: EmberHistory,
  },
  {
    id: 'eink',
    name: 'E-ink',
    blurb: 'Calm paper, minute by minute',
    swatch: ['#ebe8df', '#1c1b19'],
    Timer: EinkTimer,
    History: EinkHistory,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    blurb: '80×24 phosphor, block digits',
    swatch: ['#0a0905', '#ffb000'],
    Timer: TerminalTimer,
    History: TerminalHistory,
  },
  {
    id: 'gameboy',
    name: 'Game Boy',
    blurb: 'Pixel battle against WORK',
    swatch: ['#9bbc0f', '#0f380f'],
    Timer: GameboyTimer,
    History: GameboyHistory,
  },
  {
    id: 'splitflap',
    name: 'Split-flap',
    blurb: 'Departures board, flipping digits',
    swatch: ['#121212', '#f7b928'],
    Timer: SplitflapTimer,
    History: SplitflapHistory,
  },
  {
    id: 'nixie',
    name: 'Nixie',
    blurb: 'Glowing tubes, neon lamps',
    swatch: ['#110b07', '#ff8a2a'],
    Timer: NixieTimer,
    History: NixieHistory,
  },
  {
    id: 'ascii',
    name: 'ASCII campfire',
    blurb: 'Text-art fire that burns down',
    swatch: ['#06060c', '#ff8a1c'],
    Timer: AsciiTimer,
    History: AsciiHistory,
  },
  {
    id: 'doom',
    name: 'Doom',
    blurb: 'Walk the corridor to the exit',
    swatch: ['#1e0302', '#e01e18'],
    Timer: DoomTimer,
    History: DoomHistory,
  },
  {
    id: 'backrooms',
    name: 'Backrooms',
    blurb: 'Found footage: focus in Level 0',
    swatch: ['#c4b25e', '#f02a1e'],
    Timer: BackroomsTimer,
    History: BackroomsHistory,
  },
  {
    id: 'mine',
    name: 'Mineshaft',
    blurb: 'Dig one block per minute',
    swatch: ['#6aa0f0', '#5aa038'],
    Timer: MineTimer,
    History: MineHistory,
  },
  {
    id: 'ecam',
    name: 'Cockpit',
    blurb: 'Jetliner engine display: fly each focus as a leg',
    swatch: ['#000000', '#3cf04e'],
    Timer: EcamTimer,
    History: EcamHistory,
  },
  {
    id: 'stars',
    name: 'Starfield',
    blurb: 'Jump to lightspeed, then drift through the stars',
    swatch: ['#04050a', '#e8ecf5'],
    Timer: StarsTimer,
    History: StarsHistory,
  },
  {
    id: 'journal',
    name: 'Journal',
    blurb: 'Computer Modern and TikZ',
    swatch: ['#fbfaf6', '#141414'],
    Timer: JournalTimer,
    History: JournalHistory,
  },
];

export const DEFAULT_THEME = THEMES[0].id;

export const themeById = (id: string | null): Theme => THEMES.find(t => t.id === id) ?? THEMES[0];
