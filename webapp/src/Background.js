import { useState, useEffect, useCallback, useMemo } from 'react';
import './Background.css';

function getTimePhase(hour) {
  if (hour >= 5  && hour < 7)  return 'sunrise';
  if (hour >= 7  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'noon';
  if (hour >= 15 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'sunset';
  return 'night';
}

const PHASE = {
  night:     { sky1: '#020617', sky2: '#0f2027', hill: '#0d2b0d', sun: false, moon: true  },
  sunrise:   { sky1: '#7c2d12', sky2: '#f97316', hill: '#166534', sun: true,  moon: false },
  morning:   { sky1: '#0369a1', sky2: '#7dd3fc', hill: '#15803d', sun: true,  moon: false },
  noon:      { sky1: '#0284c7', sky2: '#bae6fd', hill: '#16a34a', sun: true,  moon: false },
  afternoon: { sky1: '#1d4ed8', sky2: '#60a5fa', hill: '#15803d', sun: true,  moon: false },
  sunset:    { sky1: '#78350f', sky2: '#fb923c', hill: '#14532d', sun: true,  moon: false },
};

const WEATHER_CFG = {
  clear:       { clouds: 0, rain: 0,   snow: false, brightness: 1    },
  partlyCloudy:{ clouds: 3, rain: 0,   snow: false, brightness: 0.95 },
  cloudy:      { clouds: 7, rain: 0,   snow: false, brightness: 0.75 },
  fog:         { clouds: 9, rain: 0,   snow: false, brightness: 0.65 },
  rain:        { clouds: 8, rain: 70,  snow: false, brightness: 0.6  },
  heavyRain:   { clouds: 9, rain: 120, snow: false, brightness: 0.5  },
  snow:        { clouds: 7, rain: 60,  snow: true,  brightness: 0.85 },
  thunder:     { clouds: 9, rain: 100, snow: false, brightness: 0.4  },
};

function getWeatherType(code) {
  const c = parseInt(code);
  if (c === 113) return 'clear';
  if (c === 116) return 'partlyCloudy';
  if ([119, 122].includes(c)) return 'cloudy';
  if ([143, 248, 260].includes(c)) return 'fog';
  if ([200, 386, 389, 392, 395].includes(c)) return 'thunder';
  if ([227, 230, 329, 332, 335, 338, 368, 371, 374, 377].includes(c)) return 'snow';
  if (c >= 293 && c <= 321) return 'rain';
  if (c >= 353 && c <= 381) return 'heavyRain';
  return 'clear';
}

function getSunPos(hour, min) {
  const t = hour * 60 + min, rise = 360, set = 1200;
  if (t < rise || t > set) return null;
  const p = (t - rise) / (set - rise);
  return { x: 5 + p * 90, y: 80 - Math.sin(p * Math.PI) * 68 };
}

function getMoonPos(hour, min) {
  let t = hour * 60 + min;
  if (t < 21 * 60) t += 24 * 60;
  const rise = 21 * 60, set = 5 * 60 + 24 * 60;
  const p = Math.min(1, Math.max(0, (t - rise) / (set - rise)));
  return { x: 5 + p * 90, y: 75 - Math.sin(p * Math.PI) * 60 };
}

export default function Background({ now }) {
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [weatherType, setWeatherType] = useState('clear');

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch('https://wttr.in/?format=j1');
      const data = await res.json();
      const cond = data.current_condition[0];
      setWeatherInfo({ desc: cond.weatherDesc[0].value, temp: cond.temp_C });
      setWeatherType(getWeatherType(cond.weatherCode));
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  const hour  = now.getHours();
  const min   = now.getMinutes();
  const phase = getTimePhase(hour);
  const cfg   = PHASE[phase];
  const wcfg  = WEATHER_CFG[weatherType] || WEATHER_CFG.clear;

  const sunPos  = getSunPos(hour, min);
  const moonPos = getMoonPos(hour, min);

  const stars = useMemo(() =>
    Array.from({ length: 90 }, (_, i) => ({
      left:  (i * 11.3 + 7)  % 100,
      top:   (i * 7.7  + 3)  % 58,
      delay: (i * 0.37) % 3,
      size:  1 + (i % 3 === 0 ? 1 : 0),
    })), []);

  const clouds = useMemo(() =>
    Array.from({ length: wcfg.clouds }, (_, i) => ({
      top:   (i * 13.1 + 4)  % 38,
      size:  90 + (i * 29.7) % 110,
      speed: 25 + (i * 8.3)  % 35,
      delay: -(i * 4.1),
      opacity: 0.75 + (i % 3) * 0.08,
    })), [wcfg.clouds]);

  const drops = useMemo(() =>
    Array.from({ length: wcfg.rain }, (_, i) => ({
      left:     (i * 7.9 + 2)  % 100,
      delay:    (i * 0.23) % 2,
      duration: 0.45 + (i * 0.11) % 0.6,
    })), [wcfg.rain]);

  const TREE_X = [60, 130, 200, 290, 380, 470, 560, 640, 720, 810, 890, 950];

  return (
    <div className="bg" style={{ filter: `brightness(${wcfg.brightness})` }}>

      {/* Sky */}
      <div className="bg-sky" style={{
        background: `linear-gradient(to bottom, ${cfg.sky1} 0%, ${cfg.sky2} 65%, ${cfg.hill} 100%)`
      }}/>

      {/* Stars */}
      {phase === 'night' && stars.map((s, i) => (
        <div key={i} className="bg-star" style={{
          left: `${s.left}%`, top: `${s.top}%`,
          width: s.size, height: s.size,
          animationDelay: `${s.delay}s`
        }}/>
      ))}

      {/* Sun */}
      {cfg.sun && sunPos && (
        <div className="bg-sun" style={{
          left: `${sunPos.x}%`, top: `${sunPos.y}%`,
          boxShadow: phase === 'noon'
            ? '0 0 80px 40px rgba(253,224,71,0.55)'
            : '0 0 50px 25px rgba(251,191,36,0.45)',
        }}/>
      )}

      {/* Moon */}
      {cfg.moon && (
        <div className="bg-moon" style={{ left: `${moonPos.x}%`, top: `${moonPos.y}%` }}/>
      )}

      {/* Clouds */}
      {clouds.map((c, i) => (
        <div key={i} className="bg-cloud" style={{
          top: `${c.top}%`, width: c.size, height: c.size * 0.45,
          opacity: c.opacity,
          animationDuration: `${c.speed}s`,
          animationDelay: `${c.delay}s`,
        }}/>
      ))}

      {/* Rain / Snow */}
      {drops.map((d, i) => (
        <div key={i} className={wcfg.snow ? 'bg-snow' : 'bg-rain'} style={{
          left: `${d.left}%`,
          animationDelay: `${d.delay}s`,
          animationDuration: `${d.duration}s`,
        }}/>
      ))}

      {/* Green landscape SVG */}
      <svg className="bg-hills" viewBox="0 0 1000 280" preserveAspectRatio="none">
        {/* Hintere Hügel */}
        <path d="M0,180 C100,110 200,150 350,140 C500,130 600,90 750,130 C850,155 930,140 1000,130 L1000,280 L0,280 Z"
          fill={cfg.hill} opacity="0.5"/>
        {/* Mittlere Hügel */}
        <path d="M0,220 C80,175 200,195 350,185 C480,175 600,155 750,180 C870,200 950,185 1000,175 L1000,280 L0,280 Z"
          fill={cfg.hill} opacity="0.75"/>
        {/* Vordere Hügel */}
        <path d="M0,248 C120,225 280,240 450,232 C600,225 750,235 900,228 Q960,225 1000,230 L1000,280 L0,280 Z"
          fill="#14532d"/>
        {/* Boden */}
        <rect x="0" y="265" width="1000" height="15" fill="#052e16"/>
        {/* Bäume */}
        {TREE_X.map((x, i) => {
          const h = 38 + (i % 3) * 10;
          const base = 262;
          return (
            <g key={i}>
              <polygon points={`${x},${base-h} ${x-13},${base-h*0.35} ${x+13},${base-h*0.35}`}
                fill="#064e3b" opacity="0.95"/>
              <polygon points={`${x},${base-h*0.55} ${x-17},${base-h*0.05} ${x+17},${base-h*0.05}`}
                fill="#065f46" opacity="0.9"/>
              <rect x={x-3} y={base-12} width="6" height="12" fill="#3f2d1a" opacity="0.8"/>
            </g>
          );
        })}
      </svg>

      {/* Wetter-Badge */}
      {weatherInfo && (
        <div className="bg-badge">
          🌡️ {weatherInfo.temp}°C &nbsp;·&nbsp; {weatherInfo.desc}
        </div>
      )}
    </div>
  );
}
