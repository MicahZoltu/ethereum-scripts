import * as t from 'funtypes'
import { UnionToIntersection } from './typescript'

const BigIntParser: t.ParsedValue<t.String, bigint>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{1,64})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded number.` }
		else return { success: true, value: BigInt(value) }
	},
	serialize: value => ({ success: true, value: `0x${value.toString(16)}` }),
}

const AddressParser: t.ParsedValue<t.String, bigint>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{40})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded address.` }
		else return { success: true, value: BigInt(value) }
	},
	serialize: value => ({ success: true, value: value ? `0x${value.toString(16).padStart(40, '0')}` : "" }),
}

const Bytes32Parser: t.ParsedValue<t.String, bigint>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{64})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded 32 byte value.` }
		else return { success: true, value: BigInt(value) }
	},
	serialize: value => ({ success: true, value: `0x${value.toString(16).padStart(64, '0')}` }),
}

const BytesParser: t.ParsedValue<t.String, Uint8Array>['config'] = {
	parse: value => {
		const match = /^(?:0x)?([a-fA-F0-9]*)$/.exec(value)
		if (match === null) return { success: false, message: `Expected a hex string encoded byte array with an optional '0x' prefix but received ${value}` }
		const normalized = match[1]
		if (normalized.length % 2) return { success: false, message: `Hex string encoded byte array must be an even number of charcaters long.`}
		const bytes = new Uint8Array(normalized.length / 2)
		for (let i = 0; i < normalized.length; i += 2) {
			bytes[i/2] = Number.parseInt(`${normalized[i]}${normalized[i + 1]}`, 16)
		}
		return { success: true, value: new Uint8Array(bytes) }
	},
	serialize: value => {
		let result = ''
		for (let i = 0; i < value.length; ++i) {
			result += ('0' + value[i].toString(16)).slice(-2)
		}
		return { success: true, value: `0x${result}` }
	}
}

const TimestampParser: t.ParsedValue<t.String, Date>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{0,8})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded timestamp.` }
		else return { success: true, value: new Date(Number.parseInt(value, 16) * 1000) }
	},
	serialize: value => ({ success: true, value: `0x${Math.floor(value.valueOf() / 1000).toString(16)}` }),
}

const NumberToBigintParser: t.ParsedValue<t.Number, bigint>['config'] = {
	parse: value => {
		if (!Number.isSafeInteger(value)) return { success: false, message: `${value} is not a safe integer.` }
		return { success: true, value: BigInt(value) }
	},
	serialize: value => {
		if (!Number.isSafeInteger(Number(value))) return { success: false, message: `${value} is not a safe integer.` }
		return { success: true, value: Number(value) }
	},
}

const Base10NumberStringToBigintParser: t.ParsedValue<t.String, bigint>['config'] = {
	parse: value => {
		if (!/\d+/.test(value)) return { success: false, message: `${value} is not a safe integer.` }
		return { success: true, value: BigInt(value) }
	},
	serialize: value => {
		return { success: true, value: value.toString(10) }
	},
}

const LiteralConverterParserFactory: <TInput, TOutput> (input: TInput, output: TOutput) => t.ParsedValue<t.Runtype<TInput>, TOutput>['config'] = (input, output) => {
	return {
		parse: () => ({ success: true, value: output }),
		serialized: () => ({ success: true, value: input }),
	}
}


//
// Ethereum
//

export const EthereumQuantity = t.String.withParser(BigIntParser)
export type EthereumQuantity = t.Static<typeof EthereumQuantity>

export const EthereumData = t.String.withParser(BytesParser)
export type EthereumData = t.Static<typeof EthereumData>

export const EthereumAddress = t.String.withParser(AddressParser)
export type EthereumAddress = t.Static<typeof EthereumAddress>

export const EthereumBytes32 = t.String.withParser(Bytes32Parser)
export type EthereumBytes32 = t.Static<typeof EthereumBytes32>

export const EthereumTimestamp = t.String.withParser(TimestampParser)
export type EthereumTimestamp = t.Static<typeof EthereumTimestamp>

