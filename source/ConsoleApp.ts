import * as readline from 'readline'
import fetch from 'node-fetch'
import { Boolean as ABoolean, Number as ANumber, String as AString, Literal as ALiteral, Record as ARecord, Union as AUnion, Array as AArray } from 'runtypes'
import { ethereum, mnemonic, secp256k1, hdWallet, keccak256 } from '@zoltu/ethereum-crypto'
import { FetchJsonRpc, FetchDependencies } from '@zoltu/solidity-typescript-generator-fetch-dependencies'
import { decodeParameters, encodeMethod, generateCanonicalSignature, parseSignature } from '@zoltu/ethereum-abi-encoder'
import { Bytes } from '@zoltu/ethereum-types'
import { rlpDecode } from '@zoltu/rlp-encoder'
import { addressString, attoString, bigintToUint8Array, decimalStringToBigint, nanoString, stringToAtto } from './utils'
import { createLedgerRpc, createMemoryRpc, createMnemonicRpc } from './rpc-factories'
import { randomBytes } from 'crypto'
import { UniswapV2Pair } from './uniswap-pair'
import { MnemonicSigner } from './mnemonic-signer'
import { EthereumAddress, EthereumData, serialize } from './wire-types'
import { rlpEncodeTransaction } from './ethereum'

const readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout })
const prompt = (prompt: string) => new Promise<string>(resolve => readlineInterface.question(prompt, resolve))

const jsonRpcHttpEndpoint = 'http://localhost:8545'
const gasPrice = 35n * 10n ** 9n

export async function generateAccount() {
	const words = await mnemonic.generateRandom(256)
	const seed = await mnemonic.toSeed(words)
	const privateKey = await hdWallet.privateKeyFromSeed(seed, `m/44'/60'/0'/0/0`)
	const publicKey = await secp256k1.privateKeyToPublicKey(privateKey)
	const address = await ethereum.publicKeyToAddress(publicKey)
	const addressString = await ethereum.addressToChecksummedString(address)
	console.log(words.join(' '))
	console.log(privateKey.toString(16).padStart(32, '0'))
	console.log(addressString)
}

export async function getAddressFromKey() {
	const privateKey = 1n
	const publicKey = await secp256k1.privateKeyToPublicKey(privateKey)
	const address = await ethereum.publicKeyToAddress(publicKey)
	const addressString = await ethereum.addressToChecksummedString(address)
	console.log(privateKey.toString(16).padStart(32, '0'))
	console.log(addressString)
}

export async function addressFromMnemonic() {
	const words = await prompt('Mnemonic: ')
	const seed = await mnemonic.toSeed(words)
	const privateKey = await hdWallet.privateKeyFromSeed(seed, `m/44'/60'/0'/0/0`)
	const publicKey = await secp256k1.privateKeyToPublicKey(privateKey)
	const address = await ethereum.publicKeyToAddress(publicKey)
	const addressString = await ethereum.addressToChecksummedString(address)
	console.log(addressString)
}

export async function addressFromLedger() {
	for (let j = 0; j < 5; ++j) {
		for (let i = 0; i < 5; ++i) {
			const senderDerivationPath = `m/44'/60'/0'/${j}/${i}`
			const rpc = await createLedgerRpc(jsonRpcHttpEndpoint, gasPrice, senderDerivationPath)
			const address = await rpc.addressProvider()
			const addressString = await ethereum.addressToChecksummedString(address)
			console.log(addressString)
		}
	}
}

