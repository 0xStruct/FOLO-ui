import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid'
import { Combobox } from '@headlessui/react'

import foloRedeem from '../lib/foloRedeem'
import Decimal from 'decimal.js';

import { TokenListProvider, ENV, Strategy } from 'flow-native-token-registry';
import publicConfig from '../publicConfig'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function TokenSelector(props) {
  const [handle, setHandle] = useState(props.handle)
  const [balance, setBalance] = useState(new Decimal(0))
  const [bins, setBins] = useState([])
  const [tokenList, setTokenList] = useState(null)

  const updateHandleAndQuery = () => {
    console.log("handle: ", handle)
    setBins([])

    foloRedeem.queryBinsBalances(handle).then((qBins) => {    
      console.log("qBins: ", qBins)
      //console.log("tokenList", tokenList)
      
      let tokenListWithBalances = []

      for(let qBin in qBins) {
        let token = {}
        if(tokenList) {
          token = tokenList[qBin]
          if(token) token.balance = qBins[qBin]
          
        } else {
          token = {
            id: qBin,
            name: qBin.split(".")[2],
            balance: qBins[qBin],
            symbol: "",
            logoURI: "/FOLO.png"
          }
        }

        tokenListWithBalances.push(token)
        
      }

      console.log("tokenListWithBalances", tokenListWithBalances)
      setBins(tokenListWithBalances)
    })  
  }

  useEffect(() => {
    let env = ENV.Mainnet
    if (publicConfig.chainEnv == 'testnet') {
      env = ENV.Testnet
    }

    if(tokenList == null) {
      let _tokenList = {}
      new TokenListProvider().resolve(Strategy.GitHub, env).then(tokens => { 
        
        tokens.getList().map((token) => {
          token.id = `A.${token.address.substring(2)}.${token.contractName}.Vault`
  
          _tokenList[token.id] = token
          return token
        })
  
        // manually include USCD token
        _tokenList["A.a983fecbed621163.FiatToken.Vault"] = {
          address: "0xa983fecbed621163",
          contractName: "FiatToken",
          name: "USDC",
          decimals: 8,
          id: "0xa983fecbed621163.FiatToken",
          logoURI: "https://cdn.jsdelivr.net/gh/FlowFans/flow-token-list@main/token-registry/A.b19436aae4d94622.FiatToken/logo.svg",
          path: {
            vault: "/storage/USDCVault",
            balance: "/public/USDCVaultBalance",
            receiver: "/public/USDCVaultReceiver"
          },
          symbol: "USDC"
        }

        setTokenList(_tokenList)  
      })
    }
  }, [])

  useEffect(() => {
    updateHandleAndQuery()
  }, [tokenList])

  /*
  const filteredTokens =
    query === ''
      ? tokens
      : tokens.filter((token) => {
          const content = `${token.name} (${token.symbol})`
          return content.toLowerCase().includes(query.toLowerCase())
        })*/

  return (
    <>

      {!props.offSearch && (
        <>
        <label>Enter social handle or email address<br />to check if deposits have been made</label>
        <div className="mt-5 mb-5 flex items-center border-b border-flow-green py-2">
          <input 
            value={handle} 
            onChange={e => setHandle(e.target.value)} 
            onKeyDown={e => {if(e.key === "Enter") updateHandleAndQuery()}}
            className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-2 px-2 leading-tight focus:outline-none focus:ring-flow-green-dark focus:border-flow-green-dark" type="text" placeholder="@elonmusk" aria-label="Social Handle / Email"/>
          <button 
            className="flex-shrink-0 border border-transparent text-base font-medium shadow-md text-black bg-flow-green hover:bg-flow-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green text-sm border-4 text-white py-1 px-2" 
            onClick={updateHandleAndQuery}
            type="button">
            Check
          </button>
        </div>
        </>
      )}

      <div className="container mx-auto">
      {bins.length > 0 && bins.map((token) => (
        token.balance
          ? (<div className="p-3 flex flex-row" key={token.id}>
              <div className="basis-1/4 text-right p-1">
                <Image src={token.logoURI} alt="" width={24} height={24}/>
              </div>
              <div className="basis-1/2 p-1">{token.name} ({token.symbol})</div>
              <div className="basis-1/4 p-1">{token.balance}</div>
            </div>)
          : null
      ))}
      {bins.length < 1 && (<div className="text-center">No deposit has been made for you yet</div>)}
      </div>
    </>
  )
}
