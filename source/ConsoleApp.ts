import fetch from 'node-fetch'
import { ethereum, mnemonic, secp256k1, hdWallet, keccak256 } from '@zoltu/ethereum-crypto'
import { FetchJsonRpc, FetchDependencies } from '@zoltu/solidity-typescript-generator-fetch-dependencies'
import { encodeMethod } from '@zoltu/ethereum-abi-encoder'
import { DAO } from './the-dao'
import { addressString, attoString, nanoString, stringToAtto } from './utils'
import { createLedgerRpc, createMnemonicRpc } from './rpc-factories'

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

// necessary so @peculiar/webcrypto looks like browser WebCrypto, which @zoltu/ethereum-crypto needs
import('@peculiar/webcrypto')
	.then(webcrypto => (globalThis as any).crypto = new webcrypto.Crypto())
	.then(readStorage)
	.then(() => process.exit())
	.catch(error => {
		console.log('An error occurred.');
		console.log(error);
		process.exit();
	});
