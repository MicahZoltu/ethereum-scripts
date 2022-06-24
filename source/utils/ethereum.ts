import { keccak_256 } from '@noble/hashes/sha3'
import * as secp256k1 from '@noble/secp256k1'
import { rlpEncode } from '@zoltu/rlp-encoder'
import * as microEthSigner from 'micro-eth-signer'
import { addressString, bigintToUint8Array, bytesToUnsigned, dataString } from './bigint'
import { stripLeadingZeros } from './typed-arrays'
import { assertNever } from './typescript'

export interface IUnsignedTransactionLegacy {
	readonly type: 'legacy'
	readonly from: bigint
	readonly nonce: bigint
	readonly gasPrice: bigint
	readonly gasLimit: bigint
	readonly to: bigint | null
	readonly value: bigint
	readonly data: Uint8Array
	readonly chainId?: bigint
}

export interface IUnsignedTransaction2930 {
	readonly type: '2930'
	readonly from: bigint
	readonly chainId: bigint
	readonly nonce: bigint
	readonly gasPrice: bigint
	readonly gasLimit: bigint
	readonly to: bigint | null
	readonly value: bigint
	readonly data: Uint8Array
	readonly accessList: readonly {
		address: bigint
		storageKeys: readonly bigint[]
	}[]
}

export interface IUnsignedTransaction1559 {
	readonly type: '1559'
	readonly from: bigint
	readonly chainId: bigint
	readonly nonce: bigint
	readonly maxFeePerGas: bigint
	readonly maxPriorityFeePerGas: bigint
	readonly gasLimit: bigint
	readonly to: bigint | null
	readonly value: bigint
	readonly data: Uint8Array
	readonly accessList: readonly {
		address: bigint
		storageKeys: readonly bigint[]
	}[]
}

export interface ITransactionSignature {
	readonly r: bigint
	readonly s: bigint
	readonly yParity: 'even' | 'odd'
	readonly hash: bigint
}

export type IUnsignedTransaction = IUnsignedTransactionLegacy | IUnsignedTransaction2930 | IUnsignedTransaction1559
export type ISignedTransaction = (IUnsignedTransactionLegacy | IUnsignedTransaction2930 | IUnsignedTransaction1559) & ITransactionSignature

function isSignedTransaction(maybeSigned: unknown): maybeSigned is ISignedTransaction {
	return typeof maybeSigned === 'object'
		&& maybeSigned !== null
		&& 'r' in maybeSigned
		&& 's' in maybeSigned
		&& 'yParity' in maybeSigned
}

export function rlpEncodeLegacyTransactionPayload(transaction: IUnsignedTransactionLegacy): Uint8Array {
	const toEncode = [
		stripLeadingZeros(bigintToUint8Array(transaction.nonce, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasPrice!, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasLimit, 32)),
		transaction.to !== null ? bigintToUint8Array(transaction.to, 20) : new Uint8Array(0),
		stripLeadingZeros(bigintToUint8Array(transaction.value, 32)),
		new Uint8Array(transaction.data),
	]
	if (!isSignedTransaction(transaction)) {
		if ('chainId' in transaction && transaction.chainId !== undefined) {
			toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.chainId, 32)))
			toEncode.push(stripLeadingZeros(new Uint8Array(0)))
			toEncode.push(stripLeadingZeros(new Uint8Array(0)))
		}
	} else {
		const v = 'chainId' in transaction && transaction.chainId !== undefined
			? (transaction.yParity === 'even' ? 0n : 1n) + 35n + 2n * transaction.chainId
			: transaction.yParity === 'even' ? 27n : 28n
		toEncode.push(stripLeadingZeros(bigintToUint8Array(v, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.r, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.s, 32)))
	}
	return rlpEncode(toEncode)
}

export function rlpEncode2930TransactionPayload(transaction: IUnsignedTransaction2930): Uint8Array {
	const toEncode = [
		stripLeadingZeros(bigintToUint8Array(transaction.chainId, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.nonce, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasPrice, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasLimit, 32)),
		transaction.to !== null ? bigintToUint8Array(transaction.to, 20) : new Uint8Array(0),
		stripLeadingZeros(bigintToUint8Array(transaction.value, 32)),
		transaction.data,
		transaction.accessList.map(({address, storageKeys}) => [bigintToUint8Array(address, 20), storageKeys.map(slot => bigintToUint8Array(slot, 32))]),
	]
	if (isSignedTransaction(transaction)) {
		toEncode.push(stripLeadingZeros(new Uint8Array([transaction.yParity === 'even' ? 0 : 1]))),
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.r, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.s, 32)))
	}
	return rlpEncode(toEncode)
}

