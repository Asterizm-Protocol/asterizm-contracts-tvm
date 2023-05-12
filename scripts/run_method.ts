import {Address} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;
  const diceOwnerWallet = await EverWalletAccount.fromPubkey({publicKey: signer.publicKey, workchain: 0});
  // await locklift.giver.sendTo(diceOwnerWallet.address, locklift.utils.toNano(10));
  await locklift.giver.sendTo(new Address('0:9f062880606756e61594d6371a28353bc7d16145d965a34c79a84b8fdbb8c3e5'), locklift.utils.toNano(10000));
  await locklift.factory.accounts.storage.addAccount(diceOwnerWallet);

  const translatorAddress = new Address("0:b07139df5e713a6bea9706ab4084adbbb9f7a92cf38c776ab16d0d4610c9c40c");
  const initializerAddress = new Address("0:c6ef2da5834b09cfdb266f564a2f5c5147cbdf94c050653b228800f50725889e");
  const gasAddress = new Address("0:caa39e9d9139c423ec80012adf116068d7600c6407dfc16f0ea8350a0037caf7");
  const demoAddress = new Address("0:ba9181eef40d89315e4bada52b50a6b70852af3a32053891dfdb2b331d939230");
  
  const translator = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress);
  const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress);
  const gas = locklift.factory.getDeployedContract("GasStation", gasAddress);
  const demo = locklift.factory.getDeployedContract("AsterizmDemo", demoAddress);

  // console.log(gas.address);
  // const result1 = await demo.methods._owner().call();
  const result2 = await demo.methods.chainMessage().call();
  console.log([result2]);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
