import { NextFunction, Request, Response } from "express";
import { model_getUserNfts } from "../../model/nfts/nfts";
import { VitoshiNft, AlchemyNft, isAlchemyNft } from "../../types/nfts";

async function getUserNfts(req: Request, res: Response, next: NextFunction) {
  try {
    const userAddress = req.query.userAddress;
    if (!userAddress) {
      res.status(400).json({ message: "userAddress not provided" });
      return;
    }
    console.log("userAddress:", userAddress);
    const userNftsRaw = await model_getUserNfts(String(userAddress));

    const userNfts: VitoshiNft[] = [];

    userNftsRaw.ownedNfts.forEach((nft) => {
      if (isAlchemyNft(nft)) {
        let isNftCompeting: boolean = false;
        const competingStatusVal = getStatus(nft);
        if (competingStatusVal === "Competing") isNftCompeting = true;

        userNfts.push({
          tokenId: Number(nft.tokenId),
          name: nft.rawMetadata.name || "no name found",
          image: nft.media[0].raw || "no image found",
          isCompeting: isNftCompeting,
        });
      }
    });

    res.status(200).json(userNfts);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "400: owner should be a valid address or ENS name"
      ) {
        res.status(400).json({ message: "invalid address provided" });
        return;
      }
    }
    console.error("getUserNfts-error: ", error);
    res.status(500).json({ message: "something went wrong" });
  }
}

function getStatus(nft: AlchemyNft): string | undefined {
  const attributes = nft.rawMetadata.attributes;
  const statusAttribute = attributes.find(
    (attr) => attr.trait_type === "Status"
  );
  if (statusAttribute) {
    return statusAttribute.value;
  } else {
    return undefined;
  }
}

export { getUserNfts };
