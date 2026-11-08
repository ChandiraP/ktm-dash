import { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

const shifts = { g1: 18, g2: 25, g3: 30, g4: 35 };
const gearMultipliers = [0, 320, 240, 180, 140, 115];

const KTMProMaster = () => {
  const [bootStage, setBootStage] = useState('READY');
  const [on, setOn] = useState(false);
  const [isHighBeam, setIsHighBeam] = useState(true);
  const [diag, setDiag] = useState(false);
  
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [trip, setTrip] = useState(0);
  const [odo, setOdo] = useState(() => Number(localStorage.getItem('ktm_permanent_odo')) || 0);
  const [virtualRpm, setVirtualRpm] = useState(0);
  const [diagGear, setDiagGear] = useState('N');
  const [gpsStatus, setGpsStatus] = useState('off');
  const [diagSpeed, setDiagSpeed] = useState(0);

  const watchId = useRef(null);
  const diagTimers = useRef([]);
  const diagSpeedInterval = useRef(null);
  const lastPos = useRef(null);
  const lastSpeed = useRef(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setBootStage('TO'), 800),
      setTimeout(() => setBootStage('RACE'), 1600),
      setTimeout(() => setBootStage('DASH'), 2600),
    ];
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(diagSpeedInterval.current);
      diagTimers.current.forEach(clearTimeout);
      if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    };
  }, []);

  // --- ENGINE LOGIC ---
  useEffect(() => {
    if (!on && !diag) return;
    if (diag) return;
    const engineLoop = setInterval(() => {
      setVirtualRpm(prev => {
        if (speed < 1.5) return 1500 + (Math.random() * 50);
        const currentGear = speed > shifts.g4 ? 5 : speed > shifts.g3 ? 4 : speed > shifts.g2 ? 3 : speed > shifts.g1 ? 2 : 1;
        const targetRpm = (speed * gearMultipliers[currentGear]) + 1500;
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
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      clearInterval(diagSpeedInterval.current);
      diagTimers.current.forEach(clearTimeout);
      diagTimers.current = [];
      setOn(false); setDiag(false); setSpeed(0); setMaxSpeed(0); setGpsStatus('off'); setVirtualRpm(0); setDiagSpeed(0);
    } else {
      setDiag(true); setVirtualRpm(12000);
      let s = 0;
      diagSpeedInterval.current = setInterval(() => {
        s += 12;
        if (s >= 188) { setDiagSpeed(188); clearInterval(diagSpeedInterval.current); }
        else { setDiagSpeed(s); }
      }, 50);
      const gearSeq = ['N', '1', '2', '3', '4', '5'];
      diagTimers.current = gearSeq.map((g, i) => setTimeout(() => setDiagGear(g), i * 400));
      diagTimers.current.push(setTimeout(() => {
        setDiag(false); setOn(true); setVirtualRpm(1500); setDiagSpeed(0);
        diagSpeedInterval.current = null;
        diagTimers.current = [];
        startTracking();
      }, 2500));
    }
  };

  // --- GPS & ODO SAVING ---
  const startTracking = () => {
    if (!navigator.geolocation) { setGpsStatus('weak'); return; }
    setGpsStatus('searching');
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lon, speed: s, accuracy } = p.coords;
      const goodFix = accuracy <= 40 && s !== null;
      setGpsStatus(goodFix ? 'good' : 'weak');
      if (accuracy > 20) return;
      const kmh = s ? s * 3.6 : 0;
      const curSpeed = kmh < 1.5 ? 0 : kmh;
      setSpeed(curSpeed);
      setMaxSpeed(prevMax => curSpeed > prevMax ? curSpeed : prevMax);

      if (lastPos.current && curSpeed > 2) {
        const R = 6371;
        const dLat = (lat - lastPos.current.lat) * Math.PI / 180;
        const dLon = (lon - lastPos.current.lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2)**2 + Math.cos(lastPos.current.lat*Math.PI/180) * Math.cos(lat*Math.PI/180) * Math.sin(dLon / 2)**2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const elapsed = (p.timestamp - lastPos.current.timestamp) / 1000;

        if (d <= 0.0008 || d > (Math.max(curSpeed, lastPos.current.speed) / 3600) * elapsed * 2) {
          lastPos.current = { lat, lon, timestamp: p.timestamp, speed: curSpeed };
          return;
        }

        setTrip(prev => prev + d);
        setOdo(prev => {
          const nextOdo = prev + d;
          localStorage.setItem('ktm_permanent_odo', nextOdo.toString());
          return nextOdo;
        });
      }
      lastPos.current = { lat, lon, timestamp: p.timestamp, speed: curSpeed };
    }, () => setGpsStatus('weak'), { enableHighAccuracy: true });
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
        <div className="rpm-container scale-up">
          <div className="rpm-scale"><span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span className="red">10</span><span className="red">12</span></div>
          <div className="rpm-track">
            <div className="rpm-fill" style={{ width: `${(virtualRpm / 12000) * 100}%` }}></div>
          </div>
          <div className="rpm-meta">
            <div className={`gps-indicator ${gpsStatus}`} aria-label={`GPS ${gpsStatus}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="1.5" fill="currentColor" /></svg>
              <span>{gpsStatus === 'good' ? 'GPS GOOD' : gpsStatus === 'weak' ? 'GPS WEAK' : gpsStatus === 'searching' ? 'GPS SEARCHING' : 'GPS OFF'}</span>
            </div>
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

export default KTMProMaster;