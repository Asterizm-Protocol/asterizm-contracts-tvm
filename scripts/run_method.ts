import {Address} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;
  const diceOwnerWallet = await EverWalletAccount.fromPubkey({publicKey: signer.publicKey, workchain: 0});
  await locklift.factory.accounts.storage.addAccount(diceOwnerWallet);

  const translatonAddress = new Address("0:d38d1c9542ff99ba86ae294d792cd33f47c0e0c58b5bf1eb7e30fbfe61bb3b2f");
  const initializerAddress = new Address("0:812e4e4b52f155daebfcefb54be29c59739b3bede3a9069b2abcaadd5e58c32c");
  const gasAddress = new Address("0:caa39e9d9139c423ec80012adf116068d7600c6407dfc16f0ea8350a0037caf7");
  const demoAddress = new Address("0:c317abd2438824fa6ff8459cb9bfa1080c0770f5368cb6aa252a2c71cb9bcbb8");
  
  const translator = locklift.factory.getDeployedContract("AsterizmTranslator", translatonAddress);
  const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress);
  const gas = locklift.factory.getDeployedContract("GasStation", gasAddress);
  const demo = locklift.factory.getDeployedContract("AsterizmDemo", demoAddress);

  console.log(gas.address);
  const result = await demo.methods.chainMessage({}).call();
  console.log([result]);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
