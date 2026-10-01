import EinkHistory from './eink/History';
import EinkTimer from './eink/Timer';
import EmberHistory from './ember/History';
import EmberTimer from './ember/Timer';
import JournalHistory from './journal/History';
import JournalTimer from './journal/Timer';
import TerminalHistory from './terminal/History';
import TerminalTimer from './terminal/Timer';
import type { Theme } from './types';
import './eink/eink.css';
import './ember/ember.css';
import './journal/journal.css';
import './terminal/terminal.css';

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