export interface JsonRpcRequest {
	jsonrpc: '2.0'
	id: number
	method: string
	params: unknown[]
}

export type JsonRpcSuccessResponse = t.Static<typeof JsonRpcSuccessResponse>
export const JsonRpcSuccessResponse = t.Object({
	jsonrpc: t.Literal('2.0'),
	id: t.Union(t.String, t.Number),
	result: t.Unknown,
}).asReadonly()

export type JsonRpcErrorResponse = t.Static<typeof JsonRpcErrorResponse>
export const JsonRpcErrorResponse = t.Object({
	jsonrpc: t.Literal('2.0'),
	id: t.Union(t.String, t.Number),
	error: t.Object({
		code: t.Number,
		message: t.String,
		data: t.Unknown,
	}).asReadonly(),
}).asReadonly()

export type JsonRpcResponse = t.Static<typeof JsonRpcResponse>
export const JsonRpcResponse = t.Union(JsonRpcErrorResponse, JsonRpcSuccessResponse)

export const EthGetStorageAtRequestParameters = t.Readonly(t.Tuple(EthereumAddress, EthereumQuantity))
export type EthGetStorageAtRequestParameters = t.Static<typeof EthGetStorageAtRequestParameters>

export type EthGetStorageAtResponse = t.Static<typeof EthGetStorageAtResponse>
export const EthGetStorageAtResponse = t.Union(
	EthereumBytes32,
	t.String.withParser({ parse: x => x === '0x' ? { success: true, value: null } : { success: false, message: `eth_getStorageAt didn't return 32 bytes of data nor 0x.` } }),
)

export type EthGetBlockResponse = t.Static<typeof EthGetBlockResponse>
export const EthGetBlockResponse = t.Object({
	// author: EthereumAddress,
	difficulty: EthereumQuantity,
	extraData: EthereumData,
	gasLimit: EthereumQuantity,
	gasUsed: EthereumQuantity,
	hash: EthereumBytes32,
	logsBloom: EthereumData,
	miner: EthereumAddress,
	mixHash: EthereumBytes32,
	nonce: EthereumData,
	number: EthereumQuantity,
	parentHash: EthereumBytes32,
	receiptsRoot: EthereumBytes32,
	sha3Uncles: EthereumBytes32,
	// signature: EthereumData,
	size: EthereumQuantity,
	stateRoot: EthereumBytes32,
	timestamp: EthereumTimestamp,
	totalDifficulty: EthereumQuantity,
	transactions: t.ReadonlyArray(t.Object({
		hash: EthereumBytes32,
		nonce: EthereumQuantity,
		// blockHash: EthereumBytes32,
		// blockNumber: EthereumQuantity,
		// transactionIndex: EthereumQuantity,
		from: EthereumAddress,
		to: t.Union(EthereumAddress, t.Null),
		value: EthereumQuantity,
		gasPrice: EthereumQuantity,
		gas: EthereumQuantity,
		// data: EthereumData,
		input: EthereumData,
		v: EthereumQuantity,
		s: EthereumQuantity,
		r: EthereumQuantity,
	})),
	transactionsRoot: EthereumBytes32,
	uncles: t.ReadonlyArray(EthereumBytes32),
})


//
// Nethermind
//

export type NethermindPushPendingTransaction = t.Static<typeof NethermindPushPendingTransaction>
export const NethermindPushPendingTransaction = t.Intersect(
	t.Object({
		nonce: EthereumQuantity,
		gasPrice: EthereumQuantity,
		gasLimit: EthereumQuantity,
		value: EthereumQuantity,
		senderAddress: EthereumAddress,
		signature: t.Object({
			// bytes: T.String,
			v: EthereumQuantity,
			recoveryId: t.Union(t.Literal(0), t.Literal(1)),
			r: EthereumBytes32,
			s: EthereumBytes32,
			// bytesWithRecovery: T.String,
		}).asReadonly(),
		// isSigned: T.Boolean,
		// isContractCreation: T.Boolean,
		// isMessageCall: T.Boolean,
		hash: EthereumBytes32,
		timestamp: EthereumTimestamp,
		// poolIndex: T.Number,
	}).asReadonly(),
	t.Partial({
		to: t.Union(EthereumAddress, t.Null),
		deliveredBy: EthereumData,
		data: EthereumData,
		chainId: EthereumQuantity,
	}).asReadonly(),
)