export async function sweepLedgerEth() {
	const senderDerivationPath = `m/44'/60'/0'/0/0`
	const rpc = await createLedgerRpc(jsonRpcHttpEndpoint, gasPrice, senderDerivationPath)
	const senderAddress = await rpc.addressProvider()
	const senderAddressString = await ethereum.addressToChecksummedString(senderAddress)

	const recipientAddress = 0x0n
	const recipientAddressString = await ethereum.addressToChecksummedString(recipientAddress)

	const amount = await rpc.getBalance(senderAddress) - 21000n * gasPrice

	console.log(`Source: ${senderAddressString}`)
	console.log(`Destination: ${recipientAddressString}`)
	console.log(`Source Balance: ${attoString(await rpc.getBalance(senderAddress))}`)
	console.log(`Destination Balance: ${attoString(await rpc.getBalance(recipientAddress))}`)
	console.log(`Sending ${attoString(amount)} ETH from 0x${senderAddressString} to 0x${recipientAddressString} at ${nanoString(gasPrice)} nanoeth gas price...`)

	await rpc.sendEth(recipientAddress, amount)
	console.log(`Sent!`)
}

export async function sweepEth() {
	const rpc = await createMnemonicRpc(jsonRpcHttpEndpoint, gasPrice, 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong')
	const senderAddress = await rpc.addressProvider()
	const senderAddressString = await ethereum.addressToChecksummedString(senderAddress)
	const recipientAddress = 0x0n
	const recipientAddressString = await ethereum.addressToChecksummedString(recipientAddress)
	const amount = await rpc.getBalance(senderAddress) - 21000n * gasPrice

	console.log(`Source: ${senderAddressString}`)
	console.log(`Destination: ${recipientAddressString}`)
	console.log(`Source Balance: ${attoString(await rpc.getBalance(senderAddress))}`)
	console.log(`Destination Balance: ${attoString(await rpc.getBalance(recipientAddress))}`)
	console.log(`Sending ${attoString(amount)} ETH from 0x${senderAddressString} to 0x${recipientAddressString} at ${nanoString(gasPrice)} nanoeth gas price...`)

	await rpc.sendEth(recipientAddress, amount)
}

export async function sendEth() {
	const wordsOrKey = await prompt('Mnemonic or Private Key: ')
	const privateKey = / /.test(wordsOrKey)
		? await hdWallet.privateKeyFromSeed(await mnemonic.toSeed(wordsOrKey.split(' ')), `m/44'/60'/0'/0/0`)
		: BigInt(wordsOrKey)
	const rpc = await createMemoryRpc(jsonRpcHttpEndpoint, gasPrice, privateKey)
	const senderAddress = await rpc.addressProvider()
	const senderAddressString = await ethereum.addressToChecksummedString(senderAddress)

	const recipient = await prompt('Recipient: ')
	const recipientAddress = EthereumAddress.parse(recipient)
	const recipientAddressString = await ethereum.addressToChecksummedString(recipientAddress)

	const amountAsString = await prompt(`Amount in ETH: `)
	const amount = decimalStringToBigint(amountAsString, 18)

	console.log(`Source: ${senderAddressString}`)
	console.log(`Destination: ${recipientAddressString}`)
	console.log(`Source Balance: ${attoString(await rpc.getBalance(senderAddress))}`)
	console.log(`Destination Balance: ${attoString(await rpc.getBalance(recipientAddress))}`)
	console.log(`Sending ${attoString(amount)} ETH from 0x${senderAddressString} to 0x${recipientAddressString} at ${nanoString(gasPrice)} nanoeth gas price...`)


	await rpc.sendEth(recipientAddress, amount)
}

export async function readStorage() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	// for (let i = 0n; i <= 9n; ++i) {
		const result = await rpc.getStorageAt(0x0n, 0x0n)
		// console.log(`SLOT: ${i}`)
		console.log(`as number: ${result}`)
		console.log(`as address: ${addressString(result)}`)
		console.log(`as ETH: ${attoString(result)}`)
	// }
}

export async function callFunctionBySignature() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	const data = await encodeMethod(keccak256.hash, 'contenthash(bytes32)', [0x0n])
	const result = await rpc.offChainContractCall({ to: 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41n, value: 0n, data })
	const contentHash = decodeParameters([{ name: 'arg1', type: 'string' }], result)
	console.log(contentHash)
}

