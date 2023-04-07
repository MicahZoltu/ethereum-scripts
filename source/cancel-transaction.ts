import { bytes32String } from "./utils/bigint"
import { SigningEthereumClient } from "./utils/ethereum-client"
import { main } from "./utils/node"
import { promptForGasFees, promptForInteger, promptForPrivateKey } from "./utils/prompts"

const jsonRpcHttpEndpoint = 'https://ethereum.zoltu.io'

main(async () => {
	const { privateKey, address} = await promptForPrivateKey()
	const { maxFeePerGas, maxPriorityFeePerGas } = await promptForGasFees()
	const nonceToCancel = await promptForInteger(`\x1b[36mNonce to cancel\x1b[0m: `)
	const ethereumClient = new SigningEthereumClient(jsonRpcHttpEndpoint, {}, privateKey, maxFeePerGas, maxPriorityFeePerGas)
	const { receipt, transactionHash } = await ethereumClient.sendTransaction({ to: address, data: new Uint8Array(), gasLimit: 21000n, nonce: nonceToCancel, type: '1559', value: 0n })
	console.log(`Transaction Hash: ${bytes32String(transactionHash)}`)
	if ((await receipt).status === 'success') {
		console.log(`🎉`)
	} else {
		console.log(`⚠️ Transaction Failed`)
	}
})