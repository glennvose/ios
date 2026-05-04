// app.jsx — AP Lang Mobile App
// Components: App, Dashboard, TopicScreen, VideoModal, plus small atoms.

const { useState, useEffect, useMemo, useRef } = React;

// ─────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ap-lang-progress-v1';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {return {};}
}
function saveProgress(p) {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(p));} catch {}
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function ytId(url) {
  const m = url.match(/[?&]v=([^&]+)/);
  if (m) return m[1];
  const p = url.match(/playlist\?list=([^&]+)/);
  if (p) return null;
  return null;
}
function ytThumb(url) {
  const id = ytId(url);
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return null;
}
function isYouTube(url) {return /youtube\.com|youtu\.be/.test(url);}

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────
const T = {
  bg: '#0a0a0b',
  surf: '#141416',
  surfHi: '#1c1c1f',
  hair: 'rgba(255,255,255,0.06)',
  hairStrong: 'rgba(255,255,255,0.10)',
  text: '#f4f3ef',
  muted: '#9b9a96',
  faint: '#5a5957',
  high: 'oklch(0.78 0.14 65)',
  med: 'oklch(0.78 0.10 250)',
  done: 'oklch(0.74 0.13 150)',
  red: 'oklch(0.70 0.16 25)'
};

const tierColor = (p) => p === 'HIGH' ? T.high : T.med;

// ─────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────
function Tag({ children, color = T.muted, bg = 'transparent', border = T.hair, style = {} }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 9.5,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color, background: bg,
      border: `1px solid ${border}`,
      padding: '3px 6px',
      borderRadius: 3,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style
    }}>{children}</span>);

}

function Ring({ pct, size = 64, stroke = 4, color = T.high, track = T.hairStrong, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>);

}

function Bar({ pct, color = T.high, height = 3, track = T.hairStrong }) {
  return (
    <div style={{ width: '100%', height, background: track, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        width: `${pct * 100}%`, height: '100%', background: color,
        transition: 'width 500ms cubic-bezier(.2,.8,.2,1)'
      }} />
    </div>);

}