export async function executeFunctionBySignature() {
	const signer = await MnemonicSigner.create('zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong')
	console.log(addressString(signer.address))
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, { signatureProvider: signer.sign, addressProvider: async () => signer.address, gasPriceInAttoethProvider: async () => gasPrice })
	const data = await encodeMethod(keccak256.hash, 'transfer(address,uint256)', [0x0n,0n])
	const result = await rpc.onChainContractCall({ to: 0x0n, value: 0n*10n**18n, data, gasLimit: 500000n })
	console.log(result)
}

export async function getBalance() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	const result = await rpc.getBalance(0x0n)
	console.log(attoString(result))
}

export async function executeContract() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	const dependencies = new FetchDependencies(rpc)
	const contract = new UniswapV2Pair(dependencies, 0xC2aDdA861F89bBB333c90c492cB837741916A225n)
	const {} = await contract.getReserves_();
}

export async function niceHash() {
	const Order = ARecord({
		acceptedSpeed: AString.withConstraint(x => /^\d+(\.\d+)?$/.test(x)),
		alive: ABoolean,
		id: AString,
		limit: AString.withConstraint(x => /^\d+(\.\d+)?$/.test(x)),
		payingSpeed: AString.withConstraint(x => /^\d+(\.\d+)?$/.test(x)),
		price: AString.withConstraint(x => /^\d+(\.\d+)?$/.test(x)),
		rigsCount: ANumber,
		type: AUnion(ALiteral('FIXED'), ALiteral('STANDARD')),
	})
	const Book = ARecord({
		displayMarketFactor: ALiteral('TH'),
		marketFactor: AString.withConstraint(x => /^\d+(\.\d+)?$/.test(x)),
		orders: AArray(Order),
		pagination: ARecord({
			size: ANumber,
			page: ANumber,
			totalPageCount: ANumber,
		}),
		totalSpeed: AString.withConstraint(x => /^\d+(\.\d+)?$/.test(x)),
		updatedTs: AString.withConstraint(x => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/.test(x))
	})
	const OrderBook = ARecord({
		stats: ARecord({
			EU: Book,
			USA: Book,
		})
	})
	async function sign(publicKey: string, privateKey: string, time: string, nonce: string, organization: string, method: 'GET' | 'POST', path: string, queryString?: string, body?: string) {
		const encoder = new TextEncoder()
		const signedPayload = Uint8Array.of(
			...encoder.encode(publicKey),
			0,
			...encoder.encode(time),
			0,
			...encoder.encode(nonce),
			0,
			0,
			...encoder.encode(organization),
			0,
			0,
			...encoder.encode(method),
			0,
			...encoder.encode(path),
			0,
			...(queryString === undefined ? [] : encoder.encode(queryString)),
			...(body === undefined ? [] : [0, ...encoder.encode(body)]),
		)
		const key = await crypto.subtle.importKey('raw', encoder.encode(privateKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
		const signature = await crypto.subtle.sign('HMAC', key, signedPayload)
		const signatureString = Array.from(new Uint8Array(signature)).map(x => x.toString(16).padStart(2, '0')).join('')
		return signatureString
	}

	const apiKeyPublic = ''
	const apiKeyPrivate = ''
	const organizationId = ''

	async function makeRequest(method: 'GET' | 'POST', path: string, queryString?: string, body?: string) {
		const time = new Date().getTime().toString(10)
		const nonce = randomBytes(18).toString('hex')
		const signature = await sign(apiKeyPublic, apiKeyPrivate, time, nonce, organizationId, method, path, queryString, body)
		const url = `https://api2.nicehash.com${path}?${queryString}`

		const response = await fetch(url, {
			headers: {
				'X-Time': time,
				'X-Nonce': nonce,
				'X-Organization-Id': organizationId,
				'X-Request-Id': randomBytes(18).toString('hex'),
				'X-Auth': `${apiKeyPublic}:${signature}`
			},
			method,
			body,
		})
		if (!response.ok) throw new Error(`Response Status Code not OK: ${response.status}; ${response.statusText}\n${await response.text()}`)
		const responseBody = await response.json()
		return responseBody
	}

	const prices = await makeRequest('GET', '/main/api/v2/hashpower/orderBook', 'algorithm=DAGGERHASHIMOTO')
	const checkedPrices = OrderBook.check(prices)
	const targetHashPower = 0.2
	const euOrders = checkedPrices.stats.EU.orders
		.filter(x => x.type === 'STANDARD')
		.sort((a,b) => Number.parseFloat(a.price) - Number.parseFloat(b.price))
	let totalAcceptedSpeed = 0
	let totalPayingSpeed = 0
	let priceReached = 0
	for (const order of euOrders) {
		priceReached = Number.parseFloat(order.price)
		totalAcceptedSpeed += Number.parseFloat(order.acceptedSpeed)
		totalPayingSpeed += Number.parseFloat(order.payingSpeed)
		if (totalAcceptedSpeed >= targetHashPower) break
	}
	console.log(`Accepted: ${totalAcceptedSpeed}`)
	console.log(`Paying: ${totalPayingSpeed}`)
	console.log(`Price: ${priceReached}`)
}

export async function decodeRawTransaction() {
	const rawTransaction =  Bytes.fromHexString('0x...')
	const decodedTransaction = rlpDecode(rawTransaction)
	if (!Array.isArray(decodedTransaction)) throw new Error(`Raw transaction is not an RLP array.`)
	if (decodedTransaction.length !== 9) throw new Error(`Raw transaction should be a list of 9 items but it was a list of ${decodedTransaction.length} items.`)
	if (!decodedTransaction.every((x): x is Uint8Array => x instanceof Uint8Array)) throw new Error(`Raw transaction should be a list of Uint8Arrays.`)
	const items = decodedTransaction.map(x => Bytes.fromByteArray(x))
	const nonce = items[0].toUnsignedBigint()
	const gasPrice = items[1].toUnsignedBigint()
	const gasLimit = items[2].toUnsignedBigint()
	const to = items[3].toUnsignedBigint()
	const amount = items[4].toUnsignedBigint()
	const payload = items[5]
	// const v = items[6].toUnsignedBigint()
	// const r = items[7].toUnsignedBigint()
	// const s = items[8].toUnsignedBigint()
	console.log(`Nonce: ${nonce}`)
	console.log(`gasPrice: ${nanoString(gasPrice)} nanoeth`)
	console.log(`gasLimit: ${gasLimit}`)
	console.log(`to: ${addressString(to)}`)
	console.log(`amount: ${attoString(amount)} eth`)
	console.log(`payload: ${payload.toString()}`)
}

export async function decodeMethodCall() {
	const bytes = Bytes.fromHexString('0x...')
	const abi = [
		{
			"inputs": [
				{
					"components": [
						{
							"internalType": "uint256",
							"name": "targetWithMandatory",
							"type": "uint256"
						},
						{
							"internalType": "uint256",
							"name": "gasLimit",
							"type": "uint256"
						},
						{
							"internalType": "uint256",
							"name": "value",
							"type": "uint256"
						},
						{
							"internalType": "bytes",
							"name": "data",
							"type": "bytes"
						}
					],
					"internalType": "struct Storage.CallDescription[]",
					"name": "callDescriptions",
					"type": "tuple[]"
				}
			],
			"name": "apple",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		}
	] as const
	// const parameterDescriptions: readonly ParameterDescription[] = abi[0]

	const decoded = decodeParameters(abi[0].inputs, bytes) as {
		param1: {targetWithMandatory: bigint, gasLimit: bigint, value: bigint, data: Uint8Array}[]
	}
	console.log(`param1`,decoded.param1)
}

export async function eventIndex() {
	const rawSignature = parseSignature('IncentiveContractUpdate(address,address)')
	const canonicalSignature = generateCanonicalSignature(rawSignature)
	const topic0 = await keccak256.hash(new TextEncoder().encode(canonicalSignature))
	console.log(topic0.toString(16).padStart(64,'0'))
}

export async function generate4Byte() {
	const abi = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"}],"internalType":"struct ISwapRouter.ExactInputParams","name":"params","type":"tuple"}],"name":"exactInput","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct ISwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],"name":"exactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"}],"internalType":"struct ISwapRouter.ExactOutputParams","name":"params","type":"tuple"}],"name":"exactOutput","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct ISwapRouter.ExactOutputSingleParams","name":"params","type":"tuple"}],"name":"exactOutputSingle","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}] as const
	// const functionDescription = parseSignature('balanceOf(address holder)')
	for (const functionDescription of abi) {
		if (functionDescription.type !== 'function') continue
		const canonicalSignature = generateCanonicalSignature(functionDescription)
		const selector = await keccak256.hash(new TextEncoder().encode(canonicalSignature))  >> 224n
		console.log(`${selector.toString(16).padStart(8, '0')} - ${canonicalSignature}`)
	}
}

