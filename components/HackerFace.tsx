"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Resize } from "@react-three/drei";
import { EffectComposer, Noise, Vignette, Scanline, Glitch } from "@react-three/postprocessing";
import * as THREE from "three";

// --- 1. The Digital Eye Component ---
function EyeElement({ isAngry, position, rotation, isBlinking }) {
  // Define colors
  const angryColor = "#ff003c"; // Red
  const normalColor = "#39FF14"; // Neon Green
  
  // Use a ref to jitter the eye position for that "glitchy" look
  const eyeRef = useRef();

  useFrame((state) => {
    if (!eyeRef.current) return;
    // Random tiny twitching (LED connection drift)
    if (Math.random() > 0.98) {
        eyeRef.current.position.x = (Math.random() - 0.5) * 0.02;
        eyeRef.current.position.y = (Math.random() - 0.5) * 0.02;
    } else {
        // Snap back to center
        eyeRef.current.position.x = 0;
        eyeRef.current.position.y = 0;
    }
  });
  
  return (
    <group position={position} rotation={rotation}>
      
      {/* Jitter Container */}
      <group ref={eyeRef}>
        {/* BLINKING LOGIC: Squash Y scale to 0.1 when blinking */}
        <group scale={[1, isBlinking ? 0.05 : 1, 1]}>

            {/* Background Glow */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[0.4, 0.4]} />
                <meshBasicMaterial 
                color={isAngry ? angryColor : normalColor} 
                transparent 
                opacity={0.15} 
                />
            </mesh>

            {/* --- SHAPE RENDERING --- */}
            {isAngry ? (
                // --- ANGRY STATE: The "X" Shape ---
                <group>
                    <mesh rotation={[0, 0, Math.PI / 4]}>
                        <planeGeometry args={[0.08, 0.35]} />
                        <meshBasicMaterial color={angryColor} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                    <mesh rotation={[0, 0, -Math.PI / 4]}>
                        <planeGeometry args={[0.08, 0.35]} />
                        <meshBasicMaterial color={angryColor} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                </group>
            ) : (
                // --- NORMAL STATE: The "^" Shape ---
                <group position={[0, -0.05, 0]}> 
                    <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                        <planeGeometry args={[0.06, 0.25]} />
                        <meshBasicMaterial color={normalColor} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                    <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
                        <planeGeometry args={[0.06, 0.25]} />
                        <meshBasicMaterial color={normalColor} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                </group>
            )}
        </group>
      </group>

    </group>
  );
}

// --- 2. The Main Model Component ---
function Model({ mouse }) {
  const group = useRef();
  const [isAngry, setIsAngry] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  
  const { scene } = useGLTF("/mask.glb");

  // --- LIFE CYCLE: Random Blinking ---
  useEffect(() => {
    const blinkLoop = () => {
        // Random time between blinks (2000ms to 5000ms)
        const nextBlinkTime = Math.random() * 3000 + 2000;
        
        setTimeout(() => {
            setIsBlinking(true);
            // Eyes close for 150ms
            setTimeout(() => {
                setIsBlinking(false);
                blinkLoop(); // Restart loop
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
    <group ref={group} dispose={null} onClick={() => setIsAngry(!isAngry)}>
      
      <Resize scale={2.5}> 
        <Center>
          <primitive object={scene} />
        </Center>
      </Resize>

      {/* --- THE DIGITAL EYES --- */}
      {/* Using your custom coordinates from the uploaded file */}
      <group position={[0, 0.3, 1.1]}> 
        
        {/* Left Eye */}
        <EyeElement 
            isAngry={isAngry} 
            isBlinking={isBlinking} // Pass blink state
            position={[-0.50, 0.2, -0.7]} 
            rotation={[0, -0.2, 0]}
        />
        
        {/* Right Eye */}
        <EyeElement 
            isAngry={isAngry} 
            isBlinking={isBlinking} // Pass blink state
            position={[0.50, 0.2, -0.7]} 
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
        <h1 style={{ margin: 0 }}>// WRENCH_MASK_V4_ALIVE</h1>
        <p>STATUS: ONLINE</p>
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload("/mask.glb");