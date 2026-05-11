import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const KTMProDash = () => {
  // Set default to true so it starts in DARK MODE
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
  const lastPos = useRef(null);

  useEffect(() => {
    const sOdo = localStorage.getItem('ktm_odo_v22');
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
      gearTest.forEach((g, i) => setTimeout(() => setDiagGear(g), i * 180));
      setTimeout(() => {
        setSweepRpm(0);
        setOn(true);
        setDiag(false);
        // Start GPS tracking here
      }, 1300);
    }
  };

  // Theme Logic
  const isDarkMode = isHighBeam;
  const theme = {
    bg: isDarkMode ? '#000000' : '#FFFFFF',
    card: isDarkMode ? '#111111' : '#F3F4F6',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    border: isDarkMode ? '#222222' : '#E5E7EB',
    dimText: isDarkMode ? '#666666' : '#9CA3AF'
  };

  return (
    <div className="theme-transition safe-top safe-bottom" 
         style={{ 
           backgroundColor: theme.bg, 
           color: theme.text, 
           height: '100vh', 
           width: '100vw',
           display: 'flex', 
           flexDirection: 'column',
           transition: 'all 0.3s ease' 
         }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0', backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}` }}>
        <StatusIcon active={on} color="#22c55e" label="GPS" d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
        <StatusIcon active={isHighBeam} color="#2563eb" label="BEAM" d="M2 12h8M2 8h8M2 16h8M14 5c4 0 8 3 8 7s-4 7-8 7V5z" />
        <StatusIcon active={on && speed < 1} color="#22c55e" label="NEUTRAL" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        <StatusIcon active={on} color="#ef4444" label="OIL" d="M12 18h.01M7 21h10M9 3h6l-1 15H10L9 3z" />
      </div>

      {/* RPM SECTION */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', color: theme.dimText, fontStyle: 'italic', marginBottom: '5px' }}>
          <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span style={{color: '#ef4444'}}>10</span>
        </div>
        <div style={{ height: '35px', background: isDarkMode ? '#1a1a1a' : '#DDD', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
          <div style={{ width: `${sweepRpm || (on ? (speed % 40) * 2.5 + 15 : 0)}%`, height: '100%', background: 'linear-gradient(90deg, #FF6600, #FFCC00)', transition: 'width 0.2s' }} />
        </div>
      </div>

      {/* CENTER DISPLAY */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '8rem', fontWeight: '900', color: '#22c55e', fontStyle: 'italic', lineHeight: 1, marginBottom: '-20px' }}>
          {diag ? diagGear : (on ? (speed < 1 ? 'N' : '1') : '-')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: '12rem', fontWeight: '900', fontStyle: 'italic' }}>{diag ? '188' : Math.floor(speed)}</span>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: '#FF6600', fontStyle: 'italic', marginLeft: '10px' }}>KM/H</span>
        </div>
      </div>

      {/* FOOTER CONTROLS */}
      <div style={{ padding: '0 20px 30px', display: 'flex', gap: '15px' }}>
        <button onClick={handleIgnition} style={{ flex: 2, height: '80px', borderRadius: '20px', border: 'none', background: on ? '#7f1d1d' : '#FF6600', color: '#fff', fontWeight: '900', fontSize: '1.5rem' }}>
          {on ? 'KILL ENGINE' : 'IGNITION'}
        </button>
        <button onClick={() => setIsHighBeam(!isHighBeam)} style={{ flex: 1, height: '80px', borderRadius: '20px', border: `3px solid ${isHighBeam ? '#2563eb' : theme.border}`, background: isHighBeam ? '#1e3a8a' : theme.card, color: isHighBeam ? '#fff' : theme.text }}>
           <span style={{fontWeight: '900'}}>{isHighBeam ? 'DARK' : 'LIGHT'}</span>
        </button>
      </div>
    </div>
  );
};

const StatusIcon = ({ active, color, d, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#333"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
    <span style={{ fontSize: '7px', fontWeight: '900', color: active ? color : '#333' }}>{label}</span>
  </div>
);

export default KTMProDash;