import Image from "next/image"
import publicConfig from "../publicConfig"

export default function NavigationBar() {
  return (
    <>
      <div className="gap-x-2 flex items-center justify-between h-32">
        <div className="relative gap-x-2 flex items-center">
          <a href="/">
            <div className="flex flex-row items-center pl-6">
              <Image src="/FOLO.png" alt="" width={50} height={50} priority />
              <div className="font-flow text-3xl h-50 ml-1 text-flow-green font-semibold drop-shadow-sm">
                FOLO
              </div>
            </div>
          </a>
          <label className="font-flow text-flow-green border border-flow-green text-sm whitespace-pre"> {publicConfig.chainEnv} </label>
        </div>
        <div className="flex gap-x-2 items-center text-sm text-gray-400">
          <a
            className="mx-1 text-flow-green/50 hover:text-flow-green"
            href="/send">/send</a>
          <a
            className="mx-1 text-flow-green/50 hover:text-flow-green"
            href="/check">/check</a>
          <a 
            className="mx-1 text-flow-green/50 hover:text-flow-green"
            href="/redeem">/redeem</a>
        </div>
      </div>
    </>
  )
}