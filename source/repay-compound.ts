import { attoString, bytes32String } from "./utils/bigint"
import { fromChecksummedAddress, toChecksummedAddress } from "./utils/ethereum"
import { SigningEthereumClient } from './utils/ethereum-client'
import { main } from "./utils/node"
import { promptForAddress, promptForEnterKey, promptForEth, promptForGasFees, promptForPrivateKey } from './utils/prompts'

const jsonRpcHttpEndpoint = 'http://localhost:8545'

const cEtherRepayHelper =  fromChecksummedAddress('0xf859A1AD94BcF445A406B892eF0d3082f4174088')
const repaySignature = 'repayBehalfExplicit(address borrower, address cEther)'
const cEther = fromChecksummedAddress('0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5')

main(async () => {
	const { privateKey, address} = await promptForPrivateKey()
	const { maxFeePerGas, maxPriorityFeePerGas } = await promptForGasFees()
	const amountToRepayPlusPadding = await promptForEth()
	const borrower = await promptForAddress(`Borrower Address: `)

	const ethereumClient = new SigningEthereumClient(jsonRpcHttpEndpoint, {}, privateKey, maxFeePerGas, maxPriorityFeePerGas)
	
	console.log(`Repaying all debt up to ${attoString(amountToRepayPlusPadding)} ETH with ${toChecksummedAddress(address)} on behalf of ${toChecksummedAddress(borrower)}...`)
	await promptForEnterKey()

	const { transactionHash, receipt } = await ethereumClient.callContractOnChain(cEtherRepayHelper, repaySignature, [borrower, cEther], amountToRepayPlusPadding)

	console.log(`Transaction Hash: ${bytes32String(transactionHash)}`)
	if ((await receipt).status === 'success') {
		console.log(`🎉`)
	} else {
		console.log(`⚠️ Transaction Failed`)
	}
})
