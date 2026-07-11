# TESTS

## 현황

아직 스캐폴딩 전이라 테스트가 없다. Phase 1에서 Vitest를 설정한다.

## 테스트 방침

- 주요 테스트 대상은 **git 출력 파서**(status, worktree, log, diff)다. 실제 git 출력을 fixture로 저장해 파싱 결과를 검증한다.
- git CLI 실행 자체(외부 의존성)는 테스트하지 않는다. 실행 래퍼는 mock/fixture로 입력·출력·오류 처리 계약만 검증한다.
- IPC 계층은 typed API의 입출력 계약을 검증한다.

## 실행 방법

(Phase 1에서 Vitest 설정 후 기록)

## 미검증 영역

- 전체 (테스트 미구성)
