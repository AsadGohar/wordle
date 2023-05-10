import { ThirdwebAuth } from "@thirdweb-dev/auth/express";
import { PrivateKeyWallet } from "@thirdweb-dev/auth/evm";
import express from "express";
import { env_Vars } from "../../config/config";
import { Login } from "../../model/login";

const logins = new Login();

const { authRouter, authMiddleware, getUser } = ThirdwebAuth({
  domain: env_Vars.Auth.THIRDWEB_AUTH_DOMAIN,
  wallet: new PrivateKeyWallet(env_Vars.Auth.THIRDWEB_AUTH_PRIVATE_KEY),
  authOptions: {
    chainId: env_Vars.Auth.CHAINID,
    validateNonce: async (nonce: string) => {
      const nonceExists = await logins.doesNonceExist(nonce);
      if (nonceExists) {
        throw new Error("Nonce has already been used!");
      }

      // Otherwise save nonce in database or storage for later validation
      logins.saveNonce(nonce);
    },
  },
});

export { authMiddleware, authRouter, getUser };
