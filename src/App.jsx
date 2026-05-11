import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Power, RotateCcw, Sparkles, 
  AlertTriangle, Thermometer, Droplets, CircleDot, Activity,
  Navigation, Sun, Moon
} from 'lucide-react';
import './App.css';

const KTMProDash = () => {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [trip, setTrip] = useState(0);
  const [odo, setOdo] = useState(0);
  const [isHighBeam, setIsHighBeam] = useState(true); 
  const [diag, setDiag] = useState(false);
  const [diagGear, setDiagGear] = useState('N');
  const [sweepRpm, setSweepRpm] = useState(0);
  const [gpsStatus, setGpsStatus] = useState("OFFLINE");
  const [accuracy, setAccuracy] = useState(null);
  
  const watchId = useRef(null);

  useEffect(() => {
    const sOdo = localStorage.getItem('ktm_odo_final');
    if (sOdo) setOdo(parseFloat(sOdo));
  }, []);

  const handleIgnition = () => {
    if (on) {
      navigator.geolocation.clearWatch(watchId.current);
      setOn(false); setSpeed(0); setSweepRpm(0); setGpsStatus("OFFLINE");
    } else {
      setDiag(true);
      setSweepRpm(100);
      const gearTest = ['N', '1', '2', '3', '4', '5'];
      gearTest.forEach((g, i) => setTimeout(() => setDiagGear(g), i * 150));
      setTimeout(() => {
        setSweepRpm(0); setOn(true); setDiag(false);
        // GPS start logic goes here
      }, 1200);
    }
  };

  const isDarkMode = isHighBeam;
  const theme = {
    bg: isDarkMode ? '#000' : '#f4f4f5',
    card: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    text: isDarkMode ? '#fff' : '#000',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    accent: '#FF6600'
  };

  const displayRpm = sweepRpm > 0 ? sweepRpm : (on ? (speed % 40) * 2.5 + 15 : 0);

  return (
    <div className={`theme-transition safe-area-container ${isDarkMode ? 'dark-ui' : 'light-ui'}`} 
         style={{ backgroundColor: theme.bg, color: theme.text }}>
      
      {/* 1. STATUS BAR */}
      <div className="status-grid">
        <StatusBox active={on} color="#22c55e" label="GPS" Icon={Navigation} />
        <StatusBox active={isHighBeam} color="#3b82f6" label="BEAM" Icon={Sun} />
        <StatusBox active={on && speed < 1} color="#22c55e" label="NEUTRAL" Icon={CircleDot} />
        <StatusBox active={on} color="#ef4444" label="OIL" Icon={Droplets} />
        <StatusBox active={diag} color="#f59e0b" label="TEMP" Icon={Thermometer} />
      </div>

      {/* 2. RPM GAUGE */}
      <div className="rpm-section">
        <div className="rpm-labels">
          {[0,2,4,6,8,10].map(n => <span key={n} className={n === 10 ? 'redline-text' : ''}>{n}</span>)}
        </div>
        <div className="rpm-bar-container" style={{ borderColor: theme.border }}>
          <div className="rpm-fill" style={{ 
            width: `${displayRpm}%`,
            background: displayRpm > 85 ? '#ef4444' : `linear-gradient(90deg, ${theme.accent}, #ffcc00)`
          }} />
        </div>
      </div>

      {/* 3. CENTER DISPLAY */}
      <div className="center-cluster">
        <div className="gear-display" style={{ color: (diag ? diagGear : (speed < 1 ? 'N' : '1')) === 'N' ? '#22c55e' : theme.accent }}>
          {diag ? diagGear : (on ? (speed < 1 ? 'N' : '1') : '-')}
        </div>
        <div className="speed-display">
          <span className="speed-digits">{diag ? '188' : Math.floor(speed)}</span>
          <span className="speed-unit" style={{ color: theme.accent }}>KM/H</span>
        </div>
      </div>

      {/* 4. STATS ROW */}
      <div className="stats-container">
        <div className="stat-box" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <span className="stat-label">TRIP</span>
          <span className="stat-value">{trip.toFixed(1)}</span>
        </div>
        <div className="stat-box" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <span className="stat-label" style={{ color: theme.accent }}>ODO</span>
          <span className="stat-value" style={{ color: theme.accent }}>{Math.floor(odo)}</span>
        </div>
      </div>

      {/* 5. PRO CONTROLS */}
      <div className="controls-container">
        <button onClick={handleIgnition} className={`btn-ignite ${on ? 'btn-on' : ''}`}>
          {on ? <Activity size={32} /> : <Power size={32} />}
          <span>{on ? 'KILL ENGINE' : 'IGNITION'}</span>
        </button>
        <button onClick={() => setIsHighBeam(!isHighBeam)} className="btn-theme" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          {isHighBeam ? <Moon color="#3b82f6" /> : <Sun color="#f59e0b" />}
        </button>
      </div>

      <div className="footer-info">
        ACCURACY: {accuracy || '0'}M | READY TO RACE
      </div>
    </div>
  );
};

const StatusBox = ({ active, color, label, Icon }) => (
  <div className="status-box">
    <Icon size={20} color={active ? color : '#333'} className={active ? 'glow' : ''} />
    <span style={{ color: active ? color : '#333' }}>{label}</span>
  </div>
);

export default KTMProDash;