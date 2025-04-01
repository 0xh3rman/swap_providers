import { fetchQuote, swapFromEvm, swapFromSolana, ChainName } from "@mayanfinance/swap-sdk";
import { QuoteRequest, Quote, QuoteData, Asset, Chain } from "@gemwallet/types";
import { Protocol } from "../protocol";

export class MayanProvider implements Protocol {

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = Asset.fromString(quoteRequest.from_asset.toString());
        const toAsset = Asset.fromString(quoteRequest.to_asset.toString());

        const quotes = await fetchQuote({
            fromToken: fromAsset.isNative() ? "native" : fromAsset.tokenId!,
            toToken: toAsset.isNative() ? "native" : toAsset.tokenId!,
            amount: parseFloat(quoteRequest.from_value),
            fromChain: fromAsset.chain as ChainName,
            toChain: toAsset.chain as ChainName,
            slippageBps: "auto",
            referrer: quoteRequest.referral_address,
            referrerBps: quoteRequest.referral_bps
        });

        if (!quotes || quotes.length === 0) {
            throw new Error("No quotes available");
        }

        const quote = quotes[0];

        return {
            quote: quoteRequest,
            output_value: quote.expectedAmountOut.toString(),
            output_min_value: quote.minAmountOut.toString()
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const fromAsset = Asset.fromString(quote.quote.from_asset.toString());
        const toAsset = Asset.fromString(quote.quote.to_asset.toString());

        if (fromAsset.chain === Chain.SOLANA) {
            // swapFromSolana
        }

        if (fromAsset.chain === Chain.ETHEREUM) {
            // swapFromEvm
        }
        
        return {
            to: "",
            value: "0",
            data: "0x",
        }
    }
}