import Head from 'next/head'
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import foloRedeem from '../lib/foloRedeem'

import NavigationBar from '../components/NavigationBar'
import BinSelector from '../components/BinSelector'
import WalletConnector from '../components/WalletConnector';
import Footer from '../components/Footer';

export default function Redeem(props) {
  const [user, setUser] = useState({ loggedIn: null })
  useEffect(() => fcl.currentUser.subscribe(setUser), [])
  useEffect((user) => {
    setSelectedToken(null)
    setTokenBalance(0)
  }, [user])
  const [bins, setBins] = useState([])
  const [selectedToken, setSelectedToken] = useState(null)
  const [tokenBalance, setTokenBalance] = useState(0)
  const { setShowNotification, setNotificationContent } = props

  /*useEffect(() => {
    foloRedeem.queryBinsBalances("@elonmusk").then((result) => {
      console.log(result)
    })
  }, [])*/

  return (
    <>
      <Head>
        <title>Hey FOLO | send any tokens to anyone</title>
        <meta property="og:title" content="Hey FOLO | send any tokens to anyone" key="title" />
      </Head>
      <div className="container mx-auto max-w-[660px] min-w-[350px] px-8">
        <NavigationBar user={user} />
        {/*<WalletConnector
          className="mt-12 w-full"
          user={user}
          setShowNotification={setShowNotification}
          setNotificationContent={setNotificationContent}
        />*/}

        <div className="flex flex-col items-center justify-center">
          <BinSelector
            className="w-full mb-20"
            user={user}
            handle="@elonmusk"
          />
          {user && user.loggedIn && (
            <>

            </>
          )}

        </div>
        <Footer />
      </div>
    </>
  )
}