export type FilterMatch = t.Static<typeof FilterMatch>
export const FilterMatch = t.Object({
	gas: EthereumQuantity,
	value: EthereumQuantity,
	from: EthereumAddress,
	to: EthereumAddress,
	input:EthereumData,
	callType: t.Union(
		t.Literal(0).withParser(LiteralConverterParserFactory(0, 'Transaction' as const)),
		t.Literal(1).withParser(LiteralConverterParserFactory(1, 'Call' as const)),
		t.Literal(2).withParser(LiteralConverterParserFactory(2, 'StaticCall' as const)),
		t.Literal(3).withParser(LiteralConverterParserFactory(3, 'CallCode' as const)),
		t.Literal(4).withParser(LiteralConverterParserFactory(4, 'DelegateCall' as const)),
		t.Literal(5).withParser(LiteralConverterParserFactory(5, 'Create' as const)),
		t.Literal(6).withParser(LiteralConverterParserFactory(6, 'Create2' as const)),
	),
}).asReadonly()

export type FilterMatchMessage = t.Static<typeof FilterMatchMessage>
export const FilterMatchMessage = t.Object({
	transaction: NethermindPushPendingTransaction,
	filterMatches: t.ReadonlyArray(FilterMatch),
}).asReadonly()

export type PendingTransactionMessage = t.Static<typeof PendingTransactionMessage>
export const PendingTransactionMessage = t.Union(
	NethermindPushPendingTransaction,
	FilterMatchMessage,
)

export type UnsignedTransaction = t.Static<typeof UnsignedTransaction>
export const UnsignedTransaction = t.Object({
	nonce: EthereumQuantity,
	from: EthereumAddress,
	to: t.Union(EthereumAddress, t.Null),
	value: EthereumQuantity,
	gas: EthereumQuantity,
	gasPrice: EthereumQuantity,
	data: EthereumData,
	chainId: EthereumQuantity,
}).asReadonly()

export type NethermindPushBlock = t.Static<typeof NethermindPushBlock>
export const NethermindPushBlock = t.Object({
	parentHash: EthereumBytes32,
	hash: EthereumBytes32,
	number: EthereumQuantity,
	timestamp: EthereumTimestamp,
	transactions: t.ReadonlyArray(t.Object({
		hash: EthereumBytes32,
		signer: EthereumAddress,
		nonce: EthereumQuantity,
		gasPrice: EthereumQuantity,
	}).asReadonly())
}).asReadonly()

export type TxPoolResult = t.Static<typeof TxPoolResult>
export const TxPoolResult = t.Readonly(
	t.Record(
		t.Union(t.Literal('pending'), t.Literal('queued')),
		t.Record(
			t.String.withConstraint(x => /0x[a-fA-F0-9]{40}/.test(x)),
			t.Record(
				t.Number,
				t.Object({
					blockHash: t.Null,
					blockNumber: t.Null,
					from: EthereumAddress,
					gas: EthereumQuantity,
					gasPrice: EthereumQuantity,
					hash: EthereumBytes32,
					input: EthereumData,
					nonce: EthereumQuantity,
					to: t.Union(EthereumAddress, t.Null),
					transactionIndex: t.Null,
					value: EthereumQuantity,
					r: EthereumQuantity,
					s: EthereumQuantity,
					v: EthereumQuantity,
				}).asReadonly(),
			),
		),
	),
)

export type MulticallRequestParameters = t.Static<typeof MulticallRequestParameters>
export const MulticallRequestParameters = t.Readonly(t.Tuple(
	EthereumQuantity, // block number
	EthereumAddress, // miner
	t.ReadonlyArray(UnsignedTransaction),
))