// Checkbox — custom, no emoji
function Check({ checked, onClick, size = 22, color = T.done }) {
  return (
    <button onClick={onClick} aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
    style={{
      width: size, height: size, borderRadius: '50%',
      border: `1.5px solid ${checked ? color : T.hairStrong}`,
      background: checked ? color : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0, flexShrink: 0,
      transition: 'all 200ms ease'
    }}>
      {checked &&
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5 L6.5 12 L13 4.5" stroke={T.bg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    </button>);

}

// Chevron
function Chev({ size = 14, color = T.faint, dir = 'right' }) {
  const rot = { right: 0, left: 180, up: -90, down: 90 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ transform: `rotate(${rot}deg)`, flexShrink: 0 }}>
      <path d="M6 4 L10 8 L6 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

// Play icon
function PlayIcon({ size = 14, color = T.text }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M4 3 L13 8 L4 13 Z" />
    </svg>);

}

function ExtIcon({ size = 12, color = T.faint }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9 3 H13 V7 M13 3 L7 9 M11 9 V12 H4 V5 H7" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

// ─────────────────────────────────────────────────────────────
// Status bar (custom, dark)
// ─────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{
      height: 54, padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      color: T.text, fontFamily: 'Geist, sans-serif',
      fontSize: 16, fontWeight: 600, flexShrink: 0
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><path d="M1 7 L1 9 M5 5 L5 9 M9 3 L9 9 M13 1 L13 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><path d="M7.5 8.5 a3 3 0 0 0 -5 0 M10.5 5.5 a7 7 0 0 0 -11 0 M13 3 a11 11 0 0 0 -16 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform="translate(1, 0)" /></svg>
        <div style={{ width: 24, height: 11, border: '1px solid currentColor', borderRadius: 3, padding: 1, opacity: 0.9 }}>
          <div style={{ width: '78%', height: '100%', background: 'currentColor', borderRadius: 1 }} />
        </div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: (s, c) =>
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="6" height="9" rx="1" stroke={c} strokeWidth="1.5" />
        <rect x="3" y="14" width="6" height="3" rx="1" stroke={c} strokeWidth="1.5" />
        <rect x="11" y="3" width="6" height="3" rx="1" stroke={c} strokeWidth="1.5" />
        <rect x="11" y="8" width="6" height="9" rx="1" stroke={c} strokeWidth="1.5" />
      </svg>
  },
  { id: 'topics', label: 'Topics', icon: (s, c) =>
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <path d="M3 5 H17 M3 10 H17 M3 15 H11" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
  },
  { id: 'stats', label: 'Skills', icon: (s, c) =>
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <path d="M3 16 L7 10 L11 13 L17 4" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="4" r="1.5" fill={c} />
      </svg>
  }];

  return (
    <div style={{
      flexShrink: 0,
      borderTop: `1px solid ${T.hair}`,
      background: 'rgba(10,10,11,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '10px 0 28px',
      display: 'flex', justifyContent: 'space-around'
    }}>
      {tabs.map((t) => {
        const active = tab === t.id;
        const c = active ? T.text : T.faint;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            color: c, padding: '4px 12px'
          }}>
            {t.icon(22, c)}
            <span style={{ fontSize: 10, fontFamily: 'Geist, sans-serif', fontWeight: 500, letterSpacing: '0.02em' }}>{t.label}</span>
          </button>);

      })}
    </div>);

}

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
function Dashboard({ data, progress, onOpenTopic, onSetTab }) {
  const allVids = data.topics.flatMap((t) => t.videos);
  const doneCount = allVids.filter((v) => progress[v.id]).length;
  const totalCount = allVids.length;
  const overallPct = totalCount ? doneCount / totalCount : 0;

  const highTopics = data.topics.filter((t) => t.priority === 'HIGH');
  const medTopics = data.topics.filter((t) => t.priority === 'MED');

  const topicPct = (t) => {
    const done = t.videos.filter((v) => progress[v.id]).length;
    return { done, total: t.videos.length, pct: t.videos.length ? done / t.videos.length : 0 };
  };

  const highDone = highTopics.flatMap((t) => t.videos).filter((v) => progress[v.id]).length;
  const highTotal = highTopics.reduce((a, t) => a + t.videos.length, 0);
  const medDone = medTopics.flatMap((t) => t.videos).filter((v) => progress[v.id]).length;
  const medTotal = medTopics.reduce((a, t) => a + t.videos.length, 0);

  // skill coverage
  const skillStats = useMemo(() => {
    const out = {};
    for (const k of Object.keys(data.skillKey)) out[k] = { done: 0, total: 0 };
    for (const t of data.topics) {
      for (const s of t.skills) {
        if (!out[s]) continue;
        for (const v of t.videos) {
          out[s].total += 1;
          if (progress[v.id]) out[s].done += 1;
        }
      }
    }
    return out;
  }, [data, progress]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div style={{ padding: '8px 24px 16px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
          color: T.faint, textTransform: 'uppercase', marginBottom: 6
        }}>May 2026 · Day 7 of prep</div>
        <h1 style={{
          fontFamily: 'Instrument Serif, serif', fontWeight: 400,
          fontSize: 36, lineHeight: 1.0, color: T.text, margin: 0,
          letterSpacing: '-0.01em'
        }}>
          Good evening, <span style={{ fontStyle: 'italic', color: T.muted }}>Abby.</span>
        </h1>
      </div>

      {/* Hero ring card */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          background: T.surf,
          border: `1px solid ${T.hair}`,
          borderRadius: 18,
          padding: '20px 18px',
          display: 'flex', alignItems: 'center', gap: 18
        }}>
          <Ring pct={overallPct} size={88} stroke={6} color={T.text}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, lineHeight: 1, color: T.text }}>
                {Math.round(overallPct * 100)}<span style={{ fontSize: 14, color: T.muted }}>%</span>
              </div>
            </div>
          </Ring>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.14em', color: T.faint, textTransform: 'uppercase', marginBottom: 6 }}>
              Overall progress
            </div>
            <div style={{ fontFamily: 'Geist, sans-serif', fontSize: 22, fontWeight: 500, color: T.text, lineHeight: 1.1, marginBottom: 10 }}>
              {doneCount} <span style={{ color: T.faint, fontWeight: 400 }}>/ {totalCount}</span> videos
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, fontFamily: 'Geist, sans-serif' }}>
              <div>
                <div style={{ color: T.faint, fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>High</div>
                <div style={{ color: T.high, fontWeight: 500, fontSize: 13 }}>{highDone}/{highTotal}</div>
              </div>
              <div style={{ width: 1, background: T.hair }} />
              <div>
                <div style={{ color: T.faint, fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Medium</div>
                <div style={{ color: T.med, fontWeight: 500, fontSize: 13 }}>{medDone}/{medTotal}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skill bars */}
      <SectionLabel>Skill coverage</SectionLabel>
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{
          background: T.surf, border: `1px solid ${T.hair}`, borderRadius: 14,
          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          {Object.entries(data.skillKey).map(([k, v]) => {
            const s = skillStats[k] || { done: 0, total: 0 };
            const pct = s.total ? s.done / s.total : 0;
            const color = v.tier === 'HIGH' ? T.high : T.med;
            return (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.text, fontWeight: 500 }}>{k}</span>
                    <span style={{ fontFamily: 'Geist, sans-serif', fontSize: 11, color: T.muted }}>{v.name}</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: T.faint }}>{s.done}/{s.total}</span>
                </div>
                <Bar pct={pct} color={color} height={2} track={T.hair} />
              </div>);

          })}
        </div>
      </div>

      {/* HIGH PRIORITY TOPICS */}
      <SectionLabel
        kicker="≥15% exam weight · CLE + REO"
        accent={T.high}>
        High priority</SectionLabel>
      <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {highTopics.map((t) =>
        <TopicCard key={t.id} topic={t} stats={topicPct(t)} onClick={() => onOpenTopic(t.id)} />
        )}
      </div>

      {/* MEDIUM */}
      <SectionLabel
        kicker="11–14% exam weight · RHS + STY"
        accent={T.med}>
        Medium priority</SectionLabel>
      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {medTopics.map((t) =>
        <TopicCard key={t.id} topic={t} stats={topicPct(t)} onClick={() => onOpenTopic(t.id)} />
        )}
      </div>

      {/* Footer attribution */}
      <div style={{
        padding: '0 24px 24px', fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, color: T.faint, letterSpacing: '0.08em', textAlign: 'center'
      }}>
        FRQ GAP ANALYSIS · {data.topics.length} TOPICS · {totalCount} RESOURCES
      </div>
    </div>);

}

