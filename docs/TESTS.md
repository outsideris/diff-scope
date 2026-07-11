# TESTS

## 실행 방법

```sh
npm test          # vitest run
```

Vitest, node 환경, `src/**/*.test.ts` 패턴.

## 테스트 현황

| 테스트 파일                 | 대상                  | 검증 범위                                                                                         |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| `src/main/ipc.test.ts`      | `registerIpcHandlers` | ping 핸들러가 올바른 채널에 등록되고 pong을 반환하는지 (electron mock)                            |
| `src/preload/index.test.ts` | preload API           | `diffScope` API가 contextBridge로 노출되고 `ping()`이 올바른 채널을 invoke 하는지 (electron mock) |

## 테스트 방침

- 주요 테스트 대상은 **git 출력 파서**(status, worktree, log, diff)다. 실제 git 출력을 fixture로 저장해 파싱 결과를 검증한다. (Phase 2)
- git CLI 실행 자체(외부 의존성)는 테스트하지 않는다. 실행 래퍼는 mock/fixture로 입력·출력·오류 처리 계약만 검증한다.
- IPC 계층은 typed API의 입출력 계약을 electron mock으로 검증한다.

## 미검증 영역

- Electron 창 생성/생명주기 (`src/main/index.ts`) — 단위 테스트 대상이 아니며 `npm run dev` 구동 확인으로 대체
- 렌더러 UI (`src/renderer/`) — 아직 실질 로직이 없어 테스트 없음. UI가 생기면 컴포넌트 테스트 도입 검토
