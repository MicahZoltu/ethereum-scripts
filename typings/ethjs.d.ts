declare class HttpProvider {
	constructor(address: string, options?: any);
}

declare module 'ethjs' {
	class Ethjs {
		constructor(provider: HttpProvider);
		net_version(): string;
	}

	module Ethjs {
		class HttpProvider {
			constructor(address: string, options?: any);
		}
	}

	export = Ethjs;
}
