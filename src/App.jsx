import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

const KTMProDash = () => {
  const [bootStage, setBootStage] = useState('READY');
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0); 
  const [trip, setTrip] = useState(0);
  const [odo, setOdo] = useState(0);
  const [isHighBeam, setIsHighBeam] = useState(true); 
  const [warningsActive, setWarningsActive] = useState(false);
  const [diagGear, setDiagGear] = useState('N');
  const [diag, setDiag] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("OFFLINE");
  const [diagRpm, setDiagRpm] = useState(0);
  
  const watchId = useRef(null);
  const lastPos = useRef(null);

  // --- GEAR LOGIC (EXACT SHIFT POINTS) ---
  const gear = useMemo(() => {
    if (!on && !diag) return '-';
    if (speed < 1.5) return 'N';
    if (speed <= 10) return '1';
    if (speed <= 18) return '2';
    if (speed <= 22) return '3';
    if (speed <= 30) return '4';
    return '5';
  }, [speed, on, diag]);

  // --- FIXED RPM ENGINE ---
  const calculateLiveRPM = () => {
    if (diag) return diagRpm;
    if (!on) return 0;
    if (speed < 1.5) return 1500 + (Math.random() * 50); // Idle flicker

    let calculatedRpm = 1500;

    // 1st Gear: 0 to 10 km/h -> RPM 1500 to 6000
    if (gear === '1') {
      calculatedRpm = 1500 + (speed * 450); 
    } 
    // 2nd Gear: 10 to 18 km/h -> RPM 2000 to 6000
    else if (gear === '2') {
      calculatedRpm = 2000 + ((speed - 10) * 500);
    }
    // 3rd Gear: 18 to 22 km/h -> RPM 2000 to 4000 (Running at 3000)
    else if (gear === '3') {
      calculatedRpm = 2000 + ((speed - 18) * 500);
    }
    // 4th Gear: 22 to 30 km/h -> RPM 3000 to 6000
    else if (gear === '4') {
      calculatedRpm = 3000 + ((speed - 22) * 375);
    }
    // 5th Gear: 30+ km/h -> Running 4000, Shifts 6500, Redlines 50+
    else if (gear === '5') {
      if (speed <= 38) {
        calculatedRpm = 4000 + ((speed - 30) * 312);
      } else {
        // Redline climb: speed 38 to 60 -> RPM 6500 to 10000
        calculatedRpm = 6500 + ((speed - 38) * 160);
      }
    }

    return Math.min(calculatedRpm, 10500);
  };

  const rpm = calculateLiveRPM();

  // --- ODO & PERSISTENCE ---
  useEffect(() => {
    const savedOdo = localStorage.getItem('ktm_odo_vfinal_fixed');
    if (savedOdo) setOdo(parseFloat(savedOdo));
    setTimeout(() => setBootStage('TO'), 800);
    setTimeout(() => setBootStage('RACE'), 1600);
    setTimeout(() => setBootStage('WELCOME'), 2400);
    setTimeout(() => setBootStage('DASH'), 4500);
  }, []);

  const getDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startTracking = () => {
    setGpsStatus("SEARCHING");
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lon, speed: s, accuracy: acc } = p.coords;
      setGpsStatus(acc < 25 ? "GOOD" : "ERROR");
      const curSpeed = (s ? s * 3.6 : 0) < 1.5 ? 0 : s * 3.6;
      setSpeed(curSpeed);
      
      // PERSISTENT MAX SPEED
      setMaxSpeed(prev => curSpeed > prev ? curSpeed : prev);

      if (lastPos.current && curSpeed > 2) {
        const d = getDist(lastPos.current.lat, lastPos.current.lon, lat, lon);
        if (d > 0.0003) {
          setTrip(prev => prev + d);
          setOdo(prev => {
            const next = prev + d;
            localStorage.setItem('ktm_odo_vfinal_fixed', next);
            return next;
          });
        }
      }
      lastPos.current = { lat, lon };
    }, () => setGpsStatus("ERROR"), { enableHighAccuracy: true });
  };

  const toggleEngine = () => {
    if (on) {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      setOn(false); setSpeed(0); setWarningsActive(false); setGpsStatus("OFFLINE");
    } else {
      setDiag(true); setWarningsActive(true); setDiagRpm(10000);
      ['1', '2', '3', '4', '5', 'N'].forEach((g, i) => setTimeout(() => setDiagGear(g), i * 180));
      setTimeout(() => {
        setDiagRpm(0); setOn(true); setDiag(false);
        startTracking();
        setTimeout(() => setWarningsActive(false), 10000);
      }, 1300);
    }
  };

  if (bootStage !== 'DASH') {
    return (
      <div className="boot-screen">
        <h1 className={bootStage === 'RACE' ? 'orange-text' : ''}>
          {bootStage === 'WELCOME' ? 'CHANDIRA' : bootStage}
        </h1>
        {bootStage === 'WELCOME' && <p className="blink-fast">READY TO RACE</p>}
      </div>
    );
  }

  return (
    <div className={`main-container ${isHighBeam ? 'dark' : 'light'}`}>
      <div className="safe-area">
        <div className="header-bar">
          <Indicator on={on} color={gpsStatus === "GOOD" ? "#22c55e" : "#ef4444"} label="GPS" blink={on && gpsStatus !== "GOOD"}>
             <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" fill="currentColor"/>
          </Indicator>
          <Indicator on={isHighBeam} color="#2563eb" label="BEAM">
             <path d="M2 12h8M2 8h8M2 16h8M14 5c4 0 8 3 8 7s-4 7-8 7V5z" />
          </Indicator>
          <Indicator on={on && gear === 'N'} color="#22c55e" label="NEUTRAL">
             <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </Indicator>
          <Indicator on={on && warningsActive} color="#ef4444" label="OIL">
             <path d="M12 18h.01M7 21h10M9 3h6l-1 15H10L9 3z" />
          </Indicator>
          <Indicator on={on && warningsActive} color="#f59e0b" label="ENGINE">
             <path d="M2 9v6h2v2h14v-2h2V9h-2V7H4v2H2zm14 2h-2v2h2v-2z" />
          </Indicator>
          <Indicator on={on} color="#fbbf24" label="ABS" blink={speed > 2}>
             <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4" />
          </Indicator>
        </div>

        <div className="rpm-section">
          <div className="rpm-labels">
            <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span className="red">10</span>
          </div>
          <div className="rpm-track">
            <div className="rpm-fill" style={{ width: `${Math.min((rpm / 10000) * 100, 100)}%` }}></div>
          </div>
        </div>

        <div className="display-center">
          <div className="gear-container">
            <div className={`gear-text ${gear === 'N' ? 'green-gear' : 'orange-gear'}`}>
              {diag ? diagGear : gear}
            </div>
            {(on || diag) && (
              <div className="max-speed-small">
                <span className="label">MAX</span>
                <span className="val">{Math.floor(maxSpeed)}</span>
              </div>
            )}
          </div>
          <div className="speed-row">
            <span className={`speed-num ${rpm > 9500 ? 'vib' : ''}`}>
              {!on && !diag ? '-' : (diag ? '188' : Math.floor(speed))}
            </span>
            <span className="kmh-unit">KM/H</span>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="label">TRIP</span>
            <span className="val">{trip.toFixed(1)}</span>
          </div>
          <div className="stat-card">
            <span className="label orange-text">ODO</span>
            <div className="odo-inner">
               <span className="val orange-text">{Math.floor(odo)}</span>
               <div className="odo-icon">/</div>
            </div>
          </div>
        </div>

        <div className="controls">
          <button onClick={toggleEngine} className={`btn-ignite ${on ? 'kill-mode' : 'ignite-mode'}`}>
            {on ? 'KILL ENGINE' : 'IGNITION'}
          </button>
          <button onClick={() => setIsHighBeam(!isHighBeam)} className="btn-mode">
            {isHighBeam ? 'DARK' : 'LIGHT'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Indicator = ({ on, color, label, children, blink }) => (
  <div className={`icon-group ${on ? 'active' : ''} ${blink ? 'blink' : ''}`} style={{ color: on ? color : '#222' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    <span>{label}</span>
  </div>
);

export default KTMProDash;