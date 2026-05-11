import React, { useState, useEffect, useRef } from 'react';
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
  const lastPos = useRef(null);
  const lastTime = useRef(null);

  useEffect(() => {
    const sOdo = localStorage.getItem('ktm_odo_v21');
    if (sOdo) setOdo(parseFloat(sOdo));
  }, []);

  const calcDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const startTracking = () => {
    setGpsStatus("SEARCHING");
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lon, speed: s, accuracy: acc } = p.coords;
      const now = Date.now();
      setAccuracy(acc);

      if (acc < 20) setGpsStatus("GOOD"); 
      else if (acc < 60) setGpsStatus("BAD"); 
      else setGpsStatus("ERROR"); 

      let kmh = s ? s * 3.6 : 0;
      if (!s && lastPos.current && lastTime.current) {
        const d = calcDist(lastPos.current.lat, lastPos.current.lon, lat, lon);
        const t = (now - lastTime.current) / 1000;
        if (t > 0) kmh = (d / t) * 3600;
      }
      
      const cur = kmh < 1.8 ? 0 : kmh;
      setSpeed(cur);

      if (lastPos.current) {
        const d = calcDist(lastPos.current.lat, lastPos.current.lon, lat, lon);
        if (acc < 45 && d > 0.002) {
          setTrip(v => v + d);
          setOdo(v => {
            const up = v + d;
            localStorage.setItem('ktm_odo_v21', up);
            return up;
          });
        }
      }
      lastPos.current = { lat, lon };
      lastTime.current = now;
    }, (e) => setGpsStatus("ERROR"), { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
  };

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
        startTracking();
      }, 1300);
    }
  };

  const gear = !on ? '-' : (speed < 1 ? 'N' : Math.ceil(speed / 35));
  const liveRpm = on ? Math.min((speed % 40) * 2.5 + 15, 100) : 0;
  const displayRpm = sweepRpm > 0 ? sweepRpm : liveRpm;

  const isDarkMode = isHighBeam;
  const theme = {
    bg: isDarkMode ? '#000' : '#f0f2f5',
    card: isDarkMode ? '#111' : '#ffffff',
    text: isDarkMode ? '#fff' : '#000',
    border: isDarkMode ? '#222' : '#d1d5db',
    dimText: isDarkMode ? '#444' : '#94a3b8'
  };

  const getGpsColor = () => {
    if (gpsStatus === "GOOD") return "#22c55e"; 
    if (gpsStatus === "BAD") return "#eab308";  
    return "#ef4444"; 
  };

  return (
    <div className="theme-transition safe-top safe-bottom" style={{ backgroundColor: theme.bg, color: theme.text, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 1. TOP SIGNAL STRIP (Notch Protected) */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 5px', backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on ? getGpsColor() : "#333"} strokeWidth="2.5" className={(on && (gpsStatus === "ERROR" || gpsStatus === "SEARCHING")) ? "gps-blink" : ""} style={{ filter: on ? `drop-shadow(0 0 8px ${getGpsColor()})` : 'none' }}>
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: '7px', fontWeight: '900', color: on ? getGpsColor() : '#333' }}>GPS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={diag || isHighBeam ? "#2563eb" : "#333"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: (diag || isHighBeam) ? `drop-shadow(0 0 8px #2563eb)` : 'none' }}>
            <path d="M2 12h8M2 8h8M2 16h8M14 5c4 0 8 3 8 7s-4 7-8 7V5z" />
          </svg>
          <span style={{ fontSize: '7px', fontWeight: '900', color: diag || isHighBeam ? "#2563eb" : '#333' }}>BEAM</span>
        </div>

        <StatusIcon active={diag || (on && speed < 1)} color="#22c55e" label="NEUTRAL" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        <StatusIcon active={diag || on} color="#ef4444" label="OIL" d="M12 18h.01M7 21h10M9 3h6l-1 15H10L9 3z" />
        <StatusIcon active={diag || (on && speed < 5)} color="#fbbf24" label="ABS" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4" />
        <StatusIcon active={diag} color="#f59e0b" label="ENGINE" d="M12 9v4m0 4h.01" />
      </div>

      {/* 2. RPM GAUGE */}
      <div style={{ padding: '15px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', fontWeight: '900', color: theme.dimText, fontStyle: 'italic' }}>
          <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span style={{color: '#ef4444'}}>10</span>
        </div>
        <div style={{ height: '30px', background: isDarkMode ? '#1a1a1a' : '#e2e8f0', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${theme.border}`, position: 'relative' }}>
          <div style={{ width: `${displayRpm}%`, height: '100%', background: displayRpm > 85 ? '#ef4444' : 'linear-gradient(90deg, #ff6600 70%, #ffeb3b 100%)', transition: sweepRpm > 0 ? 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.2s', boxShadow: displayRpm > 85 ? '0 0 25px #ef4444' : 'none' }} />
        </div>
      </div>

      {/* 3. MAIN DATA CLUSTER (Fixed Collisions) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: (on || diag) ? 1 : 0.05 }}>
        {/* GEAR - Placed above speed */}
        <div style={{ 
          fontSize: '8rem', 
          fontWeight: '900', 
          color: (diag ? diagGear : gear) === 'N' ? '#22c55e' : '#ff6600', 
          fontStyle: 'italic', 
          lineHeight: 1,
          marginBottom: '-20px' 
        }}>
          {diag ? diagGear : gear}
        </div>
        
        {/* SPEED & UNIT */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: '11rem', fontWeight: '900', fontStyle: 'italic', color: theme.text, letterSpacing: '-5px' }}>
            {diag ? '188' : Math.floor(speed)}
          </span>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: '#ff6600', fontStyle: 'italic', marginLeft: '5px' }}>KM/H</span>
        </div>
      </div>

      {/* 4. TRIP & ODO */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 15px 15px', opacity: on ? 1 : 0.1 }}>
        <div style={{ flex: 1, background: theme.card, padding: '12px', borderRadius: '15px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: theme.dimText, fontWeight: '900' }}>TRIP</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>{trip.toFixed(1)}</span>
        </div>
        <div style={{ flex: 1, background: theme.card, padding: '12px', borderRadius: '15px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#ff6600', fontWeight: '900' }}>ODO</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ff6600' }}>{Math.floor(odo)}</span>
        </div>
      </div>

      {/* 5. GLOVE-FRIENDLY CONTROLS */}
      <div style={{ padding: '0 15px 20px', display: 'flex', gap: '10px' }}>
        <button onClick={handleIgnition} style={{ flex: 2, height: '75px', borderRadius: '20px', border: 'none', background: on ? '#7f1d1d' : '#ff6600', color: '#fff', fontWeight: '900', fontSize: '1.2rem' }}>
          {on ? 'KILL ENGINE' : 'START IGNITION'}
        </button>
        <button onClick={() => setIsHighBeam(!isHighBeam)} style={{ 
          flex: 1, height: '75px', borderRadius: '20px', 
          border: `3px solid ${isHighBeam ? '#2563eb' : theme.border}`, 
          background: isHighBeam ? '#1e3a8a' : theme.card, 
          color: isHighBeam ? '#fff' : theme.text, 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' 
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h8M2 8h8M2 16h8M14 5c4 0 8 3 8 7s-4 7-8 7V5z" /></svg>
          <span style={{fontSize: '9px', fontWeight: '900'}}>{isHighBeam ? 'DARK' : 'LIGHT'}</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', paddingBottom: '8px', fontSize: '9px', color: theme.dimText, fontWeight: '900', letterSpacing: '2px' }}>
        ACCURACY: {accuracy ? accuracy.toFixed(0) : '0'}M | KTM FACTORY DASH
      </div>
    </div>
  );
};

const StatusIcon = ({ active, color, d, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#333"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    <span style={{ fontSize: '7px', fontWeight: '900', color: active ? color : '#333' }}>{label}</span>
  </div>
);

export default KTMProDash;