import { fetchQuote, getSwapFromEvmTxPayload,  ChainName, QuoteParams, QuoteOptions, Quote as MayanQuote, createSwapFromSolanaInstructions} from "@mayanfinance/swap-sdk";
import { QuoteRequest, Quote, QuoteData, Asset, Chain } from "@gemwallet/types";
import { Protocol } from "../protocol";

export class MayanProvider implements Protocol {

    private endpoint: string;
    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    mapChainToName(chain: Chain): ChainName {
        switch (chain) {
            case Chain.SMARTCHAIN:
                return "bsc";
            default:
                return chain as ChainName;
        }
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = Asset.fromString(quoteRequest.from_asset.toString());
        const toAsset = Asset.fromString(quoteRequest.to_asset.toString());

        const params: QuoteParams = {
            fromToken: fromAsset.isNative() ? "native" : fromAsset.tokenId!,
            toToken: toAsset.isNative() ? "native" : toAsset.tokenId!,
            amountIn64: quoteRequest.from_value,
            fromChain: this.mapChainToName(fromAsset.chain),
            toChain: this.mapChainToName(toAsset.chain),
            slippageBps: "auto",
            referrer: quoteRequest.referral_address,
            referrerBps: quoteRequest.referral_bps
        }
        const options: QuoteOptions = {
            "swift": true,
            "mctp": false,
            "fastMctp": false,
        }
        const quotes = await fetchQuote(params, options);

        if (!quotes || quotes.length === 0) {
            throw new Error("No quotes available");
        }

        const quote = quotes[0];

        return {
            quote: quoteRequest,
            output_value: quote.expectedAmountOut.toString(),
            output_min_value: quote.minAmountOut.toString(),
            route_data: quote
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const fromAsset = Asset.fromString(quote.quote.from_asset.toString());
        const toAsset = Asset.fromString(quote.quote.to_asset.toString());

        if (fromAsset.chain === Chain.SOLANA) {
            return this.buildSolanaQuoteData(quote.quote, quote.route_data as MayanQuote);
        } else  {
            return this.buildEvmQuoteData(quote.quote, quote.route_data as MayanQuote);
        }
    }

    buildSolanaQuoteData(request: QuoteRequest, routeData: MayanQuote): QuoteData {
        const swapData = createSwapFromSolanaInstructions(routeData, request.from_address, request.to_address, {solana : request.referral_address});
        // FIXME serialize swapData to base64
        return {
            to: "",
            value: "0",
            data: ""
        };
    }

    buildEvmQuoteData(request: QuoteRequest, routeData: MayanQuote): QuoteData {
        const signerChainId = routeData.fromToken.chainId;
        const swapData = getSwapFromEvmTxPayload(routeData, request.from_address, request.to_address, {evm : request.referral_address}, request.from_address,  signerChainId, null,null);

        return {
            to: swapData.to?.toString() || "",
            value: swapData.value?.toString() || "0",
            data: swapData.data?.toString() || "0x",
        };
    }
}
