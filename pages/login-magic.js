import { useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { magic } from "../lib/magic";
import { UserContext } from "../lib/UserContext";

import Head from 'next/head'
import NavigationBar from '../components/NavigationBar'
import Footer from '../components/Footer';

export default function Login(props) {
  const [user, setUser] = useContext(UserContext)
  const [email, setEmail] = useState("")
  const { setShowNotification, setNotificationContent } = props
  const router = useRouter()

  // if user is already logged in
  useEffect(() => {
    user?.issuer && router.push("/redeem")
  }, [user])

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const didToken = await magic.auth.loginWithEmailOTP({
        email,
      })

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${didToken}`,
        },
      })

      if (res.ok) {
        const userMetadata = await magic.user.getMetadata()
        setUser(userMetadata)
        router.push("/redeem")
      }
    } catch (error) {
      console.error(error)
    }
  };

  return (
    <>
      <Head>
        <title>Hey FOLO | send any tokens to anyone</title>
        <meta property="og:title" content="Hey FOLO | send any tokens to anyone" key="title" />
      </Head>
      <div className="container mx-auto max-w-[660px] min-w-[350px] px-8">
        <NavigationBar user={user} />
        {!user?.issuer && (
        <div className="flex flex-col items-center justify-center">
          <h2 className="mb-1">Login with your email / social logins to redeem</h2>
          <form onSubmit={handleLogin}>
            <input
              className="h-[50px] mt-2 mb-2 text-lg font-flow border border-flow-green bg-flow-green/10 w-full text-gray-700 mr-3 py-2 px-2 leading-tight focus:outline-none focus:ring-flow-green-dark focus:border-flow-green-dark"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
            />
            <button 
              className="w-full flex-shrink-0 border border-transparent text-base font-medium shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green text-sm border-4 text-black py-1 px-2" 
              type="submit">
              Send OTP Code
            </button>
          </form>
          <div
              className="w-8/12 text-xs p-3 text-justify">
                <p className="p-1">
                Users can login with their email and social accounts to redeem tokens sent to them and manage accordingly with an app custodied wallet
                </p>
                <p className="p-1">
                  No password. No wallet. No asking for wallets. No sending to wrong addresses. No prior setup of vaults.
                </p>
          </div>
        </div>)}
      </div>
      <Footer />
    </>
  )
}
