"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Resize } from "@react-three/drei";
import { EffectComposer, Noise, Vignette, Scanline, Glitch } from "@react-three/postprocessing";
import * as THREE from "three";

// --- 1. The Digital Eye Component ---
// Renders different shapes based on 'mode' prop
function EyeElement({ mode, position, rotation, isBlinking }) {
  
  // Define Palette
  const colors = {
    normal: "#39FF14", // Neon Green
    angry: "#ff003c",  // Red
    shock: "#00ffff",  // Cyan
    sus: "#ffff00",    // Yellow
  };
  
  const currentColor = colors[mode] || colors.normal;
  const eyeRef = useRef();

  // Jitter Effect (Random Twitching)
  useFrame(() => {
    if (!eyeRef.current) return;
    if (Math.random() > 0.99) { // 1% chance per frame to twitch
        eyeRef.current.position.x = (Math.random() - 0.5) * 0.03;
        eyeRef.current.position.y = (Math.random() - 0.5) * 0.03;
    } else {
        eyeRef.current.position.x = 0;
        eyeRef.current.position.y = 0;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      
      {/* Jitter Container */}
      <group ref={eyeRef}>
        
        {/* Blink Container (Squash Y axis) */}
        <group scale={[1, isBlinking ? 0.05 : 1, 1]}>

            {/* Faint Glow Background */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[0.4, 0.4]} />
                <meshBasicMaterial color={currentColor} transparent opacity={0.15} />
            </mesh>

            {/* --- EXPRESSION SHAPES --- */}

            {/* 1. NORMAL: ^ ^ */}
            {mode === "normal" && (
                <group position={[0, -0.05, 0]}> 
                    {/* Left Stroke */}
                    <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                        <planeGeometry args={[0.06, 0.25]} />
                        <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                    {/* Right Stroke */}
                    <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
                        <planeGeometry args={[0.06, 0.25]} />
                        <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                </group>
            )}

            {/* 2. ANGRY: > < (X Shape) */}
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

            {/* 3. SHOCKED: [ ] (Square) */}
            {mode === "shock" && (
                 <mesh rotation={[0, 0, Math.PI / 4]}>
                    {/* RingGeometry(innerRadius, outerRadius, thetaSegments) */}
                    <ringGeometry args={[0.12, 0.18, 4]} />
                    <meshBasicMaterial color={currentColor} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
            )}

            {/* 4. SUSPICIOUS: - - (Flat Line) */}
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

// --- 2. The Main Model Component ---
function Model({ mouse }) {
  const group = useRef();
  
  // State for expressions
  const [mode, setMode] = useState("normal"); 
  const [isBlinking, setIsBlinking] = useState(false);
  
  const { scene } = useGLTF("/mask.glb");

  // --- KEYBOARD LISTENERS ---
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

  // --- BLINK LOOP ---
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

  // --- MOUSE TRACKING ---
  useFrame((state) => {
    if (!group.current) return;
    
    // Smooth LERP rotation
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      mouse.current[0] * 0.6, 
      0.1
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -mouse.current[1] * 0.4,
      0.1
    );
  });

  return (
    <group ref={group} dispose={null}>
      
      <Resize scale={2.5}> 
        <Center>
          <primitive object={scene} />
        </Center>
      </Resize>

      {/* --- THE DIGITAL EYES --- */}
      <group position={[0, 0.3, 1.1]}> 
        
        {/* Left Eye */}
        <EyeElement 
            mode={mode} // Pass current expression
            isBlinking={isBlinking} 
            position={[-0.50, 0.2, -0.7]} // Your coords
            rotation={[0, -0.2, 0]}
        />
        
        {/* Right Eye */}
        <EyeElement 
            mode={mode}
            isBlinking={isBlinking} 
            position={[0.50, 0.2, -0.7]} // Your coords
            rotation={[0, 0.2, 0]}
        />
        
      </group>
    </group>
  );
}

// --- 3. The Scene Wrapper ---
export default function HackerFaceScene() {
  const mouse = useRef([0, 0]);

  const handleMouseMove = (e) => {
    mouse.current = [
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    ];
  };

  return (
    <div 
      style={{ width: "100vw", height: "100vh", background: "#050505" }} 
      onMouseMove={handleMouseMove}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
        
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#00ffff" />
        <pointLight position={[-5, -5, 5]} intensity={2} color="#ff00ff" />
        
        <Model mouse={mouse} />

        <EffectComposer disableNormalPass>
            <Noise opacity={0.3} />
            <Scanline density={1.5} opacity={0.3} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <Glitch 
                delay={[2, 6]} 
                duration={[0.2, 0.4]} 
                strength={[0.2, 0.4]} 
            />
        </EffectComposer>

      </Canvas>

      <div style={{
          position: 'absolute', bottom: 40, left: 40, 
          color: '#00ffcc', fontFamily: 'monospace', pointerEvents: 'none' 
      }}>
        <h1 style={{ margin: 0 }}>// WRENCH_MASK_V5</h1>
        <p>PRESS [1] [2] [3] [4] TO CHANGE EXPRESSION</p>
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload("/mask.glb");