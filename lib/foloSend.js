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

const batchTransfer = async (token, records) => {
  const recipients = records.map((record) => {return record.address})
  console.log("batchTransfer recipients", recipients)
  const amounts = records.map((record) => {return record.amount.toFixed(8).toString()})
  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}

    transaction(recipients: [Address], amounts: [UFix64]) {

        let vaultRef: &${token.contractName}.Vault

        prepare(signer: AuthAccount) {
            // Get a reference to the signer's stored vault
            self.vaultRef = signer.borrow<&${token.contractName}.Vault>(from: ${token.path.vault})
                ?? panic("Could not borrow reference to the owner's Vault!")
        }

        pre {
            recipients.length == amounts.length: "invalid params"
        }

        execute {
            var counter = 0

            while (counter < recipients.length) {
                // Get the recipient's public account object
                let recipientAccount = getAccount(recipients[counter])

                // Get a reference to the recipient's Receiver
                let receiverRef = recipientAccount.getCapability(${token.path.receiver})!
                    .borrow<&{FungibleToken.Receiver}>()
                    ?? panic("Could not borrow receiver reference to the recipient's Vault")

                // Deposit the withdrawn tokens in the recipient's receiver
                receiverRef.deposit(from: <-self.vaultRef.withdraw(amount: amounts[counter]))

                counter = counter + 1
            }
        }
    }
  `
  .replace(fungibleTokenPath, publicConfig.fungibleTokenAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => [arg(recipients, t.Array(t.Address)), arg(amounts, t.Array(t.UFix64))],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })
  return transactionId
}
// batch send to non-FLOW accounts WITH depositor
const foloSendDepositorBatch = async (token, records) => {
  const recipients = records.map((record) => {return record.address.toString()})
  const amounts = records.map((record) => {return record.amount.toFixed(8).toString()})
  console.log("batchfolo token", token)
  console.log("batchfolo recipients", recipients)
  console.log("batchfolo amounts", amounts)

  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}

    import LostAndFound from 0xLostAndFound
    
    transaction(recipient: String, amount: UFix64) {
        let depositor: &LostAndFound.Depositor
        let vaultRef: &${token.contractName}.Vault
    
        prepare(acct: AuthAccount) {
            self.depositor = acct.borrow<&LostAndFound.Depositor>(from: LostAndFound.DepositorStoragePath)!
    
            // Get a reference to the signer's stored vault
            self.vaultRef = acct.borrow<&${token.contractName}.Vault>(from: ${token.path.vault})
                ?? panic("Could not borrow reference to the owner's Vault!")
        }
    
        execute {
            let v <- self.vaultRef.withdraw(amount: amount)
            let memo = "folo"
    
            self.depositor.deposit(
                redeemer: recipient,
                item: <- v,
                memo: nil,
                display: nil
            )
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

// batch send to non-FLOW accounts WITHOUT depositor
const foloSendBatch = async (token, records) => {
  const recipients = records.map((record) => {return record.address.toString()})
  const amounts = records.map((record) => {return record.amount.toFixed(8).toString()})
  console.log("batchfolo token", token)
  console.log("batchfolo recipients", recipients)
  console.log("batchfolo amounts", amounts)

  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}

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

  // to avoid dupliate imports
  if(token.contractName !== "FlowToken")
    code = `import FlowToken from 0xFlowToken`.replace("0xFlowToken", publicConfig.flowTokenAddress) + code

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => [arg(recipients, t.Array(t.String)), arg(amounts, t.Array(t.UFix64))],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })
  return transactionId
}

const queryBalance = async (token, address) => {
  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}
    
    pub fun main(address: Address): UFix64 {
        let account = getAccount(address)
    
        let vaultRef = account
            .getCapability(${token.path.balance})
            .borrow<&${token.contractName}.Vault{FungibleToken.Balance}>()
         
        if let vault = vaultRef {
          return vault.balance
        }
        return 0.0
    }
  `
  .replace(fungibleTokenPath, publicConfig.fungibleTokenAddress)

  const balance = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(address, t.Address)]
  }) 

  return new Decimal(balance ?? 0.0)
}


const foloSend = {
  //batchQueryReceiver,
  //queryReceiver,
  //batchTransfer,
  foloSendDepositorBatch,
  foloSendBatch,
  queryBalance
}

export default foloSend