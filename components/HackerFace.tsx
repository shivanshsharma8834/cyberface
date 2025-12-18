"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Resize, Float, Sparkles, Grid } from "@react-three/drei";
import { EffectComposer, Noise, Vignette, Scanline, Glitch } from "@react-three/postprocessing";
import * as THREE from "three";

// --- 1. THE DIGITAL ENVIRONMENT (New!) ---
function DedSecEnvironment() {
  // Generate random positions for floating debris
  const debrisCount = 15;
  const debrisData = useMemo(() => {
    return new Array(debrisCount).fill(0).map(() => ({
      position: [
        (Math.random() - 0.5) * 15, // Spread X
        (Math.random() - 0.5) * 10, // Spread Y
        (Math.random() - 1) * 10 - 2 // Spread Z (mostly behind)
      ],
      scale: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? "#00ffff" : "#ff00ff", // Random Cyan or Magenta
      shape: Math.random() > 0.5 ? "box" : "ico",
    }));
  }, []);

  return (
    <group>
      {/* A. Cyber Dust Particles (Cyan & Green mix) */}
      <Sparkles count={100} scale={12} size={4} speed={0.4} opacity={0.5} color="#39FF14" />
      <Sparkles count={50} scale={10} size={6} speed={0.2} opacity={0.4} color="#00ffff" />

      {/* B. Floating Wireframe Debris */}
      {debrisData.map((data, i) => (
        <Float 
          key={i} 
          speed={1.5} // Animation speed
          rotationIntensity={2} // How much they rotate
          floatIntensity={2} // How high they float
        >
          <mesh position={data.position} scale={data.scale}>
            {data.shape === "box" ? <boxGeometry /> : <icosahedronGeometry args={[1, 0]} />}
            <meshBasicMaterial 
              color={data.color} 
              wireframe={true} 
              transparent 
              opacity={0.3} 
            />
          </mesh>
        </Float>
      ))}

      {/* C. The Hacker Grid Floor */}
      <Grid 
        position={[0, -2, 0]} 
        args={[20, 20]} 
        cellColor="#39FF14" 
        sectionColor="#00ffff" 
        fadeDistance={15} 
        fadeStrength={1}
      />
    </group>
  );
}

// --- 2. THE DIGITAL EYE COMPONENT (Existing) ---
function EyeElement({ mode, position, rotation, isBlinking }) {
  const colors = { normal: "#39FF14", angry: "#ff003c", shock: "#00ffff", sus: "#ffff00" };
  const currentColor = colors[mode] || colors.normal;
  const eyeRef = useRef();

  useFrame(() => {
    if (!eyeRef.current) return;
    if (Math.random() > 0.99) {
        eyeRef.current.position.x = (Math.random() - 0.5) * 0.03;
        eyeRef.current.position.y = (Math.random() - 0.5) * 0.03;
    } else {
        eyeRef.current.position.x = 0;
        eyeRef.current.position.y = 0;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={eyeRef}>
        <group scale={[1, isBlinking ? 0.05 : 1, 1]}>
            {/* Glow */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[0.4, 0.4]} />
                <meshBasicMaterial color={currentColor} transparent opacity={0.15} />
            </mesh>
            {/* Shapes */}
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
    </group>
  );
}

// --- 3. THE MASK MODEL (Existing) ---
function Model({ mouse }) {
  const group = useRef();
  const [mode, setMode] = useState("normal"); 
  const [isBlinking, setIsBlinking] = useState(false);
  const { scene } = useGLTF("/mask.glb");

  useEffect(() => {
    const handleKeyDown = (e) => {
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
            setTimeout(() => {
                setIsBlinking(false);
                blinkLoop(); 
            }, 150);
        }, nextBlinkTime);
    };
    blinkLoop();
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.current[0] * 0.6, 0.1);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.current[1] * 0.4, 0.1);
  });

  return (
    <group ref={group} dispose={null}>
      <Resize scale={2.5}><Center><primitive object={scene} /></Center></Resize>
      <group position={[0, 0.3, 1.1]}> 
        <EyeElement mode={mode} isBlinking={isBlinking} position={[-0.50, 0.2, -0.7]} rotation={[0, -0.2, 0]} />
        <EyeElement mode={mode} isBlinking={isBlinking} position={[0.50, 0.2, -0.7]} rotation={[0, 0.2, 0]} />
      </group>
    </group>
  );
}

// --- 4. THE SCENE WRAPPER (Updated) ---
export default function HackerFaceScene() {
  const mouse = useRef([0, 0]);
  const handleMouseMove = (e) => {
    mouse.current = [
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    ];
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505" }} onMouseMove={handleMouseMove}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
        
        {/* Lights */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#00ffff" />
        <pointLight position={[-5, -5, 5]} intensity={2} color="#ff00ff" />
        
        {/* Fog to hide the edge of the world */}
        <fog attach="fog" args={['#050505', 5, 15]} />

        {/* --- ADDED ENVIRONMENT --- */}
        <DedSecEnvironment />

        {/* The Mask */}
        <Model mouse={mouse} />

        {/* Post Processing */}
        <EffectComposer disableNormalPass>
            <Noise opacity={0.3} />
            <Scanline density={1.5} opacity={0.3} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <Glitch delay={[2, 6]} duration={[0.2, 0.4]} strength={[0.2, 0.4]} />
        </EffectComposer>

      </Canvas>

      <div style={{ position: 'absolute', bottom: 40, left: 40, color: '#00ffcc', fontFamily: 'monospace', pointerEvents: 'none' }}>
        <h1 style={{ margin: 0 }}>// DEDSEC_V6.0</h1>
        <p>ENV: LOADED | KEYS: [1][2][3][4]</p>
      </div>
    </div>
  );
}

useGLTF.preload("/mask.glb");