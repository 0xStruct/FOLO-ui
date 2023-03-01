import { useContext, useEffect, useState } from "react";
import { UserContext } from "../lib/UserContext";
import { magic } from "../lib/magic";
import { useRouter } from "next/router";

import Head from 'next/head'
import NavigationBar from '../components/NavigationBar'
import BinSelector from '../components/BinSelector'
import Footer from '../components/Footer';

import * as fcl from "@onflow/fcl";

// CONFIGURE ACCESS NODE
fcl.config().put("accessNode.api", "https://rest-testnet.onflow.org");

// CONFIGURE AUTHORIZATION FUNCTION
// replace with your authorization function.
// const AUTHORIZATION_FUNCTION = fcl.currentUser().authorization;
// const AUTHORIZATION_FUNCTION = magic.flow.authorization;

export default function Redeem(props) {
  const [user, setUser] = useContext(UserContext)
  const [verifying, setVerifying] = useState(false)
  const { setShowNotification, setNotificationContent } = props
  const router = useRouter()

  const logout = () => {
    magic.user.logout().then(() => {
      setUser({ user: null })
      router.push("/login-magic")
    })
  }

  const redeem = async () => {
    setNotificationContent({
      type: "information",
      title: "Fixing bugs",
      detail: "Cadence code is working, tying into this frontend"
    })
    setShowNotification(true)
  }

  const verify = async () => {
    let AUTHORIZATION_FUNCTION = magic.flow.authorization
    try {
      console.log("SENDING TRANSACTION");
      setNotificationContent({
        type: "information",
        title: "Sending transaction",
        detail: "Transaction is sent from your custodied wallet. No need approval :)"
      })
      setShowNotification(true)

      setVerifying(true);
      var response = await fcl.send([
        fcl.transaction`
          transaction {
            var acct: AuthAccount

            prepare(acct: AuthAccount) {
              self.acct = acct
            }

            execute {
              log(self.acct.address)
            }
          }
        `,
        fcl.proposer(AUTHORIZATION_FUNCTION),
        fcl.authorizations([AUTHORIZATION_FUNCTION]),
        fcl.payer(AUTHORIZATION_FUNCTION),
        fcl.limit(9999)
      ])
      console.log("TRANSACTION SENT")
      console.log("TRANSACTION RESPONSE", response)
      setNotificationContent({
        type: "information",
        title: "Transaction is sent",
        detail: `Transaction ID is ${response.transactionId}. Waiting for it to be sealed.`
      })
      setShowNotification(true)

      console.log("WAITING FOR TRANSACTION TO BE SEALED")
      var data = await fcl.tx(response).onceSealed()
      console.log("TRANSACTION SEALED", data)
      setNotificationContent({
        type: "information",
        title: "Transaction is sealed",
        detail: `Transaction is sealed with ${data.events.length} events at Block ID: ${data.blockId}`
      })
      setShowNotification(true)

      setVerifying(false)

      if (data.status === 4 && data.statusCode === 0) {
        //setMessage(`Transaction sealed: ${response.transactionId}`)
      } else {
        //setMessage(`Oh No: ${data.errorMessage}`)
        setNotificationContent({
          type: "exclamation",
          title: "Transaction failed",
          detail: `Oh No: ${data.errorMessage}`
        })
        setShowNotification(true)
      }
    } catch (error) {
      console.error("FAILED TRANSACTION", error)
    }
  }

  return (
    <>
      <Head>
        <title>Hey FOLO | send any tokens to anyone</title>
        <meta property="og:title" content="Hey FOLO | send any tokens to anyone" key="title" />
      </Head>
      <div className="container mx-auto max-w-[660px] min-w-[350px] px-8">
        <NavigationBar user={user} /> 

        {user?.issuer && (<>
          <div className="flex flex-col items-center justify-center">
            <div className="w-9/12 bg-flow-green/50 p-3 text-sm text-center drop-shadow">
              <div className="w-9/12 text-left">
                <p className="p-1 text-lg"><label className="text-xs text-gray-700">Your email:</label><br/>{user?.email}</p>
                <p className="p-1 text-lg"><label className="text-xs text-gray-700">Your wallet:</label><br/><a href={`https://testnet.flowview.app/account/${user?.publicAddress}`} target="_blank">{user?.publicAddress}</a></p>
              </div>
              <p className="p-3 text-xs">
                You don't need to sign transactions and worry about losing your private key. You can take full custody of this wallet later on.
              </p>

              <button 
                className="flex-shrink-0 m-3 border border-transparent text-base font-medium shadow-md text-black bg-rose-500 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-700 text-sm border-4 text-gray-50 py-1 px-2"
                onClick={logout}>
                  Logout
              </button>
            </div>
            
            

            <hr className="m-2"/>
            <button 
              className="flex-shrink-0 border border-transparent text-base font-medium shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green text-sm border-4 text-black py-1 px-2"
              onClick={verify}
            >
              Verify Transaction
            </button>
          </div>
        
          <div className="flex flex-col mt-8 items-center">
            <hr />
            <div className="text-sm">Tokens deposited for you: {user.email}</div>
            <BinSelector offSearch={true} handle={user.email} />

            <button
              onClick={redeem}
              className="flex-shrink-0 border border-transparent text-base font-medium shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green text-sm border-4 text-black py-1 px-2" 
            >
              Redeem
            </button>
          </div>

        </>)}
        {!user?.issuer && (<div className="text-center">
        loading...
        </div>)}
      </div>
      <Footer />
    </>
  )
}
