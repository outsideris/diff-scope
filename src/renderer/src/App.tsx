import { type JSX, useEffect, useState } from "react";

export function App(): JSX.Element {
  const [pong, setPong] = useState("...");

  useEffect(() => {
    window.diffScope.ping().then(setPong);
  }, []);

  return (
    <main>
      <h1>diff-scope</h1>
      <p>IPC ping: {pong}</p>
    </main>
  );
}
