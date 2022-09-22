import { fromChecksummedAddress } from "./ethereum";

export const tokens = {
	'WETH': fromChecksummedAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
	'DAI': fromChecksummedAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
	'USDC': fromChecksummedAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
	'USDT': fromChecksummedAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
	'WBTC': fromChecksummedAddress('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'),
} as const
