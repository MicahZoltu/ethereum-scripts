export const toAttoeth = (eth: number | bigint): bigint => typeof eth === 'bigint' ? eth * 10n**18n : BigInt(eth * 1e18)
export const toEth = (attoeth: bigint): number => Number(attoeth) / 1e18

export const sleep = async (milliseconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, milliseconds))

export function attoString(value: bigint): string {
	const integerPart = value / 10n**18n
	const fractionalPart = value % 10n**18n
	if (fractionalPart === 0n) {
		return integerPart.toString(10)
	} else {
		return `${integerPart.toString(10)}.${fractionalPart.toString(10).padStart(18, '0').replace(/0+$/, '')}`
	}
}

export function stringToAtto(value: string): bigint {
	return decimalStringToBigint(value, 18)
}

export function decimalStringToBigint(value: string, power: number): bigint {
	if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error(`Value is not a decimal string.`)
	let [integerPart, fractionalPart] = value.split('.')
	fractionalPart = (fractionalPart || '').padEnd(power, '0')
	return BigInt(`${integerPart}${fractionalPart}`)
}

export function nanoString(value: bigint): string {
	const integerPart = value / 10n**9n
	const fractionalPart = value % 10n**9n
	if (fractionalPart === 0n) {
		return integerPart.toString(10)
	} else {
		return `${integerPart.toString(10)}.${fractionalPart.toString(10).padStart(9, '0').replace(/0+$/, '')}`
	}
}

export async function awaitUserInput() {
	const process = await import('process')
	process.stdin.setRawMode(true)
	return new Promise(resolve => process.stdin.once('data', () => {
		process.stdin.setRawMode(false)
		resolve(undefined)
	}))
}

export function addressString(address: bigint) {
	return address.toString(16).padStart(40, '0')
}

export function bigintToUint8Array(value: bigint, numberOfBytes: number) {
	if (typeof value === 'number') value = BigInt(value)
	if (value >= 2n ** BigInt(numberOfBytes * 8) || value < 0n) throw new Error(`Cannot fit ${value} into a ${numberOfBytes}-byte unsigned integer.`)
	const result = new Uint8Array(numberOfBytes)
	for (let i = 0; i < result.length; ++i) {
		result[i] = Number((value >> BigInt(numberOfBytes - i - 1) * 8n) & 0xffn)
	}
	return result
}
