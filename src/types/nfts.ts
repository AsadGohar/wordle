export interface VitoshiNft {
  tokenId: number;
  name: string;
  image: string;
  isCompeting: any;
}

export interface AlchemyNft {
  contract: {
    address: string;
    name: string;
    symbol: string;
    totalSupply: string;
    tokenType: string;
    openSea: {
      floorPrice: number;
      collectionName: string;
      safelistRequestStatus: string;
      imageUrl: string;
      description: string;
      externalUrl: string;
      twitterUsername: string;
      lastIngestedAt: string;
    };
    contractDeployer: string;
    deployedBlockNumber: number;
  };
  tokenId: string;
  tokenType: string;
  title: string;
  description: string;
  timeLastUpdated: string;
  rawMetadata: {
    name: string;
    description: string;
    image: string;
    external_url: string;
    attributes: {
      trait_type: string;
      value: string;
    }[];
  };
  tokenUri: {
    gateway: string;
    raw: string;
  };
  media: {
    gateway: string;
    thumbnail: string;
    raw: string;
    format: string;
    bytes: number;
  }[];
  balance: number;
}

export function isAlchemyNft(object: any): object is AlchemyNft {
  return (
    object &&
    typeof object.contract === "object" &&
    typeof object.contract.address === "string" &&
    typeof object.contract.name === "string" &&
    typeof object.contract.symbol === "string" &&
    typeof object.contract.totalSupply === "string" &&
    typeof object.contract.tokenType === "string" &&
    typeof object.contract.openSea === "object" &&
    typeof object.contract.openSea.floorPrice === "number" &&
    typeof object.contract.openSea.collectionName === "string" &&
    typeof object.contract.openSea.safelistRequestStatus === "string" &&
    typeof object.contract.openSea.imageUrl === "string" &&
    typeof object.contract.openSea.description === "string" &&
    typeof object.contract.openSea.externalUrl === "string" &&
    typeof object.contract.openSea.twitterUsername === "string" &&
    typeof object.contract.openSea.lastIngestedAt === "string" &&
    typeof object.contract.contractDeployer === "string" &&
    typeof object.contract.deployedBlockNumber === "number" &&
    typeof object.tokenId === "string" &&
    typeof object.tokenType === "string" &&
    typeof object.title === "string" &&
    typeof object.description === "string" &&
    typeof object.timeLastUpdated === "string" &&
    typeof object.rawMetadata === "object" &&
    typeof object.rawMetadata.name === "string" &&
    typeof object.rawMetadata.description === "string" &&
    typeof object.rawMetadata.image === "string" &&
    typeof object.rawMetadata.external_url === "string" &&
    Array.isArray(object.rawMetadata.attributes) &&
    object.rawMetadata.attributes.every(
      (attribute: any) =>
        typeof attribute.trait_type === "string" &&
        typeof attribute.value === "string"
    ) &&
    typeof object.tokenUri === "object" &&
    typeof object.tokenUri.gateway === "string" &&
    typeof object.tokenUri.raw === "string" &&
    Array.isArray(object.media) &&
    object.media.every(
      (media: any) =>
        typeof media.gateway === "string" &&
        typeof media.thumbnail === "string" &&
        typeof media.raw === "string" &&
        typeof media.format === "string" &&
        typeof media.bytes === "number"
    ) &&
    typeof object.balance === "number"
  );
}