function SectionLabel({ children, kicker, accent }) {
  return (
    <div style={{ padding: '4px 24px 10px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {accent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, alignSelf: 'center' }} />}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em',
        color: T.text, textTransform: 'uppercase', fontWeight: 500
      }}>{children}</div>
      {kicker &&
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
        color: T.faint, textTransform: 'uppercase', marginLeft: 'auto'
      }}>{kicker}</div>
      }
    </div>);

}

function TopicCard({ topic, stats, onClick }) {
  const accent = tierColor(topic.priority);
  const isComplete = stats.pct === 1;
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: T.surf, border: `1px solid ${T.hair}`, borderRadius: 14,
      padding: '14px 14px 12px', position: 'relative', overflow: 'hidden',
      fontFamily: 'inherit', color: 'inherit',
      transition: 'transform 150ms ease, border-color 150ms ease'
    }}
    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
      
      {/* Left tier strip */}
      <div style={{
        position: 'absolute', left: 0, top: 12, bottom: 12, width: 2,
        background: accent, borderRadius: '0 2px 2px 0'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8, paddingLeft: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <Tag color={T.faint}>{topic.frqType}</Tag>
            <Tag color={T.faint}>Last · {topic.lastTested}</Tag>
            {topic.skills.slice(0, 2).map((s) =>
            <Tag key={s} color={accent} border={'transparent'} bg={`color-mix(in oklch, ${accent} 14%, transparent)`}>{s}</Tag>
            )}
          </div>
          <h3 style={{
            fontFamily: 'Instrument Serif, serif', fontSize: 21, lineHeight: 1.1,
            color: T.text, margin: 0, fontWeight: 400, letterSpacing: '-0.005em'
          }}>{topic.title}</h3>
          <div style={{
            fontFamily: 'Geist, sans-serif', fontSize: 12, color: T.muted,
            marginTop: 3
          }}>{topic.subtitle}</div>
        </div>
        <Ring pct={stats.pct} size={42} stroke={3}
        color={isComplete ? T.done : accent}
        track={T.hair}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: T.text, fontWeight: 500 }}>
            {stats.done}/{stats.total}
          </div>
        </Ring>
      </div>

      <div style={{ paddingLeft: 6, marginTop: 10 }}>
        <Bar pct={stats.pct} color={isComplete ? T.done : accent} track={T.hair} />
      </div>
    </button>);

}

