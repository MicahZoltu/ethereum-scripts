declare module 'ethjs-shared'{
	export class BN {
		toString(base: number): string;
		toNumber(): number;
		add(other: BN): BN;
		sub(other: BN): BN;
		mul(other: BN): BN;
		div(other: BN): BN;
		pow(other: BN): BN;
	}

	export type Primitive = 'uint256' | 'bool' | 'address' | 'uint64';

	export interface AbiParameter {
		name: string,
		type: Primitive,
	}

	export interface AbiEventParameter extends AbiParameter {
		indexed: boolean,
	}

	export interface AbiFunction {
		name: string,
		type: 'function',
		constant: boolean,
		payable: boolean,
		inputs: AbiParameter[],
		outputs: AbiParameter[],
	}

	export interface AbiEvent {
		name: string,
		type: 'event',
		inputs:AbiEventParameter[],
		anonymous: boolean,
	}

	export type Abi = AbiFunction | AbiEvent;

	export interface TransactionObject {
		from: string,
	}

	export interface Log {
		removed: boolean;
		logIndex: BN;
		transactionIndex: BN;
		transactionHash: string;
		blockHash: string;
		blockNumber: BN;
		address: string;
		data: string;
		topics: string[];
	}
}
