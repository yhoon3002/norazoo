// rpg/field/FieldScene.tsx
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment as HDRI } from "@react-three/drei";
import * as THREE from "three";
import { EnvironmentModel } from "../environment/EnvironmentModel";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { InteriorLighting } from "../environment/InteriorLighting";
import { FieldPlayer } from "./FieldPlayer";
import { FieldCompanions } from "./FieldCompanions";
import { FieldMerchant } from "./FieldMerchant";
import { FieldQuestNpc } from "./FieldQuestNpc";
import { FieldFlag } from "./FieldFlag";
import { FishingSpot } from "./FishingSpot";
import { StoryTriggers } from "./StoryTriggers";
import { ObjectiveBeacon } from "./ObjectiveBeacon";
import { TutorialTrail } from "./TutorialTrail";
import { SpeakerHighlight } from "./SpeakerHighlight";
import { MapBaker } from "./MapBaker";
import { STORY_FLAGS, LORE_POINTS } from "../data/storyData";
import { FieldTreasure } from "./FieldElements";
import { FieldLorePoint } from "./FieldLorePoint";
import { FieldGatherable } from "./FieldGatherable";
import FieldEnemyAvatar from "./FieldEnemyAvatar";
import { NavmeshController } from "./NavmeshController";
import { RespawnController } from "./RespawnController";
import { FieldPoi } from "./FieldPoi";
import { POIS } from "../data/poiData";
import { FIELD_ENEMIES, FIELD_TREASURES, FIELD_GATHERABLES, GOLDEN_HERB_SPOTS } from "../data/gameData";
import { SIDE_QUESTS } from "../data/questData";
import { useGame } from "../presenter/useGameStore";




export function FieldScene({
    onEnemyCollide,
    onTreasureCollide,
}: {
    onEnemyCollide: (
        payload:
            | { template: string; fieldId: string }
            | { group: Array<{ template: string; fieldId: string }> }
    ) => void;
    onTreasureCollide: (treasureId: string) => void;
}) {
    const envRef = useRef<THREE.Group>(null);
    const goldenIdx = useGame((s) => s.goldenHerbIdx);

    return (
        <Canvas
            className="w-full h-full bg-black"
            shadows
            dpr={[0.8, 1.2]}
            performance={{ min: 0.5 }}
            camera={{ fov: 60, near: 0.05, far: 70 }}
            gl={{
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
                outputColorSpace: THREE.SRGBColorSpace,
                powerPreference: "high-performance",
            }}
            onCreated={(st) => {
                // 디버깅용 씬 접근 (콘솔에서 __fieldScene.userData 확인)
                (window as unknown as { __fieldScene?: THREE.Scene }).__fieldScene = st.scene;
            }}
        >
            <ambientLight intensity={0.35} />
            <directionalLight
                position={[10, 20, 5]}
                intensity={5.2}
                castShadow
                shadow-mapSize-width={512}
                shadow-mapSize-height={512}
            />
            <hemisphereLight args={["#bcdfff", "#4a3b2a", 0.55]} />
            <HDRI
                preset="city"
                backgroundIntensity={0.5}
                environmentIntensity={0.5}
            />
            <InteriorLighting />

            <EnvironmentModel
                ref={envRef}
                url="/rpgmap/Environment.glb"
                center
            />
            {/* EnvironmentModel useLayoutEffect 이후 실행되어 같은 좌표계로 navmesh 구성 */}
            {/* debug={true} 로 바꾸면 녹색 선으로 걸을 수 있는 영역이 표시됩니다 */}
            <NavmeshController debug={false} />

            {FIELD_ENEMIES.flatMap((spawn) => {
                if ("templates" in spawn) {
                    return (spawn.templates as string[]).map((template, idx) => (
                        <FieldEnemyAvatar
                            key={`${spawn.id}_${idx}`}
                            id={`${spawn.id}_${idx}`}
                            template={template}
                            pos={new THREE.Vector3(
                                spawn.pos.x + idx * 0.8,
                                spawn.pos.y,
                                spawn.pos.z + idx * 0.8
                            )}
                        />
                    ));
                }
                return [
                    <FieldEnemyAvatar
                        key={spawn.id}
                        id={spawn.id}
                        template={spawn.template}
                        pos={spawn.pos}
                    />,
                ];
            })}

            {/* 보물 */}
            {FIELD_TREASURES.map((t) => (
                <FieldTreasure key={t.id} id={t.id} pos={t.pos} />
            ))}

            {/* 상인 NPC */}
            <FieldMerchant />

            {/* 부두 낚시터 */}
            <FishingSpot />

            {/* 사이드 퀘스트 NPC */}
            {SIDE_QUESTS.map((q) => (
                <FieldQuestNpc key={q.id} quest={q} />
            ))}

            {/* 스토리: 트리거 감시 + 목표 빛기둥 + 체크포인트 깃발 */}
            <StoryTriggers />
            <ObjectiveBeacon />
            <TutorialTrail />
            {LORE_POINTS.map((lp) => (
                <FieldLorePoint key={lp.id} point={lp} />
            ))}
            {FIELD_GATHERABLES.map((g) => (
                <FieldGatherable
                    key={g.id}
                    id={g.id}
                    x={g.pos.x}
                    y={g.pos.y}
                    z={g.pos.z}
                    item={g.item}
                    qty={g.qty}
                />
            ))}
            {/* 황금 약초 — 진입마다 후보 중 1곳 */}
            <FieldGatherable
                id={`golden_${goldenIdx}`}
                x={GOLDEN_HERB_SPOTS[goldenIdx].x}
                y={GOLDEN_HERB_SPOTS[goldenIdx].y}
                z={GOLDEN_HERB_SPOTS[goldenIdx].z}
                item="golden_herb"
                qty={1}
            />
            <RespawnController />
            {STORY_FLAGS.map((f) => (
                <FieldFlag
                    key={f.id}
                    id={f.id}
                    x={f.x}
                    z={f.z}
                    y={f.y}
                    label={f.label}
                />
            ))}
            {POIS.map((poi) => (
                <FieldPoi key={poi.id} poi={poi} />
            ))}

            <FieldPlayer {...{ onEnemyCollide, onTreasureCollide }} />
            <FieldCompanions />
            <SpeakerHighlight />
            <MapBaker />
            <ThirdPersonCamera dist={3.3} height={1.6} shoulder={0.55} />
        </Canvas>
    );
}