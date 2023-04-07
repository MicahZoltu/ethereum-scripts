import * as readline from 'readline'
import * as microEthSigner from 'micro-eth-signer'
import * as bip32 from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { attoString, bigintToDecimalString, bigintToUint8Array, bytesToUnsigned, decimalStringToBigint, nanoString, stringToNano } from './bigint'
import { fromChecksummedAddress, toChecksummedAddress } from './ethereum'
import { EncodableArray } from '@zoltu/ethereum-abi-encoder'
import { tokens } from './tokens'
import { toUint8Array } from './typed-arrays'

export async function promptForPrivateKey() {
	return withPrompt(async prompt => {
		const wordsOrKey = await prompt('🔑 \x1b[36mMnemonic or Private Key\x1b[0m: ')
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
	const derivationPath = await prompt(`🔖 \x1b[36mDerivation Path or Index (m/44'/60'/0'/0/0)\x1b[0m: `) || `m/44'/60'/0'/0/0`
	return (/^\d+$/.test(derivationPath))
		? `m/44'/60'/0'/0/${derivationPath}`
		: derivationPath
}

export async function promptForGasFees() {
	return withPrompt(async prompt => {
		const maxFeeString = await prompt('💳 \x1b[36mMaximum nanoeth per gas\x1b[0m: ')
		const maxFeePerGas = stringToNano(maxFeeString)
		const priorityFeeString = await prompt('💳 \x1b[36mPriority nanoeth per gas\x1b[0m: ')
		const maxPriorityFeePerGas = stringToNano(priorityFeeString)
		console.log(`\x1b[32mMax Fee\x1b[0m: ${nanoString(maxFeePerGas)} nanoeth; \x1b[32mMax Priority Fee\x1b[0m: ${nanoString(maxPriorityFeePerGas)}`)
		return { maxFeePerGas, maxPriorityFeePerGas }
	})
}

export async function promptForEth(message: string = `\x1b[36mAmount (in ETH)\x1b[0m: `) {
	const amount = await promptForLargeNumber(message, 18n)
	console.log(`\x1b[32mETH\x1b[0m: ${attoString(amount)}`)
	return amount
}

export async function promptForTokenAmount(token: string, decimals: bigint) {
	const amount = await promptForLargeNumber(`\x1b[36mAmount (in ${token})\x1b[0m: `, decimals)
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
	const name = (await promptForString('\x1b[36mToken to buy\x1b[0m: ')).toUpperCase()
	if (!(tokens.hasOwnProperty(name))) throw new Error(`Unknown token, only [${Object.keys(tokens).join(',')}] are supported.`)
	const address = tokens[name as keyof typeof tokens]
	const result = await call(address, 'decimals()', [])
	const decimals = bytesToUnsigned(result)
	console.log(`\x1b[32mName\x1b[0m: ${name}; \x1b[32mAddress\x1b[0m: ${toChecksummedAddress(address)}; \x1b[32mDecimals\x1b[0m: ${decimals.toString(10)}`)
	return { name, address, decimals }
}

export async function promptForBytes(message: string) {
	return withPrompt(async prompt => {
		const hex = await prompt(message)
		if (!/^(?:0x)(?:[a-fA-F0-9][a-fA-F0-9])+$/.test(hex)) throw new Error(`Must provide a hexadecimal string with an optional 0x prefix.`)
		return toUint8Array(hex)
	})
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
		await prompt(`\x1b[36mPress enter to continue.\x1b[0m`)
	})
}

export async function promptForYesNo(message: string) {
	return withPrompt(async prompt => {
		const response = await prompt(message)
		if (response.toLocaleLowerCase() === 'yes' || response.toLocaleLowerCase() === 'y') {
			return true
		} else {
			return false
		}
	})
}

export async function promptForString(message: string) {
	return withPrompt(async prompt => {
		return await prompt(message)
	})
}

export async function promptForInteger(message: string) {
	return withPrompt(async prompt => {
		const valueString = await prompt(message)
		if (!/^\d+$/.test(valueString)) throw new Error(`You must enter an integer.`)
		return BigInt(valueString)
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
