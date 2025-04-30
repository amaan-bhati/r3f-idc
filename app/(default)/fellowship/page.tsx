"use client";
import { Canvas, extend } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
} from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import Band from "@/components/band";
import Hero from "@/components/hero";
import { useState } from "react";
// import { WavyBackground } from "@/components/ui/wavy-background";

extend({ MeshLineGeometry, MeshLineMaterial });
useGLTF.preload("/assets/3d/card.glb");
useTexture.preload("/assets/images/tag_texture.png");

export default function Fellowship() {
  const [userData, setUserData] = useState({
    name: ' ',
    github: ' ',
    email: ' ',
    image: '/assets/images/default-profile.png',
    generated: false
  });

  return (
    <div className="relative w-full">
      {/* Hero section taking full width */}
      <div className="w-full">
      <Hero 
          onDataUpdate={(newData) => setUserData(prev => ({...prev, ...newData}))} 
          userData={userData}
        />
      </div>
      
      {/* Band section taking full width */}
      <div className="w-full h-screen">

        <Canvas
          camera={{ position: [0, 0, 13], fov: 25 }}
          style={{ backgroundColor: "transparent" }}
        >
          <ambientLight intensity={Math.PI} />
          <Physics
            debug={false}
            interpolate
            gravity={[0, -40, 0]}
            timeStep={1 / 60}
          >
                  {/* <WavyBackground className="max-w-4xl mx-auto pb-40"> */}
            <Band userData={userData} />
            {/* </WavyBackground> */}
          </Physics>
          <Environment background blur={3.75}>
            {/* Lightformers remain unchanged */}
            <Lightformer
              intensity={2}
              color="white"
              position={[0, -1, 5]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={3}
              color="white"
              position={[-1, -1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={3}
              color="white"
              position={[1, 1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={10}
              color="white"
              position={[-10, 0, 14]}
              rotation={[0, Math.PI / 2, Math.PI / 3]}
              scale={[100, 10, 1]}
            />
          </Environment>
        </Canvas>

      </div>
    </div>
  );
}
