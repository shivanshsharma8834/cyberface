"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Resize, Float, Sparkles, Grid } from "@react-three/drei";
import { EffectComposer, Noise, Vignette, Scanline, Glitch } from "@react-three/postprocessing";
import * as THREE from "three";

// --- TYPES ---
type EyeMode = "normal" | "angry" | "shock" | "sus";
type AudioSourceType = "mic" | "system" | null;

interface EyeProps {
  mode: EyeMode;
  position: [number, number, number];
  rotation: [number, number, number];
  isBlinking: boolean;
  volume: number;
}

interface MouthProps {
  mode: EyeMode;
  volume: number;
  position: [number, number, number];
}

interface ModelProps {
  mouse: React.MutableRefObject<number[]>;
  getVolume: () => number;
}

// --- 1. AUDIO ANALYZER HOOK ---
function useAudioAnalyzer(sourceType: AudioSourceType) {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!sourceType) return;

    const setupAudio = async () => {
        try {
            let stream: MediaStream;
            // Handle cross-browser audio context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            
            if (sourceType === 'mic') {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } else {
                // System Audio via Screen Share
                stream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true, 
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    } 
                });
            }

            const source = audioCtx.createMediaStreamSource(stream);
            const newAnalyzer = audioCtx.createAnalyser();
            newAnalyzer.fftSize = 64; 
            newAnalyzer.smoothingTimeConstant = 0.8; 
            
            source.connect(newAnalyzer);
            
            const bufferLength = newAnalyzer.frequencyBinCount;
            const data = new Uint8Array(bufferLength);
            
            setAnalyzer(newAnalyzer);
            setDataArray(data);

        } catch (err) {
            console.error("Audio access denied:", err);
        }
    };

    setupAudio();
    
    return () => {
        if(analyzer) analyzer.disconnect();
    }
  }, [sourceType]);

  const getVolume = (): number => {
    if (!analyzer || !dataArray) return 0;
    
    // FIX: Cast dataArray to any to bypass the "ArrayBufferLike" vs "ArrayBuffer" mismatch error
    analyzer.getByteFrequencyData(dataArray as any);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    
    // Normalize (System audio is louder than Mic)
    const normalizeFactor = sourceType === 'system' ? 180.0 : 128.0;
    return (sum / dataArray.length) / normalizeFactor; 
  };

  return getVolume;
}

// --- 2. ENVIRONMENT ---
function DedSecEnvironment() {
  const debrisData = useMemo(() => new Array(15).fill(0).map(() => ({
      position: [
        (Math.random() - 0.5) * 15, 
        (Math.random() - 0.5) * 10, 
        (Math.random() - 1) * 10 - 2
      ] as [number, number, number],
      scale: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? "#00ffff" : "#ff00ff", 
      shape: Math.random() > 0.5 ? "box" : "ico",
  })), []);

  return (
    <group>
      <Sparkles count={100} scale={12} size={4} speed={0.4} opacity={0.5} color="#39FF14" />
      <Sparkles count={50} scale={10} size={6} speed={0.2} opacity={0.4} color="#00ffff" />
      {debrisData.map((data, i) => (
        <Float key={i} speed={1.5} rotationIntensity={2} floatIntensity={2}>
          <mesh position={data.position} scale={data.scale}>
            {data.shape === "box" ? <boxGeometry /> : <icosahedronGeometry args={[1, 0]} />}
            <meshBasicMaterial color={data.color} wireframe={true} transparent opacity={0.3} />
          </mesh>
        </Float>
      ))}
      <Grid position={[0, -2, 0]} args={[20, 20]} cellColor="#39FF14" sectionColor="#00ffff" fadeDistance={15} fadeStrength={1}/>
    </group>
  );
}

