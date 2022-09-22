import * as readline from 'readline'
import * as microEthSigner from 'micro-eth-signer'
import * as bip32 from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { attoString, bigintToDecimalString, bigintToUint8Array, bytesToUnsigned, decimalStringToBigint, nanoString, stringToNano } from './bigint'
import { fromChecksummedAddress, toChecksummedAddress } from './ethereum'
import { EncodableArray } from '@zoltu/ethereum-abi-encoder'
import { tokens } from './tokens'

export async function promptForPrivateKey() {
	return withPrompt(async prompt => {
		const wordsOrKey = await prompt('🔑 Mnemonic or Private Key: ')
		if (wordsOrKey.trim().length === 0) throw new Error(`Mnemonic or private key required, but received nothing.`)
		const privateKey = wordsOrKey.includes(' ')
			? bytesToUnsigned(bip32.HDKey.fromMasterSeed(await bip39.mnemonicToSeed(wordsOrKey)).derive(await promptForDerivationPath(prompt)).privateKey!)
			: BigInt(wordsOrKey)
		const address = microEthSigner.Address.fromPrivateKey(bigintToUint8Array(privateKey, 32))
		console.log(`\x1b[32mSigner Address\x1b[0m: ${address}`)
		return { privateKey, address: BigInt(address) }
	})
}

async function promptForDerivationPath(prompt: Prompt) {
	const derivationPath = await prompt(`🔖 Derivation Path or Index (m/44'/60'/0'/0/0): `) || `m/44'/60'/0'/0/0`
	return (/^\d+$/.test(derivationPath))
		? `m/44'/60'/0'/0/${derivationPath}`
		: derivationPath
}

export async function promptForGasFees() {
	return withPrompt(async prompt => {
		const maxFeeString = await prompt('💳 Maximum nanoeth per gas: ')
		const maxFeePerGas = stringToNano(maxFeeString)
		const priorityFeeString = await prompt('💳 Priority nanoeth per gas: ')
		const maxPriorityFeePerGas = stringToNano(priorityFeeString)
		console.log(`\x1b[32mMax Fee\x1b[0m: ${nanoString(maxFeePerGas)} nanoeth; \x1b[32mMax Priority Fee\x1b[0m: ${nanoString(maxPriorityFeePerGas)}`)
		return { maxFeePerGas, maxPriorityFeePerGas }
	})
}

export async function promptForEth(message: string = `Amount (in ETH): `) {
	const amount = await promptForLargeNumber(message, 18n)
	console.log(`\x1b[32mETH\x1b[0m: ${attoString(amount)}`)
	return amount
}

export async function promptForTokenAmount(token: string, decimals: bigint) {
	const amount = await promptForLargeNumber(`Amount (in ${token}): `, decimals)
	console.log(`\x1b[32m${token}\x1b[0m: ${bigintToDecimalString(amount, decimals)}`)
	return amount
}

export async function promptForLargeNumber(message: string, power: bigint) {
	return withPrompt(async prompt => {
		const valueString = await prompt(message)
		const value = decimalStringToBigint(valueString, Number(power))
		return value
	})
}

export async function promptForToken(call: (to: bigint, methodSignature: string, parameters: EncodableArray) => Promise<Uint8Array>) {
	const name = (await promptForString('Token to buy: ')).toUpperCase()
	if (!(tokens.hasOwnProperty(name))) throw new Error(`Unknown token, only [${Object.keys(tokens).join(',')}] are supported.`)
	const address = tokens[name as keyof typeof tokens]
	const result = await call(address, 'decimals()', [])
	const decimals = bytesToUnsigned(result)
	console.log(`\x1b[32mName\x1b[0m: ${name}; \x1b[32mAddress\x1b[0m: ${toChecksummedAddress(address)}; \x1b[32mDecimals\x1b[0m: ${decimals.toString(10)}`)
	return { name, address, decimals }
}

export async function promptForAddress(message: string, defaultValue: bigint | undefined = undefined) {
	return withPrompt(async prompt => {
		const addressString = await prompt(message)
		const address = (addressString !== '' || defaultValue === undefined)
			? fromChecksummedAddress(addressString)
			: defaultValue
		return address
	})
}

export async function promptForEnterKey() {
	return withPrompt(async prompt => {
		await prompt(`Press enter to continue.`)
	})
}

export async function promptForString(message: string) {
	return withPrompt(async prompt => {
		return await prompt(message)
	})
}

async function withPrompt<T>(func: (prompt: Prompt) => Promise<T>): Promise<T> {
	const readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout })
	const prompt = (prompt: string) => new Promise<string>(resolve => readlineInterface.question(prompt, resolve))

	const result = await func(prompt)

	readlineInterface.close()
	return result
}

type Prompt = (prompt: string) => Promise<string>
