// rpg/environment/bvhRaycast.ts
// three.js 기본 Mesh.raycast는 레이 원점이 메시 boundingSphere 안에 있으면
// far 컬링 없이 전 삼각형을 순회한다 — 이 맵(약 7.7M 삼각형)에서는 캐스트당
// 수 ms~수십 ms가 걸려 이동 프레임이 통째로 무너진다.
// acceleratedRaycast는 geometry.boundsTree(BVH)가 있으면 O(log n)으로 탐색하고,
// 없으면 three 기본 raycast로 폴백하므로 전역 패치해도 안전하다.
import * as THREE from "three";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";

THREE.Mesh.prototype.raycast = acceleratedRaycast;

type BVHGeometry = THREE.BufferGeometry & { boundsTree?: MeshBVH };

// useGLTF 캐시로 clone 간 geometry가 공유되므로 boundsTree는 1회만 빌드된다
export function ensureBoundsTree(obj: THREE.Object3D) {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geo = mesh.geometry as BVHGeometry;
    if (!geo.boundsTree && geo.getAttribute("position")) {
        geo.boundsTree = new MeshBVH(geo);
    }
}
