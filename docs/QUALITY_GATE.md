# Quality Gate

## 필수 확인 항목

- [ ] 테스트: `npm test`
- [ ] 빌드: `npm run build`
- [ ] 린트: `npm run lint`
- [ ] 포매팅: `npm run format:check`
- [ ] 타입 체크: `npm run typecheck`
- [ ] 앱 구동: `npm run dev` 실행 후 창이 뜨고 렌더러에 오류가 없는지 확인

## 선택 확인 항목

- [ ] E2E 테스트: (도입 시 기록)
- [ ] 패키징: `npm run package` 후 `release/mac-arm64/DiffScope.app` 실행 확인 (패키징 관련 변경 시)

## 면제 조건

- 문서만 변경하는 커밋은 위 항목을 면제한다.

## 마지막 검토

- 2026-07-11: Phase 1 스캐폴딩 완료에 맞춰 실제 npm 스크립트로 항목을 채웠다.