// --- 3. DIGITAL EYE ---
function EyeElement({ mode, position, rotation, isBlinking, volume }: EyeProps) {
  const colors: Record<EyeMode, string> = { normal: "#39FF14", angry: "#ff003c", shock: "#00ffff", sus: "#ffff00" };
  const currentColor = colors[mode] || colors.normal;
  const eyeRef = useRef<THREE.Group>(null);
  
  const audioScale = 1 + (volume * 0.3);

  useFrame(() => {
    if (!eyeRef.current) return;
    if (Math.random() > 0.99) {
        eyeRef.current.position.x = (Math.random() - 0.5) * 0.03;
        eyeRef.current.position.y = (Math.random() - 0.5) * 0.03;
    } else {
        eyeRef.current.position.x = 0; eyeRef.current.position.y = 0;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={eyeRef} scale={[audioScale, isBlinking ? 0.05 : audioScale, 1]}>
        <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial color={currentColor} transparent opacity={0.15 + (volume * 0.5)} />
        </mesh>
        {mode === "normal" && (
            <group position={[0, -0.05, 0]}> 
                <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                    <planeGeometry args={[0.06, 0.25]} />
                    <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
                <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
                    <planeGeometry args={[0.06, 0.25]} />
                    <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
            </group>
        )}
        {mode === "angry" && (
            <group>
                 <mesh rotation={[0, 0, Math.PI / 4]}>
                    <planeGeometry args={[0.08, 0.35]} />
                    <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                    <planeGeometry args={[0.08, 0.35]} />
                    <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
            </group>
        )}
        {mode === "shock" && (
             <mesh rotation={[0, 0, Math.PI / 4]}>
                <ringGeometry args={[0.12, 0.18, 4]} />
                <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
        )}
        {mode === "sus" && (
            <mesh>
                <planeGeometry args={[0.25, 0.08]} />
                <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
        )}
      </group>
    </group>
  );
}

// --- 4. MOUTH ELEMENT ---
function MouthElement({ mode, volume, position }: MouthProps) {
    const colors: Record<EyeMode, string> = { normal: "#39FF14", angry: "#ff003c", shock: "#00ffff", sus: "#ffff00" };
    const currentColor = colors[mode] || colors.normal;
    
    const barHeight = 0.15 + (volume * 0.8); 

    return (
        <group position={position}>
            {/* 1. NORMAL */}
            {mode === "normal" && (
                <group>
                    {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
                         <mesh key={i} position={[x, 0, 0]}>
                            <planeGeometry args={[0.04, barHeight * (Math.random() * 0.5 + 0.5)]} />
                            <meshBasicMaterial color={currentColor} toneMapped={false} side={THREE.DoubleSide} />
                         </mesh>
                    ))}
                </group>
            )}

            {/* 2. ANGRY */}
            {mode === "angry" && (
                 <group>
                    {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
                         <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, i % 2 === 0 ? 0.5 : -0.5]}>
                            <planeGeometry args={[0.04, 0.25 + (volume * 0.1)]} />
                            <meshBasicMaterial color={currentColor} toneMapped={false} side={THREE.DoubleSide} />
                         </mesh>
                    ))}
                 </group>
            )}

            {/* 3. SHOCK */}
            {mode === "shock" && (
                <mesh scale={[1, 1 + volume, 1]}>
                     <ringGeometry args={[0.1, 0.15, 4]} />
                     <meshBasicMaterial color={currentColor} rotation={Math.PI/4} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* 4. SUSPICIOUS */}
            {mode === "sus" && (
                <mesh>
                    <planeGeometry args={[0.3, 0.06]} />
                    <meshBasicMaterial color={currentColor} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
            )}
        </group>
    )
}

