import { Alchemy, Network } from "alchemy-sdk";
import { env_Vars } from "../../config/config";

const testContract = {
  network: Network.ETH_SEPOLIA,
  networkId: 11155111,
  address: "0x2abf1a25a88be48c56e1c6575b59e03642ab1949",
  testUserAddress: "0xb8fa673cB7D3887A3DB45e02D2e5a4DE24beb8e8",
};

const mainContract = {
  network: Network.ETH_MAINNET,
  networkId: 1,
  address: "0xf1d13912b5E7cccd1499FbBa2FDecaa27D759b08",
  testUserAddress: "0xBc9DeD82a64637EDdFdFdCeC5fc59d4a77cf03D8",
};

const alchemyConfig = {
  apiKey: env_Vars.Alchemy.API_KEY,
  network: testContract.network,
};
const alchemy = new Alchemy(alchemyConfig);

// Fetch all the NFTs owned by elanhalpern.eth
const model_getUserNfts = async (userAddress: string) => {
  return await alchemy.nft.getNftsForOwner(userAddress, {
    contractAddresses: [testContract.address],
  });
};

export { model_getUserNfts };