export function rlpEncode1559TransactionPayload(transaction: IUnsignedTransaction1559): Uint8Array {
	const toEncode = [
		stripLeadingZeros(bigintToUint8Array(transaction.chainId, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.nonce, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.maxPriorityFeePerGas, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.maxFeePerGas, 32)),
		stripLeadingZeros(bigintToUint8Array(transaction.gasLimit, 32)),
		transaction.to !== null ? bigintToUint8Array(transaction.to, 20) : new Uint8Array(0),
		stripLeadingZeros(bigintToUint8Array(transaction.value, 32)),
		transaction.data,
		transaction.accessList.map(({address, storageKeys}) => [bigintToUint8Array(address, 20), storageKeys.map(slot => bigintToUint8Array(slot, 32))]),
	]
	if (isSignedTransaction(transaction)) {
		toEncode.push(stripLeadingZeros(new Uint8Array([transaction.yParity === 'even' ? 0 : 1]))),
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.r, 32)))
		toEncode.push(stripLeadingZeros(bigintToUint8Array(transaction.s, 32)))
	}
	return rlpEncode(toEncode)
}

export function serializeTransactionToBytes(transaction: IUnsignedTransaction | ISignedTransaction): Uint8Array {
	switch (transaction.type) {
		case 'legacy': return rlpEncodeLegacyTransactionPayload(transaction)
		case '2930': return new Uint8Array([1, ...rlpEncode2930TransactionPayload(transaction)])
		case '1559': return new Uint8Array([2, ...rlpEncode1559TransactionPayload(transaction)])
		default: assertNever(transaction)
	}
}

export function serializeTransactionToString(transaction: ISignedTransaction) {
	return `0x${dataString(serializeTransactionToBytes(transaction))}`
}

export async function signTransaction<T extends IUnsignedTransaction>(privateKey: bigint, unsignedTransaction: T): Promise<T & ITransactionSignature> {
	const serializedUnsignedTransaction = serializeTransactionToBytes(unsignedTransaction)
	const unsignedHash = keccak_256(serializedUnsignedTransaction)
	const [compactSignature, recoveryParameter] = await secp256k1.sign(unsignedHash, privateKey, { recovered: true })
	const { r, s } = secp256k1.Signature.fromDER(compactSignature)
	
	const yParity = recoveryParameter === 0 ? 'even' : 'odd'
	const hash = bytesToUnsigned(keccak_256(serializeTransactionToBytes({ ...unsignedTransaction, r, s, yParity })))
	return { ...unsignedTransaction, r, s, yParity, hash }
}

export async function create2Address(deployerAddress: bigint, deploymentBytecodeOrHash: Uint8Array | bigint, salt: bigint = 0n) {
	const deploymentBytecodeHash = typeof deploymentBytecodeOrHash === 'bigint' ? bigintToUint8Array(deploymentBytecodeOrHash, 32) : keccak_256(deploymentBytecodeOrHash)
	return bytesToUnsigned(keccak_256(new Uint8Array([0xff, ...bigintToUint8Array(deployerAddress, 20), ...bigintToUint8Array(salt, 32), ...deploymentBytecodeHash]))) & 0xffffffffffffffffffffffffffffffffffffffffn
}

export function fromChecksummedAddress(address: string) {
	if (!microEthSigner.Address.verifyChecksum(address)) throw new Error(`Address ${address} failed checksum verification.`)
	return BigInt(address)
}

export function toChecksummedAddress(address: bigint) {
	return microEthSigner.Address.checksum(addressString(address))
}

export async function signMessage(privateKey: bigint, message: string) {
	const prefixedMessage = `\x19Ethereum Signed Message:\n${message.length.toString(10)}${message}`
	const prefixedMessageBytes = new TextEncoder().encode(prefixedMessage)
	const prefixedMessageHash = keccak_256(prefixedMessageBytes)
	const [compactSignature, recoveryParameter] = await secp256k1.sign(prefixedMessageHash, privateKey, { recovered: true })
	const { r, s } = secp256k1.Signature.fromDER(compactSignature)
	return { r, s, v: recoveryParameter + 27 }
}

export function checksummedAddress(address: bigint) {
	return microEthSigner.Address.checksum(addressString(address))
}
