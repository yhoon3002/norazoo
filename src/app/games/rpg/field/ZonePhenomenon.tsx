// rpg/field/ZonePhenomenon.tsx — SP0 Task 8: 존 현상 툴킷 (선언적 환경 오버라이드)
// 10프레임 스로틀로 플레이어 위치 → phenomenonAt 판정 → 전이(활성↔비활성) 시에만
// scene.fog·디렉셔널 라이트 강도를 적용/원복한다(매 프레임 재설정 금지 — DungeonController
// 패턴과 동일). ambientColor는 기존 조명을 건드리지 않고 자체 <ambientLight>를 추가
// 렌더하는 방식으로 표현한다. 파티클은 활성 시에만 BufferGeometry를 1회 생성해
// 정적으로(회전·낙하 없음) 부유시킨다 — "멈춘 시간" 연출.
//
// Fog 소유권: DungeonController(T6)가 던전 내부에서 scene.fog를 소유한다.
// __dungeonActive가 설정된 동안에는 현상 쪽이 항상 양보(적용도, 원복도 하지 않음).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ZONE_DEFS } from "../data/placementData";
import { phenomenonAt, type PhenomenonDef } from "../data/zonePhenomena";

const THROTTLE_FRAMES = 10;

/** 활성 현상의 정적 파티클 — 존 중심 반경 60m 원판에 yBand 내 균등 분포. */
function PhenomenonParticles({
    particles,
    cx,
    cz,
}: {
    particles: NonNullable<PhenomenonDef["particles"]>;
    cx: number;
    cz: number;
}) {
    const points = useMemo(() => {
        const positions = new Float32Array(particles.count * 3);
        for (let i = 0; i < particles.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * 60; // 균등 원판 분포
            const y =
                particles.yBand[0] +
                Math.random() * (particles.yBand[1] - particles.yBand[0]);
            positions[i * 3] = cx + Math.cos(angle) * radius;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = cz + Math.sin(angle) * radius;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: particles.color,
            size: particles.size,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
        });
        return new THREE.Points(geometry, material);
        // 마운트(=활성 전이) 시 1회만 생성 — 정적 분포 유지가 "멈춘 시간" 연출의 핵심
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            points.geometry.dispose();
            (points.material as THREE.Material).dispose();
        };
    }, [points]);

    return <primitive object={points} />;
}

export function ZonePhenomenon() {
    const { scene } = useThree();
    const frame = useRef(0);
    const activeDef = useRef<PhenomenonDef | null>(null);
    const [renderDef, setRenderDef] = useState<PhenomenonDef | null>(null);
    const dirLight = useRef<THREE.DirectionalLight | null>(null);
    const dirLightBase = useRef<number | null>(null);

    // 마운트 시 1회 — FieldScene의 디렉셔널 라이트 획득 + 원값 저장
    useEffect(() => {
        const found: THREE.DirectionalLight[] = [];
        scene.traverse((o) => {
            if ((o as THREE.DirectionalLight).isDirectionalLight) found.push(o as THREE.DirectionalLight);
        });
        const dl = found[0] ?? null;
        dirLight.current = dl;
        dirLightBase.current = dl ? dl.intensity : null;
    }, [scene]);

    // 전투 리마운트 등으로 언마운트될 때도 대칭 원복(FieldScene은 전투마다 리마운트됨)
    useEffect(() => {
        return () => {
            const prev = activeDef.current;
            if (!prev) return;
            if (prev.dirIntensity !== undefined && dirLight.current && dirLightBase.current !== null) {
                dirLight.current.intensity = dirLightBase.current;
            }
            if (prev.fog && !scene.userData.__dungeonActive) {
                scene.fog = null;
            }
        };
    }, [scene]);

    useFrame((state) => {
        frame.current++;
        if (frame.current % THROTTLE_FRAMES !== 0) return;

        // 던전 우선권 — 현상 쪽이 양보(fog 소유권은 DungeonController)
        const dungeonActive = !!state.scene.userData.__dungeonActive;
        let next: PhenomenonDef | null = null;
        if (!dungeonActive) {
            const p = state.scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
            if (p) {
                const flags = useGame.getState().flags;
                next = phenomenonAt(p.x, p.z, flags);
            }
        }

        const prev = activeDef.current;
        if (next === prev) return; // 전이 없음 — fog/라이트/파티클 건드리지 않음
        activeDef.current = next;

        // 이전 활성 원복 (던전이 fog를 이미 점유 중이면 fog는 건드리지 않음)
        if (prev) {
            if (prev.dirIntensity !== undefined && dirLight.current && dirLightBase.current !== null) {
                dirLight.current.intensity = dirLightBase.current;
            }
            if (prev.fog && !dungeonActive) {
                state.scene.fog = null;
            }
        }

        // 신규 활성 적용
        if (next) {
            if (next.fog) {
                state.scene.fog = new THREE.Fog(next.fog.color, next.fog.near, next.fog.far);
            }
            if (next.dirIntensity !== undefined && dirLight.current) {
                dirLight.current.intensity = next.dirIntensity;
            }
        }

        setRenderDef(next);
    });

    const zoneCenter = renderDef ? ZONE_DEFS.find((z) => z.id === renderDef.zone) : undefined;

    return (
        <>
            {renderDef?.ambientColor && (
                <ambientLight color={renderDef.ambientColor} intensity={0.4} />
            )}
            {renderDef?.particles && zoneCenter && (
                <PhenomenonParticles
                    particles={renderDef.particles}
                    cx={zoneCenter.cx}
                    cz={zoneCenter.cz}
                />
            )}
        </>
    );
}