// --- 5. MAIN MODEL ---
function Model({ mouse, getVolume }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const [mode, setMode] = useState<EyeMode>("normal"); 
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentVol, setCurrentVol] = useState(0);
  const { scene } = useGLTF("/mask.glb");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "1") setMode("normal");
        if (e.key === "2") setMode("angry");
        if (e.key === "3") setMode("shock");
        if (e.key === "4") setMode("sus");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const blinkLoop = () => {
        const nextBlinkTime = Math.random() * 3000 + 2000;
        setTimeout(() => {
            setIsBlinking(true);
            setTimeout(() => { setIsBlinking(false); blinkLoop(); }, 150);
        }, nextBlinkTime);
    };
    blinkLoop();
  }, []);

  useFrame(() => {
    if (!group.current) return;
    const v = getVolume(); 
    setCurrentVol(prev => THREE.MathUtils.lerp(prev, v, 0.5));
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.current[0] * 0.6, 0.1);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.current[1] * 0.4, 0.1);
  });

  return (
    <group ref={group} dispose={null}>
      <Resize scale={2.5}><Center><primitive object={scene} /></Center></Resize>
      
      <group position={[0, 0.3, 1.2]}> 
        <EyeElement mode={mode} isBlinking={isBlinking} volume={currentVol} position={[-0.50, 0.2, -0.7]} rotation={[0, -0.2, 0]} />
        <EyeElement mode={mode} isBlinking={isBlinking} volume={currentVol} position={[0.50, 0.2, -0.7]} rotation={[0, 0.2, 0]} />
      </group>

      <group position={[0, -0.6, 0.75]} rotation={[0.3, 0, 0]}>
         <MouthElement mode={mode} volume={currentVol} position={[0, 0, 0]} />
      </group>

    </group>
  );
}

// --- 6. SCENE WRAPPER ---
export default function HackerFaceScene() {
  const mouse = useRef<number[]>([0, 0]);
  const [audioSource, setAudioSource] = useState<AudioSourceType>(null);
  const getVolume = useAudioAnalyzer(audioSource);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouse.current = [(e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1];
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505" }} onMouseMove={handleMouseMove}>
      
      {!audioSource && (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', zIndex: 10, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', color: '#39FF14', fontFamily: 'monospace',
            gap: '20px'
        }}>
            <h1 style={{fontSize: '2rem', borderBottom: '2px solid #39FF14', paddingBottom: '10px'}}>[ INITIALIZE AUDIO ]</h1>
            
            <div style={{ display: 'flex', gap: '20px' }}>
                <button 
                    onClick={() => setAudioSource('mic')}
                    style={{
                        background: 'transparent', border: '2px solid #39FF14', color: '#39FF14',
                        padding: '15px 30px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '1.2rem',
                        textTransform: 'uppercase', transition: '0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(57, 255, 20, 0.2)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    [ ENABLE MIC ]
                </button>

                <button 
                    onClick={() => setAudioSource('system')}
                    style={{
                        background: 'transparent', border: '2px solid #00ffff', color: '#00ffff',
                        padding: '15px 30px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '1.2rem',
                        textTransform: 'uppercase', transition: '0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    [ SYSTEM AUDIO ]
                </button>
            </div>
            
            <p style={{marginTop: '20px', color: '#888', maxWidth: '400px', textAlign: 'center'}}>
                FOR SYSTEM AUDIO: Select a Tab/Screen and check &quot;Share Audio&quot;.
            </p>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#00ffff" />
        <pointLight position={[-5, -5, 5]} intensity={2} color="#ff00ff" />
        <fog attach="fog" args={['#050505', 5, 15]} />

        <DedSecEnvironment />
        <Model mouse={mouse} getVolume={getVolume} />

        <EffectComposer disableNormalPass>
            <Noise opacity={0.3} />
            <Scanline density={1.5} opacity={0.3} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <Glitch delay={[2, 6]} duration={[0.2, 0.4]} strength={[0.2, 0.4] as any} />
        </EffectComposer>
      </Canvas>

      <div style={{ position: 'absolute', bottom: 40, left: 40, color: '#00ffcc', fontFamily: 'monospace', pointerEvents: 'none' }}>
        <h1 style={{ margin: 0 }}>// DEDSEC_V9.1</h1>
        <p>SOURCE: {audioSource ? audioSource.toUpperCase() : "WAITING"} | KEYS: [1-4]</p>
      </div>
    </div>
  );
}

useGLTF.preload("/mask.glb");