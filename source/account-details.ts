import { attoString, bytes32String } from "./utils/bigint"
import { EthereumClient } from "./utils/ethereum-client"
import { main } from "./utils/node"
import { promptForPrivateKey } from "./utils/prompts"

const jsonRpcHttpEndpoint = 'https://ethereum.zoltu.io'

main(async () => {
	const { privateKey, address } = await promptForPrivateKey()
	console.log(`\x1b[32mPrivate Key\x1b[0m: ${bytes32String(privateKey)}`)
	const ethereumClient = new EthereumClient(jsonRpcHttpEndpoint, {})
	const nonce = await ethereumClient.getTransactionCount(address)
	console.log(`\x1b[32mNext Nonce\x1b[0m: ${nonce}`)
	const ethBalance = await ethereumClient.getBalance(address)
	console.log(`\x1b[32mETH Balance\x1b[0m: ${attoString(ethBalance)}`)
})
