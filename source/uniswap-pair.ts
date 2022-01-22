// THIS FILE IS AUTOMATICALLY GENERATED BY `generateContractInterfaces.ts`. DO NOT EDIT BY HAND'

import { EventDescription, DecodedEvent, ParameterDescription, EncodableArray, EncodableTuple, decodeParameters, decodeEvent, decodeMethod } from '@zoltu/ethereum-abi-encoder'
export { EncodableArray, EncodableTuple }

export interface Log {
	readonly topics: ReadonlyArray<bigint>
	readonly data: Uint8Array
}
export interface TransactionReceipt {
	readonly status: boolean
	readonly logs: Iterable<Log>
}

export const eventDescriptions: { [signatureHash: string]: EventDescription & {signature: string} } = {
	'8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': {"type":"event","name":"Approval","signature":"Approval(address,address,uint256)","inputs":[{"type":"address","name":"owner","indexed":true},{"type":"address","name":"spender","indexed":true},{"type":"uint256","name":"value","indexed":false}]},
	'dccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496': {"type":"event","name":"Burn","signature":"Burn(address,uint256,uint256,address)","inputs":[{"type":"address","name":"sender","indexed":true},{"type":"uint256","name":"amount0","indexed":false},{"type":"uint256","name":"amount1","indexed":false},{"type":"address","name":"to","indexed":true}]},
	'4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f': {"type":"event","name":"Mint","signature":"Mint(address,uint256,uint256)","inputs":[{"type":"address","name":"sender","indexed":true},{"type":"uint256","name":"amount0","indexed":false},{"type":"uint256","name":"amount1","indexed":false}]},
	'd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': {"type":"event","name":"Swap","signature":"Swap(address,uint256,uint256,uint256,uint256,address)","inputs":[{"type":"address","name":"sender","indexed":true},{"type":"uint256","name":"amount0In","indexed":false},{"type":"uint256","name":"amount1In","indexed":false},{"type":"uint256","name":"amount0Out","indexed":false},{"type":"uint256","name":"amount1Out","indexed":false},{"type":"address","name":"to","indexed":true}]},
	'1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1': {"type":"event","name":"Sync","signature":"Sync(uint112,uint112)","inputs":[{"type":"uint112","name":"reserve0","indexed":false},{"type":"uint112","name":"reserve1","indexed":false}]},
	'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': {"type":"event","name":"Transfer","signature":"Transfer(address,address,uint256)","inputs":[{"type":"address","name":"from","indexed":true},{"type":"address","name":"to","indexed":true},{"type":"uint256","name":"value","indexed":false}]}
}

export namespace UniswapV2Pair {
	export interface Approval extends DecodedEvent {
		name: 'Approval'
		parameters: {
			owner: bigint
			spender: bigint
			value: bigint
		}
	}
}

export namespace UniswapV2Pair {
	export interface Burn extends DecodedEvent {
		name: 'Burn'
		parameters: {
			sender: bigint
			amount0: bigint
			amount1: bigint
			to: bigint
		}
	}
}

export namespace UniswapV2Pair {
	export interface Mint extends DecodedEvent {
		name: 'Mint'
		parameters: {
			sender: bigint
			amount0: bigint
			amount1: bigint
		}
	}
}

export namespace UniswapV2Pair {
	export interface Swap extends DecodedEvent {
		name: 'Swap'
		parameters: {
			sender: bigint
			amount0In: bigint
			amount1In: bigint
			amount0Out: bigint
			amount1Out: bigint
			to: bigint
		}
	}
}

export namespace UniswapV2Pair {
	export interface Sync extends DecodedEvent {
		name: 'Sync'
		parameters: {
			reserve0: bigint
			reserve1: bigint
		}
	}
}

export namespace UniswapV2Pair {
	export interface Transfer extends DecodedEvent {
		name: 'Transfer'
		parameters: {
			from: bigint
			to: bigint
			value: bigint
		}
	}
}

export type Event = DecodedEvent | UniswapV2Pair.Approval | UniswapV2Pair.Burn | UniswapV2Pair.Mint | UniswapV2Pair.Swap | UniswapV2Pair.Sync | UniswapV2Pair.Transfer


export interface Dependencies {
	call(address: bigint, methodSignature: string, methodParameters: EncodableArray, value: bigint): Promise<Uint8Array>
	submitTransaction(address: bigint, methodSignature: string, methodParameters: EncodableArray, value: bigint): Promise<TransactionReceipt>
}


/**
 * By convention, pure/view methods have a `_` suffix on them indicating to the caller that the function will be executed locally and return the function's result.  payable/nonpayable functions have both a local version and a remote version (distinguished by the trailing `_`).  If the remote method is called, you will only get back a transaction hash which can be used to lookup the transaction receipt for success/failure (due to EVM limitations you will not get the function results back).
 */
export class Contract {
	protected constructor(protected readonly dependencies: Dependencies, public readonly address: bigint) { }

