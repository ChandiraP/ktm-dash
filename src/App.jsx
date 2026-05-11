import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const KTMProDash = () => {
  const [bootStage, setBootStage] = useState('READY');
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0); // New Max Speed
  const [trip, setTrip] = useState(0);
  const [odo, setOdo] = useState(0);
  const [isHighBeam, setIsHighBeam] = useState(true); 
  const [diag, setDiag] = useState(false);
  const [diagGear, setDiagGear] = useState('N');
  const [sweepRpm, setSweepRpm] = useState(0);
  const [gpsStatus, setGpsStatus] = useState("OFFLINE"); 
  const [warningsActive, setWarningsActive] = useState(true);
  
  const watchId = useRef(null);
  const lastPos = useRef(null);

  // Load Saved Data on Boot
  useEffect(() => {
    setTimeout(() => setBootStage('TO'), 800);
    setTimeout(() => setBootStage('RACE'), 1600);
    setTimeout(() => setBootStage('WELCOME'), 2400);
    setTimeout(() => setBootStage('DASH'), 4000);
    
    const savedOdo = localStorage.getItem('ktm_odo_final_v2');
    if (savedOdo) setOdo(parseFloat(savedOdo));
  }, []);

  // Distance Formula for Odo
  const getDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const startTracking = () => {
    setGpsStatus("SEARCHING");
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lon, speed: s, accuracy: acc } = p.coords;
      
      setGpsStatus(acc < 25 ? "GOOD" : "ERROR");
      const curSpeed = (s ? s * 3.6 : 0) < 2 ? 0 : s * 3.6;
      setSpeed(curSpeed);
      
      // Update Max Speed
      if (curSpeed > maxSpeed) setMaxSpeed(curSpeed);

      // Odo & Trip Calculation
      if (lastPos.current && curSpeed > 2) {
        const d = getDist(lastPos.current.lat, lastPos.current.lon, lat, lon);
        if (d > 0.001) { // Only count if moved more than 1 meter
          setTrip(prev => prev + d);
          setOdo(prev => {
            const newOdo = prev + d;
            localStorage.setItem('ktm_odo_final_v2', newOdo); // Save Odo
            return newOdo;
          });
        }
      }
      lastPos.current = { lat, lon };
    }, null, { enableHighAccuracy: true, maximumAge: 0 });
  };

  const handleIgnition = () => {
    if (on) {
      navigator.geolocation.clearWatch(watchId.current);
      setOn(false); setSpeed(0); setMaxSpeed(0); setWarningsActive(true);
    } else {
      setDiag(true);
      setSweepRpm(100);
      ['N', '1', '2', '3', '4', '5'].forEach((g, i) => setTimeout(() => setDiagGear(g), i * 150));
      
      setTimeout(() => {
        setSweepRpm(0); setOn(true); setDiag(false);
        startTracking();
        setTimeout(() => setWarningsActive(false), 10000);
      }, 1200);
    }
  };

  if (bootStage !== 'DASH') {
    return (
      <div className="boot-container">
        <div className="boot-text" style={{ color: bootStage === 'RACE' ? 'var(--ktm-orange)' : 'white' }}>
          {bootStage === 'WELCOME' ? 'CHANDIRA' : bootStage}
        </div>
        {bootStage === 'WELCOME' && <div className="welcome-sub">READY TO RACE</div>}
      </div>
    );
  }

  const isMoving = speed > 2;

  // FIX: CUSTOM GEAR RATIOS
  let gearDisplay = 'N';
  if (!on) gearDisplay = '-';
  else if (speed > 38) gearDisplay = '5';
  else if (speed > 30) gearDisplay = '4';
  else if (speed > 22) gearDisplay = '3';
  else if (speed > 15) gearDisplay = '2';
  else if (speed > 2)  gearDisplay = '1';
  else gearDisplay = 'N';

  const speedDisplay = !on ? '-' : Math.floor(speed);

  return (
    <div className="theme-transition safe-top safe-bottom main-layout" style={{ backgroundColor: isHighBeam ? '#000' : '#f0f2f5', color: isHighBeam ? '#fff' : '#000' }}>
      
      <div className="header-bar" style={{ backgroundColor: isHighBeam ? '#111' : '#fff' }}>
        <div className="header-icon-group">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? (gpsStatus === "GOOD" ? "#22c55e" : "#ef4444") : "#222"} strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="1.5" fill={on ? (gpsStatus === "GOOD" ? "#22c55e" : "#ef4444") : "none"} />
          </svg>
          <span style={{ color: on ? (gpsStatus === "GOOD" ? "#22c55e" : "#ef4444") : "#222" }}>GPS</span>
        </div>
        
        <HeaderIcon active={diag || isHighBeam} color="#2563eb" label="BEAM" d="M2 12h8M2 8h8M2 16h8M14 5c4 0 8 3 8 7s-4 7-8 7V5z" />
        <HeaderIcon active={diag || (on && gearDisplay === 'N')} color="#22c55e" label="NEUTRAL" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        <HeaderIcon active={diag || (on && warningsActive)} color="#ef4444" label="OIL" d="M12 18h.01M7 21h10M9 3h6l-1 15H10L9 3z" />
        <HeaderIcon active={diag || (on && warningsActive)} color="#f59e0b" label="ENGINE" d="M2 9v6h2v2h14v-2h2V9h-2V7H4v2H2zm14 2h-2v2h2v-2z" />
        <HeaderIcon active={diag || (on && gearDisplay === 'N')} color="#fbbf24" label="ABS" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4" />
      </div>

      <div className="rpm-container">
        <div className="rpm-labels">
          <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span style={{color: '#ef4444'}}>10</span>
        </div>
        <div className="rpm-track">
          <div className="rpm-fill" style={{ width: `${sweepRpm || (on ? (speed % 45) * 2.2 + 10 : 0)}%` }} />
        </div>
      </div>

      <div className="center-data">
        <div className="gear-val" style={{ color: gearDisplay === 'N' ? '#22c55e' : '#ff6600' }}>
          {diag ? diagGear : gearDisplay}
        </div>
        <div className="speed-row">
          <span className="speed-val">{diag ? '188' : speedDisplay}</span>
          <span className="unit-text">KM/H</span>
        </div>
      </div>

      {/* STATS ROW WITH MAX SPEED */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">TRIP</span>
          <span className="stat-num">{trip.toFixed(1)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ color: '#ff6600' }}>MAX</span>
          <span className="stat-num" style={{ color: '#ff6600' }}>{Math.floor(maxSpeed)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ color: '#ff6600' }}>ODO</span>
          <span className="stat-num" style={{ color: '#ff6600' }}>{Math.floor(odo)}</span>
        </div>
      </div>

      <div className="controls-row">
        <button onClick={handleIgnition} className="ignite-btn" style={{ background: on ? '#7f1d1d' : '#ff6600' }}>
          {on ? 'KILL' : 'IGNITION'}
        </button>
        <button onClick={() => setIsHighBeam(!isHighBeam)} className="beam-btn" style={{ border: `3px solid ${isHighBeam ? '#2563eb' : '#333'}` }}>
          <span>{isHighBeam ? 'DARK' : 'LIGHT'}</span>
        </button>
      </div>
    </div>
  );
};

const HeaderIcon = ({ active, color, label, d }) => (
  <div className="header-icon-group">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#222"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
    <span style={{ color: active ? color : '#222' }}>{label}</span>
  </div>
);

export default KTMProDash;