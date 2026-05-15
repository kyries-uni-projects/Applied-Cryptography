import { NextRequest, NextResponse } from "next/server";
import { getDerivedWalletAddress } from "@/lib/sc-client";

/**
 * GET /api/client/wallet-address
 *
 * Returns the user's derived blockchain wallet address (secp256k1 address
 * deterministically derived from their RSA private key in the DB).
 *
 * Users must fund this address with Fuji AVAX at https://faucet.avax.network
 * before they can submit CSRs or revocation requests to the Smart Contract.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const address = await getDerivedWalletAddress(userId);
    return NextResponse.json({
      address,
      faucetUrl: "https://faucet.avax.network",
      network: "Avalanche Fuji Testnet (Chain ID: 43113)",
      instructions: "Send AVAX to this address on Fuji testnet to pay for blockchain transactions.",
    });
  } catch (error) {
    console.error("Get wallet address error:", error);
    return NextResponse.json({ error: "Lỗi lấy địa chỉ ví" }, { status: 500 });
  }
}
