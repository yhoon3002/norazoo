// rpg/field/FieldScene.tsx
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Environment as HDRI } from "@react-three/drei";
import * as THREE from "three";
import { EnvironmentModel } from "../environment/EnvironmentModel";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { InteriorLighting } from "../environment/InteriorLighting";
import { FieldPlayer } from "./FieldPlayer";
import { FieldCompanions } from "./FieldCompanions";
import { FieldMerchant } from "./FieldMerchant";
import { FieldQuestNpc } from "./FieldQuestNpc";
import { FieldSmith } from "./FieldSmith";
import { FieldTailor } from "./FieldTailor";
import { ArenaMaster } from "./ArenaMaster";
import { FieldFishTrade } from "./FieldFishTrade";
import { DonationBox } from "./DonationBox";
import { Boatman } from "./Boatman";
import { BountyBoard } from "./BountyBoard";
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
import { FrozenVillager } from "./FrozenVillager";
import { FROZEN_VILLAGERS } from "../data/frozenData";
import { BondEpisode } from "./BondEpisode";
import { BOND_EPISODES } from "../data/bondData";
import { FieldGatherable } from "./FieldGatherable";
import FieldEnemyAvatar from "./FieldEnemyAvatar";
import { NavmeshController } from "./NavmeshController";
import { RespawnController } from "./RespawnController";
import { CutsceneController } from "./CutsceneController";
import { DungeonController } from "./DungeonController";
import { DungeonDoor } from "./DungeonDoor";
import { ZonePhenomenon } from "./ZonePhenomenon";
import { ZoneCompletionController } from "./ZoneCompletionController";
import { FieldPoi } from "./FieldPoi";
import { POIS } from "../data/poiData";
import { FIELD_ENEMIES, FIELD_TREASURES, FIELD_GATHERABLES, GOLDEN_HERB_SPOTS, FISHING_SPOTS } from "../data/gameData";
import { DUNGEON_DOORS } from "../data/dungeonData";
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
            {/* 환경광 HDR — 로컬 벤더링(외부 CDN 의존 제거) + Suspense 격리로 로드 실패에도 씬 마운트 보장 */}
            <Suspense fallback={null}>
                <HDRI
                    files="/hdri/potsdamer_platz_1k.hdr"
                    backgroundIntensity={0.5}
                    environmentIntensity={0.5}
                />
            </Suspense>
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

            {/* 낚시터 — 부두 + 존 물가 3곳 */}
            {FISHING_SPOTS.map((sp) => (
                <FishingSpot key={sp.id} spot={sp} />
            ))}

            {/* 사이드 퀘스트 NPC */}
            {SIDE_QUESTS.map((q) => (
                <FieldQuestNpc key={q.id} quest={q} />
            ))}

            {/* 대장간 NPC — smith_core 완료 후 E로 강화로 오픈 */}
            <FieldSmith />

            {/* 아낙 재봉소 NPC — 에필로그부터 표시, E로 재봉 패널 오픈 */}
            <FieldTailor />

            {/* 어부 반복 납품 NPC — 에필로그부터 표시, E로 어종 세트 납품 */}
            <FieldFishTrade />

            {/* 광장 재건 기부함 — 게이트 없음, E로 단계별 기부 */}
            <DonationBox />

            {/* 사공 NPC — 항구 ↔ 협곡 상륙지 왕복 (ch5_gorge부터 표시) */}
            <Boatman />

            {/* 투기장 관장 NPC — ch2_cleanup부터 표시, E로 반복 웨이브 전투 도전 */}
            <ArenaMaster />

            {/* 사냥 의뢰판 — 반복 토벌 의뢰 */}
            <BountyBoard />

            {/* SP0 던전 프레임워크 — 게이트 왕복(지하 수로) + 리전 조명/포그 판정 */}
            <DungeonController />
            {/* SP0 스위치-문 프리미티브 — 플래그 구동 통행 차단/개방 */}
            {DUNGEON_DOORS.map((d) => (
                <DungeonDoor key={d.id} def={d} />
            ))}
            {/* SP0 존 현상 툴킷 — 선언적 존 환경 오버라이드(fog·라이트·파티클), 항구 「멈춘 파도」 */}
            <ZonePhenomenon />

            {/* 스토리: 트리거 감시 + 목표 빛기둥 + 체크포인트 깃발 */}
            <StoryTriggers />
            <ObjectiveBeacon />
            <TutorialTrail />
            {LORE_POINTS.map((lp) => (
                <FieldLorePoint key={lp.id} point={lp} />
            ))}
            {/* 굳은 주민 조사 이벤트 — 에필로그 전 정지 인형(paused+틴트), 이후 각성 */}
            {FROZEN_VILLAGERS.map((fv) => (
                <FrozenVillager key={fv.id} def={fv} />
            ))}
            {BOND_EPISODES.map((ep) => (
                <BondEpisode key={ep.id} ep={ep} />
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
            <ZoneCompletionController />
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
            <CutsceneController />
            <ThirdPersonCamera dist={3.3} height={1.6} shoulder={0.55} />
        </Canvas>
    );
}