import { keccak256, secp256k1 } from '@zoltu/ethereum-crypto'
import { rlpEncode } from '@zoltu/rlp-encoder'
import { bigintToUint8Array } from './bigint'
import { stripLeadingZeros } from './typed-arrays'

export interface IOffChainTransaction {
	readonly from: bigint
	readonly to: bigint | null
	readonly value: bigint
	readonly data: Uint8Array
	readonly gasLimit?: bigint
	readonly gasPrice?: bigint
}

export interface IOnChainTransaction extends IOffChainTransaction {
	readonly gasLimit: bigint
	readonly gasPrice: bigint
	readonly nonce: bigint
}

export interface IUnsignedTransaction extends IOnChainTransaction {
	readonly chainId: bigint
}

export interface ISignedTransaction extends IUnsignedTransaction {
	readonly r: bigint
	readonly s: bigint
	readonly v: bigint
	readonly yParity: 'even' | 'odd',
	hash: bigint
}

export interface ILogFilter {
	readonly address?: string;
    readonly topics?: (string | null | string[])[]
}

function isSignedTransaction(maybe: unknown): maybe is ISignedTransaction {
	return typeof maybe === 'object'
		&& maybe !== null
		&& 'r' in maybe
		&& 's' in maybe
		&& ('v' in maybe || 'yParity' in maybe)
}

// TODO: add support for 2930 and 1559 transactions
export function rlpEncodeTransaction(transaction: IUnsignedTransaction | ISignedTransaction): Uint8Array {
	const toEncode = [
		stripLeadingZeros(bigintToUint8Array(transaction.nonce, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasPrice, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasLimit, 32)),
		stripLeadingZeros(transaction.to !== null ? bigintToUint8Array(transaction.to, 32) : new Uint8Array(0)),
		stripLeadingZeros(bigintToUint8Array(transaction.value, 32)),
		new Uint8Array(transaction.data),
	]
	if (!isSignedTransaction(transaction)) {
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.chainId, 32)))
		toEncode.push(stripLeadingZeros(new Uint8Array(0)))
		toEncode.push(stripLeadingZeros(new Uint8Array(0)))
	} else {
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.v, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.r, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.s, 32)))
	}
	return rlpEncode(toEncode)
}

export function rlpEncode2930Transaction(transaction: IUnsignedTransaction | ISignedTransaction): Uint8Array {
	const toEncode = [
		stripLeadingZeros(bigintToUint8Array(transaction.chainId, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.nonce, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasPrice, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasLimit, 32)),
		stripLeadingZeros(transaction.to !== null ? bigintToUint8Array(transaction.to, 32) : new Uint8Array(0)),
		stripLeadingZeros(bigintToUint8Array(transaction.value, 32)),
		new Uint8Array(transaction.data),
		[],
	]
	if (isSignedTransaction(transaction)) {
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.yParity === 'even' ? 0n : 1n, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.r, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.s, 32)))
	}
	return rlpEncode(toEncode)
}

export async function signTransaction(privateKey: bigint, unsignedTransaction: IUnsignedTransaction): Promise<ISignedTransaction> {
	const rlpEncodedUnsignedTransaction = rlpEncodeTransaction(unsignedTransaction)
	const hash = await keccak256.hash(rlpEncodedUnsignedTransaction)
	const { r, s, recoveryParameter } = await secp256k1.sign(privateKey, hash)
	const yParity = recoveryParameter === 0 ? 'even' : 'odd'
	const v = (yParity === 'even' ? 0n : 1n) + 35n + 2n * unsignedTransaction.chainId
	return {...unsignedTransaction, r, s, v, yParity, hash }
}
