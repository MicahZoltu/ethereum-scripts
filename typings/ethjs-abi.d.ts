declare module 'ethjs-abi' {
	import { AbiFunction, AbiEvent, BN } from 'ethjs-shared';

	function encodeMethod(abi: AbiFunction, parameters: (string|BN)[]): string;
	function decodeMethod(abi: AbiFunction, bytecode: string): any;
	function encodeEvent(abi: AbiEvent, parameters: (string|BN)[]): string;
	function decodeEvent(abi: AbiEvent, bytecode: string): any;
}
