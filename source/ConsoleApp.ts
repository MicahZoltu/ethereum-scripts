import fetch from 'node-fetch'
import { Boolean as ABoolean, Number as ANumber, String as AString, Literal as ALiteral, Record as ARecord, Union as AUnion, Array as AArray } from 'runtypes'
import { ethereum, mnemonic, secp256k1, hdWallet, keccak256 } from '@zoltu/ethereum-crypto'
import { FetchJsonRpc, FetchDependencies } from '@zoltu/solidity-typescript-generator-fetch-dependencies'
import { encodeMethod } from '@zoltu/ethereum-abi-encoder'
import { DAO } from './the-dao'
import { addressString, attoString, nanoString, stringToAtto } from './utils'
import { createLedgerRpc, createMnemonicRpc } from './rpc-factories'
import { randomBytes } from 'crypto'

const jsonRpcHttpEndpoint = 'https://ethereum.zoltu.io'
const gasPrice = 151n * 10n ** 9n

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

export async function sweepLedgerEth() {
	const senderDerivationPath = `m/44'/60'/0'/0`
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
	const rpc = await createMnemonicRpc(jsonRpcHttpEndpoint, gasPrice, 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong')
	const senderAddress = await rpc.addressProvider()
	const senderAddressString = await ethereum.addressToChecksummedString(senderAddress)
	const recipientAddress = 0x0n
	const recipientAddressString = await ethereum.addressToChecksummedString(recipientAddress)

	const amount = stringToAtto('1.234')

	console.log(`Source: ${senderAddressString}`)
	console.log(`Destination: ${recipientAddressString}`)
	console.log(`Source Balance: ${attoString(await rpc.getBalance(senderAddress))}`)
	console.log(`Destination Balance: ${attoString(await rpc.getBalance(recipientAddress))}`)
	console.log(`Sending ${attoString(amount)} ETH from 0x${senderAddressString} to 0x${recipientAddressString} at ${nanoString(gasPrice)} nanoeth gas price...`)


	await rpc.sendEth(recipientAddress, amount)
}

export async function readStorage() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	const result = await rpc.getStorageAt(0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413n, 0x0n)
	console.log(`as number: ${result}`)
	console.log(`as address: ${addressString(result)}`)
	console.log(`as ETH: ${attoString(result)}`)
}

export async function callFunctionBySignature() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	const data = await encodeMethod(keccak256.hash, 'transfer(address,uint256)', [0x0n, 0n])
	const result = await rpc.offChainContractCall({ to: 0x0n, value: 1n * 10n**18n, data })
	console.log(result.toString())
}

export async function executeContract() {
	const rpc = new FetchJsonRpc(jsonRpcHttpEndpoint, fetch, {})
	const dependencies = new FetchDependencies(rpc)
	const theDao = new DAO(dependencies, 0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413n)
	const daoSupply = await theDao.totalSupply_();
	console.log(attoString(daoSupply))
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

// necessary so @peculiar/webcrypto looks like browser WebCrypto, which @zoltu/ethereum-crypto needs
import('@peculiar/webcrypto')
	.then(webcrypto => (globalThis as any).crypto = new webcrypto.Crypto())
	.then(niceHash)
	.then(() => process.exit())
	.catch(error => {
		console.log('An error occurred.');
		console.log(error);
		process.exit();
	});