export async function getTransactionByHash() {
	const transactionHash = 0x0n
	const rpc = await createMnemonicRpc(jsonRpcHttpEndpoint, gasPrice)
	const transaction = await rpc.getTransactionByHash(transactionHash)
	if (transaction === null) {
		return console.error(`Transaction not found.`)
	}
	const receipt = await rpc.getTransactionReceipt(transactionHash)
	const result = await rpc.call({ ...transaction, gasLimit: transaction.gas }, transaction.blockNumber!)
	transaction
	receipt
	result
	debugger
}

export async function deterministicDeploy(factoryDeploymentBytecode: Uint8Array) {
	const rpc = await createMemoryRpc(jsonRpcHttpEndpoint, gasPrice, 1n)
	await ensureDeterministicDeploymentProxyIsDeployed()
	const deterministicDeploymentProxyAddress = 0x7A0D94F55792C434d74a40883C6ed8545E406D12n
	const address = await create2Address(deterministicDeploymentProxyAddress, factoryDeploymentBytecode)
	if ((await rpc.getCode(address)).length !== 0) {
		console.log(`Contract already deployed to address ${addressString(address)}`)
		return address
	}
	console.log(`Deploying contract to address ${addressString(address)}`)
	await rpc.sendEth(0n, 0n)
	const receipt = await rpc.onChainContractCall({ to: deterministicDeploymentProxyAddress, value: 0n, data: factoryDeploymentBytecode })
	console.log(`Deployment was successful?  ${receipt.status}`)
	return address
}