// ─────────────────────────────────────────────────────────────
// TOPIC SCREEN
// ─────────────────────────────────────────────────────────────
function TopicScreen({ topic, progress, onToggle, onPlay, onBack, skillKey }) {
  const accent = tierColor(topic.priority);
  const done = topic.videos.filter((v) => progress[v.id]).length;
  const pct = topic.videos.length ? done / topic.videos.length : 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
      {/* Top nav */}
      <div style={{
        padding: '6px 12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: T.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px',
          fontFamily: 'Geist, sans-serif', fontSize: 14
        }}>
          <Chev dir="left" color={T.text} size={16} />
          <span>Back</span>
        </button>
        <Tag color={accent} border={accent} bg={`color-mix(in oklch, ${accent} 12%, transparent)`} style={{ padding: '4px 8px' }}>
          {topic.priority} priority
        </Tag>
      </div>

      {/* Hero */}
      <div style={{ padding: '4px 24px 18px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
          color: T.faint, textTransform: 'uppercase', marginBottom: 8
        }}>
          {topic.frqType} · Last tested {topic.lastTested} · {topic.yearsAbsent} yrs absent
        </div>
        <h1 style={{
          fontFamily: 'Instrument Serif, serif', fontWeight: 400,
          fontSize: 32, lineHeight: 1.05, color: T.text, margin: 0,
          letterSpacing: '-0.015em'
        }}>{topic.title}</h1>
        <div style={{
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 18, color: T.muted, marginTop: 4, fontWeight: 400
        }}>{topic.subtitle}</div>
        <p style={{
          fontFamily: 'Geist, sans-serif', fontSize: 13.5, lineHeight: 1.55,
          color: T.muted, marginTop: 14, marginBottom: 0, textWrap: 'pretty'
        }}>{topic.summary}</p>

        {/* Skill chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {topic.skills.map((s) =>
          <div key={s} style={{
            background: T.surf, border: `1px solid ${T.hair}`, borderRadius: 6,
            padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6
          }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: accent, fontWeight: 600 }}>{s}</span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontSize: 10.5, color: T.muted }}>
                {skillKey[s]?.name.replace(' (Reading)', '')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress strip */}
      <div style={{ padding: '0 16px 18px' }}>
        <div style={{
          background: T.surf, border: `1px solid ${T.hair}`, borderRadius: 12,
          padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: T.faint, textTransform: 'uppercase' }}>
              Module progress
            </span>
            <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18, color: T.text }}>
              {done}<span style={{ color: T.faint }}> / {topic.videos.length}</span>
            </span>
          </div>
          <Bar pct={pct} color={pct === 1 ? T.done : accent} />
        </div>
      </div>

      {/* Video list */}
      <SectionLabel kicker={`${topic.videos.length} resources`}>Curated videos</SectionLabel>
      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topic.videos.map((v, i) =>
        <VideoRow key={v.id} idx={i + 1} video={v} done={!!progress[v.id]}
        onToggle={() => onToggle(v.id)} onPlay={() => onPlay(v)} accent={accent} />
        )}
      </div>
    </div>);

}

