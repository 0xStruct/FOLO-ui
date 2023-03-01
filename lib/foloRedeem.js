import publicConfig from "../publicConfig"
import * as fcl from "@onflow/fcl"
import Decimal from 'decimal.js'

const fungibleTokenPath = "0xFungibleToken"

const batchQueryReceiver = async (token, addresses) => {
  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}

    pub fun main(addresses: [Address]): [Address] {
      var counter = 0
      var invalidAddresses: [Address] = []

      while (counter < addresses.length) {
          let address = addresses[counter]
          let account = getAccount(address)

          let vaultRef = account
              .getCapability(${token.path.receiver})
              .borrow<&${token.contractName}.Vault{FungibleToken.Receiver}>()

          if (vaultRef == nil) {
              invalidAddresses.append(address)
          }

          counter = counter + 1
      }

      return invalidAddresses
    }
  `
  .replace(fungibleTokenPath, publicConfig.fungibleTokenAddress)

  const invalidAddresses = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(addresses, t.Array(t.Address))]
  }) 

  return invalidAddresses ?? addresses
}

const queryReceiver = async (token, address) => {
  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}
    
    pub fun main(address: Address): Bool {
        let account = getAccount(address)
    
        let vaultRef = account
            .getCapability(${token.path.receiver})
            .borrow<&${token.contractName}.Vault{FungibleToken.Receiver}>()
        
        if let vault = vaultRef {
          return true
        }
        return false 
    }
  `
  .replace(fungibleTokenPath, publicConfig.fungibleTokenAddress)

  const prepared = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(address, t.Address)]
  }) 

  return prepared ?? false
}

// batch send to non-FLOW accounts using FOLO
const batchFolo = async (token, records) => {
  const recipients = records.map((record) => {return record.address.toString()})
  const amounts = records.map((record) => {return record.amount.toFixed(8).toString()})
  console.log("batchfolo token", token)
  console.log("batchfolo recipients", recipients)
  console.log("batchfolo amounts", amounts)

  const code = `
    import FlowToken from 0xFlowToken
    import FungibleToken from 0xFungibleToken

    import LostAndFound from 0xLostAndFound

    transaction(recipients: [String], amounts: [UFix64]) {
        let vaultRef: &${token.contractName}.Vault

        let flowProvider: Capability<&FlowToken.Vault{FungibleToken.Provider}>
        let flowReceiver: Capability<&FlowToken.Vault{FungibleToken.Receiver}>

        prepare(acct: AuthAccount) {
            // Get a reference to the signer's stored vault
            self.vaultRef = acct.borrow<&${token.contractName}.Vault>(from: ${token.path.vault})
                ?? panic("Could not borrow reference to the owner's Vault!")

            let flowTokenProviderPath = /private/flowTokenLostAndFoundProviderPath

            if !acct.getCapability<&FlowToken.Vault{FungibleToken.Provider}>(flowTokenProviderPath).check() {
                acct.unlink(flowTokenProviderPath)
                acct.link<&FlowToken.Vault{FungibleToken.Provider}>(
                    flowTokenProviderPath,
                    target: /storage/flowTokenVault
                )
            }

            self.flowProvider = acct.getCapability<&FlowToken.Vault{FungibleToken.Provider}>(flowTokenProviderPath)
            self.flowReceiver = acct.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver)
        }

        pre {
          recipients.length == amounts.length: "invalid params"
        }

        execute {
          var counter = 0

          while (counter < recipients.length) {
            let recipient = recipients[counter]
            let amount = amounts[counter]

            let v <- self.vaultRef.withdraw(amount: amount)
            
            let memo = "folo"
            let depositEstimate <- LostAndFound.estimateDeposit(redeemer: recipient, item: <-v, memo: memo, display: nil)
            let storageFee <- self.flowProvider.borrow()!.withdraw(amount: depositEstimate.storageFee)
            let resource <- depositEstimate.withdraw()

            LostAndFound.deposit(
                redeemer: recipient,
                item: <-resource,
                memo: memo,
                display: nil,
                storagePayment: &storageFee as &FungibleToken.Vault,
                flowTokenRepayment: self.flowReceiver
            )

            self.flowReceiver.borrow()!.deposit(from: <-storageFee)
            destroy depositEstimate

            counter = counter + 1
          }
        }
    }
  `
  .replace("0xFlowToken", publicConfig.flowTokenAddress)
  .replace("0xFungibleToken", publicConfig.fungibleTokenAddress)
  .replace("0xLostAndFound", publicConfig.lostAndFoundAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => [arg(recipients, t.Array(t.String)), arg(amounts, t.Array(t.UFix64))],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })
  return transactionId
}

const queryBinsBalances = async (redeemer) => {
  const code = `
    import FungibleToken from 0xFungibleToken
    import LostAndFound from 0xLostAndFound

    pub fun main(redeemer: String): {String: UFix64} {
      let shelfManager = LostAndFound.borrowShelfManager()
      let shelf = shelfManager.borrowShelf(redeemer: "${redeemer}")
      if shelf == nil {
          return {}
      }
      let types = shelf!.getRedeemableTypes()
      
      let binsBalances: {String: UFix64} = {}
      for type in types {
          let tickets = LostAndFound.borrowAllTicketsByType(redeemer: "${redeemer}", type: type)
          var balance : UFix64 = 0.0
          for ticket in tickets {
              if let b = ticket.getFungibleTokenBalance() {
                  balance = balance + b
              }
          }
  
          binsBalances.insert(key: type.identifier, balance)
      }
  
      return binsBalances
    }
  `
  .replace("0xFungibleToken", publicConfig.fungibleTokenAddress)
  .replace("0xLostAndFound", publicConfig.lostAndFoundAddress)

  const types = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(redeemer, t.String)]
  })

  return types
}

const queryBinBalance = async (redeemer, type) => {
  const code = `
    import FungibleToken from 0xFungibleToken
    import LostAndFound from 0xLostAndFound

    pub fun main(redeemer: String, type: String): UFix64 {
        let tickets = LostAndFound.borrowAllTicketsByType(redeemer: redeemer, type: CompositeType(type)!)
        var balance : UFix64 = 0.0
        for ticket in tickets {
            if let b = ticket.getFungibleTokenBalance() {
                balance = balance + b
            }
        }
        return balance
    }
  `
  .replace(fungibleTokenPath, publicConfig.fungibleTokenAddress)
  .replace("0xLostAndFound", publicConfig.lostAndFoundAddress)

  const balance = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(redeemer, t.String), arg(type, t.String)]
  }) 

  return new Decimal(balance ?? 0.0)
}


const foloRedeem = {
  batchFolo,
  queryBinsBalances,
  queryBinBalance
}

export default foloRedeem