async function ensureDeterministicDeploymentProxyIsDeployed() {
	const rpc = await createMemoryRpc(jsonRpcHttpEndpoint, gasPrice, 1n)
	if ((await rpc.getCode(0x7A0D94F55792C434d74a40883C6ed8545E406D12n)).length !== 0) return
	console.log('sending 0.01 ETH to deterministic deployment proxy deployer...')
	await rpc.sendEth(0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1n, stringToAtto('0.01'))
	console.log('deploying deterministic deployment proxy...')
	await rpc.sendRawTransaction(EthereumData.parse('0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'))
}

async function create2Address(deployerAddress: bigint, deploymentBytecode: Uint8Array, salt: bigint = 0n) {
	return await keccak256.hash([0xff, ...bigintToUint8Array(deployerAddress, 20), ...bigintToUint8Array(salt, 32), ...bigintToUint8Array(await keccak256.hash(deploymentBytecode), 32)]) & 0xffffffffffffffffffffffffffffffffffffffffn
}

export async function sandbox() {
	const encoded = rlpEncodeTransaction({ data: new Uint8Array(), gasLimit: 21000n, gasPrice: 0n, nonce: 0n, to: null, r: 0n, s: 0n, v: 0n, value: 0n, yParity: 'even', hash: 0n, chainId: 0n, from: 0n })
	console.log(serialize(EthereumData, encoded))
}

// necessary so @peculiar/webcrypto looks like browser WebCrypto, which @zoltu/ethereum-crypto needs
import('@peculiar/webcrypto')
	.then(webcrypto => (globalThis as any).crypto = new webcrypto.Crypto())
	.then(addressFromMnemonic)
	.then(() => process.exit())
	.catch(error => {
		console.log('An error occurred.');
		console.log(error);
		debugger
		process.exit();
	});
