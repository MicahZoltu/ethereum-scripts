declare module 'ethjs' {
	import { Abi, TransactionObject, BN as BNInterface, Log } from 'ethjs-shared';

	class Ethjs {
		constructor(provider: Ethjs.HttpProvider);
		net_version(): string;
		contract(abi: Abi[], bytecode?: string, defaultTransactionObject?: TransactionObject): any;
		getLogs(options: { fromBlock: BNInterface|string, toBlock: BNInterface|string, address: string, topics: (string|null)[] }): Log[];
	}

	namespace Ethjs {
		class HttpProvider {
			constructor(address: string, options?: any);
		}

		class BN extends BNInterface {
			constructor(value: number|string, radix?: number)
		}

		const keccak256: (source: string) => string;
	}

	export = Ethjs;
}
