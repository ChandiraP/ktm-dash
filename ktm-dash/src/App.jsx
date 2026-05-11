import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

const KTMProMaster = () => {
  const [bootStage, setBootStage] = useState('READY'); 
  const [on, setOn] = useState(false);
  const [isHighBeam, setIsHighBeam] = useState(true);
  const [diag, setDiag] = useState(false);
  const [warningsActive, setWarningsActive] = useState(true);
  
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [trip, setTrip] = useState(0);
  const [odo, setOdo] = useState(0);
  const [virtualRpm, setVirtualRpm] = useState(0);
  const [diagGear, setDiagGear] = useState('N');
  const [gpsLocked, setGpsLocked] = useState(false);
  const [diagSpeed, setDiagSpeed] = useState(0);

  const watchId = useRef(null);
  const lastPos = useRef(null);
  const lastSpeed = useRef(0);

  const shifts = { g1: 18, g2: 25, g3: 30, g4: 35 };

  // --- PERSISTENCE: LOAD PERMANENT ODO ---
  useEffect(() => {
    const savedOdo = localStorage.getItem('ktm_permanent_odo');
    if (savedOdo) setOdo(parseFloat(savedOdo));
    
    setTimeout(() => setBootStage('TO'), 800);
    setTimeout(() => setBootStage('RACE'), 1600);
    setTimeout(() => setBootStage('DASH'), 2600);
  }, []);

  // --- ENGINE LOGIC ---
  useEffect(() => {
    if (!on && !diag) { setVirtualRpm(0); return; }
    if (diag) return;
    const engineLoop = setInterval(() => {
      setVirtualRpm(prev => {
        if (speed < 1.5) return 1500 + (Math.random() * 50);
        let currentGear = 1;
        if (speed > shifts.g4) currentGear = 5;
        else if (speed > shifts.g3) currentGear = 4;
        else if (speed > shifts.g2) currentGear = 3;
        else if (speed > shifts.g1) currentGear = 2;
        else currentGear = 1;

        const gearMultipliers = [0, 320, 240, 180, 140, 115]; 
        let targetRpm = (speed * gearMultipliers[currentGear]) + 1500;
        const accel = speed - lastSpeed.current;
        let loadBonus = accel > 0.1 ? accel * 1200 : accel < -0.1 ? -400 : 0;
        lastSpeed.current = speed;

        const finalTarget = Math.min(Math.max(targetRpm + loadBonus, 1500), 7500);
        return prev + (finalTarget - prev) * 0.22;
      });
    }, 80);
    return () => clearInterval(engineLoop);
  }, [speed, on, diag]);

  // --- IGNITION & DIAGNOSTICS ---
  const handleIgnition = () => {
    if (on || diag) {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      setOn(false); setDiag(false); setSpeed(0); setMaxSpeed(0); setGpsLocked(false); setWarningsActive(true);
    } else {
      setDiag(true); setWarningsActive(true); setVirtualRpm(12000); 
      let s = 0;
      const speedInterval = setInterval(() => {
        s += 12;
        if (s >= 188) { setDiagSpeed(188); clearInterval(speedInterval); }
        else { setDiagSpeed(s); }
      }, 50);
      const gearSeq = ['N', '1', '2', '3', '4', '5'];
      gearSeq.forEach((g, i) => setTimeout(() => setDiagGear(g), i * 400));
      setTimeout(() => {
        setDiag(false); setOn(true); setVirtualRpm(1500); setDiagSpeed(0);
        startTracking();
        setTimeout(() => setWarningsActive(false), 10000);
      }, 2500);
    }
  };

  // --- GPS & ODO SAVING ---
  const startTracking = () => {
    if (!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lon, speed: s, accuracy } = p.coords;
      setGpsLocked(accuracy < 40 && s !== null);
      const curSpeed = (s ? s * 3.6 : 0) < 1.5 ? 0 : s * 3.6;
      setSpeed(curSpeed);
      if (curSpeed > maxSpeed) setMaxSpeed(curSpeed);

      if (lastPos.current && curSpeed > 2) {
        const R = 6371; 
        const dLat = (lat - lastPos.current.lat) * Math.PI / 180;
        const dLon = (lon - lastPos.current.lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2)**2 + Math.cos(lastPos.current.lat*Math.PI/180) * Math.cos(lat*Math.PI/180) * Math.sin(dLon / 2)**2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        if (d > 0.0008) { // Filter out drift
          setTrip(prev => prev + d);
          setOdo(prev => {
            const nextOdo = prev + d;
            localStorage.setItem('ktm_permanent_odo', nextOdo.toString());
            return nextOdo;
          });
        }
      }
      lastPos.current = { lat, lon };
    }, null, { enableHighAccuracy: true });
  };

  // --- RESET TRIP ONLY ---
  const resetTripOnly = () => {
    if (window.confirm("RESET TRIP METER? (Odometer will stay)")) {
      setTrip(0);
    }
  };

  const currentGear = useMemo(() => {
    if (diag) return diagGear;
    if (!on) return '-';
    if (speed < 1.5) return 'N';
    if (speed > shifts.g4) return '5';
    if (speed > shifts.g3) return '4';
    if (speed > shifts.g2) return '3';
    if (speed > shifts.g1) return '2';
    return '1';
  }, [speed, on, diag, diagGear]);

  if (bootStage !== 'DASH') {
    return <div className="boot-screen"><h1>{bootStage}</h1></div>;
  }

  return (
    <div className={`main-container ${isHighBeam ? 'dark' : 'light'}`}>
      <div className="safe-area">
        <div className="header-bar">
          <div className={`ind-item ${(on || diag) ? 'active' : ''} ${!gpsLocked && on ? 'flash' : ''}`} style={{ color: (on || diag) ? (gpsLocked ? "#22c55e" : "#ef4444") : "#1a1a1a" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="1.5" fill="currentColor" /></svg>
            <span>GPS</span>
          </div>
          <Indicator on={isHighBeam} color="#2563eb" label="BEAM" d="M2 12h8M2 8h8M2 16h8M14 5c4 0 8 3 8 7s-4 7-8 7V5z" />
          <Indicator on={(on || diag) && currentGear === 'N'} color="#22c55e" label="NEUTRAL" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          <Indicator on={diag || (on && warningsActive)} color="#ef4444" label="OIL" d="M12 18h.01M7 21h10M9 3h6l-1 15H10L9 3z" />
          <Indicator on={diag || (on && warningsActive)} color="#f59e0b" label="ENGINE" d="M2 9v6h2v2h14v-2h2V9h-2V7H4v2H2zm14 2h-2v2h2v-2z" />
          <Indicator on={on || diag} color="#fbbf24" label="ABS" blink={on && speed > 2} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4" />
        </div>

        <div className="rpm-container scale-up">
          <div className="rpm-scale"><span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span className="red">10</span><span className="red">12</span></div>
          <div className="rpm-track">
            <div className="rpm-fill" style={{ width: `${(virtualRpm / 12000) * 100}%` }}></div>
          </div>
          <div className="max-badge-wrap">
            <div className="orange-max-badge bounce">
              <span className="max-lbl">MAX</span>
              <span className="max-val">{Math.floor(maxSpeed)}</span>
            </div>
          </div>
        </div>

        <div className="center-unit slide-in">
          <div className={`gear-val ${currentGear === 'N' ? 'green' : 'orange'}`}>{currentGear}</div>
          <div className="speed-row">
            <span className={`speed-num ${!on && !diag ? 'off' : ''}`}>{diag ? diagSpeed.toString().padStart(2, '0') : Math.floor(speed)}</span>
            <span className="unit-label">KM/H</span>
          </div>
        </div>

        <div className="stats-row slide-up">
          <div className="stat-card"><label>TRIP</label><div className="val">{trip.toFixed(1)} <small>KM</small></div></div>
          <div className="stat-card highlight"><label>TOTAL ODO</label><div className="val">{Math.floor(odo)} <small>KM</small></div></div>
        </div>

        <div className="footer-controls">
          <button onClick={handleIgnition} className={`btn-ignite ${on ? 'kill' : ''}`}>{on ? 'KILL ENGINE' : 'IGNITION'}</button>
          
          <div className="small-btns">
            <button onClick={() => setIsHighBeam(!isHighBeam)} className="btn-mode icon-btn">
              {isHighBeam ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button onClick={resetTripOnly} className="btn-reset icon-btn">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Indicator = ({ on, color, label, d, blink }) => (
  <div className={`ind-item ${on ? 'active' : ''} ${blink ? 'flash' : ''}`} style={{ color: on ? color : '#1a1a1a' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
    <span>{label}</span>
  </div>
);

export default KTMProMaster;