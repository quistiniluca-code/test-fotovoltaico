import { getDeployStore, getStore } from "@netlify/blobs";

function deploymentContext() {
  return String(globalThis.Netlify?.context?.deploy?.context || "").toLowerCase();
}

export function dataStore(name, options = {}) {
  if (deploymentContext() === "production") return getStore(name, options);
  return getDeployStore({ name, ...options });
}

export const __test = { deploymentContext };