function VideoRow({ idx, video, done, onToggle, onPlay, accent }) {
  const thumb = ytThumb(video.url);
  const yt = isYouTube(video.url);
  return (
    <div style={{
      background: T.surf, border: `1px solid ${T.hair}`, borderRadius: 12,
      padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
      opacity: done ? 0.62 : 1, transition: 'opacity 200ms ease'
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Check checked={done} onClick={onToggle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: T.faint, letterSpacing: '0.1em' }}>
              {String(idx).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              · {video.duration}
            </span>
          </div>
          <div style={{
            fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500,
            color: T.text, lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none',
            textDecorationColor: T.faint
          }}>{video.title}</div>
          <div style={{
            fontFamily: 'Geist, sans-serif', fontSize: 11.5, color: T.muted, marginTop: 3
          }}>{video.channel}</div>
        </div>
      </div>

      {/* Why */}
      <div style={{
        fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
        fontSize: 13, lineHeight: 1.45, color: T.muted, paddingLeft: 32,
        textWrap: 'pretty'
      }}>
        “{video.why}”
      </div>

      {/* Action */}
      <div style={{ display: 'flex', gap: 8, paddingLeft: 32 }}>
        <button onClick={onPlay} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: done ? 'transparent' : accent,
          color: done ? T.text : T.bg,
          border: done ? `1px solid ${T.hairStrong}` : 'none',
          borderRadius: 8, padding: '9px 12px', cursor: 'pointer',
          fontFamily: 'Geist, sans-serif', fontSize: 12.5, fontWeight: 600,
          letterSpacing: '0.01em'
        }}>
          <PlayIcon size={11} color={done ? T.text : T.bg} />
          {yt ? done ? 'Rewatch' : 'Watch in app' : done ? 'Re-open' : 'Open resource'}
        </button>
        <a href={video.url} target="_blank" rel="noreferrer" style={{
          background: 'transparent', border: `1px solid ${T.hairStrong}`,
          color: T.muted, borderRadius: 8, padding: '9px 11px',
          display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none',
          fontFamily: 'Geist, sans-serif', fontSize: 11.5
        }}>
          <ExtIcon size={11} color={T.muted} />
          External
        </a>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// VIDEO MODAL (in-app player)
// ─────────────────────────────────────────────────────────────
function VideoModal({ video, onClose, onMarkDone, isDone }) {
  if (!video) return null;
  const id = ytId(video.url);
  const yt = isYouTube(video.url);
  const isPlaylist = /playlist\?list=/.test(video.url);
  const playlistId = isPlaylist ? video.url.match(/list=([^&]+)/)?.[1] : null;

  const embed = id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` :
  playlistId ? `https://www.youtube.com/embed/videoseries?list=${playlistId}` :
  null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 200ms ease'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* status bar passthrough */}
      <div style={{ height: 'env(safe-area-inset-top, 12px)', flexShrink: 0 }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        animation: 'slideUp 280ms cubic-bezier(.2,.8,.2,1)'
      }}>
        {/* Close */}
        <div style={{ padding: '4px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', color: T.text,
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3 L11 11 M11 3 L3 11" stroke={T.text} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <Tag color={T.faint}>{video.duration}</Tag>
        </div>

        {/* Player */}
        <div style={{
          margin: '0 16px', borderRadius: 14, overflow: 'hidden',
          background: '#000', aspectRatio: '16/9',
          border: `1px solid ${T.hair}`
        }}>
          {embed ?
          <iframe src={embed} style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> :

          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, color: T.muted, fontFamily: 'Geist, sans-serif', fontSize: 13,
            padding: 16, textAlign: 'center'
          }}>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: T.text }}>External resource</div>
              <div>This video lives outside YouTube — open it in a new tab.</div>
              <a href={video.url} target="_blank" rel="noreferrer" style={{
              marginTop: 8, padding: '10px 16px', background: T.text, color: T.bg,
              borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 12
            }}>Open external →</a>
            </div>
          }
        </div>

        {/* Meta */}
        <div style={{ padding: '20px 24px 16px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: T.faint, textTransform: 'uppercase', marginBottom: 8 }}>
            {video.channel}
          </div>
          <h2 style={{
            fontFamily: 'Instrument Serif, serif', fontWeight: 400,
            fontSize: 26, lineHeight: 1.1, color: T.text, margin: 0
          }}>{video.title}</h2>
          <p style={{
            fontFamily: 'Geist, sans-serif', fontSize: 13.5, lineHeight: 1.55,
            color: T.muted, marginTop: 14, marginBottom: 0
          }}>{video.why}</p>
        </div>

        <div style={{ flex: 1 }} />

        {/* Mark done CTA */}
        <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${T.hair}`, background: 'rgba(20,20,22,0.6)' }}>
          <button onClick={onMarkDone} style={{
            width: '100%', padding: '14px',
            background: isDone ? 'transparent' : T.done,
            color: isDone ? T.text : T.bg,
            border: isDone ? `1px solid ${T.hairStrong}` : 'none',
            borderRadius: 12, cursor: 'pointer',
            fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {isDone ?
            <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8 H13" stroke={T.text} strokeWidth="2" strokeLinecap="round" />
                </svg>
                Mark as not yet watched
              </> :

            <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5 L6.5 12 L13 4.5" stroke={T.bg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Mark watched
              </>
            }
          </button>
        </div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// SKILLS / STATS SCREEN (3rd tab)
// ─────────────────────────────────────────────────────────────
function SkillsScreen({ data, progress }) {
  const skillStats = useMemo(() => {
    const out = {};
    for (const k of Object.keys(data.skillKey)) out[k] = { done: 0, total: 0, topics: [] };
    for (const t of data.topics) {
      for (const s of t.skills) {
        if (!out[s]) continue;
        out[s].topics.push(t);
        for (const v of t.videos) {
          out[s].total += 1;
          if (progress[v.id]) out[s].done += 1;
        }
      }
    }
    return out;
  }, [data, progress]);

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '8px 24px 16px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', color: T.faint, textTransform: 'uppercase', marginBottom: 6 }}>
          Skill categories · CED
        </div>
        <h1 style={{ fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 32, lineHeight: 1.0, color: T.text, margin: 0 }}>
          Where you're <span style={{ fontStyle: 'italic', color: T.muted }}>strongest.</span>
        </h1>
      </div>

      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(data.skillKey).map(([k, v]) => {
          const s = skillStats[k];
          const pct = s.total ? s.done / s.total : 0;
          const color = v.tier === 'HIGH' ? T.high : T.med;
          return (
            <div key={k} style={{
              background: T.surf, border: `1px solid ${T.hair}`, borderRadius: 14,
              padding: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: color, fontWeight: 600 }}>{k}</span>
                    <Tag color={color} border={color}>{v.tier}</Tag>
                  </div>
                  <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18, color: T.text, lineHeight: 1.2 }}>
                    {v.name}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: T.faint, marginTop: 4, letterSpacing: '0.06em' }}>
                    EXAM WEIGHT · {v.weight}
                  </div>
                </div>
                <Ring pct={pct} size={56} stroke={4} color={pct === 1 ? T.done : color} track={T.hair}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: T.text }}>
                    {Math.round(pct * 100)}%
                  </div>
                </Ring>
              </div>
              <Bar pct={pct} color={pct === 1 ? T.done : color} track={T.hair} />
              <div style={{ marginTop: 10, fontFamily: 'Geist, sans-serif', fontSize: 11.5, color: T.muted }}>
                {s.done}/{s.total} videos · {s.topics.length} topics: {' '}
                <span style={{ color: T.faint }}>
                  {s.topics.map((t) => t.title).join(' · ')}
                </span>
              </div>
            </div>);

        })}
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// TOPICS LIST (2nd tab — minimal)
// ─────────────────────────────────────────────────────────────
function TopicsListScreen({ data, progress, onOpenTopic }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '8px 24px 16px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', color: T.faint, textTransform: 'uppercase', marginBottom: 6 }}>
          All gap topics · {data.topics.length}
        </div>
        <h1 style={{ fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 32, lineHeight: 1.0, color: T.text, margin: 0 }}>
          The <span style={{ fontStyle: 'italic', color: T.muted }}>syllabus.</span>
        </h1>
      </div>
      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.topics.map((t) => {
          const done = t.videos.filter((v) => progress[v.id]).length;
          return (
            <TopicCard key={t.id} topic={t}
            stats={{ done, total: t.videos.length, pct: done / t.videos.length }}
            onClick={() => onOpenTopic(t.id)} />);

        })}
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────
function App() {
  const data = window.AP_LANG_DATA;
  const [progress, setProgress] = useState(loadProgress);
  const [tab, setTab] = useState('dashboard');
  const [openTopicId, setOpenTopicId] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {saveProgress(progress);}, [progress]);

  const toggle = (id) => setProgress((p) => ({ ...p, [id]: !p[id] }));
  const markDone = (id, val = true) => setProgress((p) => ({ ...p, [id]: val }));

  const openTopic = (id) => setOpenTopicId(id);
  const closeTopic = () => setOpenTopicId(null);
  const topic = data.topics.find((t) => t.id === openTopicId);

  // Tab switch closes detail
  const switchTab = (t) => {setTab(t);setOpenTopicId(null);};

  // Determine main screen
  let main;
  if (topic) {
    main = <TopicScreen topic={topic} progress={progress}
    onToggle={toggle}
    onPlay={(v) => setActiveVideo(v)}
    onBack={closeTopic}
    skillKey={data.skillKey} />;
  } else if (tab === 'dashboard') {
    main = <Dashboard data={data} progress={progress} onOpenTopic={openTopic} onSetTab={setTab} />;
  } else if (tab === 'topics') {
    main = <TopicsListScreen data={data} progress={progress} onOpenTopic={openTopic} />;
  } else {
    main = <SkillsScreen data={data} progress={progress} />;
  }

  return (
    <div style={{
      width: '100%', height: '100%', background: T.bg, color: T.text,
      display: 'flex', flexDirection: 'column', position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0 }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {main}
      </div>
      <TabBar tab={tab} setTab={switchTab} />

      {activeVideo &&
      <VideoModal video={activeVideo}
      isDone={!!progress[activeVideo.id]}
      onClose={() => setActiveVideo(null)}
      onMarkDone={() => markDone(activeVideo.id, !progress[activeVideo.id])} />
      }
    </div>);

}

window.App = App;