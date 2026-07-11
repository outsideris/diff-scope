# Phase 1: 스캐폴딩 계획

## 목표

Electron + React + Vite + TypeScript 프로젝트 골격을 만들고, 개발/빌드/검증 파이프라인을 확립한다.

## 작업 항목

1. **프로젝트 스캐폴딩**: electron-vite 기반으로 main/preload/renderer 구조를 만든다.
2. **린트/포맷**: oxlint + oxfmt 설정을 추가한다.
3. **테스트 러너**: Vitest를 설정한다. git 출력 파서(Phase 2)가 주요 테스트 대상이 되므로 메인 프로세스 코드를 단위 테스트할 수 있는 구성으로 한다.
4. **IPC 골격**: preload에서 contextBridge로 typed API를 노출하는 패턴을 잡는다. `nodeIntegration`은 끈다.
5. **QUALITY_GATE.md 갱신**: 실제 package.json 스크립트에 맞게 필수 확인 항목을 채운다.

## 완료 기준

- `npm run dev`로 빈 창이 뜨고, 렌더러에서 IPC로 메인의 더미 API를 호출해 응답을 받는다.
- 테스트, 린트, 타입 체크, 빌드가 각각 명령 한 번으로 실행된다.
- QUALITY_GATE.md의 필수 항목이 실제 명령과 일치한다.

## 열린 질문

- 패키지 매니저 선택 (npm/pnpm/bun) — 스캐폴딩 시점에 결정
- 배포(dmg 패키징)는 개인 도구이므로 후순위. electron-builder 도입 여부는 나중에 판단
