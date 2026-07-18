const { execFileSync } = require("node:child_process");
const path = require("node:path");

/**
 * 서명 인증서가 없는 환경에서 앱 번들 전체를 ad-hoc 서명한다.
 * 번들 식별자(appId)와 서명 상태를 일관되게 만들어 배포본의 동작을 예측 가능하게 한다.
 * (다른 Mac에서는 여전히 우클릭 → 열기로 Gatekeeper를 통과해야 한다)
 */
exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
};
