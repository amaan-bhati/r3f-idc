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

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
  cardImage?: string;
  personName?: string;
  personTitle?: string;
}

export default function Band({ 
  maxSpeed = 50, 
  minSpeed = 10,
  cardImage = "/assets/images/my-img-0.webp",
  personName = "Amaan Bhati",
  personTitle = "Keploy API Fellow"
}: BandProps) {
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
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);

  // Load textures for the custom card
  const bandTexture = useTexture("/assets/images/tag_texture.png");
  const profileTexture = useTexture(cardImage);
  const cardBackgroundTexture = useTexture("/assets/images/card-background.png");

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

  // Canvas texture for dynamic text on the card
  const [nameCanvas] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    return canvas;
  });

  // Update canvas with name and title
  useEffect(() => {
    const context = nameCanvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, nameCanvas.width, nameCanvas.height);
      context.fillStyle = 'white';
      context.font = 'bold 36px Arial';
      context.fillText(personName, 10, 50);
      context.font = '24px Arial';
      context.fillText(personTitle, 10, 90);
    }
  }, [personName, personTitle, nameCanvas]);

  // Create texture from canvas
  const [nameTexture] = useState(() => new THREE.CanvasTexture(nameCanvas));
  
  // Update texture when canvas changes
  useEffect(() => {
    nameTexture.needsUpdate = true;
  }, [personName, personTitle, nameTexture]);

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
              
              {/* Photo Area */}
              <mesh position={[0, 0.4, 0.03]}>
                <planeGeometry args={[1.2, 1.2]} />
                <meshBasicMaterial 
                  map={profileTexture} 
                  transparent
                />
              </mesh>
              
              {/* Name/Title Area */}
              <mesh position={[0, -0.7, 0.03]}>
                <planeGeometry args={[1.4, 0.6]} />
                <meshBasicMaterial 
                  map={nameTexture} 
                  transparent
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