export type MulticallResponse = t.Static<typeof MulticallResponse>
export const MulticallResponse = t.ReadonlyArray(
	t.Union(
		t.Object({
			statusCode: t.Literal(1).withParser(LiteralConverterParserFactory(1, 'success')),
			gasSpent: EthereumQuantity,
			returnValue: t.String,
		}).asReadonly(),
		t.Object({
			statusCode: t.Literal(0).withParser(LiteralConverterParserFactory(0, 'failure')),
			gasSpent: EthereumQuantity,
			error: t.String,
			returnValue: t.String,
		}).asReadonly(),
	)
)

export type FilteredExecutionRequest = t.Static<typeof FilteredExecutionRequest>
export const FilteredExecutionRequest = t.Object({
	contract: EthereumAddress,
	signature: t.Number,
	gasLimit: EthereumQuantity,
}).asReadonly()


//
// Flashbots
//

export interface EthSendBundleRequest extends JsonRpcRequest {
	params: [
		string[],
		string,
		number,
		number,
	]
}

export type FlashbotsSignedTransactionForBundle = t.Static<typeof FlashbotsSignedTransactionForBundle>
export const FlashbotsSignedTransactionForBundle = t.Object({
	to: EthereumAddress,
	nonce: EthereumQuantity,
	value: EthereumQuantity,
	data: EthereumData,
	gasPrice: EthereumQuantity,
	gas: EthereumQuantity,
	r: EthereumQuantity,
	s: EthereumQuantity,
	v: EthereumQuantity,
}).asReadonly()

export type FlashbotsBlocksResponse = t.Static<typeof FlashbotsBlocksResponse>
export const FlashbotsBlocksResponse = t.Object({
	blocks: t.ReadonlyArray(t.Object({
		block_number: t.Number.withParser(NumberToBigintParser),
		miner: EthereumAddress,
		miner_reward: t.String.withParser(Base10NumberStringToBigintParser),
		coinbase_transfers: t.String.withParser(Base10NumberStringToBigintParser),
		gas_used: t.Number.withParser(NumberToBigintParser),
		gas_price: t.String.withParser(Base10NumberStringToBigintParser),
		transactions: t.ReadonlyArray(t.Object({
			transaction_hash: EthereumBytes32,
			tx_index: t.Number.withParser(NumberToBigintParser),
			block_number: t.Number.withParser(NumberToBigintParser),
			eoa_address: EthereumAddress,
			to_address: EthereumAddress,
			gas_used: t.Number.withParser(NumberToBigintParser),
			gas_price: t.String.withParser(Base10NumberStringToBigintParser),
			coinbase_transfer: t.String.withParser(Base10NumberStringToBigintParser),
			total_miner_reward: t.String.withParser(Base10NumberStringToBigintParser),
		}))
	}))
})


//
// Helpers
//

export function serialize<T, U extends t.Codec<T>>(funtype: U, value: T) {
	return funtype.serialize(value) as ToWireType<U>
}

export type ToWireType<T> =
	T extends t.Intersect<infer U> ? UnionToIntersection<{ [I in keyof U]: ToWireType<U[I]> }[number]>
	: T extends t.Union<infer U> ? { [I in keyof U]: ToWireType<U[I]> }[number]
	: T extends t.Record<infer U, infer V> ? Record<t.Static<U>, ToWireType<V>>
	: T extends t.Partial<infer U, infer V> ? V extends true ? { readonly [K in keyof U]?: ToWireType<U[K]> } : { [K in keyof U]?: ToWireType<U[K]> }
	: T extends t.Object<infer U, infer V> ? V extends true ? { readonly [K in keyof U]: ToWireType<U[K]> } : { [K in keyof U]: ToWireType<U[K]> }
	: T extends t.Readonly<t.Tuple<infer U>> ? { readonly [P in keyof U]: ToWireType<U[P]>}
	: T extends t.Tuple<infer U> ? { [P in keyof U]: ToWireType<U[P]>}
	: T extends t.ReadonlyArray<infer U> ? readonly ToWireType<U>[]
	: T extends t.Array<infer U> ? ToWireType<U>[]
	: T extends t.ParsedValue<infer U, infer _> ? ToWireType<U>
	: T extends t.Codec<infer U> ? U
	: never
