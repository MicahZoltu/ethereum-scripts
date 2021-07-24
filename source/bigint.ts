export function attoString(value: bigint): string {
	const integerPart = value / 10n**18n
	const fractionalPart = value % 10n**18n
	if (fractionalPart === 0n) {
		return integerPart.toString(10)
	} else {
		return `${integerPart.toString(10)}.${fractionalPart.toString(10).padStart(18, '0').replace(/0+$/, '')}`
	}
}

export function attoethToEthDouble(value: bigint) {
	const decimalString = attoString(value)
	return Number.parseFloat(decimalString)
}

export function addressString(address: bigint | null) {
	return address === null ? null : address.toString(16).padStart(40, '0')
}

export function bytes32String(bytes32: bigint | null) {
	return bytes32 === null ? null : bytes32.toString(16).padStart(64, '0')
}

export function dataString(data: Uint8Array | null) {
	if (data === null) return ''
	return Array.from(data).map(x => x.toString(16).padStart(2,'0')).join('')
}

export function uint8ArrayToBigint(value: Uint8Array) {
	let result = 0n
	for (let i = 0; i < value.length; ++i) {
		result |= BigInt(value[i] << ((value.length - 1) - i) * 8)
	}
	return result
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

export function squareRoot(value: bigint) {
	let z = (value + 1n) / 2n
	let y = value
	while (z - y < 0n) {
		y = z
		z = (value / z + z) / 2n
	}
	return y
}

export function stringfyJSONWithBigInts(value: any): string {
	return JSON.stringify(value, (_key, value) =>
		typeof value === 'bigint'
			? `0x${value.toString(16)}`
			: value // return everything else unchanged
	);
}
