import { useState, useEffect, useRef } from 'react';
import './App.css';

const SOUNDS = [
  { name: '🔔 Standard-Alarm', type: 'system' },
  { name: '🎵 Windows Gong',   type: 'gong' },
  { name: '📻 Radio',          type: 'radio' },
];

const RADIO_STATIONS = [
  { name: 'Bayern 3',       url: 'https://dispatcher.rndfnk.com/br/br3/live/mp3/128/stream.mp3' },
  { name: 'SWR3',           url: 'https://liveradio.swr.de/sw282p3/swr3/play.mp3' },
  { name: 'Antenne Bayern', url: 'https://stream.antenne.de/antenne/stream.mp3' },
  { name: '1LIVE (WDR)',    url: 'https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3' },
  { name: 'NDR 2',          url: 'https://ndr-ndr2-live.sslcast.addradio.de/ndr/ndr2/live/mp3/128/stream.mp3' },
  { name: 'Radio Bob!',     url: 'https://streams.radiobob.de/bob-live/mp3-192/mediaplayer' },
  { name: 'Energy München', url: 'https://streams.energy.de/energy_mue/mp3-128' },
];

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

async function isInternetAvailable() {
  try {
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD', mode: 'no-cors', cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  }
}

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.5);
}

export default function App() {
  const now = useNow();
  const [alarmTime, setAlarmTime]     = useState('07:00');
  const [alarmSet, setAlarmSet]       = useState(false);
  const [triggered, setTriggered]     = useState(false);
  const [selectedSound, setSelectedSound] = useState(0);
  const [selectedRadio, setSelectedRadio] = useState(0);
  const [status, setStatus]           = useState('Kein Alarm gesetzt');
  const [statusColor, setStatusColor] = useState('#a6e3a1');
  const audioRef = useRef(null);

  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!alarmSet || triggered) return;
    const [ah, am] = alarmTime.split(':').map(Number);
    if (now.getHours() === ah && now.getMinutes() === am && now.getSeconds() === 0) {
      handleTrigger();
    }
  });

  async function handleTrigger() {
    setTriggered(true);
    const sound = SOUNDS[selectedSound];

    if (sound.type === 'radio') {
      const online = await isInternetAvailable();
      if (online) {
        const station = RADIO_STATIONS[selectedRadio];
        audioRef.current = new Audio(station.url);
        audioRef.current.play().catch(() => playBeep());
        setStatus(`🔔 Wecker! Spielt: ${station.name}`);
      } else {
        playBeep();
        setStatus('🔔 Wecker! (Kein Internet – Standardton)');
      }
    } else {
      playBeep();
      setStatus('🔔 WECKER KLINGELT!');
    }
    setStatusColor('#f38ba8');
    window.alert('⏰ Wecker! Zeit aufzustehen!');
  }

  function handleSet() {
    if (!/^\d{2}:\d{2}$/.test(alarmTime)) {
      alert('Bitte eine gültige Uhrzeit eingeben (z. B. 07:30)');
      return;
    }
    stopAudio();
    setAlarmSet(true);
    setTriggered(false);
    const sound = SOUNDS[selectedSound];
    const extra = sound.type === 'radio' ? ` (${RADIO_STATIONS[selectedRadio].name})` : '';
    setStatus(`✅ Alarm gesetzt für ${alarmTime} Uhr – ${sound.name}${extra}`);
    setStatusColor('#a6e3a1');
  }

  function handleStop() {
    stopAudio();
    setAlarmSet(false);
    setTriggered(false);
    setAlarmTime('07:00');
    setStatus('Kein Alarm gesetzt');
    setStatusColor('#a6e3a1');
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  return (
    <div className="app">
      <div className="clock">{timeStr}</div>
      <div className="date">{dateStr}</div>

      <div className="row">
        <label>Weckzeit:</label>
        <input
          type="time"
          value={alarmTime}
          onChange={e => setAlarmTime(e.target.value)}
        />
      </div>

      <div className="row">
        <label>Weckton:</label>
        <select value={selectedSound} onChange={e => setSelectedSound(Number(e.target.value))}>
          {SOUNDS.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
        </select>
      </div>

      {SOUNDS[selectedSound].type === 'radio' && (
        <div className="row">
          <label>Sender:</label>
          <select value={selectedRadio} onChange={e => setSelectedRadio(Number(e.target.value))}>
            {RADIO_STATIONS.map((r, i) => <option key={i} value={i}>{r.name}</option>)}
          </select>
        </div>
      )}

      <div className="status" style={{ color: statusColor }}>{status}</div>

      <div className="buttons">
        <button className="btn-set" onClick={handleSet}>⏰ Alarm setzen</button>
        <button className="btn-stop" onClick={handleStop} disabled={!alarmSet && !triggered}>🛑 Alarm stoppen</button>
      </div>
    </div>
  );
}
