import Head from 'next/head'
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";

import NavigationBar from '../components/NavigationBar'
import TokenSelector from '../components/TokenSelector'
import RecipientsInput from '../components/RecipientsInput'
import WalletConnector from '../components/WalletConnector';
import Footer from '../components/Footer';

import styles from "../styles/Landing.module.css"

export default function Home(props) {
  const [user, setUser] = useState({ loggedIn: null })
  useEffect(() => fcl.currentUser.subscribe(setUser), [])
  useEffect((user) => {
    setSelectedToken(null)
    setTokenBalance(0)
  }, [user])
  const [selectedToken, setSelectedToken] = useState(null)
  const [tokenBalance, setTokenBalance] = useState(0)
  const { setShowNotification, setNotificationContent } = props

  return (
    <>
      <Head>
        <title>Hey FOLO | send any tokens to anyone</title>
        <meta property="og:title" content="Hey FOLO | send any tokens to anyone" key="title" />
      </Head>
      <div className="container mx-auto max-w-[660px] min-w-[350px] px-8">
        <NavigationBar user={user} /> 
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-col gap-y-2">
            <label className={`-mt-1 font-flow text-black text-black font-bold text-5xl sm:text-6xl`}>Send</label>
            <div className={styles.landing}>
              <div className={styles.ltitle}>
                <div className="underline text-flow-green font-bold decoration-drizzle-green decoration-4">USDC,</div>
                <div className="underline text-flow-green font-bold decoration-drizzle-green decoration-4">Floats,</div>
                <div className="underline text-flow-green font-bold decoration-drizzle-green decoration-4">Tokens,</div>
                <div className="underline text-flow-green font-bold decoration-drizzle-green decoration-4">NFTs,</div>
              </div>
            </div>

            <label className={`-mt-1 font-flow text-white font-bold text-5xl sm:text-6xl bg-flow-green p-2`}>to anyone</label>
            <label className={`font-flow italic text-black font-semibold text-5xl sm:text-6xl`}>without <span className="line-through">wallets</span></label>
          </div>
          <div className="flex flex-row items-center mt-6">
            <a href="/send"
              className="w-24 p-3 m-3 border border-transparent text-base font-semi-bold shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green border-4 text-black"
            >/send</a>
            <a href="/check"
              className="w-24 p-3 m-3 border border-transparent text-base font-semi-bold shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green border-4 text-black"
            >/check</a>
            <a href="/redeem"
              className="w-24 p-3 m-3 border border-transparent text-base font-semi-bold shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green border-4 text-black"
            >/redeem</a>
          </div>
          <div className="w-full mt-2 bg-yellow-100 p-3 text-sm text-center">
            <p className="m-2">
              YES, <em>/send</em> then <em>/check</em> then <em>/redeem</em>!
            </p>
            <p className="m-2">
              Checkout the button links above to start sending tokens to anyone anywhere
            </p>
          </div>
        </div>
        <Footer />
      </div>
    </>
  )
}
