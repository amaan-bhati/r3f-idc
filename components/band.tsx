"use client";
import React from "react";
// import { WavyBackground } from "./ui/wavy-background";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useFrame, ReactThreeFiber, extend } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  RapierRigidBody,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";

extend({ MeshLineGeometry, MeshLineMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      meshLineGeometry: ReactThreeFiber.Object3DNode<
        MeshLineGeometry,
        typeof MeshLineGeometry
      >;
      meshLineMaterial: ReactThreeFiber.Object3DNode<
        MeshLineMaterial,
        typeof MeshLineMaterial
      >;
    }
  }
}

const segmentProps = {
  type: "dynamic",
  canSleep: true,
  colliders: false,
  angularDamping: 2,
  linearDamping: 2,
} as const;

interface BandProps1 {
  maxSpeed?: number;
  minSpeed?: number;
  cardImage?: string;
  personName?: string;
  personTitle?: string;
  githubUsername?: string;
}

interface BandProps {
  userData: {
    name: string;
    github: string;
    email: string;
    image: string;
    generated: boolean;
  };
}

export default function BandBand({ userData }: BandProps) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null);
  const fixed = useRef<RapierRigidBody>(null);
  const j1 = useRef<RapierRigidBody>(null);
  const j2 = useRef<RapierRigidBody>(null);
  const j3 = useRef<RapierRigidBody>(null);

  const card = useRef<RapierRigidBody>(null);
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const minSpeed = 50
  const maxSpeed = 140
  const personTitle = "Keploy API Fellowship"
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);

  // Load textures for the custom card
  const bandTexture = useTexture("/assets/images/tag_texture.png");
  const profileTexture = useTexture(userData.image);
  const cardBackgroundTexture = useTexture("/assets/images/card-background.png");
  const keployLogoTexture = useTexture("/assets/images/keploy-logo.png");

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);

  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0],
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => void (document.body.style.cursor = "auto");
    }
    return () => void (document.body.style.cursor = "auto");
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (
      !fixed.current ||
      !j1.current ||
      !j2.current ||
      !j3.current ||
      !band.current ||
      !card.current
    )
      return;

    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (fixed.current) {
      const [j1Lerped, j2Lerped] = [j1, j2].map((ref) => {
        if (ref.current) {
          const lerped = new THREE.Vector3().copy(ref.current.translation());

          const clampedDistance = Math.max(
            0.1,
            Math.min(1, lerped.distanceTo(ref.current.translation()))
          );

          return lerped.lerp(
            ref.current.translation(),
            delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
          );
        }
      });

      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2Lerped ?? j2.current.translation());
      curve.points[2].copy(j1Lerped ?? j1.current.translation());
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(32));

      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel(
        { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
        false
      );
    }
  });

  curve.curveType = "chordal";
  bandTexture.wrapS = bandTexture.wrapT = THREE.RepeatWrapping;

  // Create circular mask for profile image
  const [circularMask] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 512, 512);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(256, 256, 240, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  });

  // Create circular image with border
  const [circularImageCanvas] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    return canvas;
  });

  // Update circular image with border when profile texture is loaded
  useEffect(() => {
    const updateCircularImage = () => {
      const ctx = circularImageCanvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, 512, 512);
      
      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(256, 256, 230, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Draw the profile image inside the circle
      ctx.drawImage(profileTexture.image, 0, 0, 512, 512);
      ctx.restore();
      ctx.save();
      
      // Draw gradient border
   // Draw partial orange borders (only at certain angles)

  //  const orangeColor = '#FF6E1F';

  //  ctx.lineWidth = 12;

  //  ctx.strokeStyle = orangeColor;

   

  //  // Top-right arc segment

  //  ctx.beginPath();

  //  ctx.arc(256, 256, 230, -0.6, 0.8, false);

  //  ctx.stroke();

   // Bottom-left arc segment

   ctx.beginPath();

   ctx.arc(256, 256, 230, Math.PI + 0.4, Math.PI + 1.8, false);
      ctx.stroke();
    };
    
    if (profileTexture.image) {
      updateCircularImage();
    } else {
      profileTexture.addEventListener('update', updateCircularImage);
      return () => {
        profileTexture.removeEventListener('update', updateCircularImage);
      };
    }
  }, [profileTexture, circularImageCanvas]);

  // Create texture from circular image canvas
  const [circularImageTexture] = useState(() => new THREE.CanvasTexture(circularImageCanvas));
  
  // Update texture when canvas changes
  useEffect(() => {
    circularImageTexture.needsUpdate = true;
  }, [circularImageTexture, profileTexture]);

  // Canvas texture for dynamic text on the card
  const [cardCanvas] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    return canvas;
  });

  // Update canvas with text content
  useEffect(() => {
    const context = cardCanvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
      
      // Fellowship heading gradient (orange to red)
      const titleGradient = context.createLinearGradient(50, 0, 462, 0);
      titleGradient.addColorStop(0, '#FF8C00');    // Dark Orange
      titleGradient.addColorStop(0.5, '#FFA500');  // Orange
      titleGradient.addColorStop(1, '#FF4500');    // Orange Red
      
      // Fellowship heading with modern font
      context.fillStyle = titleGradient;
      context.font = 'bold 28px "Segoe UI", Arial, sans-serif';
      context.textAlign = 'center';
      context.fillText('KEPLOY API FELLOWSHIP', 256, 100);
      
      // Name gradient (different orange palette)
      const nameGradient = context.createLinearGradient(100, 360, 400, 360);
      nameGradient.addColorStop(0, '#FF8036');    // Coral Orange
      nameGradient.addColorStop(0.5, '#FFAA33');  // Amber
      nameGradient.addColorStop(1, '#FF6E1F');    // Deep Orange
      
      // Person name with gradient and more attractive font
      context.fillStyle = nameGradient;
      context.font = 'bold 42px "Trebuchet MS", Helvetica, sans-serif';
      context.fillText(userData.name, 256, 360);
      
      // Add subtle shadow effect to name text
      context.shadowColor = 'rgba(0, 0, 0, 0.3)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(userData.name, 256, 360);
      
      // Reset shadow for other text
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      
      // GitHub username, font for the same can be changed here as well
      context.fillStyle = '#E0E0E0';  // Light gray
      context.font = '24px "Roboto", Arial, sans-serif';
      context.fillText(`@${userData.github}`, 256, 400);
      
      // Fellow title, font and style can be changed here
      context.fillStyle = 'white';
      context.font = 'bold 26px "Segoe UI", Arial, sans-serif';
      context.fillText('API Fellow Cohort 2025', 256, 440);
      
      // context.font = '22px "Segoe UI", Arial, sans-serif';
      // context.fillText('', 256, 470);
    }
  }, [userData.name, personTitle, userData.github, cardCanvas]);

  // Create texture from canvas
  const [cardTextTexture] = useState(() => new THREE.CanvasTexture(cardCanvas));
  
  // Update texture when canvas changes
  useEffect(() => {
    cardTextTexture.needsUpdate = true;
  }, [userData.name, personTitle, userData.github, cardTextTexture]);

  return (
    <>
      <group position={[0, 4.6, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.5, 0.7, 0.01]} />
          <group
            scale={1.4}
            position={[0, 0.08, 0]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => {
              (e.target as Element)?.releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e) => {
              (e.target as Element)?.setPointerCapture(e.pointerId);
              card.current &&
                drag(
                  new THREE.Vector3()
                    .copy(e.point)
                    .sub(vec.copy(card.current.translation()))
                );
            }}
          >
            {/* Custom 3D ID Card */}
            <group>
              {/* Card Base */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.6, 2.25, 0.05]} />
                <meshPhysicalMaterial 
                  color="#ffffff"
                  map={cardBackgroundTexture}
                  roughness={0.2}
                  metalness={0.3}
                  clearcoat={1}
                  clearcoatRoughness={0.2}
                />
              </mesh>
              
              {/* Photo Area - Circular with gradient border */}
              <mesh position={[0, 0.15, 0.031]}>
                <planeGeometry args={[0.9, 0.9]} />
                <meshBasicMaterial 
                  map={circularImageTexture}
                  transparent
                  alphaTest={0.1}
                />
              </mesh>
              
              {/* Text Content Area - covering the entire card for better layout */}
              <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[1.5, 2.2]} />
                <meshBasicMaterial 
                  map={cardTextTexture} 
                  transparent
                  alphaTest={0.1}
                />
              </mesh>
              
              {/* Card Clip */}
              <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
                <meshPhysicalMaterial 
                  color="#C0C0C0" 
                  roughness={0.2}
                  metalness={0.8}
                />
              </mesh>
            </group>
          </group>
        </RigidBody>
      </group>
      
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={new THREE.Vector2(2, 1)}
          useMap={1}
          map={bandTexture}
          repeat={new THREE.Vector2(-3, 1)}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}