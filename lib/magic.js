import { Magic } from "magic-sdk";
import { FlowExtension } from "@magic-ext/flow";

const createMagic = (key) => {
  return typeof window !== "undefined" && new Magic(key, {
    extensions: [
      new FlowExtension({
        rpcUrl: "https://rest-testnet.onflow.org",
        network: "testnet"
      })
    ]
  });
};

export const magic = createMagic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY);
