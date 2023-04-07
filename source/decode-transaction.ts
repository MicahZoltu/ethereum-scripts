import { attoString, nanoString } from "./utils/bigint"
import { rlpDecode1559TransactionPayload, toChecksummedAddress } from "./utils/ethereum"
import { main } from "./utils/node"
import { promptForBytes } from "./utils/prompts"
import { toHexString } from "./utils/typed-arrays"

main(async () => {
	const bytes = await promptForBytes(`\x1b[36mSerialized transaction\x1b[0m: `)
	if (bytes[0] === 2) {
		const transaction = rlpDecode1559TransactionPayload(bytes.slice(1))
		console.log(`\x1b[32mTransaction Details\x1b[0m:
	\x1b[32mchainId\x1b[0m: ${transaction.chainId}
	\x1b[32mnonce\x1b[0m: ${transaction.nonce}
	\x1b[32mmaxPriorityFeePerGas\x1b[0m: ${nanoString(transaction.maxFeePerGas)} nanoeth
	\x1b[32mmaxFeePerGas\x1b[0m: ${nanoString(transaction.maxFeePerGas)} nanoeth
	\x1b[32mgasLimit\x1b[0m: ${transaction.gasLimit}
	\x1b[32mto\x1b[0m: ${transaction.to === null ? 'null' : toChecksummedAddress(transaction.to)}
	\x1b[32mvalue\x1b[0m: ${attoString(transaction.value)}
	\x1b[32mdata\x1b[0m: ${toHexString(transaction.data)}`)
	} else {
		console.warn(`Sorry, only type 2 transactions (EIP-1559) are supported at the moment.`)
	}
})