	protected async localCall(methodSignature: string, outputParameterDescriptions: ReadonlyArray<ParameterDescription>, methodParameters: EncodableArray, attachedEth?: bigint): Promise<EncodableTuple> {
		const result = await this.dependencies.call(this.address, methodSignature, methodParameters, attachedEth || 0n)
		if (result.length >= 4 && result[0] === 8 && result[1] === 195 && result[2] === 121 && result[3] === 160) {
			const decodedError = decodeMethod(0x08c379a0, [ { name: 'message', type: 'string' } ], result) as { message: string }
			throw new Error(`Contract Error: ${decodedError.message}`)
		}
		return decodeParameters(outputParameterDescriptions, result)
	}

	protected async remoteCall(methodSignature: string, parameters: EncodableArray, errorContext: { transactionName: string }, attachedEth?: bigint): Promise<Array<Event>> {
		const transactionReceipt = await this.dependencies.submitTransaction(this.address, methodSignature, parameters, attachedEth || 0n)
		if (!transactionReceipt.status) throw new Error(`Remote call of ${errorContext.transactionName} failed: ${JSON.stringify(transactionReceipt)}`)
		return this.decodeEvents(transactionReceipt.logs)
	}

	private decodeEvents(encodedEvents: Iterable<Log>): Array<Event> {
		const decodedEvents: Array<DecodedEvent> = []
		for (const encodedEvent of encodedEvents) {
			const decodedEvent = this.tryDecodeEvent(encodedEvent)
			if (decodedEvent) decodedEvents.push(decodedEvent)
		}
		return decodedEvents as Array<Event>
	}

	private tryDecodeEvent(encodedEvent: Log): DecodedEvent | null {
		const signatureHash = encodedEvent.topics[0]
		const eventDescription = eventDescriptions[signatureHash.toString(16)]
		if (!eventDescription) return null
		return decodeEvent(eventDescription, encodedEvent.topics, encodedEvent.data)
	}
}


export class UniswapV2Pair extends Contract {
	public constructor(dependencies: Dependencies, address: bigint) {
		super(dependencies, address)
	}

