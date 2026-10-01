import { formatDrift } from '../../clock';
import { formatClock, formatDuration, PHASE_LABEL, phaseMs, SESSIONS_PER_SET } from '../../timer';
import type { TimerView } from '../types';
import { bar, BigText, bigWidth, boxLines, clock, COLS, Crt, fit, journalStamp, KeyBar, StatusBar, T } from './term';

export default function Timer(v: TimerView) {
  const { state, now, left, endsAt, today, history, clock: clockStatus } = v;
  const total = Math.max(phaseMs(state), left);
  const idle = state.mode === 'idle';
  const setMin = state.settings[state.phase];
  const big = idle ? `${String(setMin).padStart(2, '0')}:00` : bigClock(left);
  const bigX = Math.floor((52 - bigWidth(big)) / 2) + 1;
  const frac = idle ? 0 : 1 - left / total;
  const flag = state.phase === 'focus' ? 'focus' : 'break';
  const slots = Array.from({ length: SESSIONS_PER_SET }, (_, i) =>
    i < state.cycle ? '[■]' : i === state.cycle && state.phase === 'focus' && !idle ? '[▸]' : '[ ]',
  ).join('');
  const rows: [string, string][] = [
    ['phase', PHASE_LABEL[state.phase].toUpperCase()],
    ['state', state.mode.toUpperCase()],
    ['set', slots],
    ['ends', state.mode === 'paused' ? '--:--' : clock(endsAt)],
    ['today', `${today.sessions} × ${formatDuration(today.minutes)}`],
    ['streak', `${v.streak}d`],
  ];
  const tail = history.slice(-4);

  return (
    <div className={`app phase-${state.phase} mode-${state.mode}`}>
      <StatusBar now={now} middle={`${PHASE_LABEL[state.phase].toUpperCase()} :: ${state.mode.toUpperCase()}`} />

      {clockStatus.kind !== 'ok' && (
        <T x={0} y={1} className="warn" onClick={clockStatus.kind === 'unverified' ? v.trustClock : undefined}>
          {fit(
            clockStatus.kind === 'behind'
              ? ` !! E_CLOCK: system time ${formatDrift(clockStatus.behindMs)} behind. history dates wrong. connect phone.`
              : ` !! W_CLOCK: time unverified after power loss. tap here if ${clock(now)} is correct.`,
            COLS,
          )}
        </T>
      )}

      <div className="dial-hit" {...v.knob}>
        <BigText key={v.bump} x={bigX} y={3} text={big} className="big" />
      </div>
      <T x={bigX} y={10} className="dim">
        {idle
          ? `${setMin === 1 ? 'minute' : 'minutes'} · turn wheel to set`
          : state.mode === 'paused'
            ? 'SIGSTOP · process suspended'
            : 'remaining'}
      </T>

      <T x={54} y={2} className="dim">{boxLines('status', [], 24)[0]}</T>
      {rows.map(([k, v], i) => (
        <T key={k} x={54} y={3 + i}>
          <span className="dim">│ {k.padEnd(7)}</span>
          {fit(v, 14)}
          <span className="dim">│</span>
        </T>
      ))}
      <T x={54} y={9} className="dim">{boxLines('status', [], 24)[1]}</T>

      <T x={2} y={12}>
        <span className="dim">[</span>
        {bar(frac, 66)}
        <span className="dim">{'·'.repeat(66 - bar(frac, 66).length)}]</span> {String(Math.floor(frac * 100)).padStart(3)}%
      </T>

      <T x={2} y={14}>
        <span className="dim">carthing:~$ </span>pomodoro --{flag} {setMin}m
        {idle && <span className="cursor">█</span>}
      </T>
      <T x={2} y={15}>
        {v.holding ? (
          <>
            <span className="tag">^C</span> stopping <span className="dim">[</span>
            <span className="hold-bar">██████████</span>
            <span className="dim">]</span>
          </>
        ) : state.mode === 'running' ? (
          <>
            <span className="tag">[ RUN  ]</span> {flag} in progress, ends {clock(endsAt)}
          </>
        ) : state.mode === 'paused' ? (
          <span className="blink">
            <span className="tag">[PAUSED]</span> suspended with {formatClock(left)} left
          </span>
        ) : state.phase === 'focus' ? (
          <span className="dim">[ WAIT ] press RET to start</span>
        ) : (
          <>
            <span className="tag">[ DONE ]</span> focus complete, {setMin}m break proposed
          </>
        )}
      </T>

      <T x={2} y={17} className="dim">
        {fit('── journalctl -u pomodoro -n 4 ', 76).replace(/ +$/, s => '─'.repeat(s.length))}
      </T>
      {tail.length === 0 ? (
        <T x={2} y={18} className="dim">
          -- No entries --
        </T>
      ) : (
        tail.map((e, i) => (
          <T key={e.start} x={2} y={18 + i} onClick={v.toggleHistory}>
            <span className="dim">{journalStamp(e.start)} pomodoro: </span>
            <span className={e.done ? 'ok' : 'stop'}>{e.done ? '[  OK  ]' : '[ STOP ]'}</span> focus{' '}
            {formatDuration(Math.round(e.focusedMs / 60_000)).padEnd(6)}
            <span className="dim">
              {clock(e.start)}→{clock(e.end)}
            </span>
          </T>
        ))
      )}

      <KeyBar
        keys={[
          ['1', '15m'],
          ['2', '25m'],
          ['3', '45m'],
          ['4', 'Log'],
          ['M', 'Look'],
        ]}
        actions={[
          ['<->', idle ? 'set' : '±1m'],
          ['RET', state.mode === 'running' ? 'pause' : state.mode === 'paused' ? 'resume' : 'start'],
          ['^C', !idle ? 'stop' : state.phase !== 'focus' ? 'skip' : 'reset'],
        ]}
      />

      <div key={v.flash} className={v.flash ? 'bell' : ''} />
      <Crt />
    </div>
  );

}

/** MM:SS, or H:MM once the countdown no longer fits two minute digits. */
function bigClock(ms: number) {
  const min = Math.ceil(ms / 1000) / 60;
  if (min < 100) return formatClock(ms);
  const h = Math.floor(min / 60);
  return `${h}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
}
