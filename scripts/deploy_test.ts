import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");

require('dotenv').config();

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;

  //TODO: change it for different chains deployment!
  const owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
  const ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';

  const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    address: owner,
    type: WalletTypes.EverWallet,
  });

  const { contract: testContract } = await locklift.factory.deployContract({
    contract: "TestContract",
    publicKey: signer.publicKey,
    initParams: {
      count_: locklift.utils.getRandomNonce().toFixed(),
    },
    constructorParams: {},
    value: locklift.utils.toNano(2),
  });
  console.log(`TestContract deployed at: ${testContract.address.toString()}`);
  // const { contract: demo1 } = await locklift.factory.deployContract({
  //   contract: "AsterizmTest",
  //   publicKey: signer.publicKey,
  //   initParams: {
  //     count_: locklift.utils.getRandomNonce().toFixed(),
  //   },
  //   constructorParams: {},
  //   value: locklift.utils.toNano(2),
  // });
  // console.log(`Test deployed at: ${demo1.address.toString()}`);

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