	public DOMAIN_SEPARATOR_ = async (): Promise<bigint> => {
		const methodSignature = 'DOMAIN_SEPARATOR()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"bytes32","name":"","type":"bytes32"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public MINIMUM_LIQUIDITY_ = async (): Promise<bigint> => {
		const methodSignature = 'MINIMUM_LIQUIDITY()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public PERMIT_TYPEHASH_ = async (): Promise<bigint> => {
		const methodSignature = 'PERMIT_TYPEHASH()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"bytes32","name":"","type":"bytes32"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public allowance_ = async (arg0: bigint, arg1: bigint): Promise<bigint> => {
		const methodSignature = 'allowance(address , address )' as const
		const methodParameters = [arg0, arg1] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public approve = async (spender: bigint, value: bigint): Promise<Array<Event>> => {
		const methodSignature = 'approve(address spender, uint256 value)' as const
		const methodParameters = [spender, value] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'approve' })
	}

	public approve_ = async (spender: bigint, value: bigint): Promise<boolean> => {
		const methodSignature = 'approve(address spender, uint256 value)' as const
		const methodParameters = [spender, value] as const
		const outputParameterDescriptions = [{"internalType":"bool","name":"","type":"bool"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <boolean>result.result
	}

	public balanceOf_ = async (arg0: bigint): Promise<bigint> => {
		const methodSignature = 'balanceOf(address )' as const
		const methodParameters = [arg0] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public burn = async (to: bigint): Promise<Array<Event>> => {
		const methodSignature = 'burn(address to)' as const
		const methodParameters = [to] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'burn' })
	}

	public burn_ = async (to: bigint): Promise<{amount0: bigint, amount1: bigint}> => {
		const methodSignature = 'burn(address to)' as const
		const methodParameters = [to] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <{amount0: bigint, amount1: bigint}>result
	}

	public decimals_ = async (): Promise<bigint> => {
		const methodSignature = 'decimals()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint8","name":"","type":"uint8"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public factory_ = async (): Promise<bigint> => {
		const methodSignature = 'factory()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"address","name":"","type":"address"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public getReserves_ = async (): Promise<{_reserve0: bigint, _reserve1: bigint, _blockTimestampLast: bigint}> => {
		const methodSignature = 'getReserves()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <{_reserve0: bigint, _reserve1: bigint, _blockTimestampLast: bigint}>result
	}

	public initialize = async (token0: bigint, token1: bigint): Promise<Array<Event>> => {
		const methodSignature = 'initialize(address _token0, address _token1)' as const
		const methodParameters = [token0, token1] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'initialize' })
	}

	public initialize_ = async (token0: bigint, token1: bigint): Promise<void> => {
		const methodSignature = 'initialize(address _token0, address _token1)' as const
		const methodParameters = [token0, token1] as const
		const outputParameterDescriptions = [] as const
		await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
	}

	public kLast_ = async (): Promise<bigint> => {
		const methodSignature = 'kLast()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public mint = async (to: bigint): Promise<Array<Event>> => {
		const methodSignature = 'mint(address to)' as const
		const methodParameters = [to] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'mint' })
	}

	public mint_ = async (to: bigint): Promise<bigint> => {
		const methodSignature = 'mint(address to)' as const
		const methodParameters = [to] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"liquidity","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.liquidity
	}

	public name_ = async (): Promise<string> => {
		const methodSignature = 'name()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"string","name":"","type":"string"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <string>result.result
	}

	public nonces_ = async (arg0: bigint): Promise<bigint> => {
		const methodSignature = 'nonces(address )' as const
		const methodParameters = [arg0] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public permit = async (owner: bigint, spender: bigint, value: bigint, deadline: bigint, v: bigint, r: bigint, s: bigint): Promise<Array<Event>> => {
		const methodSignature = 'permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)' as const
		const methodParameters = [owner, spender, value, deadline, v, r, s] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'permit' })
	}

	public permit_ = async (owner: bigint, spender: bigint, value: bigint, deadline: bigint, v: bigint, r: bigint, s: bigint): Promise<void> => {
		const methodSignature = 'permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)' as const
		const methodParameters = [owner, spender, value, deadline, v, r, s] as const
		const outputParameterDescriptions = [] as const
		await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
	}

	public price0CumulativeLast_ = async (): Promise<bigint> => {
		const methodSignature = 'price0CumulativeLast()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public price1CumulativeLast_ = async (): Promise<bigint> => {
		const methodSignature = 'price1CumulativeLast()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public skim = async (to: bigint): Promise<Array<Event>> => {
		const methodSignature = 'skim(address to)' as const
		const methodParameters = [to] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'skim' })
	}

	public skim_ = async (to: bigint): Promise<void> => {
		const methodSignature = 'skim(address to)' as const
		const methodParameters = [to] as const
		const outputParameterDescriptions = [] as const
		await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
	}

	public swap = async (amount0Out: bigint, amount1Out: bigint, to: bigint, data: Uint8Array): Promise<Array<Event>> => {
		const methodSignature = 'swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data)' as const
		const methodParameters = [amount0Out, amount1Out, to, data] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'swap' })
	}

	public swap_ = async (amount0Out: bigint, amount1Out: bigint, to: bigint, data: Uint8Array): Promise<void> => {
		const methodSignature = 'swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data)' as const
		const methodParameters = [amount0Out, amount1Out, to, data] as const
		const outputParameterDescriptions = [] as const
		await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
	}

	public symbol_ = async (): Promise<string> => {
		const methodSignature = 'symbol()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"string","name":"","type":"string"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <string>result.result
	}

	public sync = async (): Promise<Array<Event>> => {
		const methodSignature = 'sync()' as const
		const methodParameters = [] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'sync' })
	}

	public sync_ = async (): Promise<void> => {
		const methodSignature = 'sync()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [] as const
		await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
	}

	public token0_ = async (): Promise<bigint> => {
		const methodSignature = 'token0()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"address","name":"","type":"address"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public token1_ = async (): Promise<bigint> => {
		const methodSignature = 'token1()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"address","name":"","type":"address"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public totalSupply_ = async (): Promise<bigint> => {
		const methodSignature = 'totalSupply()' as const
		const methodParameters = [] as const
		const outputParameterDescriptions = [{"internalType":"uint256","name":"","type":"uint256"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <bigint>result.result
	}

	public transfer = async (to: bigint, value: bigint): Promise<Array<Event>> => {
		const methodSignature = 'transfer(address to, uint256 value)' as const
		const methodParameters = [to, value] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'transfer' })
	}

	public transfer_ = async (to: bigint, value: bigint): Promise<boolean> => {
		const methodSignature = 'transfer(address to, uint256 value)' as const
		const methodParameters = [to, value] as const
		const outputParameterDescriptions = [{"internalType":"bool","name":"","type":"bool"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <boolean>result.result
	}

	public transferFrom = async (from: bigint, to: bigint, value: bigint): Promise<Array<Event>> => {
		const methodSignature = 'transferFrom(address from, address to, uint256 value)' as const
		const methodParameters = [from, to, value] as const
		return await this.remoteCall(methodSignature, methodParameters, { transactionName: 'transferFrom' })
	}

	public transferFrom_ = async (from: bigint, to: bigint, value: bigint): Promise<boolean> => {
		const methodSignature = 'transferFrom(address from, address to, uint256 value)' as const
		const methodParameters = [from, to, value] as const
		const outputParameterDescriptions = [{"internalType":"bool","name":"","type":"bool"}] as const
		const result = await this.localCall(methodSignature, outputParameterDescriptions, methodParameters)
		return <boolean>result.result
	}
}