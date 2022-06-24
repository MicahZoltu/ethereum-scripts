import * as readline from 'readline'
import * as microEthSigner from 'micro-eth-signer'
import * as bip32 from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { bigintToUint8Array, bytesToUnsigned, nanoString, stringToAtto, stringToNano } from './bigint'
import { fromChecksummedAddress } from './ethereum'

export async function promptForPrivateKey() {
	return withPrompt(async prompt => {
		const wordsOrKey = await prompt('🔑 Mnemonic or Private Key: ')
		if (wordsOrKey.trim().length === 0) throw new Error(`Mnemonic or private key required, but received nothing.`)
		const privateKey = wordsOrKey.includes(' ')
			? bytesToUnsigned(bip32.HDKey.fromMasterSeed(await bip39.mnemonicToSeed(wordsOrKey)).derive(await prompt(`🔖 Derivation Path (m/44'/60'/0'/0/0): `) || `m/44'/60'/0'/0/0`).privateKey!)
			: BigInt(wordsOrKey)
		const address = microEthSigner.Address.fromPrivateKey(bigintToUint8Array(privateKey, 32))
		console.log(`\x1b[32mSigner Address\x1b[0m: ${address}`)
		return { privateKey, address: BigInt(address) }
	})
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
	return withPrompt(async prompt => {
		const amountString = await prompt(message)
		const amount = stringToAtto(amountString)
		return amount
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
