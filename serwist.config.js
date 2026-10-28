import { serwist } from "@serwist/next/config";

export default serwist({
  swSrc: "src/app/sw.js",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline" }],
});
