import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    rules: {
      // next/image can't optimize anything here — next.config.mjs sets
      // images.unoptimized, so <img> is the deliberate choice.
      "@next/next/no-img-element": "off",
      // Apostrophes in prose render fine; escaping them only hurts the source.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
