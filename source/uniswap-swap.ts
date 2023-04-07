import { attoString, bigintToDecimalString, bytes32String, bytesToUnsigned } from "./utils/bigint"
import { fromChecksummedAddress, toChecksummedAddress } from "./utils/ethereum"
import { SigningEthereumClient } from './utils/ethereum-client'
import { main } from "./utils/node"
import { promptForAddress, promptForEnterKey, promptForGasFees, promptForLargeNumber, promptForPrivateKey, promptForToken, promptForTokenAmount } from './utils/prompts'
import { tokens } from "./utils/tokens"

const jsonRpcHttpEndpoint = 'https://ethereum.zoltu.io'

const quoter = fromChecksummedAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6')
const swapRouter = fromChecksummedAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564')

main(async () => {
	const { privateKey, address} = await promptForPrivateKey()
	const { maxFeePerGas, maxPriorityFeePerGas } = await promptForGasFees()

	const ethereumClient = new SigningEthereumClient(jsonRpcHttpEndpoint, {}, privateKey, maxFeePerGas, maxPriorityFeePerGas)

	const token = await promptForToken(ethereumClient.callContractOffChain)
	const amountOfTokenToBuy = await promptForTokenAmount(token.name, token.decimals)
	const poolFeeTier = await promptForLargeNumber(`Pool Fee Tier (1 | 0.3 | 0.05 | 0.01): `, 4n)
	if (poolFeeTier !== 10000n && poolFeeTier !== 3000n && poolFeeTier !== 500n && poolFeeTier !== 100n) throw new Error(`Pool fee must be one of 1, 0.3, 0.05, or 0.01 but received ${bigintToDecimalString(poolFeeTier, 4n)}`)
	const slippage = await promptForLargeNumber(`Slippage Percentage (e.g., 0.1): `, 2n)
	const recipient = await promptForAddress(`Recipient Address: `)
	if (recipient === token.address) throw new Error(`I suspect you didn't mean to send the token to the token eaddress...`)
	// TODO: add support for non-ETH source tokens

	const quoteResult = await ethereumClient.callContractOffChain(quoter, 'quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96)', [tokens.WETH, token.address, poolFeeTier, amountOfTokenToBuy, 0n])
	const exactAmountIn = bytesToUnsigned(quoteResult)
	console.log(`Estimated ETH Required: ${attoString(exactAmountIn)}`)
	const amountInMaximum = exactAmountIn + exactAmountIn * slippage / 10000n
	console.log(`After Slippage: ${attoString(amountInMaximum)}`)

	const deadline = BigInt(Math.round(Date.now() / 1000)) + 300n
	const signature = 'exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params)'
	const parameters = [[ tokens.WETH, token.address, poolFeeTier, recipient, deadline, amountOfTokenToBuy, amountInMaximum, 0n ]]
	const swapResult = await ethereumClient.callContractOffChain(swapRouter, signature, parameters, { from: address, value: amountInMaximum, maxFeePerGas, maxPriorityFeePerGas })
	if (bytesToUnsigned(swapResult) !== exactAmountIn) throw new Error(`Quote returned ${bigintToDecimalString(exactAmountIn, token.decimals)} ${token.name}, but speculative swap returned ${bigintToDecimalString(exactAmountIn, token.decimals)} ${token.name}.`)

	console.log(`Swapping ${attoString(amountInMaximum)} (estimated ${attoString(exactAmountIn)}) ETH from ${toChecksummedAddress(address)} for exactly ${bigintToDecimalString(amountOfTokenToBuy, token.decimals)} ${token.name} to ${toChecksummedAddress(recipient)}...`)
	await promptForEnterKey()

	const { transactionHash, receipt } = await ethereumClient.callContractOnChain(swapRouter, signature, parameters, amountInMaximum)

	console.log(`Transaction Hash: ${bytes32String(transactionHash)}`)
	if ((await receipt).status === 'success') {
		console.log(`🎉`)
	} else {
		console.log(`⚠️ Transaction Failed`)
	}
})
