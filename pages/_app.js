import '../styles/globals.css'
import { useState, useEffect } from 'react'
import { UserContext } from "../lib/UserContext";
import { useRouter } from "next/router";
import { magic } from "../lib/magic";

import BasicNotification from '../components/BasicNotification'

function MyApp({ Component, pageProps }) {
  const [showNotification, setShowNotification] = useState(false)
  const [notificationContent, setNotificationContent] = useState({})
  const [user, setUser] = useState()
  const router = useRouter()

  useEffect(() => {
    setUser({ loading: true })
    magic.user.isLoggedIn().then((isLoggedIn) => {
      if (isLoggedIn) {
        magic.user.getMetadata().then((userData) => setUser(userData))
        //router.push("/redeem")
      } else {
        if(router.pathname == "/redeem") router.push("/login-magic")
        setUser({ user: null })
      }
    })
  }, [])

  return (
    <div className="bg-white text-black bg-[url('/bg.png')] bg-cover bg-center min-h-screen">
      <UserContext.Provider value={[user, setUser]}>
      <Component {...pageProps} 
        setShowNotification={setShowNotification}
        setNotificationContent={setNotificationContent} />

      <BasicNotification
        type={notificationContent.type}
        title={notificationContent.title}
        detail={notificationContent.detail}
        show={showNotification}
        setShow={setShowNotification}
      />
      </UserContext.Provider>
    </div>
  )
}

export default MyApp
